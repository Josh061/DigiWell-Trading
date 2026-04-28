import { useState } from 'react';
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Loader2, CheckCircle, AlertCircle, Lock, Shield, ChevronDown, ChevronUp, Copy, Check, FlaskConical } from 'lucide-react';

interface StripeCardFormProps {
  clientSecret: string;
  amount: number;
  currency: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  loading?: boolean;
  isTestMode?: boolean;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#94a3b8',
      },
      iconColor: '#D4AF37',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
  hidePostalCode: false,
};

// Test card numbers for Stripe testing
const TEST_CARDS = [
  { number: '4242424242424242', description: 'Successful payment', brand: 'Visa' },
  { number: '5555555555554444', description: 'Successful payment', brand: 'Mastercard' },
  { number: '378282246310005', description: 'Successful payment', brand: 'Amex' },
  { number: '4000002500003155', description: 'Requires 3D Secure authentication', brand: 'Visa' },
  { number: '4000000000009995', description: 'Declined - insufficient funds', brand: 'Visa' },
  { number: '4000000000000002', description: 'Declined - generic decline', brand: 'Visa' },
];

export default function StripeCardForm({
  clientSecret,
  amount,
  currency,
  onSuccess,
  onError,
  loading: externalLoading,
  isTestMode = false,
}: StripeCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showTestCards, setShowTestCards] = useState(false);
  const [copiedCard, setCopiedCard] = useState<string | null>(null);

  const copyCardNumber = (cardNumber: string) => {
    navigator.clipboard.writeText(cardNumber);
    setCopiedCard(cardNumber);
    setTimeout(() => setCopiedCard(null), 2000);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      onError('Stripe has not loaded yet. Please try again.');
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError('Card element not found.');
      return;
    }

    setProcessing(true);
    setCardError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        setCardError(error.message || 'Payment failed');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        setPaymentSuccess(true);
        onSuccess(paymentIntent.id);
      } else if (paymentIntent && paymentIntent.status === 'requires_action') {
        // Handle 3D Secure authentication
        const { error: confirmError, paymentIntent: confirmedIntent } = await stripe.confirmCardPayment(clientSecret);
        if (confirmError) {
          setCardError(confirmError.message || 'Authentication failed');
          onError(confirmError.message || 'Authentication failed');
        } else if (confirmedIntent && confirmedIntent.status === 'succeeded') {
          setPaymentSuccess(true);
          onSuccess(confirmedIntent.id);
        }
      }
    } catch (err: any) {
      setCardError(err.message || 'An unexpected error occurred');
      onError(err.message || 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setCardError(event.error.message);
    } else {
      setCardError(null);
    }
  };

  if (paymentSuccess) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">Payment Successful!</h3>
        <p className="text-slate-400">Your payment has been processed securely.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Test Mode Card Numbers Section */}
      {isTestMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowTestCards(!showTestCards)}
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-amber-500/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-amber-400" />
              <span className="text-amber-300 font-medium text-sm">Test Card Numbers</span>
            </div>
            {showTestCards ? (
              <ChevronUp className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-400" />
            )}
          </button>
          
          {showTestCards && (
            <div className="px-4 pb-4 space-y-2">
              <p className="text-xs text-amber-200/70 mb-3">
                Use these test cards with any future expiry date and any 3-digit CVC:
              </p>
              <div className="space-y-2">
                {TEST_CARDS.map((card) => (
                  <div
                    key={card.number}
                    className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-white font-mono text-sm">{card.number}</code>
                        <span className="text-xs text-slate-500 hidden sm:inline">({card.brand})</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{card.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCardNumber(card.number)}
                      className="ml-2 p-1.5 rounded-md hover:bg-slate-700 transition-colors flex-shrink-0"
                      title="Copy card number"
                    >
                      {copiedCard === card.number ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4 text-slate-400 group-hover:text-white" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-amber-500/20">
                <p className="text-xs text-amber-200/60">
                  <strong>Tip:</strong> Use expiry <code className="bg-slate-700 px-1 rounded">12/34</code> and CVC <code className="bg-slate-700 px-1 rounded">123</code> (or <code className="bg-slate-700 px-1 rounded">1234</code> for Amex)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card Input Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-white font-medium flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#D4AF37]" />
            Card Details
          </label>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Lock className="w-3 h-3" />
            Secured by Stripe
          </div>
        </div>
        
        {/* Stripe Card Element Container */}
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4 transition-all duration-200 focus-within:border-[#D4AF37] focus-within:ring-1 focus-within:ring-[#D4AF37]/50">
          <CardElement
            options={CARD_ELEMENT_OPTIONS}
            onChange={handleCardChange}
          />
        </div>

        {/* Card Brands */}
        <div className="flex items-center gap-3 mt-3">
          <span className="text-xs text-slate-500">Accepted:</span>
          <div className="flex items-center gap-2">
            <div className="bg-white rounded px-2 py-1">
              <svg viewBox="0 0 38 24" className="h-4 w-auto">
                <path fill="#1434CB" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z"/>
                <path fill="#fff" d="M15 19l2-12h3l-2 12h-3zm12-12c-.6-.2-1.5-.5-2.7-.5-3 0-5.1 1.5-5.1 3.7 0 1.6 1.5 2.5 2.6 3 1.1.5 1.5.9 1.5 1.4 0 .7-.9 1.1-1.7 1.1-1.1 0-1.8-.2-2.7-.5l-.4-.2-.4 2.4c.7.3 1.9.5 3.2.5 3.2 0 5.3-1.5 5.3-3.8 0-1.3-.8-2.3-2.5-3.1-1-.5-1.7-.9-1.7-1.4 0-.5.5-1 1.7-1 1 0 1.7.2 2.2.4l.3.1.4-2.1zM28 7h2.3c.7 0 1.2.2 1.5 1l3.5 10h-3l-.7-2h-3.6l-.4 2h-3l3.4-11zm2 7l-.8-4-.6 4h1.4zM11 7l-3 8-.3-1.5c-.5-1.8-2.2-3.7-4-4.7l2.7 10h3.2l4.8-12H11z"/>
              </svg>
            </div>
            <div className="bg-white rounded px-2 py-1">
              <svg viewBox="0 0 38 24" className="h-4 w-auto">
                <path fill="#FF5F00" d="M22.2 12c0 2.7-1.3 5.1-3.2 6.6-1.9-1.5-3.2-3.9-3.2-6.6s1.3-5.1 3.2-6.6c1.9 1.5 3.2 3.9 3.2 6.6z"/>
                <path fill="#EB001B" d="M15.8 12c0-2.7 1.3-5.1 3.2-6.6C17.1 4 14.8 3 12.2 3 6.7 3 2.2 7 2.2 12s4.5 9 10 9c2.6 0 4.9-1 6.8-2.4-1.9-1.5-3.2-3.9-3.2-6.6z"/>
                <path fill="#F79E1B" d="M35.8 12c0 5-4.5 9-10 9-2.6 0-4.9-1-6.8-2.4 1.9-1.5 3.2-3.9 3.2-6.6s-1.3-5.1-3.2-6.6C20.9 4 23.2 3 25.8 3c5.5 0 10 4 10 9z"/>
              </svg>
            </div>
            <div className="bg-white rounded px-2 py-1">
              <svg viewBox="0 0 38 24" className="h-4 w-auto">
                <path fill="#006FCF" d="M35 0H3C1.3 0 0 1.3 0 3v18c0 1.7 1.3 3 3 3h32c1.7 0 3-1.3 3-3V3c0-1.7-1.3-3-3-3z"/>
                <path fill="#fff" d="M19 21l-1.5-4h-6l-1.5 4H7l6-14h3l6 14h-3zm-5-7h3l-1.5-4-1.5 4zm14-7v14h-3v-5h-3v5h-3V7h3v6h3V7h3z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {cardError && (
        <Alert className="bg-red-500/20 border-red-500/50">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-200">{cardError}</AlertDescription>
        </Alert>
      )}

      {/* Security Notice */}
      <div className="bg-slate-700/30 rounded-lg p-3 flex items-start gap-3">
        <Shield className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-400">
          <p className="font-medium text-slate-300 mb-1">Your payment is secure</p>
          <p>Card details are encrypted and sent directly to Stripe. We never store your card information on our servers.</p>
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!stripe || !cardComplete || processing || externalLoading}
        className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-6 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing || externalLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Processing...
          </>
        ) : (
          <>
            <Lock className="w-5 h-5 mr-2" />
            Pay {currency} {amount.toLocaleString()}
          </>
        )}
      </Button>

      {/* Additional Info */}
      <p className="text-center text-xs text-slate-500">
        By completing this payment, you agree to our Terms of Service
      </p>
    </form>
  );
}
