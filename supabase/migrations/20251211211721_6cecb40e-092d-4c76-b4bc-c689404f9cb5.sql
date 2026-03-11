-- Add payment_proof_url column to artist_subscriptions for transaction screenshots
ALTER TABLE public.artist_subscriptions 
ADD COLUMN IF NOT EXISTS payment_proof_url TEXT;

-- Add managed_by column for manager relationships with artists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS managed_by UUID REFERENCES public.profiles(id);

-- Add notes column for admin/manager notes on subscriptions
ALTER TABLE public.artist_subscriptions 
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Create index for faster manager queries
CREATE INDEX IF NOT EXISTS idx_profiles_managed_by ON public.profiles(managed_by);

-- Update RLS policy to allow managers to view their managed artists
CREATE POLICY "Managers can view their managed artists"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = profiles.managed_by 
    AND p.user_id = auth.uid()
  )
);

-- Allow managers to update their managed artists' profiles
CREATE POLICY "Managers can update managed artists"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = profiles.managed_by 
    AND p.user_id = auth.uid()
  )
);

-- Allow managers to view subscriptions of their managed artists
CREATE POLICY "Managers can view managed artist subscriptions"
ON public.artist_subscriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = artist_subscriptions.artist_id 
    AND p.managed_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- Allow artists to update their own subscription (for uploading payment proof)
CREATE POLICY "Artists can update their own subscription payment proof"
ON public.artist_subscriptions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = artist_subscriptions.artist_id 
    AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = artist_subscriptions.artist_id 
    AND p.user_id = auth.uid()
  )
);