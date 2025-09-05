'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Sparkles } from 'lucide-react';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/?error=auth-failed');
          return;
        }

        if (data.session) {
          // Successful authentication - redirect to home
          router.push('/?welcome=true');
        } else {
          // No session found - redirect to home
          router.push('/');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/?error=auth-failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <main className="container mx-auto flex min-h-screen flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-8 shadow-sm">
        <Sparkles className="h-12 w-12 animate-magic-pulse text-primary" />
        <p className="text-muted-foreground">The cosmic energies are aligning...</p>
        <p className="text-sm text-muted-foreground">Completing your mystical journey</p>
      </div>
    </main>
  );
}