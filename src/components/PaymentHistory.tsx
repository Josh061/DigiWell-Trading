import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, Search, RefreshCw, Loader2, CheckCircle, 
  XCircle, Clock, AlertTriangle, ArrowDownLeft, Filter,
  DollarSign, Calendar, ChevronDown, ChevronUp
} from 'lucide-react';

interface Payment {
  id: string;
  payment_intent_id: string;
  customer_id: string | null;
  customer_email: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  description: string | null;
  metadata: Record<string, any>;
  failure_code: string | null;
  failure_message: string | null;
  refunded_amount: number;
  refund_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface WebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  payload: Record<string, any>;
  processed: boolean;
  processing_error: string | null;
  created_at: string;
}

const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  succeeded: { 
    color: 'bg-green-500/20 text-green-400 border-green-500/30', 
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Succeeded'
  },
  pending: { 
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', 
    icon: <Clock className="w-4 h-4" />,
    label: 'Pending'
  },
  failed: { 
    color: 'bg-red-500/20 text-red-400 border-red-500/30', 
    icon: <XCircle className="w-4 h-4" />,
    label: 'Failed'
  },
  canceled: { 
    color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', 
    icon: <XCircle className="w-4 h-4" />,
    label: 'Canceled'
  },
  refunded: { 
    color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', 
    icon: <ArrowDownLeft className="w-4 h-4" />,
    label: 'Refunded'
  },
  partially_refunded: { 
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', 
    icon: <ArrowDownLeft className="w-4 h-4" />,
    label: 'Partially Refunded'
  }
};

