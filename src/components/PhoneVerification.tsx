import { useState, useEffect } from 'react';
import { Phone, CheckCircle, Send, Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function PhoneVerification() {
  const { user } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      supabase.functions.invoke('sms-notifications', {
        body: { action: 'get-verified-phone', userId: user.id }
      }).then(({ data }) => {
        if (data?.phone?.phone_number) setVerifiedPhone(data.phone.phone_number);
      });
    }
  }, [user]);

  const sendVerification = async () => {
    if (!phone || !user) return;
    setLoading(true);
    setError('');
    const { data } = await supabase.functions.invoke('sms-notifications', {
      body: { action: 'send-verification', userId: user.id, phoneNumber: phone }
    });
    setLoading(false);
    if (data?.success) {
      setStep('verify');
      setSuccess('Verification code sent!');
    } else {
      setError(data?.error || 'Failed to send code');
    }
  };

  const verifyCode = async () => {
    if (!code || !user) return;
    setLoading(true);
    setError('');
    const { data } = await supabase.functions.invoke('sms-notifications', {
      body: { action: 'verify-code', userId: user.id, code }
    });
    setLoading(false);
    if (data?.success) {
      setVerifiedPhone(phone);
      setStep('input');
      setCode('');
      setSuccess('Phone verified successfully!');
    } else {
      setError(data?.error || 'Invalid code');
    }
  };

  if (verifiedPhone) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <p className="text-green-400 font-medium">Phone Verified</p>
            <p className="text-slate-400 text-sm">{verifiedPhone}</p>
          </div>
          <button onClick={() => setVerifiedPhone(null)} className="ml-auto text-slate-500 text-sm hover:text-white">
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-[#D4AF37]" />
        <h4 className="font-medium text-white">Phone Verification</h4>
      </div>
      <p className="text-slate-400 text-sm mb-4">Verify your phone to receive SMS alerts</p>
      
      {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {success && <p className="text-green-400 text-sm mb-3">{success}</p>}

      {step === 'input' ? (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+1234567890" className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white" />
          </div>
          <button onClick={sendVerification} disabled={loading || !phone}
            className="flex items-center gap-2 bg-[#D4AF37] text-slate-900 px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
            <Send className="w-4 h-4" /> {loading ? 'Sending...' : 'Send Code'}
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input type="text" value={code} onChange={e => setCode(e.target.value)} maxLength={6}
            placeholder="Enter 6-digit code" className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-center tracking-widest" />
          <button onClick={verifyCode} disabled={loading || code.length !== 6}
            className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50">
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button onClick={() => setStep('input')} className="text-slate-400 px-3 hover:text-white">Back</button>
        </div>
      )}
    </div>
  );
}
