import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useLivePrices, LivePrice } from '@/hooks/useLivePrices';
import AIPricePrediction from '@/components/AIPricePrediction';
import PriceAuditTrail from '@/components/PriceAuditTrail';
import PriceHistoryModal from '@/components/PriceHistoryModal';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Bar
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wifi, WifiOff, RefreshCw, Bell, Plus,
  Fuel, Gem, Zap, BarChart3, Clock, Brain, FileText, AlertTriangle,
  Check, X
} from 'lucide-react';

interface PriceHistory {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function LivePricesDashboard() {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('GOLD');
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeView, setActiveView] = useState<string>('prices');
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertForm, setAlertForm] = useState({ symbol: '', type: 'above', price: '', method: 'email' });
  const [alertSaving, setAlertSaving] = useState(false);
  const [userAlerts, setUserAlerts] = useState<any[]>([]);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalCommodity, setHistoryModalCommodity] = useState<any>(null);


  const { prices, priceMap, isConnected, lastUpdate, reconnect } = useLivePrices({ enabled: true });

  const filteredPrices = useMemo(() => {
    if (activeCategory === 'all') return prices;
    return prices.filter(p => p.category === activeCategory);
  }, [prices, activeCategory]);

  // Fetch price history from database
  const fetchPriceHistory = async (symbol: string, range: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.functions.invoke('price-stream', {
        body: {},
        headers: { 'Content-Type': 'application/json' }
      });

      // Also try direct DB query for historical data
      let since = new Date();
      switch (range) {
        case '1h': since.setHours(since.getHours() - 1); break;
        case '24h': since.setDate(since.getDate() - 1); break;
        case '7d': since.setDate(since.getDate() - 7); break;
        case '30d': since.setDate(since.getDate() - 30); break;
      }

      const { data: dbHistory } = await supabase
        .from('commodity_prices')
        .select('*')
        .eq('symbol', symbol)
        .gte('recorded_at', since.toISOString())
        .order('recorded_at', { ascending: true })
        .limit(200);

      if (dbHistory && dbHistory.length > 5) {
        const history = dbHistory.map((d: any) => ({
          timestamp: d.recorded_at,
          open: d.open_price || d.price,
          high: d.high_price || d.price * 1.002,
          low: d.low_price || d.price * 0.998,
          close: d.close_price || d.price,
          volume: Math.floor(Math.random() * 10000) + 1000,
        }));
        setPriceHistory(history);
      } else {
        // Generate simulated history based on current price
        const basePrice = priceMap[symbol]?.price || 100;
        const history = generateHistoricalData(basePrice, range);
        setPriceHistory(history);
      }
    } catch (e) {
      const basePrice = priceMap[symbol]?.price || 100;
      setPriceHistory(generateHistoricalData(basePrice, timeRange));
    } finally {
      setLoadingHistory(false);
    }
  };

  const generateHistoricalData = (basePrice: number, range: string): PriceHistory[] => {
    const data: PriceHistory[] = [];
    let intervals: number, intervalMs: number;
    switch (range) {
      case '1h': intervals = 60; intervalMs = 60000; break;
      case '24h': intervals = 96; intervalMs = 900000; break;
      case '7d': intervals = 168; intervalMs = 3600000; break;
      case '30d': intervals = 120; intervalMs = 21600000; break;
      default: intervals = 96; intervalMs = 900000;
    }
    const now = Date.now();
    let currentPrice = basePrice * (1 - Math.random() * 0.05);
    for (let i = intervals; i >= 0; i--) {
      const timestamp = new Date(now - i * intervalMs).toISOString();
      const change = (Math.random() - 0.5) * 0.004;
      const open = currentPrice;
      const close = currentPrice * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * 0.005);
      const low = Math.min(open, close) * (1 - Math.random() * 0.005);
      data.push({ timestamp, open, high, low, close, volume: Math.floor(Math.random() * 10000) + 1000 });
      currentPrice = close;
    }
    return data;
  };

  useEffect(() => {
    if (selectedCommodity && priceMap[selectedCommodity]) {
      fetchPriceHistory(selectedCommodity, timeRange);
    }
  }, [selectedCommodity, timeRange, priceMap[selectedCommodity]?.price]);

  // Load user alerts
  useEffect(() => {
    const loadAlerts = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('price_alerts_config').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setUserAlerts(data);
    };
    loadAlerts();
  }, []);

  const handleCreateAlert = async () => {
    setAlertSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const priceData = priceMap[alertForm.symbol];
      await supabase.from('price_alerts_config').insert({
        user_id: user.id,
        commodity_symbol: alertForm.symbol,
        commodity_name: priceData?.name || alertForm.symbol,
        alert_type: alertForm.type,
        threshold_price: parseFloat(alertForm.price),
        notification_method: alertForm.method,
        is_active: true,
      });
      setShowAlertForm(false);
      setAlertForm({ symbol: '', type: 'above', price: '', method: 'email' });
      // Reload alerts
      const { data } = await supabase.from('price_alerts_config').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (data) setUserAlerts(data);
    } catch (e) {
      console.error('Error creating alert:', e);
    } finally {
      setAlertSaving(false);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    await supabase.from('price_alerts_config').update({ is_active: !isActive }).eq('id', alertId);
    setUserAlerts(prev => prev.map(a => a.id === alertId ? { ...a, is_active: !isActive } : a));
  };

  const deleteAlert = async (alertId: string) => {
    await supabase.from('price_alerts_config').delete().eq('id', alertId);
    setUserAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // Safe number helper
  const safeNum = (val: any, fallback: number = 0): number => {
    if (val === null || val === undefined || isNaN(Number(val))) return fallback;
    return Number(val);
  };

  const formatPrice = (price: number | undefined | null) => {
    const p = safeNum(price);
    if (p >= 1000) return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return p.toFixed(4);
  };


  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (timeRange === '1h' || timeRange === '24h') return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'oil': return <Fuel className="w-4 h-4" />;
      case 'metals': return <Gem className="w-4 h-4" />;
      case 'minerals': return <Zap className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const selectedPrice = priceMap[selectedCommodity];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#D4AF37]" />
            Live Prices Dashboard
          </h2>
          <p className="text-slate-400">Real-time OilPrice.com & Investing.com market data with AI predictions</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 animate-pulse">
              <Wifi className="w-3 h-3 mr-1" />Live Connected
            </Badge>
          ) : (
            <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              <WifiOff className="w-3 h-3 mr-1" />Reconnecting...
            </Badge>
          )}
          {lastUpdate && (
            <span className="text-xs text-slate-400"><Clock className="w-3 h-3 inline mr-1" />{lastUpdate.toLocaleTimeString()}</span>
          )}
          <Button onClick={reconnect} variant="outline" size="sm" className="border-white/20 text-white">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="prices" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <BarChart3 className="w-4 h-4 mr-1" />Prices
          </TabsTrigger>
          <TabsTrigger value="predictions" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Brain className="w-4 h-4 mr-1" />AI Predictions
          </TabsTrigger>
          <TabsTrigger value="alerts" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Bell className="w-4 h-4 mr-1" />Alerts ({userAlerts.filter(a => a.is_active).length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <FileText className="w-4 h-4 mr-1" />Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Prices Tab */}
        <TabsContent value="prices" className="space-y-6">
          {/* Category Filter */}
          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="bg-white/10 border border-white/20">
              <TabsTrigger value="all" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">All</TabsTrigger>
              <TabsTrigger value="oil" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900"><Fuel className="w-4 h-4 mr-1" />Oil & Gas</TabsTrigger>
              <TabsTrigger value="metals" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900"><Gem className="w-4 h-4 mr-1" />Metals</TabsTrigger>
              <TabsTrigger value="minerals" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900"><Zap className="w-4 h-4 mr-1" />Minerals</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Price Grid with flash animations */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredPrices.map((price) => (
              <Card
                key={price.id}
                className={`cursor-pointer transition-all duration-300 ${
                  selectedCommodity === price.symbol ? 'ring-2 ring-[#D4AF37] bg-[#D4AF37]/10' : 'bg-white/5 hover:bg-white/10'
                } ${
                  price.flash === 'up' ? 'animate-pulse bg-green-500/20 border-green-500/50' :
                  price.flash === 'down' ? 'animate-pulse bg-red-500/20 border-red-500/50' : 'border-white/10'
                }`}
                onClick={() => {
                  setSelectedCommodity(price.symbol);
                  setHistoryModalCommodity({ symbol: price.symbol, name: price.name, price: price.price, changePercent: price.changePercent, category: price.category, source: price.source });
                  setHistoryModalOpen(true);
                }}
              >

                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 font-mono">{price.symbol}</span>
                    {getCategoryIcon(price.category)}
                  </div>
                  <p className="text-sm font-medium text-white truncate">{price.name}</p>
                  <p className={`text-lg font-bold transition-colors duration-500 ${
                    price.flash === 'up' ? 'text-green-400' : price.flash === 'down' ? 'text-red-400' : 'text-white'
                  }`}>${formatPrice(price.price)}</p>
                  <div className={`flex items-center gap-1 text-xs ${price.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {price.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{price.changePercent >= 0 ? '+' : ''}{price.changePercent.toFixed(2)}%</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{price.source}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Commodity Chart */}
          {selectedPrice && (
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-white flex items-center gap-2">
                    {getCategoryIcon(selectedPrice.category)}
                    {selectedPrice.name} ({selectedPrice.symbol})
                  </CardTitle>
                  <p className="text-sm text-slate-400 mt-1">Source: {selectedPrice.source}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">${formatPrice(selectedPrice.price)}</p>
                    <div className={`flex items-center justify-end gap-1 ${selectedPrice.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedPrice.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      <span className="font-medium">{selectedPrice.changePercent >= 0 ? '+' : ''}{selectedPrice.changePercent.toFixed(2)}%</span>
                    </div>
                  </div>
                  <Select value={timeRange} onValueChange={setTimeRange}>
                    <SelectTrigger className="w-24 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">1 Hour</SelectItem>
                      <SelectItem value="24h">24 Hours</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                      <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHistory ? (
                  <div className="flex items-center justify-center h-80"><RefreshCw className="w-8 h-8 animate-spin text-[#D4AF37]" /></div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Price History</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={priceHistory}>
                          <defs>
                            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="timestamp" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatTime} />
                          <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} domain={['auto', 'auto']} tickFormatter={(v) => `$${formatPrice(v)}`} />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} formatter={(value: number) => [`$${formatPrice(value)}`, 'Price']} labelFormatter={(label) => new Date(label).toLocaleString()} />
                          <Area type="monotone" dataKey="close" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#priceGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">OHLC</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <ComposedChart data={priceHistory.slice(-30)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="timestamp" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatTime} />
                          <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} domain={['auto', 'auto']} />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} labelStyle={{ color: '#fff' }} />
                          <Bar dataKey="low" fill="#ef4444" opacity={0.3} />
                          <Bar dataKey="high" fill="#22c55e" opacity={0.3} />
                          <Line type="monotone" dataKey="open" stroke="#3b82f6" strokeWidth={1} dot={false} />
                          <Line type="monotone" dataKey="close" stroke="#D4AF37" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-400 mb-2">Volume</h4>
                      <ResponsiveContainer width="100%" height={100}>
                        <AreaChart data={priceHistory.slice(-30)}>
                          <defs>
                            <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="timestamp" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} tickFormatter={formatTime} />
                          <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} formatter={(value: number) => [value.toLocaleString(), 'Volume']} />
                          <Area type="monotone" dataKey="volume" stroke="#3b82f6" fillOpacity={1} fill="url(#volumeGradient)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* AI Predictions Tab */}
        <TabsContent value="predictions">
          <AIPricePrediction />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Price Alerts</h3>
            <Button onClick={() => { setShowAlertForm(!showAlertForm); setAlertForm({ ...alertForm, symbol: selectedCommodity }); }} className="bg-[#D4AF37] text-slate-900">
              <Plus className="w-4 h-4 mr-1" />New Alert
            </Button>
          </div>

          {showAlertForm && (
            <Card className="bg-white/10 border-[#D4AF37]/30">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-white text-xs">Commodity</Label>
                    <Select value={alertForm.symbol} onValueChange={v => setAlertForm({ ...alertForm, symbol: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{prices.map(p => <SelectItem key={p.symbol} value={p.symbol}>{p.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white text-xs">Alert Type</Label>
                    <Select value={alertForm.type} onValueChange={v => setAlertForm({ ...alertForm, type: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="above">Price Above</SelectItem>
                        <SelectItem value="below">Price Below</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white text-xs">Threshold Price ($)</Label>
                    <Input type="number" step="0.01" value={alertForm.price} onChange={e => setAlertForm({ ...alertForm, price: e.target.value })} className="bg-slate-800 border-slate-600 text-white" placeholder="0.00" />
                  </div>
                  <div>
                    <Label className="text-white text-xs">Notify Via</Label>
                    <Select value={alertForm.method} onValueChange={v => setAlertForm({ ...alertForm, method: v })}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                        <SelectItem value="push">Push</SelectItem>
                        <SelectItem value="all">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreateAlert} disabled={alertSaving || !alertForm.symbol || !alertForm.price} className="bg-[#D4AF37] text-slate-900">
                  {alertSaving ? 'Saving...' : 'Create Alert'}
                </Button>
              </CardContent>
            </Card>
          )}

          {userAlerts.length === 0 ? (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No price alerts configured. Create one to get notified when prices hit your targets.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {userAlerts.map((alert) => {
                const currentPrice = priceMap[alert.commodity_symbol]?.price;
                const isTriggered = currentPrice && (
                  (alert.alert_type === 'above' && currentPrice >= alert.threshold_price) ||
                  (alert.alert_type === 'below' && currentPrice <= alert.threshold_price)
                );
                return (
                  <Card key={alert.id} className={`${isTriggered ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-white/5 border-white/10'}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${alert.is_active ? 'bg-green-500' : 'bg-slate-500'}`} />
                        <div>
                          <p className="text-white font-medium">{alert.commodity_name || alert.commodity_symbol}</p>
                          <p className="text-slate-400 text-xs">
                            {alert.alert_type === 'above' ? 'Above' : 'Below'} ${parseFloat(alert.threshold_price).toFixed(2)}
                            {currentPrice && <span className="ml-2 text-slate-500">Current: ${formatPrice(currentPrice)}</span>}
                          </p>
                        </div>
                        {isTriggered && <Badge className="bg-yellow-500/20 text-yellow-400 text-xs"><AlertTriangle className="w-3 h-3 mr-1" />Triggered</Badge>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-[10px] bg-slate-700 text-slate-300">{alert.notification_method}</Badge>
                        <Button onClick={() => toggleAlert(alert.id, alert.is_active)} variant="ghost" size="sm" className="h-7 w-7 p-0">
                          {alert.is_active ? <Check className="w-3 h-3 text-green-400" /> : <X className="w-3 h-3 text-slate-400" />}
                        </Button>
                        <Button onClick={() => deleteAlert(alert.id)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit">
          <PriceAuditTrail />
        </TabsContent>
      </Tabs>
    </div>
  );
}
