import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Camera, MapPin, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

interface ProfileCompletionPromptProps {
  profile: {
    display_name?: string | null;
    bio?: string | null;
    avatar_url?: string | null;
    location?: string | null;
    country?: string | null;
  };
  onDismiss?: () => void;
}

export function ProfileCompletionPrompt({ profile, onDismiss }: ProfileCompletionPromptProps) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  // Check localStorage for dismissal
  useEffect(() => {
    const dismissedUntil = localStorage.getItem('profilePromptDismissed');
    if (dismissedUntil) {
      const dismissedTime = parseInt(dismissedUntil, 10);
      if (Date.now() < dismissedTime) {
        setDismissed(true);
      } else {
        localStorage.removeItem('profilePromptDismissed');
      }
    }
  }, []);

  // Calculate completion percentage
  const completionItems = [
    { key: 'display_name', label: 'Display name', icon: User, completed: !!profile.display_name },
    { key: 'avatar', label: 'Profile photo', icon: Camera, completed: !!profile.avatar_url },
    { key: 'bio', label: 'Bio', icon: FileText, completed: !!profile.bio },
    { key: 'location', label: 'Location', icon: MapPin, completed: !!(profile.location || profile.country) },
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const completionPercentage = Math.round((completedCount / completionItems.length) * 100);

  // Don't show if profile is complete or dismissed
  if (completionPercentage === 100 || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    // Dismiss for 24 hours
    localStorage.setItem('profilePromptDismissed', String(Date.now() + 24 * 60 * 60 * 1000));
    setDismissed(true);
    onDismiss?.();
  };

  const handleComplete = () => {
    navigate('/edit-profile');
  };

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-semibold text-foreground">Complete Your Profile</h3>
              <p className="text-sm text-muted-foreground">
                Stand out and get discovered by completing your profile
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Profile completion</span>
              <span className="font-medium text-primary">{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
          </div>

          {/* Completion items */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {completionItems.map((item) => (
              <div
                key={item.key}
                className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                  item.completed 
                    ? 'bg-green-500/10 text-green-400' 
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                {item.completed ? (
                  <CheckCircle className="h-4 w-4 text-green-400" />
                ) : (
                  <item.icon className="h-4 w-4" />
                )}
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <Button
            variant="gradient"
            size="sm"
            className="w-full"
            onClick={handleComplete}
          >
            Complete Profile
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
