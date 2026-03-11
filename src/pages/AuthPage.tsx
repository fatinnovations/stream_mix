import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, ArrowLeft, RefreshCw } from 'lucide-react';
import streamixLogo from '@/assets/streamix-logo.jfif';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';
import { z } from 'zod';

const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(20, 'Username too long'),
});

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const resetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

function getSafeReturnPath(returnUrl: string | null): string {
  // URLSearchParams already decodes, so treat it as a plain relative path.
  if (!returnUrl) return '/';
  if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) return '/';
  return returnUrl;
}

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const { signIn, signUp, signOut, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [switchingAccount, setSwitchingAccount] = useState(false);

  const returnPath = getSafeReturnPath(searchParams.get('returnUrl'));

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate(returnPath);
    }
  }, [user, authLoading, navigate, returnPath]);

  // Handle switch account - clear current session
  const handleSwitchAccount = async () => {
    setSwitchingAccount(true);
    try {
      await signOut();
      toast.success('Session cleared. Please sign in with a different account.');
    } catch (error) {
      console.error('Error switching account:', error);
    } finally {
      setSwitchingAccount(false);
    }
  };

  // Check if user is coming from password reset link
  useEffect(() => {
    if (searchParams.get('mode') === 'reset') {
      setMode('reset');
    }
  }, [searchParams]);

  const handleSocialLogin = async (provider: 'google') => {
    setSocialLoading(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result?.error) {
        toast.error(result.error.message || 'Something went wrong. Please try again.');
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    }
    setSocialLoading(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'forgot') {
        const validation = resetSchema.safeParse({ email });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Password reset email sent! Check your inbox.');
          setMode('signin');
        }
      } else if (mode === 'signup') {
        const validation = signUpSchema.safeParse({ email, password, username });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, username, 'fan');
        if (error) {
          if (error.message.includes('already registered') || error.message.includes('User already registered')) {
            toast.error('This email is already registered. Please sign in.');
            setMode('signin');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Account created! Logging you in...');
          // Auto-login is handled by Supabase when auto-confirm is enabled
          // The auth state change listener will trigger navigation
        }
      } else {
        const validation = signInSchema.safeParse({ email, password });
        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          setLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          toast.error('Invalid email or password');
        } else {
          toast.success('Welcome back!');
          navigate(returnPath);
        }
      }
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-4 py-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={streamixLogo} alt="Streamix" className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover" />
          <h1 className="text-2xl font-bold gradient-text">Streamix</h1>
          <p className="text-muted-foreground mt-1">
            {mode === 'signin' && 'Welcome back!'}
            {mode === 'signup' && 'Start your music journey'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Create a new password'}
          </p>
        </div>

        {/* Back button for forgot/reset modes */}
        {(mode === 'forgot' || mode === 'reset') && (
          <button
            onClick={() => setMode('signin')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 mx-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </button>
        )}


        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10 h-12 bg-secondary border-border"
                />
              </div>
            </div>
          )}

          {mode !== 'reset' && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-secondary border-border"
                />
              </div>
            </div>
          )}

          {(mode !== 'forgot') && (
            <div className="space-y-2">
              <Label htmlFor="password">{mode === 'reset' ? 'New Password' : 'Password'}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-secondary border-border"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 h-12 bg-secondary border-border"
                />
              </div>
            </div>
          )}

          {/* Forgot password link */}
          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-sm text-primary hover:underline w-full text-right"
            >
              Forgot password?
            </button>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <span className="animate-pulse">Please wait...</span>
            ) : (
              <>
                {mode === 'signin' && 'Sign In'}
                {mode === 'signup' && 'Create Account'}
                {mode === 'forgot' && 'Send Reset Link'}
                {mode === 'reset' && 'Update Password'}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </Button>
        </form>

        {/* Social login options */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="mt-6">
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              className="w-full h-12"
              onClick={() => handleSocialLogin('google')}
              disabled={!!socialLoading}
            >
              {socialLoading === 'google' ? (
                <span className="animate-pulse">Connecting...</span>
              ) : (
                <>
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          </div>
        )}

        {/* Bottom links */}
        {mode === 'signin' && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{' '}
            <button
              onClick={() => setMode('signup')}
              className="text-primary hover:underline font-medium"
            >
              Create one
            </button>
          </p>
        )}

        {mode === 'signup' && (
          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <button
              onClick={() => setMode('signin')}
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        )}

        {/* Switch Account Button */}
        {(mode === 'signin' || mode === 'signup') && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={handleSwitchAccount}
              disabled={switchingAccount}
            >
              {switchingAccount ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Switch Account / Clear Session
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
