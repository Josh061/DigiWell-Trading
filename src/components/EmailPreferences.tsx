import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Mail, Bell, TrendingUp, FileText, CreditCard, Shield, BarChart3,
  Loader2, CheckCircle, Megaphone, Lock, Save, RefreshCw, Send,
  AlertCircle, Clock, Package
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmailPrefs {
  application_submitted: boolean;
  application_status_update: boolean;
  price_alert_trigger: boolean;
  order_confirmation: boolean;
  payment_receipt: boolean;
  kyc_status_change: boolean;
  weekly_market_summary: boolean;
  promotional_emails: boolean;
  security_alerts: boolean;
}

const defaultPrefs: EmailPrefs = {
  application_submitted: true,
  application_status_update: true,
  price_alert_trigger: true,
  order_confirmation: true,
  payment_receipt: true,
  kyc_status_change: true,
  weekly_market_summary: true,
  promotional_emails: false,
  security_alerts: true,
};

const prefConfig = [
  {
    key: 'application_submitted' as keyof EmailPrefs,
    label: 'Application Submissions',
    description: 'Get notified when you submit a new application for product allocation',
    icon: FileText,
    category: 'Trading',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20'
  },
  {
    key: 'application_status_update' as keyof EmailPrefs,
    label: 'Application Status Updates',
    description: 'Receive updates when your application is approved, rejected, or requires action',
    icon: CheckCircle,
    category: 'Trading',
    color: 'text-green-400',
    bg: 'bg-green-500/20'
  },
  {
    key: 'price_alert_trigger' as keyof EmailPrefs,
    label: 'Price Alert Triggers',
    description: 'Get notified when commodity prices hit your configured alert thresholds',
    icon: TrendingUp,
    category: 'Market',
    color: 'text-[#D4AF37]',
    bg: 'bg-[#D4AF37]/20'
  },
  {
    key: 'order_confirmation' as keyof EmailPrefs,
    label: 'Order Confirmations',
    description: 'Receive order confirmation with 0.87% service fee breakdown and delivery details',
    icon: Package,
    category: 'Orders',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/20'
  },
  {
    key: 'payment_receipt' as keyof EmailPrefs,
    label: 'Payment Receipts',
    description: 'Get payment confirmation receipts for all transactions on the platform',
    icon: CreditCard,
    category: 'Payments',
    color: 'text-purple-400',
    bg: 'bg-purple-500/20'
  },
  {
    key: 'kyc_status_change' as keyof EmailPrefs,
    label: 'KYC Verification Updates',
    description: 'Receive notifications when your KYC verification status changes',
    icon: Shield,
    category: 'Account',
    color: 'text-orange-400',
    bg: 'bg-orange-500/20'
  },
  {
    key: 'weekly_market_summary' as keyof EmailPrefs,
    label: 'Weekly Market Summary',
    description: 'Receive a weekly digest of market trends, price movements, and trading insights',
    icon: BarChart3,
    category: 'Market',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/20'
  },
  {
    key: 'promotional_emails' as keyof EmailPrefs,
    label: 'Promotional Emails',
    description: 'Receive special offers, new feature announcements, and platform updates',
    icon: Megaphone,
    category: 'Marketing',
    color: 'text-pink-400',
    bg: 'bg-pink-500/20'
  },
  {
    key: 'security_alerts' as keyof EmailPrefs,
    label: 'Security Alerts',
    description: 'Critical security notifications including login attempts and password changes',
    icon: Lock,
    category: 'Security',
    color: 'text-red-400',
    bg: 'bg-red-500/20',
    required: true
  },
];

