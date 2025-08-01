'use client';

import { useState } from 'react';
import type { z } from 'zod';
import { PredictionForm, type PredictionFormSchema } from '@/components/prediction-form';
import { PredictionResult } from '@/components/prediction-result';
import { LoadingSpinner } from '@/components/loading-spinner';
import { getPrediction } from '@/app/actions';
import type { CharacterMatchOutput } from '@/ai/flows/character-match';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CharacterMatchOutput | null>(null);
  const [userName, setUserName] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (data: z.infer<typeof PredictionFormSchema>) => {
    setIsLoading(true);
    setResult(null);
    setUserName(data.name);

    const response = await getPrediction(data);

    if (response.error) {
      toast({
        variant: 'destructive',
        title: 'The cosmos are fuzzy right now.',
        description: response.error,
      });
    } else if (response.data) {
      setResult(response.data);
    }
    setIsLoading(false);
  };

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-10 w-10 text-primary" />
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl font-headline">
                Cosmic Quirks
              </h1>
            </div>
            <p className="mb-8 max-w-md text-muted-foreground md:text-lg">
              Your future, revealed with a wink from history. Tell us your birthdate and a burning question.
            </p>
        </div>

        <div className="relative">
          {!result && !isLoading && <PredictionForm onSubmit={handleSubmit} isLoading={isLoading} />}
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-8 shadow-sm">
              <LoadingSpinner />
              <p className="text-muted-foreground">Consulting the celestial archives...</p>
            </div>
          )}

          {result && (
            <>
              <PredictionResult result={result} name={userName} />
              <button
                onClick={() => {
                  setResult(null);
                  setUserName('');
                }}
                className="mx-auto mt-6 block text-sm text-primary underline-offset-4 hover:underline"
              >
                Ask another question
              </button>
            </>
          )}
        </div>
      </div>
       <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Cosmic Quirks. For entertainment purposes only.</p>
      </footer>
    </main>
  );
}
