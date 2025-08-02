
'use client';

import { useState, useEffect } from 'react';
import type { z } from 'zod';
import { PredictionForm, type PredictionFormSchema } from '@/components/prediction-form';
import { PredictionResult } from '@/components/prediction-result';
import { getPrediction } from '@/app/actions';
import type { CharacterMatchOutput } from '@/ai/flows/character-match';
import { useToast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';
import ReactConfetti from 'react-confetti';

const loadingMessages = [
  'Consulting the celestial archives...',
  'Gazing into the cosmic crystal ball...',
  'Shuffling the tarot cards of time...',
  "Polishing the oracle's spectacles...",
  'Decoding ancient prophecies...',
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CharacterMatchOutput | null>(null);
  const [userName, setUserName] = useState('');
  const [userQuestion, setUserQuestion] = useState('');
  const { toast } = useToast();
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState<{width: number; height: number}>({width: 0, height: 0});
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [loadingText, setLoadingText] = useState(loadingMessages[0]);

  useEffect(() => {
    const updateWindowSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateWindowSize();
    setCurrentYear(new Date().getFullYear());

    window.addEventListener('resize', updateWindowSize);
    return () => window.removeEventListener('resize', updateWindowSize);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingText(prevText => {
          const currentIndex = loadingMessages.indexOf(prevText);
          const nextIndex = (currentIndex + 1) % loadingMessages.length;
          return loadingMessages[nextIndex];
        });
      }, 2000);
    } else {
      setLoadingText(loadingMessages[0]);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLoading]);


  const handleSubmit = async (data: z.infer<typeof PredictionFormSchema>) => {
    setIsLoading(true);
    setResult(null);
    setUserName(data.name);
    setUserQuestion(data.question);
    
    const response = await getPrediction(data);

    if (response.error) {
      toast({
        variant: 'destructive',
        title: 'The cosmos are fuzzy right now.',
        description: response.error,
      });
    } else if (response.data) {
      setResult(response.data);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 8000);
    }
    setIsLoading(false);
  };

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
      {showConfetti && windowSize.width > 0 && <ReactConfetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={400} />}
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
              <Sparkles className="h-12 w-12 animate-magic-pulse text-primary" />
              <p className="text-muted-foreground">{loadingText}</p>
            </div>
          )}

          {result && (
            <>
              <PredictionResult result={result} name={userName} question={userQuestion} />
              <button
                onClick={() => {
                  setResult(null);
                  setUserName('');
                  setUserQuestion('');
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
        {currentYear && <p>&copy; {currentYear} Cosmic Quirks. For entertainment purposes only.</p>}
      </footer>
    </main>
  );
}
