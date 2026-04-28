import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Bell, BellRing, RefreshCw, TrendingUp, TrendingDown, Activity, Zap,
  Phone, Mail, AlertTriangle, Plus, Pencil, Trash2, Pause, Play,
  ArrowUp, ArrowDown, Clock, CheckCircle, XCircle, Search, Filter,
  BarChart3, Target, Volume2, Loader2, Eye, History, Settings
} from 'lucide-react';

interface PriceData {
  symbol: string;
  price: number;
  name: string;
  change: number;
  changePercent: number;
  source: string;
}

interface AlertConfig {
  id: string;
  user_id: string;
  user_email: string;
  user_phone: string;
  product: string;
  product_name: string;
  threshold_type: 'above' | 'below';
  threshold_value: number;
  notification_channels: 'sms' | 'email' | 'both';
  active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  cooldown_minutes: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

interface TriggerLog {
  id: string;
  config_id: string;
  product: string;
  product_name: string;
  threshold_type: string;
  threshold_value: number;
  triggered_price: number;
  price_source: string;
  sms_sent: boolean;
  email_sent: boolean;
  notification_error: string;
  created_at: string;
}

const COMMODITIES = [
  { symbol: 'CL', name: 'WTI Crude Oil', unit: '$/bbl' },
  { symbol: 'BZ', name: 'Brent Crude Oil', unit: '$/bbl' },
  { symbol: 'NG', name: 'Natural Gas', unit: '$/MMBtu' },
  { symbol: 'GC', name: 'Gold', unit: '$/oz' },
  { symbol: 'SI', name: 'Silver', unit: '$/oz' },
  { symbol: 'HG', name: 'Copper', unit: '$/lb' },
  { symbol: 'PL', name: 'Platinum', unit: '$/oz' },
  { symbol: 'RB', name: 'Gasoline (RBOB)', unit: '$/gal' },
  { symbol: 'HO', name: 'Heating Oil', unit: '$/gal' },
  { symbol: 'JET', name: 'Jet Fuel (Jet A-1)', unit: '$/bbl' },
  { symbol: 'LPG', name: 'LPG', unit: '$/bbl' },
  { symbol: 'LI', name: 'Lithium Carbonate', unit: '$/MT' },
];

export default function PriceAlertManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [configs, setConfigs] = useState<AlertConfig[]>([]);
  const [triggerLogs, setTriggerLogs] = useState<TriggerLog[]>([]);
  const [livePrices, setLivePrices] = useState<Record<string, PriceData>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState('');
  const [lastTriggeredCount, setLastTriggeredCount] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<AlertConfig | null>(null);
  const [activeView, setActiveView] = useState<'monitor' | 'configs' | 'history'>('monitor');
  const [searchFilter, setSearchFilter] = useState('');
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Form state
  const [formProduct, setFormProduct] = useState('CL');
  const [formThresholdType, setFormThresholdType] = useState<'above' | 'below'>('above');
  const [formThresholdValue, setFormThresholdValue] = useState('');
  const [formChannels, setFormChannels] = useState<'sms' | 'email' | 'both'>('email');
  const [formPhone, setFormPhone] = useState('');
  const [formCooldown, setFormCooldown] = useState('60');
  const [formNotes, setFormNotes] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // Fetch live prices from commodity-prices edge function
  const fetchPrices = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('commodity-prices', { body: {} });
      if (data?.success && data.commodities) {
        const priceMap: Record<string, PriceData> = {};
        for (const c of data.commodities) {
          priceMap[c.symbol] = {
            symbol: c.symbol,
            price: c.price,
            name: c.name,
            change: c.change || 0,
            changePercent: c.changePercent || 0,
            source: c.source || 'Live',
          };
        }
        setLivePrices(priceMap);
      }
    } catch (e) {
      console.warn('Failed to fetch prices:', e);
    }
  }, []);

  // Fetch alert configs
  const fetchConfigs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'list_configs', config: { user_id: user.id } }
      });
      if (data?.success) setConfigs(data.configs || []);
    } catch (e) {
      console.warn('Failed to fetch configs:', e);
    }
    setLoading(false);
  }, [user]);

  // Fetch trigger history
  const fetchTriggerLogs = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'get_trigger_log', config: { user_id: user.id } }
      });
      if (data?.success) setTriggerLogs(data.logs || []);
    } catch (e) {
      console.warn('Failed to fetch trigger logs:', e);
    }
  }, [user]);

  // Check alerts against live prices
  const checkAlerts = useCallback(async () => {
    if (Object.keys(livePrices).length === 0) return;
    setChecking(true);
    try {
      const pricesArr = Object.entries(livePrices).map(([symbol, p]) => ({
        symbol, price: p.price, name: p.name
      }));
      const { data } = await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'check_configs', prices: pricesArr }
      });
      if (data?.triggered && data.triggered.length > 0) {
        setLastTriggeredCount(data.triggered.length);
        toast({
          title: `${data.triggered.length} Alert(s) Triggered!`,
          description: data.triggered.map((t: any) =>
            `${t.productName}: $${t.price?.toFixed(2)} ${t.direction === 'above' ? '↑' : '↓'} ${t.smsSent ? '(SMS sent)' : ''} ${t.emailSent ? '(Email sent)' : ''}`
          ).join('\n'),
        });
        fetchConfigs();
        fetchTriggerLogs();
      }
    } catch (e) {
      console.warn('Alert check failed:', e);
    }
    setLastCheck(new Date().toLocaleTimeString());
    setChecking(false);
  }, [livePrices, toast, fetchConfigs, fetchTriggerLogs]);

  // Initial load
  useEffect(() => { fetchPrices(); fetchConfigs(); fetchTriggerLogs(); }, [fetchPrices, fetchConfigs, fetchTriggerLogs]);

  // Auto-refresh prices every 30s and check alerts every 60s
  useEffect(() => {
    const priceInterval = setInterval(fetchPrices, 30000);
    return () => clearInterval(priceInterval);
  }, [fetchPrices]);

  useEffect(() => {
    if (Object.keys(livePrices).length > 0 && configs.filter(c => c.active).length > 0) {
      checkAlerts();
      pollingRef.current = setInterval(checkAlerts, 60000);
      return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }
  }, [livePrices, configs.length]);

  // Create/Update alert config
  const handleSaveConfig = async () => {
    if (!user || !formThresholdValue) return;
    setFormSaving(true);

    const commodity = COMMODITIES.find(c => c.symbol === formProduct);
    const payload: any = {
      user_id: user.id,
      user_email: user.email,
      user_phone: formPhone || null,
      product: formProduct,
      product_name: commodity?.name || formProduct,
      threshold_type: formThresholdType,
      threshold_value: parseFloat(formThresholdValue),
      notification_channels: formChannels,
      cooldown_minutes: parseInt(formCooldown) || 60,
      notes: formNotes || null,
    };

    try {
      if (editingConfig) {
        payload.id = editingConfig.id;
        const { data } = await supabase.functions.invoke('price-alert-trigger', {
          body: { action: 'update_config', config: payload }
        });
        if (data?.success) {
          toast({ title: 'Alert Updated', description: `${commodity?.name} alert updated successfully` });
        }
      } else {
        const { data } = await supabase.functions.invoke('price-alert-trigger', {
          body: { action: 'create_config', config: payload }
        });
        if (data?.success) {
          toast({ title: 'Alert Created', description: `You'll be notified when ${commodity?.name} goes ${formThresholdType} $${formThresholdValue}` });
        }
      }
      fetchConfigs();
      resetForm();
      setShowCreateDialog(false);
      setEditingConfig(null);
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save alert', variant: 'destructive' });
    }
    setFormSaving(false);
  };

  const handleToggle = async (cfg: AlertConfig) => {
    try {
      await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'toggle_config', config: { id: cfg.id, active: !cfg.active } }
      });
      fetchConfigs();
      toast({ title: cfg.active ? 'Alert Paused' : 'Alert Resumed' });
    } catch (e) { console.warn('Toggle failed:', e); }
  };

  const handleDelete = async (id: string) => {
    try {
      await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'delete_config', config: { id } }
      });
      fetchConfigs();
      toast({ title: 'Alert Deleted' });
    } catch (e) { console.warn('Delete failed:', e); }
  };

  const openEdit = (cfg: AlertConfig) => {
    setEditingConfig(cfg);
    setFormProduct(cfg.product);
    setFormThresholdType(cfg.threshold_type);
    setFormThresholdValue(String(cfg.threshold_value));
    setFormChannels(cfg.notification_channels);
    setFormPhone(cfg.user_phone || '');
    setFormCooldown(String(cfg.cooldown_minutes || 60));
    setFormNotes(cfg.notes || '');
    setShowCreateDialog(true);
  };

  const resetForm = () => {
    setFormProduct('CL');
    setFormThresholdType('above');
    setFormThresholdValue('');
    setFormChannels('email');
    setFormPhone('');
    setFormCooldown('60');
    setFormNotes('');
    setEditingConfig(null);
  };

  const activeConfigs = configs.filter(c => c.active);
  const pausedConfigs = configs.filter(c => !c.active);

  const filteredConfigs = configs.filter(c => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return c.product_name?.toLowerCase().includes(q) || c.product?.toLowerCase().includes(q);
  });

  const getProximity = (cfg: AlertConfig) => {
    const price = livePrices[cfg.product]?.price;
    if (!price) return { diff: 0, percent: 0, close: false, triggered: false };
    const diff = price - cfg.threshold_value;
    const percent = cfg.threshold_value > 0 ? (diff / cfg.threshold_value) * 100 : 0;
    const triggered = cfg.threshold_type === 'above' ? price >= cfg.threshold_value : price <= cfg.threshold_value;
    const close = Math.abs(percent) < 3;
    return { diff, percent, close, triggered };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <BellRing className="w-8 h-8 text-[#D4AF37]" /> Smart Price Alerts
          </h2>
          <p className="text-slate-400 mt-1">
            Real-time monitoring with SMS & email notifications via Twilio & SendGrid
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">
            {lastCheck ? `Last check: ${lastCheck}` : 'Monitoring...'}
          </span>
          <Button onClick={checkAlerts} disabled={checking} variant="outline" size="sm"
            className="border-[#00D4FF]/50 text-[#00D4FF] hover:bg-[#00D4FF]/10">
            <RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Check Now'}
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}
            className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 hover:shadow-lg">
            <Plus className="w-4 h-4 mr-2" /> New Alert
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeConfigs.length}</p>
              <p className="text-xs text-slate-400">Active Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Pause className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{pausedConfigs.length}</p>
              <p className="text-xs text-slate-400">Paused</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{triggerLogs.length}</p>
              <p className="text-xs text-slate-400">Total Triggers</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{configs.filter(c => c.notification_channels === 'sms' || c.notification_channels === 'both').length}</p>
              <p className="text-xs text-slate-400">SMS Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{Object.keys(livePrices).length}</p>
              <p className="text-xs text-slate-400">Live Prices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-lg w-fit">
        {[
          { id: 'monitor' as const, label: 'Live Monitor', icon: Eye },
          { id: 'configs' as const, label: 'All Alerts', icon: Settings },
          { id: 'history' as const, label: 'Trigger History', icon: History },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveView(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeView === tab.id ? 'bg-[#D4AF37] text-slate-900' : 'text-slate-400 hover:text-white'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Live Monitor View */}
      {activeView === 'monitor' && (
        <div className="space-y-4">
          {activeConfigs.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-12 text-center">
                <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Active Alerts</h3>
                <p className="text-slate-400 mb-6">Create your first price alert to start monitoring commodity prices in real-time</p>
                <Button onClick={() => { resetForm(); setShowCreateDialog(true); }}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900">
                  <Plus className="w-4 h-4 mr-2" /> Create Alert
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeConfigs.map(cfg => {
                const price = livePrices[cfg.product];
                const currentPrice = price?.price || 0;
                const { diff, percent, close, triggered } = getProximity(cfg);

                return (
                  <Card key={cfg.id} className={`border transition-all ${
                    triggered ? 'bg-amber-500/10 border-amber-500/40' :
                    close ? 'bg-yellow-500/5 border-yellow-500/20' :
                    'bg-white/5 border-white/10'
                  }`}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            cfg.threshold_type === 'above' ? 'bg-green-500/20' : 'bg-red-500/20'
                          }`}>
                            {cfg.threshold_type === 'above'
                              ? <TrendingUp className="w-6 h-6 text-green-400" />
                              : <TrendingDown className="w-6 h-6 text-red-400" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-lg">{cfg.product_name}</span>
                              <Badge variant="outline" className="text-slate-400 border-slate-600 text-xs">{cfg.product}</Badge>
                              {triggered && (
                                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">
                                  <AlertTriangle className="w-3 h-3 mr-1" />TRIGGERING
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {(cfg.notification_channels === 'email' || cfg.notification_channels === 'both') && (
                                <span className="flex items-center gap-1 text-xs text-slate-400"><Mail className="w-3 h-3" />Email</span>
                              )}
                              {(cfg.notification_channels === 'sms' || cfg.notification_channels === 'both') && (
                                <span className="flex items-center gap-1 text-xs text-blue-400"><Phone className="w-3 h-3" />SMS</span>
                              )}
                              {cfg.trigger_count > 0 && (
                                <span className="text-xs text-slate-500">Triggered {cfg.trigger_count}x</span>
                              )}
                              {cfg.notes && <span className="text-xs text-slate-500 italic">{cfg.notes}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-8">
                          {/* Current Price */}
                          <div className="text-center min-w-[100px]">
                            <p className="text-xs text-slate-400 mb-1">Current Price</p>
                            <p className="text-2xl font-bold text-white">${currentPrice.toFixed(2)}</p>
                            {price && (
                              <p className={`text-xs ${price.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                              </p>
                            )}
                          </div>

                          {/* Visual gauge */}
                          <div className="flex flex-col items-center min-w-[120px]">
                            <p className="text-xs text-slate-500 mb-1">{cfg.threshold_type === 'above' ? 'Target Above' : 'Target Below'}</p>
                            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${
                                triggered ? 'bg-amber-500' : close ? 'bg-yellow-500' : 'bg-slate-500'
                              }`} style={{ width: `${Math.min(100, Math.max(5, 50 + percent))}%` }} />
                            </div>
                            <p className={`text-xs mt-1 font-medium ${
                              diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'
                            }`}>
                              {diff > 0 ? '+' : ''}{percent.toFixed(2)}% ({diff > 0 ? '+' : ''}${diff.toFixed(2)})
                            </p>
                          </div>

                          {/* Target Price */}
                          <div className="text-center min-w-[100px]">
                            <p className="text-xs text-slate-400 mb-1">Target</p>
                            <p className={`text-2xl font-bold ${cfg.threshold_type === 'above' ? 'text-green-400' : 'text-red-400'}`}>
                              ${cfg.threshold_value.toFixed(2)}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(cfg)}
                              className="text-slate-400 hover:text-white h-8 w-8">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleToggle(cfg)}
                              className="text-amber-400 hover:text-amber-300 h-8 w-8">
                              <Pause className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleDelete(cfg.id)}
                              className="text-red-400 hover:text-red-300 h-8 w-8">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Live Price Grid */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#00D4FF]" /> Live Commodity Prices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {COMMODITIES.map(c => {
                  const price = livePrices[c.symbol];
                  const hasAlert = configs.some(cfg => cfg.product === c.symbol && cfg.active);
                  return (
                    <div key={c.symbol} className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-white/10 ${
                      hasAlert ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' : 'bg-white/5 border-white/10'
                    }`} onClick={() => {
                      resetForm();
                      setFormProduct(c.symbol);
                      setFormThresholdValue(price ? String(Math.round(price.price * 1.05 * 100) / 100) : '');
                      setShowCreateDialog(true);
                    }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-400 font-medium">{c.symbol}</span>
                        {hasAlert && <Bell className="w-3 h-3 text-[#D4AF37]" />}
                      </div>
                      <p className="text-sm font-bold text-white">
                        {price ? `$${price.price.toFixed(2)}` : '...'}
                      </p>
                      {price && (
                        <p className={`text-xs ${price.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500 mt-1">{c.name}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All Alerts View */}
      {activeView === 'configs' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
                placeholder="Search alerts..." className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
          </div>

          {filteredConfigs.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center text-slate-400">No alerts found</CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filteredConfigs.map(cfg => {
                const price = livePrices[cfg.product];
                const { triggered } = getProximity(cfg);
                return (
                  <div key={cfg.id} className={`p-4 rounded-lg border flex items-center justify-between gap-4 ${
                    !cfg.active ? 'bg-white/3 border-white/5 opacity-60' : 'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-3 h-3 rounded-full ${cfg.active ? (triggered ? 'bg-amber-500 animate-pulse' : 'bg-green-500') : 'bg-slate-600'}`} />
                      <div>
                        <span className="font-medium text-white">{cfg.product_name}</span>
                        <span className="text-slate-500 text-sm ml-2">
                          {cfg.threshold_type === 'above' ? '>' : '<'} ${cfg.threshold_value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(cfg.notification_channels === 'email' || cfg.notification_channels === 'both') && <Mail className="w-4 h-4 text-slate-400" />}
                      {(cfg.notification_channels === 'sms' || cfg.notification_channels === 'both') && <Phone className="w-4 h-4 text-blue-400" />}
                    </div>
                    <div className="text-right min-w-[80px]">
                      <p className="text-sm text-white">{price ? `$${price.price.toFixed(2)}` : '...'}</p>
                      <p className="text-xs text-slate-500">Current</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(cfg)} className="h-8 w-8 text-slate-400 hover:text-white"><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => handleToggle(cfg)} className={`h-8 w-8 ${cfg.active ? 'text-amber-400' : 'text-green-400'}`}>
                        {cfg.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(cfg.id)} className="h-8 w-8 text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Trigger History View */}
      {activeView === 'history' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#D4AF37]" /> Trigger History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {triggerLogs.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No alerts have been triggered yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {triggerLogs.map(log => (
                  <div key={log.id} className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        log.threshold_type === 'above' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {log.threshold_type === 'above' ? <ArrowUp className="w-4 h-4 text-green-400" /> : <ArrowDown className="w-4 h-4 text-red-400" />}
                      </div>
                      <div>
                        <span className="font-medium text-white">{log.product_name || log.product}</span>
                        <p className="text-xs text-slate-400">
                          Price hit ${log.triggered_price?.toFixed(2)} (target: ${log.threshold_value?.toFixed(2)})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {log.email_sent && <Badge className="bg-green-500/20 text-green-400 text-xs"><Mail className="w-3 h-3 mr-1" />Sent</Badge>}
                        {log.sms_sent && <Badge className="bg-blue-500/20 text-blue-400 text-xs"><Phone className="w-3 h-3 mr-1" />Sent</Badge>}
                        {log.notification_error && <Badge className="bg-red-500/20 text-red-400 text-xs"><XCircle className="w-3 h-3 mr-1" />Error</Badge>}
                      </div>
                      <span className="text-xs text-slate-500 min-w-[120px] text-right">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => { setShowCreateDialog(open); if (!open) { resetForm(); setEditingConfig(null); } }}>
        <DialogContent className="bg-slate-800 border-white/20 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-[#D4AF37]" />
              {editingConfig ? 'Edit Price Alert' : 'Create Price Alert'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Commodity */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Commodity</label>
              <Select value={formProduct} onValueChange={setFormProduct}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMODITIES.map(c => (
                    <SelectItem key={c.symbol} value={c.symbol}>
                      {c.name} ({c.symbol}) - {livePrices[c.symbol] ? `$${livePrices[c.symbol].price.toFixed(2)}` : '...'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {livePrices[formProduct] && (
                <p className="text-xs text-[#00D4FF] mt-1">
                  Current: ${livePrices[formProduct].price.toFixed(2)} ({livePrices[formProduct].changePercent >= 0 ? '+' : ''}{livePrices[formProduct].changePercent.toFixed(2)}%)
                </p>
              )}
            </div>

            {/* Threshold Type + Value */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Condition</label>
                <Select value={formThresholdType} onValueChange={(v) => setFormThresholdType(v as 'above' | 'below')}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="above">Price Goes Above</SelectItem>
                    <SelectItem value="below">Price Goes Below</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Threshold ($)</label>
                <input type="number" step="0.01" value={formThresholdValue}
                  onChange={e => setFormThresholdValue(e.target.value)}
                  placeholder="e.g. 75.00"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/50" />
              </div>
            </div>

            {/* Preview */}
            {formThresholdValue && livePrices[formProduct] && (
              <div className={`p-3 rounded-lg border ${
                (formThresholdType === 'above' && livePrices[formProduct].price >= parseFloat(formThresholdValue)) ||
                (formThresholdType === 'below' && livePrices[formProduct].price <= parseFloat(formThresholdValue))
                  ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-white/10'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Current vs Target</span>
                  <span className={`text-sm font-medium ${
                    (formThresholdType === 'above' && livePrices[formProduct].price >= parseFloat(formThresholdValue)) ||
                    (formThresholdType === 'below' && livePrices[formProduct].price <= parseFloat(formThresholdValue))
                      ? 'text-amber-400' : 'text-slate-400'
                  }`}>
                    {(formThresholdType === 'above' && livePrices[formProduct].price >= parseFloat(formThresholdValue)) ||
                     (formThresholdType === 'below' && livePrices[formProduct].price <= parseFloat(formThresholdValue))
                      ? 'Would trigger now!' : `${Math.abs(((livePrices[formProduct].price - parseFloat(formThresholdValue)) / parseFloat(formThresholdValue)) * 100).toFixed(1)}% away`}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <span className="text-white font-bold">${livePrices[formProduct].price.toFixed(2)}</span>
                  <div className="flex-1 h-1 bg-slate-700 rounded-full">
                    <div className={`h-full rounded-full ${formThresholdType === 'above' ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, (livePrices[formProduct].price / parseFloat(formThresholdValue)) * 50)}%` }} />
                  </div>
                  <span className={`font-bold ${formThresholdType === 'above' ? 'text-green-400' : 'text-red-400'}`}>
                    ${parseFloat(formThresholdValue).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Notification Channels */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Notification Method</label>
              <Select value={formChannels} onValueChange={(v) => setFormChannels(v as 'sms' | 'email' | 'both')}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email Only</SelectItem>
                  <SelectItem value="sms">SMS Only</SelectItem>
                  <SelectItem value="both">Email + SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Phone number for SMS */}
            {(formChannels === 'sms' || formChannels === 'both') && (
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Phone Number (for SMS)</label>
                <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/50" />
              </div>
            )}

            {/* Cooldown */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Cooldown (minutes between re-triggers)</label>
              <Select value={formCooldown} onValueChange={setFormCooldown}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="360">6 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Notes (optional)</label>
              <input value={formNotes} onChange={e => setFormNotes(e.target.value)}
                placeholder="e.g. Buy signal for Brent"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]/50" />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); setEditingConfig(null); }}
                className="flex-1 border-white/20 text-white">Cancel</Button>
              <Button onClick={handleSaveConfig} disabled={formSaving || !formThresholdValue}
                className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900">
                {formSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editingConfig ? 'Update Alert' : 'Create Alert'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
