import { useState, useEffect } from 'react';
import { Bell, TrendingUp, TrendingDown, Mail, Phone, MessageSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CommodityPrice {
  symbol: string;
  name: string;
  price: number;
  unit: string;
}

interface Props {
  commodities: CommodityPrice[];
  onCreateAlert: (alert: any) => Promise<boolean>;
}

export default function PriceAlertForm({ commodities, onCreateAlert }: Props) {
  const { user } = useAuth();
  const [symbol, setSymbol] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('below');
  const [threshold, setThreshold] = useState('');
  const [notes, setNotes] = useState('');
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'sms' | 'both'>('email');
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const selectedCommodity = commodities.find(c => c.symbol === symbol);

  useEffect(() => {
    if (user) {
      supabase.functions.invoke('sms-notifications', {
        body: { action: 'get-verified-phone', userId: user.id }
      }).then(({ data }) => {
        if (data?.phone?.phone_number) setVerifiedPhone(data.phone.phone_number);
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !threshold) return;
    if ((notificationMethod === 'sms' || notificationMethod === 'both') && !verifiedPhone) return;

    setLoading(true);
    const result = await onCreateAlert({
      symbol, name: selectedCommodity?.name || symbol, condition,
      threshold: parseFloat(threshold), notes, notificationMethod,
      phoneNumber: verifiedPhone
    });
    setLoading(false);
    if (result) {
      setSuccess(true);
      setSymbol(''); setThreshold(''); setNotes('');
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const methodBtns = [
    { value: 'email', icon: Mail, label: 'Email' },
    { value: 'sms', icon: Phone, label: 'SMS' },
    { value: 'both', icon: MessageSquare, label: 'Both' }
  ];

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-[#D4AF37]" /> Create Price Alert
      </h3>

      {success && (
        <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg mb-4">
          Alert created! You'll be notified when triggered.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-slate-400 text-sm mb-1">Commodity</label>
          <select value={symbol} onChange={e => setSymbol(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white">
            <option value="">Select commodity...</option>
            {commodities.map(c => (
              <option key={c.symbol} value={c.symbol}>{c.name} - ${c.price.toFixed(2)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 text-sm mb-1">Notification Method</label>
          <div className="flex gap-2">
            {methodBtns.map(m => (
              <button key={m.value} type="button" onClick={() => setNotificationMethod(m.value as any)}
                disabled={m.value !== 'email' && !verifiedPhone}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  notificationMethod === m.value ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]' : 'border-slate-600 text-slate-400'
                } ${m.value !== 'email' && !verifiedPhone ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <m.icon className="w-4 h-4" /> {m.label}
              </button>
            ))}
          </div>
          {!verifiedPhone && <p className="text-amber-400 text-xs mt-1">Verify phone in Profile for SMS</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Condition</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCondition('below')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${condition === 'below' ? 'bg-red-500/20 border-red-500 text-red-400' : 'border-slate-600 text-slate-400'}`}>
                <TrendingDown className="w-4 h-4" /> Below
              </button>
              <button type="button" onClick={() => setCondition('above')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border ${condition === 'above' ? 'bg-green-500/20 border-green-500 text-green-400' : 'border-slate-600 text-slate-400'}`}>
                <TrendingUp className="w-4 h-4" /> Above
              </button>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Threshold ($)</label>
            <input type="number" step="0.01" value={threshold} onChange={e => setThreshold(e.target.value)}
              placeholder={selectedCommodity ? `$${selectedCommodity.price.toFixed(2)}` : 'Price'}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white" />
          </div>
        </div>

        <button type="submit" disabled={loading || !symbol || !threshold}
          className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-slate-900 font-bold py-3 rounded-lg hover:opacity-90 disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Alert'}
        </button>
      </form>
    </div>
  );
}
