import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CommodityPrice {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  source: string;
}

export default function MarketIntelligence() {
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<string[]>([]);

  const news = [
    { title: 'OPEC+ Extends Production Cuts Through Q2 2025', time: '2 hours ago', source: 'Reuters' },
    { title: 'Brent Crude Rises on Middle East Supply Concerns', time: '5 hours ago', source: 'Bloomberg' },
    { title: 'Natural Gas Demand Surges in Asian Markets', time: '8 hours ago', source: 'Financial Times' }
  ];

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const { data } = await supabase.functions.invoke('commodity-prices', { body: {} });
        if (data?.success) {
          setCommodities(data.commodities);
          setSources(data.sources || []);
        }
      } catch (err) { console.error('Failed to fetch'); }
      finally { setLoading(false); }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const petroleumProducts = commodities.filter(c => !['XAU', 'XAG'].includes(c.symbol));
  const metals = commodities.filter(c => ['XAU', 'XAG'].includes(c.symbol));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-white">Market Intelligence</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Live Data
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-4">Petroleum Products</div>
            {loading ? (
              <div className="text-center py-4 text-slate-500">Loading...</div>
            ) : (
              <div className="space-y-3">
                {petroleumProducts.slice(0, 5).map((c) => (
                  <div key={c.symbol}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#D4AF37] font-mono">${c.price.toFixed(2)}</span>
                        <span className={c.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {c.changePercent >= 0 ? '+' : ''}{c.changePercent.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${c.changePercent >= 0 ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-red-500 to-red-400'}`}
                        style={{ width: `${Math.min(Math.abs(c.changePercent) * 20 + 50, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-slate-400 text-sm mb-4">Precious Metals</div>
            <div className="space-y-4">
              {metals.map((c) => (
                <div key={c.symbol} className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                  <div>
                    <span className="text-white font-semibold">{c.name}</span>
                    <div className="text-slate-400 text-xs">{c.source}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#D4AF37] font-bold text-lg">${c.price.toLocaleString()}</span>
                    <div className={`text-xs ${c.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {c.changePercent >= 0 ? '▲' : '▼'} {Math.abs(c.changePercent).toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-4">Latest Market News</div>
          <div className="space-y-3">
            {news.map((item, idx) => (
              <div key={idx} className="border-l-2 border-[#D4AF37] pl-4 py-2">
                <div className="text-white font-semibold mb-1">{item.title}</div>
                <div className="text-slate-400 text-xs">{item.source} • {item.time}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          Data sources: {sources.join(' • ')}
        </div>
      </div>
    </div>
  );
}
