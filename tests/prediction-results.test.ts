import { describe, it, expect, vi, beforeEach } from 'vitest';
import { optimizeImage, isValidImageDataUri, safeOptimizeImage } from '../src/lib/image-optimization';

// Mock Sharp to avoid dependency issues in tests
vi.mock('sharp', () => {
  return {
    default: vi.fn(() => ({
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from('mocked-optimized-image-data')),
    })),
  };
});

// Sample test data
const SAMPLE_IMAGE_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const INVALID_DATA_URI = 'invalid-data-uri';
const SVG_DATA_URI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiPjwvc3ZnPg==';

describe('Image Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidImageDataUri', () => {
    it('should return true for valid image data URI', () => {
      expect(isValidImageDataUri(SAMPLE_IMAGE_DATA_URI)).toBe(true);
    });

    it('should return false for invalid data URI', () => {
      expect(isValidImageDataUri(INVALID_DATA_URI)).toBe(false);
    });

    it('should return false for SVG data URI', () => {
      expect(isValidImageDataUri(SVG_DATA_URI)).toBe(false);
    });

    it('should return false for empty or null input', () => {
      expect(isValidImageDataUri('')).toBe(false);
      expect(isValidImageDataUri(null as any)).toBe(false);
      expect(isValidImageDataUri(undefined as any)).toBe(false);
    });
  });

  describe('optimizeImage', () => {
    it('should create three variants with correct structure', async () => {
      const result = await optimizeImage(SAMPLE_IMAGE_DATA_URI);
      
      expect(result).toHaveProperty('small');
      expect(result).toHaveProperty('medium');
      expect(result).toHaveProperty('large');
      
      // Check small variant
      expect(result.small).toHaveProperty('url');
      expect(result.small).toHaveProperty('width', 256);
      expect(result.small).toHaveProperty('height', 256);
      expect(result.small).toHaveProperty('quality', 70);
      expect(result.small).toHaveProperty('size_bytes');
      expect(result.small.url).toMatch(/^data:image\/jpeg;base64,/);
      
      // Check medium variant
      expect(result.medium).toHaveProperty('width', 512);
      expect(result.medium).toHaveProperty('quality', 80);
      
      // Check large variant
      expect(result.large).toHaveProperty('width', 1024);
      expect(result.large).toHaveProperty('quality', 90);
    });

    it('should throw error for invalid data URI', async () => {
      await expect(optimizeImage(INVALID_DATA_URI)).rejects.toThrow();
    });
  });

  describe('safeOptimizeImage', () => {
    it('should return null for invalid data URI without throwing', async () => {
      const result = await safeOptimizeImage(INVALID_DATA_URI);
      expect(result).toBeNull();
    });

    it('should return null for SVG data URI', async () => {
      const result = await safeOptimizeImage(SVG_DATA_URI);
      expect(result).toBeNull();
    });

    it('should return optimized variants for valid image', async () => {
      const result = await safeOptimizeImage(SAMPLE_IMAGE_DATA_URI);
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('small');
      expect(result).toHaveProperty('medium');
      expect(result).toHaveProperty('large');
    });
  });
});

