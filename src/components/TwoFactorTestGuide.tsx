import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield, Smartphone, Key, CheckCircle, XCircle, Loader2,
  Copy, QrCode, RefreshCw, AlertTriangle
} from 'lucide-react';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
}

export default function TwoFactorTestGuide() {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [secret, setSecret] = useState('');
  const [otpauthUrl, setOtpauthUrl] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyResult, setVerifyResult] = useState<'success' | 'error' | null>(null);

  const runSetupTest = async () => {
    setTesting(true);
    setTestResults([]);
    
    const results: TestResult[] = [];
    
    // Step 1: Test 2FA setup endpoint
    results.push({ step: 'Initiating 2FA Setup', status: 'pending', message: 'Calling setup endpoint...' });
    setTestResults([...results]);
    
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: {
          action: 'setup',
          userId: 'test-user-' + Date.now(),
          email: 'test@example.com'
        }
      });
      
      if (error) throw error;
      
      if (data?.success && data?.secret) {
        results[results.length - 1] = {
          step: 'Initiating 2FA Setup',
          status: 'success',
          message: 'Setup successful! Secret generated.'
        };
        setSecret(data.secret);
        setOtpauthUrl(data.otpauthUrl);
        setBackupCodes(data.backupCodes || []);
      } else {
        throw new Error('Invalid response from setup endpoint');
      }
    } catch (err: any) {
      results[results.length - 1] = {
        step: 'Initiating 2FA Setup',
        status: 'error',
        message: err.message || 'Setup failed'
      };
    }
    
    setTestResults([...results]);
    setTesting(false);
  };

  const verifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setVerifyResult('error');
      return;
    }
    
    setTesting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('two-factor-auth', {
        body: {
          action: 'verify',
          userId: 'test-user',
          secret,
          token: verificationCode
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        setVerifyResult('success');
      } else {
        setVerifyResult('error');
      }
    } catch (err) {
      setVerifyResult('error');
    }
    
    setTesting(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="w-7 h-7 text-[#D4AF37]" />
          Two-Factor Authentication Test Guide
        </h2>
        <p className="text-slate-400 mt-1">Test and verify the 2FA implementation</p>
      </div>

      {/* Step 1: Setup Test */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#D4AF37] text-slate-900 flex items-center justify-center font-bold">1</span>
            Test 2FA Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400">
            Click the button below to test the 2FA setup endpoint. This will generate a secret key and QR code URL.
          </p>
          
          <Button 
            onClick={runSetupTest} 
            disabled={testing}
            className="bg-[#D4AF37] text-slate-900 hover:bg-[#c9a432]"
          >
            {testing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Key className="w-4 h-4 mr-2" />
            )}
            Run Setup Test
          </Button>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="space-y-2 mt-4">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                  {result.status === 'pending' && <Loader2 className="w-5 h-5 text-yellow-400 animate-spin" />}
                  {result.status === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                  {result.status === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
                  <div>
                    <p className="text-white font-medium">{result.step}</p>
                    <p className="text-sm text-slate-400">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Generated Secret */}
          {secret && (
            <div className="mt-4 p-4 bg-white/5 rounded-lg space-y-4">
              <div>
                <Label className="text-slate-400">Secret Key (Base32)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    value={secret} 
                    readOnly 
                    className="bg-white/10 border-white/20 text-white font-mono"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(secret)}
                    className="border-white/20 text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-slate-400">OTPAuth URL</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input 
                    value={otpauthUrl} 
                    readOnly 
                    className="bg-white/10 border-white/20 text-white font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => copyToClipboard(otpauthUrl)}
                    className="border-white/20 text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Use this URL to generate a QR code or add directly to your authenticator app
                </p>
              </div>

              {backupCodes.length > 0 && (
                <div>
                  <Label className="text-slate-400">Backup Codes</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {backupCodes.slice(0, 6).map((code, i) => (
                      <Badge key={i} variant="outline" className="font-mono text-white border-white/20 justify-center py-2">
                        {code}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Verify Code */}
      {secret && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#D4AF37] text-slate-900 flex items-center justify-center font-bold">2</span>
              Verify TOTP Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-blue-500/50 bg-blue-500/10">
              <Smartphone className="w-4 h-4 text-blue-400" />
              <AlertDescription className="text-blue-300">
                Add the secret key to your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code below.
              </AlertDescription>
            </Alert>

            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="text-slate-400">Enter 6-digit code</Label>
                <Input
                  value={verificationCode}
                  onChange={(e) => {
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                    setVerifyResult(null);
                  }}
                  placeholder="000000"
                  className="bg-white/10 border-white/20 text-white text-center text-2xl tracking-widest font-mono mt-1"
                  maxLength={6}
                />
              </div>
              <div className="flex items-end">
                <Button 
                  onClick={verifyCode}
                  disabled={testing || verificationCode.length !== 6}
                  className="bg-[#D4AF37] text-slate-900 hover:bg-[#c9a432]"
                >
                  {testing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>
            </div>

            {verifyResult === 'success' && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <AlertDescription className="text-green-300">
                  Verification successful! The TOTP code is valid.
                </AlertDescription>
              </Alert>
            )}

            {verifyResult === 'error' && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <XCircle className="w-4 h-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  Verification failed. The code is invalid or expired. Make sure your device time is synchronized.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border-[#D4AF37]/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#D4AF37]" />
            Testing Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-slate-300">
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <span>Click "Run Setup Test" to generate a new 2FA secret key</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <span>Copy the secret key and add it to your authenticator app (Google Authenticator, Authy, Microsoft Authenticator)</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <span>Enter the 6-digit code from your authenticator app and click "Verify"</span>
            </li>
            <li className="flex gap-3">
              <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <span>If verification succeeds, the 2FA implementation is working correctly</span>
            </li>
          </ol>

          <div className="mt-4 p-3 bg-white/5 rounded-lg">
            <p className="text-sm text-slate-400">
              <strong className="text-white">Note:</strong> The TOTP algorithm uses a 30-second time window. 
              Codes are valid for the current and adjacent time periods to account for clock drift.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
