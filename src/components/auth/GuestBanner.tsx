import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';

interface GuestBannerProps {
  message?: string;
}

export function GuestBanner({ message = "Sign in to access this feature" }: GuestBannerProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignIn = () => {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    navigate(`/auth?returnUrl=${returnUrl}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="p-4 rounded-full bg-primary/10 mb-6">
        <LogIn className="h-12 w-12 text-primary" />
      </div>
      <h2 className="text-xl font-bold mb-2">{message}</h2>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Create an account or sign in to enjoy all features
      </p>
      <Button onClick={handleSignIn} size="lg" className="gap-2">
        <LogIn className="h-4 w-4" />
        Sign In
      </Button>
    </div>
  );
}
