import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Smartphone,
  Building,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Shield,
  Globe,
  ArrowRight,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  Zap,
  MapPin,
  Banknote,
  QrCode,
  Check,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoice_number: string;
  user_email: string;
  user_name: string;
  total_amount: number;
  currency: string;
  payment_status: string;
  qr_code_url?: string;
  verification_code?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  serviceFee: number;
  currencies: string[];
  recommended: boolean;
}

interface InvoicePaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onPaymentSuccess: (invoice: Invoice) => void;
}

// Digiwell Exploration Limited Bank Account Details - Providus Bank PLC
const BANK_ACCOUNTS = {
  naira: {
    bankName: 'Providus Bank PLC',
    accountName: 'Digiwell Exploration Limited',
    accountNumber: '1308106128',
    currency: 'NGN',
    currencySymbol: '₦',
    swiftCode: 'UMPLNGLAXXX',
  },
  usd: {
    bankName: 'Providus Bank PLC',
    accountName: 'Digiwell Exploration Limited',
    accountNumber: '1308106104',
    currency: 'USD',
    currencySymbol: '$',
    swiftCodeLocal: 'UMPLNGLAXXX',
    swiftCodeInternational: 'UMPLNGLA',
  },
};

// 0% Service Fee
const SERVICE_FEE_RATE = 0;

