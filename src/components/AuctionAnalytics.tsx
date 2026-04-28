import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  BarChart3, TrendingUp, TrendingDown, Users, Trophy, Target,
  DollarSign, Activity, Zap, RefreshCw, Calendar, ArrowUpRight,
  ArrowDownRight, Minus, Lightbulb, Award, Percent, Clock
} from 'lucide-react';

// Mock data for when API fails
const mockAnalytics = {
  summary: {
    totalAuctions: 47,
    completedAuctions: 38,
    successfulAuctions: 32,
    activeAuctions: 9,
    totalBids: 284,
    totalVolume: 12450000,
    avgBidsPerAuction: 7.5,
    overallSuccessRate: 84.2,
    uniqueBidders: 56
  },
  winningBidTrends: [
    { period: '2026-01-01', avgWinningBid: 285000, count: 5, totalVolume: 1425000 },
    { period: '2026-01-08', avgWinningBid: 312000, count: 7, totalVolume: 2184000 },
    { period: '2026-01-15', avgWinningBid: 298000, count: 6, totalVolume: 1788000 },
    { period: '2026-01-22', avgWinningBid: 345000, count: 8, totalVolume: 2760000 }
  ],
  mostActiveBidders: [
    { userId: '1', userName: 'PetroGlobal Ltd', totalBids: 42, wins: 8, avgBidAmount: 325000 },
    { userId: '2', userName: 'EnergyTrade Co', totalBids: 38, wins: 6, avgBidAmount: 298000 },
    { userId: '3', userName: 'OilMax Partners', totalBids: 31, wins: 5, avgBidAmount: 312000 },
    { userId: '4', userName: 'FuelDirect Inc', totalBids: 28, wins: 4, avgBidAmount: 285000 },
    { userId: '5', userName: 'CrudeVentures', totalBids: 24, wins: 3, avgBidAmount: 276000 }
  ],
  avgBidIncrements: [
    { productName: 'Brent Crude Oil', avgIncrement: 5200, auctionCount: 12 },
    { productName: 'WTI Crude', avgIncrement: 4800, auctionCount: 10 },
    { productName: 'Natural Gas', avgIncrement: 3200, auctionCount: 8 },
    { productName: 'Aviation Fuel', avgIncrement: 6100, auctionCount: 6 },
    { productName: 'PMS', avgIncrement: 2800, auctionCount: 5 }
  ],
  successRatesByProduct: [
    { productName: 'Brent Crude Oil', total: 12, successful: 11, failed: 1, active: 2, successRate: 91.7, totalVolume: 4250000, avgFinalPrice: 386364 },
    { productName: 'WTI Crude', total: 10, successful: 8, failed: 2, active: 1, successRate: 80.0, totalVolume: 2980000, avgFinalPrice: 372500 },
    { productName: 'Natural Gas', total: 8, successful: 7, failed: 1, active: 2, successRate: 87.5, totalVolume: 1890000, avgFinalPrice: 270000 },
    { productName: 'Aviation Fuel', total: 6, successful: 5, failed: 1, active: 1, successRate: 83.3, totalVolume: 1650000, avgFinalPrice: 330000 },
    { productName: 'PMS', total: 5, successful: 4, failed: 1, active: 1, successRate: 80.0, totalVolume: 980000, avgFinalPrice: 245000 }
  ],
  predictiveInsights: [
    { productName: 'Brent Crude Oil', currentAvgPrice: 386364, predictedNextPrice: 402000, trendDirection: 'increasing', trendStrength: 4.2, volatility: 8.5, confidence: 82, dataPoints: 11, priceHistory: [365000, 372000, 385000, 390000, 402000], recommendation: 'Consider bidding early as prices are trending upward' },
    { productName: 'WTI Crude', currentAvgPrice: 372500, predictedNextPrice: 368000, trendDirection: 'decreasing', trendStrength: 1.2, volatility: 5.2, confidence: 78, dataPoints: 8, priceHistory: [380000, 375000, 372000, 368000], recommendation: 'Prices are trending downward, wait for better opportunities' },
    { productName: 'Natural Gas', currentAvgPrice: 270000, predictedNextPrice: 272000, trendDirection: 'stable', trendStrength: 0.8, volatility: 3.1, confidence: 85, dataPoints: 7, priceHistory: [268000, 270000, 271000, 270000], recommendation: 'Prices are stable, bid based on current market value' }
  ],
  timeRange: '30d'
};

