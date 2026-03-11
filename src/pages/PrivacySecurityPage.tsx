import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield, Eye, EyeOff, Lock, UserX, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface PrivacySettings {
  profileVisibility: 'public' | 'private';
  showListeningActivity: boolean;
  showFollowers: boolean;
  showFollowing: boolean;
  allowMessages: boolean;
  twoFactorEnabled: boolean;
}

export default function PrivacySecurityPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings>({
    profileVisibility: 'public',
    showListeningActivity: true,
    showFollowers: true,
    showFollowing: true,
    allowMessages: true,
    twoFactorEnabled: false,
  });

  useEffect(() => {
    const saved = localStorage.getItem('streamix-privacy');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const updateSetting = <K extends keyof PrivacySettings>(key: K, value: PrivacySettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem('streamix-privacy', JSON.stringify(updated));
    toast.success('Settings updated');
  };

  const PrivacyToggle = ({
    icon: Icon,
    label,
    description,
    checked,
    onCheckedChange
  }: {
    icon: React.ElementType;
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <Label htmlFor={label} className="font-medium cursor-pointer">{label}</Label>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch 
        id={label}
        checked={checked} 
        onCheckedChange={onCheckedChange}
      />
    </div>
  );

  return (
    <div className="pb-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 py-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Privacy & Security</h1>
      </div>

      {/* Profile Visibility */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Profile Visibility
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => updateSetting('profileVisibility', 'public')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              settings.profileVisibility === 'public'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-secondary/50 hover:border-primary/50'
            }`}
          >
            <Eye className={`h-6 w-6 ${settings.profileVisibility === 'public' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">Public</span>
            <span className="text-xs text-muted-foreground text-center">Anyone can see your profile</span>
          </button>
          <button
            onClick={() => updateSetting('profileVisibility', 'private')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              settings.profileVisibility === 'private'
                ? 'border-primary bg-primary/10'
                : 'border-border bg-secondary/50 hover:border-primary/50'
            }`}
          >
            <EyeOff className={`h-6 w-6 ${settings.profileVisibility === 'private' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">Private</span>
            <span className="text-xs text-muted-foreground text-center">Only followers can see</span>
          </button>
        </div>
      </motion.section>

      {/* Activity Settings */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Activity & Social
        </h2>
        <div className="space-y-2">
          <PrivacyToggle
            icon={Eye}
            label="Show Listening Activity"
            description="Let others see what you're listening to"
            checked={settings.showListeningActivity}
            onCheckedChange={(v) => updateSetting('showListeningActivity', v)}
          />
          <PrivacyToggle
            icon={Eye}
            label="Show Followers"
            description="Display your followers on your profile"
            checked={settings.showFollowers}
            onCheckedChange={(v) => updateSetting('showFollowers', v)}
          />
          <PrivacyToggle
            icon={Eye}
            label="Show Following"
            description="Display who you follow on your profile"
            checked={settings.showFollowing}
            onCheckedChange={(v) => updateSetting('showFollowing', v)}
          />
          <PrivacyToggle
            icon={UserX}
            label="Allow Messages"
            description="Let others send you direct messages"
            checked={settings.allowMessages}
            onCheckedChange={(v) => updateSetting('allowMessages', v)}
          />
        </div>
      </motion.section>

      {/* Security */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Security
        </h2>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/change-password')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-muted-foreground">Update your account password</p>
            </div>
          </button>
          <PrivacyToggle
            icon={Shield}
            label="Two-Factor Authentication"
            description="Add an extra layer of security"
            checked={settings.twoFactorEnabled}
            onCheckedChange={(v) => {
              if (v) {
                toast.info('Two-factor authentication setup coming soon');
              } else {
                updateSetting('twoFactorEnabled', v);
              }
            }}
          />
        </div>
      </motion.section>

      {/* Data & Privacy */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Your Data
        </h2>
        <div className="space-y-2">
          <button
            onClick={() => toast.info('Data export feature coming soon')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Download Your Data</p>
              <p className="text-sm text-muted-foreground">Get a copy of your data</p>
            </div>
          </button>
          <button
            onClick={() => toast.error('Account deletion requires contacting support')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-destructive/20">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-destructive/70">Permanently delete your account</p>
            </div>
          </button>
        </div>
      </motion.section>
    </div>
  );
}
