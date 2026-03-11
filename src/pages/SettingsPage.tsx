import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LogOut,
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  HelpCircle, 
  FileText, 
  Mail,
  Lock,
  Trash2,
  Moon,
  Sun,
  Smartphone,
  ChevronRight,
  Music,
  Heart,
  Users,
  MessageSquare,
  ShieldCheck,
  Briefcase,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SettingsSkeleton } from '@/components/ui/SettingsSkeleton';

type Theme = 'dark' | 'light' | 'system';

interface NotificationSettings {
  newReleases: boolean;
  artistUpdates: boolean;
  likes: boolean;
  comments: boolean;
  followers: boolean;
  promotions: boolean;
}

export default function SettingsPage() {
  const { profile, user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [theme, setTheme] = useState<Theme>('dark');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    newReleases: true,
    artistUpdates: true,
    likes: true,
    comments: true,
    followers: true,
    promotions: false,
  });

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        
        if (data) {
          setIsAdmin(data.some(r => r.role === 'admin'));
          setIsManager(data.some(r => r.role === 'manager'));
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkRoles();
  }, [user]);

  useEffect(() => {
    // Load saved settings from localStorage
    const savedTheme = localStorage.getItem('streamix-theme') as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }

    const savedNotifications = localStorage.getItem('streamix-notifications');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(newTheme);
    }
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('streamix-theme', newTheme);
    applyTheme(newTheme);
    toast.success(`Theme changed to ${newTheme}`);
  };

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    localStorage.setItem('streamix-notifications', JSON.stringify(updated));
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success('Signed out successfully');
    navigate('/auth');
  };

  if (authLoading || isLoading) {
    return <SettingsSkeleton />;
  }

  const SettingItem = ({ 
    icon: Icon, 
    label, 
    description, 
    onClick,
    rightElement 
  }: { 
    icon: React.ElementType; 
    label: string; 
    description?: string;
    onClick?: () => void;
    rightElement?: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
    >
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">{label}</p>
        {description && (
          <p className="text-sm text-muted-foreground truncate">{description}</p>
        )}
      </div>
      {rightElement || <ChevronRight className="h-5 w-5 text-muted-foreground" />}
    </button>
  );

  const NotificationToggle = ({
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
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      {/* Account Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Account
        </h2>
        <div className="space-y-2">
          <SettingItem
            icon={User}
            label="Profile Settings"
            description={profile?.username ? `@${profile.username}` : 'Manage your profile'}
            onClick={() => navigate('/edit-profile')}
          />
          <SettingItem
            icon={Mail}
            label="Email"
            description={user?.email || 'Manage your email'}
            onClick={() => toast.info('Email settings coming soon')}
          />
          <SettingItem
            icon={Lock}
            label="Change Password"
            description="Update your password"
            onClick={() => navigate('/change-password')}
          />
          <SettingItem
            icon={Shield}
            label="Privacy & Security"
            description="Manage your privacy settings"
            onClick={() => navigate('/privacy-security')}
          />
          {isManager && (
            <SettingItem
              icon={Briefcase}
              label="Manager Dashboard"
              description="Manage your artists"
              onClick={() => navigate('/manager')}
            />
          )}
          {profile?.user_type === 'artist' && (
            <SettingItem
              icon={CreditCard}
              label="Subscription"
              description="Manage your subscription plan"
              onClick={() => navigate('/subscription')}
            />
          )}
          {isAdmin && (
            <SettingItem
              icon={ShieldCheck}
              label="Admin Dashboard"
              description="Manage songs, artists and platform"
              onClick={() => navigate('/admin')}
            />
          )}
        </div>
      </motion.section>

      {/* Notifications Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Notifications
        </h2>
        <div className="space-y-2">
          <NotificationToggle
            icon={Music}
            label="New Releases"
            description="Get notified about new music from artists you follow"
            checked={notifications.newReleases}
            onCheckedChange={(v) => handleNotificationChange('newReleases', v)}
          />
          <NotificationToggle
            icon={Users}
            label="Artist Updates"
            description="Updates and announcements from artists"
            checked={notifications.artistUpdates}
            onCheckedChange={(v) => handleNotificationChange('artistUpdates', v)}
          />
          <NotificationToggle
            icon={Heart}
            label="Likes"
            description="When someone likes your songs"
            checked={notifications.likes}
            onCheckedChange={(v) => handleNotificationChange('likes', v)}
          />
          <NotificationToggle
            icon={MessageSquare}
            label="Comments"
            description="When someone comments on your songs"
            checked={notifications.comments}
            onCheckedChange={(v) => handleNotificationChange('comments', v)}
          />
          <NotificationToggle
            icon={Users}
            label="New Followers"
            description="When someone follows you"
            checked={notifications.followers}
            onCheckedChange={(v) => handleNotificationChange('followers', v)}
          />
          <NotificationToggle
            icon={Bell}
            label="Promotions"
            description="Promotional offers and updates"
            checked={notifications.promotions}
            onCheckedChange={(v) => handleNotificationChange('promotions', v)}
          />
        </div>
      </motion.section>

      {/* Appearance Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Appearance
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'light' 
                ? 'border-primary bg-primary/10' 
                : 'border-border bg-secondary/50 hover:border-primary/50'
            }`}
          >
            <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">Light</span>
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'dark' 
                ? 'border-primary bg-primary/10' 
                : 'border-border bg-secondary/50 hover:border-primary/50'
            }`}
          >
            <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">Dark</span>
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              theme === 'system' 
                ? 'border-primary bg-primary/10' 
                : 'border-border bg-secondary/50 hover:border-primary/50'
            }`}
          >
            <Smartphone className={`h-6 w-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
            <span className="text-sm font-medium">System</span>
          </button>
        </div>
      </motion.section>

      {/* Support Section */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Support
        </h2>
        <div className="space-y-2">
          <SettingItem
            icon={HelpCircle}
            label="Help Center"
            description="Get help and support"
            onClick={() => navigate('/help')}
          />
          <SettingItem
            icon={FileText}
            label="Terms of Service"
            description="Read our terms"
            onClick={() => navigate('/terms')}
          />
          <SettingItem
            icon={Shield}
            label="Privacy Policy"
            description="Read our privacy policy"
            onClick={() => navigate('/privacy-policy')}
          />
        </div>
      </motion.section>

      {/* Sign Out */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-8"
      >
        <Button
          variant="ghost"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </motion.section>

      {/* Danger Zone */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider mb-3 px-1">
          Danger Zone
        </h2>
        <button
          onClick={() => toast.error('Account deletion requires contacting support')}
          className="w-full flex items-center gap-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors text-left"
        >
          <div className="p-2 rounded-lg bg-destructive/20">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-destructive">Delete Account</p>
            <p className="text-sm text-destructive/70">Permanently delete your account and data</p>
          </div>
        </button>
      </motion.section>

      {/* App Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-8 py-4"
      >
        <p className="text-sm text-muted-foreground">Streamix</p>
        <p className="text-xs text-muted-foreground/60">Version 1.0.0</p>
      </motion.div>
    </div>
  );
}
