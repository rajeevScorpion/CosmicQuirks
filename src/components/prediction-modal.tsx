'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { Download, Share2, Gift, X } from 'lucide-react';
import * as htmlToImage from 'html-to-image';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ImageVariants {
  small?: {
    url: string;
    width: number;
    height: number;
    quality: number;
    size_bytes: number;
  };
  medium?: {
    url: string;
    width: number;
    height: number;
    quality: number;
    size_bytes: number;
  };
  large?: {
    url: string;
    width: number;
    height: number;
    quality: number;
    size_bytes: number;
  };
}

interface PredictionResult {
  id: string;
  created_at: string;
  user_name: string;
  question: string;
  character_name: string;
  character_description: string;
  image_variants: ImageVariants | null;
  prediction_text: string;
}

interface PredictionModalProps {
  prediction: PredictionResult | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PredictionModal({ prediction, isOpen, onClose }: PredictionModalProps) {
  const resultCardRef = useRef<HTMLDivElement>(null);

  if (!prediction) return null;

  const getImageUrl = (imageVariants: ImageVariants | null): string => {
    if (!imageVariants) {
      // Return a placeholder SVG for cosmic theme
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="400" height="400" rx="20" fill="hsl(var(--muted))"/>
          <circle cx="200" cy="120" r="8" fill="hsl(var(--muted-foreground))" opacity="0.5">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="120" cy="200" r="6" fill="hsl(var(--muted-foreground))" opacity="0.3">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="280" cy="180" r="4" fill="hsl(var(--muted-foreground))" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <path d="M200 150 L210 180 L240 200 L210 220 L200 250 L190 220 L160 200 L190 180 Z" fill="hsl(var(--primary))" opacity="0.6">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite"/>
          </path>
        </svg>
      `)}`;
    }

    // Prefer large, then medium, then small for the modal
    return imageVariants.large?.url || imageVariants.medium?.url || imageVariants.small?.url || getImageUrl(null);
  };

  const isIOSSafari = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    return isIOS || (isSafari && /Apple/.test(navigator.vendor));
  };

