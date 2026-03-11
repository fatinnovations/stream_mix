import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Clock, CheckCircle, XCircle, Eye, Calendar, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PaymentRecord {
  id: string;
  artist_id: string;
  subscription_id: string | null;
  plan: string;
  amount: string;
  payment_method: string | null;
  payment_proof_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const PLAN_PRICES: Record<string, string> = {
  free: 'MWK 0',
  basic: 'MWK 5,000',
  premium: 'MWK 15,000',
  pro: 'MWK 30,000',
};

export default function PaymentHistoryPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [proofDialogOpen, setProofDialogOpen] = useState(false);

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
      return;
    }
    if (profile.user_type !== 'artist') {
      navigate('/');
      toast.error('Only artists can view payment history');
      return;
    }
    fetchPayments();
  }, [profile]);

  const fetchPayments = async () => {
    if (!profile) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('artist_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load payment history');
    } else {
      setPayments(data as PaymentRecord[]);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    }
  };

  const stats = {
    total: payments.length,
    approved: payments.filter((p) => p.status === 'approved').length,
    pending: payments.filter((p) => p.status === 'pending').length,
    rejected: payments.filter((p) => p.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="py-4 pb-32">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Payment History</h1>
          <p className="text-sm text-muted-foreground">Track your subscription payments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <div className="glass-card p-3 text-center">
          <Receipt className="h-4 w-4 text-primary mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="glass-card p-3 text-center">
          <CheckCircle className="h-4 w-4 text-green-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.approved}</p>
          <p className="text-xs text-muted-foreground">Approved</p>
        </div>
        <div className="glass-card p-3 text-center">
          <Clock className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.pending}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="glass-card p-3 text-center">
          <XCircle className="h-4 w-4 text-red-500 mx-auto mb-1" />
          <p className="text-lg font-bold">{stats.rejected}</p>
          <p className="text-xs text-muted-foreground">Rejected</p>
        </div>
      </div>

      {/* Payments List */}
      {payments.length === 0 ? (
        <div className="text-center py-12 glass-card">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No payment records yet</p>
          <Button onClick={() => navigate('/subscription')} className="mt-4">
            Get a Subscription
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment, index) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="glass-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold capitalize">{payment.plan} Plan</p>
                        <p className="text-lg font-bold text-primary">{payment.amount}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(payment.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className={getStatusColor(payment.status)}>
                      {getStatusIcon(payment.status)}
                      <span className="ml-1 capitalize">{payment.status}</span>
                    </Badge>
                  </div>

                  {/* Payment Proof & Notes */}
                  <div className="flex items-center gap-2 mt-4">
                    {payment.payment_proof_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedPayment(payment);
                          setProofDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Proof
                      </Button>
                    )}
                    {payment.admin_notes && (
                      <p className="text-sm text-muted-foreground flex-1">
                        Note: {payment.admin_notes}
                      </p>
                    )}
                  </div>

                  {/* Review Info */}
                  {payment.reviewed_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Reviewed on {new Date(payment.reviewed_at).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Proof Dialog */}
      <Dialog open={proofDialogOpen} onOpenChange={setProofDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedPayment?.payment_proof_url && (
            <img
              src={selectedPayment.payment_proof_url}
              alt="Payment proof"
              className="w-full max-h-96 object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
