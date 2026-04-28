import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Shield, Smartphone, Mail, Key, QrCode, Copy, Check, 
  AlertTriangle, Loader2, RefreshCw, Trash2, Download, Eye, EyeOff,
  Lock, Phone, CheckCircle, XCircle
} from 'lucide-react';

interface TwoFactorSettings {
  enabled: boolean;
  method: 'sms' | 'email' | 'totp' | 'none';
  phone_number?: string;
  totp_verified?: boolean;
  backup_codes_generated_at?: string;
}

interface SetupStep {
  step: 'select' | 'setup-totp' | 'setup-sms' | 'setup-email' | 'verify' | 'backup-codes' | 'complete';
}

export default function TwoFactorSettings() {
  const { user, userProfile } = useAuth();
  const [settings, setSettings] = useState<TwoFactorSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Setup flow state
  const [setupStep, setSetupStep] = useState<SetupStep['step']>('select');
  const [selectedMethod, setSelectedMethod] = useState<'sms' | 'email' | 'totp' | null>(null);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);
  
  // TOTP setup state
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQrUrl, setTotpQrUrl] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  
  // Verification state
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Backup codes state
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [user]);

  const fetchSettings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'get-settings', userId: user.id }
      });
      
      if (error) throw error;
      setSettings(data.settings);
    } catch (err: any) {
      console.error('Error fetching 2FA settings:', err);
      setError('Failed to load 2FA settings');
    } finally {
      setLoading(false);
    }
  };

  const startSetup = (method: 'sms' | 'email' | 'totp') => {
    setSelectedMethod(method);
    setError('');
    setSuccess('');
    setVerificationCode('');
    
    if (method === 'totp') {
      setSetupStep('setup-totp');
      initializeTOTP();
    } else if (method === 'sms') {
      setSetupStep('setup-sms');
    } else {
      setSetupStep('setup-email');
      sendEmailCode();
    }
    
    setShowSetupModal(true);
  };

  const initializeTOTP = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { 
          action: 'setup-totp', 
          userId: user?.id,
          email: userProfile?.email 
        }
      });
      
      if (error) throw error;
      
      setTotpSecret(data.secret);
      setTotpQrUrl(data.qrCodeUrl);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize TOTP');
    } finally {
      setActionLoading(false);
    }
  };

  const sendSMSCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setActionLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { 
          action: 'setup-sms', 
          userId: user?.id,
          phone: phoneNumber 
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setSuccess(data.message);
        setSetupStep('verify');
      } else {
        setError(data.message || 'Failed to send SMS');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send SMS');
    } finally {
      setActionLoading(false);
    }
  };

  const sendEmailCode = async () => {
    setActionLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { 
          action: 'setup-email', 
          userId: user?.id,
          email: userProfile?.email 
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setSuccess(data.message);
        setSetupStep('verify');
      } else {
        setError(data.message || 'Failed to send email');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setActionLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length < 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }
    
    setActionLoading(true);
    setError('');
    
    try {
      const action = selectedMethod === 'totp' ? 'verify-totp-setup' : 'verify-setup';
      
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { 
          action, 
          userId: user?.id,
          code: verificationCode 
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setSetupStep('backup-codes');
        setSuccess('2FA has been enabled successfully!');
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const completeSetup = () => {
    setShowSetupModal(false);
    setSetupStep('select');
    setSelectedMethod(null);
    setVerificationCode('');
    setPhoneNumber('');
    setTotpSecret('');
    setTotpQrUrl('');
    setBackupCodes([]);
    fetchSettings();
  };

  const disable2FA = async () => {
    setActionLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'disable', userId: user?.id }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setSuccess('2FA has been disabled');
        setShowDisableModal(false);
        fetchSettings();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA');
    } finally {
      setActionLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    setActionLoading(true);
    setError('');
    
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { action: 'regenerate-backup-codes', userId: user?.id }
      });
      
      if (error) throw error;
      
      if (data.success) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodesModal(true);
        setSuccess('New backup codes generated');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate backup codes');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const downloadBackupCodes = () => {
    const content = `Digiwell - 2FA Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Store these codes in a safe place. Each code can only be used once.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

If you lose access to your authenticator, you can use one of these codes to log in.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'digiwell-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'totp': return <Smartphone className="w-5 h-5" />;
      case 'sms': return <Phone className="w-5 h-5" />;
      case 'email': return <Mail className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'totp': return 'Authenticator App';
      case 'sms': return 'SMS';
      case 'email': return 'Email';
      default: return 'None';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                settings?.enabled ? 'bg-green-500/20' : 'bg-yellow-500/20'
              }`}>
                <Shield className={`w-6 h-6 ${settings?.enabled ? 'text-green-400' : 'text-yellow-400'}`} />
              </div>
              <div>
                <CardTitle className="text-white">Two-Factor Authentication</CardTitle>
                <CardDescription className="text-slate-400">
                  Add an extra layer of security to your account
                </CardDescription>
              </div>
            </div>
            <Badge className={settings?.enabled 
              ? 'bg-green-500/20 text-green-400 border-green-500/30' 
              : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
            }>
              {settings?.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {settings?.enabled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
                <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                  {getMethodIcon(settings.method)}
                </div>
                <div className="flex-1">
                  <div className="text-white font-medium">Active Method</div>
                  <div className="text-slate-400 text-sm">{getMethodLabel(settings.method)}</div>
                </div>
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              
              {settings.backup_codes_generated_at && (
                <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Key className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium">Backup Codes</div>
                    <div className="text-slate-400 text-sm">
                      Generated {new Date(settings.backup_codes_generated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateBackupCodes}
                    disabled={actionLoading}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDisableModal(true)}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Disable 2FA
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-400">
                Protect your account by requiring a second form of verification when signing in.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Authenticator App Option */}
                <button
                  onClick={() => startSetup('totp')}
                  className="p-4 bg-slate-800/50 rounded-lg border border-white/10 hover:border-[#D4AF37]/50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[#D4AF37]/30 transition-colors">
                    <Smartphone className="w-6 h-6 text-[#D4AF37]" />
                  </div>
                  <div className="text-white font-medium mb-1">Authenticator App</div>
                  <div className="text-slate-400 text-sm">
                    Use Google Authenticator, Authy, or similar apps
                  </div>
                  <Badge className="mt-2 bg-green-500/20 text-green-400">Recommended</Badge>
                </button>
                
                {/* SMS Option */}
                <button
                  onClick={() => startSetup('sms')}
                  className="p-4 bg-slate-800/50 rounded-lg border border-white/10 hover:border-[#00D4FF]/50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-[#00D4FF]/30 transition-colors">
                    <Phone className="w-6 h-6 text-[#00D4FF]" />
                  </div>
                  <div className="text-white font-medium mb-1">SMS Verification</div>
                  <div className="text-slate-400 text-sm">
                    Receive codes via text message
                  </div>
                </button>
                
                {/* Email Option */}
                <button
                  onClick={() => startSetup('email')}
                  className="p-4 bg-slate-800/50 rounded-lg border border-white/10 hover:border-purple-500/50 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-500/30 transition-colors">
                    <Mail className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="text-white font-medium mb-1">Email Verification</div>
                  <div className="text-slate-400 text-sm">
                    Receive codes via email
                  </div>
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error/Success Alerts */}
      {error && (
        <Alert className="bg-red-500/20 border-red-500/50">
          <XCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">{error}</AlertDescription>
        </Alert>
      )}
      
      {success && !showSetupModal && (
        <Alert className="bg-green-500/20 border-green-500/50">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-200">{success}</AlertDescription>
        </Alert>
      )}

      {/* Setup Modal */}
      <Dialog open={showSetupModal} onOpenChange={setShowSetupModal}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getMethodIcon(selectedMethod || '')}
              Set Up {getMethodLabel(selectedMethod || '')}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {setupStep === 'setup-totp' && 'Scan the QR code with your authenticator app'}
              {setupStep === 'setup-sms' && 'Enter your phone number to receive verification codes'}
              {setupStep === 'setup-email' && 'A verification code will be sent to your email'}
              {setupStep === 'verify' && 'Enter the verification code'}
              {setupStep === 'backup-codes' && 'Save your backup codes in a safe place'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* TOTP Setup */}
            {setupStep === 'setup-totp' && (
              <>
                {actionLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center">
                      <div className="p-4 bg-white rounded-lg">
                        {totpQrUrl ? (
                          <img src={totpQrUrl} alt="QR Code" className="w-48 h-48" />
                        ) : (
                          <div className="w-48 h-48 flex items-center justify-center bg-slate-200 rounded">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-400 text-sm">Or enter this code manually:</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={showSecret ? totpSecret : '••••••••••••••••••••'}
                          readOnly
                          className="bg-slate-800 border-white/20 text-white font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setShowSecret(!showSecret)}
                          className="border-white/20"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(totpSecret)}
                          className="border-white/20"
                        >
                          {copiedCode === totpSecret ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-white">Enter the 6-digit code from your app</Label>
                      <Input
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="bg-slate-800 border-white/20 text-white text-center text-2xl tracking-widest"
                        maxLength={6}
                      />
                    </div>
                  </>
                )}
              </>
            )}


            {/* SMS Setup */}
            {setupStep === 'setup-sms' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white">Phone Number</Label>
                  <Input
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1234567890"
                    className="bg-slate-800 border-white/20 text-white"
                  />
                  <p className="text-slate-400 text-sm">Include country code (e.g., +1 for US)</p>
                </div>
              </div>
            )}

            {/* Email Setup - shows loading then verify */}
            {setupStep === 'setup-email' && actionLoading && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mb-4" />
                <p className="text-slate-400">Sending verification code...</p>
              </div>
            )}

            {/* Verification Step */}
            {setupStep === 'verify' && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <p className="text-slate-300 text-sm">
                    {selectedMethod === 'sms' 
                      ? `A verification code has been sent to ${phoneNumber}`
                      : `A verification code has been sent to ${userProfile?.email}`
                    }
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-white">Verification Code</Label>
                  <Input
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="bg-slate-800 border-white/20 text-white text-center text-2xl tracking-widest"
                    maxLength={6}
                  />
                </div>
                
                <Button
                  variant="link"
                  onClick={selectedMethod === 'sms' ? sendSMSCode : sendEmailCode}
                  disabled={actionLoading}
                  className="text-[#D4AF37] p-0"
                >
                  Resend code
                </Button>
              </div>
            )}

            {/* Backup Codes */}
            {setupStep === 'backup-codes' && (
              <div className="space-y-4">
                <Alert className="bg-yellow-500/20 border-yellow-500/50">
                  <AlertTriangle className="h-4 w-4 text-yellow-400" />
                  <AlertDescription className="text-yellow-200">
                    Save these backup codes in a safe place. You'll need them if you lose access to your authenticator.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-slate-800 rounded font-mono text-sm"
                    >
                      <span className="text-white">{code}</span>
                      <button
                        onClick={() => copyToClipboard(code)}
                        className="text-slate-400 hover:text-white"
                      >
                        {copiedCode === code ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={downloadBackupCodes}
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Backup Codes
                </Button>
              </div>
            )}

            {error && (
              <Alert className="bg-red-500/20 border-red-500/50">
                <XCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">{error}</AlertDescription>
              </Alert>
            )}
            
            {success && setupStep !== 'backup-codes' && (
              <Alert className="bg-green-500/20 border-green-500/50">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">{success}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            {setupStep === 'setup-totp' && (
              <Button
                onClick={verifyCode}
                disabled={actionLoading || verificationCode.length !== 6}
                className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Enable
              </Button>
            )}
            
            {setupStep === 'setup-sms' && (
              <Button
                onClick={sendSMSCode}
                disabled={actionLoading || !phoneNumber}
                className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Send Code
              </Button>
            )}
            
            {setupStep === 'verify' && (
              <Button
                onClick={verifyCode}
                disabled={actionLoading || verificationCode.length !== 6}
                className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Verify & Enable
              </Button>
            )}
            
            {setupStep === 'backup-codes' && (
              <Button
                onClick={completeSetup}
                className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
              >
                I've Saved My Codes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Modal */}
      <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Are you sure you want to disable 2FA? This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Alert className="bg-red-500/20 border-red-500/50">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                Without 2FA, anyone with your password can access your account.
              </AlertDescription>
            </Alert>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDisableModal(false)}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={disable2FA}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Codes Modal (for regeneration) */}
      <Dialog open={showBackupCodesModal} onOpenChange={setShowBackupCodesModal}>
        <DialogContent className="bg-slate-900 border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#D4AF37]" />
              New Backup Codes
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Your old backup codes have been invalidated. Save these new codes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert className="bg-yellow-500/20 border-yellow-500/50">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <AlertDescription className="text-yellow-200">
                Your previous backup codes no longer work. Make sure to save these new codes.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-2 gap-2">
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-800 rounded font-mono text-sm"
                >
                  <span className="text-white">{code}</span>
                  <button
                    onClick={() => copyToClipboard(code)}
                    className="text-slate-400 hover:text-white"
                  >
                    {copiedCode === code ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ))}
            </div>
            
            <Button
              variant="outline"
              onClick={downloadBackupCodes}
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Backup Codes
            </Button>
          </div>
          
          <DialogFooter>
            <Button
              onClick={() => setShowBackupCodesModal(false)}
              className="bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
            >
              I've Saved My Codes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
