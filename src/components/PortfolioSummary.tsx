
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, PieChart, Activity } from 'lucide-react';

interface Holding {
  costBasis: number;
  currentValue: number;
  pnl: number;
  commodity_symbol: string;
}

interface Props {
  holdings: Holding[];
}

export default function PortfolioSummary({ holdings }: Props) {
  const totalCost = holdings.reduce((sum, h) => sum + h.costBasis, 0);
  const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const totalPnl = totalValue - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
  
  const uniqueCommodities = new Set(holdings.map(h => h.commodity_symbol)).size;
  const bestPerformer = holdings.length > 0 
    ? holdings.reduce((best, h) => (h.pnl / h.costBasis) > (best.pnl / best.costBasis) ? h : best)
    : null;

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-blue-400" />
            <span className="text-slate-400 text-sm">Total Value</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(totalValue)}</p>
          <p className="text-xs text-slate-500">Cost: {formatCurrency(totalCost)}</p>
        </CardContent>
      </Card>

      <Card className={`bg-gradient-to-br ${totalPnl >= 0 ? 'from-emerald-600/20 to-emerald-800/20 border-emerald-500/30' : 'from-red-600/20 to-red-800/20 border-red-500/30'}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {totalPnl >= 0 ? <TrendingUp className="h-5 w-5 text-emerald-400" /> : <TrendingDown className="h-5 w-5 text-red-400" />}
            <span className="text-slate-400 text-sm">Total P&L</span>
          </div>
          <p className={`text-2xl font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}{formatCurrency(totalPnl)}
          </p>
          <p className={`text-xs ${totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {totalPnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="h-5 w-5 text-purple-400" />
            <span className="text-slate-400 text-sm">Diversification</span>
          </div>
          <p className="text-2xl font-bold text-white">{uniqueCommodities}</p>
          <p className="text-xs text-slate-500">{holdings.length} total positions</p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-5 w-5 text-amber-400" />
            <span className="text-slate-400 text-sm">Best Performer</span>
          </div>
          <p className="text-lg font-bold text-white truncate">
            {bestPerformer ? bestPerformer.commodity_symbol : 'N/A'}
          </p>
          <p className="text-xs text-emerald-400">
            {bestPerformer ? `+${((bestPerformer.pnl / bestPerformer.costBasis) * 100).toFixed(1)}%` : '--'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
