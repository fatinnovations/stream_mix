import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Information We Collect',
      content: `We collect information you provide directly: account information (email, username, profile details), content you upload (music, images, descriptions), and communications with our support team. We also automatically collect: device information, usage data, listening history, and location data (country/city for analytics).`
    },
    {
      title: '2. How We Use Your Information',
      content: `We use your information to: provide and improve our services, personalize your experience, process transactions and subscriptions, send service-related communications, analyze platform usage and trends, protect against fraud and abuse, and comply with legal obligations.`
    },
    {
      title: '3. Information Sharing',
      content: `We may share your information with: other users (profile information, public content), service providers who assist our operations, legal authorities when required by law, and in connection with a business transfer. We do not sell your personal information to third parties.`
    },
    {
      title: '4. Artist Analytics',
      content: `Artists can access analytics about their content including: play counts, geographic distribution of listeners (country/city level), engagement metrics, and follower statistics. Individual listener identities are not shared with artists unless they choose to make their activity public.`
    },
    {
      title: '5. Your Privacy Controls',
      content: `You can control your privacy through: profile visibility settings (public/private), listening activity visibility, follower/following display, message permissions, and notification preferences. Access these settings in your Privacy & Security settings.`
    },
    {
      title: '6. Data Security',
      content: `We implement industry-standard security measures including: encrypted data transmission (HTTPS), secure password storage (hashing), regular security audits, and access controls for our team. However, no method of transmission is 100% secure.`
    },
    {
      title: '7. Data Retention',
      content: `We retain your data as long as your account is active. After account deletion, we may retain certain information for legal compliance, dispute resolution, or fraud prevention. Anonymized data may be retained for analytics purposes.`
    },
    {
      title: '8. Cookies and Tracking',
      content: `We use cookies and similar technologies to: maintain your session, remember preferences, analyze usage patterns, and improve our services. You can control cookies through your browser settings, but this may affect functionality.`
    },
    {
      title: '9. Third-Party Services',
      content: `Our platform may integrate with third-party services for: payment processing, analytics, cloud storage, and social sharing. These services have their own privacy policies, and we encourage you to review them.`
    },
    {
      title: '10. Children\'s Privacy',
      content: `Our platform is not intended for children under 13. We do not knowingly collect information from children under 13. If we learn we have collected such information, we will delete it promptly.`
    },
    {
      title: '11. International Users',
      content: `Your information may be transferred to and processed in countries other than your own. By using our platform, you consent to this transfer. We ensure appropriate safeguards are in place for international data transfers.`
    },
    {
      title: '12. Your Rights',
      content: `Depending on your location, you may have rights to: access your personal data, correct inaccurate data, delete your data, export your data, opt out of certain processing, and withdraw consent. Contact us to exercise these rights.`
    },
    {
      title: '13. Changes to This Policy',
      content: `We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification. Your continued use after changes constitutes acceptance of the updated policy.`
    },
    {
      title: '14. Contact Us',
      content: `For privacy-related questions or to exercise your rights, contact us at: privacy@streamix.com`
    },
  ];

  return (
    <div className="pb-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 py-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Privacy Policy</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Intro */}
        <div className="p-4 rounded-xl bg-secondary/50 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Last Updated: December 2024</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your privacy is important to us. This policy explains how we collect, use, and protect your information.
            </p>
          </div>
        </div>

        {/* Sections */}
        {sections.map((section, idx) => (
          <motion.section
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="space-y-2"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {section.content}
            </p>
          </motion.section>
        ))}
      </motion.div>
    </div>
  );
}
