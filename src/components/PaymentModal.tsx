import { useState, useEffect, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, Building2, FileText, Coins, Loader2, CheckCircle, 
  AlertCircle, Upload, Copy, ExternalLink, Shield, Lock, FlaskConical,
  DollarSign, Banknote, Edit3, Gift, Percent, Globe, Building
} from 'lucide-react';
import StripeCardForm from './StripeCardForm';

// Initialize Stripe with connected account
const STRIPE_ACCOUNT_ID = 'acct_1SrzM2HJxX010IuG';
const stripePromise = STRIPE_ACCOUNT_ID && STRIPE_ACCOUNT_ID !== 'STRIPE_ACCOUNT_ID'
  ? loadStripe('pk_live_51OJhJBHdGQpsHqInIzu7c6PzGPSH0yImD4xfpofvxvFZs0VFhPRXZCyEgYkkhOtBOXFWvssYASs851mflwQvjnrl00T6DbUwWZ', { stripeAccount: STRIPE_ACCOUNT_ID })
  : null;
const isStripeTestMode = false;


interface PaymentModalProps {
  amount: number;
  currency: string;
  allocationId: string;
  productName: string;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  allowPriceEdit?: boolean;
}

// 0% Service Fee - No fees on any transactions!
const SERVICE_FEE_RATE = 0;

// Bank Account Details for Digiwell Exploration Limited
const BANK_ACCOUNTS = {
  NGN: {
    bankName: 'Providus Bank PLC',
    accountName: 'Digiwell Exploration Limited',
    accountNumber: '1308106128',
    currency: 'Nigerian Naira (NGN)',
    swiftCodeLocal: 'UMPLNGLAXXX',
    swiftCodeInternational: 'UMPLNGLA',
    bankAddress: 'Providus Bank PLC, Lagos, Nigeria',
    sortCode: '101'
  },
  USD: {
    bankName: 'Providus Bank PLC',
    accountName: 'Digiwell Exploration Limited',
    accountNumber: '1308106104',
    currency: 'US Dollars (USD)',
    swiftCodeLocal: 'UMPLNGLAXXX',
    swiftCodeInternational: 'UMPLNGLA',
    bankAddress: 'Providus Bank PLC, Lagos, Nigeria',
    correspondentBank: 'Contact bank for correspondent details'
  }
};

