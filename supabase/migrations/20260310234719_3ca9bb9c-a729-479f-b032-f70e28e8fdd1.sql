CREATE POLICY "Admins can insert songs"
ON public.songs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_type));