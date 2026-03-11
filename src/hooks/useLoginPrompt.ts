import { useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLoginPromptController } from '@/contexts/LoginPromptContext';

export function useLoginPrompt() {
  const { user } = useAuth();
  const { open, setOpen, action, prompt } = useLoginPromptController();

  const requireAuth = useCallback(
    (nextAction: string, callback: () => void) => {
      if (!user) {
        prompt(nextAction);
        return false;
      }
      callback();
      return true;
    },
    [user, prompt]
  );

  const checkAuth = useCallback(
    (nextAction: string): boolean => {
      if (!user) {
        prompt(nextAction);
        return false;
      }
      return true;
    },
    [user, prompt]
  );

  return {
    showLoginPrompt: open,
    setShowLoginPrompt: setOpen,
    promptAction: action,
    requireAuth,
    checkAuth,
    isAuthenticated: !!user,
  };
}
