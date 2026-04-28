import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PriceAlertForm from './PriceAlertForm';
import PriceAlertList from './PriceAlertList';
import AlertHistory from './AlertHistory';
import { Bell, RefreshCw, TrendingUp, TrendingDown, Activity, Zap, Phone, Mail, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface CommodityPrice {
  symbol: string;
  name: string;
  price: number;
  unit: string;
  change?: number;
  changePercent?: number;
}

export default function PriceAlertsDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<string>('');
  const [lastTriggered, setLastTriggered] = useState<number>(0);

  const fetchPrices = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('commodity-prices', { body: {} });
      if (data?.success && data.commodities) {
        setCommodities(data.commodities);
      }
    } catch (e) {
      console.warn('Failed to fetch prices:', e);
    }
    setLoadingPrices(false);
  }, []);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'list', alertConfig: { user_id: user.id } }
      });
      if (data?.success && Array.isArray(data.alerts)) {
        setAlerts(data.alerts);
      }
    } catch (e) {
      console.warn('Failed to fetch alerts:', e);
    }
    setLoadingAlerts(false);
  }, [user]);

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'history', alertConfig: { user_id: user.id } }
      });
      if (data?.success && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch (e) {
      console.warn('Failed to fetch history:', e);
    }
    setLoadingHistory(false);
  }, [user]);

  const checkAlerts = async () => {
    if (commodities.length === 0) return;
    setChecking(true);
    try {
      const prices = commodities.map(c => ({
        symbol: c.symbol,
        price: c.price,
        change: c.change || 0,
        changePercent: c.changePercent || 0
      }));
      const { data } = await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'check', prices }
      });
      if (data?.triggered && data.triggered.length > 0) {
        setLastTriggered(data.triggered.length);
        toast({
          title: `${data.triggered.length} Alert(s) Triggered!`,
          description: data.triggered.map((t: any) => `${t.commodityName || t.commodity}: $${t.price?.toFixed(2)}`).join(', '),
        });
        fetchAlerts();
        fetchHistory();
      }
    } catch (e) {
      console.warn('Alert check failed:', e);
    }
    setLastCheck(new Date().toLocaleTimeString());
    setChecking(false);
  };

  useEffect(() => { fetchPrices(); }, [fetchPrices]);
  useEffect(() => { fetchAlerts(); fetchHistory(); }, [fetchAlerts, fetchHistory]);
  useEffect(() => {
    if (commodities.length > 0) {
      checkAlerts();
      const interval = setInterval(checkAlerts, 60000);
      return () => clearInterval(interval);
    }
  }, [commodities]);

  const handleCreateAlert = async (alert: any) => {
    if (!user) return false;
    try {
      const { data } = await supabase.functions.invoke('price-alert-trigger', {
        body: {
          action: 'create',
          alertConfig: {
            user_id: user.id,
            user_email: user.email,
            user_phone: alert.phoneNumber || null,
            commodity_symbol: alert.symbol,
            commodity_name: alert.name,
            alert_type: alert.condition,
            threshold_price: alert.threshold,
            notification_methods: alert.notificationMethod === 'both' ? ['email', 'sms'] :
              alert.notificationMethod === 'sms' ? ['sms'] : ['email'],
            notes: alert.notes || null,
          }
        }
      });
      if (data?.success) {
        fetchAlerts();
        toast({ title: 'Alert Created', description: `You'll be notified when ${alert.name} goes ${alert.condition} $${alert.threshold}` });
        return true;
      }
    } catch (e) {
      console.error('Create alert failed:', e);
    }
    return false;
  };

  const handleToggle = async (alertId: string, isActive: boolean) => {
    try {
      await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'toggle', alertConfig: { id: alertId, is_active: isActive } }
      });
      fetchAlerts();
    } catch (e) { console.warn('Toggle failed:', e); }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await supabase.functions.invoke('price-alert-trigger', {
        body: { action: 'delete', alertConfig: { id: alertId } }
      });
      fetchAlerts();
    } catch (e) { console.warn('Delete failed:', e); }
  };

  const activeAlerts = alerts.filter(a => a.is_active);
  const triggeredAlerts = alerts.filter(a => a.triggered_at);
  const smsAlerts = alerts.filter(a => a.notification_methods?.includes('sms'));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-[#D4AF37]" /> Price Alerts
          </h2>
          <p className="text-slate-400">Set custom thresholds and receive SMS & email notifications when prices hit targets</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm">Last check: {lastCheck || 'Never'}</span>
          <button onClick={checkAlerts} disabled={checking}
            className="flex items-center gap-2 bg-slate-800 text-[#00D4FF] px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : 'Check Now'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeAlerts.length}</p>
              <p className="text-xs text-slate-400">Active Alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{triggeredAlerts.length}</p>
              <p className="text-xs text-slate-400">Triggered</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{smsAlerts.length}</p>
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
              <p className="text-2xl font-bold text-white">{commodities.length}</p>
              <p className="text-xs text-slate-400">Tracked Commodities</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts vs Current Price Monitor */}
      {activeAlerts.length > 0 && commodities.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-[#00D4FF]" />
              Live Alert Monitor - Current Price vs Target
            </h3>
            <div className="space-y-3">
              {activeAlerts.map(alert => {
                const commodity = commodities.find(c => c.symbol === alert.commodity_symbol);
                const currentPrice = commodity?.price || 0;
                const threshold = alert.threshold_price || 0;
                const isAbove = alert.alert_type === 'above';
                const diff = currentPrice - threshold;
                const diffPercent = threshold > 0 ? ((diff / threshold) * 100) : 0;
                const isClose = Math.abs(diffPercent) < 5;
                const wouldTrigger = isAbove ? currentPrice >= threshold : currentPrice <= threshold;

                return (
                  <div key={alert.id} className={`p-4 rounded-xl border transition-all ${
                    wouldTrigger ? 'bg-amber-500/10 border-amber-500/40 animate-pulse' :
                    isClose ? 'bg-yellow-500/5 border-yellow-500/20' :
                    'bg-white/5 border-white/10'
                  }`}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isAbove ? 'bg-green-500/20' : 'bg-red-500/20'
                        }`}>
                          {isAbove ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{alert.commodity_name}</span>
                            <span className="text-slate-500 text-xs">({alert.commodity_symbol})</span>
                            {wouldTrigger && (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs animate-bounce">
                                <AlertTriangle className="w-3 h-3 mr-1" />TRIGGERING
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            {alert.notification_methods?.includes('email') && (
                              <span className="flex items-center gap-1 text-xs text-slate-400"><Mail className="w-3 h-3" />Email</span>
                            )}
                            {alert.notification_methods?.includes('sms') && (
                              <span className="flex items-center gap-1 text-xs text-blue-400"><Phone className="w-3 h-3" />SMS</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Current Price */}
                        <div className="text-center">
                          <p className="text-xs text-slate-400 mb-1">Current Price</p>
                          <p className="text-xl font-bold text-white">${currentPrice.toFixed(2)}</p>
                        </div>

                        {/* Direction Arrow */}
                        <div className="flex flex-col items-center">
                          <p className="text-xs text-slate-500 mb-1">{isAbove ? 'Target Above' : 'Target Below'}</p>
                          <div className={`w-16 h-1 rounded-full ${
                            wouldTrigger ? 'bg-amber-500' : isClose ? 'bg-yellow-500' : 'bg-slate-600'
                          }`} />
                          <p className={`text-xs mt-1 font-medium ${
                            diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'
                          }`}>
                            {diff > 0 ? '+' : ''}{diffPercent.toFixed(2)}%
                          </p>
                        </div>

                        {/* Target Price */}
                        <div className="text-center">
                          <p className="text-xs text-slate-400 mb-1">Target</p>
                          <p className={`text-xl font-bold ${isAbove ? 'text-green-400' : 'text-red-400'}`}>
                            ${threshold.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriceAlertForm commodities={commodities} onCreateAlert={handleCreateAlert} />
        <PriceAlertList alerts={alerts} onToggle={handleToggle} onDelete={handleDelete} loading={loadingAlerts} />
      </div>

      <AlertHistory history={history} loading={loadingHistory} />
    </div>
  );
}
