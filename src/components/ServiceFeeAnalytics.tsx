import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign, TrendingUp, Coins, Percent, BarChart3, PieChart,
  Download, RefreshCw, Loader2, Calendar, ArrowUp, ArrowDown,
  Fuel, Gem, Users, Zap, CreditCard, FileText
} from 'lucide-react';

import { SERVICE_FEE_RATE } from '@/lib/applicationId';

interface FeeRecord {
  id: string;
  application_id: string;
  order_number: string;
  product_name: string;
  product_code: string;
  product_type: string;
  subtotal: number;
  fee_rate: number;
  fee_amount: number;
  total_with_fee: number;
  payment_method: string;
  is_digicoin: boolean;
  fee_waived: boolean;
  currency: string;
  customer_email: string;
  customer_name: string;
  created_at: string;
}

interface MonthlyData {
  month: string;
  feeRevenue: number;
  digiCoinWaivers: number;
  totalTransactions: number;
  digiCoinTransactions: number;
}

export default function ServiceFeeAnalytics() {
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('all');
  const [stats, setStats] = useState({
    totalFeeRevenue: 0,
    totalTransactions: 0,
    avgFeePerTransaction: 0,
    petroleumFees: 0,
    rwaFees: 0,
    digiCoinWaivers: 0,
    digiCoinCount: 0,
    regularCount: 0,
    digiCoinAdoptionRate: 0,
    totalSubtotal: 0,
    feeEffectiveRate: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('service_fee_records').select('*').order('created_at', { ascending: false });

      if (timeRange !== 'all') {
        const now = new Date();
        let startDate: Date;
        switch (timeRange) {
          case '7d': startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
          case '30d': startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
          case '90d': startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
          case '1y': startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
          default: startDate = new Date(0);
        }
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      const feeRecords = data || [];
      setRecords(feeRecords);

      // Calculate stats
      const totalFeeRevenue = feeRecords.filter(r => !r.fee_waived).reduce((sum, r) => sum + Number(r.fee_amount || 0), 0);
      const digiCoinWaivers = feeRecords.filter(r => r.fee_waived || r.is_digicoin).reduce((sum, r) => sum + Number(r.subtotal || 0) * SERVICE_FEE_RATE, 0);
      const petroleumFees = feeRecords.filter(r => r.product_type === 'petroleum' && !r.fee_waived).reduce((sum, r) => sum + Number(r.fee_amount || 0), 0);
      const rwaFees = feeRecords.filter(r => r.product_type === 'rwa' && !r.fee_waived).reduce((sum, r) => sum + Number(r.fee_amount || 0), 0);
      const digiCoinCount = feeRecords.filter(r => r.is_digicoin).length;
      const regularCount = feeRecords.filter(r => !r.is_digicoin).length;
      const totalSubtotal = feeRecords.reduce((sum, r) => sum + Number(r.subtotal || 0), 0);

      setStats({
        totalFeeRevenue,
        totalTransactions: feeRecords.length,
        avgFeePerTransaction: feeRecords.length > 0 ? totalFeeRevenue / feeRecords.filter(r => !r.fee_waived).length || 0 : 0,
        petroleumFees,
        rwaFees,
        digiCoinWaivers,
        digiCoinCount,
        regularCount,
        digiCoinAdoptionRate: feeRecords.length > 0 ? (digiCoinCount / feeRecords.length) * 100 : 0,
        totalSubtotal,
        feeEffectiveRate: totalSubtotal > 0 ? (totalFeeRevenue / totalSubtotal) * 100 : 0,
      });

      // Calculate monthly data
      const monthMap: Record<string, MonthlyData> = {};
      feeRecords.forEach(r => {
        const date = new Date(r.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { month: monthKey, feeRevenue: 0, digiCoinWaivers: 0, totalTransactions: 0, digiCoinTransactions: 0 };
        }
        monthMap[monthKey].totalTransactions++;
        if (r.is_digicoin) {
          monthMap[monthKey].digiCoinTransactions++;
          monthMap[monthKey].digiCoinWaivers += Number(r.subtotal || 0) * SERVICE_FEE_RATE;
        } else {
          monthMap[monthKey].feeRevenue += Number(r.fee_amount || 0);
        }
      });
      setMonthlyData(Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)));

    } catch (err) {
      console.error('Failed to fetch fee data:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Date', 'Application ID', 'Order Number', 'Product', 'Type', 'Subtotal', 'Fee Rate', 'Fee Amount', 'Total', 'Payment Method', 'DigiCoin', 'Waived'];
    const rows = records.map(r => [
      new Date(r.created_at).toLocaleDateString(),
      r.application_id || '',
      r.order_number || '',
      r.product_name || '',
      r.product_type || '',
      Number(r.subtotal || 0).toFixed(2),
      (Number(r.fee_rate || 0) * 100).toFixed(2) + '%',
      Number(r.fee_amount || 0).toFixed(2),
      Number(r.total_with_fee || 0).toFixed(2),
      r.payment_method || '',
      r.is_digicoin ? 'Yes' : 'No',
      r.fee_waived ? 'Yes' : 'No',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-fee-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const maxBarValue = Math.max(...monthlyData.map(m => m.feeRevenue), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Percent className="w-7 h-7 text-[#D4AF37]" />
            Service Fee Analytics
          </h2>
          <p className="text-slate-400 text-sm mt-1">0.87% service fee revenue tracking and DigiCoin adoption analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36 bg-slate-800 border-slate-600 text-white">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
            <Download className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button onClick={fetchData} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
          <p className="text-slate-400">Loading analytics...</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <div>
                    <div className="text-[#D4AF37] text-2xl font-bold">${stats.totalFeeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-slate-400 text-xs">Total Fee Revenue</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Coins className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-green-400 text-2xl font-bold">${stats.digiCoinWaivers.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="text-slate-400 text-xs">DigiCoin Fee Waivers</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-blue-400 text-2xl font-bold">{stats.totalTransactions}</div>
                    <div className="text-slate-400 text-xs">Total Transactions</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-purple-500/30">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <Zap className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-purple-400 text-2xl font-bold">{stats.digiCoinAdoptionRate.toFixed(1)}%</div>
                    <div className="text-slate-400 text-xs">DigiCoin Adoption</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fee Revenue by Product Type + DigiCoin Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Product Type */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <PieChart className="w-5 h-5 text-[#D4AF37]" />Fee Revenue by Product Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* Petroleum */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Fuel className="w-4 h-4 text-blue-400" />
                        <span className="text-white text-sm font-medium">Petroleum Products</span>
                      </div>
                      <span className="text-blue-400 font-bold">${stats.petroleumFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all" 
                        style={{ width: `${stats.totalFeeRevenue > 0 ? (stats.petroleumFees / stats.totalFeeRevenue) * 100 : 0}%` }} />
                    </div>
                    <div className="text-slate-400 text-xs mt-1">{stats.totalFeeRevenue > 0 ? ((stats.petroleumFees / stats.totalFeeRevenue) * 100).toFixed(1) : 0}% of total</div>
                  </div>

                  {/* RWA */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Gem className="w-4 h-4 text-purple-400" />
                        <span className="text-white text-sm font-medium">Real World Assets</span>
                      </div>
                      <span className="text-purple-400 font-bold">${stats.rwaFees.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div className="bg-gradient-to-r from-purple-500 to-purple-400 h-3 rounded-full transition-all" 
                        style={{ width: `${stats.totalFeeRevenue > 0 ? (stats.rwaFees / stats.totalFeeRevenue) * 100 : 0}%` }} />
                    </div>
                    <div className="text-slate-400 text-xs mt-1">{stats.totalFeeRevenue > 0 ? ((stats.rwaFees / stats.totalFeeRevenue) * 100).toFixed(1) : 0}% of total</div>
                  </div>
                </div>

                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Effective Fee Rate</span>
                    <span className="text-[#D4AF37] font-bold">{stats.feeEffectiveRate.toFixed(3)}%</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-slate-400">Avg Fee / Transaction</span>
                    <span className="text-white font-bold">${stats.avgFeePerTransaction.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* DigiCoin vs Regular */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-lg">
                  <Coins className="w-5 h-5 text-green-400" />Fee Revenue vs DigiCoin Adoption
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4 text-center">
                    <CreditCard className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                    <div className="text-[#D4AF37] text-2xl font-bold">{stats.regularCount}</div>
                    <div className="text-slate-400 text-xs">Regular Payments</div>
                    <div className="text-slate-400 text-xs mt-1">0.87% fee charged</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                    <Coins className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-green-400 text-2xl font-bold">{stats.digiCoinCount}</div>
                    <div className="text-slate-400 text-xs">DigiCoin Payments</div>
                    <div className="text-green-400 text-xs mt-1 font-bold">0% fee (FREE)</div>
                  </div>
                </div>

                {/* Adoption Rate Visual */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-400">DigiCoin Adoption Rate</span>
                    <span className="text-green-400 font-bold">{stats.digiCoinAdoptionRate.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-6 flex overflow-hidden">
                    <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] h-6 flex items-center justify-center text-xs text-slate-900 font-bold transition-all"
                      style={{ width: `${100 - stats.digiCoinAdoptionRate}%` }}>
                      {(100 - stats.digiCoinAdoptionRate).toFixed(0)}% Regular
                    </div>
                    <div className="bg-gradient-to-r from-green-500 to-green-400 h-6 flex items-center justify-center text-xs text-slate-900 font-bold transition-all"
                      style={{ width: `${stats.digiCoinAdoptionRate}%` }}>
                      {stats.digiCoinAdoptionRate > 5 ? `${stats.digiCoinAdoptionRate.toFixed(0)}% DC` : ''}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-slate-400 text-xs mb-1">Revenue Impact of DigiCoin Adoption</div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 font-bold text-lg">-${stats.digiCoinWaivers.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    <span className="text-slate-400 text-xs">in waived fees</span>
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1">
                    If all DigiCoin users paid regular fees, total revenue would be ${(stats.totalFeeRevenue + stats.digiCoinWaivers).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends Chart */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />Monthly Fee Revenue Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No data available for the selected period</div>
              ) : (
                <div className="space-y-3">
                  {monthlyData.map((month, i) => {
                    const digiCoinRate = month.totalTransactions > 0 ? (month.digiCoinTransactions / month.totalTransactions) * 100 : 0;
                    return (
                      <div key={month.month} className="flex items-center gap-4">
                        <div className="w-20 text-slate-400 text-sm font-mono">{month.month}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 bg-slate-700 rounded-full h-5 overflow-hidden">
                              <div className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] h-5 rounded-full flex items-center px-2 transition-all"
                                style={{ width: `${maxBarValue > 0 ? (month.feeRevenue / maxBarValue) * 100 : 0}%`, minWidth: month.feeRevenue > 0 ? '40px' : '0' }}>
                                {month.feeRevenue > 0 && <span className="text-slate-900 text-[10px] font-bold whitespace-nowrap">${month.feeRevenue.toFixed(0)}</span>}
                              </div>
                            </div>
                            <span className="text-[#D4AF37] text-sm font-bold w-24 text-right">${month.feeRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-slate-500">{month.totalTransactions} txns</span>
                            <span className="text-green-400">{month.digiCoinTransactions} DigiCoin ({digiCoinRate.toFixed(0)}%)</span>
                            <span className="text-red-400">-${month.digiCoinWaivers.toFixed(2)} waived</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-400" />Recent Fee Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No fee records found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left text-slate-400 text-xs uppercase py-2 px-2">Date</th>
                        <th className="text-left text-slate-400 text-xs uppercase py-2 px-2">App ID</th>
                        <th className="text-left text-slate-400 text-xs uppercase py-2 px-2">Product</th>
                        <th className="text-left text-slate-400 text-xs uppercase py-2 px-2">Type</th>
                        <th className="text-right text-slate-400 text-xs uppercase py-2 px-2">Subtotal</th>
                        <th className="text-right text-slate-400 text-xs uppercase py-2 px-2">Fee</th>
                        <th className="text-left text-slate-400 text-xs uppercase py-2 px-2">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.slice(0, 20).map(r => (
                        <tr key={r.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-2 px-2 text-slate-300">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="py-2 px-2 text-[#D4AF37] font-mono text-xs">{r.application_id || '-'}</td>
                          <td className="py-2 px-2 text-white">{r.product_name || '-'}</td>
                          <td className="py-2 px-2">
                            <Badge className={r.product_type === 'rwa' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border-blue-500/30'}>
                              {r.product_type === 'rwa' ? 'RWA' : 'PET'}
                            </Badge>
                          </td>
                          <td className="py-2 px-2 text-white text-right">${Number(r.subtotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-2 px-2 text-right">
                            {r.fee_waived || r.is_digicoin ? (
                              <span className="text-green-400 font-bold">FREE</span>
                            ) : (
                              <span className="text-[#D4AF37]">${Number(r.fee_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            {r.is_digicoin ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">DigiCoin</Badge>
                            ) : (
                              <span className="text-slate-400 capitalize text-xs">{r.payment_method?.replace('_', ' ') || '-'}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {records.length > 20 && (
                    <p className="text-slate-500 text-xs text-center mt-3">Showing 20 of {records.length} records. Export CSV for full data.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
