import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import StripeCardForm from './StripeCardForm';
import DeliveryLocationInput from './DeliveryLocationInput';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ShoppingCart, CreditCard, MapPin, Package, Loader2, CheckCircle,
  AlertCircle, ArrowLeft, Minus, Plus, Calendar, Shield, Lock,
  Truck, FileText, Clock, ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  generateApplicationId,
  getApplicationType,
  BROKER_COMMISSION_RATE,
  BULK_ORDER_VOLUME_THRESHOLD,
  isBulkOrder,
  formatCurrency,
} from '@/lib/applicationId';

const STRIPE_ACCOUNT_ID = 'acct_1SrzM2HJxX010IuG';
const stripePromise = STRIPE_ACCOUNT_ID && STRIPE_ACCOUNT_ID !== 'STRIPE_ACCOUNT_ID'
  ? loadStripe('pk_live_51OJhJBHdGQpsHqInIzu7c6PzGPSH0yImD4xfpofvxvFZs0VFhPRXZCyEgYkkhOtBOXFWvssYASs851mflwQvjnrl00T6DbUwWZ', { stripeAccount: STRIPE_ACCOUNT_ID })
  : null;
const isStripeTestMode = false;


interface CheckoutProduct {
  id: string;
  name: string;
  code: string;
  price: number;
  unit: string;
  category: string;
  image?: string;
  minOrderQuantity?: number;
  isRWA?: boolean;
}

interface CheckoutPageProps {
  product: CheckoutProduct;
  onClose: () => void;
  onComplete: (order: any) => void;
  initialQuantity?: number;
}

const generateOrderNumber = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 6; i++) random += chars.charAt(Math.floor(Math.random() * chars.length));
  return `ORD-${new Date().getFullYear()}-${random}`;
};

