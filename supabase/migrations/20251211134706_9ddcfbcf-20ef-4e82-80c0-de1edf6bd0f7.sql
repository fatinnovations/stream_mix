-- Create subscription plans enum
CREATE TYPE public.subscription_plan AS ENUM ('free', 'basic', 'premium', 'pro');

-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('active', 'expired', 'cancelled', 'pending');

-- Create artist subscriptions table
CREATE TABLE public.artist_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan subscription_plan NOT NULL DEFAULT 'free',
  status subscription_status NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  upload_limit INTEGER NOT NULL DEFAULT 0,
  songs_uploaded INTEGER NOT NULL DEFAULT 0,
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_id)
);

-- Enable RLS
ALTER TABLE public.artist_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Artists can view their own subscription"
ON public.artist_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = artist_subscriptions.artist_id
    AND profiles.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all subscriptions"
ON public.artist_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage subscriptions"
ON public.artist_subscriptions
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_artist_subscriptions_updated_at
BEFORE UPDATE ON public.artist_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if artist has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_artist_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.artist_subscriptions
    WHERE artist_id = _artist_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > now())
      AND (upload_limit = 0 OR songs_uploaded < upload_limit)
  )
$$;