import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Package, Gavel, Bell, 
  Wallet, ArrowRight, Fuel, Droplets, Flame, Zap,
  Clock, CheckCircle, AlertTriangle, Ship
} from 'lucide-react';

interface MobileDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenWallet: () => void;
}

interface DashboardStats {
  activeOrders: number;
  pendingInvoices: number;
  activeAuctions: number;
  priceAlerts: number;
  walletBalance: number;
}

interface PriceData {
  name: string;
  price: number;
  change: number;
  icon: any;
}

export default function MobileDashboard({ onNavigate, onOpenWallet }: MobileDashboardProps) {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeOrders: 0,
    pendingInvoices: 0,
    activeAuctions: 0,
    priceAlerts: 0,
    walletBalance: 0
  });
  const [prices, setPrices] = useState<PriceData[]>([
    { name: 'Brent Crude', price: 82.45, change: 1.23, icon: Fuel },
    { name: 'WTI', price: 78.92, change: -0.45, icon: Droplets },
    { name: 'Natural Gas', price: 2.89, change: 2.15, icon: Flame },
    { name: 'Jet Fuel', price: 2.45, change: 0.87, icon: Zap },
  ]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchPrices();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch orders count
      const { count: ordersCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'processing', 'shipped']);

      // Fetch pending invoices
      const { count: invoicesCount } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch active auctions
      const { count: auctionsCount } = await supabase
        .from('auctions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch price alerts
      const { count: alertsCount } = await supabase
        .from('price_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Fetch recent activity
      const { data: recentOrders } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        activeOrders: ordersCount || 0,
        pendingInvoices: invoicesCount || 0,
        activeAuctions: auctionsCount || 0,
        priceAlerts: alertsCount || 0,
        walletBalance: 125000
      });

      setRecentActivity(recentOrders || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrices = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('commodity-prices');
      if (data?.prices) {
        const mappedPrices = [
          { name: 'Brent Crude', price: data.prices.brent || 82.45, change: data.prices.brentChange || 1.23, icon: Fuel },
          { name: 'WTI', price: data.prices.wti || 78.92, change: data.prices.wtiChange || -0.45, icon: Droplets },
          { name: 'Natural Gas', price: data.prices.naturalGas || 2.89, change: data.prices.naturalGasChange || 2.15, icon: Flame },
          { name: 'Jet Fuel', price: data.prices.jetFuel || 2.45, change: data.prices.jetFuelChange || 0.87, icon: Zap },
        ];
        setPrices(mappedPrices);
      }
    } catch (error) {
      console.error('Error fetching prices:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'shipped': return <Ship className="w-4 h-4 text-blue-400" />;
      default: return <AlertTriangle className="w-4 h-4 text-orange-400" />;
    }
  };

  const quickActions = [
    { label: 'New Order', icon: Package, color: 'from-blue-500 to-blue-600', tab: 'products' },
    { label: 'Bid Now', icon: Gavel, color: 'from-[#D4AF37] to-[#B8941F]', tab: 'auctions' },
    { label: 'Alerts', icon: Bell, color: 'from-purple-500 to-purple-600', tab: 'alerts' },
    { label: 'Wallet', icon: Wallet, color: 'from-green-500 to-green-600', action: onOpenWallet },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-36">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-900/80 to-blue-900/80 rounded-2xl p-4 border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm">Welcome back,</p>
            <h2 className="text-xl font-bold text-white">
              {userProfile?.full_name || 'Trader'}
            </h2>
            <Badge className="mt-1 bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/50">
              {userProfile?.role?.replace('_', ' ') || 'User'}
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Wallet Balance</p>
            <p className="text-2xl font-bold text-[#D4AF37]">
              ${stats.walletBalance.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={() => action.action ? action.action() : onNavigate(action.tab)}
              className={`bg-gradient-to-br ${action.color} p-3 rounded-xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform shadow-lg`}
            >
              <Icon className="w-5 h-5 text-white" />
              <span className="text-white text-xs font-medium">{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* Live Prices */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Live Prices</h3>
            <button 
              onClick={() => onNavigate('commodities')}
              className="text-[#00D4FF] text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {prices.map((price, index) => {
              const Icon = price.icon;
              const isPositive = price.change >= 0;
              return (
                <div 
                  key={index}
                  className="bg-slate-800/50 rounded-xl p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="w-4 h-4 text-[#D4AF37]" />
                    <span className="text-white/70 text-xs">{price.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white font-bold">${price.price.toFixed(2)}</span>
                    <div className={`flex items-center gap-0.5 text-xs ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {Math.abs(price.change).toFixed(2)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button 
          onClick={() => onNavigate('orders')}
          className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-left active:scale-98 transition-transform"
        >
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 text-blue-400" />
            <ArrowRight className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.activeOrders}</p>
          <p className="text-white/60 text-sm">Active Orders</p>
        </button>

        <button 
          onClick={() => onNavigate('invoices')}
          className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-left active:scale-98 transition-transform"
        >
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <ArrowRight className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.pendingInvoices}</p>
          <p className="text-white/60 text-sm">Pending Invoices</p>
        </button>

        <button 
          onClick={() => onNavigate('auctions')}
          className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-left active:scale-98 transition-transform"
        >
          <div className="flex items-center justify-between mb-2">
            <Gavel className="w-5 h-5 text-[#D4AF37]" />
            <ArrowRight className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.activeAuctions}</p>
          <p className="text-white/60 text-sm">Active Auctions</p>
        </button>

        <button 
          onClick={() => onNavigate('alerts')}
          className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-left active:scale-98 transition-transform"
        >
          <div className="flex items-center justify-between mb-2">
            <Bell className="w-5 h-5 text-purple-400" />
            <ArrowRight className="w-4 h-4 text-white/40" />
          </div>
          <p className="text-2xl font-bold text-white">{stats.priceAlerts}</p>
          <p className="text-white/60 text-sm">Price Alerts</p>
        </button>
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Recent Activity</h3>
            <button 
              onClick={() => onNavigate('orders')}
              className="text-[#00D4FF] text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.slice(0, 4).map((order, index) => (
                <div 
                  key={order.id || index}
                  className="flex items-center justify-between bg-slate-800/50 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <p className="text-white text-sm font-medium">
                        {order.order_number || `Order #${index + 1}`}
                      </p>
                      <p className="text-white/50 text-xs">
                        {order.product_type || 'Petroleum Product'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white text-sm font-medium">
                      ${(order.total_amount || 0).toLocaleString()}
                    </p>
                    <Badge variant="outline" className="text-xs capitalize">
                      {order.status || 'pending'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Package className="w-10 h-10 text-white/30 mx-auto mb-2" />
              <p className="text-white/50 text-sm">No recent activity</p>
              <button 
                onClick={() => onNavigate('products')}
                className="mt-2 text-[#D4AF37] text-sm font-medium"
              >
                Place your first order
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Summary */}
      <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#D4AF37]/30 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Market is Up</h3>
              <p className="text-white/70 text-sm">Brent crude up 1.23% today</p>
            </div>
            <button 
              onClick={() => onNavigate('commodities')}
              className="bg-[#D4AF37] text-slate-900 px-4 py-2 rounded-lg font-semibold text-sm"
            >
              Trade Now
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
