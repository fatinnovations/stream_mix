import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { queryClient } from '@/lib/queryClient';
import { Profile } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string, userType: 'artist' | 'fan') => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const activeUserIdRef = useRef<string | null>(null);

  const buildUsername = (u: User) => {
    const metaUsername = (u.user_metadata?.username as string | undefined)?.trim();
    if (metaUsername) return metaUsername;

    const display = (u.user_metadata?.display_name as string | undefined)?.trim();
    if (display) {
      const cleaned = display
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 24);
      if (cleaned) return cleaned;
    }

    const email = u.email ?? '';
    const local = (email.split('@')[0] ?? '').toLowerCase();
    const cleanedEmail = local.replace(/[^a-z0-9_]/g, '_').slice(0, 24);
    return cleanedEmail || `user_${u.id.slice(0, 6)}`;
  };

  const ensureProfile = async (u: User) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', u.id)
      .maybeSingle();

    if (!error && data) {
      if (activeUserIdRef.current === u.id) {
        setProfile(data as Profile);
      }
      return;
    }

    // No profile yet — create a minimal one on first login
    const userType =
      (u.user_metadata?.user_type as 'artist' | 'fan' | 'manager' | 'admin' | undefined) ?? 'fan';

    const displayName =
      (u.user_metadata?.display_name as string | undefined) ??
      (u.user_metadata?.username as string | undefined) ??
      null;

    const baseUsername = buildUsername(u);
    const tryUsernames = [baseUsername, `${baseUsername}_${u.id.slice(0, 6)}`];

    for (const username of tryUsernames) {
      const { data: inserted, error: insertError } = await supabase
        .from('profiles')
        .insert({
          user_id: u.id,
          username,
          display_name: displayName,
          user_type: userType,
        })
        .select('*')
        .maybeSingle();

      if (!insertError && inserted) {
        if (activeUserIdRef.current === u.id) {
          setProfile(inserted as Profile);
        }
        return;
      }

      // If it's not a duplicate username issue, don't keep retrying.
      const msg = String((insertError as any)?.message ?? '').toLowerCase();
      if (insertError && !msg.includes('duplicate')) {
        break;
      }
    }

    // Creation failed (RLS/validation/etc.)
    if (activeUserIdRef.current === u.id) {
      setProfile(null);
    }
  };

  useEffect(() => {
    let cancelled = false;

    // Set up auth state listener FIRST (keep callback synchronous to avoid deadlocks)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (cancelled) return;

      activeUserIdRef.current = nextSession?.user?.id ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
      }

      setLoading(false);

      // Defer any additional backend calls
      if (nextSession?.user) {
        setTimeout(() => {
          ensureProfile(nextSession.user).catch(() => {
            console.warn('[Auth] ensureProfile failed');
          });
        }, 0);
      }
    });

    // Then check for existing session
    const initSession = async () => {
      try {
        const {
          data: { session: existingSession },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        activeUserIdRef.current = existingSession?.user?.id ?? null;
        setSession(existingSession);
        setUser(existingSession?.user ?? null);

        if (existingSession?.user) {
          await ensureProfile(existingSession.user);
        } else {
          setProfile(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, username: string, userType: 'artist' | 'fan') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          username,
          display_name: username,
          user_type: userType,
        },
      },
    });

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  const signOut = async () => {
    console.info('[Auth] signOut');

    // Prevent any in-flight profile fetch from re-setting profile after logout
    activeUserIdRef.current = null;

    // Try to stop token auto-refresh (safety)
    try {
      (supabase.auth as any).stopAutoRefresh?.();
    } catch {
      // ignore
    }

    // Ask the auth client to clear its in-memory session + storage
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.warn('[Auth] supabase.auth.signOut failed:', error);
    } finally {
      // Force-remove any persisted tokens to prevent “auto login” after refresh
      try {
        const storageKey = (supabase.auth as any).storageKey as string | undefined;
        if (storageKey) window.localStorage.removeItem(storageKey);

        const keysToRemove: string[] = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => window.localStorage.removeItem(k));
      } catch {
        // ignore
      }

      // Clear react-query cache so no user-scoped data persists across sessions
      try {
        queryClient.clear();
      } catch {
        // ignore
      }

      // Clear app state last
      setProfile(null);
      setUser(null);
      setSession(null);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return { error: new Error('No profile found') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, ...updates });
    }

    return { error: error as Error | null };
  };

  const refreshProfile = async () => {
    if (user) {
      await ensureProfile(user);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      loading,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