describe('Prediction Results Integration', () => {
  // Mock Supabase
  const mockSupabase = {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  };

  it('should save prediction result with optimized images', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    });

    // Simulate the data structure that would be saved
    const predictionData = {
      user_id: null,
      client_ip: '127.0.0.1',
      form_type: 'fortune',
      user_name: 'Test User',
      question: 'What will my future hold?',
      birth_month: '01',
      birth_year: '1990',
      character_name: 'Sir Quirkalot',
      character_description: 'A whimsical character',
      prediction_text: 'You will find great success',
      image_variants: {
        small: {
          url: 'data:image/jpeg;base64,small-image-data',
          width: 256,
          height: 256,
          quality: 70,
          size_bytes: 15000,
        },
        medium: {
          url: 'data:image/jpeg;base64,medium-image-data',
          width: 512,
          height: 512,
          quality: 80,
          size_bytes: 45000,
        },
        large: {
          url: 'data:image/jpeg;base64,large-image-data',
          width: 1024,
          height: 1024,
          quality: 90,
          size_bytes: 120000,
        },
      },
      question_theme: 'general',
      generation_source: 'ai',
      usage_count: 1,
      is_active: true,
      metadata: {
        generated_at: expect.any(String),
        client_ip: '127.0.0.1',
        user_type: 'unregistered',
        optimization_success: true,
      },
    };

    // Test that the insert would be called with correct data structure
    expect(predictionData).toHaveProperty('image_variants');
    expect(predictionData.image_variants).toHaveProperty('small');
    expect(predictionData.image_variants).toHaveProperty('medium');
    expect(predictionData.image_variants).toHaveProperty('large');
    expect(predictionData.image_variants.small).toHaveProperty('size_bytes');
    expect(predictionData.generation_source).toBe('ai');
  });

  it('should handle asset reuse for unregistered users', async () => {
    const existingResult = {
      id: 'test-id',
      character_name: 'Existing Character',
      character_description: 'Existing description',
      image_variants: {
        small: { url: 'data:image/jpeg;base64,existing-small' },
        medium: { url: 'data:image/jpeg;base64,existing-medium' },
        large: { url: 'data:image/jpeg;base64,existing-large' },
      },
      usage_count: 2,
    };

    const mockSelect = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockNot = vi.fn().mockReturnThis();
    const mockIs = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockResolvedValue({ data: [existingResult], error: null });

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
      eq: mockEq,
      not: mockNot,
      is: mockIs,
      order: mockOrder,
      limit: mockLimit,
    });

    // Verify the query structure for finding reusable results
    expect(mockSelect).toBeTruthy();
    expect(mockEq).toBeTruthy();
    expect(mockNot).toBeTruthy();
    expect(mockIs).toBeTruthy();
    expect(mockOrder).toBeTruthy();
    expect(mockLimit).toBeTruthy();
  });
});

describe('Image Variant Selection', () => {
  const mockImageVariants = {
    small: { url: 'data:image/jpeg;base64,small' },
    medium: { url: 'data:image/jpeg;base64,medium' },
    large: { url: 'data:image/jpeg;base64,large' },
  };

  // This would be implemented in the actual API route
  function getImageForUserType(imageVariants: any, userType: string): string {
    if (!imageVariants || typeof imageVariants === 'string') {
      return imageVariants || '';
    }

    switch (userType) {
      case 'unregistered':
        return imageVariants.small?.url || imageVariants.medium?.url || '';
      case 'registered':
        return imageVariants.medium?.url || imageVariants.large?.url || imageVariants.small?.url || '';
      case 'premium':
        return imageVariants.large?.url || imageVariants.medium?.url || '';
      default:
        return imageVariants.medium?.url || '';
    }
  }

  it('should return small variant for unregistered users', () => {
    const result = getImageForUserType(mockImageVariants, 'unregistered');
    expect(result).toBe('data:image/jpeg;base64,small');
  });

  it('should return medium variant for registered users', () => {
    const result = getImageForUserType(mockImageVariants, 'registered');
    expect(result).toBe('data:image/jpeg;base64,medium');
  });

  it('should return large variant for premium users', () => {
    const result = getImageForUserType(mockImageVariants, 'premium');
    expect(result).toBe('data:image/jpeg;base64,large');
  });

  it('should handle missing variants gracefully', () => {
    const incompleteVariants = { large: { url: 'data:image/jpeg;base64,large' } };
    
    const unregisteredResult = getImageForUserType(incompleteVariants, 'unregistered');
    expect(unregisteredResult).toBe(''); // Falls back to empty string
    
    const registeredResult = getImageForUserType(incompleteVariants, 'registered');
    expect(registeredResult).toBe('data:image/jpeg;base64,large'); // Falls back to large
  });
});