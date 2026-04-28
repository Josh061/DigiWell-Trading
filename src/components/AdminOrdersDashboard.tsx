
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import RefundModal from '@/components/RefundModal';
import {
  Package, DollarSign, TrendingUp, Calendar, Loader2, Download,
  ArrowUpDown, ArrowUp, ArrowDown, Search, RefreshCw, CheckCircle,
  Truck, Clock, XCircle, BarChart3, ShoppingCart, Users, Filter,
  ChevronLeft, ChevronRight, Shield, RotateCcw, Mail, AlertTriangle
} from 'lucide-react';

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
  delivery_address: string;
  delivery_date: string;
  created_at: string;
  updated_at: string;
  guest_name: string | null;
  guest_email: string | null;
  payment_intent_id: string | null;
  notes: string | null;
  refunded_at?: string | null;
  refund_amount?: number | null;
  refund_reason?: string | null;
  users?: { full_name: string; email: string; company: string } | null;
}

type SortField = 'created_at' | 'product_name' | 'total_amount' | 'status' | 'delivery_status';
type SortDir = 'asc' | 'desc';

export default function AdminOrdersDashboard() {
  const { hasRole } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deliveryFilter, setDeliveryFilter] = useState('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Refund modal state
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundProcessing, setRefundProcessing] = useState(false);

  // Email sending state
  const [emailSending, setEmailSending] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*, users(full_name, email, company)')
        .order('created_at', { ascending: false })
        .limit(500);

      const { data, error } = await query;

      if (error) {
        if (error.message?.includes('users') || error.message?.includes('relation')) {
          console.warn('Orders join failed, fetching without user data:', error.message);
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(500);
          if (fallbackError) throw fallbackError;
          setOrders((fallbackData || []).map(o => ({ ...o, users: null })));
          return;
        }
        throw error;
      }
      setOrders(data || []);
    } catch (err: any) {
      console.error('Error fetching orders:', err);
      const isNetworkError = err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError');
      if (!isNetworkError) {
        toast({ title: 'Error', description: 'Failed to load orders', variant: 'destructive' });
      } else {
        toast({ title: 'Connection Issue', description: 'Unable to connect. Orders will load when connection is restored.', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('admin')) fetchOrders();
  }, []);

  // Revenue analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const paidOrders = orders.filter(o => o.status !== 'cancelled');
    const refundedOrders = orders.filter(o => o.status === 'refunded');
    const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const totalRefunds = refundedOrders.reduce((s, o) => s + Number(o.refund_amount || o.total_amount || 0), 0);
    const totalServiceFees = paidOrders.reduce((s, o) => s + Number(o.service_fee || 0), 0);
    const ordersToday = paidOrders.filter(o => new Date(o.created_at) >= today).length;
    const ordersWeek = paidOrders.filter(o => new Date(o.created_at) >= weekAgo).length;
    const ordersMonth = paidOrders.filter(o => new Date(o.created_at) >= monthAgo).length;
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    const netRevenue = totalRevenue - totalRefunds;

    // Top products by volume
    const productMap: Record<string, { name: string; count: number; revenue: number }> = {};
    paidOrders.forEach(o => {
      const key = o.product_code || o.product_name || 'Unknown';
      if (!productMap[key]) productMap[key] = { name: o.product_name || key, count: 0, revenue: 0 };
      productMap[key].count += Number(o.quantity || 0);
      productMap[key].revenue += Number(o.total_amount || 0);
    });
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Order volume over time (last 14 days)
    const volumeData: { date: string; count: number; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().split('T')[0];
      const dayOrders = paidOrders.filter(o => o.created_at?.startsWith(dateStr));
      volumeData.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0)
      });
    }

    return { totalRevenue, totalRefunds, netRevenue, totalServiceFees, ordersToday, ordersWeek, ordersMonth, avgOrderValue, topProducts, volumeData, refundedCount: refundedOrders.length };
  }, [orders]);

  // Filtered & sorted orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o =>
        o.order_number?.toLowerCase().includes(q) ||
        o.product_name?.toLowerCase().includes(q) ||
        o.guest_name?.toLowerCase().includes(q) ||
        o.guest_email?.toLowerCase().includes(q) ||
        o.users?.full_name?.toLowerCase().includes(q) ||
        o.users?.email?.toLowerCase().includes(q) ||
        o.delivery_address?.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== 'all') result = result.filter(o => o.status === statusFilter);
    if (deliveryFilter !== 'all') result = result.filter(o => o.delivery_status === deliveryFilter);
    
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'created_at': aVal = a.created_at; bVal = b.created_at; break;
        case 'product_name': aVal = a.product_name || ''; bVal = b.product_name || ''; break;
        case 'total_amount': aVal = Number(a.total_amount); bVal = Number(b.total_amount); break;
        case 'status': aVal = a.status; bVal = b.status; break;
        case 'delivery_status': aVal = a.delivery_status || ''; bVal = b.delivery_status || ''; break;
        default: aVal = a.created_at; bVal = b.created_at;
      }
      if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    
    return result;
  }, [orders, searchQuery, statusFilter, deliveryFilter, sortField, sortDir]);

  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredOrders.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-500" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#D4AF37]" /> : <ArrowDown className="w-3 h-3 text-[#D4AF37]" />;
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedOrders);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedOrders(next);
  };

  // Send email notifications for status changes
  const sendStatusEmails = async (orderIds: string[], newStatus: string) => {
    try {
      const ordersToNotify = orders.filter(o => orderIds.includes(o.id));
      const emailOrders = ordersToNotify.map(o => ({
        order_number: o.order_number,
        customer_email: o.users?.email || o.guest_email,
        customer_name: o.users?.full_name || o.guest_name || 'Valued Customer',
        product_name: o.product_name,
        quantity: o.quantity,
        total_amount: o.total_amount,
        delivery_address: o.delivery_address,
        delivery_date: o.delivery_date,
        new_status: newStatus,
      })).filter(o => o.customer_email);

      if (emailOrders.length === 0) return;

      const { data, error } = await supabase.functions.invoke('order-status-webhook', {
        body: {
          action: 'bulk_notify_status_change',
          orders: emailOrders,
          new_status: newStatus,
        }
      });

      if (error) {
        console.warn('Email notification error:', error);
      } else if (data?.sent > 0) {
        toast({ title: 'Emails Sent', description: `${data.sent} notification email${data.sent > 1 ? 's' : ''} sent to customers` });
      }
    } catch (err) {
      console.warn('Failed to send status emails:', err);
    }
  };

  const bulkUpdateStatus = async (newStatus: string, newDeliveryStatus: string) => {
    if (selectedOrders.size === 0) return;
    setUpdating(true);
    setEmailSending(true);
    try {
      const updateData: any = { status: newStatus, delivery_status: newDeliveryStatus, updated_at: new Date().toISOString() };
      if (newDeliveryStatus === 'shipped') updateData.shipped_at = new Date().toISOString();
      if (newDeliveryStatus === 'delivered') updateData.delivered_at = new Date().toISOString();

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .in('id', Array.from(selectedOrders));

      if (error) throw error;
      
      toast({ title: 'Orders Updated', description: `${selectedOrders.size} orders marked as ${newDeliveryStatus}` });

      // Send email notifications (non-blocking)
      sendStatusEmails(Array.from(selectedOrders), newDeliveryStatus).finally(() => setEmailSending(false));

      setSelectedOrders(new Set());
      await fetchOrders();
    } catch (err) {
      console.error('Bulk update error:', err);
      toast({ title: 'Error', description: 'Failed to update orders', variant: 'destructive' });
      setEmailSending(false);
    } finally {
      setUpdating(false);
    }
  };

  // Refund processing
  const handleRefundConfirm = async (reason: string, stripeReason: string, notes: string) => {
    setRefundProcessing(true);
    const orderIds = Array.from(selectedOrders);
    const ordersToRefund = orders.filter(o => orderIds.includes(o.id));
    
    let successCount = 0;
    let failCount = 0;
    const refundResults: Array<{ orderId: string; success: boolean; error?: string }> = [];

    for (const order of ordersToRefund) {
      try {
        // Process Stripe refund if payment intent exists
        if (order.payment_intent_id) {
          const { data: refundData, error: refundError } = await supabase.functions.invoke('stripe-payment-intent', {
            body: {
              action: 'create_refund',
              payment_intent_id: order.payment_intent_id,
              amount: order.total_amount,
              reason: stripeReason,
              metadata: {
                order_number: order.order_number,
                refund_reason: reason,
                notes: notes,
              }
            }
          });

          if (refundError || !refundData?.success) {
            console.error('Stripe refund failed for', order.order_number, refundData?.error || refundError);
            // Still update order status even if Stripe refund fails (might be non-Stripe payment)
          }
        }

        // Update order in database
        const { error: updateError } = await supabase
          .from('orders')
          .update({
            status: 'refunded',
            delivery_status: 'cancelled',
            refunded_at: new Date().toISOString(),
            refund_amount: order.total_amount,
            refund_reason: `${reason}${notes ? ': ' + notes : ''}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', order.id);

        if (updateError) throw updateError;

        successCount++;
        refundResults.push({ orderId: order.id, success: true });

        // Send refund notification email
        const customerEmail = order.users?.email || order.guest_email;
        if (customerEmail) {
          supabase.functions.invoke('order-status-webhook', {
            body: {
              action: 'notify_status_change',
              order_number: order.order_number,
              customer_email: customerEmail,
              customer_name: order.users?.full_name || order.guest_name || 'Valued Customer',
              product_name: order.product_name,
              quantity: order.quantity,
              total_amount: order.total_amount,
              new_status: 'refunded',
              refund_amount: order.total_amount,
              refund_reason: reason,
            }
          }).catch(err => console.warn('Refund email failed:', err));
        }
      } catch (err: any) {
        console.error('Refund error for order:', order.order_number, err);
        failCount++;
        refundResults.push({ orderId: order.id, success: false, error: err.message });
      }
    }

    if (successCount > 0) {
      toast({ title: 'Refunds Processed', description: `${successCount} refund${successCount > 1 ? 's' : ''} processed successfully${failCount > 0 ? `, ${failCount} failed` : ''}` });
    }
    if (failCount > 0 && successCount === 0) {
      toast({ title: 'Refund Failed', description: 'All refund attempts failed. Check console for details.', variant: 'destructive' });
    }

    setRefundProcessing(false);
    setShowRefundModal(false);
    setSelectedOrders(new Set());
    await fetchOrders();
  };

  const exportCSV = () => {
    const headers = ['Order Number', 'Date', 'Customer', 'Email', 'Product', 'Quantity', 'Unit Price', 'Subtotal', 'Service Fee', 'Total', 'Currency', 'Status', 'Delivery Status', 'Payment Method', 'Delivery Address', 'Delivery Date', 'Refund Amount', 'Refund Reason'];
    const rows = filteredOrders.map(o => [
      o.order_number,
      new Date(o.created_at).toLocaleDateString(),
      o.users?.full_name || o.guest_name || 'N/A',
      o.users?.email || o.guest_email || 'N/A',
      o.product_name,
      o.quantity,
      o.unit_price,
      o.subtotal,
      o.service_fee,
      o.total_amount,
      o.currency || 'USD',
      o.status,
      o.delivery_status,
      o.payment_method,
      o.delivery_address,
      o.delivery_date,
      o.refund_amount || '',
      o.refund_reason || ''
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v || ''}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: `${filteredOrders.length} orders exported to CSV` });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      paid: 'bg-green-500/20 text-green-400 border-green-500/30',
      confirmed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      processing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      shipped: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      refunded: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    };
    return <Badge className={`${styles[status] || 'bg-slate-500/20 text-slate-400'} border text-xs`}>{status}</Badge>;
  };

  const getDeliveryIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
      case 'processing': return <Package className="w-3.5 h-3.5 text-cyan-400" />;
      case 'shipped': return <Truck className="w-3.5 h-3.5 text-purple-400" />;
      case 'delivered': return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      case 'cancelled': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const maxVolume = Math.max(...analytics.volumeData.map(d => d.count), 1);

  // Get selected orders for refund modal
  const selectedOrdersList = orders.filter(o => selectedOrders.has(o.id));
  const canRefund = selectedOrdersList.some(o => o.status !== 'refunded' && o.status !== 'cancelled');

  if (!hasRole('admin')) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg">Access Denied</h3>
          <p className="text-slate-400">Admin access required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-[#D4AF37]" />
            Order Management
          </h2>
          <p className="text-slate-400 text-sm">{orders.length} total orders across all users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportCSV} variant="outline" size="sm" className="border-green-500/50 text-green-400 hover:bg-green-500/10">
            <Download className="w-4 h-4 mr-1" />CSV Export
          </Button>
          <Button onClick={fetchOrders} disabled={loading} variant="outline" size="sm" className="border-[#00D4FF]/50 text-[#00D4FF]">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Revenue Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-slate-400 text-xs">Total Revenue</span>
            </div>
            <div className="text-xl font-bold text-white">${(analytics.totalRevenue / 1000).toFixed(1)}K</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw className="w-4 h-4 text-orange-400" />
              <span className="text-slate-400 text-xs">Refunds</span>
            </div>
            <div className="text-xl font-bold text-orange-400">${(analytics.totalRefunds / 1000).toFixed(1)}K</div>
            <div className="text-slate-500 text-[10px]">{analytics.refundedCount} orders</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-400 text-xs">Net Revenue</span>
            </div>
            <div className="text-xl font-bold text-emerald-400">${(analytics.netRevenue / 1000).toFixed(1)}K</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-slate-400 text-xs">Today</span>
            </div>
            <div className="text-xl font-bold text-white">{analytics.ordersToday}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span className="text-slate-400 text-xs">This Week</span>
            </div>
            <div className="text-xl font-bold text-white">{analytics.ordersWeek}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-400 text-xs">This Month</span>
            </div>
            <div className="text-xl font-bold text-white">{analytics.ordersMonth}</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-slate-400 text-xs">Avg Order</span>
            </div>
            <div className="text-xl font-bold text-white">${(analytics.avgOrderValue / 1000).toFixed(1)}K</div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-slate-400 text-xs">Service Fees</span>
            </div>
            <div className="text-xl font-bold text-[#D4AF37]">${(analytics.totalServiceFees / 1000).toFixed(1)}K</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#D4AF37]" />
              Order Volume (Last 14 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {analytics.volumeData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-slate-400">{d.count}</span>
                  <div
                    className="w-full bg-gradient-to-t from-[#D4AF37] to-[#D4AF37]/60 rounded-t transition-all hover:from-[#D4AF37] hover:to-[#D4AF37]/80"
                    style={{ height: `${Math.max((d.count / maxVolume) * 100, 4)}%`, minHeight: '4px' }}
                    title={`${d.date}: ${d.count} orders, $${d.revenue.toLocaleString()}`}
                  />
                  <span className="text-[9px] text-slate-500 -rotate-45 origin-left whitespace-nowrap">{d.date}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-[#00D4FF]" />
              Top Products by Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topProducts.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No order data</p>
              ) : (
                analytics.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-white text-sm">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-sm font-mono">${(p.revenue / 1000).toFixed(1)}K</div>
                      <div className="text-slate-500 text-xs">{p.count.toLocaleString()} units</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Bulk Actions */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search orders, customers, products..."
                className="pl-9 bg-slate-800/50 border-slate-600 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] bg-slate-800/50 border-slate-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deliveryFilter} onValueChange={v => { setDeliveryFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[150px] bg-slate-800/50 border-slate-600 text-white">
                <SelectValue placeholder="Delivery" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Delivery</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>

            {selectedOrders.size > 0 && (
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30">{selectedOrders.size} selected</Badge>
                {emailSending && (
                  <Badge className="bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                    <Mail className="w-3 h-3 mr-1" />Sending emails...
                  </Badge>
                )}
                <Button
                  size="sm"
                  onClick={() => bulkUpdateStatus('processing', 'processing')}
                  disabled={updating}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {updating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Package className="w-3 h-3 mr-1" />}
                  Processing
                </Button>
                <Button
                  size="sm"
                  onClick={() => bulkUpdateStatus('paid', 'shipped')}
                  disabled={updating}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {updating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Truck className="w-3 h-3 mr-1" />}
                  Shipped
                </Button>
                <Button
                  size="sm"
                  onClick={() => bulkUpdateStatus('delivered', 'delivered')}
                  disabled={updating}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {updating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                  Delivered
                </Button>
                {canRefund && (
                  <Button
                    size="sm"
                    onClick={() => setShowRefundModal(true)}
                    disabled={updating}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Refund
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="p-3 text-left">
                      <Checkbox
                        checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-3 text-left text-slate-400 font-medium">Order</th>
                    <th className="p-3 text-left">
                      <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 text-slate-400 font-medium hover:text-white">
                        Date <SortIcon field="created_at" />
                      </button>
                    </th>
                    <th className="p-3 text-left text-slate-400 font-medium">Customer</th>
                    <th className="p-3 text-left">
                      <button onClick={() => handleSort('product_name')} className="flex items-center gap-1 text-slate-400 font-medium hover:text-white">
                        Product <SortIcon field="product_name" />
                      </button>
                    </th>
                    <th className="p-3 text-left text-slate-400 font-medium">Qty</th>
                    <th className="p-3 text-right">
                      <button onClick={() => handleSort('total_amount')} className="flex items-center gap-1 text-slate-400 font-medium hover:text-white ml-auto">
                        Amount <SortIcon field="total_amount" />
                      </button>
                    </th>
                    <th className="p-3 text-center">
                      <button onClick={() => handleSort('status')} className="flex items-center gap-1 text-slate-400 font-medium hover:text-white mx-auto">
                        Status <SortIcon field="status" />
                      </button>
                    </th>
                    <th className="p-3 text-center">
                      <button onClick={() => handleSort('delivery_status')} className="flex items-center gap-1 text-slate-400 font-medium hover:text-white mx-auto">
                        Delivery <SortIcon field="delivery_status" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map(order => {
                    const customerName = order.users?.full_name || order.guest_name || 'Unknown';
                    const customerEmail = order.users?.email || order.guest_email || '';
                    
                    return (
                      <tr key={order.id} className={`border-b border-slate-700/30 hover:bg-white/5 transition-colors ${selectedOrders.has(order.id) ? 'bg-[#D4AF37]/5' : ''}`}>
                        <td className="p-3">
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={() => toggleSelect(order.id)}
                          />
                        </td>
                        <td className="p-3">
                          <span className="text-[#D4AF37] font-mono text-xs">{order.order_number || order.id.slice(0, 8)}</span>
                          {order.status === 'refunded' && (
                            <div className="mt-0.5">
                              <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[10px]">
                                <RotateCcw className="w-2.5 h-2.5 mr-0.5" />Refunded
                              </Badge>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-slate-300 text-xs">
                          {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          <br />
                          <span className="text-slate-500">{new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                        </td>
                        <td className="p-3">
                          <div className="text-white text-xs font-medium">{customerName}</div>
                          <div className="text-slate-500 text-[11px]">{customerEmail}</div>
                          {order.guest_name && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] mt-0.5">Guest</Badge>}
                        </td>
                        <td className="p-3">
                          <div className="text-white text-xs">{order.product_name}</div>
                          <div className="text-slate-500 text-[11px]">{order.product_code}</div>
                        </td>
                        <td className="p-3 text-slate-300 text-xs font-mono">{Number(order.quantity || 0).toLocaleString()}</td>
                        <td className="p-3 text-right">
                          <div className="text-white text-xs font-mono font-bold">${Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          <div className="text-slate-500 text-[10px]">Fee: ${Number(order.service_fee || 0).toFixed(2)}</div>
                          {order.refund_amount && (
                            <div className="text-orange-400 text-[10px]">Refund: ${Number(order.refund_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          )}
                        </td>
                        <td className="p-3 text-center">{getStatusBadge(order.status)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getDeliveryIcon(order.delivery_status || 'pending')}
                            <span className="text-xs text-slate-300 capitalize">{order.delivery_status || 'pending'}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700/50">
              <span className="text-slate-400 text-xs">
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredOrders.length)} of {filteredOrders.length}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = page <= 3 ? i + 1 : page + i - 2;
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={page === pageNum ? 'bg-[#D4AF37] text-slate-900' : 'text-slate-400 hover:text-white'}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refund Modal */}
      <RefundModal
        open={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        orders={selectedOrdersList.filter(o => o.status !== 'refunded' && o.status !== 'cancelled')}
        onConfirm={handleRefundConfirm}
        processing={refundProcessing}
      />
    </div>
  );
}
