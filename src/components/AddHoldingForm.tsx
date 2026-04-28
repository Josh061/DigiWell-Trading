
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

const commodities = [
  { symbol: 'WTI', name: 'WTI Crude Oil', unit: 'barrel' },
  { symbol: 'BRENT', name: 'Brent Crude Oil', unit: 'barrel' },
  { symbol: 'NATGAS', name: 'Natural Gas', unit: 'MMBtu' },
  { symbol: 'PMS', name: 'Premium Motor Spirit', unit: 'barrel' },
  { symbol: 'DIESEL', name: 'Diesel (AGO)', unit: 'barrel' },
  { symbol: 'JET_FUEL', name: 'Jet Fuel (Jet A-1)', unit: 'barrel' },
  { symbol: 'LPG', name: 'Liquefied Petroleum Gas', unit: 'MT' },
  { symbol: 'XAU', name: 'Gold (XAU)', unit: 'oz' },
  { symbol: 'XAG', name: 'Silver (XAG)', unit: 'oz' }
];

interface Props {
  onAdd: (holding: any) => void;
  loading: boolean;
}

export default function AddHoldingForm({ onAdd, loading }: Props) {
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const c = e.detail;
      setSymbol(c.symbol);
      setPrice(c.price?.toString() || '');
    };
    window.addEventListener('addToPortfolio', handler as EventListener);
    return () => window.removeEventListener('addToPortfolio', handler as EventListener);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const commodity = commodities.find(c => c.symbol === symbol);
    if (!commodity || !quantity || !price) return;
    onAdd({ symbol, name: commodity.name, quantity: parseFloat(quantity), purchasePrice: parseFloat(price), purchaseDate: date, notes });
    setSymbol(''); setQuantity(''); setPrice(''); setNotes('');
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Plus className="h-5 w-5 text-emerald-400" />Add Holding
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-slate-300 text-sm">Commodity</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white"><SelectValue placeholder="Select commodity" /></SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {commodities.map(c => <SelectItem key={c.symbol} value={c.symbol} className="text-white">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-slate-300 text-sm">Quantity</Label>
              <Input type="number" step="0.000001" value={quantity} onChange={e => setQuantity(e.target.value)} className="bg-slate-700 border-slate-600 text-white" placeholder="0.00" /></div>
            <div><Label className="text-slate-300 text-sm">Purchase Price ($)</Label>
              <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="bg-slate-700 border-slate-600 text-white" placeholder="0.00" /></div>
          </div>
          <div><Label className="text-slate-300 text-sm">Purchase Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-slate-700 border-slate-600 text-white" /></div>
          <div><Label className="text-slate-300 text-sm">Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} className="bg-slate-700 border-slate-600 text-white" placeholder="Optional notes" /></div>
          <Button type="submit" disabled={loading || !symbol || !quantity || !price} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {loading ? 'Adding...' : 'Add to Portfolio'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
