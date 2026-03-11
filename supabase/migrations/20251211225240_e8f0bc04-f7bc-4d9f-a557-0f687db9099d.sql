-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Managers can view their managed artists" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update managed artists" ON public.profiles;

-- Create fixed policies that don't cause recursion
-- For managers viewing managed artists, we check if the managed_by field matches a profile with the current user's user_id
-- But we need to avoid self-referencing. Use a simpler approach with a function.

-- Create a helper function to check if current user is a manager of a profile
CREATE OR REPLACE FUNCTION public.is_manager_of(profile_managed_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = profile_managed_by
      AND user_id = auth.uid()
  )
$$;

-- Recreate the manager policies using the helper function
CREATE POLICY "Managers can view their managed artists"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id 
  OR (managed_by IS NOT NULL AND public.is_manager_of(managed_by))
);

CREATE POLICY "Managers can update managed artists"
ON public.profiles
FOR UPDATE
USING (
  managed_by IS NOT NULL AND public.is_manager_of(managed_by)
);