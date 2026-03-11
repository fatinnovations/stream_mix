import { LogIn, UserPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface LoginPromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: string;
}

export function LoginPromptModal({ open, onOpenChange, action = 'use this feature' }: LoginPromptModalProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const getReturnUrl = () => {
    return encodeURIComponent(location.pathname + location.search);
  };

  const handleLogin = () => {
    onOpenChange(false);
    navigate(`/auth?returnUrl=${getReturnUrl()}`, { state: { mode: 'signin' } });
  };

  const handleSignUp = () => {
    onOpenChange(false);
    navigate(`/auth?returnUrl=${getReturnUrl()}`, { state: { mode: 'signup' } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Join to {action}</DialogTitle>
          <DialogDescription className="text-center">
            Create a free account to {action}, save your favorites, and get personalized recommendations.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleSignUp} className="w-full gradient-primary">
            <UserPlus className="h-4 w-4 mr-2" />
            Sign Up Free
          </Button>
          <Button variant="outline" onClick={handleLogin} className="w-full">
            <LogIn className="h-4 w-4 mr-2" />
            Already have an account? Log In
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground mt-2">
          Your music will keep playing while you sign up!
        </p>
      </DialogContent>
    </Dialog>
  );
}