export default function InvoicePaymentModal({
  open,
  onOpenChange,
  invoice,
  onPaymentSuccess,
}: InvoicePaymentModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'processing' | 'stripe' | 'flutterwave' | 'bank' | 'success' | 'error'>('select');
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [recommendedMethod, setRecommendedMethod] = useState<string>('stripe');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [cardDetails, setCardDetails] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });
  const [userCountry, setUserCountry] = useState<string>('NG');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [bankTab, setBankTab] = useState<'naira' | 'usd'>('naira');

  useEffect(() => {
    if (open) {
      fetchPaymentMethods();
      detectUserLocation();
      setStep('select');
      setSelectedMethod(null);
      setError(null);
      // Auto-select bank tab based on currency
      if (invoice?.currency === 'NGN') {
        setBankTab('naira');
      } else {
        setBankTab('usd');
      }
    }
  }, [open, invoice]);

  const detectUserLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      setUserCountry(data.country_code || 'NG');
    } catch (error) {
      console.error('Error detecting location:', error);
      setUserCountry('NG');
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('payment-processor', {
        body: {
          action: 'get-payment-methods',
          metadata: {
            country: userCountry,
            currency: invoice?.currency || 'NGN',
          },
        },
      });

      if (error) throw error;

      setPaymentMethods(data.methods || getDefaultMethods());
      setRecommendedMethod(data.recommended || 'bank_transfer');
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      setPaymentMethods(getDefaultMethods());
    }
  };

  const getDefaultMethods = (): PaymentMethod[] => [
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      description: 'Direct transfer to Digiwell Exploration Limited - Providus Bank',
      icon: 'building',
      serviceFee: 0,
      currencies: ['NGN', 'USD', 'EUR', 'GBP'],
      recommended: true,
    },
    {
      id: 'stripe',
      name: 'Credit/Debit Card',
      description: 'Pay securely with Visa, Mastercard, or American Express',
      icon: 'credit-card',
      serviceFee: 0,
      currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
      recommended: false,
    },
    {
      id: 'flutterwave',
      name: 'Flutterwave',
      description: 'Pay with cards, bank transfer, mobile money, or USSD',
      icon: 'smartphone',
      serviceFee: 0,
      currencies: ['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'EUR', 'GBP'],
      recommended: false,
    },
  ];

  const getMethodIcon = (iconName: string) => {
    switch (iconName) {
      case 'credit-card':
        return <CreditCard className="w-6 h-6" />;
      case 'smartphone':
        return <Smartphone className="w-6 h-6" />;
      case 'building':
        return <Building className="w-6 h-6" />;
      default:
        return <CreditCard className="w-6 h-6" />;
    }
  };

  const calculateServiceFee = () => {
    if (!invoice) return 0;
    return invoice.total_amount * (SERVICE_FEE_RATE / 100);
  };

  const calculateTotal = () => {
    if (!invoice) return 0;
    return invoice.total_amount + calculateServiceFee();
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: Record<string, string> = { USD: '$', NGN: '₦', EUR: '€', GBP: '£' };
    const symbol = symbols[currency] || currency + ' ';
    return `${symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleSelectMethod = (methodId: string) => {
    setSelectedMethod(methodId);
  };

  const handleProceedToPayment = async () => {
    if (!selectedMethod || !invoice) return;

    setLoading(true);
    setError(null);

    try {
      if (selectedMethod === 'bank_transfer') {
        setStep('bank');
        setLoading(false);
        return;
      }

      if (selectedMethod === 'stripe') {
        const { data, error } = await supabase.functions.invoke('payment-processor', {
          body: {
            action: 'create-invoice-payment',
            paymentMethod: 'stripe',
            amount: invoice.total_amount,
            currency: invoice.currency,
            userId: user?.id,
            invoiceId: invoice.id,
            metadata: {
              email: invoice.user_email,
              name: invoice.user_name,
              invoiceNumber: invoice.invoice_number,
            },
          },
        });

        if (error) throw error;

        if (data.success) {
          setPaymentData(data);
          setStep('stripe');
        } else {
          throw new Error(data.error || 'Failed to create payment');
        }
      } else if (selectedMethod === 'flutterwave') {
        const { data, error } = await supabase.functions.invoke('payment-processor', {
          body: {
            action: 'create-invoice-payment',
            paymentMethod: 'flutterwave',
            amount: invoice.total_amount,
            currency: invoice.currency,
            userId: user?.id,
            invoiceId: invoice.id,
            metadata: {
              email: invoice.user_email,
              name: invoice.user_name,
              invoiceNumber: invoice.invoice_number,
              redirectUrl: `${window.location.origin}/payment/callback?invoice=${invoice.id}`,
            },
          },
        });

        if (error) throw error;

        if (data.success && data.paymentLink) {
          setPaymentData(data);
          setStep('flutterwave');
        } else {
          throw new Error(data.error || 'Failed to create payment');
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setError(error.message || 'An error occurred while processing your payment');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    if (!invoice || !paymentData) return;

    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { data, error } = await supabase.functions.invoke('payment-processor', {
        body: {
          action: 'confirm-invoice-payment',
          paymentMethod: 'stripe',
          amount: invoice.total_amount,
          currency: invoice.currency,
          metadata: {
            invoiceId: invoice.id,
            transactionId: paymentData.paymentIntentId,
            gateway: 'stripe',
          },
        },
      });

      if (error) throw error;

      if (data.success) {
        setStep('success');
        onPaymentSuccess(data.invoice);
      } else {
        throw new Error(data.error || 'Payment confirmation failed');
      }
    } catch (error: any) {
      console.error('Stripe payment error:', error);
      setError(error.message || 'Payment failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleFlutterwaveRedirect = () => {
    if (paymentData?.paymentLink) {
      window.open(paymentData.paymentLink, '_blank');
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    return parts.length ? parts.join(' ') : value;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  if (!invoice) return null;

  const currentBankAccount = bankTab === 'naira' ? BANK_ACCOUNTS.naira : BANK_ACCOUNTS.usd;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#D4AF37]" />
            Pay Invoice {invoice.invoice_number}
          </DialogTitle>
        </DialogHeader>

        {/* Invoice Summary */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-slate-400">Invoice Total</div>
                <div className="text-2xl font-bold text-[#D4AF37]">
                  {formatCurrency(invoice.total_amount, invoice.currency)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-400">Bill To</div>
                <div className="text-white font-medium">{invoice.user_name}</div>
                <div className="text-slate-400 text-sm">{invoice.user_email}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 0% Service Fee Banner */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-full">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <div className="text-green-400 font-semibold">0% Service Fee</div>
            <div className="text-green-300/70 text-sm">No additional charges on all transactions</div>
          </div>
        </div>

        {/* Step: Select Payment Method */}
        {step === 'select' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <MapPin className="w-4 h-4" />
              <span>Detected location: {userCountry}</span>
            </div>

            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <Card
                  key={method.id}
                  className={`cursor-pointer transition-all ${
                    selectedMethod === method.id
                      ? 'bg-[#D4AF37]/20 border-[#D4AF37]'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                  onClick={() => handleSelectMethod(method.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-lg ${
                          selectedMethod === method.id
                            ? 'bg-[#D4AF37]/30 text-[#D4AF37]'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {getMethodIcon(method.icon)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{method.name}</span>
                          {method.id === 'bank_transfer' && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                              Recommended
                            </Badge>
                          )}
                        </div>
                        <div className="text-slate-400 text-sm">{method.description}</div>
                        <div className="text-xs text-green-400 mt-1">
                          Service fee: 0% (FREE)
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedMethod === method.id
                            ? 'border-[#D4AF37] bg-[#D4AF37]'
                            : 'border-slate-600'
                        }`}
                      >
                        {selectedMethod === method.id && (
                          <Check className="w-3 h-3 text-slate-900" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedMethod && (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-white">
                      {formatCurrency(invoice.total_amount, invoice.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Service Fee</span>
                    <span className="text-green-400 font-medium">
                      0% (FREE)
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-700">
                    <span className="text-white font-semibold">Total to Pay</span>
                    <span className="text-[#D4AF37] font-bold text-lg">
                      {formatCurrency(calculateTotal(), invoice.currency)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="w-4 h-4" />
              <span>Your payment is secured with 256-bit SSL encryption</span>
            </div>

            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={handleProceedToPayment}
                disabled={!selectedMethod || loading}
                className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Continue to Payment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Bank Transfer - Digiwell Exploration Limited */}
        {step === 'bank' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#D4AF37] bg-[#D4AF37]/10 p-3 rounded-lg">
              <Building className="w-5 h-5" />
              <span className="text-sm font-medium">Digiwell Exploration Limited - Bank Transfer</span>
            </div>

            {/* Currency Tabs */}
            <Tabs value={bankTab} onValueChange={(v) => setBankTab(v as 'naira' | 'usd')}>
              <TabsList className="bg-slate-800/50 border border-slate-700 w-full">
                <TabsTrigger 
                  value="naira" 
                  className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900"
                >
                  <Banknote className="w-4 h-4 mr-2" />
                  Naira (NGN)
                </TabsTrigger>
                <TabsTrigger 
                  value="usd" 
                  className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900"
                >
                  <Globe className="w-4 h-4 mr-2" />
                  USD (International)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="naira" className="mt-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6 space-y-4">
                    <div className="text-center mb-4">
                      <div className="text-lg font-semibold text-white">Naira Account Details</div>
                      <div className="text-slate-400 text-sm">For local Nigerian transfers</div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <div className="text-xs text-slate-500 uppercase">Bank Name</div>
                          <div className="text-white font-medium">{BANK_ACCOUNTS.naira.bankName}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <div className="text-xs text-slate-500 uppercase">Account Name</div>
                          <div className="text-white font-medium">{BANK_ACCOUNTS.naira.accountName}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(BANK_ACCOUNTS.naira.accountName, 'accountName')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedField === 'accountName' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
                        <div>
                          <div className="text-xs text-[#D4AF37]/70 uppercase">Account Number</div>
                          <div className="text-[#D4AF37] font-bold text-xl font-mono">{BANK_ACCOUNTS.naira.accountNumber}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(BANK_ACCOUNTS.naira.accountNumber, 'accountNumber')}
                          className="text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/20"
                        >
                          {copiedField === 'accountNumber' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <div className="text-xs text-slate-500 uppercase">SWIFT Code (Local)</div>
                          <div className="text-white font-mono">{BANK_ACCOUNTS.naira.swiftCode}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(BANK_ACCOUNTS.naira.swiftCode, 'swiftCode')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedField === 'swiftCode' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usd" className="mt-4">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6 space-y-4">
                    <div className="text-center mb-4">
                      <div className="text-lg font-semibold text-white">USD Account Details</div>
                      <div className="text-slate-400 text-sm">For international wire transfers</div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <div className="text-xs text-slate-500 uppercase">Bank Name</div>
                          <div className="text-white font-medium">{BANK_ACCOUNTS.usd.bankName}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-slate-700/50 rounded-lg">
                        <div>
                          <div className="text-xs text-slate-500 uppercase">Account Name</div>
                          <div className="text-white font-medium">{BANK_ACCOUNTS.usd.accountName}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(BANK_ACCOUNTS.usd.accountName, 'usdAccountName')}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedField === 'usdAccountName' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="flex justify-between items-center p-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
                        <div>
                          <div className="text-xs text-[#D4AF37]/70 uppercase">Account Number</div>
                          <div className="text-[#D4AF37] font-bold text-xl font-mono">{BANK_ACCOUNTS.usd.accountNumber}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(BANK_ACCOUNTS.usd.accountNumber, 'usdAccountNumber')}
                          className="text-[#D4AF37] hover:text-[#D4AF37] hover:bg-[#D4AF37]/20"
                        >
                          {copiedField === 'usdAccountNumber' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-700/50 rounded-lg">
                          <div className="text-xs text-slate-500 uppercase">SWIFT Code (Local)</div>
                          <div className="flex items-center justify-between">
                            <span className="text-white font-mono text-sm">{BANK_ACCOUNTS.usd.swiftCodeLocal}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(BANK_ACCOUNTS.usd.swiftCodeLocal, 'swiftLocal')}
                              className="text-slate-400 hover:text-white h-6 w-6 p-0"
                            >
                              {copiedField === 'swiftLocal' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                          <div className="text-xs text-blue-400/70 uppercase">SWIFT Code (International)</div>
                          <div className="flex items-center justify-between">
                            <span className="text-blue-400 font-mono font-semibold">{BANK_ACCOUNTS.usd.swiftCodeInternational}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(BANK_ACCOUNTS.usd.swiftCodeInternational, 'swiftIntl')}
                              className="text-blue-400 hover:text-blue-400 h-6 w-6 p-0"
                            >
                              {copiedField === 'swiftIntl' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Amount to Transfer */}
            <Card className="bg-gradient-to-r from-[#D4AF37]/20 to-[#B8941F]/20 border-[#D4AF37]/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[#D4AF37]/70 text-sm">Amount to Transfer</div>
                    <div className="text-[#D4AF37] font-bold text-2xl">
                      {formatCurrency(calculateTotal(), invoice.currency)}
                    </div>
                  </div>
                  {invoice.qr_code_url && (
                    <div className="text-center">
                      <img src={invoice.qr_code_url} alt="QR Code" className="w-16 h-16 rounded-lg bg-white p-1" />
                      <div className="text-xs text-slate-400 mt-1">Scan to verify</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Reference */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-yellow-400 font-medium">Important: Payment Reference</div>
                  <div className="text-yellow-300/80 text-sm mt-1">
                    Please include the invoice number <span className="font-mono font-bold">{invoice.invoice_number}</span> as your payment reference/narration.
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(invoice.invoice_number, 'invoiceNumber')}
                    className="mt-2 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/20"
                  >
                    {copiedField === 'invoiceNumber' ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    Copy Invoice Number
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2 text-blue-400 text-sm">
                <Shield className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Your invoice will be marked as paid once we confirm receipt of your payment (usually within 1-2 business days for local transfers, 3-5 days for international).
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('select')} className="text-slate-400">
                Back
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Stripe Payment */}
        {step === 'stripe' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-400 bg-green-500/10 p-3 rounded-lg">
              <Lock className="w-5 h-5" />
              <span className="text-sm">Secure payment powered by Stripe</span>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Card Number</Label>
                <Input
                  value={cardDetails.number}
                  onChange={(e) =>
                    setCardDetails({ ...cardDetails, number: formatCardNumber(e.target.value) })
                  }
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Expiry Date</Label>
                  <Input
                    value={cardDetails.expiry}
                    onChange={(e) =>
                      setCardDetails({ ...cardDetails, expiry: formatExpiry(e.target.value) })
                    }
                    placeholder="MM/YY"
                    maxLength={5}
                    className="bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">CVC</Label>
                  <Input
                    value={cardDetails.cvc}
                    onChange={(e) =>
                      setCardDetails({
                        ...cardDetails,
                        cvc: e.target.value.replace(/\D/g, '').slice(0, 4),
                      })
                    }
                    placeholder="123"
                    maxLength={4}
                    className="bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Cardholder Name</Label>
                <Input
                  value={cardDetails.name}
                  onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-slate-800/50 border-slate-600 text-white"
                />
              </div>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <span className="text-slate-400">Amount to charge</span>
                  <span className="text-[#D4AF37] font-bold text-lg">
                    {formatCurrency(calculateTotal(), invoice.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('select')} className="text-slate-400">
                Back
              </Button>
              <Button
                onClick={handleStripePayment}
                disabled={
                  loading ||
                  !cardDetails.number ||
                  !cardDetails.expiry ||
                  !cardDetails.cvc ||
                  !cardDetails.name
                }
                className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Pay {formatCurrency(calculateTotal(), invoice.currency)}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Flutterwave Payment */}
        {step === 'flutterwave' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-purple-400 bg-purple-500/10 p-3 rounded-lg">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Secure payment powered by Flutterwave</span>
            </div>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                  <Globe className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Complete Payment on Flutterwave</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    You'll be redirected to Flutterwave's secure payment page.
                  </p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-lg">
                  <div className="text-sm text-slate-400">Transaction Reference</div>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <code className="text-white font-mono">{paymentData?.txRef}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(paymentData?.txRef, 'txRef')}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedField === 'txRef' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="text-[#D4AF37] font-bold text-2xl">
                  {formatCurrency(calculateTotal(), invoice.currency)}
                </div>
              </CardContent>
            </Card>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2 text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  After completing payment on Flutterwave, return to this page and click "Verify Payment" to confirm.
                </span>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setStep('select')} className="text-slate-400">
                Back
              </Button>
              <Button
                onClick={handleFlutterwaveRedirect}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Pay with Flutterwave
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="space-y-4 text-center py-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-xl">Payment Successful!</h3>
              <p className="text-slate-400 mt-2">
                Your payment has been processed successfully. A confirmation email has been sent to {invoice.user_email}.
              </p>
            </div>
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-400">Amount Paid</span>
                  <span className="text-green-400 font-bold text-xl">
                    {formatCurrency(calculateTotal(), invoice.currency)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <DialogFooter className="justify-center">
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step: Error */}
        {step === 'error' && (
          <div className="space-y-4 text-center py-6">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-xl">Payment Failed</h3>
              <p className="text-slate-400 mt-2">
                {error || 'An error occurred while processing your payment. Please try again.'}
              </p>
            </div>
            <DialogFooter className="justify-center gap-2">
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-400"
              >
                Cancel
              </Button>
              <Button
                onClick={() => setStep('select')}
                className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
