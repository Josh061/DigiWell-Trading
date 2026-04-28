import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  CheckCircle, XCircle, AlertTriangle, Clock, Building2, Package,
  FileText, Send, Loader2, Shield, MapPin, Calendar, DollarSign,
  Truck, Edit3, ArrowRight, Anchor, Globe, CreditCard, Ship,
  Scale, Award, Info
} from 'lucide-react';

interface OrderData {
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
  customer_name: string;
  customer_company: string;
  currency: string;
  notes: string;
  created_at: string;
}

export default function RefineryResponsePortal() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<OrderData | null>(null);
  const [responseRecord, setResponseRecord] = useState<any>(null);
  const [alreadyResponded, setAlreadyResponded] = useState(false);

  const [formData, setFormData] = useState({
    decision: '' as 'approved' | 'rejected' | 'modification_requested' | 'counter_offer' | '',
    responder_name: '',
    responder_email: '',
    responder_notes: '',
    proposed_eta: '',
    modification_details: '',
    // Global logistics fields
    shipping_method: '',
    shipping_cost_estimate: '',
    shipping_currency: 'USD',
    loading_port: '',
    discharge_port: '',
    incoterms: '',
    insurance_included: false,
    customs_clearance_included: false,
    payment_terms: '',
    bank_guarantee_required: false,
    quality_certificate: '',
    inspection_agency: '',
    proposed_quantity: '',
    proposed_unit_price: '',
    proposed_total: '',
    logistics_notes: '',
  });

  useEffect(() => {
    if (token) fetchOrderDetails();
    else { setError('No response token provided. Please use the link from your email.'); setLoading(false); }
  }, [token]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('refinery-response', {
        body: { action: 'get_order', token }
      });
      if (fnError || !data?.success) {
        setError(data?.error || 'Invalid or expired response token.');
        return;
      }
      setResponseRecord(data.response_record);
      setOrder(data.order);
      setAlreadyResponded(data.already_responded || false);
      if (data.already_responded) {
        setSubmitted(true);
      }
    } catch (err: any) {
      setError('Failed to load order details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.decision) return;
    if (!formData.responder_name.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('refinery-response', {
        body: {
          action: 'submit_response',
          token,
          decision: formData.decision,
          responder_name: formData.responder_name,
          responder_email: formData.responder_email,
          responder_notes: formData.responder_notes,
          proposed_eta: formData.proposed_eta,
          modification_details: formData.modification_details,
          shipping_method: formData.shipping_method || undefined,
          shipping_cost_estimate: formData.shipping_cost_estimate ? parseFloat(formData.shipping_cost_estimate) : undefined,
          shipping_currency: formData.shipping_currency,
          loading_port: formData.loading_port || undefined,
          discharge_port: formData.discharge_port || undefined,
          incoterms: formData.incoterms || undefined,
          insurance_included: formData.insurance_included,
          customs_clearance_included: formData.customs_clearance_included,
          payment_terms: formData.payment_terms || undefined,
          bank_guarantee_required: formData.bank_guarantee_required,
          quality_certificate: formData.quality_certificate || undefined,
          inspection_agency: formData.inspection_agency || undefined,
          proposed_quantity: formData.proposed_quantity ? parseFloat(formData.proposed_quantity) : undefined,
          proposed_unit_price: formData.proposed_unit_price ? parseFloat(formData.proposed_unit_price) : undefined,
          proposed_total: formData.proposed_total ? parseFloat(formData.proposed_total) : undefined,
          logistics_notes: formData.logistics_notes || undefined,
        }
      });
      if (fnError || !data?.success) {
        setError(data?.error || 'Failed to submit response.');
        return;
      }
      setSubmitted(true);
    } catch (err: any) {
      setError('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-calculate proposed total
  useEffect(() => {
    if (formData.proposed_quantity && formData.proposed_unit_price) {
      const total = parseFloat(formData.proposed_quantity) * parseFloat(formData.proposed_unit_price);
      if (!isNaN(total)) setFormData(prev => ({ ...prev, proposed_total: total.toFixed(2) }));
    }
  }, [formData.proposed_quantity, formData.proposed_unit_price]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-white text-lg">Loading order details...</p>
          <p className="text-slate-400 text-sm mt-2">Verifying secure access token</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <Card className="bg-slate-800/80 border-red-500/30 max-w-lg w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Access Error</h2>
            <p className="text-slate-400">{error}</p>
            <p className="text-slate-500 text-sm mt-4">If you believe this is an error, please contact commercial@digiwelltrading.com</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const decisionConfig: Record<string, { label: string; color: string; icon: any }> = {
      approved: { label: 'Approved', color: 'text-green-400', icon: CheckCircle },
      rejected: { label: 'Rejected', color: 'text-red-400', icon: XCircle },
      modification_requested: { label: 'Modification Requested', color: 'text-yellow-400', icon: Edit3 },
      counter_offer: { label: 'Counter Offer Submitted', color: 'text-blue-400', icon: Scale },
    };
    const dc = decisionConfig[formData.decision || responseRecord?.status] || decisionConfig.approved;
    const StatusIcon = dc.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <Card className="bg-slate-800/80 border-[#D4AF37]/30 max-w-lg w-full">
          <CardContent className="p-8 text-center">
            <StatusIcon className={`w-16 h-16 ${dc.color} mx-auto mb-4`} />
            <h2 className="text-white text-xl font-bold mb-2">Response Submitted</h2>
            <Badge className={`${dc.color} bg-slate-700/50 text-sm mb-4`}>{dc.label}</Badge>
            <p className="text-slate-400 mb-4">
              Your response has been recorded and the Digiwell commercial team at commercial@digiwelltrading.com has been notified.
            </p>
            {formData.proposed_eta && (
              <div className="bg-slate-700/50 rounded-lg p-3 text-left mb-4">
                <p className="text-slate-400 text-xs uppercase mb-1">Proposed ETA</p>
                <p className="text-white text-sm">{formData.proposed_eta}</p>
              </div>
            )}
            {formData.shipping_method && (
              <div className="bg-slate-700/50 rounded-lg p-3 text-left mb-4">
                <p className="text-slate-400 text-xs uppercase mb-1">Shipping Method</p>
                <p className="text-white text-sm">{formData.shipping_method}</p>
                {formData.shipping_cost_estimate && <p className="text-[#D4AF37] text-sm font-bold mt-1">Est. Cost: ${parseFloat(formData.shipping_cost_estimate).toLocaleString()}</p>}
              </div>
            )}
            <p className="text-slate-500 text-xs mt-4">
              Secure Token: {token?.substring(0, 12)}...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center">
            <Building2 className="w-8 h-8 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Refinery Response Portal</h1>
            <p className="text-slate-400 text-sm">Bulk Order Review & Global Logistics Configuration</p>
          </div>
          <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 ml-auto">
            <Shield className="w-3 h-3 mr-1" />Secure Access
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Order Details - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Package className="w-5 h-5 text-[#D4AF37]" />Order Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order ? (
                <>
                  <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Application ID</span>
                      <span className="text-[#D4AF37] font-mono font-bold">{order.application_id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Product</span>
                      <span className="text-white font-medium">{order.product_name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Category</span>
                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">{order.product_category}</Badge>
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Quantity</span>
                      <span className="text-white font-bold">{Number(order.quantity).toLocaleString()} {order.unit}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Unit Price</span>
                      <span className="text-white">${Number(order.unit_price).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Subtotal</span>
                      <span className="text-white">${Number(order.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="border-t border-slate-600 pt-2 flex justify-between font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-[#D4AF37] text-lg">${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span className="text-slate-400">Delivery:</span>
                      <span className="text-white text-xs">{order.delivery_location || 'TBC'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-3 h-3 text-green-400" />
                      <span className="text-slate-400">Date:</span>
                      <span className="text-white">{order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'TBC'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 className="w-3 h-3 text-purple-400" />
                      <span className="text-slate-400">Customer:</span>
                      <span className="text-white text-xs">{order.customer_name}</span>
                    </div>
                  </div>
                  {order.notes && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <p className="text-yellow-400 text-xs uppercase font-bold mb-1">Notes</p>
                      <p className="text-white text-xs">{order.notes}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <AlertTriangle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Order details not available</p>
                  <p className="text-slate-500 text-xs mt-1">You can still submit your response</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* From Digiwell Notice */}
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-blue-400 font-bold text-sm">From Digiwell Trading</p>
                  <p className="text-slate-300 text-xs mt-1">commercial@digiwelltrading.com</p>
                  <p className="text-slate-400 text-xs mt-2">No Digiwell account required. Your response is sent directly to the commercial team.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Response Form - 3 columns */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="bg-slate-800/80 border-[#D4AF37]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-[#D4AF37]" />Response Form
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Responder Info */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white text-xs">Your Name *</Label>
                  <Input value={formData.responder_name} onChange={e => setFormData({ ...formData, responder_name: e.target.value })}
                    placeholder="e.g., John Doe" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs">Email</Label>
                  <Input type="email" value={formData.responder_email} onChange={e => setFormData({ ...formData, responder_email: e.target.value })}
                    placeholder="your@refinery.com" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>

              {/* Decision Buttons */}
              <div className="space-y-2">
                <Label className="text-white text-xs">Decision *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: 'approved', label: 'Approve', desc: 'Confirm', icon: CheckCircle, color: 'green' },
                    { key: 'rejected', label: 'Reject', desc: 'Decline', icon: XCircle, color: 'red' },
                    { key: 'modification_requested', label: 'Modify', desc: 'Changes', icon: Edit3, color: 'yellow' },
                    { key: 'counter_offer', label: 'Counter', desc: 'New terms', icon: Scale, color: 'blue' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => setFormData({ ...formData, decision: opt.key as any })}
                      className={`p-3 rounded-xl border-2 transition-all text-center ${
                        formData.decision === opt.key
                          ? `border-${opt.color}-500 bg-${opt.color}-500/20`
                          : `border-slate-600 hover:border-${opt.color}-500/50 bg-slate-700/50`
                      }`}
                      style={formData.decision === opt.key ? { borderColor: opt.color === 'green' ? '#22c55e' : opt.color === 'red' ? '#ef4444' : opt.color === 'yellow' ? '#eab308' : '#3b82f6', backgroundColor: opt.color === 'green' ? 'rgba(34,197,94,0.2)' : opt.color === 'red' ? 'rgba(239,68,68,0.2)' : opt.color === 'yellow' ? 'rgba(234,179,8,0.2)' : 'rgba(59,130,246,0.2)' } : {}}
                    >
                      <opt.icon className={`w-6 h-6 mx-auto mb-1 ${formData.decision === opt.key ? (opt.color === 'green' ? 'text-green-400' : opt.color === 'red' ? 'text-red-400' : opt.color === 'yellow' ? 'text-yellow-400' : 'text-blue-400') : 'text-slate-500'}`} />
                      <p className={`font-bold text-xs ${formData.decision === opt.key ? (opt.color === 'green' ? 'text-green-400' : opt.color === 'red' ? 'text-red-400' : opt.color === 'yellow' ? 'text-yellow-400' : 'text-blue-400') : 'text-slate-400'}`}>{opt.label}</p>
                      <p className="text-slate-500 text-[9px]">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Proposed ETA */}
              <div className="space-y-1">
                <Label className="text-white text-xs flex items-center gap-1">
                  <Clock className="w-3 h-3 text-blue-400" />Proposed ETA / Delivery Timeline
                </Label>
                <Input value={formData.proposed_eta} onChange={e => setFormData({ ...formData, proposed_eta: e.target.value })}
                  placeholder="e.g., 14-21 business days from approval" className="bg-slate-700 border-slate-600 text-white text-sm" />
              </div>

              {/* Counter Offer / Modification Details */}
              {(formData.decision === 'counter_offer' || formData.decision === 'modification_requested') && (
                <div className={`border rounded-xl p-4 space-y-3 ${formData.decision === 'counter_offer' ? 'bg-blue-500/10 border-blue-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                  <h4 className={`font-bold text-sm flex items-center gap-2 ${formData.decision === 'counter_offer' ? 'text-blue-400' : 'text-yellow-400'}`}>
                    {formData.decision === 'counter_offer' ? <Scale className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                    {formData.decision === 'counter_offer' ? 'Counter Offer Details' : 'Modification Details'}
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-white text-[10px]">Proposed Quantity</Label>
                      <Input value={formData.proposed_quantity} onChange={e => setFormData({ ...formData, proposed_quantity: e.target.value })}
                        placeholder="e.g., 200000" className="bg-slate-700 border-slate-600 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white text-[10px]">Unit Price ($/unit)</Label>
                      <Input value={formData.proposed_unit_price} onChange={e => setFormData({ ...formData, proposed_unit_price: e.target.value })}
                        placeholder="e.g., 85.00" className="bg-slate-700 border-slate-600 text-white text-sm" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-white text-[10px]">Total Value ($)</Label>
                      <Input value={formData.proposed_total} onChange={e => setFormData({ ...formData, proposed_total: e.target.value })}
                        placeholder="Auto-calculated" className="bg-slate-700 border-slate-600 text-white text-sm" readOnly />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-white text-[10px]">Reason / Details</Label>
                    <Textarea value={formData.modification_details} onChange={e => setFormData({ ...formData, modification_details: e.target.value })}
                      placeholder="Explain the reason for modifications or counter offer terms..." className="bg-slate-700 border-slate-600 text-white text-sm" rows={2} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Global Logistics & Shipping */}
          <Card className="bg-slate-800/80 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Ship className="w-5 h-5 text-[#00D4FF]" />Global Logistics & Shipping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white text-xs">Shipping Method</Label>
                  <Select value={formData.shipping_method} onValueChange={v => setFormData({ ...formData, shipping_method: v })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sea">Sea Freight (Tanker/Bulk)</SelectItem>
                      <SelectItem value="pipeline">Pipeline Transport</SelectItem>
                      <SelectItem value="rail">Rail Transport</SelectItem>
                      <SelectItem value="road">Road Tanker/Truck</SelectItem>
                      <SelectItem value="air">Air Freight (Premium)</SelectItem>
                      <SelectItem value="multimodal">Multimodal (Sea + Road)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs">Incoterms</Label>
                  <Select value={formData.incoterms} onValueChange={v => setFormData({ ...formData, incoterms: v })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FOB">FOB (Free on Board)</SelectItem>
                      <SelectItem value="CIF">CIF (Cost, Insurance, Freight)</SelectItem>
                      <SelectItem value="CFR">CFR (Cost and Freight)</SelectItem>
                      <SelectItem value="EXW">EXW (Ex Works)</SelectItem>
                      <SelectItem value="DDP">DDP (Delivered Duty Paid)</SelectItem>
                      <SelectItem value="DAP">DAP (Delivered at Place)</SelectItem>
                      <SelectItem value="FAS">FAS (Free Alongside Ship)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white text-xs">Loading Port</Label>
                  <Input value={formData.loading_port} onChange={e => setFormData({ ...formData, loading_port: e.target.value })}
                    placeholder="e.g., Lekki Deep Sea Port" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs">Discharge Port</Label>
                  <Input value={formData.discharge_port} onChange={e => setFormData({ ...formData, discharge_port: e.target.value })}
                    placeholder="e.g., Rotterdam Port" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white text-xs">Est. Shipping Cost ($)</Label>
                  <Input type="number" value={formData.shipping_cost_estimate} onChange={e => setFormData({ ...formData, shipping_cost_estimate: e.target.value })}
                    placeholder="e.g., 150000" className="bg-slate-700 border-slate-600 text-white text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs">Payment Terms</Label>
                  <Select value={formData.payment_terms} onValueChange={v => setFormData({ ...formData, payment_terms: v })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                      <SelectValue placeholder="Select terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LC at Sight">LC at Sight</SelectItem>
                      <SelectItem value="LC 30 Days">LC 30 Days</SelectItem>
                      <SelectItem value="LC 60 Days">LC 60 Days</SelectItem>
                      <SelectItem value="LC 90 Days">LC 90 Days</SelectItem>
                      <SelectItem value="TT Advance">TT Advance</SelectItem>
                      <SelectItem value="TT 30 Days">TT 30 Days</SelectItem>
                      <SelectItem value="CAD">CAD (Cash Against Documents)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-white text-xs">Quality Certificate</Label>
                  <Select value={formData.quality_certificate} onValueChange={v => setFormData({ ...formData, quality_certificate: v })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                      <SelectValue placeholder="Select certificate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Certificate of Origin">Certificate of Origin</SelectItem>
                      <SelectItem value="Certificate of Quality">Certificate of Quality</SelectItem>
                      <SelectItem value="Certificate of Quantity">Certificate of Quantity</SelectItem>
                      <SelectItem value="Bill of Lading">Bill of Lading</SelectItem>
                      <SelectItem value="Insurance Certificate">Insurance Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-white text-xs">Inspection Agency</Label>
                  <Select value={formData.inspection_agency} onValueChange={v => setFormData({ ...formData, inspection_agency: v })}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white text-sm">
                      <SelectValue placeholder="Select agency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SGS">SGS</SelectItem>
                      <SelectItem value="Bureau Veritas">Bureau Veritas</SelectItem>
                      <SelectItem value="Intertek">Intertek</SelectItem>
                      <SelectItem value="Saybolt">Saybolt</SelectItem>
                      <SelectItem value="Caleb Brett">Caleb Brett</SelectItem>
                      <SelectItem value="AmSpec">AmSpec</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Toggle Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                  <div>
                    <p className="text-white text-xs font-medium">Insurance Included</p>
                    <p className="text-slate-400 text-[10px]">Marine/cargo insurance</p>
                  </div>
                  <Switch checked={formData.insurance_included} onCheckedChange={v => setFormData({ ...formData, insurance_included: v })} />
                </div>
                <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                  <div>
                    <p className="text-white text-xs font-medium">Customs Clearance</p>
                    <p className="text-slate-400 text-[10px]">Import/export handling</p>
                  </div>
                  <Switch checked={formData.customs_clearance_included} onCheckedChange={v => setFormData({ ...formData, customs_clearance_included: v })} />
                </div>
                <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3 col-span-2">
                  <div>
                    <p className="text-white text-xs font-medium">Bank Guarantee Required</p>
                    <p className="text-slate-400 text-[10px]">Performance/payment guarantee from buyer's bank</p>
                  </div>
                  <Switch checked={formData.bank_guarantee_required} onCheckedChange={v => setFormData({ ...formData, bank_guarantee_required: v })} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-white text-xs">Logistics Notes</Label>
                <Textarea value={formData.logistics_notes} onChange={e => setFormData({ ...formData, logistics_notes: e.target.value })}
                  placeholder="Additional shipping/logistics details, vessel nominations, laycan dates..." className="bg-slate-700 border-slate-600 text-white text-sm" rows={2} />
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes & Submit */}
          <Card className="bg-slate-800/80 border-[#D4AF37]/30">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-1">
                <Label className="text-white text-xs">Additional Notes</Label>
                <Textarea value={formData.responder_notes} onChange={e => setFormData({ ...formData, responder_notes: e.target.value })}
                  placeholder="Any additional comments, conditions, or requirements..." className="bg-slate-700 border-slate-600 text-white text-sm" rows={3} />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <Button onClick={handleSubmit}
                disabled={!formData.decision || !formData.responder_name.trim() || submitting}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-6 text-lg disabled:opacity-50">
                {submitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" />Submitting Response...</>
                ) : (
                  <><Send className="w-5 h-5 mr-2" />Submit Response</>
                )}
              </Button>

              <p className="text-slate-500 text-[10px] text-center">
                Response sent to Digiwell Trading (commercial@digiwelltrading.com). No account required.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto mt-8 text-center">
        <p className="text-slate-500 text-xs">
          Digiwell Trading LLC - Refinery Response Portal | Token: {token?.substring(0, 12)}...
        </p>
      </div>
    </div>
  );
}
