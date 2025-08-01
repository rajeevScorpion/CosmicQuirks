'use client';

import type { CharacterMatchOutput } from '@/ai/flows/character-match';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Gift, Quote, Sparkles } from 'lucide-react';
import { Separator } from './ui/separator';
import Image from 'next/image';

type PredictionResultProps = {
  result: CharacterMatchOutput;
  name: string;
};

export function PredictionResult({ result, name }: PredictionResultProps) {
  return (
    <Card className="w-full max-w-lg animate-in fade-in-50 zoom-in-95 duration-500">
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Gift className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="font-headline text-2xl">A Birthday Match for {name}!</CardTitle>
        <p className="text-muted-foreground">You share a birthday with...</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border bg-background p-4">
          <div className="flex flex-col items-center gap-4">
            <div className="w-full">
               <Image
                src={result.characterImage}
                alt={`Image of ${result.characterName}`}
                width={400}
                height={400}
                className="rounded-lg object-cover aspect-square"
                data-ai-hint="character portrait"
              />
            </div>
            <div className='text-center'>
              <h3 className="font-semibold text-foreground text-lg">{result.characterName}</h3>
              <p className="text-sm text-muted-foreground">{result.characterDescription}</p>
            </div>
          </div>
        </div>
        
        <Separator />

        <div>
            <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg text-primary">Your Cosmic Prediction</h3>
            </div>
            <div className="relative">
                <Quote className="absolute -left-2 -top-1 h-4 w-4 text-muted-foreground/50" />
                <p className="pl-4 text-foreground/90 italic">
                    {result.prediction}
                </p>
                <Quote className="absolute -bottom-1 -right-2 h-4 w-4 rotate-180 text-muted-foreground/50" />
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
