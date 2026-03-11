import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function EditProfilePage() {
  const { profile, updateProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [location, setLocation] = useState(profile?.location || '');
  const [country, setCountry] = useState(profile?.country || '');
  const [website, setWebsite] = useState(profile?.website || '');
  const [instagramUrl, setInstagramUrl] = useState(profile?.instagram_url || '');
  const [twitterUrl, setTwitterUrl] = useState(profile?.twitter_url || '');
  const [tiktokUrl, setTiktokUrl] = useState(profile?.tiktok_url || '');
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
      
      await updateProfile({ avatar_url: urlData.publicUrl });
      toast.success('Avatar updated!');
    } catch (error) {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    const { error } = await updateProfile({
      display_name: displayName || null,
      bio: bio || null,
      location: location || null,
      country: country || null,
      website: website || null,
      instagram_url: instagramUrl || null,
      twitter_url: twitterUrl || null,
      tiktok_url: tiktokUrl || null,
    });

    if (error) {
      toast.error('Failed to save profile');
    } else {
      toast.success('Profile saved!');
      await refreshProfile();
      navigate('/profile');
    }

    setSaving(false);
  };

  if (!profile) return null;

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="hidden"
          />
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="relative w-24 h-24 rounded-full overflow-hidden group"
            disabled={uploadingAvatar}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {(displayName || profile.username).charAt(0).toUpperCase()}
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

      {/* Form */}
      <div className="space-y-4 px-1">
        <div className="space-y-2">
          <Label>Display Name</Label>
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name"
            className="h-12 bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label>Bio</Label>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell us about yourself..."
            className="bg-secondary border-border"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>City/Town</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Lilongwe"
              className="h-12 bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Malawi"
              className="h-12 bg-secondary border-border"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Website</Label>
          <Input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourwebsite.com"
            className="h-12 bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label>Instagram URL</Label>
          <Input
            value={instagramUrl}
            onChange={(e) => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/username"
            className="h-12 bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label>Twitter URL</Label>
          <Input
            value={twitterUrl}
            onChange={(e) => setTwitterUrl(e.target.value)}
            placeholder="https://twitter.com/username"
            className="h-12 bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label>TikTok URL</Label>
          <Input
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            placeholder="https://tiktok.com/@username"
            className="h-12 bg-secondary border-border"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 px-1">
        <Button
          variant="gradient"
          size="lg"
          className="w-full"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}
