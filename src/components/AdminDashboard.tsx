import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, FileText, DollarSign, Truck, TrendingUp, 
  CheckCircle, XCircle, Clock, Loader2, BarChart3,
  Shield, Building, AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  pendingApplications: number;
  totalRevenue: number;
  activeDeliveries: number;
  verifiedCompanies: number;
  pendingKYC: number;
}

interface Application {
  id: string;
  user_id: string;
  product_id: string;
  product_name?: string;
  product_code?: string;
  product_unit?: string;
  quantity: number;
  proposed_price: number;
  delivery_location: string;
  status: string;
  created_at: string;
  users?: { full_name: string; email: string; company?: string };
}


export default function AdminDashboard() {
  const { hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    pendingApplications: 0,
    totalRevenue: 0,
    activeDeliveries: 0,
    verifiedCompanies: 0,
    pendingKYC: 0
  });
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('pending');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch pending applications
      const { count: pendingCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Fetch verified companies
      const { count: verifiedCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_verified', true);

      // Fetch pending KYC
      const { count: kycCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('kyc_status', 'pending');

      // Fetch active deliveries
      const { count: deliveriesCount } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .in('status', ['dispatched', 'in_transit']);

      // Fetch total revenue
      const { data: revenueData } = await supabase
        .from('payment_transactions')
        .select('total_amount')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, t) => sum + (t.total_amount || 0), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        pendingApplications: pendingCount || 0,
        totalRevenue,
        activeDeliveries: deliveriesCount || 0,
        verifiedCompanies: verifiedCount || 0,
        pendingKYC: kycCount || 0
      });

      // Fetch applications - no longer join with products table since product info is stored directly
      const { data: appsData } = await supabase
        .from('applications')
        .select(`
          *,
          users (full_name, email, company)
        `)
        .eq('status', statusFilter)
        .order('created_at', { ascending: false })
        .limit(20);

      setApplications(appsData || []);

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('admin')) {
      fetchDashboardData();
    }
  }, [statusFilter]);

  const handleApplicationAction = async (appId: string, action: 'approve' | 'reject') => {
    setUpdating(appId);
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      
      const { error } = await supabase
        .from('applications')
        .update({ 
          status: newStatus,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', appId);

      if (error) throw error;

      // If approved, create allocation
      if (action === 'approve') {
        const app = applications.find(a => a.id === appId);
        if (app) {
          const totalAmount = app.quantity * (app.proposed_price || 0);
          const serviceFee = totalAmount * 0.0087; // 0.87% service fee


          await supabase.from('allocations').insert({
            application_id: appId,
            user_id: app.user_id,
            product_id: app.product_id,
            allocated_quantity: app.quantity,
            unit_price: app.proposed_price,
            total_amount: totalAmount,
            service_fee: serviceFee,
            final_amount: totalAmount + serviceFee,
            status: 'allocated'
          });
        }
      }

      setApplications(prev => prev.filter(a => a.id !== appId));
    } catch (err) {
      console.error('Error updating application:', err);
    } finally {
      setUpdating(null);
    }
  };

  if (!hasRole('admin')) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg">Access Denied</h3>
          <p className="text-slate-400">Admin access required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
            Admin Dashboard
          </h2>
          <p className="text-slate-400 text-sm">Platform overview and management</p>
        </div>
        <Button
          onClick={fetchDashboardData}
          disabled={loading}
          variant="outline"
          className="border-[#00D4FF] text-[#00D4FF]"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total Users</div>
                <div className="text-xl font-bold text-white">{stats.totalUsers}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Pending Apps</div>
                <div className="text-xl font-bold text-white">{stats.pendingApplications}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Revenue</div>
                <div className="text-xl font-bold text-white">${(stats.totalRevenue / 1000000).toFixed(1)}M</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Deliveries</div>
                <div className="text-xl font-bold text-white">{stats.activeDeliveries}</div>
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
                <div className="text-slate-400 text-xs">Verified Co.</div>
                <div className="text-xl font-bold text-white">{stats.verifiedCompanies}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Pending KYC</div>
                <div className="text-xl font-bold text-white">{stats.pendingKYC}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/10 border border-white/20">
          <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Overview
          </TabsTrigger>
          <TabsTrigger value="applications" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            Applications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
                  Platform Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Daily Transactions</span>
                    <span className="text-white font-bold">$2.4M</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Active Traders</span>
                    <span className="text-white font-bold">1,234</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Products Listed</span>
                    <span className="text-white font-bold">8</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Service Fees Collected</span>
                    <span className="text-[#D4AF37] font-bold">$20,880</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#00D4FF]" />
                  User Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { role: 'Traders', count: 450, color: 'bg-blue-500' },
                    { role: 'Marketers', count: 280, color: 'bg-green-500' },
                    { role: 'Refiners', count: 45, color: 'bg-purple-500' },
                    { role: 'Pilots', count: 120, color: 'bg-cyan-500' },
                    { role: 'Gov. Agencies', count: 15, color: 'bg-yellow-500' }
                  ].map(item => (
                    <div key={item.role} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span className="text-slate-400 flex-1">{item.role}</span>
                      <span className="text-white font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-4">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Applications</CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="allocated">Allocated</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No {statusFilter} applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map(app => (
                    <div key={app.id} className="bg-slate-800/50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{app.users?.full_name}</span>
                            {app.users?.company && (
                              <Badge className="bg-slate-700 text-slate-300 text-xs">
                                {app.users.company}
                              </Badge>
                            )}
                          </div>
                          <div className="text-slate-400 text-sm">{app.users?.email}</div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-[#D4AF37]">{app.product_name || `Product ${app.product_id}`}</span>
                            <span className="text-slate-400">{app.quantity?.toLocaleString()} {app.product_unit || 'units'}</span>
                            <span className="text-slate-400">{app.delivery_location}</span>
                          </div>

                        </div>
                        {statusFilter === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleApplicationAction(app.id, 'approve')}
                              disabled={updating === app.id}
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                            >
                              {updating === app.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleApplicationAction(app.id, 'reject')}
                              disabled={updating === app.id}
                              size="sm"
                              variant="outline"
                              className="border-red-500 text-red-400 hover:bg-red-500/10"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {statusFilter !== 'pending' && (
                          <Badge className={
                            app.status === 'approved' || app.status === 'allocated' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }>
                            {app.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
