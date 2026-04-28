import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Fingerprint,
  Smartphone,
  Shield,
  CheckCircle,
  AlertCircle,
  Trash2,
  Plus,
  Key,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Info
} from 'lucide-react';

interface BiometricCredential {
  id: string;
  credential_id: string;
  device_name: string;
  created_at: string;
  last_used_at: string | null;
}

export default function BiometricAuth() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    checkWebAuthnSupport();
    if (user) {
      loadCredentials();
      loadSettings();
    }
  }, [user]);

  const checkWebAuthnSupport = () => {
    const supported = window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function';
    setIsSupported(supported);
  };

  const loadCredentials = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('biometric_credentials')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCredentials(data);
        setBiometricEnabled(data.length > 0);
      }
    } catch (err) {
      console.error('Error loading credentials:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    // Load biometric settings from localStorage
    const settings = localStorage.getItem(`biometric_settings_${user?.id}`);
    if (settings) {
      const parsed = JSON.parse(settings);
      setBiometricEnabled(parsed.enabled);
    }
  };

  const saveSettings = (enabled: boolean) => {
    localStorage.setItem(`biometric_settings_${user?.id}`, JSON.stringify({
      enabled,
      updatedAt: new Date().toISOString()
    }));
  };

  const generateChallenge = (): Uint8Array => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array;
  };

  const bufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const base64ToBuffer = (base64: string): ArrayBuffer => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const registerBiometric = async () => {
    if (!user || !isSupported) return;
    
    setRegistering(true);
    setMessage(null);

    try {
      const challenge = generateChallenge();
      
      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: 'Digiwell Trading',
          id: window.location.hostname
        },
        user: {
          id: new TextEncoder().encode(user.id),
          name: user.email || 'user',
          displayName: user.email || 'Digiwell User'
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' }  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (credential) {
        const response = credential.response as AuthenticatorAttestationResponse;
        
        // Store credential in database
        const { error } = await supabase
          .from('biometric_credentials')
          .insert({
            user_id: user.id,
            credential_id: bufferToBase64(credential.rawId),
            public_key: bufferToBase64(response.getPublicKey() || new ArrayBuffer(0)),
            device_name: deviceName || getDeviceName(),
            counter: 0
          });

        if (error) {
          throw error;
        }

        setBiometricEnabled(true);
        saveSettings(true);
        await loadCredentials();
        setShowAddDevice(false);
        setDeviceName('');
        setMessage({ type: 'success', text: 'Biometric authentication enabled successfully!' });
      }
    } catch (err: any) {
      console.error('Biometric registration error:', err);
      if (err.name === 'NotAllowedError') {
        setMessage({ type: 'error', text: 'Biometric registration was cancelled or not allowed.' });
      } else if (err.name === 'NotSupportedError') {
        setMessage({ type: 'error', text: 'Your device does not support biometric authentication.' });
      } else {
        setMessage({ type: 'error', text: 'Failed to register biometric. Please try again.' });
      }
    } finally {
      setRegistering(false);
    }
  };

  const authenticateWithBiometric = async (): Promise<boolean> => {
    if (!user || !isSupported || credentials.length === 0) return false;

    try {
      const challenge = generateChallenge();
      
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        timeout: 60000,
        rpId: window.location.hostname,
        allowCredentials: credentials.map(cred => ({
          id: base64ToBuffer(cred.credential_id),
          type: 'public-key' as const,
          transports: ['internal'] as AuthenticatorTransport[]
        })),
        userVerification: 'required'
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      if (assertion) {
        // Update last used timestamp
        const credentialId = bufferToBase64(assertion.rawId);
        await supabase
          .from('biometric_credentials')
          .update({ last_used_at: new Date().toISOString() })
          .eq('credential_id', credentialId);

        return true;
      }
      return false;
    } catch (err) {
      console.error('Biometric authentication error:', err);
      return false;
    }
  };

  const removeCredential = async (credentialId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('biometric_credentials')
        .delete()
        .eq('id', credentialId)
        .eq('user_id', user.id);

      if (!error) {
        await loadCredentials();
        setMessage({ type: 'success', text: 'Device removed successfully.' });
      }
    } catch (err) {
      console.error('Error removing credential:', err);
      setMessage({ type: 'error', text: 'Failed to remove device.' });
    }
  };

  const handlePinSetup = () => {
    setPinError('');
    
    if (pin.length < 4 || pin.length > 6) {
      setPinError('PIN must be 4-6 digits');
      return;
    }
    
    if (!/^\d+$/.test(pin)) {
      setPinError('PIN must contain only numbers');
      return;
    }
    
    if (pin !== confirmPin) {
      setPinError('PINs do not match');
      return;
    }

    // Store encrypted PIN
    const encryptedPin = btoa(pin); // In production, use proper encryption
    localStorage.setItem(`pin_${user?.id}`, encryptedPin);
    
    setShowPinSetup(false);
    setPin('');
    setConfirmPin('');
    setMessage({ type: 'success', text: 'PIN set successfully as fallback authentication.' });
  };

  const verifyPin = (inputPin: string): boolean => {
    const storedPin = localStorage.getItem(`pin_${user?.id}`);
    if (!storedPin) return false;
    return atob(storedPin) === inputPin;
  };

  const getDeviceName = (): string => {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Android/.test(ua)) return 'Android Device';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Linux/.test(ua)) return 'Linux Device';
    return 'Unknown Device';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-900/50 border-slate-700">
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-[#D4AF37] animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-900/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#D4AF37] to-[#B8941F] rounded-xl flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <CardTitle className="text-white">Biometric Authentication</CardTitle>
                <CardDescription className="text-slate-400">
                  Secure your account with fingerprint or Face ID
                </CardDescription>
              </div>
            </div>
            <Badge className={isSupported 
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : 'bg-red-500/20 text-red-400 border-red-500/30'
            }>
              {isSupported ? 'Supported' : 'Not Supported'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Message Alert */}
      {message && (
        <Alert className={message.type === 'success' 
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-red-500/10 border-red-500/30'
        }>
          {message.type === 'success' 
            ? <CheckCircle className="w-4 h-4 text-green-400" />
            : <AlertCircle className="w-4 h-4 text-red-400" />
          }
          <AlertDescription className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {!isSupported ? (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-white font-semibold mb-2">Biometric Not Available</h3>
                <p className="text-slate-300 text-sm">
                  Your browser or device doesn't support biometric authentication. 
                  Please use a modern browser on a device with biometric capabilities, 
                  or set up a PIN as an alternative.
                </p>
                <Button 
                  className="mt-4 bg-amber-500 hover:bg-amber-600 text-slate-900"
                  onClick={() => setShowPinSetup(true)}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Set Up PIN Instead
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Enable/Disable Toggle */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold">Enable Biometric Login</h3>
                    <p className="text-slate-400 text-sm">
                      Use fingerprint or Face ID to sign in quickly and securely
                    </p>
                  </div>
                </div>
                <Switch
                  checked={biometricEnabled}
                  onCheckedChange={(checked) => {
                    if (checked && credentials.length === 0) {
                      setShowAddDevice(true);
                    } else {
                      setBiometricEnabled(checked);
                      saveSettings(checked);
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Registered Devices */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-[#D4AF37]" />
                  Registered Devices
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setShowAddDevice(true)}
                  className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Device
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {credentials.length === 0 ? (
                <div className="text-center py-8">
                  <Fingerprint className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No devices registered yet</p>
                  <p className="text-slate-500 text-sm">Add a device to enable biometric login</p>
                </div>
              ) : (
                credentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-green-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{cred.device_name}</p>
                        <p className="text-slate-400 text-xs">
                          Added {formatDate(cred.created_at)}
                          {cred.last_used_at && ` • Last used ${formatDate(cred.last_used_at)}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCredential(cred.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Fallback PIN */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-[#D4AF37]" />
                Fallback PIN
              </CardTitle>
              <CardDescription className="text-slate-400">
                Set a PIN as backup when biometric authentication fails
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">PIN Authentication</p>
                    <p className="text-slate-400 text-sm">
                      {localStorage.getItem(`pin_${user?.id}`) 
                        ? 'PIN is set' 
                        : 'No PIN configured'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowPinSetup(true)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {localStorage.getItem(`pin_${user?.id}`) ? 'Change PIN' : 'Set PIN'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Info */}
          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-blue-400 flex-shrink-0" />
                <div>
                  <h3 className="text-white font-semibold mb-2">How It Works</h3>
                  <ul className="space-y-2 text-slate-300 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      Your biometric data never leaves your device
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      Uses industry-standard WebAuthn/FIDO2 protocols
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      Credentials are encrypted and stored securely
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                      PIN fallback ensures you're never locked out
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add Device Dialog */}
      <Dialog open={showAddDevice} onOpenChange={setShowAddDevice}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Fingerprint className="w-5 h-5 text-[#D4AF37]" />
              Register Biometric
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Add your device's biometric authentication (fingerprint or Face ID)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Device Name (Optional)</Label>
              <Input
                placeholder={getDeviceName()}
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="bg-slate-900 border-slate-700 text-white"
              />
              <p className="text-slate-500 text-xs">
                Give this device a name to identify it later
              </p>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                  <Fingerprint className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white font-medium">Ready to Register</p>
                  <p className="text-slate-400 text-sm">
                    You'll be prompted to use your biometric
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDevice(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={registerBiometric}
              disabled={registering}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
            >
              {registering ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Register Biometric
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PIN Setup Dialog */}
      <Dialog open={showPinSetup} onOpenChange={setShowPinSetup}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-[#D4AF37]" />
              Set Fallback PIN
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a 4-6 digit PIN as backup authentication
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Enter PIN</Label>
              <div className="relative">
                <Input
                  type={showPin ? 'text' : 'password'}
                  placeholder="Enter 4-6 digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  className="bg-slate-900 border-slate-700 text-white pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Confirm PIN</Label>
              <Input
                type={showPin ? 'text' : 'password'}
                placeholder="Confirm your PIN"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                maxLength={6}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            {pinError && (
              <Alert className="bg-red-500/10 border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <AlertDescription className="text-red-400">{pinError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPinSetup(false);
                setPin('');
                setConfirmPin('');
                setPinError('');
              }}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePinSetup}
              className="bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
            >
              <Key className="w-4 h-4 mr-2" />
              Save PIN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Export helper function for use in login
export const useBiometricAuth = () => {
  const checkSupport = () => {
    return window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function';
  };

  const authenticate = async (userId: string): Promise<boolean> => {
    if (!checkSupport()) return false;

    try {
      const { data: credentials } = await supabase
        .from('biometric_credentials')
        .select('credential_id')
        .eq('user_id', userId);

      if (!credentials || credentials.length === 0) return false;

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const base64ToBuffer = (base64: string): ArrayBuffer => {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
      };

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          timeout: 60000,
          rpId: window.location.hostname,
          allowCredentials: credentials.map(cred => ({
            id: base64ToBuffer(cred.credential_id),
            type: 'public-key' as const,
            transports: ['internal'] as AuthenticatorTransport[]
          })),
          userVerification: 'required'
        }
      });

      return !!assertion;
    } catch (err) {
      console.error('Biometric auth error:', err);
      return false;
    }
  };

  return { checkSupport, authenticate };
};
