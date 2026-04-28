import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, Shield, Search, CheckCircle, XCircle, 
  Building, Loader2, UserCog, AlertCircle
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company?: string;
  company_verified: boolean;
  kyc_status: string;
  created_at: string;
}

const ROLES: { value: UserRole; label: string; color: string }[] = [
  { value: 'user', label: 'Individual User', color: 'bg-slate-500' },
  { value: 'trader', label: 'Professional Trader', color: 'bg-blue-500' },
  { value: 'refiner', label: 'Refinery', color: 'bg-purple-500' },
  { value: 'marketer', label: 'Marketer', color: 'bg-green-500' },
  { value: 'government_agency', label: 'Government Agency', color: 'bg-yellow-500' },
  { value: 'pilot', label: 'Pilot/Transporter', color: 'bg-cyan-500' },
  { value: 'admin', label: 'Administrator', color: 'bg-red-500' }
];

export function RoleManagement() {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [updating, setUpdating] = useState<string | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedRole !== 'all') {
        query = query.eq('role', selectedRole);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasRole('admin')) {
      fetchUsers();
    }
  }, [selectedRole]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdating(userId);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setSuccess('Role updated successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleVerifyCompany = async (userId: string, verified: boolean) => {
    setUpdating(userId);
    setError('');

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          company_verified: verified,
          company_verification_date: verified ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, company_verified: verified } : u));
      setSuccess(`Company ${verified ? 'verified' : 'unverified'} successfully`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadge = (role: UserRole) => {
    const roleConfig = ROLES.find(r => r.value === role);
    return (
      <Badge className={`${roleConfig?.color || 'bg-slate-500'} text-white`}>
        {roleConfig?.label || role}
      </Badge>
    );
  };

  if (!hasRole('admin')) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-8 text-center">
          <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-lg">Access Denied</h3>
          <p className="text-slate-400">You don't have permission to access role management.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCog className="w-6 h-6 text-[#D4AF37]" />
            Role Management
          </h2>
          <p className="text-slate-400 text-sm">Manage user roles and permissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-[#D4AF37]/20 text-[#D4AF37]">
            {users.length} Users
          </Badge>
        </div>
      </div>

      {(success || error) && (
        <Alert className={success ? 'bg-green-500/20 border-green-500/50' : 'bg-red-500/20 border-red-500/50'}>
          {success ? <CheckCircle className="h-4 w-4 text-green-400" /> : <AlertCircle className="h-4 w-4 text-red-400" />}
          <AlertDescription className={success ? 'text-green-200' : 'text-red-200'}>
            {success || error}
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or company..."
                className="pl-10 bg-white/10 border-white/20 text-white"
              />
            </div>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[200px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No users found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <div 
                  key={user.id} 
                  className="bg-slate-800/50 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#00D4FF] rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {user.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.full_name}</div>
                        <div className="text-slate-400 text-sm">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getRoleBadge(user.role)}
                      {user.company && (
                        <Badge className="bg-slate-700 text-slate-300 flex items-center gap-1">
                          <Building className="w-3 h-3" />
                          {user.company}
                        </Badge>
                      )}
                      {user.company_verified ? (
                        <Badge className="bg-green-500/20 text-green-400 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : user.company ? (
                        <Badge className="bg-yellow-500/20 text-yellow-400">Unverified</Badge>
                      ) : null}
                      <Badge className={`${
                        user.kyc_status === 'verified' ? 'bg-green-500/20 text-green-400' :
                        user.kyc_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        KYC: {user.kyc_status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Select 
                      value={user.role} 
                      onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                      disabled={updating === user.id}
                    >
                      <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map(role => (
                          <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {user.company && (
                      <Button
                        onClick={() => handleVerifyCompany(user.id, !user.company_verified)}
                        disabled={updating === user.id}
                        variant="outline"
                        size="sm"
                        className={user.company_verified 
                          ? 'border-red-500 text-red-400 hover:bg-red-500/10' 
                          : 'border-green-500 text-green-400 hover:bg-green-500/10'
                        }
                      >
                        {updating === user.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : user.company_verified ? (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Unverify
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Verify
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ROLES.map(role => (
              <div key={role.value} className="bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${role.color}`}></div>
                  <span className="text-white font-medium">{role.label}</span>
                </div>
                <ul className="text-slate-400 text-sm space-y-1">
                  {role.value === 'admin' && (
                    <>
                      <li>• Full system access</li>
                      <li>• Manage all users</li>
                      <li>• Approve applications</li>
                      <li>• View audit logs</li>
                    </>
                  )}
                  {role.value === 'government_agency' && (
                    <>
                      <li>• View all applications</li>
                      <li>• Approve/reject bids</li>
                      <li>• Manage allocations</li>
                      <li>• Generate reports</li>
                    </>
                  )}
                  {role.value === 'trader' && (
                    <>
                      <li>• Create applications</li>
                      <li>• Submit bids</li>
                      <li>• Manage portfolio</li>
                      <li>• View analytics</li>
                    </>
                  )}
                  {role.value === 'refiner' && (
                    <>
                      <li>• Manage inventory</li>
                      <li>• View allocations</li>
                      <li>• Create applications</li>
                    </>
                  )}
                  {role.value === 'marketer' && (
                    <>
                      <li>• View market data</li>
                      <li>• Create bids</li>
                      <li>• Create applications</li>
                    </>
                  )}
                  {role.value === 'pilot' && (
                    <>
                      <li>• View deliveries</li>
                      <li>• Update GPS location</li>
                      <li>• Update delivery status</li>
                    </>
                  )}
                  {role.value === 'user' && (
                    <>
                      <li>• View products</li>
                      <li>• Create applications</li>
                      <li>• View own orders</li>
                    </>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
