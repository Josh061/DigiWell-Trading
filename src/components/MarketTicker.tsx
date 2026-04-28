import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface CommodityPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  unit: string;
}

export default function MarketTicker() {
  const [prices, setPrices] = useState<CommodityPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  const fetchPrices = async () => {
    try {
      const { data } = await supabase.functions.invoke('commodity-prices', { body: {} });
      if (data?.success && data.commodities) {
        setPrices(data.commodities);
        setLastUpdate(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('Failed to fetch commodity prices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900/50 border-y border-slate-700 py-3">
        <div className="flex justify-center items-center text-slate-400">
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading live market data...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 border-y border-slate-700 py-3 overflow-hidden relative">
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-slate-900/90 px-2 py-1 rounded text-xs text-slate-400 flex items-center gap-1">
        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        LIVE
      </div>
      <div className="flex animate-scroll whitespace-nowrap pl-16">
        {[...prices, ...prices].map((item, idx) => {
          const safePrice = (item?.price != null && !isNaN(Number(item.price))) ? Number(item.price) : 0;
          const safeChangePercent = (item?.changePercent != null && !isNaN(Number(item.changePercent))) ? Number(item.changePercent) : 0;
          return (
            <div key={idx} className="inline-flex items-center mx-6">
              <span className="text-[#D4AF37] font-bold mr-2">{item.symbol}</span>
              <span className="text-white font-mono mr-2">${safePrice.toFixed(2)}</span>
              <span className={`text-sm ${safeChangePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {safeChangePercent >= 0 ? '▲' : '▼'} {Math.abs(safeChangePercent).toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
