import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  TrendingUp, TrendingDown, Scale, DollarSign, AlertTriangle,
  CheckCircle, XCircle, Clock, Loader2, ArrowUpRight, ArrowDownLeft,
  FileText, RefreshCw, Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PriceAdjustment {
  id: string;
  product_name: string;
  product_type: string;
  original_price: number;
  settlement_price: number;
  price_difference_pct: number;
  adjustment_type: 'deduction' | 'addition';
  amount: number;
  currency: string;
  quantity: number;
  unit: string;
  status: 'pending' | 'acknowledged' | 'disputed' | 'resolved' | 'applied';
  dispute_reason: string | null;
  market_source: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function WalletPriceAdjustments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<PriceAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeId, setDisputeId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdjustments();
  }, [user]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallet_price_adjustments')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) setAdjustments(data);
      if (error) console.error('Error fetching adjustments:', error);
    } catch (e) {
      console.error('Failed to fetch adjustments:', e);
    }
    setLoading(false);
  };

  const handleAcknowledge = async (id: string) => {
    setActionLoading(id);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-price-adjustment', {
        body: { action: 'acknowledge', adjustmentId: id, userId: user?.id }
      });

      if (error) throw error;

      // Update local state
      setAdjustments(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'acknowledged' as const } : a
      ));

      toast({ title: 'Adjustment Acknowledged', description: 'The market price adjustment has been acknowledged.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to acknowledge adjustment.', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  const handleDispute = async (id: string) => {
    if (!disputeReason.trim()) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for the dispute.', variant: 'destructive' });
      return;
    }
    setActionLoading(id);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-price-adjustment', {
        body: { action: 'dispute', adjustmentId: id, userId: user?.id, disputeReason: disputeReason.trim() }
      });

      if (error) throw error;

      setAdjustments(prev => prev.map(a =>
        a.id === id ? { ...a, status: 'disputed' as const, dispute_reason: disputeReason.trim() } : a
      ));

      setDisputeId(null);
      setDisputeReason('');
      toast({ title: 'Dispute Filed', description: 'Your dispute has been submitted for review.' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to file dispute.', variant: 'destructive' });
    }
    setActionLoading(null);
  };

  // Summary calculations
  const totalDeductions = adjustments
    .filter(a => a.adjustment_type === 'deduction')
    .reduce((sum, a) => sum + Number(a.amount), 0);

  const totalAdditions = adjustments
    .filter(a => a.adjustment_type === 'addition')
    .reduce((sum, a) => sum + Number(a.amount), 0);

  const netAdjustment = totalAdditions - totalDeductions;

  const pendingCount = adjustments.filter(a => a.status === 'pending').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'acknowledged':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Acknowledged</Badge>;
      case 'disputed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Disputed</Badge>;
      case 'resolved':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case 'applied':
        return <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30"><CheckCircle className="w-3 h-3 mr-1" />Applied</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-xs font-medium mb-1">Total Deductions</p>
                <p className="text-2xl font-bold text-red-400">-${totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-xs font-medium mb-1">Total Additions</p>
                <p className="text-2xl font-bold text-green-400">+${totalAdditions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`${netAdjustment >= 0 ? 'bg-[#D4AF37]/10 border-[#D4AF37]/20' : 'bg-orange-500/10 border-orange-500/20'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-xs font-medium mb-1">Net Adjustment</p>
                <p className={`text-2xl font-bold ${netAdjustment >= 0 ? 'text-[#D4AF37]' : 'text-orange-400'}`}>
                  {netAdjustment >= 0 ? '+' : '-'}${Math.abs(netAdjustment).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className={`w-10 h-10 ${netAdjustment >= 0 ? 'bg-[#D4AF37]/20' : 'bg-orange-500/20'} rounded-lg flex items-center justify-center`}>
                <Scale className={`w-5 h-5 ${netAdjustment >= 0 ? 'text-[#D4AF37]' : 'text-orange-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-amber-400 text-xs font-medium mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
              </div>
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Price Clause Info */}
      <Card className="bg-blue-500/10 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-400 font-semibold text-sm mb-1">Market Price Adjustment Clause (Section 8)</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Per the Digiwell Trading LLC Terms of Service, wallet balances are subject to market price adjustments 
                for petroleum products and real-world assets. If the settlement price at delivery differs from the 
                original transaction price, a proportional deduction or addition will be applied to your wallet. 
                You have 7 days to acknowledge or dispute any adjustment.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button onClick={fetchAdjustments} variant="outline" size="sm" className="border-white/20 text-slate-300 hover:text-white">
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
        </Button>
      </div>

      {/* Adjustments List */}
      {adjustments.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Scale className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No Price Adjustments</h3>
            <p className="text-slate-400 text-sm">No market price adjustments have been applied to your wallet yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {adjustments.map((adj) => (
            <Card key={adj.id} className={`bg-white/5 border-white/10 hover:border-white/20 transition-all ${
              adj.status === 'pending' ? 'border-l-2 border-l-amber-500' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold truncate">{adj.product_name}</h4>
                      {getStatusBadge(adj.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {adj.product_type?.charAt(0).toUpperCase() + adj.product_type?.slice(1)}
                      </span>
                      <span>Qty: {Number(adj.quantity).toLocaleString()} {adj.unit}</span>
                      {adj.market_source && <span>Source: {adj.market_source}</span>}
                      <span>{new Date(adj.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Price Details */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Original</p>
                      <p className="text-white font-medium">${Number(adj.original_price).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Settlement</p>
                      <p className="text-white font-medium">${Number(adj.settlement_price).toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Diff %</p>
                      <p className={`font-medium ${Number(adj.price_difference_pct) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {Number(adj.price_difference_pct) >= 0 ? '+' : ''}{Number(adj.price_difference_pct).toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-center min-w-[100px]">
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider">Adjustment</p>
                      <div className={`flex items-center justify-center gap-1 font-bold text-lg ${
                        adj.adjustment_type === 'addition' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {adj.adjustment_type === 'addition' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {adj.adjustment_type === 'addition' ? '+' : '-'}${Number(adj.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  {adj.status === 'pending' && (
                    <div className="flex items-center gap-2 lg:ml-4">
                      <Button
                        size="sm"
                        onClick={() => handleAcknowledge(adj.id)}
                        disabled={actionLoading === adj.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {actionLoading === adj.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 mr-1" />}
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDisputeId(disputeId === adj.id ? null : adj.id)}
                        disabled={actionLoading === adj.id}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />Dispute
                      </Button>
                    </div>
                  )}
                </div>

                {/* Dispute Reason Input */}
                {disputeId === adj.id && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-xs font-medium mb-2">Provide a reason for your dispute:</p>
                    <Textarea
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Explain why you believe this adjustment is incorrect..."
                      className="bg-white/5 border-white/20 text-white text-sm mb-2"
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleDispute(adj.id)}
                        disabled={actionLoading === adj.id || !disputeReason.trim()}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        {actionLoading === adj.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                        Submit Dispute
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setDisputeId(null); setDisputeReason(''); }}
                        className="text-slate-400"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show dispute reason if already disputed */}
                {adj.status === 'disputed' && adj.dispute_reason && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-red-400 text-xs font-medium mb-1">Dispute Reason:</p>
                    <p className="text-slate-300 text-sm">{adj.dispute_reason}</p>
                  </div>
                )}

                {/* Notes */}
                {adj.notes && (
                  <div className="mt-2 text-xs text-slate-500 italic">{adj.notes}</div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
