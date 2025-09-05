'use client';

import { useAuth } from '@/contexts/auth-context';
import { Sparkles } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
}

export function AuthGuard({ children, fallback, requireAuth = true }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-8 shadow-sm">
        <Sparkles className="h-12 w-12 animate-magic-pulse text-primary" />
        <p className="text-muted-foreground">Reading the cosmic signatures...</p>
      </div>
    );
  }

  if (requireAuth && !user) {
    return fallback || (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-8 shadow-sm text-center">
        <Sparkles className="h-12 w-12 text-primary/60" />
        <h3 className="text-lg font-semibold">Cosmic Access Required</h3>
        <p className="text-muted-foreground">
          This mystical realm requires authentication to enter.
        </p>
      </div>
    );
  }

  if (!requireAuth && user) {
    return fallback || null;
  }

  return <>{children}</>;
}