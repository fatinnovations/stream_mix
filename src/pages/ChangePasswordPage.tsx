import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, Eye, EyeOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function ChangePasswordPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const passwordRequirements = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Contains a number', met: /[0-9]/.test(password) },
  ];

  const allRequirementsMet = passwordRequirements.every(r => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!allRequirementsMet) {
      toast.error('Please meet all password requirements');
      return;
    }
    
    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast.success('Password updated successfully');
      navigate('/settings');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pb-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 py-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Change Password</h1>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <div className="p-4 rounded-xl bg-secondary/50 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Create a strong password to secure your account
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="p-4 rounded-xl bg-secondary/50">
          <p className="text-sm font-medium mb-3">Password Requirements</p>
          <div className="space-y-2">
            {passwordRequirements.map((req, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                  req.met ? 'bg-success' : 'bg-muted'
                }`}>
                  {req.met && <Check className="h-2.5 w-2.5 text-white" />}
                </div>
                <span className={`text-sm ${req.met ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {req.label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
              <div className={`h-4 w-4 rounded-full flex items-center justify-center ${
                passwordsMatch ? 'bg-success' : 'bg-muted'
              }`}>
                {passwordsMatch && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span className={`text-sm ${passwordsMatch ? 'text-foreground' : 'text-muted-foreground'}`}>
                Passwords match
              </span>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full gradient-primary"
          disabled={isLoading || !allRequirementsMet || !passwordsMatch}
        >
          {isLoading ? 'Updating...' : 'Update Password'}
        </Button>
      </motion.form>
    </div>
  );
}
