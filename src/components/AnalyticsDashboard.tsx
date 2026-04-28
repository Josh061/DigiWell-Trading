import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Package, Receipt, Gavel,
  Users, Ship, AlertTriangle, Download, Calendar, RefreshCw, FileText, PieChart,
  Globe, ArrowUpRight, ArrowDownRight, Loader2
} from 'lucide-react';

interface DashboardSummary {
  orders: { total: number; revenue: number; pending: number; completed: number };
  invoices: { total: number; paid: number; pending: number; overdue: number };
  auctions: { total: number; active: number; completed: number };
  disputes: { total: number; open: number; resolved: number };
  shipments: { total: number; inTransit: number; delivered: number };
}

interface FinancialReport {
  totalRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  totalOrders: number;
  totalInvoices: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  overdueInvoicesCount: number;
  revenueByDay: Record<string, number>;
  paymentMethods: Record<string, number>;
  averageOrderValue: number;
}

interface OrderAnalytics {
  totalOrders: number;
  volumeByProduct: Record<string, { count: number; volume: number; revenue: number }>;
  ordersByStatus: Record<string, number>;
  geoDistribution: Record<string, number>;
  ordersByDay: Record<string, number>;
  completionRate: string;
}

interface AuctionAnalytics {
  totalAuctions: number;
  completedAuctions: number;
  totalBids: number;
  totalBidValue: number;
  avgBidsPerAuction: string;
  auctionsByProduct: Record<string, number>;
  bidsByDay: Record<string, number>;
  successRate: string;
}

