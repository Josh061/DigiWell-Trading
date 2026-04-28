import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useLivePrices } from '@/hooks/useLivePrices';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Briefcase, BarChart3, TrendingUp, TrendingDown, Wifi, WifiOff, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AddHoldingForm from './AddHoldingForm';
import HoldingsList from './HoldingsList';
import PortfolioSummary from './PortfolioSummary';
import PortfolioChart from './PortfolioChart';

interface Holding {
  id: string;
  commodity_symbol: string;
  commodity_name: string;
  quantity: number;
  purchase_price: number;
  current_price?: number;
  value?: number;
  pnl?: number;
  pnl_percent?: number;
  flash?: 'up' | 'down' | null;
}

export default function PortfolioTracker() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();
  const userId = 'demo-user';

  // Connect to live prices
  const { prices, priceMap, isConnected, lastUpdate, getPriceBySymbol } = useLivePrices({
    enabled: true,
    onPriceUpdate: (newPrices) => {
      // Update holdings with new prices
      setHoldings(prev => prev.map(holding => {
        const livePrice = newPrices.find(p => 
          p.symbol === holding.commodity_symbol || 
          p.id === holding.commodity_symbol
        );
        
        if (livePrice) {
          const currentPrice = livePrice.price;
          const value = holding.quantity * currentPrice;
          const cost = holding.quantity * holding.purchase_price;
          const pnl = value - cost;
          const pnl_percent = (pnl / cost) * 100;
          
          // Determine flash based on price change
          const prevPrice = holding.current_price;
          let flash: 'up' | 'down' | null = null;
          if (prevPrice && prevPrice !== currentPrice) {
            flash = currentPrice > prevPrice ? 'up' : 'down';
          }
          
          return {
            ...holding,
            current_price: currentPrice,
            value,
            pnl,
            pnl_percent,
            flash
          };
        }
        return holding;
      }));
    }
  });

  // Calculate portfolio totals with live prices
  const portfolioTotals = useMemo(() => {
    let totalValue = 0;
    let totalCost = 0;
    let totalPnl = 0;

    holdings.forEach(holding => {
      const currentPrice = holding.current_price || holding.purchase_price;
      const value = holding.quantity * currentPrice;
      const cost = holding.quantity * holding.purchase_price;
      
      totalValue += value;
      totalCost += cost;
      totalPnl += (value - cost);
    });

    const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      totalPnl,
      pnlPercent
    };
  }, [holdings]);

  const fetchHoldings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('portfolio-tracker', {
        body: { action: 'list', userId }
      });
      if (data?.holdings) {
        // Enhance holdings with live prices
        const enhancedHoldings = data.holdings.map((h: Holding) => {
          const livePrice = getPriceBySymbol(h.commodity_symbol);
          if (livePrice) {
            const currentPrice = livePrice.price;
            const value = h.quantity * currentPrice;
            const cost = h.quantity * h.purchase_price;
            return {
              ...h,
              current_price: currentPrice,
              value,
              pnl: value - cost,
              pnl_percent: ((value - cost) / cost) * 100
            };
          }
          return h;
        });
        setHoldings(enhancedHoldings);
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to fetch holdings', variant: 'destructive' });
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const { data } = await supabase.functions.invoke('portfolio-tracker', {
        body: { action: 'history', userId }
      });
      if (data?.history) setHistory(data.history);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  };

  const recordSnapshot = async () => {
    try {
      await supabase.functions.invoke('portfolio-tracker', {
        body: { action: 'snapshot', userId }
      });
      fetchHistory();
    } catch (err) {
      console.error('Failed to record snapshot:', err);
    }
  };

  useEffect(() => {
    fetchHoldings();
    fetchHistory();
  }, []);

  // Clear flash animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setHoldings(prev => prev.map(h => ({ ...h, flash: null })));
    }, 500);
    return () => clearTimeout(timer);
  }, [prices]);

  const handleAdd = async (holding: any) => {
    setAdding(true);
    try {
      const { data } = await supabase.functions.invoke('portfolio-tracker', {
        body: { action: 'add', userId, holding }
      });
      if (data?.success) {
        toast({ title: 'Success', description: 'Holding added to portfolio' });
        fetchHoldings();
        recordSnapshot();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to add holding', variant: 'destructive' });
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const { data } = await supabase.functions.invoke('portfolio-tracker', {
        body: { action: 'delete', userId, holding: { id } }
      });
      if (data?.success) {
        toast({ title: 'Deleted', description: 'Holding removed from portfolio' });
        fetchHoldings();
        recordSnapshot();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete holding', variant: 'destructive' });
    }
  };

  const handleEdit = (holding: any) => {
    toast({ title: 'Edit', description: `Editing ${holding.commodity_name} - Feature coming soon` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase className="h-7 w-7 text-blue-400" />
            Portfolio Tracker
          </h2>
          <p className="text-slate-400">Track your commodity holdings with real-time P&L</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <Wifi className="w-3 h-3 mr-1" />
                Live
              </Badge>
            ) : (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <WifiOff className="w-3 h-3 mr-1" />
                Connecting...
              </Badge>
            )}
          </div>
          <Button onClick={fetchHoldings} variant="outline" size="sm" className="border-slate-600">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Live Portfolio Value Card */}
      <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Portfolio Value</p>
              <div className="flex items-center gap-2">
                <p className="text-3xl font-bold text-white">
                  ${portfolioTotals.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                {isConnected && (
                  <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                )}
              </div>
              {lastUpdate && (
                <p className="text-xs text-slate-500 mt-1">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </p>
              )}
            </div>
            
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Cost Basis</p>
              <p className="text-2xl font-bold text-white">
                ${portfolioTotals.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-slate-400 mb-1">Total P&L</p>
              <div className={`flex items-center gap-2 ${portfolioTotals.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {portfolioTotals.totalPnl >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <p className="text-2xl font-bold">
                  {portfolioTotals.totalPnl >= 0 ? '+' : ''}
                  ${portfolioTotals.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            
            <div>
              <p className="text-sm text-slate-400 mb-1">Return %</p>
              <div className={`flex items-center gap-2 ${portfolioTotals.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <p className="text-2xl font-bold">
                  {portfolioTotals.pnlPercent >= 0 ? '+' : ''}
                  {portfolioTotals.pnlPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holdings with Flash Animation */}
      <Tabs defaultValue="holdings" className="w-full">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="holdings" className="data-[state=active]:bg-slate-700">
            <Briefcase className="h-4 w-4 mr-2" />Holdings ({holdings.length})
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-slate-700">
            <BarChart3 className="h-4 w-4 mr-2" />Performance
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="holdings" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <AddHoldingForm onAdd={handleAdd} loading={adding} />
            </div>
            <div className="lg:col-span-2">
              {/* Enhanced Holdings List with Live Prices */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    <span>Your Holdings</span>
                    {isConnected && (
                      <Badge className="bg-green-500/20 text-green-400 text-xs">
                        <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse" />
                        Live Prices
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : holdings.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No holdings yet. Add your first holding to get started.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {holdings.map((holding) => (
                        <div
                          key={holding.id}
                          className={`p-4 rounded-lg border transition-all duration-300 ${
                            holding.flash === 'up' 
                              ? 'bg-green-500/20 border-green-500/50' 
                              : holding.flash === 'down'
                              ? 'bg-red-500/20 border-red-500/50'
                              : 'bg-white/5 border-white/10'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-white font-medium">{holding.commodity_name}</h4>
                              <p className="text-sm text-slate-400">
                                {holding.quantity} units @ ${holding.purchase_price.toFixed(2)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-medium">
                                ${(holding.value || holding.quantity * holding.purchase_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                              <div className={`flex items-center justify-end gap-1 text-sm ${
                                (holding.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {(holding.pnl || 0) >= 0 ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                <span>
                                  {(holding.pnl || 0) >= 0 ? '+' : ''}
                                  ${(holding.pnl || 0).toFixed(2)} ({(holding.pnl_percent || 0).toFixed(2)}%)
                                </span>
                              </div>
                              {holding.current_price && (
                                <p className="text-xs text-slate-500 mt-1">
                                  Current: ${holding.current_price.toFixed(2)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-slate-400 hover:text-white"
                              onClick={() => handleEdit(holding)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300"
                              onClick={() => handleDelete(holding.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="performance" className="mt-4">
          <PortfolioChart history={history} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
