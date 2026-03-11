import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function TermsOfServicePage() {
  const navigate = useNavigate();

  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: `By accessing and using Streamix ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.`
    },
    {
      title: '2. User Accounts',
      content: `You must be at least 13 years old to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating your account.`
    },
    {
      title: '3. Artist Content',
      content: `Artists who upload content to the Platform retain ownership of their original work. By uploading content, you grant Streamix a non-exclusive, worldwide license to host, stream, and distribute your content on the Platform. All uploaded content must comply with our content guidelines and is subject to admin approval.`
    },
    {
      title: '4. Prohibited Content',
      content: `You may not upload, share, or distribute content that: infringes on intellectual property rights, contains hate speech or discrimination, promotes violence or illegal activities, contains explicit adult content without proper labeling, or violates any applicable laws.`
    },
    {
      title: '5. Subscriptions & Payments',
      content: `Artist subscriptions are required for uploading music. Payments are verified by our admin team before subscription activation. Refunds may be issued at our discretion within 7 days of payment if no songs have been uploaded.`
    },
    {
      title: '6. User Conduct',
      content: `Users agree to: respect other users and artists, not engage in harassment or bullying, not attempt to circumvent platform security, not use automated systems without permission, and report violations to our support team.`
    },
    {
      title: '7. Intellectual Property',
      content: `The Platform and its original content (excluding user-uploaded content) are protected by copyright, trademark, and other laws. You may not copy, modify, or distribute any part of the Platform without our written permission.`
    },
    {
      title: '8. Disclaimer of Warranties',
      content: `The Platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service, error-free operation, or that the Platform will meet your specific requirements.`
    },
    {
      title: '9. Limitation of Liability',
      content: `Streamix shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform, including but not limited to loss of data, profits, or business opportunities.`
    },
    {
      title: '10. Account Termination',
      content: `We reserve the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or harm the Platform community. Users may delete their accounts by contacting support.`
    },
    {
      title: '11. Changes to Terms',
      content: `We may update these Terms of Service from time to time. Continued use of the Platform after changes constitutes acceptance of the new terms. We will notify users of significant changes via email or in-app notification.`
    },
    {
      title: '12. Contact Information',
      content: `For questions about these Terms of Service, please contact us at: legal@streamix.com`
    },
  ];

  return (
    <div className="pb-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 py-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Terms of Service</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Intro */}
        <div className="p-4 rounded-xl bg-secondary/50 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">Last Updated: December 2024</p>
            <p className="text-sm text-muted-foreground mt-1">
              Please read these terms carefully before using our platform.
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
