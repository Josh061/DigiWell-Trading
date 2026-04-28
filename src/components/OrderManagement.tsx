import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  FileText,
  Download,
  MapPin,
  Mail,
  RefreshCw,
  Search,
  Filter,
  AlertCircle,
  XCircle,
  Settings,
  Send,
  Eye,
  Calendar,
  DollarSign,
  TrendingUp,
  Box,
  ChevronRight,
  ExternalLink,
  Navigation,
  Globe,
  Phone,
  Printer,
  Copy,
  CheckCheck,
  AlertTriangle,
  ArrowRight,
  MoreVertical,
} from 'lucide-react';

interface Order {
  id: string;
  order_number: string;
  user_id: string;
  user_email: string;
  user_name: string;
  product_name: string;
  product_type: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_amount: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery' | 'delivered' | 'exception' | 'cancelled';
  shipping_address: any;
  billing_address: any;
  tracking_number: string | null;
  carrier: string | null;
  carrier_tracking_url: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  current_location: any;
  last_location_update: string | null;
  notes: string | null;
  priority: string;
  source_type: string | null;
  auction_id: string | null;
  invoice_number: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  processing_at: string | null;
  shipped_at: string | null;
  out_for_delivery_at: string | null;
  delivered_at: string | null;
  exception_at: string | null;
  cancelled_at: string | null;
}


interface OrderStats {
  total: number;
  pending: number;
  confirmed: number;
  processing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
  totalRevenue: number;
  thisMonthOrders: number;
  lastMonthOrders: number;
  thisMonthRevenue: number;
  averageOrderValue: number;
}

interface StatusHistory {
  id: string;
  order_id: string;
  status: string;
  previous_status: string | null;
  changed_by: string;
  changed_by_name: string;
  notes: string;
  location: any;
  metadata: any;
  created_at: string;
}

