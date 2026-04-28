import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Settings, Users, Shield, Database, Globe, Bell, 
  Save, RefreshCw, Loader2, Search, Edit, Trash2,
  Crown, Lock, Unlock, Mail, Phone, Building,
  CheckCircle, XCircle, AlertTriangle, Upload, 
  FileText, DollarSign, Palette, Key, UserCog
} from 'lucide-react';

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company?: string;
  kyc_status?: string;
  is_super_admin?: boolean;
  company_verified?: boolean;
  created_at?: string;
  total_trades?: number;
  total_volume?: number;
}

interface AppSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  category: string;
  description?: string;
  updated_at?: string;
}

export default function AdminSettingsPanel() {
  const { userProfile, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [editingSettings, setEditingSettings] = useState<Record<string, any>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (data) setUsers(data);
    } catch (e) {
      console.error('Error fetching users:', e);
    }
    setLoading(false);
  };

  // Fetch app settings
  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('app_settings')
        .select('*')
        .order('category');
      if (data) {
        setSettings(data);
        const settingsMap: Record<string, any> = {};
        data.forEach(s => { settingsMap[s.setting_key] = s.setting_value; });
        setEditingSettings(settingsMap);
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchSettings();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    setSaving(true);
    try {
      await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      showSuccess('User role updated successfully');
    } catch (e) {
      console.error('Error updating role:', e);
    }
    setSaving(false);
  };

  // Update user profile
  const saveUserEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await supabase
        .from('users')
        .update({
          full_name: editingUser.full_name,
          role: editingUser.role,
          company: editingUser.company,
          company_verified: editingUser.company_verified,
          kyc_status: editingUser.kyc_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingUser.id);
      setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
      setEditingUser(null);
      showSuccess('User profile updated successfully');
    } catch (e) {
      console.error('Error saving user:', e);
    }
    setSaving(false);
  };

  // Save app settings
  const saveSettings = async (key: string, value: any) => {
    setSaving(true);
    try {
      await supabase
        .from('app_settings')
        .update({ 
          setting_value: value, 
          updated_by: userProfile?.email,
          updated_at: new Date().toISOString() 
        })
        .eq('setting_key', key);
      showSuccess(`Setting "${key}" updated successfully`);
    } catch (e) {
      console.error('Error saving setting:', e);
    }
    setSaving(false);
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      trader: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      refiner: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      marketer: 'bg-green-500/20 text-green-400 border-green-500/30',
      government_agency: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      pilot: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      user: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    };
    return colors[role] || colors.user;
  };

  if (!isSuperAdmin) {
    return (
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-12 text-center">
          <Lock className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-white font-bold text-xl mb-2">Super Admin Access Required</h3>
          <p className="text-slate-400">This panel is restricted to authorized super administrators only.</p>
          <p className="text-slate-500 text-sm mt-2">Authorized: asklincoln@gmail.com, admin@digiwelltrading.com</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Crown className="w-7 h-7 text-[#D4AF37]" />
            Super Admin Control Panel
          </h2>
          <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-400" />
            Logged in as: <span className="text-[#D4AF37] font-medium">{userProfile?.email}</span>
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Super Admin</Badge>
          </p>
        </div>
        <Button onClick={() => { fetchUsers(); fetchSettings(); }} variant="outline" className="border-[#D4AF37] text-[#D4AF37]">
          <RefreshCw className="w-4 h-4 mr-2" />Refresh All
        </Button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="text-green-400 font-medium">{successMessage}</span>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-slate-400 text-xs">Total Users</div>
              <div className="text-xl font-bold text-white">{users.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Crown className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <div className="text-slate-400 text-xs">Admins</div>
              <div className="text-xl font-bold text-white">{users.filter(u => u.role === 'admin').length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <div className="text-slate-400 text-xs">KYC Verified</div>
              <div className="text-xl font-bold text-white">{users.filter(u => u.kyc_status === 'verified').length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-slate-400 text-xs">Settings</div>
              <div className="text-xl font-bold text-white">{settings.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/10 border border-white/20 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="users" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Users className="w-4 h-4 mr-1" />User Management
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Settings className="w-4 h-4 mr-1" />App Settings
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Shield className="w-4 h-4 mr-1" />Security
          </TabsTrigger>
          <TabsTrigger value="data" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
            <Database className="w-4 h-4 mr-1" />Data Management
          </TabsTrigger>
        </TabsList>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search users by name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Edit User Modal */}
          {editingUser && (
            <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Edit className="w-5 h-5 text-[#D4AF37]" />
                  Editing: {editingUser.full_name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-white text-sm">Full Name</Label>
                    <Input value={editingUser.full_name} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})} className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div>
                    <Label className="text-white text-sm">Role</Label>
                    <Select value={editingUser.role} onValueChange={v => setEditingUser({...editingUser, role: v})}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="trader">Trader</SelectItem>
                        <SelectItem value="refiner">Refiner</SelectItem>
                        <SelectItem value="marketer">Marketer</SelectItem>
                        <SelectItem value="government_agency">Government Agency</SelectItem>
                        <SelectItem value="pilot">Pilot</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-white text-sm">Company</Label>
                    <Input value={editingUser.company || ''} onChange={e => setEditingUser({...editingUser, company: e.target.value})} className="bg-slate-800 border-slate-600 text-white" />
                  </div>
                  <div>
                    <Label className="text-white text-sm">KYC Status</Label>
                    <Select value={editingUser.kyc_status || 'pending'} onValueChange={v => setEditingUser({...editingUser, kyc_status: v})}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="verified">Verified</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch checked={editingUser.company_verified || false} onCheckedChange={v => setEditingUser({...editingUser, company_verified: v})} />
                    <Label className="text-white text-sm">Company Verified</Label>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={saveUserEdit} disabled={saving} className="bg-[#D4AF37] text-slate-900">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                    Save Changes
                  </Button>
                  <Button onClick={() => setEditingUser(null)} variant="outline" className="border-white/20 text-white">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-8 text-center text-slate-400">No users found</CardContent>
              </Card>
            ) : (
              filteredUsers.map(user => (
                <Card key={user.id} className="bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {user.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{user.full_name}</span>
                            {user.is_super_admin && <Crown className="w-4 h-4 text-[#D4AF37]" />}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span className="text-slate-400">{user.email}</span>
                          </div>
                          {user.company && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="w-3 h-3 text-slate-500" />
                              <span className="text-slate-400">{user.company}</span>
                              {user.company_verified && <CheckCircle className="w-3 h-3 text-green-400" />}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getRoleBadgeColor(user.role)}>{user.role.replace('_', ' ')}</Badge>
                        <Badge className={
                          user.kyc_status === 'verified' ? 'bg-green-500/20 text-green-400' :
                          user.kyc_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }>
                          KYC: {user.kyc_status || 'pending'}
                        </Badge>
                        <Select value={user.role} onValueChange={(v) => updateUserRole(user.id, v)}>
                          <SelectTrigger className="w-32 h-8 bg-white/5 border-white/20 text-white text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="trader">Trader</SelectItem>
                            <SelectItem value="refiner">Refiner</SelectItem>
                            <SelectItem value="marketer">Marketer</SelectItem>
                            <SelectItem value="government_agency">Gov Agency</SelectItem>
                            <SelectItem value="pilot">Pilot</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button onClick={() => setEditingUser({...user})} variant="ghost" size="sm" className="text-[#D4AF37] hover:bg-[#D4AF37]/10">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* App Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Price Source Settings */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-[#D4AF37]" />
                  Price Source Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white text-sm">Primary Source (Oil & Gas)</Label>
                  <Input value="OilPrice.com" readOnly className="bg-slate-800 border-slate-600 text-[#D4AF37] font-medium" />
                  <p className="text-slate-500 text-xs mt-1">Live crude oil and petroleum product pricing</p>
                </div>
                <div>
                  <Label className="text-white text-sm">Secondary Source (Metals & RWAs)</Label>
                  <Input value="Investing.com" readOnly className="bg-slate-800 border-slate-600 text-[#00D4FF] font-medium" />
                  <p className="text-slate-500 text-xs mt-1">Precious metals, industrial minerals, and RWA pricing</p>
                </div>
                <div>
                  <Label className="text-white text-sm">Fallback Source</Label>
                  <Input value="Finance Gateway API" readOnly className="bg-slate-800 border-slate-600 text-slate-300" />
                </div>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />Active - OilPrice.com Live Feed
                </Badge>
              </CardContent>
            </Card>

            {/* Platform Settings */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#00D4FF]" />
                  Platform Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-white text-sm">Platform Name</Label>
                  <Input value="Digiwell Trading LLC" className="bg-slate-800 border-slate-600 text-white" readOnly />
                </div>
                <div>
                  <Label className="text-white text-sm">Service Fee Rate</Label>
                  <Input value="0.87%" className="bg-slate-800 border-slate-600 text-[#D4AF37] font-bold" readOnly />
                  <p className="text-slate-500 text-xs mt-1">Free with DigiCoin payments</p>
                </div>
                <div>
                  <Label className="text-white text-sm">Tagline</Label>
                  <Input value="Energy and assets trading" className="bg-slate-800 border-slate-600 text-white" readOnly />
                </div>
              </CardContent>
            </Card>

            {/* Notification Settings */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-yellow-400" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Email Notifications</Label>
                    <p className="text-slate-500 text-xs">SendGrid transactional emails</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">SMS Notifications</Label>
                    <p className="text-slate-500 text-xs">Twilio SMS alerts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Push Notifications</Label>
                    <p className="text-slate-500 text-xs">Browser push alerts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Price Alert Triggers</Label>
                    <p className="text-slate-500 text-xs">Auto-send when thresholds hit</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Admin Access */}
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-red-400" />
                  Super Admin Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <Crown className="w-5 h-5 text-[#D4AF37]" />
                      <div>
                        <p className="text-white font-medium">asklincoln@gmail.com</p>
                        <p className="text-slate-500 text-xs">Platform Founder</p>
                      </div>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400">Super Admin</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                    <div className="flex items-center gap-3">
                      <Crown className="w-5 h-5 text-[#D4AF37]" />
                      <div>
                        <p className="text-white font-medium">admin@digiwelltrading.com</p>
                        <p className="text-slate-500 text-xs">Company Admin</p>
                      </div>
                    </div>
                    <Badge className="bg-red-500/20 text-red-400">Super Admin</Badge>
                  </div>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <div className="flex items-center gap-2 text-yellow-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Super admin privileges include:</span>
                  </div>
                  <ul className="text-slate-400 text-xs mt-2 space-y-1 ml-6">
                    <li>Full user management (create, edit, delete, role assignment)</li>
                    <li>Data and information upload/update</li>
                    <li>App settings management</li>
                    <li>Price source configuration</li>
                    <li>Team member management</li>
                    <li>Financial reports and audit logs</li>
                    <li>KYC verification management</li>
                    <li>All platform features access</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-400" />
                  Security Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <span className="text-white">Two-Factor Authentication</span>
                  <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <span className="text-white">SSL/TLS Encryption</span>
                  <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <span className="text-white">API Rate Limiting</span>
                  <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <span className="text-white">Audit Logging</span>
                  <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                  <span className="text-white">Row Level Security (RLS)</span>
                  <Badge className="bg-green-500/20 text-green-400">Enforced</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-[#D4AF37]" />
                  Role Permissions Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {[
                    { role: 'Admin', perms: 'Full access to all features', color: 'text-red-400' },
                    { role: 'Trader', perms: 'Trade, portfolio, market data, bids', color: 'text-blue-400' },
                    { role: 'Refiner', perms: 'Products, inventory, allocations', color: 'text-purple-400' },
                    { role: 'Marketer', perms: 'Products, market data, bids, fleet', color: 'text-green-400' },
                    { role: 'Gov Agency', perms: 'View all, approve, reports', color: 'text-yellow-400' },
                    { role: 'Pilot', perms: 'Deliveries, routes, GPS', color: 'text-cyan-400' },
                    { role: 'User', perms: 'Products, applications, orders', color: 'text-slate-400' },
                  ].map(item => (
                    <div key={item.role} className="flex items-center justify-between p-2 bg-white/5 rounded">
                      <span className={`font-medium ${item.color}`}>{item.role}</span>
                      <span className="text-slate-400 text-xs">{item.perms}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#00D4FF]" />
                  Database Tables
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: 'users', desc: 'User profiles and roles', count: users.length },
                  { name: 'applications', desc: 'Product applications' },
                  { name: 'allocations', desc: 'Approved allocations' },
                  { name: 'payment_transactions', desc: 'Payment records' },
                  { name: 'deliveries', desc: 'Delivery tracking' },
                  { name: 'commodity_prices', desc: 'Price history' },
                  { name: 'price_alerts_config', desc: 'User price alerts' },
                  { name: 'team_members', desc: 'About Us team data' },
                  { name: 'admin_privileges', desc: 'Super admin access' },
                  { name: 'app_settings', desc: 'Platform configuration' },
                  { name: 'audit_logs', desc: 'Activity audit trail' },
                ].map(table => (
                  <div key={table.name} className="flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      <span className="text-white text-sm font-mono">{table.name}</span>
                    </div>
                    <span className="text-slate-500 text-xs">{table.desc}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-white/10 border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-green-400" />
                  Storage Buckets
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { name: 'kyc-documents', desc: 'KYC verification files', public: false },
                  { name: 'invoices', desc: 'Invoice PDFs', public: false },
                  { name: 'dispute-evidence', desc: 'Dispute attachments', public: false },
                  { name: 'document-vault', desc: 'Secure documents', public: false },
                  { name: 'delivery-photos', desc: 'Delivery proof photos', public: true },
                  { name: 'pod-reports', desc: 'Proof of delivery', public: false },
                  { name: 'team-photos', desc: 'Team member photos', public: true },
                ].map(bucket => (
                  <div key={bucket.name} className="flex items-center justify-between p-2 bg-white/5 rounded hover:bg-white/10 transition-colors">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-slate-500" />
                      <span className="text-white text-sm font-mono">{bucket.name}</span>
                    </div>
                    <Badge className={bucket.public ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {bucket.public ? <Unlock className="w-3 h-3 mr-1" /> : <Lock className="w-3 h-3 mr-1" />}
                      {bucket.public ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
