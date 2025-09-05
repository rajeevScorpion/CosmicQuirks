'use client';

import { Sparkles } from 'lucide-react';
import { SignInButton } from '@/components/auth/sign-in-button';
import { UserMenu } from '@/components/auth/user-menu';
import { useAuth } from '@/contexts/auth-context';

export function Header() {
  const { user, loading } = useAuth();

  return (
    <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="mx-auto flex h-14 items-center justify-between w-full max-w-lg px-4 lg:max-w-[70%] lg:px-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg font-headline">Cosmic Quirks</span>
        </div>
        
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="h-10 w-24 animate-pulse rounded-md bg-muted" />
          ) : user ? (
            <UserMenu />
          ) : (
            <SignInButton variant="outline" size="sm" />
          )}
        </div>
      </div>
    </header>
  );
}