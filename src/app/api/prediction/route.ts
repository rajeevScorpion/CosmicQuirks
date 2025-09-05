import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { characterMatch, type CharacterMatchInput } from '@/ai/flows/character-match';
import { checkUsageLimit, incrementUsage, getClientIP, checkFormAccess } from '@/lib/usage-tracking';
import { checkRateLimit, RATE_LIMITS, createRateLimitResponse } from '@/lib/rate-limit';
import { getAssetFromPool, generateCosmicPlaceholder, addAssetToPool } from '@/lib/asset-pool';
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

    if (user) {
      // Registered users get fresh AI generation
      const birthdate = `01-${month}-${year}`;
      const input: CharacterMatchInput = {
        name,
        birthdate,
        question,
      };

      try {
        result = await characterMatch(input);
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
    } else {
      // Unregistered users get asset pool + fresh text
      try {
        // Try to get an image from asset pool
        const poolAsset = await getAssetFromPool({
          questionTheme,
          formType,
          excludeRecentlyUsed: true,
          clientIdentifier: clientIP,
        });

        let characterImage: string;
        let characterName: string;
        let characterDescription: string;

        if (poolAsset) {
          // Use asset from pool
          characterImage = poolAsset.image_url;
          characterName = poolAsset.character_name;
          characterDescription = poolAsset.character_description;
        } else {
          // Generate fresh content and add to pool
          const birthdate = `01-${month}-${year}`;
          const input: CharacterMatchInput = {
            name,
            birthdate,
            question,
          };

          const freshResult = await characterMatch(input);
          characterImage = freshResult.characterImage;
          characterName = freshResult.characterName;
          characterDescription = freshResult.characterDescription;

          // Add to asset pool (async, don't wait)
          if (characterImage && characterImage.startsWith('data:image/') && !characterImage.includes('svg')) {
            addAssetToPool({
              image_url: characterImage,
              character_name: characterName,
              character_description: characterDescription,
              question_theme: questionTheme,
              form_type: formType,
              metadata: {
                generated_at: new Date().toISOString(),
                source: 'unregistered_user',
              },
              is_active: true,
            }).catch(err => console.error('Failed to add asset to pool:', err));
          }
        }

        // Always generate fresh prediction text
        const birthdate = `01-${month}-${year}`;
        const input: CharacterMatchInput = {
          name,
          birthdate,
          question,
        };

        const textResult = await characterMatch(input);

        result = {
          characterName,
          characterDescription,
          characterImage,
          prediction: textResult.prediction,
        };
      } catch (error) {
        console.error('Asset pool generation failed:', error);
        return NextResponse.json(
          {
            error: 'Cosmic interference detected',
            message: 'The oracle is experiencing mystical disturbances. Please try again in a few moments.',
            code: 'AI_GENERATION_FAILED',
          },
          { status: 503 }
        );
      }
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

    // Save prediction to database (for registered users and asset pool)
    try {
      if (user) {
        // Save full prediction for registered user
        await supabase.from('predictions').insert({
          user_id: user.id,
          form_type: formType,
          character_name: result.characterName,
          character_description: result.characterDescription,
          prediction_text: result.prediction,
          question,
          user_name: name,
          birth_month: month,
          birth_year: year,
          image_url: result.characterImage,
          metadata: {
            generated_at: new Date().toISOString(),
            client_ip: clientIP,
          },
        });
      }

      // Save image to asset pool (if it's a real image, not SVG placeholder)
      if (result.characterImage && result.characterImage.startsWith('data:image/') && !result.characterImage.includes('svg')) {
        await supabase.from('image_assets').insert({
          image_url: result.characterImage,
          character_name: result.characterName,
          character_description: result.characterDescription,
          question_theme: extractQuestionTheme(question),
          form_type: formType,
          metadata: {
            generated_at: new Date().toISOString(),
            original_question: question,
            user_name: name, // For context, not identification
          },
        });
      }
    } catch (dbError) {
      console.error('Database save failed:', dbError);
      // Don't fail the request if DB save fails - user still gets their prediction
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
      ...result,
      prediction: `${predictionPrefix} ${result.prediction}`,
      metadata: {
        userType,
        usageRemaining: usageCheck.limit - usageCheck.used - 1,
        formType,
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

// Helper functions
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