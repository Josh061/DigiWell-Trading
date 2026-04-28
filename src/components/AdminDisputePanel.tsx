import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Scale, CheckCircle, XCircle, Clock, Loader2, AlertTriangle,
  TrendingUp, TrendingDown, FileText, Search, Filter, Eye,
  DollarSign, MessageCircle, ArrowRight, Shield, User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Adjustment {
  id: string;
  user_id: string;
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
  status: string;
  dispute_reason: string | null;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  market_source: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TimelineEvent {
  id: string;
  adjustment_id: string;
  action: string;
  actor_type: string;
  actor_id: string | null;
  actor_name: string | null;
  description: string;
  metadata: any;
  created_at: string;
}

export default function AdminDisputePanel() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('disputed');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAdj, setSelectedAdj] = useState<Adjustment | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [justification, setJustification] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => { fetchAdjustments(); }, [statusFilter]);

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      let query = supabase.from('wallet_price_adjustments').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data } = await query;
      setAdjustments(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchTimeline = async (adjustmentId: string) => {
    setTimelineLoading(true);
    try {
      const { data } = await supabase.functions.invoke('wallet-price-adjustment', {
        body: { action: 'get_dispute_timeline', adjustmentId }
      });
      setTimeline(data?.timeline || []);
    } catch (e) { console.error(e); }
    setTimelineLoading(false);
  };

  const openDetail = (adj: Adjustment) => {
    setSelectedAdj(adj);
    setJustification('');
    setCreditAmount(adj.amount.toString());
    fetchTimeline(adj.id);
  };

  const handleResolve = async (resolution: 'approved' | 'rejected') => {
    if (!selectedAdj || !justification.trim()) {
      toast({ title: 'Justification Required', description: 'Please provide a written justification.', variant: 'destructive' });
      return;
    }
    setResolving(true);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-price-adjustment', {
        body: {
          action: 'admin_resolve_dispute',
          adjustmentId: selectedAdj.id,
          adminId: user?.id,
          adminName: 'Admin',
          resolution,
          justification: justification.trim(),
          creditAmount: resolution === 'approved' ? parseFloat(creditAmount) || selectedAdj.amount : 0
        }
      });
      if (error) throw error;
      toast({
        title: `Dispute ${resolution === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `The dispute has been ${resolution}. ${resolution === 'approved' ? 'Wallet credited.' : ''}`
      });
      setSelectedAdj(null);
      fetchAdjustments();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to resolve dispute', variant: 'destructive' });
    }
    setResolving(false);
  };

  const filtered = adjustments.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.product_name?.toLowerCase().includes(q) || a.user_id?.toLowerCase().includes(q) || a.dispute_reason?.toLowerCase().includes(q);
  });

  const disputedCount = adjustments.filter(a => a.status === 'disputed').length;
  const resolvedCount = adjustments.filter(a => a.status === 'resolved' || a.status === 'rejected').length;
  const totalAmount = adjustments.reduce((s, a) => s + Number(a.amount), 0);

  const getStatusBadge = (status: string) => {
    const map: Record<string, { cls: string; icon: any; label: string }> = {
      pending: { cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock, label: 'Pending' },
      acknowledged: { cls: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Acknowledged' },
      disputed: { cls: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle, label: 'Disputed' },
      resolved: { cls: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle, label: 'Resolved' },
      rejected: { cls: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: XCircle, label: 'Rejected' },
      applied: { cls: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: CheckCircle, label: 'Applied' },
    };
    const s = map[status] || { cls: 'bg-slate-500/20 text-slate-400', icon: Clock, label: status };
    const Icon = s.icon;
    return <Badge className={s.cls}><Icon className="w-3 h-3 mr-1" />{s.label}</Badge>;
  };

  if (!hasRole('admin')) {
    return (
      <Card className="bg-white/10 border-white/20">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold">Admin Access Required</h3>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-[#D4AF37]" />Dispute Resolution Panel
          </h2>
          <p className="text-slate-400 text-sm">Review and resolve wallet price adjustment disputes</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-400" />
            <div><div className="text-red-400 text-xs">Active Disputes</div><div className="text-2xl font-bold text-red-400">{disputedCount}</div></div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-blue-400" />
            <div><div className="text-blue-400 text-xs">Resolved</div><div className="text-2xl font-bold text-blue-400">{resolvedCount}</div></div>
          </CardContent>
        </Card>
        <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/20">
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-[#D4AF37]" />
            <div><div className="text-slate-400 text-xs">Total Value</div><div className="text-2xl font-bold text-[#D4AF37]">${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div></div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 flex items-center gap-3">
            <FileText className="w-8 h-8 text-slate-400" />
            <div><div className="text-slate-400 text-xs">Total Records</div><div className="text-2xl font-bold text-white">{adjustments.length}</div></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by product, user ID, or reason..." className="pl-10 bg-white/5 border-white/20 text-white" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] bg-white/5 border-white/20 text-white">
            <Filter className="w-3.5 h-3.5 mr-1.5" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="disputed">Disputed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="applied">Applied</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Adjustments List */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Scale className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold mb-2">No Adjustments Found</h3>
            <p className="text-slate-400 text-sm">No records match your current filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(adj => (
            <Card key={adj.id} className={`bg-white/5 border-white/10 hover:border-white/20 transition-all cursor-pointer ${adj.status === 'disputed' ? 'border-l-2 border-l-red-500' : ''}`} onClick={() => openDetail(adj)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-white font-semibold truncate">{adj.product_name}</h4>
                      {getStatusBadge(adj.status)}
                      <Badge className={adj.adjustment_type === 'addition' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                        {adj.adjustment_type === 'addition' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                        {adj.adjustment_type}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      <span>User: {adj.user_id?.substring(0, 8)}...</span>
                      <span>${Number(adj.original_price).toFixed(2)} → ${Number(adj.settlement_price).toFixed(2)}</span>
                      <span>{Number(adj.price_difference_pct).toFixed(2)}%</span>
                      <span>{new Date(adj.created_at).toLocaleDateString()}</span>
                    </div>
                    {adj.dispute_reason && (
                      <p className="text-red-400 text-xs mt-1 truncate"><MessageCircle className="w-3 h-3 inline mr-1" />{adj.dispute_reason}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="text-right">
                      <div className={`text-lg font-bold ${adj.adjustment_type === 'addition' ? 'text-green-400' : 'text-red-400'}`}>
                        {adj.adjustment_type === 'addition' ? '+' : '-'}${Number(adj.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <Eye className="w-5 h-5 text-slate-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detail / Resolution Dialog */}
      <Dialog open={!!selectedAdj} onOpenChange={() => setSelectedAdj(null)}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedAdj && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#D4AF37]" />Dispute Detail
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Adjustment Details */}
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-white font-semibold">{selectedAdj.product_name}</h4>
                      {getStatusBadge(selectedAdj.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><div className="text-slate-500 text-[10px] uppercase">Original</div><div className="text-white font-medium">${Number(selectedAdj.original_price).toFixed(2)}</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Settlement</div><div className="text-white font-medium">${Number(selectedAdj.settlement_price).toFixed(2)}</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Difference</div><div className={Number(selectedAdj.price_difference_pct) >= 0 ? 'text-green-400' : 'text-red-400'}>{Number(selectedAdj.price_difference_pct).toFixed(2)}%</div></div>
                      <div><div className="text-slate-500 text-[10px] uppercase">Amount</div><div className={`font-bold ${selectedAdj.adjustment_type === 'addition' ? 'text-green-400' : 'text-red-400'}`}>{selectedAdj.adjustment_type === 'addition' ? '+' : '-'}${Number(selectedAdj.amount).toFixed(2)}</div></div>
                    </div>
                    <div className="flex flex-wrap gap-x-4 text-xs text-slate-400">
                      <span>Qty: {Number(selectedAdj.quantity).toLocaleString()} {selectedAdj.unit}</span>
                      <span>Source: {selectedAdj.market_source || 'N/A'}</span>
                      <span>User: {selectedAdj.user_id?.substring(0, 12)}...</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Dispute Reason */}
                {selectedAdj.dispute_reason && (
                  <Card className="bg-red-500/10 border-red-500/20">
                    <CardContent className="p-4">
                      <h4 className="text-red-400 font-semibold text-sm mb-1 flex items-center gap-1"><MessageCircle className="w-4 h-4" />User's Dispute Reason</h4>
                      <p className="text-slate-300 text-sm">{selectedAdj.dispute_reason}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Admin Notes (if already resolved) */}
                {selectedAdj.admin_notes && (
                  <Card className="bg-blue-500/10 border-blue-500/20">
                    <CardContent className="p-4">
                      <h4 className="text-blue-400 font-semibold text-sm mb-1 flex items-center gap-1"><Shield className="w-4 h-4" />Admin Resolution</h4>
                      <p className="text-slate-300 text-sm">{selectedAdj.admin_notes}</p>
                      {selectedAdj.resolved_at && <p className="text-slate-500 text-xs mt-1">Resolved: {new Date(selectedAdj.resolved_at).toLocaleString()}</p>}
                    </CardContent>
                  </Card>
                )}

                {/* Timeline */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-[#00D4FF]" />Dispute Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {timelineLoading ? (
                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" /></div>
                    ) : timeline.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No timeline events yet</p>
                    ) : (
                      <div className="relative">
                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-white/10" />
                        <div className="space-y-3">
                          {timeline.map((event, idx) => (
                            <div key={event.id} className="relative pl-8">
                              <div className={`absolute left-1.5 w-3 h-3 rounded-full ${
                                event.action.includes('approved') ? 'bg-green-500' :
                                event.action.includes('rejected') ? 'bg-red-500' :
                                event.action.includes('disputed') ? 'bg-amber-500' :
                                'bg-blue-500'
                              }`} />
                              <div className="bg-white/5 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <Badge className={event.actor_type === 'admin' ? 'bg-purple-500/20 text-purple-400' : event.actor_type === 'user' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'}>
                                      {event.actor_type}
                                    </Badge>
                                    <span className="text-white text-xs font-medium capitalize">{event.action.replace(/_/g, ' ')}</span>
                                  </div>
                                  <span className="text-slate-500 text-xs">{new Date(event.created_at).toLocaleString()}</span>
                                </div>
                                <p className="text-slate-300 text-xs">{event.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Resolution Form (only for disputed/pending) */}
                {(selectedAdj.status === 'disputed' || selectedAdj.status === 'pending') && (
                  <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/20">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="text-[#D4AF37] font-semibold text-sm flex items-center gap-1"><Shield className="w-4 h-4" />Admin Resolution</h4>
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">Justification *</label>
                        <Textarea value={justification} onChange={e => setJustification(e.target.value)} placeholder="Provide written justification for your decision..." className="bg-white/5 border-white/20 text-white" rows={3} />
                      </div>
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">Credit Amount (if approving dispute)</label>
                        <Input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="bg-white/5 border-white/20 text-white" />
                      </div>
                      <div className="flex gap-3">
                        <Button onClick={() => handleResolve('approved')} disabled={resolving || !justification.trim()} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                          {resolving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Approve Dispute (Credit User)
                        </Button>
                        <Button onClick={() => handleResolve('rejected')} disabled={resolving || !justification.trim()} variant="outline" className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10">
                          {resolving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Reject Dispute
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
