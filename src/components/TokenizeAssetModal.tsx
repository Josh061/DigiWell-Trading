import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLog';

interface CommodityPrice { symbol: string; name: string; price: number; unit: string; }
interface TokenizeAssetModalProps { open: boolean; onClose: () => void; onSuccess: () => void; walletBalance?: number; }

export default function TokenizeAssetModal({ open, onClose, onSuccess }: TokenizeAssetModalProps) {
  const [loading, setLoading] = useState(false);
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [exchangeRate, setExchangeRate] = useState(1.02);
  const [formData, setFormData] = useState({ assetName: '', assetType: 'WTI', quantity: '100', totalTokens: '1000', investmentType: 'investor_trading' });

  const fetchData = async () => {
    try {
      const [commodityRes, rateRes] = await Promise.all([
        supabase.functions.invoke('commodity-prices', { body: {} }),
        supabase.functions.invoke('exchange-rates', { body: { baseCurrency: 'USD', targetCurrencies: ['EUR'] } })
      ]);
      if (commodityRes.data?.success) setCommodities(commodityRes.data.commodities);
      if (rateRes.data?.digicoinRate) setExchangeRate(rateRes.data.digicoinRate);
    } catch (err) { console.error('Failed to fetch data'); }
  };

  useEffect(() => { if (open) fetchData(); }, [open]);

  const selectedCommodity = commodities.find(c => c.symbol === formData.assetType);
  const quantity = parseFloat(formData.quantity) || 0;
  const usdValue = selectedCommodity ? selectedCommodity.price * quantity : 0;
  const digicoinValue = usdValue * exchangeRate;
  const tokensCount = parseInt(formData.totalTokens) || 1;
  const pricePerToken = digicoinValue / tokensCount;

  const handleTokenize = async () => {
    if (!formData.assetName || usdValue <= 0) { alert('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('asset-tokenization', {
        body: { action: 'tokenize', userId: 'user', ...formData, assetValue: usdValue, totalTokens: tokensCount, pricePerToken, exchangeRate }
      });
      if (error) throw error;
      await logAuditEvent('asset_tokenized', { tokenId: data.tokenId, assetName: formData.assetName, commodity: formData.assetType, quantity, usdValue, digicoinValue });
      alert(`Asset tokenized! Token ID: ${data.tokenId}\nDigicoin Value: Ð${digicoinValue.toLocaleString()}`);
      onSuccess(); onClose();
    } catch (error: any) { alert('Error: ' + error.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader><DialogTitle className="text-2xl text-white flex items-center gap-3"><span className="text-[#D4AF37]">Ð</span> Tokenize Asset</DialogTitle></DialogHeader>
        
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-semibold text-sm">Live Commodity Prices</h3>
            <Button variant="ghost" size="sm" onClick={fetchData} className="text-xs text-[#00D4FF]">Refresh</Button>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs">
            {commodities.slice(0, 5).map(c => (
              <div key={c.symbol} className="bg-slate-700 p-2 rounded text-center">
                <div className="text-[#D4AF37] font-bold">{c.symbol}</div>
                <div className="text-white">${c.price.toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="mt-2"><Badge className="bg-[#D4AF37] text-slate-900 text-xs">1 USD = Ð{exchangeRate.toFixed(4)}</Badge></div>
        </div>

        <div className="space-y-4">
          <div><Label className="text-slate-300">Asset Name *</Label><Input value={formData.assetName} onChange={(e) => setFormData({...formData, assetName: e.target.value})} className="bg-slate-800 border-slate-600 text-white" placeholder="e.g., Crude Oil Reserve" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-slate-300">Commodity Type</Label>
              <Select value={formData.assetType} onValueChange={(v) => setFormData({...formData, assetType: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>{commodities.map(c => <SelectItem key={c.symbol} value={c.symbol}>{c.name} (${c.price.toFixed(2)})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-slate-300">Quantity ({selectedCommodity?.unit.split('/')[1] || 'units'})</Label><Input type="number" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} className="bg-slate-800 border-slate-600 text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-slate-300">Total Tokens</Label><Input type="number" value={formData.totalTokens} onChange={(e) => setFormData({...formData, totalTokens: e.target.value})} className="bg-slate-800 border-slate-600 text-white" /></div>
            <div><Label className="text-slate-300">Investment Type</Label>
              <Select value={formData.investmentType} onValueChange={(v) => setFormData({...formData, investmentType: v})}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="investor_trading">Trading</SelectItem><SelectItem value="seed_investment">Seed</SelectItem><SelectItem value="ipo">IPO</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          {usdValue > 0 && (
            <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#00D4FF]/20 rounded-lg p-4 border border-[#D4AF37]/30">
              <h4 className="text-white font-semibold mb-2">Tokenization Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-slate-400">Commodity:</span> <span className="text-white">{selectedCommodity?.name}</span></div>
                <div><span className="text-slate-400">Market Price:</span> <span className="text-white">${selectedCommodity?.price.toFixed(2)}/{selectedCommodity?.unit.split('/')[1]}</span></div>
                <div><span className="text-slate-400">USD Value:</span> <span className="text-white">${usdValue.toLocaleString()}</span></div>
                <div><span className="text-slate-400">Digicoin Value:</span> <span className="text-[#D4AF37]">Ð{digicoinValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span></div>
                <div><span className="text-slate-400">Total Tokens:</span> <span className="text-white">{tokensCount.toLocaleString()}</span></div>
                <div><span className="text-slate-400">Price/Token:</span> <span className="text-[#00D4FF]">Ð{pricePerToken.toFixed(4)}</span></div>
              </div>
            </div>
          )}
        </div>
        <Button onClick={handleTokenize} disabled={loading || usdValue <= 0} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-3 mt-4">
          {loading ? 'Tokenizing...' : `Tokenize for Ð${digicoinValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
