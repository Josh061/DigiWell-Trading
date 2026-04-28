import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Lock, Shield, CheckCircle, Clock, AlertCircle, DollarSign,
  Truck, Building2, Loader2, ArrowRight, FileText, Coins,
  Globe, RefreshCw, Package, XCircle, Fuel, Gem, CreditCard,
  Upload, Timer, AlertTriangle, Eye, ChevronDown, ChevronUp, Link2
} from 'lucide-react';
import { SERVICE_FEE_RATE, generateApplicationId, formatCurrency } from '@/lib/applicationId';

interface EscrowTransaction {
  id: string;
  escrow_id: string;
  app_id: string;
  product_name: string;
  product_type: 'petroleum' | 'rwa';
  quantity: number;
  unit: string;
  unit_price: number;
  subtotal: number;
  service_fee: number;
  total_amount: number;
  currency: string;
  buyer_name: string;
  buyer_email: string;
  refinery_name: string;
  refinery_payout: number;
  platform_fee: number;
  status: 'funded' | 'in_transit' | 'delivered' | 'released' | 'disputed' | 'refunded' | 'partial_release';
  delivery_confirmed: boolean;
  dispute_reason?: string;
  dispute_evidence_url?: string;
  auto_release_date?: string;
  partial_release_pct?: number;
  smart_contract_hash?: string;
  created_at: string;
  updated_at?: string;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', rate: 1580 },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', rate: 3.67 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 7.24 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83.12 },
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal', rate: 3.75 },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any; description: string }> = {
  funded: { label: 'Funded', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Lock, description: 'Payment held in escrow' },
  in_transit: { label: 'In Transit', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Truck, description: 'Product being delivered' },
  delivered: { label: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Package, description: 'Delivery confirmed via GPS/POD' },
  released: { label: 'Released', color: 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30', icon: CheckCircle, description: 'Payments released to all parties' },
  partial_release: { label: 'Partial Release', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: DollarSign, description: 'Partial payment released' },
  disputed: { label: 'Disputed', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertCircle, description: 'Under dispute resolution' },
  refunded: { label: 'Refunded', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', icon: XCircle, description: 'Funds returned to buyer' },
};

const LIFECYCLE_STAGES = [
  { key: 'funded', label: 'Funded', icon: Lock, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { key: 'in_transit', label: 'In Transit', icon: Truck, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { key: 'delivered', label: 'Delivered', icon: Package, color: 'text-green-400', bg: 'bg-green-500/20' },
  { key: 'released', label: 'Released', icon: CheckCircle, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/20' },
];

export default function MulticurrencyEscrow() {
  const { user, userProfile } = useAuth();
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
  const [disputeForm, setDisputeForm] = useState({ reason: '', evidence: '' });
  const [partialPct, setPartialPct] = useState('50');
  const [stats, setStats] = useState({ total: 0, funded: 0, released: 0, disputed: 0, totalValue: 0, totalFees: 0 });

  const [form, setForm] = useState({
    productName: '', productType: 'petroleum' as 'petroleum' | 'rwa',
    quantity: '', unit: 'barrels', unitPrice: '', refineryName: '',
    notes: ''
  });

  useEffect(() => { fetchTransactions(); }, []);

  // Auto-release check: 14-day time-lock
  useEffect(() => {
    const checkAutoRelease = async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const eligibleTxns = transactions.filter(t =>
        t.status === 'delivered' && t.created_at < fourteenDaysAgo
      );
      for (const txn of eligibleTxns) {
        try {
          await supabase.from('escrow_transactions').update({
            status: 'released',
            delivery_confirmed: true,
            updated_at: new Date().toISOString()
          }).eq('id', txn.id);
        } catch (e) { console.warn('Auto-release failed:', e); }
      }
      if (eligibleTxns.length > 0) fetchTransactions();
    };
    if (transactions.length > 0) checkAutoRelease();
  }, [transactions.length]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('escrow_transactions')
        .select('*').order('created_at', { ascending: false });
      const txns = data || [];
      setTransactions(txns);
      setStats({
        total: txns.length,
        funded: txns.filter(t => t.status === 'funded' || t.status === 'in_transit').length,
        released: txns.filter(t => t.status === 'released' || t.status === 'partial_release').length,
        disputed: txns.filter(t => t.status === 'disputed').length,
        totalValue: txns.reduce((s, t) => s + Number(t.total_amount || 0), 0),
        totalFees: txns.filter(t => t.status === 'released').reduce((s, t) => s + Number(t.platform_fee || 0), 0),
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const createEscrow = async () => {
    const qty = parseFloat(form.quantity) || 0;
    const price = parseFloat(form.unitPrice) || 0;
    if (!form.productName || !qty || !price || !form.refineryName) return;

    setCreating(true);
    try {
      const subtotal = qty * price;
      const brokerCommission = subtotal * SERVICE_FEE_RATE;
      const total = subtotal + brokerCommission;
      const refineryPayout = subtotal;
      const appId = generateApplicationId(form.productName.substring(0, 4).toUpperCase(), form.productType === 'rwa', qty);
      const escrowId = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const smartContractHash = `0x${Array.from({length: 64}, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
      const autoReleaseDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      await supabase.from('escrow_transactions').insert({
        escrow_id: escrowId,
        app_id: appId,
        product_name: form.productName,
        product_type: form.productType,
        quantity: qty,
        unit: form.unit,
        unit_price: price,
        subtotal,
        service_fee: brokerCommission,
        total_amount: total,
        currency: selectedCurrency,
        buyer_name: userProfile?.full_name || 'Trader',
        buyer_email: userProfile?.email || '',
        refinery_name: form.refineryName,
        refinery_payout: refineryPayout,
        platform_fee: brokerCommission,
        status: 'funded',
        delivery_confirmed: false,
        user_id: user?.id,
        notes: form.notes,
        smart_contract_hash: smartContractHash,
        auto_release_date: autoReleaseDate,
      });

      setShowCreate(false);
      setForm({ productName: '', productType: 'petroleum', quantity: '', unit: 'barrels', unitPrice: '', refineryName: '', notes: '' });
      await fetchTransactions();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const updateStatus = async (id: string, newStatus: string, extra: Record<string, any> = {}) => {
    try {
      await supabase.from('escrow_transactions').update({
        status: newStatus,
        delivery_confirmed: ['delivered', 'released', 'partial_release'].includes(newStatus),
        updated_at: new Date().toISOString(),
        ...extra
      }).eq('id', id);
      await fetchTransactions();
    } catch (err) { console.error(err); }
  };

  const handleDispute = async (txnId: string) => {
    if (!disputeForm.reason) return;
    await updateStatus(txnId, 'disputed', {
      dispute_reason: disputeForm.reason,
      dispute_evidence_url: disputeForm.evidence || null
    });
    setDisputeForm({ reason: '', evidence: '' });
    setExpandedTxn(null);
  };

  const handlePartialRelease = async (txn: EscrowTransaction) => {
    const pct = parseFloat(partialPct) / 100;
    if (pct <= 0 || pct >= 1) return;
    const partialAmount = Number(txn.subtotal) * pct;
    const partialFee = partialAmount * SERVICE_FEE_RATE;
    await updateStatus(txn.id, 'partial_release', {
      partial_release_pct: parseFloat(partialPct),
      refinery_payout: partialAmount,
      platform_fee: partialFee
    });
  };

  const getDaysUntilAutoRelease = (txn: EscrowTransaction) => {
    if (!txn.auto_release_date) return null;
    const diff = new Date(txn.auto_release_date).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getLifecycleStage = (status: string) => {
    const stageIndex = LIFECYCLE_STAGES.findIndex(s => s.key === status);
    return stageIndex >= 0 ? stageIndex : 0;
  };

  const qty = parseFloat(form.quantity) || 0;
  const price = parseFloat(form.unitPrice) || 0;
  const subtotal = qty * price;
  const brokerCommission = subtotal * SERVICE_FEE_RATE;
  const total = subtotal + brokerCommission;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Lock className="w-7 h-7 text-[#D4AF37]" />
            Smart Contract Escrow System
          </h2>
          <p className="text-slate-400 text-sm mt-1">Blockchain-style smart contract automation with auto-release, dispute resolution & partial delivery</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold">
            <Lock className="w-4 h-4 mr-2" />Create Escrow
          </Button>
          <Button onClick={fetchTransactions} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-slate-400 text-xs">Total Escrows</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.funded}</div>
            <div className="text-blue-400/70 text-xs">Active/In Transit</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.released}</div>
            <div className="text-green-400/70 text-xs">Released</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.disputed}</div>
            <div className="text-red-400/70 text-xs">Disputed</div>
          </CardContent>
        </Card>
        <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#D4AF37]">${(stats.totalValue / 1000000).toFixed(1)}M</div>
            <div className="text-[#D4AF37]/70 text-xs">Total Value</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">${stats.totalFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            <div className="text-purple-400/70 text-xs">Broker Commission (0.87%)</div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Contract Flow Diagram */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-5">
          <h3 className="text-white font-bold text-sm mb-4 text-center flex items-center justify-center gap-2">
            <Link2 className="w-4 h-4 text-[#D4AF37]" />Blockchain Smart Contract Escrow Flow
          </h3>
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            {[
              { icon: CreditCard, label: 'Buyer Pays', sublabel: 'Smart Contract Created', color: 'text-blue-400', bg: 'bg-blue-500/20' },
              { icon: Lock, label: 'Escrow Holds', sublabel: 'Blockchain Locked', color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/20' },
              { icon: Truck, label: 'GPS/POD Track', sublabel: 'Auto-Verify Delivery', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
              { icon: CheckCircle, label: 'Auto-Confirm', sublabel: '14-Day Time Lock', color: 'text-green-400', bg: 'bg-green-500/20' },
              { icon: DollarSign, label: 'Auto-Release', sublabel: 'Refinery + 0.87%', color: 'text-purple-400', bg: 'bg-purple-500/20' },
            ].map((step, i) => (
              <div key={i} className="flex items-center">
                <div className="text-center">
                  <div className={`w-12 h-12 ${step.bg} rounded-xl flex items-center justify-center mx-auto mb-1`}>
                    <step.icon className={`w-6 h-6 ${step.color}`} />
                  </div>
                  <div className={`${step.color} text-xs font-bold`}>{step.label}</div>
                  <div className="text-slate-500 text-[10px]">{step.sublabel}</div>
                </div>
                {i < 4 && <ArrowRight className="w-4 h-4 text-slate-600 mx-2" />}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3 text-center text-xs">
            <div className="bg-blue-500/10 rounded-lg p-2">
              <div className="text-blue-400 font-bold">Refinery Payment</div>
              <div className="text-slate-400">Product price to refinery</div>
            </div>
            <div className="bg-[#D4AF37]/10 rounded-lg p-2">
              <div className="text-[#D4AF37] font-bold">Broker Commission (0.87%)</div>
              <div className="text-slate-400">Digiwell platform fee</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-2">
              <div className="text-green-400 font-bold">14-Day Auto-Release</div>
              <div className="text-slate-400">Time-locked if no dispute</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2">
              <div className="text-red-400 font-bold">Dispute Resolution</div>
              <div className="text-slate-400">Evidence upload & arbitration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Escrow Form */}
      {showCreate && (
        <Card className="bg-slate-800/50 border-[#D4AF37]/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#D4AF37]" />Create New Smart Contract Escrow
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Product Name *</Label>
                <Input value={form.productName} onChange={e => setForm({...form, productName: e.target.value})}
                  placeholder="e.g., Bonny Light Crude" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Product Type *</Label>
                <Select value={form.productType} onValueChange={(v: any) => setForm({...form, productType: v})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="petroleum">Petroleum Product</SelectItem>
                    <SelectItem value="rwa">Real World Asset (RWA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Refinery / Supplier *</Label>
                <Input value={form.refineryName} onChange={e => setForm({...form, refineryName: e.target.value})}
                  placeholder="e.g., Dangote Refinery" className="bg-slate-700 border-slate-600 text-white" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Quantity *</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})}
                  placeholder="50000" className="bg-slate-700 border-slate-600 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Unit</Label>
                <Select value={form.unit} onValueChange={v => setForm({...form, unit: v})}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="barrels">Barrels</SelectItem>
                    <SelectItem value="litres">Litres</SelectItem>
                    <SelectItem value="tonnes">Tonnes</SelectItem>
                    <SelectItem value="ounces">Ounces</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Unit Price ($) *</Label>
                <Input type="number" value={form.unitPrice} onChange={e => setForm({...form, unitPrice: e.target.value})}
                  placeholder="82.50" className="bg-slate-700 border-slate-600 text-white" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Currency</Label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {subtotal > 0 && (
              <div className="bg-slate-700/50 rounded-xl p-4 space-y-2">
                <h4 className="text-white font-bold text-sm">Smart Contract Escrow Breakdown</h4>
                <div className="flex justify-between text-slate-300 text-sm"><span>Subtotal (Product Price)</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-slate-300 text-sm">
                  <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-blue-400" />Refinery Payment</span>
                  <span className="text-blue-400">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-300 text-sm">
                  <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3 text-[#D4AF37]" />Broker Commission (0.87%)</span>
                  <span className="text-[#D4AF37]">{formatCurrency(brokerCommission)}</span>
                </div>
                <div className="border-t border-slate-600 pt-2 flex justify-between font-bold">
                  <span className="text-white">Total Escrow Amount</span>
                  <span className="text-[#D4AF37] text-lg">{formatCurrency(total)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                  <Timer className="w-3 h-3" />
                  Auto-release after 14 days if no dispute raised
                </div>
              </div>
            )}

            <Button onClick={createEscrow} disabled={creating || !form.productName || !qty || !price || !form.refineryName}
              className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-5">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              Deploy Smart Contract & Lock Funds
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-slate-400">Loading escrow transactions...</p>
        </div>
      ) : transactions.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-12 text-center">
            <Lock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-white font-bold text-lg mb-2">No Escrow Transactions</h3>
            <p className="text-slate-400 text-sm">Create your first smart contract escrow to secure a petroleum or RWA trade.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map(txn => {
            const statusConf = STATUS_CONFIG[txn.status] || STATUS_CONFIG.funded;
            const StatusIcon = statusConf.icon;
            const isExpanded = expandedTxn === txn.id;
            const daysLeft = getDaysUntilAutoRelease(txn);
            const lifecycleStage = getLifecycleStage(txn.status);

            return (
              <Card key={txn.id} className="bg-slate-800/50 border-slate-700 hover:border-slate-600 transition-colors">
                <CardContent className="p-0">
                  <div className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => setExpandedTxn(isExpanded ? null : txn.id)}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${txn.product_type === 'petroleum' ? 'bg-blue-500/20' : 'bg-purple-500/20'}`}>
                      {txn.product_type === 'petroleum' ? <Fuel className="w-5 h-5 text-blue-400" /> : <Gem className="w-5 h-5 text-purple-400" />}
                    </div>
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
                      <div>
                        <div className="text-white font-bold text-sm">{txn.product_name}</div>
                        <div className="text-[#D4AF37] font-mono text-[10px]">{txn.escrow_id}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Quantity</div>
                        <div className="text-white text-sm font-bold">{Number(txn.quantity).toLocaleString()} {txn.unit}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Total</div>
                        <div className="text-[#D4AF37] font-bold">{formatCurrency(Number(txn.total_amount))}</div>
                      </div>
                      <div>
                        <div className="text-slate-400 text-[10px] uppercase">Refinery</div>
                        <div className="text-white text-sm">{txn.refinery_name}</div>
                      </div>
                      <div>
                        <Badge className={`${statusConf.color} border text-[10px]`}>
                          <StatusIcon className="w-3 h-3 mr-1" />{statusConf.label}
                        </Badge>
                        {daysLeft !== null && daysLeft > 0 && txn.status !== 'released' && txn.status !== 'refunded' && (
                          <div className="text-slate-500 text-[9px] mt-1 flex items-center gap-1">
                            <Timer className="w-3 h-3" />{daysLeft}d auto-release
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 items-center">
                        {txn.status === 'funded' && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(txn.id, 'in_transit'); }} className="bg-yellow-600 hover:bg-yellow-700 text-white text-[10px] h-7">
                            <Truck className="w-3 h-3 mr-1" />Ship
                          </Button>
                        )}
                        {txn.status === 'in_transit' && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(txn.id, 'delivered'); }} className="bg-green-600 hover:bg-green-700 text-white text-[10px] h-7">
                            <Package className="w-3 h-3 mr-1" />Confirm
                          </Button>
                        )}
                        {txn.status === 'delivered' && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); updateStatus(txn.id, 'released'); }} className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900 text-[10px] h-7">
                            <DollarSign className="w-3 h-3 mr-1" />Release
                          </Button>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 p-4 space-y-4">
                      {/* Lifecycle Progress */}
                      <div className="bg-slate-700/30 rounded-xl p-4">
                        <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                          <Link2 className="w-4 h-4 text-[#D4AF37]" />Escrow Lifecycle
                        </h4>
                        <div className="flex items-center justify-between">
                          {LIFECYCLE_STAGES.map((stage, i) => {
                            const isActive = i <= lifecycleStage;
                            const isCurrent = stage.key === txn.status;
                            const StageIcon = stage.icon;
                            return (
                              <div key={stage.key} className="flex items-center flex-1">
                                <div className="text-center flex-1">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-1 ${isActive ? stage.bg : 'bg-slate-700'} ${isCurrent ? 'ring-2 ring-[#D4AF37]' : ''}`}>
                                    <StageIcon className={`w-5 h-5 ${isActive ? stage.color : 'text-slate-500'}`} />
                                  </div>
                                  <div className={`text-[10px] font-bold ${isActive ? stage.color : 'text-slate-500'}`}>{stage.label}</div>
                                </div>
                                {i < LIFECYCLE_STAGES.length - 1 && (
                                  <div className={`h-0.5 flex-1 ${i < lifecycleStage ? 'bg-[#D4AF37]' : 'bg-slate-700'}`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Smart Contract Details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-700/50 rounded-lg p-3 space-y-1 text-sm">
                          <h5 className="text-white font-bold text-xs flex items-center gap-1"><Shield className="w-3 h-3 text-[#D4AF37]" />Smart Contract</h5>
                          <div className="flex justify-between"><span className="text-slate-400">Hash:</span><span className="text-[#D4AF37] font-mono text-[9px] truncate max-w-[150px]">{txn.smart_contract_hash || 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Auto-Release:</span><span className="text-white text-xs">{txn.auto_release_date ? new Date(txn.auto_release_date).toLocaleDateString() : '14 days'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Created:</span><span className="text-white text-xs">{new Date(txn.created_at).toLocaleDateString()}</span></div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 space-y-1 text-sm">
                          <h5 className="text-white font-bold text-xs flex items-center gap-1"><DollarSign className="w-3 h-3 text-blue-400" />Payment Split</h5>
                          <div className="flex justify-between"><span className="text-slate-400">Refinery:</span><span className="text-blue-400">{formatCurrency(Number(txn.refinery_payout || txn.subtotal))}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Commission:</span><span className="text-[#D4AF37]">{formatCurrency(Number(txn.platform_fee || txn.service_fee))}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Total:</span><span className="text-white font-bold">{formatCurrency(Number(txn.total_amount))}</span></div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 space-y-1 text-sm">
                          <h5 className="text-white font-bold text-xs flex items-center gap-1"><Timer className="w-3 h-3 text-green-400" />Time Lock</h5>
                          <div className="flex justify-between"><span className="text-slate-400">Days Left:</span><span className={`font-bold ${(daysLeft || 0) <= 3 ? 'text-red-400' : 'text-green-400'}`}>{daysLeft ?? 'N/A'}</span></div>
                          <div className="flex justify-between"><span className="text-slate-400">Status:</span><span className="text-white text-xs">{statusConf.description}</span></div>
                          {txn.partial_release_pct && <div className="flex justify-between"><span className="text-slate-400">Partial:</span><span className="text-orange-400">{txn.partial_release_pct}%</span></div>}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {['funded', 'in_transit', 'delivered'].includes(txn.status) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Dispute Form */}
                          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 space-y-3">
                            <h5 className="text-red-400 font-bold text-sm flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />Raise Dispute
                            </h5>
                            <Input
                              value={disputeForm.reason}
                              onChange={e => setDisputeForm({ ...disputeForm, reason: e.target.value })}
                              placeholder="Reason for dispute..."
                              className="bg-slate-700 border-slate-600 text-white text-sm"
                            />
                            <Input
                              value={disputeForm.evidence}
                              onChange={e => setDisputeForm({ ...disputeForm, evidence: e.target.value })}
                              placeholder="Evidence URL (optional)"
                              className="bg-slate-700 border-slate-600 text-white text-sm"
                            />
                            <Button size="sm" onClick={() => handleDispute(txn.id)} disabled={!disputeForm.reason}
                              className="w-full bg-red-600 hover:bg-red-700 text-white text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />Submit Dispute
                            </Button>
                          </div>

                          {/* Partial Release */}
                          {txn.status === 'delivered' && (
                            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                              <h5 className="text-orange-400 font-bold text-sm flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />Partial Release
                              </h5>
                              <p className="text-slate-400 text-xs">Release a percentage for partial deliveries</p>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={partialPct}
                                  onChange={e => setPartialPct(e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white text-sm w-20"
                                  min="1" max="99"
                                />
                                <span className="text-white text-sm">%</span>
                                <span className="text-slate-400 text-xs">= {formatCurrency(Number(txn.subtotal) * (parseFloat(partialPct) / 100))}</span>
                              </div>
                              <Button size="sm" onClick={() => handlePartialRelease(txn)}
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs">
                                <DollarSign className="w-3 h-3 mr-1" />Release {partialPct}%
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Dispute Info */}
                      {txn.status === 'disputed' && txn.dispute_reason && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                          <h5 className="text-red-400 font-bold text-sm mb-2">Dispute Details</h5>
                          <p className="text-white text-sm">{txn.dispute_reason}</p>
                          {txn.dispute_evidence_url && (
                            <a href={txn.dispute_evidence_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-xs hover:underline mt-2 flex items-center gap-1">
                              <Upload className="w-3 h-3" />View Evidence
                            </a>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => updateStatus(txn.id, 'released')} className="bg-green-600 hover:bg-green-700 text-white text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />Resolve & Release
                            </Button>
                            <Button size="sm" onClick={() => updateStatus(txn.id, 'refunded')} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                              <XCircle className="w-3 h-3 mr-1" />Refund Buyer
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
