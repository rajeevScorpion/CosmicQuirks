'use client';

import { useRef, useCallback } from 'react';
import type { CharacterMatchOutput } from '@/ai/flows/character-match';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift, Quote, Sparkles, Share2, Download } from 'lucide-react';
import { Separator } from './ui/separator';
import Image from 'next/image';
import * as htmlToImage from 'html-to-image';
import { useToast } from '@/hooks/use-toast';

type PredictionResultProps = {
  result: CharacterMatchOutput;
  name: string;
};

export function PredictionResult({ result, name }: PredictionResultProps) {
  const resultCardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleDownload = useCallback(async () => {
    if (!resultCardRef.current) {
      return;
    }

    try {
      const dataUrl = await htmlToImage.toPng(resultCardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
      });

      const link = document.createElement('a');
      link.download = 'cosmic-quirk.png';
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: 'Could not generate image for download. Please try again.',
      });
    }
  }, [toast]);

  const handleShare = useCallback(async () => {
    if (!resultCardRef.current) {
      return;
    }

    try {
      const dataUrl = await htmlToImage.toPng(resultCardRef.current, { 
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true
       });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'cosmic-quirk.png', { type: 'image/png' });
      
      const shareText = `Check out my cosmic prediction! My historical birthday match is ${result.characterName}.`;

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Cosmic Quirk!',
          text: shareText,
        });
      } else if (navigator.canShare) {
        // Fallback for devices that can share text but not files
         await navigator.share({
            title: 'My Cosmic Quirk!',
            text: `${shareText}\n${result.prediction}`,
        });
      }
       else {
        // Fallback for browsers that do not support Web Share API
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
          `${shareText}\n\nPrediction: "${result.prediction}"`
        )}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      toast({
        variant: 'destructive',
        title: 'Sharing Failed',
        description: 'Could not generate image for sharing. Please try again.',
      });
    }
  }, [result, toast]);

  return (
    <div className="relative">
      <Card ref={resultCardRef} className="w-full max-w-lg animate-in fade-in-50 zoom-in-95 duration-500 overflow-hidden">
        <CardHeader className="text-center bg-card">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Gift className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-headline text-2xl">A Birthday Match for {name}!</CardTitle>
          <p className="text-muted-foreground">You share a birthday with...</p>
        </CardHeader>
        <CardContent className="space-y-6 bg-card">
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
         <CardFooter className="bg-card pt-6 flex justify-end gap-2">
            <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="mr-2" />
                Download
            </Button>
            <Button onClick={handleShare} size="sm">
                <Share2 className="mr-2" />
                Share
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