export default function PaymentModal({ 
  amount: initialAmount, 
  currency: initialCurrency, 
  allocationId, 
  productName,
  onClose, 
  onSuccess,
  allowPriceEdit = true
}: PaymentModalProps) {
  const { user, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('card');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  
  // Price editing states
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [customAmount, setCustomAmount] = useState(initialAmount.toString());
  const [amount, setAmount] = useState(initialAmount);
  const [currency, setCurrency] = useState(initialCurrency);
  
  // Bank transfer states
  const [selectedBankCurrency, setSelectedBankCurrency] = useState<'NGN' | 'USD'>('USD');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Stripe-specific states
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  
  // Form states for other payment methods
  const [bankReceipt, setBankReceipt] = useState<File | null>(null);
  const [locDocument, setLocDocument] = useState<File | null>(null);

  // 0% service fee - no fees!
  const serviceFee = 0;
  const totalAmount = amount + serviceFee;

  // Handle price update
  const handlePriceUpdate = () => {
    const newAmount = parseFloat(customAmount);
    if (!isNaN(newAmount) && newAmount > 0) {
      setAmount(newAmount);
      setIsEditingPrice(false);
      // Reset Stripe client secret when amount changes
      setClientSecret(null);
    }
  };

  // Create Stripe Payment Intent when card tab is selected
  useEffect(() => {
    if (activeTab === 'card' && !clientSecret) {
      createStripePaymentIntent();
    }
  }, [activeTab, amount]);

  const createStripePaymentIntent = async () => {
    setStripeLoading(true);
    setStripeError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('stripe-payment-intent', {
        body: {
          amount: totalAmount, // Send in dollars, edge function converts to cents
          currency: currency.toLowerCase(),
          userId: user?.id,
          metadata: {
            allocationId,
            productName,
            email: userProfile?.email,
            name: userProfile?.full_name,
          }
        }
      });

      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Failed to create payment intent');

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error('Error creating payment intent:', err);
      setStripeError(err.message || 'Failed to initialize payment. Please try again.');
    } finally {
      setStripeLoading(false);
    }
  };


  const handleStripeSuccess = (paymentIntentId: string) => {
    setSuccess(true);
    setPaymentData({ paymentIntentId, method: 'stripe' });
    onSuccess(paymentIntentId);
  };

  const handleStripeError = (errorMessage: string) => {
    setStripeError(errorMessage);
  };

  const handlePayment = async (paymentMethod: string) => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('payment-processor', {
        body: {
          action: 'create-payment',
          paymentMethod,
          amount,
          currency,
          userId: user?.id,
          allocationId,
          metadata: {
            email: userProfile?.email,
            name: userProfile?.full_name,
            productName
          }
        }
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error || 'Payment failed');

      setPaymentData(data);

      if (paymentMethod === 'flutterwave' && data.paymentLink) {
        window.open(data.paymentLink, '_blank');
        setSuccess(true);
      } else if (paymentMethod === 'bank_transfer') {
        // Use our predefined bank details
        const bankDetails = BANK_ACCOUNTS[selectedBankCurrency];
        setPaymentData({
          ...data,
          bankDetails: {
            ...bankDetails,
            reference: `DW-${allocationId.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
            amount: totalAmount,
            currency: selectedBankCurrency
          }
        });
        setSuccess(true);
      } else if (paymentMethod === 'loc') {
        setSuccess(true);
      } else if (paymentMethod === 'digicoin') {
        setSuccess(true);
        onSuccess(data.txRef);
      }
    } catch (err: any) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Stripe Elements appearance options
  const stripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#D4AF37',
        colorBackground: '#1e293b',
        colorText: '#ffffff',
        colorDanger: '#ef4444',
        fontFamily: '"Inter", system-ui, sans-serif',
        borderRadius: '8px',
      },
    },
  };

  if (success && paymentData) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg bg-gradient-to-br from-slate-800 to-slate-900 border-[#D4AF37]">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              {activeTab === 'bank_transfer' ? 'Bank Transfer Details' : 
               activeTab === 'lc' ? 'LC Submission' : 
               activeTab === 'digicoin' ? 'DigiCoin Payment' : 
               'Payment Successful'}
            </CardTitle>

          </CardHeader>
          <CardContent className="space-y-4">
            {activeTab === 'card' && (
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="text-center mb-4">
                  <div className="text-green-400 font-bold text-lg mb-2">Payment Confirmed!</div>
                  <div className="text-slate-400 text-sm">Your card payment has been processed successfully.</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Amount Paid</span>
                  <span className="text-[#D4AF37] font-bold">{currency} {totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Payment ID</span>
                  <span className="text-white font-mono text-xs">{paymentData.paymentIntentId?.slice(0, 20)}...</span>
                </div>
              </div>
            )}

            {activeTab === 'bank_transfer' && paymentData.bankDetails && (
              <div className="space-y-4">
                {/* Bank Header */}
                <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#00D4FF]/20 rounded-lg p-4 border border-[#D4AF37]/30">
                  <div className="flex items-center gap-3 mb-2">
                    <Building className="w-6 h-6 text-[#D4AF37]" />
                    <div>
                      <div className="text-white font-bold">{paymentData.bankDetails.bankName}</div>
                      <div className="text-slate-400 text-sm">{paymentData.bankDetails.accountName}</div>
                    </div>
                  </div>
                  <Badge className="bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30">
                    {paymentData.bankDetails.currency}
                  </Badge>
                </div>

                {/* Account Details */}
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono font-bold text-lg">{paymentData.bankDetails.accountNumber}</span>
                      <button 
                        onClick={() => copyToClipboard(paymentData.bankDetails.accountNumber, 'account')} 
                        className={`p-1.5 rounded ${copiedField === 'account' ? 'bg-green-500/20 text-green-400' : 'text-[#00D4FF] hover:bg-[#00D4FF]/20'}`}
                      >
                        {copiedField === 'account' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">SWIFT Code (Local)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{paymentData.bankDetails.swiftCodeLocal}</span>
                      <button 
                        onClick={() => copyToClipboard(paymentData.bankDetails.swiftCodeLocal, 'swiftLocal')} 
                        className={`p-1.5 rounded ${copiedField === 'swiftLocal' ? 'bg-green-500/20 text-green-400' : 'text-[#00D4FF] hover:bg-[#00D4FF]/20'}`}
                      >
                        {copiedField === 'swiftLocal' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">SWIFT Code (International)</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{paymentData.bankDetails.swiftCodeInternational}</span>
                      <button 
                        onClick={() => copyToClipboard(paymentData.bankDetails.swiftCodeInternational, 'swiftIntl')} 
                        className={`p-1.5 rounded ${copiedField === 'swiftIntl' ? 'bg-green-500/20 text-green-400' : 'text-[#00D4FF] hover:bg-[#00D4FF]/20'}`}
                      >
                        {copiedField === 'swiftIntl' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Payment Reference</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[#D4AF37] font-mono font-bold">{paymentData.bankDetails.reference}</span>
                      <button 
                        onClick={() => copyToClipboard(paymentData.bankDetails.reference, 'reference')} 
                        className={`p-1.5 rounded ${copiedField === 'reference' ? 'bg-green-500/20 text-green-400' : 'text-[#00D4FF] hover:bg-[#00D4FF]/20'}`}
                      >
                        {copiedField === 'reference' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-600 pt-3 mt-3">
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-white font-bold">Total Amount</span>
                      <span className="text-[#D4AF37] font-bold text-xl">
                        {paymentData.bankDetails.currency === 'NGN' ? '₦' : '$'} {totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <Alert className="bg-amber-500/10 border-amber-500/30">
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  <AlertDescription className="text-amber-200">
                    <strong>Important:</strong> Please include the payment reference in your transfer description. 
                    Your payment will be confirmed within 24-48 hours after receipt.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {activeTab === 'digicoin' && (
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-[#D4AF37] mb-2">Ð {amount.toLocaleString()}</div>
                  <div className="text-green-400 text-sm">0% service fee - Always!</div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Wallet Address</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-xs">{paymentData.walletAddress?.slice(0, 10)}...{paymentData.walletAddress?.slice(-8)}</span>
                    <button onClick={() => copyToClipboard(paymentData.walletAddress, 'wallet')} className="text-[#00D4FF]">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Network</span>
                  <span className="text-white">{paymentData.network}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Transaction Ref</span>
                  <span className="text-[#00D4FF]">{paymentData.txRef}</span>
                </div>
              </div>
            )}

            {activeTab === 'loc' && paymentData.locRequirements && (
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Beneficiary</span>
                  <span className="text-white">{paymentData.locRequirements.beneficiary}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Bank</span>
                  <span className="text-white">{paymentData.locRequirements.beneficiaryBank}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Validity</span>
                  <span className="text-white">{paymentData.locRequirements.validityPeriod}</span>
                </div>
                <div className="mt-3">
                  <span className="text-slate-400 text-sm">Required Documents:</span>
                  <ul className="mt-2 space-y-1">
                    {paymentData.locRequirements.requiredDocuments.map((doc: string, idx: number) => (
                      <li key={idx} className="text-white text-sm flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <Alert className="bg-blue-500/20 border-blue-500/50">
              <Shield className="h-4 w-4 text-blue-400" />
              <AlertDescription className="text-blue-200">
                {paymentData.instructions || 'Your payment has been processed securely.'}
              </AlertDescription>
            </Alert>

            <Button onClick={onClose} className="w-full bg-[#D4AF37] text-slate-900 font-bold">
              Done
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-[#D4AF37] max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
          <div className="flex-1">
            {/* Test Mode Banner */}
            {isStripeTestMode && (
              <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-amber-500/20 border border-amber-500/40 rounded-lg w-fit">
                <FlaskConical className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 text-xs font-semibold uppercase tracking-wide">Test Mode</span>
              </div>
            )}
            <CardTitle className="text-2xl font-bold text-white">Payment</CardTitle>
            <p className="text-slate-400 text-sm">{productName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </CardHeader>
        
        <CardContent>
          {/* 0% Service Fee Banner */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <Percent className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="text-green-400 font-bold text-lg">0% Service Fee</div>
                <div className="text-slate-400 text-sm">No hidden charges on any transaction method!</div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-lg px-3 py-1">
                FREE
              </Badge>
            </div>
          </div>

          {/* Referral Reward Banner */}
          <div className="bg-gradient-to-r from-[#D4AF37]/20 to-purple-500/20 border border-[#D4AF37]/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                <Gift className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div className="flex-1">
                <div className="text-[#D4AF37] font-bold">0.25% Referral Reward</div>

                <div className="text-slate-400 text-sm">Earn DigiCoin when your referrals make their first purchase!</div>
              </div>
            </div>
          </div>

          {/* Amount Summary with Price Edit */}
          <div className="bg-slate-700/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Amount</span>
              <div className="flex items-center gap-2">
                {isEditingPrice ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-32 h-8 bg-slate-800 border-[#D4AF37] text-white text-right"
                      min="0"
                      step="0.01"
                    />
                    <Button size="sm" onClick={handlePriceUpdate} className="h-8 bg-green-500 hover:bg-green-600">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditingPrice(false)} className="h-8 text-slate-400">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className="text-white font-bold">{currency} {amount.toLocaleString()}</span>
                    {allowPriceEdit && (
                      <button 
                        onClick={() => {
                          setCustomAmount(amount.toString());
                          setIsEditingPrice(true);
                        }}
                        className="p-1 text-[#00D4FF] hover:bg-[#00D4FF]/20 rounded"
                        title="Edit price"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Service Fee (0%)</span>
              <span className="text-green-400 font-bold">FREE</span>
            </div>
            <div className="border-t border-slate-600 pt-2 mt-2">
              <div className="flex justify-between items-center text-lg">
                <span className="text-white font-bold">Total</span>
                <span className="text-[#D4AF37] font-bold">{currency} {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {error && (
            <Alert className="mb-4 bg-red-500/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-5 bg-slate-700/50 mb-6">
              <TabsTrigger value="card" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                <CreditCard className="w-4 h-4 mr-1" />
                Card
              </TabsTrigger>
              <TabsTrigger value="flutterwave" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                <ExternalLink className="w-4 h-4 mr-1" />
                Flutter
              </TabsTrigger>
              <TabsTrigger value="bank_transfer" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                <Building2 className="w-4 h-4 mr-1" />
                Bank
              </TabsTrigger>
              <TabsTrigger value="lc" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                <FileText className="w-4 h-4 mr-1" />
                LC
              </TabsTrigger>
              <TabsTrigger value="digicoin" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                <Coins className="w-4 h-4 mr-1" />
                DigiCoin
              </TabsTrigger>
            </TabsList>


            <TabsContent value="card" className="space-y-4">
              {stripeLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37] mx-auto mb-4" />
                  <p className="text-slate-400">Initializing secure payment...</p>
                </div>
              ) : stripeError && !clientSecret ? (
                <div className="space-y-4">
                  <Alert className="bg-red-500/20 border-red-500/50">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">{stripeError}</AlertDescription>
                  </Alert>
                  <Button
                    onClick={createStripePaymentIntent}
                    className="w-full bg-slate-700 text-white"
                  >
                    Try Again
                  </Button>
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={stripeElementsOptions}>
                  <StripeCardForm
                    clientSecret={clientSecret}
                    amount={totalAmount}
                    currency={currency}
                    onSuccess={handleStripeSuccess}
                    onError={handleStripeError}
                    loading={loading}
                    isTestMode={isStripeTestMode}
                  />
                </Elements>

              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">Unable to initialize payment. Please try another method.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="flutterwave" className="space-y-4">
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="w-10 h-10 text-orange-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Flutterwave Payment</h3>
                <p className="text-slate-400 mb-4">
                  You'll be redirected to Flutterwave to complete your payment securely.
                  Supports cards, bank transfer, mobile money, and more.
                </p>
              </div>
              <Button
                onClick={() => handlePayment('flutterwave')}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Pay with Flutterwave
              </Button>
            </TabsContent>

            <TabsContent value="bank_transfer" className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Bank Transfer</h3>
                <p className="text-slate-400 mb-4">
                  Transfer directly to Digiwell Exploration Limited's Providus Bank account.
                </p>
              </div>

              {/* Currency Selection */}
              <div className="space-y-3">
                <Label className="text-white">Select Payment Currency</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedBankCurrency('NGN')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedBankCurrency === 'NGN' 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedBankCurrency === 'NGN' ? 'bg-[#D4AF37]/20' : 'bg-slate-700'
                      }`}>
                        <Banknote className={`w-5 h-5 ${selectedBankCurrency === 'NGN' ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                      </div>
                      <div className="text-left">
                        <div className={`font-bold ${selectedBankCurrency === 'NGN' ? 'text-[#D4AF37]' : 'text-white'}`}>
                          Nigerian Naira
                        </div>
                        <div className="text-slate-400 text-sm">NGN Account</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedBankCurrency('USD')}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedBankCurrency === 'USD' 
                        ? 'border-[#D4AF37] bg-[#D4AF37]/10' 
                        : 'border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        selectedBankCurrency === 'USD' ? 'bg-[#D4AF37]/20' : 'bg-slate-700'
                      }`}>
                        <DollarSign className={`w-5 h-5 ${selectedBankCurrency === 'USD' ? 'text-[#D4AF37]' : 'text-slate-400'}`} />
                      </div>
                      <div className="text-left">
                        <div className={`font-bold ${selectedBankCurrency === 'USD' ? 'text-[#D4AF37]' : 'text-white'}`}>
                          US Dollars
                        </div>
                        <div className="text-slate-400 text-sm">USD Account</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bank Account Preview */}
              <div className="bg-slate-700/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 mb-3">
                  <Building className="w-5 h-5 text-[#D4AF37]" />
                  <span className="text-white font-bold">{BANK_ACCOUNTS[selectedBankCurrency].bankName}</span>
                </div>
                <div className="text-slate-400 text-sm">
                  <span className="text-white">{BANK_ACCOUNTS[selectedBankCurrency].accountName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Account:</span>
                  <span className="text-[#D4AF37] font-mono font-bold">{BANK_ACCOUNTS[selectedBankCurrency].accountNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-sm">SWIFT: {BANK_ACCOUNTS[selectedBankCurrency].swiftCodeInternational}</span>
                </div>
              </div>

              {/* Upload Payment Evidence */}
              <div className="space-y-3 bg-slate-700/30 rounded-xl p-4 border border-slate-600">
                <Label className="text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#D4AF37]" />
                  Upload Payment Evidence (PDF/JPEG)
                </Label>
                <p className="text-slate-400 text-sm">
                  Upload your bank transfer receipt or proof of payment for faster approval.
                </p>
                <div className="border-2 border-dashed border-slate-500 rounded-lg p-6 text-center hover:border-[#D4AF37] transition-colors">
                  <input
                    type="file"
                    onChange={(e) => setBankReceipt(e.target.files?.[0] || null)}
                    className="hidden"
                    id="bank-receipt-upload"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="bank-receipt-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    {bankReceipt ? (
                      <div className="space-y-1">
                        <span className="text-green-400 font-medium">{bankReceipt.name}</span>
                        <p className="text-slate-500 text-xs">Click to change file</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[#00D4FF] font-medium">Click to upload payment evidence</span>
                        <p className="text-slate-500 text-xs">Supported: PDF, JPEG, PNG (Max 10MB)</p>
                      </div>
                    )}
                  </label>
                </div>
                {bankReceipt && (
                  <Alert className="bg-green-500/10 border-green-500/30">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-200">
                      Payment evidence attached. This will be reviewed for faster approval.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Button
                onClick={() => handlePayment('bank_transfer')}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {bankReceipt ? 'Submit Transfer with Evidence' : 'Get Bank Transfer Details'}
              </Button>
            </TabsContent>

            <TabsContent value="lc" className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">Letter of Credit (LC)</h3>
                <p className="text-slate-400 mb-4">
                  Submit an irrevocable Letter of Credit for large transactions.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Upload LC Document</Label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    onChange={(e) => setLocDocument(e.target.files?.[0] || null)}
                    className="hidden"
                    id="lc-upload"
                    accept=".pdf,.doc,.docx"
                  />
                  <label htmlFor="lc-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <span className="text-slate-400">
                      {locDocument ? locDocument.name : 'Click to upload LC document'}
                    </span>
                  </label>
                </div>
              </div>
              <Button
                onClick={() => handlePayment('lc')}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit LC
              </Button>
            </TabsContent>


            <TabsContent value="digicoin" className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-[#D4AF37]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl text-[#D4AF37]">Ð</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-2">DigiCoin Payment</h3>
                <p className="text-green-400 mb-2 font-bold">0% Service Fee - Always!</p>
                <p className="text-slate-400">
                  Pay with DigiCoin from your blockchain wallet. Fast, secure, and fee-free.
                </p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                <div className="text-green-400 font-bold text-lg">Best Value Payment Method</div>
                <div className="text-slate-400 text-sm">Instant settlement with zero fees</div>
              </div>
              <Button
                onClick={() => handlePayment('digicoin')}
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Coins className="w-4 h-4 mr-2" />}
                Pay Ð {amount.toLocaleString()} DigiCoin
              </Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex items-center justify-center gap-4 text-slate-500 text-xs">
            <div className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>PCI DSS Compliant</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