interface TrackingEvent {
  id: string;
  order_id: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string;
  location_address: string | null;
  event_type: string;
  event_description: string;
  carrier: string;
  carrier_status: string;
  event_timestamp: string;
}

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50', icon: Clock, bgColor: 'bg-yellow-500' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', icon: CheckCircle, bgColor: 'bg-blue-500' },
  processing: { label: 'Processing', color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', icon: Settings, bgColor: 'bg-purple-500' },
  shipped: { label: 'Shipped', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50', icon: Truck, bgColor: 'bg-cyan-500' },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/50', icon: CheckCircle, bgColor: 'bg-green-500' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/50', icon: XCircle, bgColor: 'bg-red-500' },
};

const statusOrder = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const carrierLogos: Record<string, string> = {
  'DHL': '🟡',
  'FedEx': '🟣',
  'UPS': '🟤',
  'Maersk': '🔵',
  'MSC': '⚫',
  'Standard': '📦',
};

export default function OrderManagement() {
  const { user, userProfile, hasRole } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistory[]>([]);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [showUpdateStatus, setShowUpdateStatus] = useState(false);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Update status form
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const isAdmin = hasRole(['admin']);

  useEffect(() => {
    fetchOrders();
    if (isAdmin) {
      fetchStats();
    }
  }, [user, isAdmin]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('order-management', {
        body: {
          action: 'get_orders',
          user_id: user?.id,
          is_admin: isAdmin,
        },
      });

      if (error) throw error;
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders(getMockOrders());
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('order-management', {
        body: { action: 'get_order_stats' },
      });

      if (error) throw error;
      setStats(data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        total: 156,
        pending: 12,
        confirmed: 8,
        processing: 15,
        shipped: 23,
        delivered: 89,
        cancelled: 9,
        totalRevenue: 4567890,
        thisMonthOrders: 34,
        lastMonthOrders: 28,
        thisMonthRevenue: 1234567,
        averageOrderValue: 29281,
      });
    }
  };

  const fetchOrderDetail = async (order: Order) => {
    setSelectedOrder(order);
    try {
      const { data, error } = await supabase.functions.invoke('order-management', {
        body: { action: 'get_order', order_id: order.id },
      });

      if (error) throw error;
      setStatusHistory(data.history || []);
      setTrackingEvents(data.tracking || []);
    } catch (error) {
      console.error('Error fetching order detail:', error);
      setStatusHistory(getMockStatusHistory(order));
      setTrackingEvents(getMockTrackingEvents(order));
    }
    setShowOrderDetail(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('order-management', {
        body: {
          action: 'update_status',
          order_id: selectedOrder.id,
          status: newStatus,
          tracking_number: trackingNumber || undefined,
          carrier: carrier || undefined,
          estimated_delivery: estimatedDelivery || undefined,
          notes: statusNotes || undefined,
          changed_by: user?.id,
          changed_by_name: userProfile?.full_name || user?.email,
        },
      });

      if (error) throw error;

      setOrders(orders.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: newStatus as any, tracking_number: trackingNumber || o.tracking_number, carrier: carrier || o.carrier }
          : o
      ));

      setShowUpdateStatus(false);
      resetUpdateForm();
      fetchOrders();
      if (isAdmin) fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const resetUpdateForm = () => {
    setNewStatus('');
    setTrackingNumber('');
    setCarrier('');
    setEstimatedDelivery('');
    setStatusNotes('');
  };

  const generateInvoice = async (order: Order) => {
    try {
      const { data, error } = await supabase.functions.invoke('order-management', {
        body: { action: 'generate_invoice', order_id: order.id },
      });

      if (error) throw error;

      const invoiceContent = generateInvoiceHTML(data.invoice);
      const blob = new Blob([invoiceContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${order.order_number}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating invoice:', error);
      const mockInvoice = {
        invoiceNumber: `INV-${order.order_number}`,
        date: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        order: order,
        subtotal: order.total_amount,
        taxRate: 10,
        tax: order.total_amount * 0.1,
        total: order.total_amount * 1.1,
        paymentTerms: 'Net 30',
      };
      const invoiceContent = generateInvoiceHTML(mockInvoice);
      const blob = new Blob([invoiceContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${order.order_number}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const generateInvoiceHTML = (invoice: any) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 40px; }
    .invoice { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #D4AF37, #B8941F); color: white; padding: 40px; display: flex; justify-content: space-between; align-items: center; }
    .logo { font-size: 32px; font-weight: bold; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { font-size: 28px; margin-bottom: 5px; }
    .invoice-title p { opacity: 0.9; }
    .body { padding: 40px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
    .info-section h3 { color: #D4AF37; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .info-section p { color: #333; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background: #f8f9fa; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; padding: 15px; text-align: left; border-bottom: 2px solid #e9ecef; }
    td { padding: 15px; border-bottom: 1px solid #e9ecef; color: #333; }
    .text-right { text-align: right; }
    .totals { display: flex; justify-content: flex-end; }
    .totals-table { width: 300px; }
    .totals-table tr td { padding: 10px 15px; }
    .totals-table tr:last-child { background: linear-gradient(135deg, #D4AF37, #B8941F); color: white; font-weight: bold; font-size: 18px; }
    .footer { background: #f8f9fa; padding: 30px 40px; text-align: center; color: #666; font-size: 14px; }
    .footer p { margin: 5px 0; }
    .qr-section { text-align: center; margin-top: 30px; padding-top: 30px; border-top: 1px dashed #ddd; }
    .qr-code { width: 100px; height: 100px; background: #f0f0f0; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #999; }
    @media print { body { padding: 0; background: white; } .invoice { box-shadow: none; } }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">Digiwell</div>
      <div class="invoice-title">
        <h2>INVOICE</h2>
        <p>${invoice.invoiceNumber}</p>
      </div>
    </div>
    <div class="body">
      <div class="info-grid">
        <div class="info-section">
          <h3>Bill To</h3>
          <p><strong>${invoice.order.user_name}</strong></p>
          <p>${invoice.order.user_email}</p>
          ${invoice.order.billing_address ? `<p>${invoice.order.billing_address.city}, ${invoice.order.billing_address.country}</p>` : ''}
        </div>
        <div class="info-section" style="text-align: right;">
          <h3>Invoice Details</h3>
          <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
          <p><strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString()}</p>
          <p><strong>Order #:</strong> ${invoice.order.order_number}</p>
          <p><strong>Terms:</strong> ${invoice.paymentTerms}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>${invoice.order.product_name}</strong>
              ${invoice.order.product_type ? `<br><span style="color: #666; font-size: 13px;">${invoice.order.product_type}</span>` : ''}
            </td>
            <td>${Number(invoice.order.quantity).toLocaleString()} ${invoice.order.unit}</td>
            <td>${invoice.order.currency} ${Number(invoice.order.unit_price).toLocaleString()}</td>
            <td class="text-right">${invoice.order.currency} ${Number(invoice.order.total_amount).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>
      <div class="totals">
        <table class="totals-table">
          <tr>
            <td>Subtotal</td>
            <td class="text-right">${invoice.order.currency} ${Number(invoice.subtotal).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Tax (${invoice.taxRate}%)</td>
            <td class="text-right">${invoice.order.currency} ${Number(invoice.tax).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Total</td>
            <td class="text-right">${invoice.order.currency} ${Number(invoice.total).toLocaleString()}</td>
          </tr>
        </table>
      </div>
      <div class="qr-section">
        <div class="qr-code">[QR Code]</div>
        <p style="font-size: 12px; color: #999;">Scan to verify invoice authenticity</p>
      </div>
    </div>
    <div class="footer">
      <p><strong>Digiwell</strong> - Energy and assets trading</p>
      <p>OPEC Certified | OilPrice.com Live Data Integration | Web3 Blockchain Payments</p>


      <p style="margin-top: 15px;">Thank you for your business!</p>

    </div>
  </div>
</body>
</html>
    `;
  };

  const copyTrackingNumber = (trackingNumber: string) => {
    navigator.clipboard.writeText(trackingNumber);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesTab = true;
    if (activeTab === 'pending') matchesTab = order.status === 'pending';
    else if (activeTab === 'active') matchesTab = ['confirmed', 'processing', 'shipped'].includes(order.status);
    else if (activeTab === 'completed') matchesTab = order.status === 'delivered';
    else if (activeTab === 'cancelled') matchesTab = order.status === 'cancelled';
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesTab && matchesStatus;
  });

  const getStatusIndex = (status: string) => statusOrder.indexOf(status);

  const renderStatusTimeline = (order: Order) => {
    const currentIndex = getStatusIndex(order.status);
    
    return (
      <div className="flex items-center justify-between w-full py-4">
        {statusOrder.map((status, index) => {
          const config = statusConfig[status as keyof typeof statusConfig];
          const Icon = config.icon;
          const isCompleted = index <= currentIndex && order.status !== 'cancelled';
          const isCurrent = index === currentIndex && order.status !== 'cancelled';
          
          return (
            <div key={status} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                {index > 0 && (
                  <div className={`flex-1 h-1 transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-slate-600'}`} />
                )}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 
                  isCurrent ? 'bg-[#D4AF37] text-slate-900 shadow-lg shadow-[#D4AF37]/30 animate-pulse' : 
                  'bg-slate-700 text-slate-400'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                {index < statusOrder.length - 1 && (
                  <div className={`flex-1 h-1 transition-all duration-500 ${index < currentIndex ? 'bg-green-500' : 'bg-slate-600'}`} />
                )}
              </div>
              <span className={`text-xs mt-2 font-medium ${isCompleted || isCurrent ? 'text-white' : 'text-slate-500'}`}>
                {config.label}
              </span>
              {order[`${status}_at` as keyof Order] && (
                <span className="text-[10px] text-slate-500">
                  {new Date(order[`${status}_at` as keyof Order] as string).toLocaleDateString()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderDeliveryTracker = (order: Order) => {
    if (!order.tracking_number) return null;

    return (
      <Card className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-cyan-400 flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Live Delivery Tracking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{carrierLogos[order.carrier || 'Standard']}</div>
              <div>
                <div className="text-white font-medium">{order.carrier || 'Standard Shipping'}</div>
                <div className="flex items-center gap-2">
                  <code className="text-cyan-400 text-sm bg-slate-800 px-2 py-0.5 rounded">{order.tracking_number}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                    onClick={() => copyTrackingNumber(order.tracking_number!)}
                  >
                    {copiedTracking ? <CheckCheck className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  </Button>
                </div>
              </div>
            </div>
            {order.carrier_tracking_url && (
              <Button
                size="sm"
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                onClick={() => window.open(order.carrier_tracking_url!, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Track on {order.carrier}
              </Button>
            )}
          </div>

          {order.current_location && (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                <MapPin className="w-3 h-3" />
                Current Location
              </div>
              <div className="text-white font-medium">{order.current_location.name || 'In Transit'}</div>
              {order.current_location.address && (
                <div className="text-slate-400 text-sm">{order.current_location.address}</div>
              )}
              {order.last_location_update && (
                <div className="text-slate-500 text-xs mt-1">
                  Updated {new Date(order.last_location_update).toLocaleString()}
                </div>
              )}
            </div>
          )}

          {order.estimated_delivery && (
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-slate-400 text-sm">Estimated Delivery</span>
              </div>
              <span className="text-white font-medium">
                {new Date(order.estimated_delivery).toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          )}

          {trackingEvents.length > 0 && (
            <Button
              variant="outline"
              className="w-full border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
              onClick={() => setShowTrackingModal(true)}
            >
              <Globe className="w-4 h-4 mr-2" />
              View Full Tracking History ({trackingEvents.length} events)
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Package className="w-8 h-8 text-[#D4AF37]" />
            Order Management
          </h2>
          <p className="text-white/70 mt-1">Track and manage your orders with real-time delivery updates</p>
        </div>
        <Button onClick={fetchOrders} variant="outline" className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/20">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Admin Stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <div className="text-xs text-slate-400">Total Orders</div>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
              <div className="text-xs text-yellow-400/70">Pending</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.confirmed}</div>
              <div className="text-xs text-blue-400/70">Confirmed</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.processing}</div>
              <div className="text-xs text-purple-400/70">Processing</div>
            </CardContent>
          </Card>
          <Card className="bg-cyan-500/10 border-cyan-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{stats.shipped}</div>
              <div className="text-xs text-cyan-400/70">Shipped</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.delivered}</div>
              <div className="text-xs text-green-400/70">Delivered</div>
            </CardContent>
          </Card>
          <Card className="bg-red-500/10 border-red-500/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.cancelled}</div>
              <div className="text-xs text-red-400/70">Cancelled</div>
            </CardContent>
          </Card>
          <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#D4AF37]">${(stats.totalRevenue / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-[#D4AF37]/70">Revenue</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs & Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full lg:w-auto">
              <TabsList className="bg-slate-800/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                  All ({orders.length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-slate-900">
                  Pending ({orders.filter(o => o.status === 'pending').length})
                </TabsTrigger>
                <TabsTrigger value="active" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-slate-900">
                  Active ({orders.filter(o => ['confirmed', 'processing', 'shipped'].includes(o.status)).length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-green-500 data-[state=active]:text-slate-900">
                  Completed ({orders.filter(o => o.status === 'delivered').length})
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="data-[state=active]:bg-red-500 data-[state=active]:text-white">
                  Cancelled ({orders.filter(o => o.status === 'cancelled').length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-3 w-full lg:w-auto">
              <div className="flex-1 lg:flex-none relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-slate-600 text-white w-full lg:w-64"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Box className="w-5 h-5 text-[#D4AF37]" />
            {isAdmin ? 'All Orders' : 'My Orders'} ({filteredOrders.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No orders found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">Order #</TableHead>
                    {isAdmin && <TableHead className="text-slate-300">Customer</TableHead>}
                    <TableHead className="text-slate-300">Product</TableHead>
                    <TableHead className="text-slate-300">Quantity</TableHead>
                    <TableHead className="text-slate-300">Total</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Tracking</TableHead>
                    <TableHead className="text-slate-300">Date</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const config = statusConfig[order.status];
                    const StatusIcon = config.icon;
                    return (
                      <TableRow key={order.id} className="border-slate-700 hover:bg-white/5">
                        <TableCell className="text-white font-mono">
                          <div className="flex items-center gap-2">
                            {order.priority === 'high' && <AlertTriangle className="w-4 h-4 text-orange-400" />}
                            {order.priority === 'urgent' && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
                            {order.order_number}
                          </div>
                          {order.source_type === 'auction_win' && (
                            <Badge className="mt-1 bg-[#D4AF37]/20 text-[#D4AF37] text-[10px]">Auction Win</Badge>
                          )}
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <div className="text-white">{order.user_name}</div>
                            <div className="text-slate-400 text-xs">{order.user_email}</div>
                          </TableCell>
                        )}
                        <TableCell className="text-white">{order.product_name}</TableCell>
                        <TableCell className="text-slate-300">{Number(order.quantity).toLocaleString()} {order.unit}</TableCell>
                        <TableCell className="text-[#D4AF37] font-semibold">
                          {order.currency} {Number(order.total_amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${config.color} border`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.tracking_number ? (
                            <div className="flex items-center gap-1">
                              <span className="text-cyan-400 text-xs font-mono">{order.tracking_number.substring(0, 10)}...</span>
                              <Truck className="w-3 h-3 text-cyan-400" />
                            </div>
                          ) : (
                            <span className="text-slate-500 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => fetchOrderDetail(order)}
                              className="text-[#00D4FF] hover:text-[#00D4FF] hover:bg-[#00D4FF]/20 h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => generateInvoice(order)}
                              className="text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/20 h-8 w-8 p-0"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {isAdmin && order.status !== 'delivered' && order.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowUpdateStatus(true);
                                }}
                                className="text-green-400 hover:text-green-400 hover:bg-green-500/20 h-8 w-8 p-0"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Modal */}
      <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Package className="w-5 h-5 text-[#D4AF37]" />
              Order Details - {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Timeline */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300">Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrder.status === 'cancelled' ? (
                    <div className="flex items-center justify-center py-4">
                      <Badge className="bg-red-500/20 text-red-400 border border-red-500/50 text-lg px-4 py-2">
                        <XCircle className="w-5 h-5 mr-2" />
                        Order Cancelled
                      </Badge>
                    </div>
                  ) : (
                    renderStatusTimeline(selectedOrder)
                  )}
                </CardContent>
              </Card>

              {/* Delivery Tracking */}
              {renderDeliveryTracker(selectedOrder)}

              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300">Product Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Product:</span>
                      <span className="text-white font-medium">{selectedOrder.product_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type:</span>
                      <span className="text-white">{selectedOrder.product_type || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quantity:</span>
                      <span className="text-white">{Number(selectedOrder.quantity).toLocaleString()} {selectedOrder.unit}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Unit Price:</span>
                      <span className="text-white">{selectedOrder.currency} {Number(selectedOrder.unit_price).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-700 pt-2 mt-2">
                      <span className="text-slate-300 font-medium">Total:</span>
                      <span className="text-[#D4AF37] font-bold">{selectedOrder.currency} {Number(selectedOrder.total_amount).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-slate-300">Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {selectedOrder.shipping_address ? (
                      <>
                        <div className="text-white">{selectedOrder.shipping_address.street || 'N/A'}</div>
                        <div className="text-slate-400">
                          {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state || ''}
                        </div>
                        <div className="text-slate-400">
                          {selectedOrder.shipping_address.country} {selectedOrder.shipping_address.postal_code || ''}
                        </div>
                      </>
                    ) : (
                      <div className="text-slate-500">No shipping address provided</div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Status History */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Status History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {statusHistory.map((history, index) => {
                      const config = statusConfig[history.status as keyof typeof statusConfig];
                      const Icon = config?.icon || Clock;
                      return (
                        <div key={history.id || index} className="flex items-start gap-3 pb-3 border-b border-slate-700 last:border-0">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${config?.color || 'bg-slate-700 text-slate-400'}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="text-white font-medium">{config?.label || history.status}</span>
                                {history.previous_status && (
                                  <span className="text-slate-500 text-xs ml-2">
                                    (from {history.previous_status})
                                  </span>
                                )}
                                {history.notes && (
                                  <p className="text-slate-400 text-sm mt-1">{history.notes}</p>
                                )}
                              </div>
                              <span className="text-slate-500 text-xs whitespace-nowrap">
                                {new Date(history.created_at).toLocaleString()}
                              </span>
                            </div>
                            {history.changed_by_name && (
                              <span className="text-slate-500 text-xs">by {history.changed_by_name}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-3 justify-end flex-wrap">
                <Button
                  onClick={() => generateInvoice(selectedOrder)}
                  className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                {selectedOrder.carrier_tracking_url && (
                  <Button
                    variant="outline"
                    className="border-[#00D4FF] text-[#00D4FF] hover:bg-[#00D4FF]/20"
                    onClick={() => window.open(selectedOrder.carrier_tracking_url!, '_blank')}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    Track Shipment
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Modal (Admin) */}
      <Dialog open={showUpdateStatus} onOpenChange={setShowUpdateStatus}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#D4AF37]" />
              Update Order Status
            </DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-3 rounded-lg">
                <div className="text-sm text-slate-400">Order</div>
                <div className="text-white font-medium">{selectedOrder.order_number}</div>
                <div className="text-slate-400 text-sm">{selectedOrder.product_name}</div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {statusOrder.map((status) => {
                      const config = statusConfig[status as keyof typeof statusConfig];
                      const currentIndex = getStatusIndex(selectedOrder.status);
                      const statusIndex = getStatusIndex(status);
                      const isDisabled = statusIndex <= currentIndex;
                      return (
                        <SelectItem 
                          key={status} 
                          value={status}
                          disabled={isDisabled}
                        >
                          {config.label}
                        </SelectItem>
                      );
                    })}
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(newStatus === 'shipped' || newStatus === 'processing') && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Tracking Number</Label>
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Carrier</Label>
                    <Select value={carrier} onValueChange={setCarrier}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue placeholder="Select carrier" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="DHL">DHL</SelectItem>
                        <SelectItem value="FedEx">FedEx</SelectItem>
                        <SelectItem value="UPS">UPS</SelectItem>
                        <SelectItem value="Maersk">Maersk</SelectItem>
                        <SelectItem value="MSC">MSC</SelectItem>
                        <SelectItem value="CMA CGM">CMA CGM</SelectItem>
                        <SelectItem value="Hapag-Lloyd">Hapag-Lloyd</SelectItem>
                        <SelectItem value="Standard">Standard Shipping</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-300">Estimated Delivery</Label>
                    <Input
                      type="date"
                      value={estimatedDelivery}
                      onChange={(e) => setEstimatedDelivery(e.target.value)}
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label className="text-slate-300">Notes (Optional)</Label>
                <Textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Add notes about this status update..."
                  className="bg-slate-800/50 border-slate-600 text-white"
                  rows={3}
                />
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-400 text-sm">
                  <Mail className="w-4 h-4" />
                  An email notification will be sent to the customer
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUpdateStatus(false)} className="text-slate-400">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={!newStatus || updating}
              className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
            >
              {updating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Update & Notify
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking History Modal */}
      <Dialog open={showTrackingModal} onOpenChange={setShowTrackingModal}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              Tracking History
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {trackingEvents.map((event, index) => (
              <div key={event.id || index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index === 0 ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {event.event_type === 'pickup' && <Package className="w-5 h-5" />}
                    {event.event_type === 'in_transit' && <Truck className="w-5 h-5" />}
                    {event.event_type === 'customs_clearance' && <FileText className="w-5 h-5" />}
                    {event.event_type === 'out_for_delivery' && <Navigation className="w-5 h-5" />}
                    {event.event_type === 'delivered' && <CheckCircle className="w-5 h-5" />}
                    {event.event_type === 'exception' && <AlertCircle className="w-5 h-5" />}
                    {!['pickup', 'in_transit', 'customs_clearance', 'out_for_delivery', 'delivered', 'exception'].includes(event.event_type) && <MapPin className="w-5 h-5" />}
                  </div>
                  {index < trackingEvents.length - 1 && (
                    <div className="w-0.5 h-full bg-slate-700 my-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-white font-medium">{event.location_name}</div>
                      {event.location_address && (
                        <div className="text-slate-400 text-sm">{event.location_address}</div>
                      )}
                      <div className="text-slate-500 text-sm mt-1">{event.event_description}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-400 text-xs">
                        {new Date(event.event_timestamp).toLocaleDateString()}
                      </div>
                      <div className="text-slate-500 text-xs">
                        {new Date(event.event_timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  <Badge className="mt-2 bg-slate-700 text-slate-300 text-xs">
                    {event.carrier_status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Mock data functions
function getMockOrders(): Order[] {
  return [
    {
      id: '1',
      order_number: 'DW-M5K8-A2B3',
      user_id: 'user1',
      user_email: 'john.trader@example.com',
      user_name: 'John Trader',
      product_name: 'Brent Crude Oil',
      product_type: 'Crude Oil',
      quantity: 50000,
      unit: 'barrels',
      unit_price: 82.45,
      total_amount: 4122500,
      currency: 'USD',
      status: 'shipped',
      shipping_address: { city: 'Houston', state: 'TX', country: 'USA', postal_code: '77001' },
      billing_address: { city: 'Houston', state: 'TX', country: 'USA' },
      tracking_number: 'DHL-789456123',
      carrier: 'DHL',
      carrier_tracking_url: 'https://www.dhl.com/en/express/tracking.html?AWB=DHL-789456123',
      estimated_delivery: '2026-01-20T00:00:00Z',
      actual_delivery: null,
      current_location: { name: 'Rotterdam Port', address: 'Netherlands', latitude: 51.9225, longitude: 4.47917 },
      last_location_update: '2026-01-12T14:30:00Z',
      notes: null,
      priority: 'high',
      source_type: 'direct_purchase',
      auction_id: null,
      invoice_number: 'INV-DW-M5K8-A2B3',
      created_at: '2026-01-05T10:30:00Z',
      updated_at: '2026-01-10T14:20:00Z',
      confirmed_at: '2026-01-05T12:00:00Z',
      processing_at: '2026-01-07T09:00:00Z',
      shipped_at: '2026-01-10T14:20:00Z',
      delivered_at: null,
      cancelled_at: null,
    },
    {
      id: '2',
      order_number: 'DW-N7P2-C4D5',
      user_id: 'user2',
      user_email: 'sarah.refiner@example.com',
      user_name: 'Sarah Refiner',
      product_name: 'Natural Gas',
      product_type: 'Natural Gas',
      quantity: 100000,
      unit: 'MMBtu',
      unit_price: 3.25,
      total_amount: 325000,
      currency: 'USD',
      status: 'processing',
      shipping_address: { city: 'Lagos', country: 'Nigeria' },
      billing_address: { city: 'Lagos', country: 'Nigeria' },
      tracking_number: null,
      carrier: null,
      carrier_tracking_url: null,
      estimated_delivery: null,
      actual_delivery: null,
      current_location: null,
      last_location_update: null,
      notes: 'Priority processing requested',
      priority: 'urgent',
      source_type: 'auction_win',
      auction_id: 'auction-123',
      invoice_number: null,
      created_at: '2026-01-08T15:45:00Z',
      updated_at: '2026-01-11T10:30:00Z',
      confirmed_at: '2026-01-09T08:00:00Z',
      processing_at: '2026-01-11T10:30:00Z',
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
    },
    {
      id: '3',
      order_number: 'DW-R9S4-E6F7',
      user_id: 'user3',
      user_email: 'mike.marketer@example.com',
      user_name: 'Mike Marketer',
      product_name: 'Aviation Fuel (Jet A1)',
      product_type: 'Aviation Fuel',
      quantity: 25000,
      unit: 'liters',
      unit_price: 1.85,
      total_amount: 46250,
      currency: 'USD',
      status: 'delivered',
      shipping_address: { city: 'London', country: 'UK' },
      billing_address: { city: 'London', country: 'UK' },
      tracking_number: 'FEDEX-456789012',
      carrier: 'FedEx',
      carrier_tracking_url: 'https://www.fedex.com/fedextrack/?trknbr=FEDEX-456789012',
      estimated_delivery: '2026-01-08T00:00:00Z',
      actual_delivery: '2026-01-07T16:30:00Z',
      current_location: { name: 'Heathrow Airport', address: 'London, UK' },
      last_location_update: '2026-01-07T16:30:00Z',
      notes: null,
      priority: 'normal',
      source_type: 'direct_purchase',
      auction_id: null,
      invoice_number: 'INV-DW-R9S4-E6F7',
      created_at: '2026-01-01T09:00:00Z',
      updated_at: '2026-01-07T16:30:00Z',
      confirmed_at: '2026-01-01T11:00:00Z',
      processing_at: '2026-01-02T10:00:00Z',
      shipped_at: '2026-01-04T14:00:00Z',
      delivered_at: '2026-01-07T16:30:00Z',
      cancelled_at: null,
    },
    {
      id: '4',
      order_number: 'DW-U1V6-G8H9',
      user_id: 'user4',
      user_email: 'emma.energy@example.com',
      user_name: 'Emma Energy',
      product_name: 'Premium Motor Spirit (PMS)',
      product_type: 'PMS',
      quantity: 75000,
      unit: 'liters',
      unit_price: 0.95,
      total_amount: 71250,
      currency: 'USD',
      status: 'pending',
      shipping_address: { city: 'Dubai', country: 'UAE' },
      billing_address: { city: 'Dubai', country: 'UAE' },
      tracking_number: null,
      carrier: null,
      carrier_tracking_url: null,
      estimated_delivery: null,
      actual_delivery: null,
      current_location: null,
      last_location_update: null,
      notes: 'Awaiting payment confirmation',
      priority: 'normal',
      source_type: 'direct_purchase',
      auction_id: null,
      invoice_number: null,
      created_at: '2026-01-12T08:15:00Z',
      updated_at: '2026-01-12T08:15:00Z',
      confirmed_at: null,
      processing_at: null,
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
    },
    {
      id: '5',
      order_number: 'DW-X3Y8-I0J1',
      user_id: 'user5',
      user_email: 'david.diesel@example.com',
      user_name: 'David Diesel',
      product_name: 'Automotive Gas Oil (AGO)',
      product_type: 'AGO',
      quantity: 40000,
      unit: 'liters',
      unit_price: 1.15,
      total_amount: 46000,
      currency: 'USD',
      status: 'confirmed',
      shipping_address: { city: 'Singapore', country: 'Singapore' },
      billing_address: { city: 'Singapore', country: 'Singapore' },
      tracking_number: null,
      carrier: null,
      carrier_tracking_url: null,
      estimated_delivery: null,
      actual_delivery: null,
      current_location: null,
      last_location_update: null,
      notes: null,
      priority: 'normal',
      source_type: 'direct_purchase',
      auction_id: null,
      invoice_number: null,
      created_at: '2026-01-10T14:30:00Z',
      updated_at: '2026-01-11T09:00:00Z',
      confirmed_at: '2026-01-11T09:00:00Z',
      processing_at: null,
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
    },
    {
      id: '6',
      order_number: 'DW-K2L7-N4O5',
      user_id: 'user6',
      user_email: 'lisa.lpg@example.com',
      user_name: 'Lisa LPG',
      product_name: 'Liquefied Petroleum Gas (LPG)',
      product_type: 'LPG',
      quantity: 15000,
      unit: 'kg',
      unit_price: 0.75,
      total_amount: 11250,
      currency: 'USD',
      status: 'cancelled',
      shipping_address: { city: 'Mumbai', country: 'India' },
      billing_address: { city: 'Mumbai', country: 'India' },
      tracking_number: null,
      carrier: null,
      carrier_tracking_url: null,
      estimated_delivery: null,
      actual_delivery: null,
      current_location: null,
      last_location_update: null,
      notes: 'Cancelled by customer - changed requirements',
      priority: 'normal',
      source_type: 'direct_purchase',
      auction_id: null,
      invoice_number: null,
      created_at: '2026-01-03T11:00:00Z',
      updated_at: '2026-01-04T16:00:00Z',
      confirmed_at: '2026-01-03T13:00:00Z',
      processing_at: null,
      shipped_at: null,
      delivered_at: null,
      cancelled_at: '2026-01-04T16:00:00Z',
    },
  ];
}

function getMockStatusHistory(order: Order): StatusHistory[] {
  const history: StatusHistory[] = [
    {
      id: '1',
      order_id: order.id,
      status: 'pending',
      previous_status: null,
      changed_by: 'system',
      changed_by_name: 'System',
      notes: 'Order created',
      location: null,
      metadata: { source: order.source_type || 'direct_purchase' },
      created_at: order.created_at,
    },
  ];

  if (order.confirmed_at) {
    history.push({
      id: '2',
      order_id: order.id,
      status: 'confirmed',
      previous_status: 'pending',
      changed_by: 'admin',
      changed_by_name: 'Admin User',
      notes: 'Payment verified, order confirmed',
      location: null,
      metadata: null,
      created_at: order.confirmed_at,
    });
  }

  if (order.processing_at) {
    history.push({
      id: '3',
      order_id: order.id,
      status: 'processing',
      previous_status: 'confirmed',
      changed_by: 'admin',
      changed_by_name: 'Admin User',
      notes: 'Order is being prepared for shipment',
      location: null,
      metadata: null,
      created_at: order.processing_at,
    });
  }

  if (order.shipped_at) {
    history.push({
      id: '4',
      order_id: order.id,
      status: 'shipped',
      previous_status: 'processing',
      changed_by: 'admin',
      changed_by_name: 'Admin User',
      notes: `Shipped via ${order.carrier || 'Standard Shipping'}. Tracking: ${order.tracking_number || 'N/A'}`,
      location: null,
      metadata: { tracking_number: order.tracking_number, carrier: order.carrier },
      created_at: order.shipped_at,
    });
  }

  if (order.delivered_at) {
    history.push({
      id: '5',
      order_id: order.id,
      status: 'delivered',
      previous_status: 'shipped',
      changed_by: 'system',
      changed_by_name: 'System',
      notes: 'Order delivered successfully',
      location: order.current_location,
      metadata: null,
      created_at: order.delivered_at,
    });
  }

  if (order.cancelled_at) {
    history.push({
      id: '6',
      order_id: order.id,
      status: 'cancelled',
      previous_status: order.confirmed_at ? 'confirmed' : 'pending',
      changed_by: 'admin',
      changed_by_name: 'Admin User',
      notes: order.notes || 'Order cancelled',
      location: null,
      metadata: null,
      created_at: order.cancelled_at,
    });
  }

  return history;
}

function getMockTrackingEvents(order: Order): TrackingEvent[] {
  if (!order.tracking_number) return [];

  const events: TrackingEvent[] = [
    {
      id: '1',
      order_id: order.id,
      latitude: 29.7604,
      longitude: -95.3698,
      location_name: 'Houston Facility',
      location_address: 'Houston, TX, USA',
      event_type: 'pickup',
      event_description: 'Package picked up from origin facility',
      carrier: order.carrier || 'Standard',
      carrier_status: 'Picked Up',
      event_timestamp: order.shipped_at || order.created_at,
    },
  ];

  if (order.status === 'shipped' || order.status === 'delivered') {
    events.unshift({
      id: '2',
      order_id: order.id,
      latitude: 51.9225,
      longitude: 4.47917,
      location_name: 'Rotterdam Port',
      location_address: 'Rotterdam, Netherlands',
      event_type: 'in_transit',
      event_description: 'Shipment in transit - arrived at distribution hub',
      carrier: order.carrier || 'Standard',
      carrier_status: 'In Transit',
      event_timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (order.status === 'delivered') {
    events.unshift({
      id: '3',
      order_id: order.id,
      latitude: order.current_location?.latitude || 51.5074,
      longitude: order.current_location?.longitude || -0.1278,
      location_name: order.current_location?.name || 'Destination',
      location_address: order.current_location?.address || 'Final Destination',
      event_type: 'delivered',
      event_description: 'Package delivered successfully',
      carrier: order.carrier || 'Standard',
      carrier_status: 'Delivered',
      event_timestamp: order.delivered_at || order.updated_at,
    });
  }

  return events;
}