  const generateImage = async (element: HTMLDivElement) => {
    // The element needs to be in the DOM, and we need to set the background
    // color of the parent to be the same as the theme's background to get
    // the rounded corners correctly.
    if (element.parentElement) {
        element.parentElement.style.backgroundColor = 'hsl(var(--background))';
    }
    
    let dataUrl: string;
    
    if (isIOSSafari()) {
      // iOS Safari specific handling with timing fixes
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        dataUrl = await htmlToImage.toPng(element, {
          cacheBust: true,
          pixelRatio: 1, // Lower pixel ratio for iOS to avoid canvas size limits
          skipFonts: true,
          width: Math.min(element.offsetWidth, 2048), // Limit size for iOS
          height: Math.min(element.offsetHeight, 2048),
        });
      } catch (error) {
        console.warn('iOS PNG generation failed, retrying with lower quality:', error);
        // Fallback with even more conservative settings
        await new Promise(resolve => setTimeout(resolve, 200));
        dataUrl = await htmlToImage.toPng(element, {
          cacheBust: true,
          pixelRatio: 0.5,
          skipFonts: true,
          width: Math.min(element.offsetWidth, 1024),
          height: Math.min(element.offsetHeight, 1024),
        });
      }
    } else {
      // Keep existing Android-working code unchanged
      dataUrl = await htmlToImage.toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        skipFonts: true,
      });
    }
    
    if (element.parentElement) {
        element.parentElement.style.backgroundColor = '';
    }
    return dataUrl;
  };

  const handleDownload = async () => {
    if (!resultCardRef.current) return;
    
    try {
      const dataUrl = await generateImage(resultCardRef.current);
      const link = document.createElement('a');
      link.download = `cosmic-prediction-${prediction.character_name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Download failed:', error);
      alert('The cosmic energies are disrupted! Please try again.');
    }
  };

  const handleShare = async () => {
    if (!resultCardRef.current) return;

    try {
      const dataUrl = await generateImage(resultCardRef.current);
      
      if (isIOSSafari()) {
        // iOS specific handling with additional timing and error handling
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          const blob = await (await fetch(dataUrl)).blob();
          
          if (blob.size === 0) {
            throw new Error('Generated image is empty');
          }
          
          const file = new File([blob], `cosmic-prediction-${prediction.character_name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'My Cosmic Quirk Prediction!',
              text: `Check out my cosmic prediction featuring ${prediction.character_name}!`,
            });
          } else {
            // iOS fallback: try to copy image data URL to clipboard
            try {
              await navigator.clipboard.writeText('Check out my cosmic prediction! Download the image from Cosmic Quirks and share it manually.');
              alert('Sharing not available. Link copied to clipboard! You can download the image using the Download button.');
            } catch (clipboardError) {
              alert('Sharing not supported on this device. Please use the Download button to save the image.');
            }
          }
        } catch (shareError) {
          console.warn('iOS sharing failed:', shareError);
          alert('Unable to share the image. Please use the Download button to save it instead.');
        }
      } else {
        // Keep existing Android-working code unchanged
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `cosmic-prediction-${prediction.character_name.toLowerCase().replace(/\s+/g, '-')}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'My Cosmic Quirk Prediction!',
            text: `Check out my cosmic prediction featuring ${prediction.character_name}!`,
          });
        } else {
          alert("Your browser doesn't support sharing files.");
        }
      }
    } catch (error) {
      console.error('Share failed:', error);
      if (isIOSSafari()) {
        alert('The cosmic energies are disrupted! Please try downloading the image instead.');
      } else {
        alert('Sharing failed. Please try the download button instead.');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-center">
            Your Cosmic Prediction
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            {formatDate(prediction.created_at)}
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          <div className="w-full max-w-lg mx-auto animate-in fade-in-50 zoom-in-95 duration-500">
            <div ref={resultCardRef} className="p-4 bg-transparent">
              <Card className="overflow-hidden rounded-2xl border-2 border-primary/20 shadow-lg">
                <CardContent className="p-0">
                  <div className="bg-card p-6 text-center">
                      <div className="flex justify-center items-center mb-4">
                          <Gift className="w-8 h-8 text-primary animate-pulse" />
                      </div>
                      <h2 className="text-2xl font-bold">A Birthday Match for {prediction.user_name}!</h2>
                      <p className="text-muted-foreground">You share a birthday with...</p>
                  </div>
                  
                  <div className="p-6 bg-muted/30">
                      <div className="w-full aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center overflow-hidden border">
                          <Image
                              src={getImageUrl(prediction.image_variants)}
                              alt={`Image of ${prediction.character_name}`}
                              width={400}
                              height={400}
                              className="object-cover w-full h-full"
                              data-ai-hint="character portrait"
                          />
                      </div>
                      <h3 className="text-xl font-semibold text-center animate-pulse">{prediction.character_name}</h3>
                      <p className="text-muted-foreground italic mt-2 text-center">{prediction.character_description}</p>
                  </div>
                  
                  <div className="bg-card p-6 text-center">
                      <h3 className="text-xl font-bold">Question</h3>
                      <p className="text-foreground/90 mt-2">
                        {prediction.question}
                      </p>
                      <div className="my-4 h-px w-20 bg-primary/20 mx-auto" />
                      <h3 className="text-2xl font-bold text-primary animate-pulse">Your Cosmic Prediction</h3>
                      <p className="text-foreground/90 mt-4 leading-relaxed">
                          {prediction.prediction_text}
                      </p>
                      <p className="text-xs text-primary mt-4 text-center">
                        cosmicQuirks.in
                      </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="mt-4 flex justify-center gap-3">
              <Button 
                onClick={handleDownload} 
                variant="outline" 
                size="sm"
                className="animate-in slide-in-from-left-5 duration-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button 
                onClick={handleShare} 
                size="sm"
                className="animate-in slide-in-from-right-5 duration-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}