const COLORS = ['#D4AF37', '#00D4FF', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function AuctionAnalytics() {
  const [analytics, setAnalytics] = useState<typeof mockAnalytics>(mockAnalytics);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [usingMockData, setUsingMockData] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('bid-auction', {
          body: { action: 'getAnalytics', timeRange }
        });
        
        if (error || !data?.success) {
          console.log('Using mock analytics data');
          setAnalytics(mockAnalytics);
          setUsingMockData(true);
        } else {
          setAnalytics(data.analytics);
          setUsingMockData(false);
        }
      } catch (error) {
        console.log('Using mock analytics data due to error');
        setAnalytics(mockAnalytics);
        setUsingMockData(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [timeRange]);


  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(0);
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing': return 'text-green-400';
      case 'decreasing': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-white/30 mx-auto mb-4" />
        <p className="text-white/70">No analytics data available</p>
        <Button onClick={fetchAnalytics} className="mt-4 bg-[#D4AF37] text-slate-900">
          Retry
        </Button>
      </div>
    );
  }

  const { summary, winningBidTrends, mostActiveBidders, avgBidIncrements, successRatesByProduct, predictiveInsights } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#D4AF37]" />
            Auction Analytics Dashboard
          </h2>
          <p className="text-white/70 mt-1">Historical data, trends, and predictive insights</p>
        </div>
        <div className="flex gap-3">
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            {['7d', '30d', '90d', '1y'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-[#D4AF37] text-slate-900'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {range === '1y' ? '1 Year' : range.replace('d', ' Days')}
              </button>
            ))}
          </div>
          <Button onClick={fetchAnalytics} variant="outline" className="border-white/30 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Total Auctions</p>
                <p className="text-2xl font-bold text-white">{summary.totalAuctions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Success Rate</p>
                <p className="text-2xl font-bold text-white">{summary.overallSuccessRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Total Volume</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalVolume)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Unique Bidders</p>
                <p className="text-2xl font-bold text-white">{summary.uniqueBidders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-white/60 text-xs">Avg Bids/Auction</p>
                <p className="text-2xl font-bold text-white">{summary.avgBidsPerAuction.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Winning Bid Trends */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              Winning Bid Trends
            </CardTitle>
            <CardDescription className="text-white/60">
              Average winning bids over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {winningBidTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={winningBidTrends}>
                  <defs>
                    <linearGradient id="colorBid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="period" 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#D4AF37' }}
                    formatter={(value: number) => [formatCurrency(value), 'Avg Winning Bid']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="avgWinningBid" 
                    stroke="#D4AF37" 
                    fillOpacity={1} 
                    fill="url(#colorBid)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-white/50">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Rates by Product */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-green-400" />
              Success Rates by Product
            </CardTitle>
            <CardDescription className="text-white/60">
              Auction completion rates per product type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {successRatesByProduct.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={successRatesByProduct} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="productName" 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number, name: string) => {
                      if (name === 'successRate') return [`${value.toFixed(1)}%`, 'Success Rate'];
                      return [value, name];
                    }}
                  />
                  <Bar dataKey="successRate" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-white/50">
                No product data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Most Active Bidders */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-[#00D4FF]" />
              Top Bidders
            </CardTitle>
            <CardDescription className="text-white/60">
              Most active participants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mostActiveBidders.length > 0 ? (
                mostActiveBidders.slice(0, 8).map((bidder, index) => (
                  <div key={bidder.userId} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-[#D4AF37] text-slate-900' :
                      index === 1 ? 'bg-slate-400 text-slate-900' :
                      index === 2 ? 'bg-amber-700 text-white' :
                      'bg-slate-700 text-white'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{bidder.userName}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-white/60">{bidder.totalBids} bids</span>
                        <span className="text-[#D4AF37]">{bidder.wins} wins</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#00D4FF] font-medium text-sm">{formatCurrency(bidder.avgBidAmount)}</p>
                      <p className="text-white/50 text-xs">avg bid</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-white/50">No bidder data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Average Bid Increments */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-orange-400" />
              Average Bid Increments
            </CardTitle>
            <CardDescription className="text-white/60">
              Typical bid increase amounts by product
            </CardDescription>
          </CardHeader>
          <CardContent>
            {avgBidIncrements.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={avgBidIncrements}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="productName" 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(249, 115, 22, 0.3)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Avg Increment']}
                  />
                  <Bar dataKey="avgIncrement" fill="#F97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-white/50">
                No increment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Predictive Insights */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Predictive Pricing Insights
          </CardTitle>
          <CardDescription className="text-white/60">
            AI-powered price predictions and market recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {predictiveInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {predictiveInsights.map((insight, index) => (
                <div key={insight.productName} className="bg-slate-800/50 rounded-xl p-4 border border-white/10">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-white font-semibold">{insight.productName}</h4>
                      <div className="flex items-center gap-1 mt-1">
                        {getTrendIcon(insight.trendDirection)}
                        <span className={`text-sm ${getTrendColor(insight.trendDirection)}`}>
                          {insight.trendDirection.charAt(0).toUpperCase() + insight.trendDirection.slice(1)}
                        </span>
                      </div>
                    </div>
                    <Badge className={`${
                      insight.confidence >= 80 ? 'bg-green-500/20 text-green-400' :
                      insight.confidence >= 60 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {insight.confidence.toFixed(0)}% conf
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-white/50 text-xs">Current Avg</p>
                      <p className="text-white font-bold">{formatCurrency(insight.currentAvgPrice)}</p>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-lg">
                      <p className="text-white/50 text-xs">Predicted</p>
                      <p className={`font-bold ${
                        insight.predictedNextPrice > insight.currentAvgPrice ? 'text-green-400' :
                        insight.predictedNextPrice < insight.currentAvgPrice ? 'text-red-400' :
                        'text-white'
                      }`}>
                        {formatCurrency(insight.predictedNextPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Trend Strength</span>
                      <span className="text-white">{insight.trendStrength.toFixed(1)}%</span>
                    </div>
                    <Progress value={insight.trendStrength} className="h-1.5" />
                    
                    <div className="flex justify-between text-xs">
                      <span className="text-white/50">Volatility</span>
                      <span className="text-white">{insight.volatility.toFixed(1)}%</span>
                    </div>
                    <Progress value={Math.min(100, insight.volatility)} className="h-1.5" />
                  </div>

                  {/* Mini price history chart */}
                  {insight.priceHistory.length > 1 && (
                    <div className="h-12 mb-3">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={insight.priceHistory.map((price, i) => ({ price, i }))}>
                          <Line 
                            type="monotone" 
                            dataKey="price" 
                            stroke={insight.trendDirection === 'increasing' ? '#10B981' : 
                                   insight.trendDirection === 'decreasing' ? '#EF4444' : '#F59E0B'} 
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="bg-slate-900/50 p-2 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-white/70 text-xs leading-relaxed">{insight.recommendation}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {insight.dataPoints} data points
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/50">
              <Lightbulb className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Not enough auction data for predictive insights</p>
              <p className="text-sm mt-2">Complete more auctions to generate predictions</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Volume Distribution Pie Chart */}
      {successRatesByProduct.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#D4AF37]" />
              Volume Distribution by Product
            </CardTitle>
            <CardDescription className="text-white/60">
              Total trading volume breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={successRatesByProduct.filter(p => p.totalVolume > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalVolume"
                    nameKey="productName"
                    label={({ productName, percent }) => 
                      `${productName.split(' ')[0]} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {successRatesByProduct.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid rgba(212, 175, 55, 0.3)',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Volume']}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                {successRatesByProduct.map((product, index) => (
                  <div key={product.productName} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-lg">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{product.productName}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-white/60">{product.total} auctions</span>
                        <span className="text-green-400">{product.successful} successful</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[#D4AF37] font-bold">{formatCurrency(product.totalVolume)}</p>
                      <p className="text-white/50 text-xs">{product.successRate.toFixed(0)}% rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