interface ComparisonReport {
  current: { revenue: number; orders: number; avgOrderValue: number };
  previous: { revenue: number; orders: number; avgOrderValue: number };
  changes: { revenue: string; orders: string };
}

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [financialReport, setFinancialReport] = useState<FinancialReport | null>(null);
  const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics | null>(null);
  const [auctionAnalytics, setAuctionAnalytics] = useState<AuctionAnalytics | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const now = new Date();
    let start: Date;
    
    switch (dateRange) {
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, [dateRange]);

  useEffect(() => {
    if (startDate && endDate) {
      loadData();
    }
  }, [startDate, endDate, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load dashboard summary
      const { data: summaryData } = await supabase.functions.invoke('analytics-reports', {
        body: { action: 'dashboard_summary' }
      });
      if (summaryData?.summary) setSummary(summaryData.summary);

      // Load specific reports based on active tab
      if (activeTab === 'financial' || activeTab === 'overview') {
        const { data: financialData } = await supabase.functions.invoke('analytics-reports', {
          body: { action: 'financial_report', start_date: startDate, end_date: endDate }
        });
        if (financialData?.report) setFinancialReport(financialData.report);
      }

      if (activeTab === 'orders' || activeTab === 'overview') {
        const { data: orderData } = await supabase.functions.invoke('analytics-reports', {
          body: { action: 'order_analytics', start_date: startDate, end_date: endDate }
        });
        if (orderData?.report) setOrderAnalytics(orderData.report);
      }

      if (activeTab === 'auctions') {
        const { data: auctionData } = await supabase.functions.invoke('analytics-reports', {
          body: { action: 'auction_analytics', start_date: startDate, end_date: endDate }
        });
        if (auctionData?.report) setAuctionAnalytics(auctionData.report);
      }

      // Load comparison data
      const prevStart = new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime()));
      const { data: comparisonData } = await supabase.functions.invoke('analytics-reports', {
        body: {
          action: 'comparison_report',
          current_start: startDate,
          current_end: endDate,
          previous_start: prevStart.toISOString().split('T')[0],
          previous_end: startDate
        }
      });
      if (comparisonData?.comparison) setComparison(comparisonData.comparison);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (type: string) => {
    setExporting(true);
    try {
      let data: any;
      let filename: string;

      switch (type) {
        case 'financial':
          data = financialReport;
          filename = `financial-report-${startDate}-${endDate}.csv`;
          break;
        case 'orders':
          data = orderAnalytics;
          filename = `order-analytics-${startDate}-${endDate}.csv`;
          break;
        case 'auctions':
          data = auctionAnalytics;
          filename = `auction-analytics-${startDate}-${endDate}.csv`;
          break;
        default:
          data = summary;
          filename = `summary-report-${startDate}-${endDate}.csv`;
      }

      const { data: csvData } = await supabase.functions.invoke('analytics-reports', {
        body: { action: 'export_csv', report_type: type, data }
      });

      if (csvData?.csv) {
        const blob = new Blob([csvData.csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getChangeIndicator = (change: string | number) => {
    const value = typeof change === 'string' ? parseFloat(change) : change;
    if (value > 0) {
      return <span className="text-green-400 flex items-center gap-1"><ArrowUpRight className="w-4 h-4" />+{value}%</span>;
    } else if (value < 0) {
      return <span className="text-red-400 flex items-center gap-1"><ArrowDownRight className="w-4 h-4" />{value}%</span>;
    }
    return <span className="text-slate-400">0%</span>;
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data, color = '#D4AF37' }: { data: Record<string, number>; color?: string }) => {
    const entries = Object.entries(data).slice(-14);
    const maxValue = Math.max(...entries.map(([, v]) => v), 1);
    
    return (
      <div className="flex items-end gap-1 h-32">
        {entries.map(([key, value]) => (
          <div key={key} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t transition-all hover:opacity-80"
              style={{
                height: `${(value / maxValue) * 100}%`,
                backgroundColor: color,
                minHeight: value > 0 ? '4px' : '0'
              }}
              title={`${key}: ${formatNumber(value)}`}
            />
            <span className="text-[8px] text-slate-400 truncate w-full text-center">
              {key.slice(-5)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Pie chart component
  const SimplePieChart = ({ data, colors }: { data: Record<string, number>; colors: string[] }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    if (total === 0) return <div className="text-slate-400 text-center py-8">No data</div>;
    
    let currentAngle = 0;
    const entries = Object.entries(data);
    
    return (
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="w-32 h-32">
          {entries.map(([key, value], index) => {
            const percentage = (value / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            
            const x1 = 50 + 40 * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = 50 + 40 * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = 50 + 40 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
            const y2 = 50 + 40 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
            const largeArc = angle > 180 ? 1 : 0;
            
            return (
              <path
                key={key}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[index % colors.length]}
                className="hover:opacity-80 transition-opacity"
              />
            );
          })}
        </svg>
        <div className="flex flex-col gap-1">
          {entries.map(([key, value], index) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="text-white">{key}</span>
              <span className="text-slate-400">({((value / total) * 100).toFixed(1)}%)</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Analytics Dashboard</h2>
          <p className="text-slate-400">Comprehensive business intelligence and reporting</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
              <span className="text-white">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          )}
          <Button onClick={loadData} variant="outline" size="icon" className="border-white/20 text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <DollarSign className="w-8 h-8 text-green-400" />
                {comparison && getChangeIndicator(comparison.changes.revenue)}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatCurrency(summary.orders.revenue)}</div>
                <div className="text-sm text-green-300">Total Revenue</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Package className="w-8 h-8 text-blue-400" />
                {comparison && getChangeIndicator(comparison.changes.orders)}
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatNumber(summary.orders.total)}</div>
                <div className="text-sm text-blue-300">Total Orders</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <Receipt className="w-8 h-8 text-purple-400" />
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatNumber(summary.invoices.total)}</div>
                <div className="text-sm text-purple-300">Invoices</div>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {summary.invoices.overdue} overdue
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/10 border-[#D4AF37]/30">
            <CardContent className="p-4">
              <Gavel className="w-8 h-8 text-[#D4AF37]" />
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatNumber(summary.auctions.total)}</div>
                <div className="text-sm text-[#D4AF37]">Auctions</div>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {summary.auctions.active} active
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
            <CardContent className="p-4">
              <Ship className="w-8 h-8 text-cyan-400" />
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatNumber(summary.shipments.total)}</div>
                <div className="text-sm text-cyan-300">Shipments</div>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {summary.shipments.inTransit} in transit
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <BarChart3 className="w-4 h-4 mr-2" />Overview
          </TabsTrigger>
          <TabsTrigger value="financial" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <DollarSign className="w-4 h-4 mr-2" />Financial
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Package className="w-4 h-4 mr-2" />Orders
          </TabsTrigger>
          <TabsTrigger value="auctions" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Gavel className="w-4 h-4 mr-2" />Auctions
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Revenue Trend</CardTitle>
                <Button onClick={() => exportReport('financial')} variant="ghost" size="sm" className="text-white" disabled={exporting}>
                  <Download className="w-4 h-4 mr-1" />Export
                </Button>
              </CardHeader>
              <CardContent>
                {financialReport?.revenueByDay && (
                  <SimpleBarChart data={financialReport.revenueByDay} color="#22c55e" />
                )}
              </CardContent>
            </Card>

            {/* Order Volume Chart */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-white">Order Volume</CardTitle>
                <Button onClick={() => exportReport('orders')} variant="ghost" size="sm" className="text-white" disabled={exporting}>
                  <Download className="w-4 h-4 mr-1" />Export
                </Button>
              </CardHeader>
              <CardContent>
                {orderAnalytics?.ordersByDay && (
                  <SimpleBarChart data={orderAnalytics.ordersByDay} color="#3b82f6" />
                )}
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Payment Methods</CardTitle>
              </CardHeader>
              <CardContent>
                {financialReport?.paymentMethods && (
                  <SimplePieChart 
                    data={financialReport.paymentMethods} 
                    colors={['#D4AF37', '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b']}
                  />
                )}
              </CardContent>
            </Card>

            {/* Order Status */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Order Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {orderAnalytics?.ordersByStatus && (
                  <SimplePieChart 
                    data={orderAnalytics.ordersByStatus} 
                    colors={['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6']}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Comparison Cards */}
          {comparison && (
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Period Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-slate-400 mb-2">Revenue</div>
                    <div className="text-xl font-bold text-white">{formatCurrency(comparison.current.revenue)}</div>
                    <div className="text-sm text-slate-400">vs {formatCurrency(comparison.previous.revenue)}</div>
                    <div className="mt-1">{getChangeIndicator(comparison.changes.revenue)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-400 mb-2">Orders</div>
                    <div className="text-xl font-bold text-white">{formatNumber(comparison.current.orders)}</div>
                    <div className="text-sm text-slate-400">vs {formatNumber(comparison.previous.orders)}</div>
                    <div className="mt-1">{getChangeIndicator(comparison.changes.orders)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-slate-400 mb-2">Avg Order Value</div>
                    <div className="text-xl font-bold text-white">{formatCurrency(comparison.current.avgOrderValue)}</div>
                    <div className="text-sm text-slate-400">vs {formatCurrency(comparison.previous.avgOrderValue)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          {financialReport && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Total Revenue</div>
                    <div className="text-2xl font-bold text-green-400">{formatCurrency(financialReport.totalRevenue)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Paid Invoices</div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(financialReport.paidAmount)}</div>
                    <div className="text-xs text-slate-400">{financialReport.paidInvoicesCount} invoices</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Pending</div>
                    <div className="text-2xl font-bold text-yellow-400">{formatCurrency(financialReport.pendingAmount)}</div>
                    <div className="text-xs text-slate-400">{financialReport.pendingInvoicesCount} invoices</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Overdue</div>
                    <div className="text-2xl font-bold text-red-400">{formatCurrency(financialReport.overdueAmount)}</div>
                    <div className="text-xs text-slate-400">{financialReport.overdueInvoicesCount} invoices</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">Daily Revenue</CardTitle>
                  <Button onClick={() => exportReport('financial')} variant="outline" size="sm" className="border-white/20 text-white" disabled={exporting}>
                    {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
                    Export CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  <SimpleBarChart data={financialReport.revenueByDay} color="#22c55e" />
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Payment Methods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimplePieChart 
                      data={financialReport.paymentMethods} 
                      colors={['#D4AF37', '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b']}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Average Order Value</span>
                      <span className="text-white font-bold">{formatCurrency(financialReport.averageOrderValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Orders</span>
                      <span className="text-white font-bold">{formatNumber(financialReport.totalOrders)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Invoices</span>
                      <span className="text-white font-bold">{formatNumber(financialReport.totalInvoices)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Collection Rate</span>
                      <span className="text-white font-bold">
                        {financialReport.totalInvoices > 0 
                          ? ((financialReport.paidInvoicesCount / financialReport.totalInvoices) * 100).toFixed(1)
                          : 0}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-6">
          {orderAnalytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Total Orders</div>
                    <div className="text-2xl font-bold text-white">{formatNumber(orderAnalytics.totalOrders)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Completion Rate</div>
                    <div className="text-2xl font-bold text-green-400">{orderAnalytics.completionRate}%</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Product Types</div>
                    <div className="text-2xl font-bold text-white">{Object.keys(orderAnalytics.volumeByProduct).length}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Regions</div>
                    <div className="text-2xl font-bold text-white">{Object.keys(orderAnalytics.geoDistribution).length}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Daily Order Volume</CardTitle>
                    <Button onClick={() => exportReport('orders')} variant="outline" size="sm" className="border-white/20 text-white" disabled={exporting}>
                      <Download className="w-4 h-4 mr-1" />Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart data={orderAnalytics.ordersByDay} color="#3b82f6" />
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Order Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimplePieChart 
                      data={orderAnalytics.ordersByStatus} 
                      colors={['#22c55e', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4']}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Globe className="w-5 h-5" />Geographic Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimplePieChart 
                      data={orderAnalytics.geoDistribution} 
                      colors={['#D4AF37', '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444']}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Volume by Product</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(orderAnalytics.volumeByProduct).map(([product, data]) => (
                        <div key={product} className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">{product}</div>
                            <div className="text-xs text-slate-400">{data.count} orders</div>
                          </div>
                          <div className="text-right">
                            <div className="text-white">{formatNumber(data.volume)} units</div>
                            <div className="text-xs text-green-400">{formatCurrency(data.revenue)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Auctions Tab */}
        <TabsContent value="auctions" className="space-y-6">
          {auctionAnalytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Total Auctions</div>
                    <div className="text-2xl font-bold text-white">{formatNumber(auctionAnalytics.totalAuctions)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Total Bids</div>
                    <div className="text-2xl font-bold text-[#D4AF37]">{formatNumber(auctionAnalytics.totalBids)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Total Bid Value</div>
                    <div className="text-2xl font-bold text-green-400">{formatCurrency(auctionAnalytics.totalBidValue)}</div>
                  </CardContent>
                </Card>
                <Card className="bg-white/10 border-white/20">
                  <CardContent className="p-4">
                    <div className="text-sm text-slate-400">Success Rate</div>
                    <div className="text-2xl font-bold text-white">{auctionAnalytics.successRate}%</div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Daily Bid Activity</CardTitle>
                    <Button onClick={() => exportReport('auctions')} variant="outline" size="sm" className="border-white/20 text-white" disabled={exporting}>
                      <Download className="w-4 h-4 mr-1" />Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <SimpleBarChart data={auctionAnalytics.bidsByDay} color="#D4AF37" />
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Auctions by Product</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SimplePieChart 
                      data={auctionAnalytics.auctionsByProduct} 
                      colors={['#D4AF37', '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b']}
                    />
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20 col-span-1 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-white">Auction Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-[#D4AF37]">{auctionAnalytics.avgBidsPerAuction}</div>
                        <div className="text-sm text-slate-400">Avg Bids/Auction</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400">{auctionAnalytics.completedAuctions}</div>
                        <div className="text-sm text-slate-400">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-white">
                          {auctionAnalytics.totalBids > 0 
                            ? formatCurrency(auctionAnalytics.totalBidValue / auctionAnalytics.totalBids)
                            : '$0'}
                        </div>
                        <div className="text-sm text-slate-400">Avg Bid Value</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">{auctionAnalytics.successRate}%</div>
                        <div className="text-sm text-slate-400">Success Rate</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
