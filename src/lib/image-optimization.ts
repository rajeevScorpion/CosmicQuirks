import sharp from 'sharp';

export interface ImageVariant {
  url: string;
  width: number;
  height: number;
  quality: number;
  size_bytes: number;
}

export interface ImageVariants {
  small: ImageVariant;
  medium: ImageVariant;
  large: ImageVariant;
}

export interface OptimizationConfig {
  small: { size: number; quality: number; maxSizeKB?: number };
  medium: { size: number; quality: number; maxSizeKB?: number };
  large: { size: number; quality: number; maxSizeKB?: number };
}

const DEFAULT_CONFIG: OptimizationConfig = {
  small: { size: 256, quality: 70, maxSizeKB: 100 },
  medium: { size: 512, quality: 80, maxSizeKB: 200 },
  large: { size: 1024, quality: 90, maxSizeKB: 450 },
};

export type UserTier = 'unregistered' | 'registered' | 'premium';

export interface UserTierConfig {
  maxSizeKB: number;
  baseQuality: number;
  minQuality: number;
}

/**
 * Optimizes a base64 image data URI into multiple size variants
 * @param imageDataUri - Base64 data URI (e.g., "data:image/png;base64,...")
 * @param config - Optional configuration for sizes and quality
 * @returns Promise containing all image variants
 */
