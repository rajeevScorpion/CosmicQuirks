'use client';

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

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
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign-in error:', error);
      toast({
        variant: 'destructive',
        title: 'The cosmic gateway is blocked!',
        description: 'Unable to connect with Google. The universe may be experiencing technical difficulties.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSignIn}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={className}
    >
      <LogIn className="h-4 w-4" />
      {children || (isLoading ? 'Connecting to the cosmos...' : 'Sign in with Google')}
    </Button>
  );
}