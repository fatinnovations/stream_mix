import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Search, HelpCircle, Music, Upload, CreditCard, User, Shield, MessageSquare, ChevronDown, ChevronUp, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  icon: React.ElementType;
  title: string;
  items: FAQItem[];
}

const faqData: FAQCategory[] = [
  {
    icon: Music,
    title: 'Listening & Streaming',
    items: [
      {
        question: 'How do I play music?',
        answer: 'Simply tap on any song to start playing. You can control playback using the mini player at the bottom or the full-screen player.'
      },
      {
        question: 'Can I download music for offline listening?',
        answer: 'Offline downloads are available for premium subscribers. Look for the download icon on songs and playlists.'
      },
      {
        question: 'How do I create a playlist?',
        answer: 'Go to your Library, tap the + button, and select "Create Playlist". You can then add songs by tapping the three dots on any song.'
      },
    ]
  },
  {
    icon: Upload,
    title: 'Artist & Uploads',
    items: [
      {
        question: 'How do I upload my music?',
        answer: 'Artists can upload music through the Upload page. You need an active subscription to upload songs. All uploads require admin approval.'
      },
      {
        question: 'What file formats are supported?',
        answer: 'We support MP3 and WAV audio files. Cover art should be in JPG or PNG format.'
      },
      {
        question: 'Why is my song pending approval?',
        answer: 'All songs are reviewed by our team for quality and content. This usually takes 24-48 hours.'
      },
    ]
  },
  {
    icon: CreditCard,
    title: 'Subscriptions & Payments',
    items: [
      {
        question: 'What subscription plans are available?',
        answer: 'We offer Free, Basic, Premium, and Pro plans. Each plan has different upload limits and features for artists.'
      },
      {
        question: 'How do I upgrade my subscription?',
        answer: 'Go to Settings > Subscription and select your desired plan. Upload proof of payment and wait for admin verification.'
      },
      {
        question: 'How long does payment verification take?',
        answer: 'Payment verification typically takes 24-48 hours. You\'ll be notified once your subscription is activated.'
      },
    ]
  },
  {
    icon: User,
    title: 'Account & Profile',
    items: [
      {
        question: 'How do I edit my profile?',
        answer: 'Go to your Profile page and tap the "Edit Profile" button. You can update your name, bio, avatar, and social links.'
      },
      {
        question: 'Can I change my username?',
        answer: 'Yes, you can change your username in the Edit Profile section. Note that usernames must be unique.'
      },
      {
        question: 'How do I verify my artist account?',
        answer: 'Artist verification is done by our admin team. Maintain an active subscription and quality uploads to be considered.'
      },
    ]
  },
  {
    icon: Shield,
    title: 'Privacy & Security',
    items: [
      {
        question: 'How do I change my password?',
        answer: 'Go to Settings > Change Password. You\'ll need to create a new password that meets our security requirements.'
      },
      {
        question: 'How do I make my profile private?',
        answer: 'Go to Settings > Privacy & Security and change your profile visibility to Private.'
      },
      {
        question: 'Is my data secure?',
        answer: 'Yes, we use industry-standard encryption and security practices to protect your data.'
      },
    ]
  },
];

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<number | null>(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (categoryIdx: number, itemIdx: number) => {
    const key = `${categoryIdx}-${itemIdx}`;
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQ = searchQuery
    ? faqData.map(category => ({
        ...category,
        items: category.items.filter(
          item =>
            item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.answer.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.items.length > 0)
    : faqData;

  return (
    <div className="pb-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 py-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Help Center</h1>
      </div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search for help..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* FAQ Categories */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4 mb-8"
      >
        {filteredFAQ.map((category, categoryIdx) => (
          <div key={categoryIdx} className="rounded-xl bg-secondary/50 overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === categoryIdx ? null : categoryIdx)}
              className="w-full flex items-center gap-4 p-4 hover:bg-secondary transition-colors"
            >
              <div className="p-2 rounded-lg bg-primary/10">
                <category.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="flex-1 font-medium text-left">{category.title}</span>
              {expandedCategory === categoryIdx ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            
            {expandedCategory === categoryIdx && (
              <div className="px-4 pb-4 space-y-2">
                {category.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="rounded-lg bg-background/50">
                    <button
                      onClick={() => toggleItem(categoryIdx, itemIdx)}
                      className="w-full flex items-center gap-3 p-3 text-left"
                    >
                      <HelpCircle className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="flex-1 text-sm font-medium">{item.question}</span>
                      {expandedItems.has(`${categoryIdx}-${itemIdx}`) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedItems.has(`${categoryIdx}-${itemIdx}`) && (
                      <p className="px-3 pb-3 text-sm text-muted-foreground ml-7">
                        {item.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* Contact Support */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
          Still Need Help?
        </h2>
        <div className="space-y-2">
          <button
            onClick={() => toast.info('Contact support via email: support@streamix.com')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Email Support</p>
              <p className="text-sm text-muted-foreground">support@streamix.com</p>
            </div>
          </button>
          <button
            onClick={() => toast.info('Live chat coming soon')}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-left"
          >
            <div className="p-2 rounded-lg bg-primary/10">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Live Chat</p>
              <p className="text-sm text-muted-foreground">Chat with our support team</p>
            </div>
          </button>
        </div>
      </motion.section>
    </div>
  );
}