export default function PaymentHistory() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'webhooks'>('payments');
  const [stats, setStats] = useState({
    total: 0,
    succeeded: 0,
    failed: 0,
    refunded: 0,
    totalAmount: 0
  });

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (searchTerm) {
        query = query.or(`payment_intent_id.ilike.%${searchTerm}%,customer_email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPayments(data || []);

      // Calculate stats
      const allPayments = data || [];
      const succeeded = allPayments.filter(p => p.status === 'succeeded');
      setStats({
        total: allPayments.length,
        succeeded: succeeded.length,
        failed: allPayments.filter(p => p.status === 'failed').length,
        refunded: allPayments.filter(p => p.status === 'refunded' || p.status === 'partially_refunded').length,
        totalAmount: succeeded.reduce((sum, p) => sum + p.amount, 0)
      });

    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhookEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setWebhookEvents(data || []);
    } catch (err) {
      console.error('Error fetching webhook events:', err);
    }
  };

  useEffect(() => {
    fetchPayments();
    fetchWebhookEvents();
  }, [statusFilter, searchTerm]);

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#D4AF37]" />
            Payment History
          </h2>
          <p className="text-slate-400 text-sm">Track payments processed via Stripe webhooks</p>
        </div>
        <Button
          onClick={() => { fetchPayments(); fetchWebhookEvents(); }}
          disabled={loading}
          variant="outline"
          className="border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/10"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total Payments</div>
                <div className="text-xl font-bold text-white">{stats.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Succeeded</div>
                <div className="text-xl font-bold text-green-400">{stats.succeeded}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Failed</div>
                <div className="text-xl font-bold text-red-400">{stats.failed}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Refunded</div>
                <div className="text-xl font-bold text-purple-400">{stats.refunded}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total Volume</div>
                <div className="text-xl font-bold text-[#D4AF37]">
                  {formatAmount(stats.totalAmount, 'usd')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <Button
          variant={activeTab === 'payments' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('payments')}
          className={activeTab === 'payments' ? 'bg-[#D4AF37] text-slate-900' : 'text-slate-400'}
        >
          <CreditCard className="w-4 h-4 mr-2" />
          Payments
        </Button>
        <Button
          variant={activeTab === 'webhooks' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('webhooks')}
          className={activeTab === 'webhooks' ? 'bg-[#D4AF37] text-slate-900' : 'text-slate-400'}
        >
          <AlertTriangle className="w-4 h-4 mr-2" />
          Webhook Events
        </Button>
      </div>

      {activeTab === 'payments' && (
        <>
          {/* Filters */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Search by payment ID or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="succeeded">Succeeded</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payments List */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No payments found</p>
                  <p className="text-sm mt-1">Payments will appear here when processed via webhooks</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div 
                      key={payment.id} 
                      className="bg-slate-800/50 rounded-lg overflow-hidden"
                    >
                      <div 
                        className="p-4 cursor-pointer hover:bg-slate-800/70 transition-colors"
                        onClick={() => setExpandedPayment(expandedPayment === payment.id ? null : payment.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-slate-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white font-medium">
                                  {formatAmount(payment.amount, payment.currency)}
                                </span>
                                {getStatusBadge(payment.status)}
                              </div>
                              <div className="text-slate-400 text-sm">
                                {payment.customer_email || payment.payment_intent_id.slice(0, 20) + '...'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-slate-400 text-sm flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(payment.created_at)}
                              </div>
                              {payment.refunded_amount > 0 && (
                                <div className="text-purple-400 text-xs">
                                  Refunded: {formatAmount(payment.refunded_amount, payment.currency)}
                                </div>
                              )}
                            </div>
                            {expandedPayment === payment.id ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedPayment === payment.id && (
                        <div className="px-4 pb-4 border-t border-slate-700/50">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                            <div>
                              <div className="text-slate-500 text-xs uppercase">Payment Intent ID</div>
                              <div className="text-slate-300 text-sm font-mono break-all">
                                {payment.payment_intent_id}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-xs uppercase">Customer ID</div>
                              <div className="text-slate-300 text-sm font-mono">
                                {payment.customer_id || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-xs uppercase">Payment Method</div>
                              <div className="text-slate-300 text-sm">
                                {payment.payment_method || 'N/A'}
                              </div>
                            </div>
                            {payment.description && (
                              <div>
                                <div className="text-slate-500 text-xs uppercase">Description</div>
                                <div className="text-slate-300 text-sm">{payment.description}</div>
                              </div>
                            )}
                            {payment.failure_code && (
                              <div className="col-span-2">
                                <div className="text-slate-500 text-xs uppercase">Failure Reason</div>
                                <div className="text-red-400 text-sm">
                                  <span className="font-mono">{payment.failure_code}</span>: {payment.failure_message}
                                </div>
                              </div>
                            )}
                            {payment.refund_reason && (
                              <div>
                                <div className="text-slate-500 text-xs uppercase">Refund Reason</div>
                                <div className="text-purple-400 text-sm">{payment.refund_reason}</div>
                              </div>
                            )}
                            {Object.keys(payment.metadata || {}).length > 0 && (
                              <div className="col-span-full">
                                <div className="text-slate-500 text-xs uppercase mb-1">Metadata</div>
                                <div className="bg-slate-900/50 rounded p-2 text-xs font-mono text-slate-400 overflow-x-auto">
                                  {JSON.stringify(payment.metadata, null, 2)}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'webhooks' && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Webhook Events Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            {webhookEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No webhook events recorded</p>
                <p className="text-sm mt-1">Events will appear here when Stripe sends webhooks</p>
              </div>
            ) : (
              <div className="space-y-2">
                {webhookEvents.map((event) => (
                  <div 
                    key={event.id}
                    className="bg-slate-800/50 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={event.processed 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                            : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                          }
                        >
                          {event.processed ? 'Processed' : 'Pending'}
                        </Badge>
                        <span className="text-white font-mono text-sm">{event.event_type}</span>
                      </div>
                      <div className="text-slate-400 text-sm">
                        {formatDate(event.created_at)}
                      </div>
                    </div>
                    <div className="mt-2 text-slate-500 text-xs font-mono">
                      Event ID: {event.event_id}
                    </div>
                    {event.processing_error && (
                      <div className="mt-2 text-red-400 text-sm">
                        Error: {event.processing_error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Webhook Configuration Info */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-blue-400 font-medium">Webhook Configuration</h4>
              <p className="text-slate-400 text-sm mt-1">
                Configure your Stripe webhook endpoint to point to your edge function URL. 
                Add the following events: <code className="text-blue-300">payment_intent.succeeded</code>, 
                <code className="text-blue-300 ml-1">payment_intent.payment_failed</code>, 
                <code className="text-blue-300 ml-1">payment_intent.created</code>, 
                <code className="text-blue-300 ml-1">payment_intent.canceled</code>, and 
                <code className="text-blue-300 ml-1">charge.refunded</code>.
              </p>
              <p className="text-slate-500 text-xs mt-2">
                For production, set the <code className="text-slate-400">STRIPE_WEBHOOK_SECRET</code> environment 
                variable to enable signature verification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
