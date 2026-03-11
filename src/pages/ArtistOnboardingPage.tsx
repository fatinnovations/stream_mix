import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, ArrowRight, Camera, Check, Loader2, 
  Music, User, CreditCard, Upload, Instagram, Twitter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STEPS = [
  { id: 'profile', title: 'Profile Setup', icon: User },
  { id: 'subscription', title: 'Choose Plan', icon: CreditCard },
  { id: 'upload', title: 'First Upload', icon: Upload },
];

const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 'MWK 0',
    period: 'forever',
    features: ['Upload up to 3 songs', 'Basic analytics', 'Standard support'],
    uploadLimit: 3,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 'MWK 5,000',
    period: '/month',
    features: ['Upload up to 10 songs', 'Detailed analytics', 'Priority support'],
    uploadLimit: 10,
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'MWK 15,000',
    period: '/month',
    features: ['Upload up to 50 songs', 'Advanced analytics', 'Featured placement', 'Premium support'],
    uploadLimit: 50,
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'MWK 30,000',
    period: '/month',
    features: ['Unlimited uploads', 'Full analytics suite', 'Priority featuring', 'Dedicated support', 'Promotional tools'],
    uploadLimit: 0,
  },
];

export default function ArtistOnboardingPage() {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Profile fields
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagram_url || '');
  const [twitterUrl, setTwitterUrl] = useState(profile?.twitter_url || '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');

  // Subscription
  const [selectedPlan, setSelectedPlan] = useState<string>('free');

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (!file.type.includes('image')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${profile.user_id}/${Date.now()}.${ext}`;

      const { error } = await supabase.storage.from('avatars').upload(path, file);
      if (error) throw error;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      setAvatarPreview(urlData.publicUrl);
      toast.success('Avatar uploaded!');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return false;
    setSaving(true);

    const { error } = await updateProfile({
      display_name: displayName || null,
      bio: bio || null,
      location: location || null,
      country: country || null,
      instagram_url: instagramUrl || null,
      twitter_url: twitterUrl || null,
      avatar_url: avatarPreview || null,
    });

    setSaving(false);

    if (error) {
      toast.error('Failed to save profile');
      return false;
    }
    
    await refreshProfile();
    return true;
  };

  const createSubscription = async () => {
    if (!profile) return false;
    setSaving(true);

    const plan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlan);
    if (!plan) return false;

    try {
      // Check if subscription already exists
      const { data: existing } = await supabase
        .from('artist_subscriptions')
        .select('id')
        .eq('artist_id', profile.id)
        .maybeSingle();

      if (existing) {
        // Update existing subscription
        const { error } = await supabase
          .from('artist_subscriptions')
          .update({
            plan: selectedPlan as 'free' | 'basic' | 'premium' | 'pro',
            status: selectedPlan === 'free' ? 'active' : 'pending',
            upload_limit: plan.uploadLimit,
          })
          .eq('artist_id', profile.id);

        if (error) throw error;
      } else {
        // Create new subscription
        const { error } = await supabase
          .from('artist_subscriptions')
          .insert({
            artist_id: profile.id,
            plan: selectedPlan as 'free' | 'basic' | 'premium' | 'pro',
            status: selectedPlan === 'free' ? 'active' : 'pending',
            upload_limit: plan.uploadLimit,
          });

        if (error) throw error;
      }

      toast.success('Subscription plan selected!');
      return true;
    } catch (error) {
      toast.error('Failed to create subscription');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // Save profile before moving to next step
      const success = await saveProfile();
      if (!success) return;
    } else if (currentStep === 1) {
      // Create subscription before moving to next step
      const success = await createSubscription();
      if (!success) return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Onboarding complete
      toast.success('Onboarding complete! Redirecting to upload page...');
      navigate('/upload');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate('/');
    }
  };

  const handleSkip = () => {
    toast.info('You can complete your profile later in settings');
    navigate('/');
  };

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Button variant="ghost" onClick={handleSkip}>
          Skip for now
        </Button>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        {STEPS.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                index < currentStep
                  ? 'bg-primary text-primary-foreground'
                  : index === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {index < currentStep ? (
                <Check className="h-5 w-5" />
              ) : (
                <step.icon className="h-5 w-5" />
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-12 h-1 mx-2 rounded ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">{STEPS[currentStep].title}</h1>
        <p className="text-muted-foreground mt-1">
          {currentStep === 0 && 'Let fans get to know you'}
          {currentStep === 1 && 'Select a subscription plan'}
          {currentStep === 2 && 'Upload your first track'}
        </p>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {currentStep === 0 && (
            <ProfileStep
              avatarPreview={avatarPreview}
              displayName={displayName}
              bio={bio}
              location={location}
              country={country}
              instagramUrl={instagramUrl}
              twitterUrl={twitterUrl}
              uploadingAvatar={uploadingAvatar}
              avatarInputRef={avatarInputRef}
              onAvatarChange={handleAvatarChange}
              onDisplayNameChange={setDisplayName}
              onBioChange={setBio}
              onLocationChange={setLocation}
              onCountryChange={setCountry}
              onInstagramChange={setInstagramUrl}
              onTwitterChange={setTwitterUrl}
              profile={profile}
            />
          )}

          {currentStep === 1 && (
            <SubscriptionStep
              selectedPlan={selectedPlan}
              onSelectPlan={setSelectedPlan}
            />
          )}

          {currentStep === 2 && (
            <UploadStep />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="mt-8">
        <Button
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={handleNext}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Saving...
            </>
          ) : currentStep === STEPS.length - 1 ? (
            <>
              Go to Upload
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-5 w-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// Profile Step Component
interface ProfileStepProps {
  avatarPreview: string;
  displayName: string;
  bio: string;
  location: string;
  country: string;
  instagramUrl: string;
  twitterUrl: string;
  uploadingAvatar: boolean;
  avatarInputRef: React.RefObject<HTMLInputElement>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDisplayNameChange: (value: string) => void;
  onBioChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onInstagramChange: (value: string) => void;
  onTwitterChange: (value: string) => void;
  profile: any;
}

function ProfileStep({
  avatarPreview,
  displayName,
  bio,
  location,
  country,
  instagramUrl,
  twitterUrl,
  uploadingAvatar,
  avatarInputRef,
  onAvatarChange,
  onDisplayNameChange,
  onBioChange,
  onLocationChange,
  onCountryChange,
  onInstagramChange,
  onTwitterChange,
  profile,
}: ProfileStepProps) {
  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={onAvatarChange}
            className="hidden"
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-28 h-28 rounded-full overflow-hidden group border-4 border-primary/20"
            disabled={uploadingAvatar}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {(displayName || profile?.username || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              {uploadingAvatar ? (
                <Loader2 className="h-6 w-6 text-white animate-spin" />
              ) : (
                <Camera className="h-6 w-6 text-white" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Artist Name *</Label>
          <Input
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="Your artist name"
            className="h-12 bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="Tell fans about yourself and your music..."
            className="bg-secondary border-border"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="e.g. Lilongwe"
              className="h-12 bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input
              value={country}
              onChange={(e) => onCountryChange(e.target.value)}
              placeholder="e.g. Malawi"
              className="h-12 bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Instagram className="h-4 w-4" /> Instagram
          </Label>
          <Input
            value={instagramUrl}
            onChange={(e) => onInstagramChange(e.target.value)}
            placeholder="https://instagram.com/username"
            className="h-12 bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Twitter className="h-4 w-4" /> Twitter
          </Label>
          <Input
            value={twitterUrl}
            onChange={(e) => onTwitterChange(e.target.value)}
            placeholder="https://twitter.com/username"
            className="h-12 bg-secondary border-border"
          />
        </div>
      </div>
    </div>
  );
}

// Subscription Step Component
interface SubscriptionStepProps {
  selectedPlan: string;
  onSelectPlan: (plan: string) => void;
}

function SubscriptionStep({ selectedPlan, onSelectPlan }: SubscriptionStepProps) {
  return (
    <div className="space-y-4">
      {SUBSCRIPTION_PLANS.map((plan) => (
        <Card
          key={plan.id}
          className={`cursor-pointer transition-all ${
            selectedPlan === plan.id
              ? 'border-primary ring-2 ring-primary/20'
              : 'hover:border-primary/50'
          } ${plan.popular ? 'relative' : ''}`}
          onClick={() => onSelectPlan(plan.id)}
        >
          {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
              Most Popular
            </div>
          )}
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground text-sm">{plan.period}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {feature}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
      <p className="text-xs text-muted-foreground text-center mt-4">
        Paid plans require admin verification. Your subscription will be activated after approval.
      </p>
    </div>
  );
}

// Upload Step Component
function UploadStep() {
  return (
    <div className="text-center space-y-6">
      <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
        <Music className="h-16 w-16 text-primary" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Ready to share your music!</h3>
        <p className="text-muted-foreground">
          Your profile is set up and subscription plan selected. Now it's time to upload your first track!
        </p>
      </div>

      <Card className="bg-secondary/50">
        <CardContent className="pt-6">
          <ul className="space-y-3 text-left text-sm">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-xs">1</span>
              </div>
              <span>Upload your audio file (MP3 or WAV format)</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-xs">2</span>
              </div>
              <span>Add cover art and fill in song details</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-primary font-bold text-xs">3</span>
              </div>
              <span>Submit for review - our team will verify and publish</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        All uploads are reviewed by our team to ensure quality before being published.
      </p>
    </div>
  );
}
