-- Add policy for admins to update profiles (for verifying artists)
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_type))
WITH CHECK (has_role(auth.uid(), 'admin'::user_type));