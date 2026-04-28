import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  History, Search, Download, Filter, Calendar, 
  TrendingUp, TrendingDown, FileText, Loader2, RefreshCw
} from 'lucide-react';

interface Trade {
  id: string;
  product_name: string;
  product_code: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  service_fee: number;
  final_amount: number;
  status: string;
  payment_method: string;
  created_at: string;
}

export default function TradingHistory() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({
    totalTrades: 0,
    totalVolume: 0,
    totalFees: 0,
    avgTradeSize: 0
  });

  const fetchTrades = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('allocations')
        .select(`
          id,
          allocated_quantity,
          unit_price,
          total_amount,
          service_fee,
          final_amount,
          status,
          created_at,
          products (name, code)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        let startDate: Date;
        
        switch (dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
          case 'year':
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
          default:
            startDate = new Date(0);
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedTrades: Trade[] = (data || []).map((item: any) => ({
        id: item.id,
        product_name: item.products?.name || 'Unknown',
        product_code: item.products?.code || 'N/A',
        quantity: item.allocated_quantity,
        unit_price: item.unit_price,
        total_amount: item.total_amount,
        service_fee: item.service_fee,
        final_amount: item.final_amount,
        status: item.status,
        payment_method: 'N/A',
        created_at: item.created_at
      }));

      setTrades(formattedTrades);

      // Calculate stats
      const totalVolume = formattedTrades.reduce((sum, t) => sum + (t.total_amount || 0), 0);
      const totalFees = formattedTrades.reduce((sum, t) => sum + (t.service_fee || 0), 0);
      
      setStats({
        totalTrades: formattedTrades.length,
        totalVolume,
        totalFees,
        avgTradeSize: formattedTrades.length > 0 ? totalVolume / formattedTrades.length : 0
      });
    } catch (err) {
      console.error('Error fetching trades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrades();
  }, [user, statusFilter, dateFilter]);

  const filteredTrades = trades.filter(trade =>
    trade.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    trade.product_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string }> = {
      delivered: { bg: 'bg-green-500/20', text: 'text-green-400' },
      paid: { bg: 'bg-green-500/20', text: 'text-green-400' },
      in_delivery: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
      allocated: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
      payment_pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
      cancelled: { bg: 'bg-red-500/20', text: 'text-red-400' }
    };
    
    const config = statusConfig[status] || { bg: 'bg-slate-500/20', text: 'text-slate-400' };
    return <Badge className={`${config.bg} ${config.text}`}>{status.replace('_', ' ')}</Badge>;
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Product', 'Code', 'Quantity', 'Unit Price', 'Total', 'Fee', 'Final', 'Status'];
    const rows = filteredTrades.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.product_name,
      t.product_code,
      t.quantity,
      t.unit_price,
      t.total_amount,
      t.service_fee,
      t.final_amount,
      t.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="w-6 h-6 text-[#D4AF37]" />
            Trading History
          </h2>
          <p className="text-slate-400 text-sm">View your complete trading activity</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={fetchTrades}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-[#00D4FF] text-[#00D4FF]"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={exportToCSV}
            variant="outline"
            size="sm"
            className="border-[#D4AF37] text-[#D4AF37]"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total Trades</div>
                <div className="text-xl font-bold text-white">{stats.totalTrades}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total Volume</div>
                <div className="text-xl font-bold text-white">${stats.totalVolume.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total Fees</div>
                <div className="text-xl font-bold text-white">${stats.totalFees.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Avg Trade Size</div>
                <div className="text-xl font-bold text-white">${stats.avgTradeSize.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by product name or code..."
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] bg-white/10 border-white/20 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="allocated">Allocated</SelectItem>
                <SelectItem value="payment_pending">Payment Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="in_delivery">In Delivery</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px] bg-white/10 border-white/20 text-white">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trades List */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Trade Records ({filteredTrades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <History className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No trades found</p>
              <p className="text-sm">Your trading history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrades.map(trade => (
                <div key={trade.id} className="bg-slate-800/50 rounded-lg p-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">{trade.product_code}</Badge>
                        <span className="text-white font-medium">{trade.product_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>{trade.quantity.toLocaleString()} units</span>
                        <span>@ ${trade.unit_price.toFixed(2)}</span>
                        <span>{new Date(trade.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-white font-bold">${trade.total_amount.toLocaleString()}</div>
                        <div className="text-slate-500 text-xs">
                          Fee: ${trade.service_fee.toFixed(2)}
                        </div>
                      </div>
                      {getStatusBadge(trade.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
