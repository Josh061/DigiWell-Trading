import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Smartphone, 
  Fingerprint, 
  Monitor, 
  Key, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from 'lucide-react';
import TwoFactorSettings from '@/components/TwoFactorSettings';
import SessionManagement from '@/components/SessionManagement';
import BiometricAuth from '@/components/BiometricAuth';
import { useAuth } from '@/contexts/AuthContext';

interface SecurityStatus {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  activeSessions: number;
  lastPasswordChange: string | null;
}

export default function SecuritySettings() {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Mock security status - in production, this would come from the backend
  const [securityStatus] = useState<SecurityStatus>({
    twoFactorEnabled: false,
    biometricEnabled: false,
    activeSessions: 1,
    lastPasswordChange: null
  });

  const getSecurityScore = () => {
    let score = 25; // Base score for having an account
    if (securityStatus.twoFactorEnabled) score += 35;
    if (securityStatus.biometricEnabled) score += 20;
    if (securityStatus.lastPasswordChange) score += 20;
    return score;
  };

  const securityScore = getSecurityScore();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/30';
    if (score >= 50) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-red-500/20 border-red-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#D4AF37] to-[#00D4FF] rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            Security Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your account security and authentication methods
          </p>
        </div>
        <div className={`px-4 py-2 rounded-lg border ${getScoreBgColor(securityScore)}`}>
          <div className="text-sm text-slate-400">Security Score</div>
          <div className={`text-2xl font-bold ${getScoreColor(securityScore)}`}>
            {securityScore}%
          </div>
        </div>
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  securityStatus.twoFactorEnabled 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-medium">2FA</div>
                  <div className="text-sm text-slate-400">
                    {securityStatus.twoFactorEnabled ? 'Enabled' : 'Not Set Up'}
                  </div>
                </div>
              </div>
              {securityStatus.twoFactorEnabled ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  securityStatus.biometricEnabled 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-slate-500/20 text-slate-400'
                }`}>
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-medium">Biometric</div>
                  <div className="text-sm text-slate-400">
                    {securityStatus.biometricEnabled ? 'Enabled' : 'Not Set Up'}
                  </div>
                </div>
              </div>
              {securityStatus.biometricEnabled ? (
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              ) : (
                <Info className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20 text-blue-400">
                  <Monitor className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-medium">Sessions</div>
                  <div className="text-sm text-slate-400">
                    {securityStatus.activeSessions} active
                  </div>
                </div>
              </div>
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                {securityStatus.activeSessions}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-purple-500/20 text-purple-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-white font-medium">Password</div>
                  <div className="text-sm text-slate-400">
                    {securityStatus.lastPasswordChange || 'Never changed'}
                  </div>
                </div>
              </div>
              <Lock className="w-5 h-5 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Recommendations */}
      {securityScore < 80 && (
        <Alert className="bg-yellow-500/10 border-yellow-500/30">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <AlertDescription className="text-yellow-200">
            <strong>Improve your security:</strong>
            <ul className="mt-2 space-y-1 list-disc list-inside text-sm">
              {!securityStatus.twoFactorEnabled && (
                <li>Enable Two-Factor Authentication for an extra layer of security</li>
              )}
              {!securityStatus.biometricEnabled && (
                <li>Set up Biometric Authentication for quick and secure access</li>
              )}
              {!securityStatus.lastPasswordChange && (
                <li>Consider updating your password regularly</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for different security settings */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-800/50 border border-white/10 p-1 w-full md:w-auto grid grid-cols-4 md:flex">
          <TabsTrigger 
            value="overview" 
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-white"
          >
            <Shield className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="2fa" 
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-white"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            2FA
          </TabsTrigger>
          <TabsTrigger 
            value="sessions" 
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-white"
          >
            <Monitor className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger 
            value="biometric" 
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900 text-white"
          >
            <Fingerprint className="w-4 h-4 mr-2" />
            Biometric
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Account Info */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#D4AF37]" />
                  Account Information
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Your account details and security status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white">{user?.email || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-slate-400">Full Name</span>
                  <span className="text-white">{userProfile?.full_name || 'Not set'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-slate-400">Role</span>
                  <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30">
                    {userProfile?.role || 'user'}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/10">
                  <span className="text-slate-400">Account Created</span>
                  <span className="text-white">
                    {user?.created_at 
                      ? new Date(user.created_at).toLocaleDateString() 
                      : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-400">Last Sign In</span>
                  <span className="text-white">
                    {user?.last_sign_in_at 
                      ? new Date(user.last_sign_in_at).toLocaleString() 
                      : 'Unknown'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Security Tips */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#00D4FF]" />
                  Security Tips
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Best practices to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Use a strong password</div>
                    <div className="text-sm text-slate-400">
                      Combine letters, numbers, and special characters
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Enable 2FA</div>
                    <div className="text-sm text-slate-400">
                      Add an extra layer of security to your account
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Review active sessions</div>
                    <div className="text-sm text-slate-400">
                      Regularly check and revoke unknown sessions
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <div className="text-white font-medium">Keep your email secure</div>
                    <div className="text-sm text-slate-400">
                      Your email is used for account recovery
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="2fa" className="mt-6">
          <TwoFactorSettings />
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <SessionManagement />
        </TabsContent>

        <TabsContent value="biometric" className="mt-6">
          <BiometricAuth />
        </TabsContent>
      </Tabs>
    </div>
  );
}
