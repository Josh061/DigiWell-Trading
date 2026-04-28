import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Package, FileText, Send, CheckCircle, Clock, XCircle, AlertCircle,
  Search, RefreshCw, Loader2, MapPin, Calendar, DollarSign, Building2,
  Filter, Download, Eye, ChevronDown, ChevronUp, Mail, BarChart3,
  Timer, AlertTriangle, Edit3, TrendingUp, Link2
} from 'lucide-react';

interface BulkOrder {
  id: string;
  application_id: string;
  product_name: string;
  product_code: string;
  product_category: string;
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  delivery_location: string;
  delivery_date: string;
  delivery_coordinates: any;
  customer_name: string;
  customer_email: string;
  customer_company: string;
  payment_method: string;
  currency: string;
  is_rwa: boolean;
  pdf_sent: boolean;
  pdf_sent_at: string;
  request_ref: string;
  dangote_status: string;
  dangote_response_notes: string;
  dangote_response_date: string;
  admin_notes: string;
  notes: string;
  created_at: string;
}

interface ResponseAnalytics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  modifications: number;
  escalated: number;
  avg_response_time_hours: number;
  responses: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending_review: { label: 'Pending Review', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  dangote_approved: { label: 'Refinery Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  modification_requested: { label: 'Modification Req.', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: Edit3 },
};

export default function BulkOrderManagement() {
  const [orders, setOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState<Record<string, string>>({});
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, totalVolume: 0 });
  const [activeView, setActiveView] = useState<'orders' | 'analytics'>('orders');
  const [analytics, setAnalytics] = useState<ResponseAnalytics | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [escalating, setEscalating] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchAnalytics();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bulk_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const orderData = data || [];
      setOrders(orderData);
      setStats({
        total: orderData.length,
        pending: orderData.filter(o => o.dangote_status === 'pending_review').length,
        approved: orderData.filter(o => o.dangote_status === 'dangote_approved').length,
        rejected: orderData.filter(o => o.dangote_status === 'rejected').length,
        totalVolume: orderData.reduce((sum, o) => sum + (o.quantity || 0), 0),
      });
    } catch (err) {
      console.error('Failed to fetch bulk orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const { data, error } = await supabase.functions.invoke('refinery-response', {
        body: { action: 'get_analytics' }
      });
      if (data?.success) {
        setAnalytics(data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const triggerEscalation = async () => {
    setEscalating(true);
    try {
      const { data } = await supabase.functions.invoke('refinery-response', {
        body: { action: 'check_escalations' }
      });
      if (data?.success) {
        alert(`Escalation check complete: ${data.overdue_count} overdue, ${data.escalated} escalated`);
      }
    } catch (err) {
      console.error('Escalation failed:', err);
    } finally {
      setEscalating(false);
    }
  };

  const generateResponseToken = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const { data } = await supabase.functions.invoke('refinery-response', {
        body: { action: 'create_token', bulk_order_id: orderId }
      });
      if (data?.success) {
        const portalUrl = `${window.location.origin}/refinery-response?token=${data.token}`;
        await navigator.clipboard.writeText(portalUrl);
        alert(`Response portal link copied to clipboard!\n\n${portalUrl}`);
      }
    } catch (err) {
      console.error('Failed to generate token:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const updateDangoteStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const updateData: any = {
        dangote_status: newStatus,
        dangote_response_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      if (editNotes[orderId]) {
        updateData.dangote_response_notes = editNotes[orderId];
      }
      const { error } = await supabase
        .from('bulk_orders')
        .update(updateData)
        .eq('id', orderId);
      if (error) throw error;

      const order = orders.find(o => o.id === orderId);
      if (order) {
        supabase.functions.invoke('sendgrid-notifications', {
          body: {
            type: 'bulk_order_status_update',
            to: 'commercial@digiwelltrading.com',
            data: {
              applicationId: order.application_id,
              productName: order.product_name,
              quantity: order.quantity,
              unit: order.unit,
              newStatus: STATUS_CONFIG[newStatus]?.label || newStatus,
              notes: editNotes[orderId] || '',
              deliveryLocation: order.delivery_location,
            }
          }
        }).catch(err => console.warn('Status notification failed:', err));
      }
      await fetchOrders();
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const resendPdf = async (order: BulkOrder) => {
    setUpdatingId(order.id);
    try {
      await supabase.functions.invoke('bulk-order-request', {
        body: {
          application_id: order.application_id,
          product_name: order.product_name,
          product_code: order.product_code,
          product_category: order.product_category,
          quantity: order.quantity,
          unit: order.unit,
          unit_price: order.unit_price,
          subtotal: order.subtotal,
          service_fee: order.service_fee,
          total_amount: order.total_amount,
          delivery_location: order.delivery_location,
          delivery_date: order.delivery_date,
          delivery_coordinates: order.delivery_coordinates,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_company: order.customer_company,
          payment_method: order.payment_method,
          notes: order.notes,
          currency: order.currency,
          is_rwa: order.is_rwa,
        }
      });
      await fetchOrders();
    } catch (err) {
      console.error('Failed to resend PDF:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.application_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.delivery_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.dangote_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Building2 className="w-7 h-7 text-[#D4AF37]" />
            Bulk Order Management
          </h2>
          <p className="text-slate-400 text-sm mt-1">Orders above 250,000 litres/barrels - Refinery response tracking & analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveView(activeView === 'orders' ? 'analytics' : 'orders')}
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-700"
            size="sm"
          >
            {activeView === 'orders' ? <><BarChart3 className="w-4 h-4 mr-1" />Analytics</> : <><Package className="w-4 h-4 mr-1" />Orders</>}
          </Button>
          <Button onClick={triggerEscalation} disabled={escalating} variant="outline" className="border-orange-500/50 text-orange-400 hover:bg-orange-500/20" size="sm">
            {escalating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <AlertTriangle className="w-4 h-4 mr-1" />}
            Escalate Overdue
          </Button>
          <Button onClick={() => { fetchOrders(); fetchAnalytics(); }} variant="outline" className="border-slate-600 text-white hover:bg-slate-700" size="sm">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-xs">Total Orders</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending}</div>
            <div className="text-yellow-400/70 text-xs">Pending Review</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
            <div className="text-green-400/70 text-xs">Refinery Approved</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
            <div className="text-red-400/70 text-xs">Rejected</div>
          </CardContent>
        </Card>
        <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#D4AF37]">{(stats.totalVolume / 1000000).toFixed(1)}M</div>
            <div className="text-[#D4AF37]/70 text-xs">Total Volume</div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics View */}
      {activeView === 'analytics' && (
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#D4AF37]" />Response Time Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAnalytics ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37] mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Loading analytics...</p>
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-white">{analytics.total}</div>
                      <div className="text-slate-400 text-xs">Total Responses</div>
                    </div>
                    <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-yellow-400">{analytics.pending}</div>
                      <div className="text-yellow-400/70 text-xs">Pending</div>
                    </div>
                    <div className="bg-green-500/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-green-400">{analytics.approved}</div>
                      <div className="text-green-400/70 text-xs">Approved</div>
                    </div>
                    <div className="bg-red-500/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-red-400">{analytics.rejected}</div>
                      <div className="text-red-400/70 text-xs">Rejected</div>
                    </div>
                    <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-orange-400">{analytics.modifications}</div>
                      <div className="text-orange-400/70 text-xs">Modifications</div>
                    </div>
                    <div className="bg-purple-500/10 rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-purple-400">{analytics.escalated}</div>
                      <div className="text-purple-400/70 text-xs">Auto-Escalated</div>
                    </div>
                  </div>

                  {/* Average Response Time */}
                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-6 text-center">
                    <Timer className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                    <div className="text-3xl font-bold text-[#D4AF37]">{analytics.avg_response_time_hours}h</div>
                    <div className="text-slate-400 text-sm">Average Response Time</div>
                    <div className="text-slate-500 text-xs mt-1">
                      {analytics.avg_response_time_hours < 24 ? 'Excellent' : analytics.avg_response_time_hours < 48 ? 'Good' : 'Needs Improvement'}
                    </div>
                  </div>

                  {/* Response History */}
                  {analytics.responses.length > 0 && (
                    <div>
                      <h4 className="text-white font-bold text-sm mb-3">Recent Responses</h4>
                      <div className="overflow-x-auto max-h-[300px]">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-700/50 sticky top-0">
                            <tr>
                              <th className="text-left text-slate-400 p-2">Token</th>
                              <th className="text-left text-slate-400 p-2">Status</th>
                              <th className="text-left text-slate-400 p-2">Responder</th>
                              <th className="text-left text-slate-400 p-2">ETA</th>
                              <th className="text-left text-slate-400 p-2">Escalated</th>
                              <th className="text-left text-slate-400 p-2">Created</th>
                              <th className="text-left text-slate-400 p-2">Responded</th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.responses.slice(0, 20).map((r: any) => (
                              <tr key={r.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                                <td className="p-2 text-[#D4AF37] font-mono text-xs">{r.response_token?.substring(0, 15)}...</td>
                                <td className="p-2">
                                  <Badge className={`${STATUS_CONFIG[r.response_status]?.color || 'bg-slate-500/20 text-slate-400'} text-[10px]`}>
                                    {STATUS_CONFIG[r.response_status]?.label || r.response_status}
                                  </Badge>
                                </td>
                                <td className="p-2 text-white text-xs">{r.responder_name || '-'}</td>
                                <td className="p-2 text-slate-300 text-xs">{r.proposed_eta || '-'}</td>
                                <td className="p-2">
                                  {r.auto_escalated ? (
                                    <Badge className="bg-orange-500/20 text-orange-400 text-[10px]">
                                      <AlertTriangle className="w-3 h-3 mr-1" />{r.escalation_count}x
                                    </Badge>
                                  ) : <span className="text-slate-500 text-xs">No</span>}
                                </td>
                                <td className="p-2 text-slate-400 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                                <td className="p-2 text-slate-400 text-xs">{r.response_date ? new Date(r.response_date).toLocaleDateString() : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <p className="text-slate-400">No analytics data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Orders View */}
      {activeView === 'orders' && (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by Application ID, product, location, customer..."
                className="pl-10 bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48 bg-slate-800 border-slate-600 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending_review">Pending Review</SelectItem>
                <SelectItem value="dangote_approved">Refinery Approved</SelectItem>
                <SelectItem value="modification_requested">Modification Req.</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders Table */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
              <p className="text-slate-400">Loading bulk orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                <h3 className="text-white font-bold text-lg mb-2">No Bulk Orders Found</h3>
                <p className="text-slate-400 text-sm">Orders above 250,000 litres/barrels will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map(order => {
                const statusConf = STATUS_CONFIG[order.dangote_status] || STATUS_CONFIG.pending_review;
                const StatusIcon = statusConf.icon;
                const isExpanded = expandedOrder === order.id;

                return (
                  <Card key={order.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                    <CardContent className="p-0">
                      <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedOrder(isExpanded ? null : order.id)}>
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-7 gap-3 items-center">
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase">App ID</div>
                            <div className="text-[#D4AF37] font-mono text-sm font-bold">{order.application_id}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase">Product</div>
                            <div className="text-white text-sm font-medium">{order.product_name}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase">Quantity</div>
                            <div className="text-white text-sm font-bold">{Number(order.quantity || 0).toLocaleString()} {order.unit}</div>
                          </div>
                          <div className="hidden md:block">
                            <div className="text-slate-400 text-[10px] uppercase">Delivery</div>
                            <div className="text-white text-sm truncate max-w-[150px]">{order.delivery_location || 'TBC'}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase">Total</div>
                            <div className="text-[#D4AF37] text-sm font-bold">${Number(order.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase">PDF Sent</div>
                            {order.pdf_sent ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                                <CheckCircle className="w-3 h-3 mr-1" />Sent
                              </Badge>
                            ) : (
                              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px]">
                                <Clock className="w-3 h-3 mr-1" />Pending
                              </Badge>
                            )}
                          </div>
                          <div>
                            <div className="text-slate-400 text-[10px] uppercase">Refinery Status</div>
                            <Badge className={`${statusConf.color} border text-[10px]`}>
                              <StatusIcon className="w-3 h-3 mr-1" />{statusConf.label}
                            </Badge>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>

                      {isExpanded && (
                        <div className="border-t border-slate-700 p-4 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h4 className="text-white font-bold text-sm flex items-center gap-2"><Package className="w-4 h-4 text-[#D4AF37]" />Order Details</h4>
                              <div className="bg-slate-700/50 rounded-lg p-3 space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">Product:</span><span className="text-white">{order.product_name}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Code:</span><span className="text-white">{order.product_code}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Category:</span><span className="text-white">{order.product_category}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Quantity:</span><span className="text-white font-bold">{Number(order.quantity).toLocaleString()} {order.unit}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Unit Price:</span><span className="text-white">${Number(order.unit_price).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Total:</span><span className="text-[#D4AF37] font-bold">${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-white font-bold text-sm flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" />Delivery Info</h4>
                              <div className="bg-slate-700/50 rounded-lg p-3 space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">Location:</span><span className="text-white text-right max-w-[180px] truncate">{order.delivery_location || 'TBC'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Date:</span><span className="text-white">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'TBC'}</span></div>
                                {order.delivery_coordinates && (
                                  <div className="flex justify-between"><span className="text-slate-400">GPS:</span><span className="text-white text-xs">{order.delivery_coordinates.lat}, {order.delivery_coordinates.lng}</span></div>
                                )}
                                <div className="flex justify-between"><span className="text-slate-400">Request Ref:</span><span className="text-[#D4AF37] font-mono text-xs">{order.request_ref || 'N/A'}</span></div>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-white font-bold text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-red-400" />Refinery Response</h4>
                              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-slate-400">Status:</span>
                                  <Badge className={`${statusConf.color} border text-[10px]`}>{statusConf.label}</Badge>
                                </div>
                                {order.dangote_response_date && (
                                  <div className="flex justify-between text-sm"><span className="text-slate-400">Response Date:</span><span className="text-white text-xs">{new Date(order.dangote_response_date).toLocaleString()}</span></div>
                                )}
                                {order.dangote_response_notes && (
                                  <div className="text-sm">
                                    <span className="text-slate-400">Notes:</span>
                                    <p className="text-white text-xs mt-1 bg-slate-600/50 rounded p-2">{order.dangote_response_notes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Admin Actions */}
                          <div className="border-t border-slate-700 pt-4">
                            <h4 className="text-white font-bold text-sm mb-3">Admin Actions</h4>
                            <div className="flex flex-col md:flex-row gap-3">
                              <Textarea
                                value={editNotes[order.id] || ''}
                                onChange={e => setEditNotes({ ...editNotes, [order.id]: e.target.value })}
                                placeholder="Add response notes..."
                                className="bg-slate-700 border-slate-600 text-white text-sm flex-1"
                                rows={2}
                              />
                              <div className="flex flex-col gap-2">
                                <Button size="sm" onClick={() => updateDangoteStatus(order.id, 'dangote_approved')} disabled={updatingId === order.id}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs">
                                  {updatingId === order.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                                  Refinery Approved
                                </Button>
                                <Button size="sm" onClick={() => updateDangoteStatus(order.id, 'pending_review')} disabled={updatingId === order.id}
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs">
                                  <Clock className="w-3 h-3 mr-1" />Pending Review
                                </Button>
                                <Button size="sm" onClick={() => updateDangoteStatus(order.id, 'rejected')} disabled={updatingId === order.id}
                                  className="bg-red-600 hover:bg-red-700 text-white text-xs">
                                  <XCircle className="w-3 h-3 mr-1" />Rejected
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => generateResponseToken(order.id)} disabled={updatingId === order.id}
                                  className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/20 text-xs">
                                  <Link2 className="w-3 h-3 mr-1" />Generate Portal Link
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => resendPdf(order)} disabled={updatingId === order.id}
                                  className="border-slate-600 text-white hover:bg-slate-700 text-xs">
                                  <Send className="w-3 h-3 mr-1" />Resend PDF
                                </Button>
                              </div>
                            </div>
                            <p className="text-slate-500 text-[10px] mt-2 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              Status notifications sent to commercial@digiwelltrading.com | Refinery portal: groupcommercialops@dangote.com
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
