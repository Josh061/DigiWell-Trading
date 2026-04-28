import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Users, Gift, Share2, Copy, CheckCircle, Clock, 
  TrendingUp, Coins, ExternalLink, Loader2, Award,
  UserPlus, DollarSign, Target, Sparkles, Link2, Percent
} from 'lucide-react';

interface Referral {
  id: string;
  referral_code: string;
  referred_user_id: string | null;
  referred_email: string | null;
  status: 'pending' | 'signed_up' | 'first_trade' | 'rewarded' | 'expired';
  first_trade_value: number | null;
  reward_amount: number | null;
  shared_via: string | null;
  signed_up_at: string | null;
  first_trade_at: string | null;
  reward_paid_at: string | null;
  created_at: string;
  referred_user?: {
    full_name: string;
    email: string;
    created_at: string;
  };
}

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_digicoin_earned: number;
  total_trade_value_generated: number;
  whatsapp_shares: number;
  linkedin_shares: number;
  link_clicks: number;
  referral_code: string;
}

export default function ReferralProgram() {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState<string>('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState<string | null>(null);

  // 0.25% reward in Digicoins on referral's first transaction
  const REWARD_PERCENTAGE = 0.25;
  // 0% service fee on all transactions
  const SERVICE_FEE_PERCENTAGE = 0;
  const BASE_URL = window.location.origin;


  useEffect(() => {
    if (user?.id) {
      loadReferralData();
    }
  }, [user?.id]);

  const loadReferralData = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      // Get or create referral code
      const { data: codeData, error: codeError } = await supabase.functions.invoke('referral-program', {
        body: { action: 'get_or_create_code', userId: user.id }
      });

      if (codeError) throw codeError;
      
      if (codeData?.referralCode) {
        setReferralCode(codeData.referralCode);
      }

      // Get referrals and stats
      const { data: refData, error: refError } = await supabase.functions.invoke('referral-program', {
        body: { action: 'get_referrals', userId: user.id }
      });

      if (refError) throw refError;

      setReferrals(refData?.referrals || []);
      setStats(refData?.stats || null);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReferralLink = () => {
    return `${BASE_URL}?ref=${referralCode}`;
  };

  const copyToClipboard = async () => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy:', error);
    } finally {
      setCopying(false);
    }
  };

  const shareViaWhatsApp = async () => {
    setSharing('whatsapp');
    try {
      // Track the share
      await supabase.functions.invoke('referral-program', {
        body: { 
          action: 'track_share', 
          userId: user?.id, 
          referralCode,
          sharedVia: 'whatsapp' 
        }
      });

      const message = encodeURIComponent(
        `Join me on Digiwell - the premier commodity trading platform! 🚀\n\n` +
        `Get started with my referral link and we both earn rewards:\n` +
        `${getReferralLink()}\n\n` +
        `✅ Trade petroleum products at live OPEC prices\n` +
        `✅ Secure escrow transactions\n` +
        `✅ 0% fees with DigiCoin\n\n` +
        `Use my code: ${referralCode}`
      );

      window.open(`https://wa.me/?text=${message}`, '_blank');
      
      // Refresh stats
      setTimeout(loadReferralData, 1000);
    } catch (error) {
      console.error('WhatsApp share error:', error);
    } finally {
      setSharing(null);
    }
  };

  const shareViaLinkedIn = async () => {
    setSharing('linkedin');
    try {
      // Track the share
      await supabase.functions.invoke('referral-program', {
        body: { 
          action: 'track_share', 
          userId: user?.id, 
          referralCode,
          sharedVia: 'linkedin' 
        }
      });

      const url = encodeURIComponent(getReferralLink());
      const title = encodeURIComponent('Join Digiwell - Premier Commodity Trading Platform');
      const summary = encodeURIComponent(
        `I'm using Digiwell for commodity trading with live OPEC pricing, secure escrow, and DigiCoin rewards. ` +
        `Join using my referral code ${referralCode} and earn 0.25% DigiCoin on your first trade!`
      );


      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        '_blank',
        'width=600,height=600'
      );
      
      // Refresh stats
      setTimeout(loadReferralData, 1000);
    } catch (error) {
      console.error('LinkedIn share error:', error);
    } finally {
      setSharing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'rewarded':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Rewarded</Badge>;
      case 'first_trade':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">First Trade</Badge>;
      case 'signed_up':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Signed Up</Badge>;
      case 'pending':
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">Pending</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expired</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 0% Service Fee + 0.25% Referral Reward Banner */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <Percent className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <div className="text-green-400 font-bold text-lg">0% Service Fee</div>
              <div className="text-slate-400 text-sm">No fees on any transaction!</div>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-[#D4AF37]/20 to-purple-500/20 border border-[#D4AF37]/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
              <Gift className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-[#D4AF37] font-bold text-lg">{REWARD_PERCENTAGE}% Referral Reward</div>
              <div className="text-slate-400 text-sm">On every referral's first purchase!</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#D4AF37]/20 via-purple-500/10 to-[#00D4FF]/20 rounded-2xl p-6 md:p-8 border border-[#D4AF37]/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00D4FF]/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#B8941F] rounded-xl flex items-center justify-center">
              <Gift className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Referral Program</h2>
              <p className="text-slate-400">Earn {REWARD_PERCENTAGE}% DigiCoin on every referral's first trade</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats?.total_referrals || 0}</div>
                  <div className="text-slate-400 text-sm">Total Referrals</div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{stats?.successful_referrals || 0}</div>
                  <div className="text-slate-400 text-sm">Successful</div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                  <Coins className="w-5 h-5 text-[#00D4FF]" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#D4AF37]">
                    {(stats?.total_digicoin_earned || 0).toFixed(4)}
                  </div>
                  <div className="text-slate-400 text-sm">DigiCoin Earned</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Referral Link Card */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-[#D4AF37]" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Input
                value={getReferralLink()}
                readOnly
                className="bg-slate-800/50 border-white/20 text-white pr-24 font-mono text-sm"
              />
              <Button
                onClick={copyToClipboard}
                disabled={copying}
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-slate-800/30 rounded-lg">
            <div className="text-slate-400 text-sm">Your Code:</div>
            <div className="font-mono font-bold text-[#D4AF37] text-lg tracking-wider">{referralCode}</div>
          </div>

          {/* Share Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              onClick={shareViaWhatsApp}
              disabled={sharing === 'whatsapp'}
              className="bg-[#25D366] hover:bg-[#20BD5A] text-white h-12"
            >
              {sharing === 'whatsapp' ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              )}
              Share via WhatsApp
              {stats?.whatsapp_shares ? (
                <Badge className="ml-2 bg-white/20 text-white">{stats.whatsapp_shares}</Badge>
              ) : null}
            </Button>

            <Button
              onClick={shareViaLinkedIn}
              disabled={sharing === 'linkedin'}
              className="bg-[#0A66C2] hover:bg-[#004182] text-white h-12"
            >
              {sharing === 'linkedin' ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              )}
              Share via LinkedIn
              {stats?.linkedin_shares ? (
                <Badge className="ml-2 bg-white/20 text-white">{stats.linkedin_shares}</Badge>
              ) : null}
            </Button>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
            <div className="flex items-center gap-2 text-slate-400">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm">Link Clicks</span>
            </div>
            <div className="font-bold text-white">{stats?.link_clicks || 0}</div>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Share2 className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="text-white font-semibold mb-1">1. Share</div>
              <div className="text-slate-400 text-sm">Share your unique referral link via WhatsApp or LinkedIn</div>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-[#00D4FF]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <UserPlus className="w-6 h-6 text-[#00D4FF]" />
              </div>
              <div className="text-white font-semibold mb-1">2. Sign Up</div>
              <div className="text-slate-400 text-sm">Friend signs up using your referral code</div>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-white font-semibold mb-1">3. First Trade</div>
              <div className="text-slate-400 text-sm">They complete their first trade on Digiwell</div>
            </div>
            <div className="text-center p-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Award className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-white font-semibold mb-1">4. Earn</div>
              <div className="text-slate-400 text-sm">You earn {REWARD_PERCENTAGE}% of trade value in DigiCoin</div>
            </div>
          </div>


          <Alert className="mt-4 bg-[#D4AF37]/10 border-[#D4AF37]/30">
            <Gift className="h-4 w-4 text-[#D4AF37]" />
            <AlertDescription className="text-[#D4AF37]">
              <strong>Example:</strong> If your friend's first transaction is $10,000, you earn 25 DigiCoin ({REWARD_PERCENTAGE}%)!
            </AlertDescription>
          </Alert>

        </CardContent>
      </Card>

      {/* Referral Progress */}
      {stats && stats.pending_referrals > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Pending Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400">Referrals awaiting first trade</span>
              <span className="text-white font-bold">{stats.pending_referrals}</span>
            </div>
            <Progress value={(stats.successful_referrals / (stats.total_referrals || 1)) * 100} className="h-2" />
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-slate-400">{stats.successful_referrals} completed</span>
              <span className="text-slate-400">{stats.total_referrals} total</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referred Users List */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            Your Referrals
            {referrals.length > 0 && (
              <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] ml-2">{referrals.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((referral) => (
                <div
                  key={referral.id}
                  className="bg-slate-800/50 rounded-xl p-4 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37]/30 to-[#00D4FF]/30 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {referral.referred_user?.full_name || referral.referred_email || 'Anonymous User'}
                        </div>
                        <div className="text-slate-400 text-sm flex items-center gap-2">
                          {referral.shared_via && (
                            <span className="capitalize">{referral.shared_via}</span>
                          )}
                          <span>•</span>
                          <span>{formatDate(referral.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(referral.status)}
                      {referral.reward_amount && referral.status === 'rewarded' && (
                        <div className="text-[#D4AF37] font-bold mt-1 flex items-center gap-1 justify-end">
                          <Coins className="w-4 h-4" />
                          +{referral.reward_amount.toFixed(4)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Timeline */}
                  {referral.status !== 'pending' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-xs">
                        <div className={`flex flex-col items-center ${referral.signed_up_at ? 'text-green-400' : 'text-slate-500'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${referral.signed_up_at ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                            <CheckCircle className="w-3 h-3" />
                          </div>
                          <span>Signed Up</span>
                          {referral.signed_up_at && (
                            <span className="text-slate-500">{formatDate(referral.signed_up_at)}</span>
                          )}
                        </div>
                        <div className={`flex-1 h-0.5 mx-2 ${referral.first_trade_at ? 'bg-green-500' : 'bg-slate-700'}`} />
                        <div className={`flex flex-col items-center ${referral.first_trade_at ? 'text-green-400' : 'text-slate-500'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${referral.first_trade_at ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                            <TrendingUp className="w-3 h-3" />
                          </div>
                          <span>First Trade</span>
                          {referral.first_trade_value && (
                            <span className="text-[#D4AF37]">${referral.first_trade_value.toLocaleString()}</span>
                          )}
                        </div>
                        <div className={`flex-1 h-0.5 mx-2 ${referral.reward_paid_at ? 'bg-green-500' : 'bg-slate-700'}`} />
                        <div className={`flex flex-col items-center ${referral.reward_paid_at ? 'text-green-400' : 'text-slate-500'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${referral.reward_paid_at ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                            <Gift className="w-3 h-3" />
                          </div>
                          <span>Rewarded</span>
                          {referral.reward_paid_at && (
                            <span className="text-slate-500">{formatDate(referral.reward_paid_at)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-white font-semibold mb-2">No Referrals Yet</h3>
              <p className="text-slate-400 mb-4">Share your referral link to start earning DigiCoin rewards!</p>
              <div className="flex justify-center gap-3">
                <Button onClick={shareViaWhatsApp} className="bg-[#25D366] hover:bg-[#20BD5A] text-white">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </Button>
                <Button onClick={shareViaLinkedIn} className="bg-[#0A66C2] hover:bg-[#004182] text-white">
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Summary */}
      {stats && stats.total_digicoin_earned > 0 && (
        <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-sm mb-1">Total DigiCoin Earned from Referrals</div>
                <div className="text-3xl font-bold text-[#D4AF37] flex items-center gap-2">
                  <Coins className="w-8 h-8" />
                  {stats.total_digicoin_earned.toFixed(4)}
                </div>
                <div className="text-slate-400 text-sm mt-1">
                  From ${stats.total_trade_value_generated.toLocaleString()} in referred trades
                </div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-sm mb-1">Conversion Rate</div>
                <div className="text-2xl font-bold text-white">
                  {stats.total_referrals > 0 
                    ? ((stats.successful_referrals / stats.total_referrals) * 100).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
