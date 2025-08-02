
'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Download, Share2, Gift } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

import type { CharacterMatchOutput } from '@/ai/flows/character-match';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface PredictionResultProps {
  result: CharacterMatchOutput;
  name: string;
  question: string;
}

export function PredictionResult({ result, name, question }: PredictionResultProps) {
  const resultCardRef = useRef<HTMLDivElement>(null);

  const generateImage = async (element: HTMLDivElement) => {
    // The element needs to be in the DOM, and we need to set the background
    // color of the parent to be the same as the theme's background to get
    // the rounded corners correctly.
    if (element.parentElement) {
        element.parentElement.style.backgroundColor = 'hsl(var(--background))';
    }
    const dataUrl = await htmlToImage.toPng(element, {
      cacheBust: true,
      pixelRatio: 2,
      skipFonts: true,
    });
    if (element.parentElement) {
        element.parentElement.style.backgroundColor = '';
    }
    return dataUrl
  };

  const handleDownload = async () => {
    if (!resultCardRef.current) return;
    const dataUrl = await generateImage(resultCardRef.current);
    const link = document.createElement('a');
    link.download = 'cosmic-quirk-prediction.png';
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async () => {
    if (!resultCardRef.current) return;

    try {
      const dataUrl = await generateImage(resultCardRef.current);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'cosmic-quirk-prediction.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Cosmic Quirk Prediction!',
          text: `Check out my funny future prediction from Cosmic Quirks!`,
        });
      } else {
        alert("Your browser doesn't support sharing files.");
      }
    } catch (error) {
      console.error('oops, something went wrong!', error);
    }
  };

  return (
    <div className="w-full max-w-lg animate-in fade-in-50 zoom-in-95 duration-500">
      <div ref={resultCardRef} className="p-4 bg-transparent">
        <Card className="overflow-hidden rounded-2xl border-2 border-primary/20 shadow-lg">
          <CardContent className="p-0">
            <div className="bg-card p-6 text-center">
                <div className="flex justify-center items-center mb-4">
                    <Gift className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold">A Birthday Match for {name}!</h2>
                <p className="text-muted-foreground">You share a birthday with...</p>
            </div>
            
            <div className="p-6 bg-muted/30">
                <div className="w-full aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden border">
                    <Image
                        src={result.characterImage}
                        alt={`Image of ${result.characterName}`}
                        width={400}
                        height={400}
                        className="object-cover w-full h-full"
                        data-ai-hint="character portrait"
                    />
                </div>
                <h3 className="text-xl font-semibold text-center">{result.characterName}</h3>
                <p className="text-muted-foreground italic mt-2 text-center">{result.characterDescription}</p>
            </div>
            
            <div className="bg-card p-6 text-center">
                <h3 className="text-xl font-bold">Question</h3>
                <p className="text-foreground/90 mt-2 line-clamp-2">
                  {question}
                </p>
                <div className="my-4 h-px w-20 bg-primary/20 mx-auto" />
                <h3 className="text-2xl font-bold text-primary">Your Cosmic Prediction</h3>
                <p className="text-foreground/90 mt-4">
                    {result.prediction}
                </p>
                <p className="text-xs text-primary mt-4 text-center">
                  cosmicQuirks.in
                </p>
            </div>

          </CardContent>
        </Card>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download />
          Download
        </Button>
        <Button onClick={handleShare} size="sm">
          <Share2 />
          Share
        </Button>
      </div>
    </div>
  );
}
