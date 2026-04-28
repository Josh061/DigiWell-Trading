
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Package, Truck, Clock, CheckCircle, XCircle, Search, Loader2,
  MapPin, CreditCard, Calendar, FileText, ArrowRight, Eye,
  AlertCircle, RefreshCw, Filter, Hash, Mail, ChevronDown,
  ChevronUp, Shield, X, ExternalLink, Box, Download, RotateCcw, Map
} from 'lucide-react';

const DeliveryTrackingMap = lazy(() => import('@/components/DeliveryTrackingMap'));


interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  currency: string;
  status: string;
  delivery_status: string;
  payment_method: string;
  payment_intent_id: string | null;
  delivery_address: string;
  delivery_coordinates: any;
  delivery_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  guest_name: string | null;
  guest_email: string | null;
  refunded_at?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
}

const deliverySteps = [
  { key: 'pending', label: 'Order Placed', icon: Package },
  { key: 'processing', label: 'Processing', icon: Box },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
];

function DeliveryTimeline({ status }: { status: string }) {
  const currentIdx = deliverySteps.findIndex(s => s.key === status);
  const isCancelled = status === 'cancelled';

  return (
    <div className="flex items-center justify-between w-full py-4">
      {deliverySteps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i <= currentIdx && !isCancelled;
        const isCurrent = i === currentIdx && !isCancelled;
        
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isCancelled ? 'bg-red-500/20 border-2 border-red-500/50' :
                isCurrent ? 'bg-[#D4AF37]/20 border-2 border-[#D4AF37] shadow-lg shadow-[#D4AF37]/20' :
                isActive ? 'bg-green-500/20 border-2 border-green-500' :
                'bg-slate-700/50 border-2 border-slate-600'
              }`}>
                {isCancelled && i === 0 ? (
                  <XCircle className="w-5 h-5 text-red-400" />
                ) : (
                  <Icon className={`w-5 h-5 ${
                    isCurrent ? 'text-[#D4AF37]' :
                    isActive ? 'text-green-400' :
                    'text-slate-500'
                  }`} />
                )}
              </div>
              <span className={`text-[10px] mt-1.5 font-medium ${
                isCancelled ? 'text-red-400' :
                isCurrent ? 'text-[#D4AF37]' :
                isActive ? 'text-green-400' :
                'text-slate-500'
              }`}>
                {isCancelled && i === 0 ? 'Cancelled' : step.label}
              </span>
            </div>
            {i < deliverySteps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                isActive && i < currentIdx ? 'bg-green-500' : 'bg-slate-700'
              }`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderTrackingPage() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [generatingPDF, setGeneratingPDF] = useState<string | null>(null);

  // Guest lookup
  const [guestMode, setGuestMode] = useState(!user);
  const [guestOrderNumber, setGuestOrderNumber] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestLookupLoading, setGuestLookupLoading] = useState(false);
  const [guestLookupError, setGuestLookupError] = useState('');

  const fetchUserOrders = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      const isNetworkError = err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError');
      if (isNetworkError) {
        console.warn('Network error fetching orders - will retry when connection is restored');
      }
    } finally {
      setLoading(false);
    }
  };

  const lookupGuestOrder = async () => {
    if (!guestOrderNumber.trim() || !guestEmail.trim()) {
      setGuestLookupError('Please enter both order number and email');
      return;
    }
    setGuestLookupLoading(true);
    setGuestLookupError('');
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', guestOrderNumber.trim().toUpperCase())
        .eq('guest_email', guestEmail.trim().toLowerCase())
        .limit(1);

      if (error) throw error;
      if (!data || data.length === 0) {
        setGuestLookupError('No order found with that order number and email combination');
        return;
      }
      setOrders(data);
      setGuestMode(false);
    } catch (err) {
      setGuestLookupError('Failed to look up order. Please try again.');
    } finally {
      setGuestLookupLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setGuestMode(false);
      fetchUserOrders();
    } else {
      setGuestMode(true);
      setLoading(false);
    }
  }, [user]);

  // Subscribe to real-time updates with error handling
  useEffect(() => {
    if (!user) return;
    let channel: any = null;
    
    try {
      channel = supabase
        .channel('orders-tracking')
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          try {
            setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o));
            toast({ title: 'Order Updated', description: `Order ${(payload.new as any).order_number} status changed` });
          } catch (err) {
            console.warn('[OrderTracking] Realtime callback error:', err);
          }
        })
        .subscribe((status: string, err?: Error) => {
          if (err) console.warn('[OrderTracking] Subscription error:', err);
        });
    } catch (err) {
      console.warn('[OrderTracking] Failed to create realtime channel:', err);
    }

    return () => {
      if (channel) {
        try { supabase.removeChannel(channel); } catch (e) { /* ignore */ }
      }
    };
  }, [user]);


  const cancelOrder = async (orderId: string) => {
    setCancelling(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          delivery_status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled', delivery_status: 'cancelled', cancelled_at: new Date().toISOString() } : o));
      setSelectedOrder(null);
      toast({ title: 'Order Cancelled', description: 'Your order has been cancelled successfully.' });
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to cancel order', variant: 'destructive' });
    } finally {
      setCancelling(null);
    }
  };

  // PDF Invoice Generation
  const downloadInvoice = async (order: Order) => {
    setGeneratingPDF(order.id);
    try {
      // Dynamic import to avoid loading jsPDF until needed
      const { generateInvoicePDF } = await import('@/lib/invoiceGenerator');
      
      const customer = {
        name: userProfile?.full_name || order.guest_name || 'Customer',
        email: userProfile?.email || order.guest_email || '',
        company: userProfile?.company || '',
      };

      generateInvoicePDF(order, customer);
      toast({ title: 'Invoice Downloaded', description: `Invoice for ${order.order_number} has been generated.` });
    } catch (err) {
      console.error('PDF generation error:', err);
      toast({ title: 'Error', description: 'Failed to generate invoice PDF. Please try again.', variant: 'destructive' });
    } finally {
      setGeneratingPDF(null);
    }
  };

  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        o.product_name?.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(o => o.delivery_status === statusFilter || o.status === statusFilter);
    }
    
    if (dateFrom) result = result.filter(o => o.created_at >= dateFrom);
    if (dateTo) result = result.filter(o => o.created_at <= dateTo + 'T23:59:59');
    
    return result;
  }, [orders, searchQuery, statusFilter, dateFrom, dateTo]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      paid: 'bg-green-500/20 text-green-400 border-green-500/30',
      processing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      shipped: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      refunded: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return colors[status] || 'bg-slate-500/20 text-slate-400';
  };

  // Guest lookup view
  if (guestMode) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Package className="w-6 h-6 text-[#D4AF37]" />
            Track Your Order
          </h2>
          <p className="text-slate-400 text-sm mt-1">Enter your order number and email to track your order</p>
        </div>

        <Card className="bg-white/10 backdrop-blur-md border-white/20 max-w-lg mx-auto">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2"><Hash className="w-4 h-4" />Order Number</Label>
              <Input
                value={guestOrderNumber}
                onChange={e => setGuestOrderNumber(e.target.value)}
                placeholder="e.g. ORD-2026-A1B2C3"
                className="bg-slate-800/50 border-slate-600 text-white font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2"><Mail className="w-4 h-4" />Email Address</Label>
              <Input
                type="email"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                placeholder="your@email.com"
                className="bg-slate-800/50 border-slate-600 text-white"
              />
            </div>

            {guestLookupError && (
              <Alert className="bg-red-500/20 border-red-500/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">{guestLookupError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={lookupGuestOrder}
              disabled={guestLookupLoading}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
            >
              {guestLookupLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Track Order
            </Button>

            {user && (
              <Button
                variant="ghost"
                onClick={() => { setGuestMode(false); fetchUserOrders(); }}
                className="w-full text-[#00D4FF] hover:text-[#00D4FF]/80"
              >
                View all my orders instead
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-[#D4AF37]" />
            My Orders
          </h2>
          <p className="text-slate-400 text-sm">{orders.length} orders found</p>
        </div>
        <div className="flex items-center gap-2">
          {!user && (
            <Button variant="outline" size="sm" onClick={() => { setGuestMode(true); setOrders([]); }} className="border-slate-600 text-slate-300">
              <Search className="w-4 h-4 mr-1" />Look Up Another Order
            </Button>
          )}
          {user && (
            <Button variant="outline" size="sm" onClick={() => setGuestMode(true)} className="border-slate-600 text-slate-300">
              <Hash className="w-4 h-4 mr-1" />Track by Order #
            </Button>
          )}
          <Button onClick={fetchUserOrders} disabled={loading} variant="outline" size="sm" className="border-[#00D4FF]/50 text-[#00D4FF]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Total', count: orders.length, color: 'text-white', bg: 'bg-slate-500/20' },
          { label: 'Pending', count: orders.filter(o => o.delivery_status === 'pending').length, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
          { label: 'Processing', count: orders.filter(o => o.delivery_status === 'processing').length, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
          { label: 'Shipped', count: orders.filter(o => o.delivery_status === 'shipped').length, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { label: 'Delivered', count: orders.filter(o => o.delivery_status === 'delivered').length, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Refunded', count: orders.filter(o => o.status === 'refunded').length, color: 'text-orange-400', bg: 'bg-orange-500/20' },
        ].map(s => (
          <Card key={s.label} className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-3 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
              <div className="text-slate-400 text-xs">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by order # or product..."
            className="pl-9 bg-white/10 border-white/20 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="w-[150px] bg-white/10 border-white/20 text-white"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="w-[150px] bg-white/10 border-white/20 text-white"
          placeholder="To"
        />
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">No Orders Found</h3>
            <p className="text-slate-400">
              {orders.length === 0 ? "You haven't placed any orders yet." : 'No orders match your filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map(order => (
            <Card key={order.id} className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Order Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[#D4AF37] font-mono font-bold text-sm">{order.order_number || `#${order.id.slice(0, 8)}`}</span>
                      <Badge className={`${getStatusColor(order.status)} border text-xs`}>{order.status}</Badge>
                      {order.status === 'refunded' && (
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 border text-xs">
                          <RotateCcw className="w-3 h-3 mr-1" />Refunded
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-white font-medium">{order.product_name}</span>
                      <span className="text-slate-400">Qty: {Number(order.quantity || 0).toLocaleString()}</span>
                      <span className="text-[#D4AF37] font-bold">${Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      {order.refund_amount && (
                        <span className="text-orange-400 text-xs">Refund: ${Number(order.refund_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(order.created_at).toLocaleDateString()}</span>
                      {order.delivery_date && <span className="flex items-center gap-1"><Truck className="w-3 h-3" />ETA: {order.delivery_date}</span>}
                      {order.delivery_address && <span className="flex items-center gap-1 truncate max-w-[200px]"><MapPin className="w-3 h-3" />{order.delivery_address}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <div className="hidden md:block w-48">
                      <DeliveryTimeline status={order.delivery_status || 'pending'} />
                    </div>
                    {/* Download Invoice Button */}
                    {(order.status === 'delivered' || order.status === 'paid' || order.status === 'shipped') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadInvoice(order)}
                        disabled={generatingPDF === order.id}
                        className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                      >
                        {generatingPDF === order.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-1" />
                        )}
                        Invoice
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedOrder(order)}
                      className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Modal */}
      {/* Order Detail Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-[#D4AF37]/30 text-white max-w-3xl max-h-[90vh] overflow-y-auto">

          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#D4AF37]" />
                  Order {selectedOrder.order_number}
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Placed on {new Date(selectedOrder.created_at).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </DialogDescription>
              </DialogHeader>

              {/* Delivery Timeline */}
              <div className="bg-slate-700/30 rounded-xl p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-2">Delivery Progress</h4>
                <DeliveryTimeline status={selectedOrder.delivery_status || 'pending'} />
              </div>

              {/* Real-time Delivery Tracking Map */}
              {(selectedOrder.delivery_status === 'shipped' || selectedOrder.delivery_status === 'processing') && selectedOrder.delivery_address && (
                <div className="bg-slate-700/30 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Map className="w-4 h-4 text-blue-400" />
                    Live Delivery Tracking
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 border text-[10px] animate-pulse">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block mr-1" />
                      Live
                    </Badge>
                  </h4>
                  <Suspense fallback={
                    <div className="flex items-center justify-center h-48 bg-slate-800/50 rounded-lg">
                      <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
                    </div>
                  }>
                    <DeliveryTrackingMap order={selectedOrder} />
                  </Suspense>
                </div>
              )}



              {/* Refund Notice */}
              {selectedOrder.status === 'refunded' && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <RotateCcw className="w-5 h-5 text-orange-400" />
                    <span className="text-orange-400 font-bold">Refund Processed</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs">Refund Amount</span>
                      <p className="text-orange-400 font-bold">${Number(selectedOrder.refund_amount || selectedOrder.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    </div>
                    {selectedOrder.refund_reason && (
                      <div>
                        <span className="text-slate-400 text-xs">Reason</span>
                        <p className="text-white">{selectedOrder.refund_reason}</p>
                      </div>
                    )}
                    {selectedOrder.refunded_at && (
                      <div>
                        <span className="text-slate-400 text-xs">Refunded On</span>
                        <p className="text-white">{new Date(selectedOrder.refunded_at).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 text-xs">Product</span>
                    <p className="text-white font-medium">{selectedOrder.product_name}</p>
                    <p className="text-slate-500 text-xs">{selectedOrder.product_code}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Quantity</span>
                    <p className="text-white font-medium">{Number(selectedOrder.quantity || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Unit Price</span>
                    <p className="text-white font-medium">${Number(selectedOrder.unit_price || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 text-xs">Subtotal</span>
                    <p className="text-white font-medium">${Number(selectedOrder.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Service Fee (0.87%)</span>
                    <p className="text-amber-400 font-medium">${Number(selectedOrder.service_fee || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs">Total Paid</span>
                    <p className="text-[#D4AF37] font-bold text-lg">${Number(selectedOrder.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>

              {/* Payment & Delivery Info */}
              <div className="bg-slate-700/30 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" />Payment Method</span>
                  <span className="text-white capitalize">{selectedOrder.payment_method || 'N/A'}</span>
                </div>
                {selectedOrder.payment_intent_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Payment Intent ID</span>
                    <span className="text-slate-300 font-mono text-xs">{selectedOrder.payment_intent_id}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-sm flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Delivery Date</span>
                  <span className="text-white">{selectedOrder.delivery_date || 'TBD'}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-slate-400 text-sm flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Delivery Address</span>
                  <span className="text-white text-right max-w-[250px]">{selectedOrder.delivery_address || 'N/A'}</span>
                </div>
                {selectedOrder.notes && (
                  <div className="flex items-start justify-between">
                    <span className="text-slate-400 text-sm flex items-center gap-1"><FileText className="w-3.5 h-3.5" />Notes</span>
                    <span className="text-white text-right max-w-[250px]">{selectedOrder.notes}</span>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {selectedOrder.shipped_at && (
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2">
                    <span className="text-purple-400">Shipped</span>
                    <p className="text-white">{new Date(selectedOrder.shipped_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedOrder.delivered_at && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2">
                    <span className="text-green-400">Delivered</span>
                    <p className="text-white">{new Date(selectedOrder.delivered_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedOrder.cancelled_at && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                    <span className="text-red-400">Cancelled</span>
                    <p className="text-white">{new Date(selectedOrder.cancelled_at).toLocaleString()}</p>
                  </div>
                )}
                {selectedOrder.refunded_at && (
                  <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
                    <span className="text-orange-400">Refunded</span>
                    <p className="text-white">{new Date(selectedOrder.refunded_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {/* Download Invoice */}
                {(selectedOrder.status === 'delivered' || selectedOrder.status === 'paid' || selectedOrder.status === 'shipped') && (
                  <Button
                    onClick={() => downloadInvoice(selectedOrder)}
                    disabled={generatingPDF === selectedOrder.id}
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold"
                  >
                    {generatingPDF === selectedOrder.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download Invoice PDF
                  </Button>
                )}

                {/* Cancel Button */}
                {(selectedOrder.status === 'pending' || (selectedOrder.status === 'paid' && selectedOrder.delivery_status === 'pending')) && (
                  <Button
                    onClick={() => cancelOrder(selectedOrder.id)}
                    disabled={cancelling === selectedOrder.id}
                    variant="outline"
                    className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
                  >
                    {cancelling === selectedOrder.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="w-4 h-4 mr-2" />
                    )}
                    Cancel Order
                  </Button>
                )}
              </div>

              {(selectedOrder.status === 'pending' || (selectedOrder.status === 'paid' && selectedOrder.delivery_status === 'pending')) && (
                <p className="text-slate-500 text-xs text-center">
                  Orders can only be cancelled before they are shipped
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
