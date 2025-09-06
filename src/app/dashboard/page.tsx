'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';
import { PredictionModal } from '@/components/prediction-modal';
import Image from 'next/image';

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
  birth_month: string;
  birth_year: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Fetch user's predictions
  useEffect(() => {
    if (user) {
      fetchPredictions();
    }
  }, [user]);

  // Check if mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Intersection observer for mobile animations
  useEffect(() => {
    if (!isMobile || predictions.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const imageElement = entry.target.querySelector('.animate-image-mobile');
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            imageElement?.classList.add('in-view');
          } else {
            imageElement?.classList.remove('in-view');
          }
        });
      },
      { threshold: [0, 0.5, 1] }
    );

    cardRefs.current.forEach((ref) => {
      if (ref) observerRef.current?.observe(ref);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isMobile, predictions.length]);

  const fetchPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('prediction_results')
        .select('id, created_at, user_name, question, character_name, character_description, image_variants, prediction_text, birth_month, birth_year')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching predictions:', error);
        setError('The cosmic archives seem fuzzy right now. Please try again.');
        return;
      }

      setPredictions(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected cosmic disturbance occurred.');
    } finally {
      setLoadingPredictions(false);
    }
  };

  const getMonthName = (monthNumber: string): string => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthIndex = parseInt(monthNumber) - 1;
    return months[monthIndex] || 'Unknown';
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

  const getImageUrl = (imageVariants: ImageVariants | null): string => {
    if (!imageVariants) {
      // Return a placeholder SVG for cosmic theme
      return `data:image/svg+xml;base64,${btoa(`
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="8" fill="hsl(var(--muted))"/>
          <circle cx="32" cy="20" r="2" fill="hsl(var(--muted-foreground))" opacity="0.5">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
          </circle>
          <circle cx="20" cy="32" r="1.5" fill="hsl(var(--muted-foreground))" opacity="0.3">
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite"/>
          </circle>
          <circle cx="44" cy="28" r="1" fill="hsl(var(--muted-foreground))" opacity="0.4">
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite"/>
          </circle>
          <path d="M32 24 L34 30 L40 32 L34 34 L32 40 L30 34 L24 32 L30 30 Z" fill="hsl(var(--primary))" opacity="0.6">
            <animate attributeName="opacity" values="0.6;1;0.6" dur="4s" repeatCount="indefinite"/>
          </path>
        </svg>
      `)}`;
    }

    // Prefer medium, then small, then large
    return imageVariants.medium?.url || imageVariants.small?.url || imageVariants.large?.url || getImageUrl(null);
  };

  const handlePredictionClick = (prediction: PredictionResult) => {
    setSelectedPrediction(prediction);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedPrediction(null);
  };

  // Touch handlers for mobile
  const handleTouchStart = useCallback((index: number) => {
    if (!isMobile) return;
    
    const imageElement = cardRefs.current[index]?.querySelector('.animate-image-mobile');
    imageElement?.classList.add('tap-hold');
  }, [isMobile]);

  const handleTouchEnd = useCallback((index: number) => {
    if (!isMobile) return;
    
    const imageElement = cardRefs.current[index]?.querySelector('.animate-image-mobile');
    setTimeout(() => {
      imageElement?.classList.remove('tap-hold');
    }, 150);
  }, [isMobile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/')}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cosmic Oracle
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-primary animate-pulse" />
              Your Cosmic Collection
            </h1>
            <p className="text-muted-foreground mt-1">
              A gallery of your past predictions and cosmic encounters
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{predictions.length}</div>
              <div className="text-sm text-muted-foreground">Total Predictions</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {new Set(predictions.map(p => p.character_name)).size}
              </div>
              <div className="text-sm text-muted-foreground">Unique Characters</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {predictions.length > 0 ? formatDate(predictions[0].created_at).split(',')[0] : '—'}
              </div>
              <div className="text-sm text-muted-foreground">Latest Reading</div>
            </CardContent>
          </Card>
        </div>

        {/* Predictions Grid */}
        {loadingPredictions ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8 text-center">
            <CardContent>
              <div className="text-muted-foreground mb-4">{error}</div>
              <Button onClick={fetchPredictions} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : predictions.length === 0 ? (
          <Card className="p-8 text-center">
            <CardContent>
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Your Cosmic Journey Awaits</h3>
              <p className="text-muted-foreground mb-6">
                You haven't received any cosmic predictions yet. The universe is waiting to share its wisdom with you!
              </p>
              <Button onClick={() => router.push('/')} className="bg-gradient-to-r from-primary to-primary/80">
                <Sparkles className="w-4 h-4 mr-2" />
                Get Your First Prediction
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Info text for desktop users */}
            <div className="text-center mb-6 hidden md:block">
              <p className="text-sm text-muted-foreground">
                Hover over cards to see them come to life ✨
              </p>
            </div>
            
            <div className="masonry-grid md:columns-2 lg:columns-3 gap-6 space-y-6">
              {predictions.map((prediction, index) => (
                <Card 
                  key={prediction.id} 
                  ref={(el) => {
                    cardRefs.current[index] = el;
                  }}
                  className={`group break-inside-avoid mb-6 overflow-hidden border-primary/20 hover:border-primary/40 transition-all duration-500 cursor-pointer bg-card/80 backdrop-blur-sm ${
                    isMobile ? 'animate-card-mobile mobile-card' : 'animate-card-hover'
                  }`}
                  onClick={() => handlePredictionClick(prediction)}
                  onTouchStart={() => handleTouchStart(index)}
                  onTouchEnd={() => handleTouchEnd(index)}
                >
                  {/* 12px padding around the box */}
                  <div className="p-3">
                    {/* Character Image Section */}
                    <div className="relative w-full h-48 md:h-48 sm:h-36 bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden rounded-lg mb-4">
                      <Image
                        src={getImageUrl(prediction.image_variants)}
                        alt={prediction.character_name}
                        width={300}
                        height={192}
                        className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${
                          isMobile ? 'animate-image-mobile' : 'animate-image-hover group-hover:scale-110'
                        }`}
                      />
                    </div>

                    {/* All content centered */}
                    <div className="text-center space-y-3">
                      {/* Character Name */}
                      <h3 className="text-lg font-bold text-foreground leading-tight">
                        {prediction.character_name}
                      </h3>

                      {/* Birth Info */}
                      <p className="text-sm text-muted-foreground">
                        Born in {getMonthName(prediction.birth_month)} {prediction.birth_year}
                      </p>

                      {/* Character Description - truncated */}
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {prediction.character_description}
                      </p>

                      {/* Form Name's Asked */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-primary">
                          {prediction.user_name}'s Asked
                        </div>
                        <div className="text-sm text-foreground line-clamp-2">
                          {prediction.question}
                        </div>
                      </div>
                      
                      {/* Prediction - Full Text */}
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-primary">Prediction</div>
                        <div className="text-sm text-muted-foreground leading-relaxed">
                          {prediction.prediction_text}
                        </div>
                      </div>

                      {/* Line separator */}
                      <div className="border-t border-primary/20 pt-3 mt-4">
                        <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(prediction.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Prediction Modal */}
      <PredictionModal
        prediction={selectedPrediction}
        isOpen={modalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}