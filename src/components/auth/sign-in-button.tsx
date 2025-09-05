'use client';

import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthDialog } from './auth-dialog';

interface SignInButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  children?: React.ReactNode;
  className?: string;
}

export function SignInButton({ 
  variant = 'default', 
  size = 'default', 
  children,
  className 
}: SignInButtonProps) {
  return (
    <AuthDialog>
      <Button
        variant={variant}
        size={size}
        className={className}
      >
        <LogIn className="h-4 w-4" />
        {children || 'Sign In'}
      </Button>
    </AuthDialog>
  );
}