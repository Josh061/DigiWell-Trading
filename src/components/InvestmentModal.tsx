import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLog';

interface InvestmentModalProps {
  open: boolean;
  onClose: () => void;
  token: any;
}

export default function InvestmentModal({ open, onClose, token }: InvestmentModalProps) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(1.02);

  useEffect(() => {
    if (open) {
      supabase.functions.invoke('exchange-rates', { body: { baseCurrency: 'USD' } })
        .then(({ data }) => { if (data?.success) setExchangeRate(data.digicoinRate); });
    }
  }, [open]);

  const digicoinAmount = parseFloat(amount) || 0;
  const usdEquivalent = digicoinAmount / exchangeRate;
  const tokensToReceive = digicoinAmount ? Math.floor(digicoinAmount / token.pricePerToken) : 0;

  const handleInvest = async () => {
    if (!amount || digicoinAmount <= 0) { alert('Please enter a valid investment amount'); return; }
    if (tokensToReceive > token.availableTokens) { alert('Not enough tokens available'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('asset-tokenization', {
        body: { action: 'invest', userId: 'user', tokenId: token.tokenId, purchaseAmount: digicoinAmount, pricePerToken: token.pricePerToken }
      });
      if (error) throw error;
      await logAuditEvent('token_investment', { tokenId: token.tokenId, tokenSymbol: token.tokenSymbol, amount: digicoinAmount, tokensReceived: data.tokensReceived });
      alert(`Investment successful! You received ${data.tokensReceived} ${token.tokenSymbol} tokens.\nTransaction ID: ${data.transactionId}`);
      onClose();
    } catch (error: any) { alert('Error: ' + error.message); }
    finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <DialogHeader><DialogTitle className="text-white text-xl">Invest in {token.assetName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-slate-800 p-4 rounded-lg space-y-2 border border-slate-700">
            <div className="flex justify-between"><span className="text-sm text-slate-400">Token Symbol:</span><Badge className="bg-[#D4AF37] text-slate-900">{token.tokenSymbol}</Badge></div>
            <div className="flex justify-between"><span className="text-sm text-slate-400">Price per Token:</span><span className="font-semibold text-[#D4AF37]">Ð{token.pricePerToken}</span></div>
            <div className="flex justify-between"><span className="text-sm text-slate-400">Available Tokens:</span><span className="font-semibold text-green-400">{token.availableTokens.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-sm text-slate-400">Exchange Rate:</span><span className="font-semibold text-[#00D4FF]">1 USD = Ð{exchangeRate.toFixed(4)}</span></div>
          </div>
          <div><Label className="text-slate-300">Investment Amount (Digicoin)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="bg-slate-800 border-slate-600 text-white" /></div>
          {digicoinAmount > 0 && (
            <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#00D4FF]/20 p-4 rounded-lg border border-[#D4AF37]/30">
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div><span className="text-slate-400">USD Equivalent:</span><div className="text-white font-semibold">${usdEquivalent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div></div>
                <div><span className="text-slate-400">Digicoin Amount:</span><div className="text-[#D4AF37] font-semibold">Ð{digicoinAmount.toLocaleString()}</div></div>
              </div>
              <div className="text-center border-t border-slate-700 pt-3">
                <p className="text-sm text-slate-400">You will receive:</p>
                <p className="text-3xl font-bold text-[#00D4FF]">{tokensToReceive.toLocaleString()} <span className="text-lg">{token.tokenSymbol}</span></p>
              </div>
            </div>
          )}
          <Button onClick={handleInvest} disabled={loading || tokensToReceive <= 0} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-3">
            {loading ? 'Processing...' : `Invest Ð${digicoinAmount.toLocaleString()}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}