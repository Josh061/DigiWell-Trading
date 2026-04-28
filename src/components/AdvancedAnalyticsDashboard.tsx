import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  BarChart3, TrendingUp, DollarSign, Users, Globe, CreditCard,
  Download, Calendar, RefreshCw, FileText, Loader2, ArrowUpRight,
  ArrowDownRight, Package, MapPin
} from 'lucide-react';

interface AnalyticsData {
  transactionVolume: { date: string; count: number; amount: number }[];
  revenueByCategory: { category: string; revenue: number; count: number }[];
  customerAcquisition: { date: string; newCustomers: number; totalCustomers: number }[];
  geographicDistribution: { country: string; count: number; revenue: number }[];
  paymentMethods: { method: string; count: number; percentage: number }[];
  topProducts: { product: string; quantity: number; revenue: number }[];
  summary: {
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
    totalCustomers: number;
    conversionRate: number;
  };
}

const COLORS = ['#D4AF37', '#3b82f6', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899'];

export default function AdvancedAnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const now = new Date();
    let start: Date;
    
    switch (dateRange) {
      case '7d': start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case '30d': start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      case '90d': start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); break;
      case '1y': start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); break;
      default: start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  }, [dateRange]);

  const loadAnalytics = useCallback(async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('analytics-reports', {
        body: { action: 'get-analytics', startDate, endDate }
      });
      
      if (error) throw error;
      if (data?.data) setAnalytics(data.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const exportToCSV = async (reportType: string) => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('analytics-reports', {
        body: { action: 'export', startDate, endDate, reportType, format: 'csv' }
      });
      
      if (error) throw error;
      
      const blob = new Blob([data], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${reportType}-${startDate}-to-${endDate}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    setExporting(true);
    try {
      // Create PDF content
      const pdfContent = generatePDFContent();
      const blob = new Blob([pdfContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window for printing
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('PDF export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const generatePDFContent = () => {
    if (!analytics) return '';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report - ${startDate} to ${endDate}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1a1a2e; }
          h1 { color: #D4AF37; border-bottom: 2px solid #D4AF37; padding-bottom: 10px; }
          h2 { color: #1a1a2e; margin-top: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
          .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
          .summary-value { font-size: 24px; font-weight: bold; color: #1a1a2e; }
          .summary-label { font-size: 12px; color: #64748b; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          th { background: #f1f5f9; font-weight: 600; }
          .footer { margin-top: 40px; text-align: center; color: #64748b; font-size: 12px; }
        </style>
      </head>
      <body>
        <h1>DigiWell Trading - Analytics Report</h1>
        <p>Period: ${startDate} to ${endDate}</p>
        
        <h2>Executive Summary</h2>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">$${analytics.summary.totalRevenue.toLocaleString()}</div>
            <div class="summary-label">Total Revenue</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${analytics.summary.totalTransactions.toLocaleString()}</div>
            <div class="summary-label">Total Transactions</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">$${analytics.summary.averageOrderValue.toLocaleString()}</div>
            <div class="summary-label">Average Order Value</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${analytics.summary.totalCustomers.toLocaleString()}</div>
            <div class="summary-label">Total Customers</div>
          </div>
        </div>
        
        <h2>Revenue by Category</h2>
        <table>
          <thead>
            <tr><th>Category</th><th>Revenue</th><th>Transactions</th></tr>
          </thead>
          <tbody>
            ${analytics.revenueByCategory.map(c => `
              <tr>
                <td>${c.category}</td>
                <td>$${c.revenue.toLocaleString()}</td>
                <td>${c.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h2>Geographic Distribution</h2>
        <table>
          <thead>
            <tr><th>Country</th><th>Orders</th><th>Revenue</th></tr>
          </thead>
          <tbody>
            ${analytics.geographicDistribution.map(g => `
              <tr>
                <td>${g.country}</td>
                <td>${g.count}</td>
                <td>$${g.revenue.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <h2>Payment Methods</h2>
        <table>
          <thead>
            <tr><th>Method</th><th>Count</th><th>Percentage</th></tr>
          </thead>
          <tbody>
            ${analytics.paymentMethods.map(p => `
              <tr>
                <td>${p.method}</td>
                <td>${p.count}</td>
                <td>${p.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleString()} | DigiWell Trading Platform</p>
        </div>
      </body>
      </html>
    `;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  if (loading && !analytics) {
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
          <h2 className="text-2xl font-bold text-white">Advanced Analytics Dashboard</h2>
          <p className="text-slate-400">Comprehensive business intelligence and reporting</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white">
              <Calendar className="w-4 h-4 mr-2" />
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
                className="bg-white/10 border-white/20 text-white w-36"
              />
              <span className="text-white">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/10 border-white/20 text-white w-36"
              />
            </div>
          )}
          
          <Button onClick={loadAnalytics} variant="outline" size="icon" className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <div className="flex gap-2">
            <Button onClick={() => exportToCSV('all')} variant="outline" className="border-white/20 text-white hover:bg-white/10" disabled={exporting}>
              <FileText className="w-4 h-4 mr-2" />Excel/CSV
            </Button>
            <Button onClick={exportToPDF} className="bg-[#D4AF37] text-slate-900 hover:bg-[#c9a432]" disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              PDF Report
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <DollarSign className="w-8 h-8 text-green-400" />
                <span className="text-green-400 flex items-center text-sm">
                  <ArrowUpRight className="w-4 h-4" />12.5%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatCurrency(analytics.summary.totalRevenue)}</div>
                <div className="text-sm text-green-300">Total Revenue</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Package className="w-8 h-8 text-blue-400" />
                <span className="text-blue-400 flex items-center text-sm">
                  <ArrowUpRight className="w-4 h-4" />8.3%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatNumber(analytics.summary.totalTransactions)}</div>
                <div className="text-sm text-blue-300">Transactions</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <BarChart3 className="w-8 h-8 text-purple-400" />
                <span className="text-purple-400 flex items-center text-sm">
                  <ArrowUpRight className="w-4 h-4" />3.2%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatCurrency(analytics.summary.averageOrderValue)}</div>
                <div className="text-sm text-purple-300">Avg Order Value</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/10 border-[#D4AF37]/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="w-8 h-8 text-[#D4AF37]" />
                <span className="text-[#D4AF37] flex items-center text-sm">
                  <ArrowUpRight className="w-4 h-4" />15.7%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{formatNumber(analytics.summary.totalCustomers)}</div>
                <div className="text-sm text-[#D4AF37]">Total Customers</div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border-cyan-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-8 h-8 text-cyan-400" />
                <span className="text-cyan-400 flex items-center text-sm">
                  <ArrowDownRight className="w-4 h-4" />2.1%
                </span>
              </div>
              <div className="mt-2">
                <div className="text-2xl font-bold text-white">{analytics.summary.conversionRate}%</div>
                <div className="text-sm text-cyan-300">Conversion Rate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Overview
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Revenue
          </TabsTrigger>
          <TabsTrigger value="customers" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Customers
          </TabsTrigger>
          <TabsTrigger value="geographic" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Geographic
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Payments
          </TabsTrigger>
        </TabsList>

        {analytics && (
          <>
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transaction Volume Trend */}
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                      Transaction Volume Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={analytics.transactionVolume}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          labelStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#D4AF37" fillOpacity={1} fill="url(#colorAmount)" />
                        <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Revenue by Category */}
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      Revenue by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.revenueByCategory} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <YAxis dataKey="category" type="category" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} width={80} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Bar dataKey="revenue" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Payment Methods Pie Chart */}
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-purple-400" />
                      Payment Method Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.paymentMethods}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="count"
                          nameKey="method"
                          label={({ method, percentage }) => `${method}: ${percentage}%`}
                          labelLine={false}
                        >
                          {analytics.paymentMethods.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap justify-center gap-3 mt-4">
                      {analytics.paymentMethods.map((method, index) => (
                        <div key={method.method} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          <span className="text-sm text-slate-300">{method.method}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Geographic Distribution */}
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      Geographic Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={analytics.geographicDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="revenue"
                          nameKey="country"
                          label={({ country, percent }) => `${country}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {analytics.geographicDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Revenue Tab */}
            <TabsContent value="revenue" className="space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Revenue Trend Over Time</CardTitle>
                    <Button onClick={() => exportToCSV('revenue')} variant="outline" size="sm" className="border-white/20 text-white">
                      <Download className="w-4 h-4 mr-2" />Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <LineChart data={analytics.transactionVolume}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                          formatter={(value: number) => formatCurrency(value)}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="amount" name="Revenue" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="text-white">Top Products by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.topProducts.map((product, index) => (
                        <div key={product.product} className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] font-bold">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-white font-medium">{product.product}</span>
                              <span className="text-green-400 font-bold">{formatCurrency(product.revenue)}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-[#D4AF37] to-[#f59e0b] rounded-full"
                                style={{ width: `${(product.revenue / analytics.topProducts[0].revenue) * 100}%` }}
                              />
                            </div>
                            <div className="text-xs text-slate-400 mt-1">{formatNumber(product.quantity)} units sold</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Customers Tab */}
            <TabsContent value="customers" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">Customer Acquisition Trend</CardTitle>
                  <Button onClick={() => exportToCSV('customers')} variant="outline" size="sm" className="border-white/20 text-white">
                    <Download className="w-4 h-4 mr-2" />Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <AreaChart data={analytics.customerAcquisition}>
                      <defs>
                        <linearGradient id="colorCustomers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="totalCustomers" name="Total Customers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorCustomers)" />
                      <Bar dataKey="newCustomers" name="New Customers" fill="#22c55e" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Geographic Tab */}
            <TabsContent value="geographic" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Orders by Country
                  </CardTitle>
                  <Button onClick={() => exportToCSV('geographic')} variant="outline" size="sm" className="border-white/20 text-white">
                    <Download className="w-4 h-4 mr-2" />Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={analytics.geographicDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="country" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        />
                        <Legend />
                        <Bar dataKey="count" name="Orders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="revenue" name="Revenue" fill="#D4AF37" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    <div className="space-y-3">
                      {analytics.geographicDistribution.map((country, index) => (
                        <div key={country.country} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS[index % COLORS.length] + '30' }}>
                              <Globe className="w-4 h-4" style={{ color: COLORS[index % COLORS.length] }} />
                            </div>
                            <div>
                              <div className="text-white font-medium">{country.country}</div>
                              <div className="text-xs text-slate-400">{country.count} orders</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-green-400 font-bold">{formatCurrency(country.revenue)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Payments Tab */}
            <TabsContent value="payments" className="space-y-6">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-white">Payment Method Analysis</CardTitle>
                  <Button onClick={() => exportToCSV('payments')} variant="outline" size="sm" className="border-white/20 text-white">
                    <Download className="w-4 h-4 mr-2" />Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <PieChart>
                        <Pie
                          data={analytics.paymentMethods}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="method"
                        >
                          {analytics.paymentMethods.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    <div className="space-y-4">
                      {analytics.paymentMethods.map((method, index) => (
                        <div key={method.method} className="p-4 bg-white/5 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                              <span className="text-white font-medium">{method.method}</span>
                            </div>
                            <span className="text-[#D4AF37] font-bold">{method.percentage}%</span>
                          </div>
                          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${method.percentage}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            />
                          </div>
                          <div className="text-xs text-slate-400 mt-2">{formatNumber(method.count)} transactions</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