export default function CheckoutPage({ product, onClose, onComplete, initialQuantity = 1 }: CheckoutPageProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'details' | 'payment' | 'success'>('details');
  const [quantity, setQuantity] = useState(initialQuantity);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryCoords, setDeliveryCoords] = useState<any>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [appId, setAppId] = useState('');

  const isAuthenticated = !!user?.id;
  const subtotal = quantity * product.price;
  // 0.87% broker commission included in total (hidden from line items)
  const brokerCommission = subtotal * BROKER_COMMISSION_RATE;
  const total = subtotal + brokerCommission;
  // Bulk determined by volume (quantity), not dollar amount
  const isBulk = isBulkOrder(quantity);

  const handleAddressSelect = (address: any) => {
    setDeliveryAddress(address.formatted_address || address.display_name || '');
    setDeliveryCoords(address.lat && address.lng ? { lat: address.lat, lng: address.lng } : null);
  };

  const validateDetails = () => {
    if (quantity <= 0) { setError('Please enter a valid quantity'); return false; }
    if (!deliveryAddress) { setError('Please enter a delivery address'); return false; }
    if (!deliveryDate) { setError('Please select a delivery date'); return false; }
    if (!isAuthenticated) {
      if (!guestName.trim()) { setError('Please enter your name'); return false; }
      if (!guestEmail.trim() || !guestEmail.includes('@')) { setError('Please enter a valid email'); return false; }
    }
    return true;
  };

  const proceedToPayment = async () => {
    if (!validateDetails()) return;
    setError('');
    const newAppId = generateApplicationId(product.code, product.isRWA, quantity);
    setAppId(newAppId);
    setStep('payment');
    await createPaymentIntent();
  };

  const createPaymentIntent = async () => {
    setStripeLoading(true);
    setStripeError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('stripe-payment-intent', {
        body: {
          amount: total,
          currency: 'usd',
          userId: user?.id,
          metadata: {
            productName: product.name,
            productCode: product.code,
            quantity: quantity.toString(),
            deliveryAddress,
            email: isAuthenticated ? userProfile?.email : guestEmail,
            name: isAuthenticated ? userProfile?.full_name : guestName,
          }
        }
      });
      if (fnError) throw fnError;
      if (!data?.success) throw new Error(data?.error || 'Failed to create payment intent');
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.id);
    } catch (err: any) {
      setStripeError(err.message || 'Failed to initialize payment');
    } finally {
      setStripeLoading(false);
    }
  };

  const handlePaymentSuccess = async (piId: string) => {
    const orderNum = generateOrderNumber();
    setOrderNumber(orderNum);

    try {
      const orderData: any = {
        order_number: orderNum,
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        quantity,
        unit_price: product.price,
        subtotal,
        service_fee: brokerCommission,
        total_amount: total,
        currency: 'USD',
        status: 'paid',
        delivery_status: 'pending',
        payment_method: 'stripe',
        payment_intent_id: piId,
        delivery_address: deliveryAddress,
        delivery_coordinates: deliveryCoords,
        delivery_date: deliveryDate,
        notes,
      };

      if (isAuthenticated) {
        orderData.user_id = user!.id;
      } else {
        orderData.guest_name = guestName;
        orderData.guest_email = guestEmail;
      }

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) console.error('Order save error:', orderError);
      if (orderResult) setOrderId(orderResult.id);

      // Record broker commission for analytics
      try {
        await supabase.from('service_fee_records').insert({
          application_id: appId,
          order_number: orderNum,
          product_name: product.name,
          product_code: product.code,
          product_type: product.isRWA ? 'rwa' : 'petroleum',
          subtotal,
          fee_rate: BROKER_COMMISSION_RATE,
          fee_amount: brokerCommission,
          total_with_fee: total,
          payment_method: 'stripe',
          is_digicoin: false,
          fee_waived: false,
          currency: 'USD',
          customer_email: isAuthenticated ? userProfile?.email : guestEmail,
          customer_name: isAuthenticated ? userProfile?.full_name : guestName,
        });
      } catch (err) {
        console.warn('Broker commission record error:', err);
      }

      // Send order confirmation email (non-blocking)
      const emailTo = isAuthenticated ? userProfile?.email : guestEmail;
      const customerName = isAuthenticated ? userProfile?.full_name : guestName;
      if (emailTo) {
        supabase.functions.invoke('sendgrid-notifications', {
          body: {
            action: 'send_template_email',
            to_email: emailTo,
            to_name: customerName,
            template_type: 'order_confirmation',
            data: {
              user_name: customerName,
              order_number: orderNum,
              product_name: product.name,
              quantity,
              unit: product.unit,
              subtotal: subtotal.toFixed(2),
              total: total.toFixed(2),
              delivery_address: deliveryAddress,
              delivery_date: deliveryDate,
              payment_method: 'Stripe',
            }
          }
        }).catch(err => console.warn('Email notification failed:', err));

        supabase.functions.invoke('order-status-webhook', {
          body: {
            action: 'notify_status_change',
            order_number: orderNum,
            customer_email: emailTo,
            customer_name: customerName || 'Valued Customer',
            product_name: product.name,
            quantity,
            total_amount: total,
            delivery_address: deliveryAddress,
            delivery_date: deliveryDate,
            old_status: 'new',
            new_status: 'processing',
          }
        }).catch(err => console.warn('Status webhook notification failed:', err));
      }

      // Silently trigger bulk order PDF email for orders above 250,000 litres/barrels
      if (isBulkOrder(quantity)) {
        supabase.functions.invoke('bulk-order-request', {
          body: {
            application_id: appId || generateApplicationId(product.code, product.isRWA, quantity),
            product_name: product.name,
            product_code: product.code,
            product_category: product.category,
            quantity,
            unit: product.unit,
            unit_price: product.price,
            subtotal,
            broker_commission: brokerCommission,
            total_amount: total,
            delivery_location: deliveryAddress,
            delivery_date: deliveryDate,
            delivery_coordinates: deliveryCoords,
            customer_name: customerName || 'Customer',
            customer_email: emailTo || '',
            customer_company: userProfile?.company || '',
            payment_method: 'stripe',
            notes,
            currency: 'USD',
            is_rwa: product.isRWA || false
          }
        }).catch(err => console.warn('Bulk order request failed:', err));
      }

      setStep('success');
      toast({ title: 'Payment Successful!', description: `Order ${orderNum} has been confirmed.` });
      onComplete({ orderNumber: orderNum, paymentIntentId: piId, total, quantity, applicationId: appId });
    } catch (err) {
      console.error('Post-payment error:', err);
      setStep('success');
    }
  };

  const handlePaymentError = (errorMsg: string) => {
    setStripeError(errorMsg);
  };

  const stripeElementsOptions = clientSecret ? {
    clientSecret,
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
  } : undefined;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl bg-gradient-to-br from-slate-800 to-slate-900 border-[#D4AF37]/50 max-h-[92vh] overflow-y-auto">
        <CardHeader className="sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10 border-b border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step === 'payment' && (
                <button onClick={() => { setStep('details'); setClientSecret(null); }} className="text-slate-400 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-[#D4AF37]" />
                  {step === 'details' ? 'Checkout' : step === 'payment' ? 'Payment' : 'Order Confirmed'}
                </CardTitle>
                <p className="text-slate-400 text-sm">{product.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {['Order Details', 'Payment', 'Confirmation'].map((label, i) => {
              const stepIdx = i;
              const currentIdx = step === 'details' ? 0 : step === 'payment' ? 1 : 2;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    stepIdx <= currentIdx ? 'bg-[#D4AF37] text-slate-900' : 'bg-slate-700 text-slate-400'
                  }`}>{stepIdx < currentIdx ? <CheckCircle className="w-4 h-4" /> : i + 1}</div>
                  <span className={`text-xs hidden sm:block ${stepIdx <= currentIdx ? 'text-[#D4AF37]' : 'text-slate-500'}`}>{label}</span>
                  {i < 2 && <div className={`flex-1 h-0.5 ${stepIdx < currentIdx ? 'bg-[#D4AF37]' : 'bg-slate-700'}`} />}
                </div>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {error && (
            <Alert className="bg-red-500/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {/* STEP 1: Order Details */}
          {step === 'details' && (
            <>
              {/* Product Summary */}
              <div className="bg-slate-700/50 rounded-xl p-4 flex items-center gap-4">
                {product.image && <img src={product.image} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />}
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg">{product.name}</h3>
                  <p className="text-slate-400 text-sm">{product.code} - {product.category}</p>
                  <p className="text-[#D4AF37] font-bold mt-1">${product.price.toFixed(2)} per {product.unit}</p>
                </div>
              </div>

              {/* Guest Info */}
              {!isAuthenticated && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-4">
                  <p className="text-amber-400 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" />Please provide your contact details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white">Your Name *</Label>
                      <Input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder="Full name" className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white">Email Address *</Label>
                      <Input type="email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} placeholder="your@email.com" className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                  </div>
                </div>
              )}

              {isAuthenticated && userProfile && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-green-400 text-sm font-medium">Signed in as {userProfile.full_name || userProfile.email}</p>
                    <p className="text-green-400/70 text-xs">{userProfile.email}</p>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2"><Package className="w-4 h-4" />Quantity ({product.unit}s) *</Label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="border-slate-600 text-white hover:bg-slate-700">
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-32 bg-slate-800 border-slate-600 text-white text-center text-lg font-bold" min="1" />
                  <Button variant="outline" size="sm" onClick={() => setQuantity(quantity + 1)} className="border-slate-600 text-white hover:bg-slate-700">
                    <Plus className="w-4 h-4" />
                  </Button>
                  <div className="flex gap-2 ml-2">
                    {[10, 100, 1000].map(q => (
                      <button key={q} onClick={() => setQuantity(q)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                        quantity === q ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}>{q.toLocaleString()}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <DeliveryLocationInput
                onAddressSelect={handleAddressSelect}
                initialValue={deliveryAddress}
                label="Delivery Address *"
                placeholder="Enter delivery address..."
                required
                showMap={false}
              />

              {/* Delivery Date */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2"><Calendar className="w-4 h-4" />Delivery Date *</Label>
                <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                  className="bg-slate-800 border-slate-600 text-white" min={new Date().toISOString().split('T')[0]} />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-white">Notes (Optional)</Label>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..."
                  className="bg-slate-800 border-slate-600 text-white" />
              </div>

              {/* Order Summary - No broker commission line item shown */}
              <div className="bg-slate-700/50 rounded-xl p-5 space-y-3">
                <h4 className="text-white font-bold flex items-center gap-2"><FileText className="w-4 h-4 text-[#D4AF37]" />Order Summary</h4>
                <div className="flex justify-between text-slate-300"><span>Unit Price</span><span>${product.price.toFixed(2)} / {product.unit}</span></div>
                <div className="flex justify-between text-slate-300"><span>Quantity</span><span>{quantity.toLocaleString()} {product.unit}s</span></div>
                <div className="flex justify-between text-slate-300"><span>Subtotal</span><span>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                <div className="border-t border-slate-600 pt-3 flex justify-between text-lg font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-[#D4AF37]">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <Button onClick={proceedToPayment} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-6 text-lg">
                Proceed to Payment <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </>
          )}

          {/* STEP 2: Payment */}
          {step === 'payment' && (
            <>
              <div className="bg-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{product.name}</p>
                  <p className="text-slate-400 text-sm">{quantity.toLocaleString()} {product.unit}s - {deliveryAddress.substring(0, 40)}...</p>
                </div>
                <div className="text-right">
                  <p className="text-[#D4AF37] font-bold text-xl">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {stripeLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-10 h-10 animate-spin text-[#D4AF37] mx-auto mb-4" />
                  <p className="text-slate-400">Initializing secure payment...</p>
                  <p className="text-slate-500 text-sm mt-1">Setting up encrypted connection with Stripe</p>
                </div>
              ) : stripeError && !clientSecret ? (
                <div className="space-y-4">
                  <Alert className="bg-red-500/20 border-red-500/50">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-200">{stripeError}</AlertDescription>
                  </Alert>
                  <Button onClick={createPaymentIntent} className="w-full bg-slate-700 text-white">Try Again</Button>
                </div>
              ) : clientSecret && stripeElementsOptions ? (
                <Elements stripe={stripePromise} options={stripeElementsOptions}>
                  <StripeCardForm
                    clientSecret={clientSecret}
                    amount={total}
                    currency="USD"
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    loading={loading}
                    isTestMode={isStripeTestMode}
                  />
                </Elements>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-400">Unable to initialize payment. Please go back and try again.</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-4 text-slate-500 text-xs">
                <div className="flex items-center gap-1"><Lock className="w-3 h-3" /><span>256-bit SSL</span></div>
                <div className="flex items-center gap-1"><Shield className="w-3 h-3" /><span>PCI DSS Compliant</span></div>
              </div>
            </>
          )}

          {/* STEP 3: Success */}
          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-white font-bold text-2xl mb-2">Order Confirmed!</h3>
              <p className="text-slate-400 mb-4">Your payment has been processed and your order is being prepared.</p>

              {/* Application ID Display - clean, no type badge */}
              {appId && (
                <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 border-2 border-[#D4AF37]/50 rounded-xl p-4 mb-4">
                  <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Application ID</div>
                  <div className="text-[#D4AF37] font-mono text-xl font-bold tracking-wider">{appId}</div>
                </div>
              )}

              <div className="bg-slate-700/50 rounded-xl p-5 space-y-3 text-left mb-6">
                <div className="flex justify-between"><span className="text-slate-400">Order Number</span><span className="text-[#D4AF37] font-mono font-bold">{orderNumber}</span></div>
                {appId && <div className="flex justify-between"><span className="text-slate-400">Application ID</span><span className="text-white font-mono text-sm">{appId}</span></div>}
                <div className="flex justify-between"><span className="text-slate-400">Product</span><span className="text-white">{product.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Quantity</span><span className="text-white">{quantity.toLocaleString()} {product.unit}s</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Delivery</span><span className="text-white truncate max-w-[200px]">{deliveryAddress}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Delivery Date</span><span className="text-white">{deliveryDate}</span></div>
                <div className="border-t border-slate-600 pt-3 flex justify-between text-lg font-bold">
                  <span className="text-white">Total Paid</span>
                  <span className="text-green-400">${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                  <Truck className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                  <p className="text-blue-400 text-xs font-medium">Shipping Soon</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                  <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
                  <p className="text-green-400 text-xs font-medium">Payment Confirmed</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 text-center">
                  <Clock className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                  <p className="text-purple-400 text-xs font-medium">ETA: {deliveryDate}</p>
                </div>
              </div>

              <Button onClick={onClose} className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-5">
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
