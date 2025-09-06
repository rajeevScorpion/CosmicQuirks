import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { characterMatch, type CharacterMatchInput } from '@/ai/flows/character-match';
import { checkUsageLimit, incrementUsage, getClientIP, checkFormAccess } from '@/lib/usage-tracking';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';
import { safeOptimizeImageForUserTier, isValidImageDataUri, type UserTier } from '@/lib/image-optimization';
import type { PredictionResultInsert } from '@/lib/supabase/types';
import { z } from 'zod';

const PredictionRequestSchema = z.object({
  name: z.string().min(1).max(50),
  month: z.string().min(1).max(2),
  year: z.string().min(4).max(4),
  question: z.string().min(10).max(500),
  formType: z.string().default('fortune'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = checkRateLimit(request, RATE_LIMITS.prediction);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult.identifier);
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = PredictionRequestSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid cosmic coordinates',
          message: 'Please provide valid name, birth details, and question.',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, month, year, question, formType } = validationResult.data;

    // Get user session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const clientIP = getClientIP(request);
    
    // Determine user type and check form access
    const userType = user ? 'registered' : 'unregistered';
    if (!checkFormAccess(formType, userType)) {
      return NextResponse.json(
        {
          error: 'Mystical form restricted',
          message: 'This type of cosmic wisdom requires registration to access.',
          code: 'FORM_ACCESS_DENIED',
        },
        { status: 403 }
      );
    }

    // Check usage limits
    const identifier = user ? user.id : clientIP;
    const usageCheck = await checkUsageLimit(identifier, !!user);
    
    if (!usageCheck.canGenerate) {
      return NextResponse.json(
        {
          error: 'Daily cosmic limit reached',
          message: usageCheck.message,
          used: usageCheck.used,
          limit: usageCheck.limit,
          code: 'USAGE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    const questionTheme = extractQuestionTheme(question);
    let result;
    let generationSource = 'ai';

    // Generate fresh AI prediction for all users (registered and unregistered)
    const birthdate = `01-${month}-${year}`;
    const input: CharacterMatchInput = {
      name,
      birthdate,
      question,
    };

    try {
      result = await characterMatch(input);
      generationSource = 'ai';
    } catch (error) {
      console.error('AI prediction failed:', error);
      return NextResponse.json(
        {
          error: 'Cosmic interference detected',
          message: 'The oracle is experiencing mystical disturbances. Please try again in a few moments.',
          code: 'AI_GENERATION_FAILED',
        },
        { status: 503 }
      );
    }

    // Validate result
    if (!result?.characterName || !result?.prediction || !result?.characterDescription) {
      return NextResponse.json(
        {
          error: 'Incomplete cosmic vision',
          message: 'The oracle\'s vision was incomplete. Please try again.',
          code: 'INCOMPLETE_RESULT',
        },
        { status: 500 }
      );
    }

    // Determine user tier for image optimization
    const userTier: UserTier = user ? 
      (user.user_metadata?.plan_type === 'premium' ? 'premium' : 'registered') : 
      'unregistered';

    // Optimize image if we have a fresh AI-generated image
    let imageVariants = null;
    let finalCharacterImage = result.characterImage;

    if (result.characterImage && isValidImageDataUri(result.characterImage)) {
      try {
        const optimizedVariants = await safeOptimizeImageForUserTier(result.characterImage, userTier);
        if (optimizedVariants) {
          imageVariants = optimizedVariants;
          // Use appropriate variant for the response based on user tier
          finalCharacterImage = getImageForUserType(optimizedVariants, userTier);
        } else {
          finalCharacterImage = result.characterImage;
        }
      } catch (error) {
        console.error('Image optimization failed, using original:', error);
        finalCharacterImage = result.characterImage;
      }
    }

    // SECURITY-FIRST: Only save to database for authenticated users
    if (user) {
      try {
        const predictionData: PredictionResultInsert = {
          user_id: user.id,
          client_ip: clientIP,
          form_type: formType,
          user_name: name,
          question,
          birth_month: month,
          birth_year: year,
          character_name: result.characterName,
          character_description: result.characterDescription,
          prediction_text: result.prediction,
          image_variants: imageVariants,
          question_theme: questionTheme,
          generation_source: generationSource,
          usage_count: 1,
          last_used_at: new Date().toISOString(),
          is_active: true,
          metadata: {
            generated_at: new Date().toISOString(),
            client_ip: clientIP,
            user_type: userType,
            user_tier: userTier,
            optimization_success: !!imageVariants,
          },
        };

        const { error: insertError } = await supabase
          .from('prediction_results')
          .insert(predictionData);

        if (insertError) {
          console.error('Database save failed:', insertError);
          // Don't fail the request if DB save fails - user still gets their prediction
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        // Don't fail the request if DB save fails
      }
    }

    // Increment usage counter
    await incrementUsage(identifier, !!user);

    // Add age-based prefix (maintain existing logic)
    const age = calculateAge(parseInt(year, 10), parseInt(month, 10));
    let predictionPrefix = `Hi ${name}!`;
    if (age < 12) {
      predictionPrefix += " You are just born I guess. But I will still tell your future: ";
    }

    const finalResult = {
      characterName: result.characterName,
      characterDescription: result.characterDescription,
      characterImage: finalCharacterImage,
      prediction: `${predictionPrefix} ${result.prediction}`,
      metadata: {
        userType,
        userTier,
        usageRemaining: usageCheck.limit - usageCheck.used - 1,
        formType,
        generationSource,
        hasOptimizedImages: !!imageVariants,
        savedToDatabase: !!user, // Indicate if result was saved to database
        imageSizeInfo: imageVariants ? {
          small: `${Math.round(imageVariants.small.size_bytes / 1024)}KB`,
          medium: `${Math.round(imageVariants.medium.size_bytes / 1024)}KB`,
          large: `${Math.round(imageVariants.large.size_bytes / 1024)}KB`,
        } : null,
      },
    };

    return NextResponse.json({ 
      data: finalResult, 
      error: null 
    });

  } catch (error) {
    console.error('Prediction API error:', error);
    return NextResponse.json(
      {
        error: 'Unexpected cosmic disturbance',
        message: 'An unexpected cosmic disturbance occurred. Please try again later.',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

// Helper function to get appropriate image variant based on user tier
function getImageForUserType(
  imageVariants: any,
  userTier: UserTier
): string {
  if (!imageVariants) {
    return ''; // Will fallback to SVG placeholder
  }

  if (typeof imageVariants === 'string') {
    // Legacy single image format or original image
    return imageVariants;
  }

  // Use optimized variants based on user tier
  switch (userTier) {
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

// Helper functions (unchanged from original)
function calculateAge(year: number, month: number): number {
  const birthDate = new Date(year, month - 1, 1);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

function extractQuestionTheme(question: string): string {
  const lowerQuestion = question.toLowerCase();
  
  if (lowerQuestion.includes('love') || lowerQuestion.includes('relationship') || lowerQuestion.includes('romance')) {
    return 'love';
  } else if (lowerQuestion.includes('career') || lowerQuestion.includes('job') || lowerQuestion.includes('work')) {
    return 'career';
  } else if (lowerQuestion.includes('health') || lowerQuestion.includes('wellness')) {
    return 'health';
  } else if (lowerQuestion.includes('money') || lowerQuestion.includes('finance') || lowerQuestion.includes('wealth')) {
    return 'finance';
  } else if (lowerQuestion.includes('travel') || lowerQuestion.includes('journey')) {
    return 'travel';
  } else if (lowerQuestion.includes('family') || lowerQuestion.includes('children')) {
    return 'family';
  }
  
  return 'general';
}