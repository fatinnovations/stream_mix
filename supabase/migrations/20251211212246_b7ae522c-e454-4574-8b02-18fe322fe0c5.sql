-- Create payment_history table to track all subscription payments
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.artist_subscriptions(id) ON DELETE SET NULL,
  plan TEXT NOT NULL,
  amount TEXT NOT NULL,
  payment_method TEXT,
  payment_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Artists can view their own payment history
CREATE POLICY "Artists can view their own payment history"
ON public.payment_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = payment_history.artist_id 
    AND p.user_id = auth.uid()
  )
);

-- Artists can insert their own payment records
CREATE POLICY "Artists can insert their own payments"
ON public.payment_history
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = payment_history.artist_id 
    AND p.user_id = auth.uid()
  )
);

-- Admins can view all payment history
CREATE POLICY "Admins can view all payment history"
ON public.payment_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_type));

-- Admins can update payment history (for approval/rejection)
CREATE POLICY "Admins can update payment history"
ON public.payment_history
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::user_type));

-- Managers can view their managed artists' payment history
CREATE POLICY "Managers can view managed artist payments"
ON public.payment_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p 
    WHERE p.id = payment_history.artist_id 
    AND p.managed_by IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_payment_history_updated_at
BEFORE UPDATE ON public.payment_history
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();