export default function EmailPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<EmailPrefs>(defaultPrefs);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchPreferences();
      fetchEmailLogs();
    }
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('email_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setPrefs({
          application_submitted: data.application_submitted,
          application_status_update: data.application_status_update,
          price_alert_trigger: data.price_alert_trigger,
          order_confirmation: data.order_confirmation,
          payment_receipt: data.payment_receipt,
          kyc_status_change: data.kyc_status_change,
          weekly_market_summary: data.weekly_market_summary,
          promotional_emails: data.promotional_emails,
          security_alerts: data.security_alerts,
        });
      }
    } catch (e) {
      // No prefs yet, use defaults
    }
    setLoading(false);
  };

  const fetchEmailLogs = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('email_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      setEmailLogs(data || []);
    } catch (e) { /* ignore */ }
  };

  const savePreferences = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('email_preferences')
        .upsert({
          user_id: user.id,
          ...prefs,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      toast({ title: 'Preferences Saved', description: 'Your email notification preferences have been updated.' });
    } catch (e: any) {
      // Try insert if upsert fails
      try {
        await supabase.from('email_preferences').insert({ user_id: user.id, ...prefs });
        toast({ title: 'Preferences Saved', description: 'Your email notification preferences have been created.' });
      } catch (e2) {
        toast({ title: 'Error', description: 'Failed to save preferences.', variant: 'destructive' });
      }
    }
    setSaving(false);
  };

  const sendTestEmail = async (templateType: string) => {
    if (!user) return;
    setSendingTest(templateType);
    try {
      const { data, error } = await supabase.functions.invoke('sendgrid-notifications', {
        body: {
          action: 'send_template_email',
          to_email: user.email,
          to_name: user.user_metadata?.full_name || 'User',
          template_type: templateType,
          data: {
            user_name: user.user_metadata?.full_name || 'User',
            product_name: 'Brent Crude Oil',
            quantity: '10,000',
            unit: 'barrels',
            delivery_location: 'Lagos, Nigeria',
            reference_id: 'APP-' + Date.now().toString().slice(-6),
            status: 'approved',
            commodity: 'Brent Crude Oil',
            direction: 'above',
            threshold: '80.00',
            current_price: '82.50',
            order_number: 'ORD-' + Date.now().toString().slice(-6),
            subtotal: '792,500',
            service_fee: '6,894.75',
            total: '799,394.75',
            amount: '799,394.75',
            payment_method: 'Stripe',
            transaction_id: 'TXN-' + Date.now().toString().slice(-8),
          }
        }
      });

      // Log the email
      await supabase.from('email_logs').insert({
        user_id: user.id,
        email_type: templateType,
        recipient_email: user.email || '',
        subject: `Test: ${templateType.replace(/_/g, ' ')}`,
        status: 'sent',
        metadata: { test: true }
      });

      toast({ title: 'Test Email Sent', description: `A test ${templateType.replace(/_/g, ' ')} email has been sent to ${user.email}` });
      fetchEmailLogs();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to send test email.', variant: 'destructive' });
    }
    setSendingTest(null);
  };

  const togglePref = (key: keyof EmailPrefs) => {
    if (key === 'security_alerts') return; // Can't disable security
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const enableAll = () => setPrefs(Object.fromEntries(Object.keys(defaultPrefs).map(k => [k, true])) as EmailPrefs);
  const disableOptional = () => setPrefs(prev => ({
    ...prev,
    promotional_emails: false,
    weekly_market_summary: false,
  }));

  const categories = [...new Set(prefConfig.map(p => p.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-[#D4AF37]" />
            Email Notification Preferences
          </h2>
          <p className="text-slate-400 text-sm">Manage which email notifications you receive from Digiwell</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={enableAll} variant="outline" size="sm" className="border-green-400 text-green-400 text-xs">
            Enable All
          </Button>
          <Button onClick={disableOptional} variant="outline" size="sm" className="border-slate-400 text-slate-400 text-xs">
            Essential Only
          </Button>
        </div>
      </div>

      {/* Preference Cards by Category */}
      {categories.map(category => (
        <div key={category}>
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-[#D4AF37] rounded-full" />
            {category}
          </h3>
          <div className="space-y-3">
            {prefConfig.filter(p => p.category === category).map(pref => {
              const Icon = pref.icon;
              return (
                <Card key={pref.key} className="bg-white/5 backdrop-blur-md border-white/10 hover:border-white/20 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 ${pref.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`w-5 h-5 ${pref.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-white font-medium text-sm">{pref.label}</h4>
                            {pref.required && <Badge className="bg-red-500/20 text-red-400 text-[10px]">Required</Badge>}
                          </div>
                          <p className="text-slate-400 text-xs mt-0.5">{pref.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <button
                          onClick={() => sendTestEmail(pref.key)}
                          disabled={sendingTest === pref.key}
                          className="text-xs text-slate-400 hover:text-[#D4AF37] transition-colors flex items-center gap-1"
                        >
                          {sendingTest === pref.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                          Test
                        </button>
                        <Switch
                          checked={prefs[pref.key]}
                          onCheckedChange={() => togglePref(pref.key)}
                          disabled={pref.required}
                          className="data-[state=checked]:bg-[#D4AF37]"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={saving} className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F] px-8">
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Preferences
        </Button>
      </div>

      {/* Recent Email Log */}
      {emailLogs.length > 0 && (
        <Card className="bg-white/5 backdrop-blur-md border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#D4AF37]" />
              Recent Email Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {emailLogs.map(log => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <div>
                      <p className="text-white text-sm">{log.subject}</p>
                      <p className="text-slate-500 text-xs">{log.recipient_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={log.status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
                      {log.status}
                    </Badge>
                    <span className="text-slate-500 text-xs">{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
