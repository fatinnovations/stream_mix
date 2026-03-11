import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { LoginPromptModal } from '@/components/auth/LoginPromptModal';

type LoginPromptContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  action: string;
  prompt: (action: string) => void;
};

const LoginPromptContext = createContext<LoginPromptContextType | undefined>(undefined);

export function LoginPromptProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState('use this feature');
  const timeoutRef = useRef<number | null>(null);

  const prompt = useCallback((nextAction: string) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setAction(nextAction);
    // Defer open to the next tick so any click/portal/focus teardown completes first.
    timeoutRef.current = window.setTimeout(() => setOpen(true), 0);
  }, []);

  const value = useMemo(
    () => ({ open, setOpen, action, prompt }),
    [open, action, prompt]
  );

  return (
    <LoginPromptContext.Provider value={value}>
      <LoginPromptModal open={open} onOpenChange={setOpen} action={action} />
      {children}
    </LoginPromptContext.Provider>
  );
}

export function useLoginPromptController() {
  const ctx = useContext(LoginPromptContext);
  if (!ctx) throw new Error('useLoginPromptController must be used within a LoginPromptProvider');
  return ctx;
}
