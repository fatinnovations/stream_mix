import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { GuestBanner } from './GuestBanner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  showBanner?: boolean;
  bannerMessage?: string;
}

export function ProtectedRoute({ children, showBanner = true, bannerMessage }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    if (showBanner) {
      return <GuestBanner message={bannerMessage} />;
    }
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?returnUrl=${returnUrl}`} replace />;
  }

  return <>{children}</>;
}
