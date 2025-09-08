import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PredictionResultInsert } from '@/lib/supabase/types';
import { getClientIP } from '@/lib/usage-tracking';
import { z } from 'zod';

const SavePredictionSchema = z.object({
  name: z.string().min(1).max(50),
  month: z.string().min(1).max(2),
  year: z.string().min(4).max(4),
  question: z.string().min(10).max(500),
  characterName: z.string().min(1),
  characterDescription: z.string().min(1),
  prediction: z.string().min(1),
  characterImage: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Get user session - must be authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      const response = NextResponse.json(
        { 
          error: 'Authentication required',
          message: 'You must be signed in to save predictions.'
        },
        { status: 401 }
      );
      // Never cache auth-related responses
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      response.headers.set('Pragma', 'no-cache');
      return response;
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = SavePredictionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid prediction data',
          message: 'The prediction data is incomplete or invalid.',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { name, month, year, question, characterName, characterDescription, prediction, characterImage } = validationResult.data;
    const clientIP = getClientIP(request);

    // Create a simple hash for duplicate detection based on user + content
    const contentHash = Buffer.from(`${user.id}-${characterName}-${prediction}-${question}`).toString('base64').substring(0, 20);

    // Check if this prediction already exists for this user
    const { data: existingPrediction } = await supabase
      .from('prediction_results')
      .select('id')
      .eq('user_id', user.id)
      .eq('character_name', characterName)
      .eq('prediction_text', prediction)
      .eq('question', question)
      .single();

    if (existingPrediction) {
      return NextResponse.json({ 
        success: true,
        message: 'Prediction already saved',
        predictionId: existingPrediction.id,
        alreadyExists: true
      });
    }

    // Extract question theme (reuse from main prediction route)
    const questionTheme = extractQuestionTheme(question);

    // Save the prediction to database
    const predictionData: PredictionResultInsert = {
      user_id: user.id,
      client_ip: clientIP,
      form_type: 'fortune',
      user_name: name,
      question,
      birth_month: month,
      birth_year: year,
      character_name: characterName,
      character_description: characterDescription,
      prediction_text: prediction,
      image_variants: characterImage ? { saved_from_guest: characterImage } as any : null,
      question_theme: questionTheme,
      generation_source: 'guest_saved',
      usage_count: 1,
      last_used_at: new Date().toISOString(),
      is_active: true,
      metadata: {
        saved_at: new Date().toISOString(),
        saved_from_guest_session: true,
        client_ip: clientIP,
        user_type: 'registered',
        content_hash: contentHash,
      },
    };

    const { data: savedPrediction, error: insertError } = await supabase
      .from('prediction_results')
      .insert(predictionData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Failed to save prediction:', insertError);
      return NextResponse.json(
        {
          error: 'Save failed',
          message: 'Unable to save your prediction. Please try again.',
        },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ 
      success: true,
      message: 'Prediction saved successfully',
      predictionId: savedPrediction.id
    });
    
    // Never cache auth-dependent responses
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    
    return response;

  } catch (error) {
    console.error('Save prediction API error:', error);
    return NextResponse.json(
      {
        error: 'Unexpected error',
        message: 'An unexpected error occurred while saving your prediction.',
      },
      { status: 500 }
    );
  }
}

// Helper function to extract question theme (copied from main prediction route)
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