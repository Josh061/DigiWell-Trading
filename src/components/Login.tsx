import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw, Wifi, WifiOff, Shield, Smartphone, Phone, Key } from 'lucide-react';

interface LoginProps {
  onSwitchToSignup: () => void;
}

export default function Login({ onSwitchToSignup }: LoginProps) {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  // 2FA state
  const [show2FA, setShow2FA] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<'totp' | 'sms' | 'email' | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const [sending2FACode, setSending2FACode] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsNetworkError(false);
    setLoading(true);

    try {
      // First, sign in to get the user ID
      const { data, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        const errorMessage = signInError.message || 'An error occurred during login';
        setError(errorMessage);
        setIsNetworkError(
          errorMessage.includes('Unable to connect') || 
          errorMessage.includes('internet connection') ||
          errorMessage.includes('Failed to fetch')
        );
        setLoading(false);
        return;
      }

      // Check if user has 2FA enabled
      if (data?.user?.id) {
        try {
          const { data: twoFAData, error: twoFAError } = await supabase.functions.invoke('two-factor-auth', {
            body: { action: 'get-settings', userId: data.user.id }
          });

          // If there's an error checking 2FA, log it but allow login to proceed
          if (twoFAError) {
            console.warn('Error checking 2FA settings (proceeding with login):', twoFAError);
            // Don't block login if we can't check 2FA
            setLoading(false);
            return;
          }

          if (twoFAData?.settings?.enabled) {
            // Sign out temporarily until 2FA is verified
            await supabase.auth.signOut();
            
            // Store pending state
            setPendingUserId(data.user.id);
            setPendingCredentials({ email, password });
            setTwoFactorMethod(twoFAData.settings.method);
            setShow2FA(true);
            
            // Send code if not TOTP
            if (twoFAData.settings.method !== 'totp') {
              setSending2FACode(true);
              try {
                const { data: sendData, error: sendError } = await supabase.functions.invoke('two-factor-auth', {
                  body: { 
                    action: 'send-login-code', 
                    userId: data.user.id,
                    email: email,
                    method: twoFAData.settings.method
                  }
                });

                if (sendError || !sendData?.success) {
                  console.warn('Error sending 2FA code:', sendError || sendData?.error);
                  setError(sendData?.error || 'Failed to send verification code. Please try again.');
                } else {
                  setSuccessMessage(`Verification code sent to your ${twoFAData.settings.method === 'sms' ? 'phone' : 'email'}`);
                }
              } catch (err) {
                console.warn('Error sending 2FA code:', err);
                setError('Failed to send verification code. Please try again.');
              }
              setSending2FACode(false);
            }
          }
          // If 2FA is not enabled, the user is already signed in
        } catch (err) {
          // Network error or function unavailable - allow login to proceed
          console.warn('Error checking 2FA (proceeding with login):', err);
        }
      }

    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred during login';
      setError(errorMessage);
      setIsNetworkError(
        errorMessage.includes('Unable to connect') || 
        errorMessage.includes('internet connection') ||
        errorMessage.includes('Failed to fetch')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const codeToVerify = useBackupCode ? backupCode : twoFactorCode;
    
    if (!codeToVerify || (useBackupCode ? codeToVerify.length < 8 : codeToVerify.length < 6)) {
      setError(useBackupCode ? 'Please enter a valid backup code' : 'Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke('two-factor-auth', {
        body: { 
          action: 'verify-login', 
          userId: pendingUserId,
          code: codeToVerify,
          isBackupCode: useBackupCode
        }
      });

      if (verifyError) {
        console.error('2FA verification error:', verifyError);
        setError('Verification failed. Please try again.');
        setLoading(false);
        return;
      }

      if (verifyData?.success) {
        // Show success message for backup code usage
        if (verifyData?.usedBackupCode) {
          setSuccessMessage(`Backup code accepted. ${verifyData.remainingBackupCodes} codes remaining.`);
        }
        
        // 2FA verified, now complete the sign in
        if (pendingCredentials) {
          const { error: signInError } = await signIn(pendingCredentials.email, pendingCredentials.password);
          if (signInError) {
            setError(signInError.message || 'Failed to complete sign in');
          }
          // If successful, the auth state will update and redirect
        }
      } else {
        setError(verifyData?.error || 'Invalid verification code. Please try again.');
      }
    } catch (err: any) {
      console.error('2FA verification error:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend2FACode = async () => {
    if (twoFactorMethod === 'totp') return;
    
    setSending2FACode(true);
    setError('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: { 
          action: 'send-login-code', 
          userId: pendingUserId,
          email: pendingCredentials?.email || email,
          method: twoFactorMethod
        }
      });

      if (error || !data?.success) {
        setError(data?.error || 'Failed to resend code. Please try again.');
      } else {
        setSuccessMessage(`New verification code sent to your ${twoFactorMethod === 'sms' ? 'phone' : 'email'}`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setSending2FACode(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setIsNetworkError(false);
  };

  const handleBack = () => {
    setShow2FA(false);
    setTwoFactorCode('');
    setBackupCode('');
    setPendingUserId(null);
    setPendingCredentials(null);
    setTwoFactorMethod(null);
    setUseBackupCode(false);
    setError('');
    setSuccessMessage('');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setLoading(true);
    setError('');
    setIsNetworkError(false);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        const errorMessage = error.message || 'Failed to send reset email';
        setError(errorMessage);
        setIsNetworkError(
          errorMessage.includes('Unable to connect') || 
          errorMessage.includes('internet connection') ||
          errorMessage.includes('Failed to fetch')
        );
      } else {
        setResetEmailSent(true);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to send reset email';
      setError(errorMessage);
      setIsNetworkError(
        errorMessage.includes('Unable to connect') || 
        errorMessage.includes('internet connection') ||
        errorMessage.includes('Failed to fetch')
      );
    } finally {
      setLoading(false);
    }
  };

  // 2FA Verification Screen
  if (show2FA) {
    return (
      <Card className="w-full max-w-md auth-card-enter auth-card-shimmer">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#00D4FF] rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Two-Factor Authentication</CardTitle>
          <CardDescription className="text-white/70">
            {useBackupCode ? 'Enter one of your backup codes' : (
              <>
                {twoFactorMethod === 'totp' && 'Enter the code from your authenticator app'}
                {twoFactorMethod === 'sms' && 'Enter the code sent to your phone'}
                {twoFactorMethod === 'email' && 'Enter the code sent to your email'}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify2FA} className="space-y-4">
            {error && (
              <Alert className="bg-red-500/20 border-red-500/50">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-200">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {successMessage && (
              <Alert className="bg-green-500/20 border-green-500/50">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {!useBackupCode && (
              <div className="flex items-center justify-center gap-2 p-3 bg-slate-800/50 rounded-lg mb-4">
                {twoFactorMethod === 'totp' && <Smartphone className="w-5 h-5 text-[#D4AF37]" />}
                {twoFactorMethod === 'sms' && <Phone className="w-5 h-5 text-[#00D4FF]" />}
                {twoFactorMethod === 'email' && <Mail className="w-5 h-5 text-purple-400" />}
                <span className="text-white text-sm">
                  {twoFactorMethod === 'totp' && 'Authenticator App'}
                  {twoFactorMethod === 'sms' && 'SMS Verification'}
                  {twoFactorMethod === 'email' && 'Email Verification'}
                </span>
              </div>
            )}

            {useBackupCode && (
              <div className="flex items-center justify-center gap-2 p-3 bg-slate-800/50 rounded-lg mb-4">
                <Key className="w-5 h-5 text-yellow-400" />
                <span className="text-white text-sm">Backup Code</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="2fa-code" className="text-white">
                {useBackupCode ? 'Backup Code' : 'Verification Code'}
              </Label>
              {useBackupCode ? (
                <Input
                  id="backup-code"
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                  placeholder="XXXXXXXX"
                  className="bg-white/10 border-white/20 text-white text-center text-xl tracking-widest placeholder:text-white/30 font-mono"
                  maxLength={8}
                  autoFocus
                />
              ) : (
                <Input
                  id="2fa-code"
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="bg-white/10 border-white/20 text-white text-center text-2xl tracking-widest placeholder:text-white/30"
                  maxLength={6}
                  autoFocus
                />
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Button
                type="button"
                variant="link"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setError('');
                  setTwoFactorCode('');
                  setBackupCode('');
                }}
                className="text-[#00D4FF] hover:text-[#00B8E6] p-0 h-auto"
              >
                {useBackupCode ? 'Use verification code instead' : 'Use a backup code'}
              </Button>

              {!useBackupCode && twoFactorMethod !== 'totp' && (
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResend2FACode}
                  disabled={sending2FACode}
                  className="text-[#00D4FF] hover:text-[#00B8E6] p-0 h-auto"
                >
                  {sending2FACode ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Resend Code'
                  )}
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || (useBackupCode ? backupCode.length < 8 : twoFactorCode.length < 6)}
              className="w-full bg-gradient-to-r from-[#1565C0] to-[#29B6F6] text-white font-bold hover:shadow-lg hover:shadow-[#29B6F6]/40 rounded-full transition-all hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Sign In'
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            variant="link"
            onClick={handleBack}
            className="text-[#00D4FF] hover:text-[#00B8E6]"
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (showForgotPassword) {
    return (
      <Card className="w-full max-w-md auth-card-enter auth-card-shimmer">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#D4AF37] to-[#00D4FF] rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Reset Password</CardTitle>
          <CardDescription className="text-white/70">
            Enter your email to receive a password reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {resetEmailSent ? (
            <Alert className="bg-green-500/20 border-green-500/50">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-200">
                Password reset email sent! Check your inbox and follow the instructions.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <Alert className={`${isNetworkError ? 'bg-orange-500/20 border-orange-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
                  {isNetworkError ? (
                    <WifiOff className="h-4 w-4 text-orange-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  )}
                  <AlertDescription className={isNetworkError ? 'text-orange-200' : 'text-red-200'}>
                    {error}
                    {isNetworkError && (
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleRetry}
                        className="text-orange-300 hover:text-orange-100 p-0 h-auto ml-2"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-white">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#1565C0] to-[#29B6F6] text-white font-bold hover:shadow-lg hover:shadow-[#29B6F6]/40 rounded-full transition-all hover:scale-[1.02]"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button
            variant="link"
            onClick={() => {
              setShowForgotPassword(false);
              setResetEmailSent(false);
              setError('');
              setIsNetworkError(false);
            }}
            className="text-[#00D4FF] hover:text-[#00B8E6]"
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl auth-card-enter auth-card-shimmer">
      <CardHeader className="text-center">
        <div className="auth-icon-wrap mx-auto mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1565C0] to-[#29B6F6] rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(41,182,246,0.4)]">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
        <CardDescription className="text-white/70">
          Sign in to Digiwell
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert className={`${isNetworkError ? 'bg-orange-500/20 border-orange-500/50' : 'bg-red-500/20 border-red-500/50'}`}>
              {isNetworkError ? (
                <WifiOff className="h-4 w-4 text-orange-400" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-400" />
              )}
              <AlertDescription className={isNetworkError ? 'text-orange-200' : 'text-red-200'}>
                <div className="flex flex-col gap-2">
                  <span>{error}</span>
                  {isNetworkError && (
                    <div className="flex items-center gap-2 text-xs">
                      <Wifi className="w-3 h-3" />
                      <span>Check your connection and try again</span>
                      <Button
                        type="button"
                        variant="link"
                        onClick={handleRetry}
                        className="text-orange-300 hover:text-orange-100 p-0 h-auto text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="auth-field space-y-2">
            <Label htmlFor="email" className="text-white">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
            </div>
          </div>

          <div className="auth-field space-y-2">
            <Label htmlFor="password" className="text-white">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="auth-field flex justify-end">
            <Button
              type="button"
              variant="link"
              onClick={() => setShowForgotPassword(true)}
              className="text-[#00D4FF] hover:text-[#00B8E6] p-0 h-auto"
            >
              Forgot Password?
            </Button>
          </div>

          <div className="auth-field">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#1565C0] to-[#29B6F6] text-white font-bold hover:shadow-lg hover:shadow-[#29B6F6]/40 rounded-full transition-all hover:scale-[1.02]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <div className="text-center text-white/70 text-sm">
          Don't have an account?{' '}
          <Button
            variant="link"
            onClick={onSwitchToSignup}
            className="text-[#00D4FF] hover:text-[#00B8E6] p-0 h-auto"
          >
            Sign Up
          </Button>
        </div>
        <div className="text-center text-white/50 text-xs flex items-center justify-center gap-2">
          <Shield className="w-3 h-3" />
          Protected by 2FA • JWT authentication • Session persistence
        </div>
      </CardFooter>
    </Card>
  );
}
