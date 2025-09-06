'use client';

import { useState } from 'react';
import { Star, Sparkles, Save, Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';

interface SignupIncentiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignupClick: () => void;
  onContinueWithoutSignup: () => void;
}

export function SignupIncentiveModal({
  isOpen,
  onClose,
  onSignupClick,
  onContinueWithoutSignup,
}: SignupIncentiveModalProps) {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleSignup = () => {
    handleClose();
    onSignupClick();
  };

  const handleContinue = () => {
    handleClose();
    onContinueWithoutSignup();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Star className="w-12 h-12 text-primary animate-pulse" />
              <Sparkles className="w-6 h-6 text-primary/60 absolute -top-1 -right-1 animate-bounce" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold">
            Save Your Cosmic Reading?
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            The stars have aligned with a special prediction just for you! 
            Would you like to preserve this cosmic wisdom forever?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-6">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-primary mb-2 flex items-center gap-2">
              <Save className="w-4 h-4" />
              Premium Cosmic Features
            </h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Save all your predictions forever</li>
              <li>• Access your cosmic history anytime</li>
              <li>• Get personalized insights over time</li>
              <li>• Higher quality character illustrations</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full">
          <Button 
            onClick={handleSignup}
            className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Star className="w-4 h-4 mr-2" />
            Preserve My Fortune Forever
          </Button>
          <Button 
            variant="outline" 
            onClick={handleContinue}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Let the Cosmos Flow Free
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-2">
          You can always download and share your prediction without signing up
        </p>
      </DialogContent>
    </Dialog>
  );
}