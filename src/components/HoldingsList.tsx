
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, TrendingUp, TrendingDown, Trash2, Edit } from 'lucide-react';

interface Holding {
  id: string;
  commodity_symbol: string;
  commodity_name: string;
  quantity: number;
  purchase_price: number;
  purchase_date: string;
  currentPrice: number;
  costBasis: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
  notes?: string;
}

interface Props {
  holdings: Holding[];
  onDelete: (id: string) => void;
  onEdit: (holding: Holding) => void;
  loading: boolean;
}

export default function HoldingsList({ holdings, onDelete, onEdit, loading }: Props) {
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  const formatPercent = (val: number) => `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 text-center text-slate-400">Loading holdings...</CardContent>
      </Card>
    );
  }

  if (!holdings.length) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 text-center text-slate-400">
          <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No holdings yet. Add your first commodity holding above.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-400" />
          Your Holdings ({holdings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {holdings.map(h => (
          <div key={h.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="text-white font-medium">{h.commodity_name}</h4>
                <p className="text-slate-400 text-sm">{h.quantity.toLocaleString()} units @ {formatCurrency(h.purchase_price)}</p>
              </div>
              <Badge className={h.pnl >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}>
                {h.pnl >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {formatPercent(h.pnlPercent)}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-sm mb-2">
              <div>
                <p className="text-slate-500">Cost Basis</p>
                <p className="text-slate-300">{formatCurrency(h.costBasis)}</p>
              </div>
              <div>
                <p className="text-slate-500">Current Value</p>
                <p className="text-slate-300">{formatCurrency(h.currentValue)}</p>
              </div>
              <div>
                <p className="text-slate-500">P&L</p>
                <p className={h.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{formatCurrency(h.pnl)}</p>
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-600">
              <span className="text-xs text-slate-500">Bought: {new Date(h.purchase_date).toLocaleDateString()}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => onEdit(h)} className="text-blue-400 hover:text-blue-300 h-7 px-2">
                  <Edit className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDelete(h.id)} className="text-red-400 hover:text-red-300 h-7 px-2">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
