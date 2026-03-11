-- Add approval fields to songs table
ALTER TABLE public.songs 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Create push subscriptions table for notifications
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, endpoint)
);

-- Enable RLS on push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can manage their own push subscriptions"
ON public.push_subscriptions
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = push_subscriptions.user_id AND profiles.user_id = auth.uid()
));

-- Create has_role function for admin checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_type)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admin policy for approving songs
CREATE POLICY "Admins can update any song"
ON public.songs
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can view all songs (including unapproved)
CREATE POLICY "Admins can view all songs"
ON public.songs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Update the published songs policy to also require approval
DROP POLICY IF EXISTS "Published songs are viewable by everyone" ON public.songs;
CREATE POLICY "Approved and published songs are viewable by everyone"
ON public.songs
FOR SELECT
USING ((is_published = true AND is_approved = true) OR public.has_role(auth.uid(), 'admin') OR EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = songs.artist_id AND profiles.user_id = auth.uid()
));

-- Admins can manage user roles
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));