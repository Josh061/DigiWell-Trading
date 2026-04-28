import { useState, useEffect } from 'react';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, Building, Shield, TrendingUp, History, Settings, 
  CheckCircle, Clock, XCircle, Loader2, Save, Lock, Gift, Users
} from 'lucide-react';
import ReferralProgram from './ReferralProgram';
import TwoFactorSettings from './TwoFactorSettings';

interface TradingStats {
  totalTrades: number;
  totalVolume: number;
  successRate: number;
  avgOrderValue: number;
}

interface TradeHistory {
  id: string;
  product: string;
  quantity: number;
  amount: number;
  status: string;
  date: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Individual User',
  refiner: 'Refinery',
  marketer: 'Marketer',
  government_agency: 'Government Agency',
  trader: 'Professional Trader',
  admin: 'Administrator',
  pilot: 'Pilot/Transporter'
};

export default function UserProfile() {
  const { user, userProfile, updateProfile, updatePassword, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    company: '',
    company_registration_number: '',
    company_address: '',
    company_country: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [tradingStats, setTradingStats] = useState<TradingStats>({
    totalTrades: 0,
    totalVolume: 0,
    successRate: 0,
    avgOrderValue: 0
  });

  const [tradeHistory, setTradeHistory] = useState<TradeHistory[]>([]);
  const [referralStats, setReferralStats] = useState<{ total: number; earned: number } | null>(null);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        company: userProfile.company || '',
        company_registration_number: userProfile.company_registration_number || '',
        company_address: userProfile.company_address || '',
        company_country: userProfile.company_country || ''
      });

      setTradingStats({
        totalTrades: userProfile.total_trades || 0,
        totalVolume: userProfile.total_volume || 0,
        successRate: 95.5,
        avgOrderValue: userProfile.total_volume && userProfile.total_trades 
          ? userProfile.total_volume / userProfile.total_trades 
          : 0
      });
    }
  }, [userProfile]);

  useEffect(() => {
    const fetchTradeHistory = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase
          .from('allocations')
          .select(`
            id,
            allocated_quantity,
            total_amount,
            status,
            created_at,
            products (name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (data) {
          setTradeHistory(data.map((item: any) => ({
            id: item.id,
            product: item.products?.name || 'Unknown',
            quantity: item.allocated_quantity,
            amount: item.total_amount,
            status: item.status,
            date: new Date(item.created_at).toLocaleDateString()
          })));
        }
      } catch (err) {
        console.error('Error fetching trade history:', err);
      }
    };

    const fetchReferralStats = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await supabase.functions.invoke('referral-program', {
          body: { action: 'get_referrals', userId: user.id }
        });
        
        if (data?.stats) {
          setReferralStats({
            total: data.stats.total_referrals || 0,
            earned: data.stats.total_digicoin_earned || 0
          });
        }
      } catch (err) {
        console.error('Error fetching referral stats:', err);
      }
    };

    fetchTradeHistory();
    fetchReferralStats();
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await updateProfile(formData);
      if (error) throw error;
      setSuccess('Profile updated successfully');
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await updatePassword(passwordData.newPassword);
      if (error) throw error;
      setSuccess('Password updated successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'paid':
        return <Badge className="bg-green-500/20 text-green-400">{status}</Badge>;
      case 'in_delivery':
      case 'processing':
        return <Badge className="bg-blue-500/20 text-blue-400">{status}</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400">{status}</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-400">{status}</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-[#D4AF37] to-[#00D4FF] rounded-full flex items-center justify-center">
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{userProfile?.full_name || 'User'}</h2>
            <p className="text-slate-400">{userProfile?.email}</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">
                {ROLE_LABELS[userProfile?.role as UserRole] || 'User'}
              </Badge>
              {userProfile?.company_verified ? (
                <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified Company
                </Badge>
              ) : userProfile?.company ? (
                <Badge className="bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Verification Pending
                </Badge>
              ) : null}
              {userProfile?.kyc_status === 'verified' ? (
                <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  KYC Verified
                </Badge>
              ) : (
                <Badge className="bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  KYC {userProfile?.kyc_status || 'Pending'}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-slate-400 text-sm">Trading Limit</div>
            <div className="text-2xl font-bold text-[#D4AF37]">
              ${(userProfile?.trading_limit || 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-slate-400 text-sm">Total Trades</div>
                <div className="text-xl font-bold text-white">{tradingStats.totalTrades}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                <History className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div>
                <div className="text-slate-400 text-sm">Total Volume</div>
                <div className="text-xl font-bold text-white">${tradingStats.totalVolume.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-slate-400 text-sm">Success Rate</div>
                <div className="text-xl font-bold text-white">{tradingStats.successRate}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Building className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-slate-400 text-sm">Avg Order</div>
                <div className="text-xl font-bold text-white">${tradingStats.avgOrderValue.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/30 cursor-pointer hover:border-[#D4AF37]/50 transition-all" onClick={() => setActiveTab('referrals')}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/30 rounded-lg flex items-center justify-center">
                <Gift className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-slate-400 text-sm">Referrals</div>
                <div className="text-xl font-bold text-[#D4AF37]">{referralStats?.total || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/10 border border-white/20 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="profile" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="company" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Building className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <History className="w-4 h-4 mr-2" />
            Trade History
          </TabsTrigger>
          <TabsTrigger value="referrals" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Gift className="w-4 h-4 mr-2" />
            Referrals
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Lock className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {(success || error) && (
          <Alert className={`mt-4 ${success ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
            {success ? <CheckCircle className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
            <AlertDescription className={success ? 'text-green-200' : 'text-red-200'}>
              {success || error}
            </AlertDescription>
          </Alert>
        )}

        <TabsContent value="profile" className="mt-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Full Name</Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Phone Number</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Email Address</Label>
                <Input
                  value={userProfile?.email || ''}
                  disabled
                  className="bg-white/5 border-white/10 text-slate-400"
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={loading}
                className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                Company Information
                {userProfile?.company_verified && (
                  <Badge className="bg-green-500/20 text-green-400">Verified</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-white">Company Name</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white">Registration Number</Label>
                  <Input
                    value={formData.company_registration_number}
                    onChange={(e) => setFormData({ ...formData, company_registration_number: e.target.value })}
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Company Address</Label>
                <Input
                  value={formData.company_address}
                  onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Country</Label>
                <Input
                  value={formData.company_country}
                  onChange={(e) => setFormData({ ...formData, company_country: e.target.value })}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <Button
                onClick={handleSaveProfile}
                disabled={loading}
                className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Company Info
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Trading History</CardTitle>
            </CardHeader>
            <CardContent>
              {tradeHistory.length > 0 ? (
                <div className="space-y-3">
                  {tradeHistory.map((trade) => (
                    <div key={trade.id} className="bg-slate-800/50 rounded-lg p-4 flex items-center justify-between">
                      <div>
                        <div className="text-white font-medium">{trade.product}</div>
                        <div className="text-slate-400 text-sm">{trade.quantity.toLocaleString()} units • {trade.date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[#D4AF37] font-bold">${trade.amount.toLocaleString()}</div>
                        {getStatusBadge(trade.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No trading history yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <ReferralProgram />
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-6">
          {/* Two-Factor Authentication Section */}
          <TwoFactorSettings />
          
          {/* Password Change Section */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Change Password</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">New Password</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="Enter new password (min 8 characters)"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={loading || !passwordData.newPassword}
                className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                Update Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

