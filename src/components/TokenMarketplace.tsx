import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import TokenizeAssetModal from './TokenizeAssetModal';
import InvestmentModal from './InvestmentModal';

export default function TokenMarketplace() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [showTokenizeModal, setShowTokenizeModal] = useState(false);
  const [selectedToken, setSelectedToken] = useState<any>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1.02);
  const [loadingRates, setLoadingRates] = useState(false);

  useEffect(() => {
    loadTokens();
    fetchExchangeRate();
  }, []);

  const fetchExchangeRate = async () => {
    setLoadingRates(true);
    try {
      const { data } = await supabase.functions.invoke('exchange-rates', {
        body: { baseCurrency: 'USD' }
      });
      if (data?.success) setExchangeRate(data.digicoinRate);
    } catch (err) {
      console.error('Failed to fetch rates');
    } finally {
      setLoadingRates(false);
    }
  };

  const loadTokens = async () => {
    const mockTokens = [
      { tokenId: 'TKN-001', assetName: 'West Texas Crude Oil Reserve', assetType: 'petroleum', tokenSymbol: 'DGC-WTC', totalTokens: 1000000, availableTokens: 750000, pricePerToken: 100, investmentType: 'IPO', assetValue: 100000000, description: 'Premium crude oil reserve in Texas' },
      { tokenId: 'TKN-002', assetName: 'Brent Crude Oil Futures', assetType: 'petroleum', tokenSymbol: 'DGC-BRT', totalTokens: 500000, availableTokens: 320000, pricePerToken: 150, investmentType: 'Investor Trading', assetValue: 75000000, description: 'Brent crude oil futures contract' },
      { tokenId: 'TKN-003', assetName: 'Natural Gas Pipeline', assetType: 'natural_gas', tokenSymbol: 'DGC-NGP', totalTokens: 2000000, availableTokens: 1800000, pricePerToken: 50, investmentType: 'FDI', assetValue: 100000000, description: 'Major natural gas pipeline infrastructure' },
      { tokenId: 'TKN-004', assetName: 'Refinery Expansion Project', assetType: 'petroleum', tokenSymbol: 'DGC-REF', totalTokens: 800000, availableTokens: 650000, pricePerToken: 200, investmentType: 'Seed Investment', assetValue: 160000000, description: 'New refinery expansion in Middle East' }
    ];
    setTokens(mockTokens);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Token Marketplace</h2>
          <p className="text-slate-400">Invest in tokenized petroleum assets with Digicoin</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
            <span className="text-slate-400 text-sm">Live Rate: </span>
            <span className="text-[#D4AF37] font-bold">1 USD = Ð{exchangeRate.toFixed(4)}</span>
            <button onClick={fetchExchangeRate} className="ml-2 text-[#00D4FF] text-xs hover:underline">
              {loadingRates ? '...' : '↻'}
            </button>
          </div>
          <Button onClick={() => setShowTokenizeModal(true)} className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Tokenize Asset
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {tokens.map((token) => (
          <Card key={token.tokenId} className="bg-slate-800 border-slate-700 hover:border-[#D4AF37]/50 transition-all">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white">{token.assetName}</CardTitle>
                  <p className="text-[#D4AF37] mt-1 font-mono">{token.tokenSymbol}</p>
                </div>
                <Badge className="bg-[#00D4FF]/20 text-[#00D4FF]">{token.investmentType}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">{token.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-slate-500">Asset Value</p><p className="font-semibold text-white">${(token.assetValue / 1000000).toFixed(1)}M</p></div>
                <div><p className="text-slate-500">Price/Token</p><p className="font-semibold text-[#D4AF37]">Ð{token.pricePerToken}</p></div>
                <div><p className="text-slate-500">Total Tokens</p><p className="font-semibold text-white">{token.totalTokens.toLocaleString()}</p></div>
                <div><p className="text-slate-500">Available</p><p className="font-semibold text-green-400">{token.availableTokens.toLocaleString()}</p></div>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2"><div className="bg-gradient-to-r from-[#D4AF37] to-[#00D4FF] h-2 rounded-full" style={{ width: `${((token.totalTokens - token.availableTokens) / token.totalTokens) * 100}%` }} /></div>
              <Button onClick={() => setSelectedToken(token)} className="w-full bg-slate-700 hover:bg-slate-600 text-white">Invest Now</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <TokenizeAssetModal open={showTokenizeModal} onClose={() => setShowTokenizeModal(false)} onSuccess={loadTokens} />
      {selectedToken && <InvestmentModal open={!!selectedToken} onClose={() => setSelectedToken(null)} token={selectedToken} />}
    </div>
  );
}