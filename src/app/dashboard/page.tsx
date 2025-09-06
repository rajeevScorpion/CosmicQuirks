'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Calendar, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase/client';
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
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [predictions, setPredictions] = useState<PredictionResult[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const fetchPredictions = async () => {
    try {
      const { data, error } = await supabase
        .from('prediction_results')
        .select('*')
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {predictions.map((prediction) => (
              <Card key={prediction.id} className="overflow-hidden border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">{prediction.character_name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {prediction.character_description}
                      </p>
                    </div>
                    <div className="w-16 h-16 rounded-lg overflow-hidden border bg-muted ml-3 shrink-0">
                      <Image
                        src={getImageUrl(prediction.image_variants)}
                        alt={prediction.character_name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div>
                    <div className="text-sm font-medium text-primary mb-1">Your Question:</div>
                    <div className="text-sm text-muted-foreground line-clamp-2">
                      {prediction.question}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-primary mb-1">Prediction:</div>
                    <div className="text-sm line-clamp-3">
                      {prediction.prediction_text}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Calendar className="w-3 h-3" />
                    {formatDate(prediction.created_at)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}