export async function optimizeImage(
  imageDataUri: string,
  config: OptimizationConfig = DEFAULT_CONFIG
): Promise<ImageVariants> {
  try {
    // Extract base64 data from data URI
    const base64Data = imageDataUri.split(',')[1];
    if (!base64Data) {
      throw new Error('Invalid data URI format');
    }

    const inputBuffer = Buffer.from(base64Data, 'base64');

    // Process all variants in parallel
    const [large, medium, small] = await Promise.all([
      processVariant(inputBuffer, 'large', config.large),
      processVariant(inputBuffer, 'medium', config.medium),
      processVariant(inputBuffer, 'small', config.small),
    ]);

    return { small, medium, large };
  } catch (error) {
    console.error('Image optimization failed:', error);
    throw new Error(`Failed to optimize image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get user tier configuration from environment variables
 */
export function getUserTierConfig(userTier: UserTier): UserTierConfig {
  const maxSizeKB = parseInt(process.env[`${userTier.toUpperCase()}_USER_MAX_IMAGE_SIZE_KB`] || '450', 10);
  const baseQuality = parseInt(process.env[`${userTier.toUpperCase()}_USER_BASE_QUALITY`] || '85', 10);
  const minQuality = parseInt(process.env.MINIMUM_IMAGE_QUALITY || '60', 10);

  return { maxSizeKB, baseQuality, minQuality };
}

/**
 * Get optimization config based on user tier
 */
export function getOptimizationConfigForUser(userTier: UserTier): OptimizationConfig {
  const tierConfig = getUserTierConfig(userTier);
  
  return {
    small: { 
      size: 256, 
      quality: Math.max(tierConfig.baseQuality - 15, tierConfig.minQuality),
      maxSizeKB: Math.floor(tierConfig.maxSizeKB * 0.2) // 20% of total
    },
    medium: { 
      size: 512, 
      quality: Math.max(tierConfig.baseQuality - 5, tierConfig.minQuality),
      maxSizeKB: Math.floor(tierConfig.maxSizeKB * 0.4) // 40% of total  
    },
    large: { 
      size: 1024, 
      quality: tierConfig.baseQuality,
      maxSizeKB: tierConfig.maxSizeKB // Full allocation for large
    },
  };
}

/**
 * Process a single image variant with size constraints
 */
async function processVariant(
  inputBuffer: Buffer,
  variantName: string,
  config: { size: number; quality: number; maxSizeKB?: number }
): Promise<ImageVariant> {
  try {
    let quality = config.quality;
    let processedBuffer: Buffer;
    const minQuality = parseInt(process.env.MINIMUM_IMAGE_QUALITY || '60', 10);
    const enableDynamicQuality = process.env.ENABLE_DYNAMIC_QUALITY_ADJUSTMENT === 'true';
    const maxIterations = parseInt(process.env.SIZE_OPTIMIZATION_ITERATIONS || '5', 10);

    // Try to optimize for target file size if enabled and maxSizeKB is specified
    if (enableDynamicQuality && config.maxSizeKB) {
      const targetSizeBytes = config.maxSizeKB * 1024;
      let iteration = 0;

      do {
        processedBuffer = await sharp(inputBuffer)
          .resize(config.size, config.size, {
            fit: 'cover',
            position: 'center',
          })
          .jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
          })
          .toBuffer();

        // If size is acceptable or we've reached minimum quality, break
        if (processedBuffer.length <= targetSizeBytes || quality <= minQuality) {
          break;
        }

        // Reduce quality for next iteration
        quality = Math.max(quality - 10, minQuality);
        iteration++;
      } while (iteration < maxIterations);
    } else {
      // Standard processing without size optimization
      processedBuffer = await sharp(inputBuffer)
        .resize(config.size, config.size, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({
          quality,
          progressive: true,
          mozjpeg: true,
        })
        .toBuffer();
    }

    // Convert back to data URI
    const base64 = processedBuffer.toString('base64');
    const dataUri = `data:image/jpeg;base64,${base64}`;

    return {
      url: dataUri,
      width: config.size,
      height: config.size,
      quality,
      size_bytes: processedBuffer.length,
    };
  } catch (error) {
    console.error(`Failed to process ${variantName} variant:`, error);
    throw error;
  }
}

/**
 * Validates if an image data URI is valid and processable
 */
export function isValidImageDataUri(dataUri: string): boolean {
  if (!dataUri || typeof dataUri !== 'string') {
    return false;
  }

  // Check if it's a proper data URI
  if (!dataUri.startsWith('data:image/')) {
    return false;
  }

  // Check if it has base64 data
  const parts = dataUri.split(',');
  if (parts.length !== 2) {
    return false;
  }

  // Check if it's not an SVG (we don't want to optimize SVGs)
  // Only check the header part, not the base64 data
  if (parts[0].toLowerCase().includes('svg')) {
    return false;
  }

  // Check if base64 data exists and is reasonable length
  const base64Data = parts[1];
  if (!base64Data || base64Data.length < 20) {
    return false;
  }

  return true;
}

/**
 * Calculates total storage size of all variants
 */
export function calculateTotalSize(variants: ImageVariants): number {
  return variants.small.size_bytes + variants.medium.size_bytes + variants.large.size_bytes;
}

/**
 * Gets the appropriate image variant based on user type and context
 */
export function getVariantForContext(
  variants: ImageVariants,
  context: 'thumbnail' | 'card' | 'full' | 'print',
  userType: 'unregistered' | 'registered' | 'premium' = 'registered'
): ImageVariant {
  switch (context) {
    case 'thumbnail':
      return variants.small;
    
    case 'card':
      // Registered users get medium quality, unregistered get small
      return userType === 'unregistered' ? variants.small : variants.medium;
    
    case 'full':
      // Premium users get large, others get medium
      return userType === 'premium' ? variants.large : variants.medium;
    
    case 'print':
      // Only premium users can access print quality
      if (userType !== 'premium') {
        throw new Error('Print quality images are only available for premium users');
      }
      return variants.large;
    
    default:
      return variants.medium;
  }
}

/**
 * Optimizes image based on user tier with size constraints
 */
export async function optimizeImageForUserTier(
  imageDataUri: string,
  userTier: UserTier
): Promise<ImageVariants> {
  const config = getOptimizationConfigForUser(userTier);
  return await optimizeImage(imageDataUri, config);
}

/**
 * Error-safe image optimization with user tier support
 * Returns null if optimization fails, allowing caller to use original image
 */
export async function safeOptimizeImageForUserTier(
  imageDataUri: string,
  userTier: UserTier
): Promise<ImageVariants | null> {
  try {
    if (!isValidImageDataUri(imageDataUri)) {
      console.warn('Invalid image data URI provided for optimization');
      return null;
    }

    return await optimizeImageForUserTier(imageDataUri, userTier);
  } catch (error) {
    console.error('Safe image optimization failed:', error);
    return null;
  }
}

/**
 * Error-safe image optimization with fallback
 * Returns null if optimization fails, allowing caller to use original image
 */
export async function safeOptimizeImage(
  imageDataUri: string,
  config?: OptimizationConfig
): Promise<ImageVariants | null> {
  try {
    if (!isValidImageDataUri(imageDataUri)) {
      console.warn('Invalid image data URI provided for optimization');
      return null;
    }

    return await optimizeImage(imageDataUri, config);
  } catch (error) {
    console.error('Safe image optimization failed:', error);
    return null;
  }
}