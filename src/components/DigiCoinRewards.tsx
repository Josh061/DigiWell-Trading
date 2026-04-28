import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Coins, Gift, TrendingUp, DollarSign, Users, Star,
  ArrowUp, ArrowDown, RefreshCw, Loader2, Trophy,
  Percent, Zap, Crown, Shield, CreditCard, Wallet
} from 'lucide-react';
import { SERVICE_FEE_RATE } from '@/lib/applicationId';

interface LeaderboardEntry {
  rank: number;
  name: string;
  email: string;
  totalEarned: number;
  referrals: number;
  feeSavings: number;
}

export default function DigiCoinRewards() {
  const { user, userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [purchaseAmount, setPurchaseAmount] = useState('');
  const [activeSection, setActiveSection] = useState<'overview' | 'history' | 'leaderboard' | 'exchange'>('overview');

  const [stats, setStats] = useState({
    balance: 0, totalEarned: 0, referralEarnings: 0, feeSavings: 0,
    totalReferrals: 0, conversionRate: 1.0, transactionCount: 0,
    monthlyEarnings: 0, lifetimeSavings: 0
  });

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch wallet balance
      const { data: walletData } = await supabase.from('digital_wallets')
        .select('*').eq('user_id', user?.id).maybeSingle();

      // Fetch referral earnings
      const { data: referralData } = await supabase.from('referral_rewards')
        .select('*').eq('referrer_id', user?.id);

      // Fetch fee records for savings calculation
      const { data: feeData } = await supabase.from('service_fee_records')
        .select('*').eq('customer_email', userProfile?.email).eq('is_digicoin', true);

      // Fetch transaction history
      const { data: txHistory } = await supabase.from('wallet_transactions')
        .select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(20);

      const balance = walletData?.balance || 0;
      const referralEarnings = (referralData || []).reduce((s: number, r: any) => s + Number(r.reward_amount || 0), 0);
      const feeSavings = (feeData || []).reduce((s: number, r: any) => s + Number(r.subtotal || 0) * SERVICE_FEE_RATE, 0);

      setStats({
        balance,
        totalEarned: balance + referralEarnings,
        referralEarnings,
        feeSavings,
        totalReferrals: (referralData || []).length,
        conversionRate: 1.0,
        transactionCount: (txHistory || []).length,
        monthlyEarnings: referralEarnings * 0.3,
        lifetimeSavings: feeSavings
      });

      setHistory(txHistory || []);

      // Generate leaderboard (mock top earners)
      setLeaderboard([
        { rank: 1, name: 'Adebayo O.', email: 'a***@gmail.com', totalEarned: 125000, referrals: 45, feeSavings: 8750 },
        { rank: 2, name: 'Mohammed A.', email: 'm***@yahoo.com', totalEarned: 98500, referrals: 38, feeSavings: 6200 },
        { rank: 3, name: 'Chen W.', email: 'c***@outlook.com', totalEarned: 87200, referrals: 32, feeSavings: 5100 },
        { rank: 4, name: 'Sarah K.', email: 's***@gmail.com', totalEarned: 72100, referrals: 28, feeSavings: 4300 },
        { rank: 5, name: 'David L.', email: 'd***@company.com', totalEarned: 65400, referrals: 24, feeSavings: 3800 },
        { rank: 6, name: 'Fatima B.', email: 'f***@trading.com', totalEarned: 54300, referrals: 20, feeSavings: 3200 },
        { rank: 7, name: 'James R.', email: 'j***@energy.com', totalEarned: 48700, referrals: 18, feeSavings: 2900 },
        { rank: 8, name: 'Aisha M.', email: 'a***@refinery.com', totalEarned: 42100, referrals: 15, feeSavings: 2500 },
        { rank: 9, name: 'Peter N.', email: 'p***@trade.com', totalEarned: 38500, referrals: 13, feeSavings: 2200 },
        { rank: 10, name: 'Grace O.', email: 'g***@digiwell.com', totalEarned: 35200, referrals: 11, feeSavings: 1900 },
      ]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePurchase = async () => {
    const amount = parseFloat(purchaseAmount);
    if (!amount || amount <= 0) return;
    try {
      await supabase.from('wallet_transactions').insert({
        user_id: user?.id,
        type: 'purchase',
        amount,
        currency: 'DGC',
        description: `Purchased ${amount.toLocaleString()} DigiCoin`,
        status: 'completed'
      });
      setPurchaseAmount('');
      await fetchData();
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
        <p className="text-slate-400">Loading DigiCoin rewards...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Coins className="w-7 h-7 text-[#D4AF37]" />
            DigiCoin Rewards & Loyalty
          </h2>
          <p className="text-slate-400 text-sm mt-1">Earn DigiCoin from referrals (0.25%), save on fees (0% vs 0.87%), and track your rewards</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-[#D4AF37]/20 to-purple-500/20 border-[#D4AF37]/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-slate-400 text-xs uppercase tracking-wider">Your DigiCoin Balance</div>
              <div className="text-[#D4AF37] text-4xl font-bold mt-1">Ð {stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="text-slate-400 text-sm mt-1">≈ ${stats.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
            </div>
            <div className="w-20 h-20 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
              <Coins className="w-10 h-10 text-[#D4AF37]" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gift className="w-8 h-8 text-green-400" />
              <div>
                <div className="text-green-400 text-xl font-bold">Ð {stats.referralEarnings.toLocaleString()}</div>
                <div className="text-slate-400 text-xs">Referral Earnings (0.25%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-400" />
              <div>
                <div className="text-blue-400 text-xl font-bold">${stats.feeSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <div className="text-slate-400 text-xs">Fee Savings (0% vs 0.87%)</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-purple-400" />
              <div>
                <div className="text-purple-400 text-xl font-bold">{stats.totalReferrals}</div>
                <div className="text-slate-400 text-xs">Total Referrals</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-[#D4AF37]" />
              <div>
                <div className="text-[#D4AF37] text-xl font-bold">{stats.transactionCount}</div>
                <div className="text-slate-400 text-xs">DigiCoin Transactions</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: Star },
          { id: 'history', label: 'History', icon: TrendingUp },
          { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
          { id: 'exchange', label: 'Purchase', icon: Wallet },
        ].map(tab => (
          <Button key={tab.id} variant={activeSection === tab.id ? 'default' : 'outline'} size="sm"
            onClick={() => setActiveSection(tab.id as any)}
            className={activeSection === tab.id ? 'bg-[#D4AF37] text-slate-900' : 'border-slate-600 text-white hover:bg-slate-700'}>
            <tab.icon className="w-4 h-4 mr-1" />{tab.label}
          </Button>
        ))}
      </div>

      {/* Overview */}
      {activeSection === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Fee Savings Comparison */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Percent className="w-5 h-5 text-green-400" />Fee Savings with DigiCoin
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                  <CreditCard className="w-8 h-8 text-red-400 mx-auto mb-2" />
                  <div className="text-red-400 text-xl font-bold">0.87%</div>
                  <div className="text-slate-400 text-xs">Regular Payment Fee</div>
                  <div className="text-red-400/70 text-xs mt-1">Stripe / Flutterwave / Bank</div>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <Coins className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <div className="text-green-400 text-xl font-bold">0%</div>
                  <div className="text-slate-400 text-xs">DigiCoin Fee</div>
                  <div className="text-green-400 text-xs mt-1 font-bold">ALWAYS FREE!</div>
                </div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-slate-400 text-xs">Your Lifetime Fee Savings</div>
                <div className="text-green-400 text-2xl font-bold">${stats.lifetimeSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </CardContent>
          </Card>

          {/* Referral Program */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <Gift className="w-5 h-5 text-[#D4AF37]" />Referral Rewards (0.25%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-[#D4AF37]/10 to-purple-500/10 border border-[#D4AF37]/30 rounded-xl p-4">
                <h4 className="text-[#D4AF37] font-bold mb-2">How It Works</h4>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-center gap-2"><CheckItem />Share your referral link with friends</li>
                  <li className="flex items-center gap-2"><CheckItem />They sign up and make their first purchase</li>
                  <li className="flex items-center gap-2"><CheckItem />You earn 0.25% of their purchase in DigiCoin</li>
                  <li className="flex items-center gap-2"><CheckItem />DigiCoin credited instantly to your wallet</li>
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-[#D4AF37] text-xl font-bold">{stats.totalReferrals}</div>
                  <div className="text-slate-400 text-xs">Successful Referrals</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-green-400 text-xl font-bold">Ð {stats.referralEarnings.toLocaleString()}</div>
                  <div className="text-slate-400 text-xs">Total Earned</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction History */}
      {activeSection === 'history' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#D4AF37]" />Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-400">No transactions yet. Start earning DigiCoin through referrals!</div>
            ) : (
              <div className="space-y-2">
                {history.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        tx.type === 'credit' || tx.type === 'referral' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        {tx.type === 'credit' || tx.type === 'referral' ? <ArrowDown className="w-4 h-4 text-green-400" /> : <ArrowUp className="w-4 h-4 text-red-400" />}
                      </div>
                      <div>
                        <div className="text-white text-sm font-medium">{tx.description || tx.type}</div>
                        <div className="text-slate-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className={`font-bold ${tx.type === 'credit' || tx.type === 'referral' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'credit' || tx.type === 'referral' ? '+' : '-'}Ð {Number(tx.amount || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      {activeSection === 'leaderboard' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-[#D4AF37]" />Top DigiCoin Earners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <div key={entry.rank} className={`flex items-center gap-4 p-3 rounded-lg ${
                  entry.rank <= 3 ? 'bg-[#D4AF37]/10 border border-[#D4AF37]/20' : 'bg-slate-700/50'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    entry.rank === 1 ? 'bg-[#D4AF37] text-slate-900' :
                    entry.rank === 2 ? 'bg-slate-300 text-slate-900' :
                    entry.rank === 3 ? 'bg-amber-700 text-white' :
                    'bg-slate-600 text-slate-300'
                  }`}>
                    {entry.rank <= 3 ? <Crown className="w-4 h-4" /> : entry.rank}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-sm">{entry.name}</div>
                    <div className="text-slate-400 text-xs">{entry.email} • {entry.referrals} referrals</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#D4AF37] font-bold">Ð {entry.totalEarned.toLocaleString()}</div>
                    <div className="text-green-400 text-xs">Saved ${entry.feeSavings.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Purchase/Exchange */}
      {activeSection === 'exchange' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#D4AF37]" />Purchase DigiCoin
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-bold">Exchange Rate</span>
                <span className="text-[#D4AF37] font-bold text-lg">1 USD = 1 DGC</span>
              </div>
              <p className="text-slate-400 text-sm">DigiCoin is pegged 1:1 to USD. Purchase DigiCoin to enjoy 0% service fees on all trades.</p>
            </div>
            <div className="space-y-3">
              <label className="text-white text-sm font-medium">Amount (USD)</label>
              <div className="flex gap-3">
                <Input type="number" value={purchaseAmount} onChange={e => setPurchaseAmount(e.target.value)}
                  placeholder="Enter amount in USD" className="bg-slate-700 border-slate-600 text-white flex-1" />
                <Button onClick={handlePurchase} disabled={!purchaseAmount || parseFloat(purchaseAmount) <= 0}
                  className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold">
                  <Coins className="w-4 h-4 mr-2" />Purchase
                </Button>
              </div>
              {purchaseAmount && parseFloat(purchaseAmount) > 0 && (
                <div className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-slate-400 text-sm">You will receive:</span>
                  <span className="text-[#D4AF37] font-bold text-lg">Ð {parseFloat(purchaseAmount).toLocaleString()}</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 5000].map(amt => (
                <Button key={amt} variant="outline" size="sm" onClick={() => setPurchaseAmount(amt.toString())}
                  className="border-slate-600 text-white hover:bg-slate-700 text-xs">
                  ${amt.toLocaleString()}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CheckItem() {
  return (
    <div className="w-5 h-5 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
      <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}
