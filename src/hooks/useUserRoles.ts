import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type UserRole = 'artist' | 'fan' | 'manager' | 'admin';

interface UserRolesState {
  roles: UserRole[];
  isAdmin: boolean;
  isManager: boolean;
  isArtist: boolean;
  loading: boolean;
}

export function useUserRoles(): UserRolesState {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchRoles = async () => {
      if (!user?.id) {
        setRoles([]);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setRoles([]);
        } else if (!cancelled && data) {
          setRoles(data.map(r => r.role as UserRole));
        }
      } catch (err) {
        console.error('Error fetching user roles:', err);
        setRoles([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRoles();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return {
    roles,
    isAdmin: roles.includes('admin'),
    isManager: roles.includes('manager'),
    isArtist: roles.includes('artist'),
    loading,
  };
}
