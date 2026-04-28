import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import TokenizeAssetModal from './TokenizeAssetModal';
import WalletPriceAdjustments from './WalletPriceAdjustments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCw, Coins, 
  History, Copy, CheckCircle, ExternalLink, Shield, Scale
} from 'lucide-react';


interface WalletProps {
  onClose: () => void;
}

interface WalletTransaction {
  id: string;
  transaction_type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  blockchain_tx_hash?: string;
  created_at: string;
}

export default function DigitalWallet({ onClose }: WalletProps) {
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [showTokenize, setShowTokenize] = useState(false);
  const [liveRates, setLiveRates] = useState<Record<string, number>>({});
  const [loadingRates, setLoadingRates] = useState(false);
  const [activeTab, setActiveTab] = useState('balance');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [copied, setCopied] = useState(false);
  
  const [balances, setBalances] = useState({
    USD: 125430.50,
    EUR: 98765.20,
    GBP: 87654.30,
    NGN: 52340000,
    DIGICOIN: 1250.75
  });

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar', color: 'from-green-500 to-green-600' },
    { code: 'EUR', symbol: '€', name: 'Euro', color: 'from-blue-500 to-blue-600' },
    { code: 'GBP', symbol: '£', name: 'British Pound', color: 'from-purple-500 to-purple-600' },
    { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', color: 'from-emerald-500 to-emerald-600' },
    { code: 'DIGICOIN', symbol: 'Ð', name: 'DigiCoin Token', color: 'from-[#D4AF37] to-[#B8941F]' }
  ];

  const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f8fE00';

  const fetchRates = async () => {
    setLoadingRates(true);
    try {
      const { data } = await supabase.functions.invoke('exchange-rates', {
        body: { baseCurrency: 'USD', targetCurrencies: ['EUR', 'GBP', 'NGN'] }
      });
      if (data?.success) {
        setLiveRates({ ...data.rates, DIGICOIN: 1.02 });
      }
    } catch (err) {
      console.error('Failed to fetch rates');
    } finally {
      setLoadingRates(false);
    }
  };

  const fetchTransactions = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) {
        setTransactions(data);
      }
    } catch (err) {
      console.error('Failed to fetch transactions');
    }
  };

  useEffect(() => { 
    fetchRates(); 
    fetchTransactions();
  }, [user]);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    
    // Simulate deposit - in production, integrate with payment processor
    const amount = parseFloat(depositAmount);
    setBalances(prev => ({
      ...prev,
      [selectedCurrency]: prev[selectedCurrency as keyof typeof prev] + amount
    }));
    setDepositAmount('');
    alert(`Deposit of ${currencies.find(c => c.code === selectedCurrency)?.symbol}${amount.toLocaleString()} initiated`);
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;
    
    const amount = parseFloat(withdrawAmount);
    if (amount > balances[selectedCurrency as keyof typeof balances]) {
      alert('Insufficient balance');
      return;
    }
    
    setBalances(prev => ({
      ...prev,
      [selectedCurrency]: prev[selectedCurrency as keyof typeof prev] - amount
    }));
    setWithdrawAmount('');
    setWithdrawAddress('');
    alert(`Withdrawal of ${currencies.find(c => c.code === selectedCurrency)?.symbol}${amount.toLocaleString()} initiated`);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      case 'withdrawal':
      case 'payment':
        return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      case 'tokenization':
        return <Coins className="w-4 h-4 text-[#D4AF37]" />;
      default:
        return <RefreshCw className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-3xl w-full border border-[#D4AF37] shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#00D4FF] rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Digital Wallet</h2>
              <p className="text-slate-400 text-sm">Web3 Blockchain Powered</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="p-6">
          {/* Main Balance Card */}
          <div className={`bg-gradient-to-r ${currencies.find(c => c.code === selectedCurrency)?.color || 'from-[#D4AF37] to-[#00D4FF]'} rounded-xl p-6 mb-6`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-white/80 text-sm mb-1">Total Balance</div>
                <div className="text-4xl font-bold text-white mb-1">
                  {currencies.find(c => c.code === selectedCurrency)?.symbol}
                  {balances[selectedCurrency as keyof typeof balances].toLocaleString()}
                </div>
                <div className="text-white/70 text-sm">{currencies.find(c => c.code === selectedCurrency)?.name}</div>
              </div>
              {selectedCurrency === 'DIGICOIN' && (
                <div className="bg-white/20 rounded-lg px-3 py-1">
                  <div className="text-white text-xs">Blockchain</div>
                  <div className="text-white font-bold text-sm">DigiCoin Mainnet</div>
                </div>
              )}
            </div>
            
            {selectedCurrency === 'DIGICOIN' && (
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-white/70 text-xs mb-1">Wallet Address</div>
                <div className="flex items-center gap-2">
                  <code className="text-white text-sm font-mono flex-1 truncate">{walletAddress}</code>
                  <button onClick={copyAddress} className="text-white hover:text-[#D4AF37]">
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Exchange Rates */}
          <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-slate-400 text-sm flex items-center gap-2">
                <RefreshCw className={`w-3 h-3 ${loadingRates ? 'animate-spin' : ''}`} />
                Live Market Rates (USD base)
              </span>
              <button onClick={fetchRates} className="text-[#00D4FF] text-xs hover:underline">
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {['EUR', 'GBP', 'NGN', 'DIGICOIN'].map(code => (
                <div key={code} className="text-center bg-slate-700/50 rounded-lg p-2">
                  <span className="text-slate-500 text-xs block">{code}</span>
                  <div className="text-white font-medium">
                    {code === 'DIGICOIN' ? '1.02' : liveRates[code]?.toFixed(code === 'NGN' ? 0 : 4) || '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Currency Selection */}
          <div className="grid grid-cols-5 gap-2 mb-6">
            {currencies.map(curr => (
              <button
                key={curr.code}
                onClick={() => setSelectedCurrency(curr.code)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedCurrency === curr.code
                    ? 'border-[#D4AF37] bg-[#D4AF37]/10'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">{curr.symbol}</div>
                <div className="text-white font-bold text-sm">
                  {balances[curr.code as keyof typeof balances].toLocaleString()}
                </div>
                <div className="text-slate-400 text-xs">{curr.code}</div>
              </button>
            ))}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 bg-slate-700/50 mb-4">
              <TabsTrigger value="balance" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs">
                Balance
              </TabsTrigger>
              <TabsTrigger value="deposit" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs">
                Deposit
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs">
                Withdraw
              </TabsTrigger>
              <TabsTrigger value="adjustments" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs">
                <Scale className="w-3 h-3 mr-1" />Adjustments
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-xs">
                History
              </TabsTrigger>
            </TabsList>


            <TabsContent value="balance">
              <div className="grid grid-cols-3 gap-3">
                <Button 
                  onClick={() => setActiveTab('deposit')}
                  className="bg-[#00D4FF] text-slate-900 font-bold py-6 hover:bg-[#00B8E6]"
                >
                  <ArrowDownLeft className="w-5 h-5 mr-2" />
                  Deposit
                </Button>
                <Button 
                  onClick={() => setActiveTab('withdraw')}
                  className="bg-slate-700 text-white font-bold py-6 hover:bg-slate-600"
                >
                  <ArrowUpRight className="w-5 h-5 mr-2" />
                  Withdraw
                </Button>
                <Button 
                  onClick={() => setShowTokenize(true)}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-6"
                >
                  <Coins className="w-5 h-5 mr-2" />
                  Tokenize
                </Button>
              </div>

              {selectedCurrency === 'DIGICOIN' && (
                <div className="mt-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-[#D4AF37] font-bold mb-2">
                    <Shield className="w-4 h-4" />
                    DigiCoin Benefits
                  </div>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>• 0% service fee on all transactions</li>
                    <li>• Instant blockchain settlements</li>
                    <li>• Cross-border payments without limits</li>
                    <li>• Secure Web3 wallet integration</li>
                  </ul>
                </div>
              )}
            </TabsContent>

            <TabsContent value="deposit" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Deposit Amount ({selectedCurrency})</Label>
                <Input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              {selectedCurrency === 'DIGICOIN' && (
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-slate-400 text-sm mb-2">Send DigiCoin to:</div>
                  <div className="flex items-center gap-2">
                    <code className="text-[#D4AF37] text-sm font-mono flex-1 truncate">{walletAddress}</code>
                    <button onClick={copyAddress} className="text-[#00D4FF]">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              <Button 
                onClick={handleDeposit}
                className="w-full bg-[#00D4FF] text-slate-900 font-bold"
                disabled={!depositAmount}
              >
                <ArrowDownLeft className="w-4 h-4 mr-2" />
                Deposit {selectedCurrency}
              </Button>
            </TabsContent>

            <TabsContent value="withdraw" className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Withdraw Amount ({selectedCurrency})</Label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              {selectedCurrency === 'DIGICOIN' && (
                <div className="space-y-2">
                  <Label className="text-white">Destination Wallet Address</Label>
                  <Input
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="0x..."
                    className="bg-white/10 border-white/20 text-white font-mono"
                  />
                </div>
              )}
              <div className="text-slate-400 text-sm">
                Available: {currencies.find(c => c.code === selectedCurrency)?.symbol}
                {balances[selectedCurrency as keyof typeof balances].toLocaleString()}
              </div>
              <Button 
                onClick={handleWithdraw}
                className="w-full bg-slate-700 text-white font-bold hover:bg-slate-600"
                disabled={!withdrawAmount}
              >
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Withdraw {selectedCurrency}
              </Button>
            </TabsContent>
            <TabsContent value="adjustments">
              <WalletPriceAdjustments />
            </TabsContent>

            <TabsContent value="history">
              {transactions.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getTransactionIcon(tx.transaction_type)}
                        <div>
                          <div className="text-white font-medium capitalize">{tx.transaction_type}</div>
                          <div className="text-slate-400 text-xs">
                            {new Date(tx.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${tx.transaction_type === 'deposit' ? 'text-green-400' : 'text-white'}`}>
                          {tx.transaction_type === 'deposit' ? '+' : '-'}
                          {tx.amount.toLocaleString()} {tx.currency}
                        </div>
                        {tx.blockchain_tx_hash && (
                          <a 
                            href={`https://explorer.digicoin.io/tx/${tx.blockchain_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#00D4FF] text-xs flex items-center gap-1 justify-end"
                          >
                            View on Explorer <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

        </div>
      </div>

      {showTokenize && (
        <TokenizeAssetModal 
          open={showTokenize} 
          onClose={() => setShowTokenize(false)} 
          onSuccess={() => setShowTokenize(false)}
          walletBalance={balances.DIGICOIN}
        />
      )}
    </div>
  );
}
