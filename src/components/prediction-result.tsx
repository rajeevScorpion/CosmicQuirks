
'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Download, Share2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

import type { CharacterMatchOutput } from '@/ai/flows/character-match';
import { Button } from '@/components/ui/button';

interface PredictionResultProps {
  result: CharacterMatchOutput;
  name: string;
}

export function PredictionResult({ result, name }: PredictionResultProps) {
  const resultCardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!resultCardRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(resultCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
      });

      const link = document.createElement('a');
      link.download = 'cosmic-quirk-prediction.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('oops, something went wrong!', error);
    }
  };

  const handleShare = async () => {
    if (!resultCardRef.current) return;

    try {
      const dataUrl = await htmlToImage.toPng(resultCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
      });

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
      <div ref={resultCardRef} className="bg-card p-6 rounded-lg">
        <div className="text-center mb-4">
          <div className="mx-auto w-3 h-3 bg-muted-foreground/50 rounded-full mb-4"></div>
          <h2 className="text-2xl font-bold">A Birthday Match for {name} !</h2>
          <p className="text-muted-foreground">You share a birthday with...</p>
        </div>

        <div className="bg-muted/50 p-6 rounded-lg text-center mb-4">
          <div className="w-full aspect-square bg-muted rounded-md mb-4 flex items-center justify-center overflow-hidden">
             <Image
              src={result.characterImage}
              alt={`Image of ${result.characterName}`}
              width={400}
              height={400}
              className="object-cover w-full h-full"
              data-ai-hint="character portrait"
            />
          </div>
          <h3 className="text-xl font-semibold">{result.characterName}</h3>
          <p className="text-muted-foreground italic mt-2">{result.characterDescription}</p>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg text-center font-bold text-lg mb-4">
          Your Cosmic Prediction
        </div>

        <p className="text-center text-foreground/90">
          Hi {name}! {result.prediction}
        </p>
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={handleDownload} variant="outline" size="sm">
          <Download />
          Download
        </Button>
        <Button onClick={handleShare} size="sm">
          <Share2 />
          Share on WhatsApp
        </Button>
      </div>
    </div>
  );
}
