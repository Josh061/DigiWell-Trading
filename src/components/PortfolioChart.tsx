
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, TrendingUp } from 'lucide-react';

interface Snapshot {
  snapshot_date: string;
  total_value: number;
  total_pnl: number;
  pnl_percentage: number;
}

interface Props {
  history: Snapshot[];
}

export default function PortfolioChart({ history }: Props) {
  if (!history.length) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 text-center text-slate-400">
          <LineChart className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No historical data yet. Portfolio snapshots are recorded daily.</p>
        </CardContent>
      </Card>
    );
  }

  const maxValue = Math.max(...history.map(h => h.total_value));
  const minValue = Math.min(...history.map(h => h.total_value));
  const range = maxValue - minValue || 1;
  
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  const latestPnl = history[history.length - 1]?.pnl_percentage || 0;
  const isPositive = latestPnl >= 0;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Portfolio Performance
          </span>
          <span className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{latestPnl.toFixed(2)}% all time
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 relative">
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-6 w-16 flex flex-col justify-between text-xs text-slate-500">
            <span>{formatCurrency(maxValue)}</span>
            <span>{formatCurrency((maxValue + minValue) / 2)}</span>
            <span>{formatCurrency(minValue)}</span>
          </div>
          
          {/* Chart area */}
          <div className="ml-16 h-full pb-6 relative">
            <svg className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              <line x1="0" y1="0" x2="100%" y2="0" stroke="#334155" strokeWidth="1" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#334155" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="100%" x2="100%" y2="100%" stroke="#334155" strokeWidth="1" />
              
              {/* Area fill */}
              <defs>
                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
                  <stop offset="100%" stopColor={isPositive ? '#10b981' : '#ef4444'} stopOpacity="0" />
                </linearGradient>
              </defs>
              
              <path
                d={`M 0 ${100 - ((history[0]?.total_value - minValue) / range) * 100}% ${history.map((h, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const y = 100 - ((h.total_value - minValue) / range) * 100;
                  return `L ${x}% ${y}%`;
                }).join(' ')} L 100% 100% L 0 100% Z`}
                fill="url(#areaGradient)"
              />
              
              {/* Line */}
              <path
                d={`M ${history.map((h, i) => {
                  const x = (i / (history.length - 1)) * 100;
                  const y = 100 - ((h.total_value - minValue) / range) * 100;
                  return `${i === 0 ? '' : 'L '}${x}% ${y}%`;
                }).join(' ')}`}
                fill="none"
                stroke={isPositive ? '#10b981' : '#ef4444'}
                strokeWidth="2"
              />
            </svg>
          </div>
        </div>
        
        {/* X-axis labels */}
        <div className="ml-16 flex justify-between text-xs text-slate-500 mt-1">
          <span>{new Date(history[0]?.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          <span>{new Date(history[history.length - 1]?.snapshot_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
