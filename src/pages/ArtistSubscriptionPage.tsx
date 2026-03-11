import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, CreditCard, Check, Upload, Image, Loader2, 
  Clock, CheckCircle, XCircle, AlertCircle, Receipt 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 'MWK 0',
    period: 'forever',
    features: ['Upload up to 3 songs', 'Basic analytics', 'Standard support'],
    uploadLimit: 3,
    color: 'bg-muted',
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 'MWK 5,000',
    period: '/month',
    features: ['Upload up to 10 songs', 'Detailed analytics', 'Priority support'],
    uploadLimit: 10,
    color: 'bg-blue-500/20',
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'MWK 15,000',
    period: '/month',
    features: ['Upload up to 50 songs', 'Advanced analytics', 'Featured placement', 'Premium support'],
    uploadLimit: 50,
    popular: true,
    color: 'bg-primary/20',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'MWK 30,000',
    period: '/month',
    features: ['Unlimited uploads', 'Full analytics suite', 'Priority featuring', 'Dedicated support', 'Promotional tools'],
    uploadLimit: 0,
    color: 'bg-accent/20',
  },
];

interface Subscription {
  id: string;
  plan: string;
  status: string;
  expires_at: string | null;
  upload_limit: number;
  songs_uploaded: number;
  payment_proof_url: string | null;
  admin_notes: string | null;
  verified_at: string | null;
}

export default function ArtistSubscriptionPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const proofInputRef = useRef<HTMLInputElement>(null);

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile || profile.user_type !== 'artist') {
      navigate('/');
      toast.error('Only artists can access subscription management');
      return;
    }
    fetchSubscription();
  }, [profile]);

  const fetchSubscription = async () => {
    if (!profile) return;
    setLoading(true);

    const { data } = await supabase
      .from('artist_subscriptions')
      .select('*')
      .eq('artist_id', profile.id)
      .maybeSingle();

    if (data) {
      setSubscription(data as Subscription);
      setSelectedPlan(data.plan);
      if (data.payment_proof_url) {
        setPaymentProofPreview(data.payment_proof_url);
      }
    }
    setLoading(false);
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.includes('image')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `payment-proofs/${profile.user_id}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from('covers').upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(path);
      setPaymentProofPreview(urlData.publicUrl);
      toast.success('Payment proof uploaded!');
    } catch (error) {
      toast.error('Failed to upload payment proof');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitSubscription = async () => {
    if (!profile || !selectedPlan) return;

    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan);
    if (!plan) return;

    // For paid plans, require payment proof
    if (selectedPlan !== 'free' && !paymentProofPreview) {
      toast.error('Please upload payment proof for paid plans');
      return;
    }

    setSaving(true);
    try {
      const status: 'active' | 'pending' | 'expired' | 'cancelled' = selectedPlan === 'free' ? 'active' : 'pending';
      const subData = {
        artist_id: profile.id,
        plan: selectedPlan as 'free' | 'basic' | 'premium' | 'pro',
        status,
        upload_limit: plan.uploadLimit,
        payment_proof_url: paymentProofPreview,
      };

      let subscriptionId = subscription?.id;

      if (subscription) {
        // Update existing subscription
        const { error } = await supabase
          .from('artist_subscriptions')
          .update(subData)
          .eq('id', subscription.id);
        if (error) throw error;
      } else {
        // Create new subscription
        const { data, error } = await supabase
          .from('artist_subscriptions')
          .insert([subData])
          .select()
          .single();
        if (error) throw error;
        subscriptionId = data?.id;
      }

      // Create payment history record for paid plans
      if (selectedPlan !== 'free') {
        const { error: paymentError } = await supabase
          .from('payment_history')
          .insert({
            artist_id: profile.id,
            subscription_id: subscriptionId,
            plan: selectedPlan,
            amount: plan.price,
            payment_proof_url: paymentProofPreview,
            status: 'pending',
          });
        
        if (paymentError) {
          console.error('Failed to create payment record:', paymentError);
        }
      }

      toast.success(
        selectedPlan === 'free'
          ? 'Free plan activated!'
          : 'Subscription submitted! Awaiting admin approval.'
      );
      fetchSubscription();
    } catch (error) {
      toast.error('Failed to save subscription');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === subscription?.plan);

  return (
    <div className="py-4 pb-32">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Subscription</h1>
            <p className="text-sm text-muted-foreground">Manage your artist subscription</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate('/payments')}>
          <Receipt className="h-4 w-4 mr-1" />
          History
        </Button>
      </div>

      {/* Current Subscription Status */}
      {subscription && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className={`${currentPlan?.color || 'bg-secondary'} border-0`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{subscription.plan} Plan</CardTitle>
                <Badge
                  variant={
                    subscription.status === 'active'
                      ? 'default'
                      : subscription.status === 'pending'
                      ? 'secondary'
                      : 'destructive'
                  }
                  className="capitalize"
                >
                  {subscription.status === 'active' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {subscription.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                  {subscription.status === 'expired' && <XCircle className="h-3 w-3 mr-1" />}
                  {subscription.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Uploads Used</p>
                  <p className="font-semibold">
                    {subscription.songs_uploaded} / {subscription.upload_limit || '∞'}
                  </p>
                </div>
                {subscription.expires_at && (
                  <div>
                    <p className="text-muted-foreground">Expires</p>
                    <p className="font-semibold">
                      {new Date(subscription.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
              {subscription.admin_notes && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Admin Note</AlertTitle>
                  <AlertDescription>{subscription.admin_notes}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Plans */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-4">
          {subscription ? 'Change Plan' : 'Select a Plan'}
        </h2>
        <div className="space-y-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className={`cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'ring-2 ring-primary border-primary'
                    : 'hover:border-primary/50'
                } ${plan.popular ? 'relative' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2 right-4 bg-primary">Most Popular</Badge>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <div className="text-right">
                      <span className="text-xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground text-sm">{plan.period}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Payment Proof Upload (for paid plans) */}
      {selectedPlan && selectedPlan !== 'free' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Payment Proof
              </CardTitle>
              <CardDescription>
                Upload a screenshot of your payment transaction for admin verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                ref={proofInputRef}
                type="file"
                accept="image/*"
                onChange={handleProofUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => proofInputRef.current?.click()}
                disabled={uploading}
                className="w-full p-6 rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center gap-3"
              >
                {uploading ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : paymentProofPreview ? (
                  <img
                    src={paymentProofPreview}
                    alt="Payment proof"
                    className="max-h-48 rounded-lg object-contain"
                  />
                ) : (
                  <>
                    <Image className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium">Upload Payment Screenshot</p>
                      <p className="text-sm text-muted-foreground">PNG, JPG up to 5MB</p>
                    </div>
                  </>
                )}
              </button>
              {paymentProofPreview && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    setPaymentProofPreview(null);
                  }}
                >
                  Remove & Upload New
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Submit Button */}
      <Button
        variant="gradient"
        size="lg"
        className="w-full"
        onClick={handleSubmitSubscription}
        disabled={
          saving ||
          !selectedPlan ||
          (selectedPlan !== 'free' && !paymentProofPreview) ||
          (subscription?.plan === selectedPlan && subscription?.status === 'active')
        }
      >
        {saving ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Saving...
          </>
        ) : subscription?.plan === selectedPlan && subscription?.status === 'active' ? (
          'Current Plan'
        ) : selectedPlan === 'free' ? (
          'Activate Free Plan'
        ) : (
          'Submit for Approval'
        )}
      </Button>
    </div>
  );
}
