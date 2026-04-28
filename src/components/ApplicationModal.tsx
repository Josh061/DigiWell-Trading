import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import PaymentModal from './PaymentModal';
import DeliveryLocationInput from './DeliveryLocationInput';
import PriceInputModal from './PriceInputModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, MapPin, Calendar, CreditCard, Loader2, 
  CheckCircle, AlertCircle, TrendingUp, Coins, User, Mail,
  Edit3, Percent, Gift, DollarSign, Calculator, Send, Building2,
  Hash, ShieldCheck, Truck
} from 'lucide-react';
import {
  generateApplicationId,
  getApplicationType,
  getApplicationTypeLabel,
  getApplicationTypeColor,
  BROKER_COMMISSION_RATE,
  BULK_ORDER_VOLUME_THRESHOLD,
  isBulkOrder,
  formatCurrency,
} from '@/lib/applicationId';

interface ApplicationModalProps {
  product: {
    id: string;
    name: string;
    code: string;
    price: number;
    unit: string;
    category: string;
    image?: string;
    minOrderQuantity?: number;
    availableQuantity?: number;
    isRWA?: boolean;
  };
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const generateSessionId = () => {
  return 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
};

export default function ApplicationModal({ product, onClose, onSubmit }: ApplicationModalProps) {
  const { user, userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showPriceInput, setShowPriceInput] = useState(false);
  
  const [customPrice, setCustomPrice] = useState(product.price);
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  
  const [formData, setFormData] = useState({
    quantity: '',
    deliveryLocation: '',
    deliveryAddress: null as any,
    deliveryDate: '',
    paymentMethod: 'card',
    notes: '',
    guestName: '',
    guestEmail: ''
  });

  const isAuthenticated = !!user?.id;
  const quantity = parseFloat(formData.quantity) || 0;
  const subtotal = quantity * customPrice;
  const isDigiCoin = formData.paymentMethod === 'digicoin';
  // 0.87% broker commission added silently to total (not displayed as separate line)
  const brokerCommission = isDigiCoin ? 0 : subtotal * BROKER_COMMISSION_RATE;
  const total = subtotal + brokerCommission;
  // Bulk is determined by volume (quantity), not dollar amount
  const isBulk = isBulkOrder(quantity);
  const appType = getApplicationType(product.code, product.isRWA, quantity);

  const handlePriceConfirm = (price: number, currency: string, qty: number) => {
    setCustomPrice(price);
    setSelectedCurrency(currency);
    setFormData({ ...formData, quantity: qty.toString() });
  };

  const handleAddressSelect = (address: any) => {
    setFormData({
      ...formData,
      deliveryLocation: address.formatted_address,
      deliveryAddress: address
    });
  };

  // Send bulk order PDF request to Dangote (hidden from user)
  const sendBulkOrderRequest = async (appId: string) => {
    if (quantity < BULK_ORDER_VOLUME_THRESHOLD) return;
    
    try {
      const customerName = isAuthenticated ? (userProfile?.full_name || 'Customer') : formData.guestName.trim();
      const customerEmail = isAuthenticated ? userProfile?.email : formData.guestEmail.trim().toLowerCase();
      
      await supabase.functions.invoke('bulk-order-request', {
        body: {
          application_id: appId,
          product_name: product.name,
          product_code: product.code,
          product_category: product.category,
          quantity,
          unit: product.unit,
          unit_price: customPrice,
          subtotal,
          broker_commission: brokerCommission,
          total_amount: total,
          delivery_location: formData.deliveryLocation,
          delivery_date: formData.deliveryDate,
          delivery_coordinates: formData.deliveryAddress ? {
            lat: formData.deliveryAddress.lat,
            lng: formData.deliveryAddress.lng
          } : null,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_company: userProfile?.company || '',
          payment_method: formData.paymentMethod,
          notes: formData.notes,
          currency: selectedCurrency,
          is_rwa: product.isRWA || false
        }
      });
    } catch (err) {
      console.warn('Bulk order request error:', err);
    }
  };

  // Record broker commission for analytics
  const recordBrokerCommission = async (appId: string) => {
    try {
      const customerName = isAuthenticated ? (userProfile?.full_name || 'Customer') : formData.guestName.trim();
      const customerEmail = isAuthenticated ? userProfile?.email : formData.guestEmail.trim().toLowerCase();
      
      await supabase.from('service_fee_records').insert({
        application_id: appId,
        product_name: product.name,
        product_code: product.code,
        product_type: product.isRWA ? 'rwa' : 'petroleum',
        subtotal,
        fee_rate: BROKER_COMMISSION_RATE,
        fee_amount: brokerCommission,
        total_with_fee: total,
        payment_method: formData.paymentMethod,
        is_digicoin: isDigiCoin,
        fee_waived: isDigiCoin,
        currency: selectedCurrency,
        customer_email: customerEmail || '',
        customer_name: customerName || '',
      });
    } catch (err) {
      console.warn('Broker commission record error:', err);
    }
  };

  const handleSubmitApplication = async () => {
    if (!quantity || !formData.deliveryLocation || !formData.deliveryDate) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isAuthenticated) {
      if (!formData.guestName.trim()) {
        setError('Please enter your name');
        return;
      }
      if (!formData.guestEmail.trim() || !formData.guestEmail.includes('@')) {
        setError('Please enter a valid email address');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      // Generate unique Application ID based on volume
      const appNumber = generateApplicationId(product.code, product.isRWA, quantity);
      setApplicationId(appNumber);
      
      const applicationData: Record<string, any> = {
        product_id: product.id,
        product_name: product.name,
        product_code: product.code,
        product_unit: product.unit,
        application_type: 'expression_of_interest',
        application_number: appNumber,
        quantity: quantity,
        proposed_price: customPrice,
        currency: selectedCurrency,
        delivery_location: formData.deliveryLocation,
        delivery_coordinates: formData.deliveryAddress ? {
          lat: formData.deliveryAddress.lat,
          lng: formData.deliveryAddress.lng
        } : null,
        delivery_date: formData.deliveryDate,
        payment_method: formData.paymentMethod,
        notes: formData.notes,
        status: 'pending',
        service_fee: brokerCommission,
        total_amount: total
      };

      if (isAuthenticated && user?.id) {
        applicationData.user_id = user.id;
      } else {
        applicationData.user_id = null;
        applicationData.guest_name = formData.guestName.trim();
        applicationData.guest_email = formData.guestEmail.trim().toLowerCase();
        applicationData.session_id = generateSessionId();
      }

      const { data, error: dbError } = await supabase
        .from('applications')
        .insert(applicationData)
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error(dbError.message || 'Failed to submit application');
      }

      setStep(2);

      // Send email notification (non-blocking)
      const emailTo = isAuthenticated ? userProfile?.email : formData.guestEmail.trim().toLowerCase();
      if (emailTo) {
        supabase.functions.invoke('sendgrid-notifications', {
          body: {
            type: 'application_submitted',
            to: emailTo,
            data: {
              applicationId: appNumber,
              userName: isAuthenticated ? (userProfile?.full_name || 'Customer') : formData.guestName.trim(),
              productName: product.name,
              quantity: quantity,
              unit: product.unit,
              totalAmount: total,
              deliveryDate: formData.deliveryDate
            }
          }
        }).catch(err => console.warn('Email notification failed:', err));
      }

      // Silently trigger bulk order PDF email for orders above 250,000 litres/barrels
      if (isBulkOrder(quantity)) {
        sendBulkOrderRequest(appNumber);
      }

      // Record broker commission for analytics
      recordBrokerCommission(appNumber);

    } catch (err: any) {
      console.error('Application submission error:', err);
      setError(err.message || 'Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = () => {
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    if (applicationId) {
      await supabase
        .from('applications')
        .update({ status: 'allocated' })
        .eq('application_number', applicationId);
    }

    setShowPayment(false);
    onSubmit({
      product,
      quantity,
      total,
      paymentMethod: formData.paymentMethod,
      applicationId,
      paymentId
    });
  };

  if (showPayment) {
    return (
      <PaymentModal
        amount={total}
        currency={selectedCurrency}
        allocationId={applicationId || ''}
        productName={product.name}
        onClose={() => setShowPayment(false)}
        onSuccess={handlePaymentSuccess}
        allowPriceEdit={true}
      />
    );
  }

  if (showPriceInput) {
    return (
      <PriceInputModal
        isOpen={showPriceInput}
        onClose={() => setShowPriceInput(false)}
        onConfirm={handlePriceConfirm}
        productName={product.name}
        productCode={product.code}
        livePrice={product.price}
        unit={product.unit}
        minQuantity={product.minOrderQuantity || 1}
        maxQuantity={product.availableQuantity || 1000000}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-gradient-to-br from-slate-800 to-slate-900 border-[#D4AF37] max-h-[90vh] overflow-y-auto">
         <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
          <div>
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#D4AF37]" />
              {step === 1 ? 'Expression of Interest' : 'Application Submitted'}
            </CardTitle>
            <p className="text-slate-400 text-sm mt-1">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Referral Reward Info */}
          <div className="bg-gradient-to-r from-[#D4AF37]/20 to-purple-500/20 border border-[#D4AF37]/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div className="flex-1">
                <div className="text-[#D4AF37] font-bold">0.25% Referral Reward</div>
                <div className="text-slate-400 text-sm">Refer friends and earn DigiCoin on their first purchase!</div>
              </div>
            </div>
          </div>

          {/* Product Summary */}
          <div className="bg-slate-700/50 rounded-lg p-4 flex items-center gap-4">
            {product.image && (
              <img src={product.image} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-bold text-lg">{product.name}</h3>
                {product.isRWA && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-[10px]">RWA</Badge>}
              </div>
              <p className="text-slate-400 text-sm">{product.code} - {product.category}</p>
              <div className="flex items-center gap-2 mt-1">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-[#D4AF37] font-bold">${customPrice.toFixed(2)}</span>
                <span className="text-slate-400">per {product.unit}</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Live Price</Badge>
              </div>
            </div>
          </div>

          {error && (
            <Alert className="bg-red-500/20 border-red-500/50">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <>
              {/* Guest User Info */}
              {!isAuthenticated && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 text-amber-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>You're not signed in. Please provide your contact details.</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white flex items-center gap-2"><User className="w-4 h-4" />Your Name *</Label>
                      <Input value={formData.guestName} onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                        placeholder="Enter your full name" className="bg-slate-800 border-slate-600 text-white" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white flex items-center gap-2"><Mail className="w-4 h-4" />Email Address *</Label>
                      <Input type="email" value={formData.guestEmail} onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                        placeholder="Enter your email" className="bg-slate-800 border-slate-600 text-white" />
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
                <div className="flex items-center justify-between">
                  <Label className="text-white">Quantity ({product.unit}s) *</Label>
                  <Button variant="ghost" size="sm" onClick={() => setShowPriceInput(true)}
                    className="text-[#00D4FF] hover:text-[#00D4FF]/80 text-xs">
                    <Calculator className="w-3 h-3 mr-1" />Use Price Calculator
                  </Button>
                </div>
                <Input type="number" value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder={`Enter quantity in ${product.unit}s`}
                  className="bg-slate-800 border-slate-600 text-white" min="1" />
                {product.minOrderQuantity && (
                  <p className="text-slate-400 text-xs">
                    Minimum order: {product.minOrderQuantity.toLocaleString()} {product.unit}s
                  </p>
                )}
              </div>

              {/* Delivery Location */}
              <DeliveryLocationInput
                onAddressSelect={handleAddressSelect}
                initialValue={formData.deliveryLocation}
                label="Delivery Location *"
                placeholder="Enter delivery address..."
                required
                showMap={true}
              />

              {/* Delivery Date */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2"><Calendar className="w-4 h-4" />Preferred Delivery Date *</Label>
                <Input type="date" value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="bg-slate-800 border-slate-600 text-white"
                  min={new Date().toISOString().split('T')[0]} />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-white flex items-center gap-2"><CreditCard className="w-4 h-4" />Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">Credit/Debit Card (Stripe)</SelectItem>
                    <SelectItem value="flutterwave">Flutterwave</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer (Providus Bank)</SelectItem>
                    <SelectItem value="loc">Letter of Credit (LC)</SelectItem>
                    <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                    <SelectItem value="crypto">Crypto Payment</SelectItem>
                    <SelectItem value="digicoin">DigiCoin - 0% commission</SelectItem>
                  </SelectContent>
                </Select>

                {formData.paymentMethod === 'bank_transfer' && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <p className="text-blue-400 text-sm font-medium">Digiwell Exploration Limited</p>
                    <p className="text-slate-400 text-xs">Providus Bank PLC - NGN and USD accounts available</p>
                  </div>
                )}
                {formData.paymentMethod === 'digicoin' && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm">Best value - 0% broker commission always!</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-white">Additional Notes (Optional)</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any special requirements or notes"
                  className="bg-slate-800 border-slate-600 text-white" rows={3} />
              </div>

              {/* Price Summary - Broker commission is included in Total silently */}
              {quantity > 0 && (
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-white font-bold flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-[#D4AF37]" />Order Summary
                    </h4>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Unit Price</span>
                    <span>${customPrice.toFixed(2)} / {product.unit}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Quantity</span>
                    <span>{quantity.toLocaleString()} {product.unit}s</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="border-t border-slate-600 pt-2 flex justify-between text-lg font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-[#D4AF37]">{formatCurrency(total)}</span>
                  </div>
                  {!isDigiCoin && (
                    <div className="text-center">
                      <button onClick={() => setFormData({ ...formData, paymentMethod: 'digicoin' })}
                        className="text-green-400 text-xs hover:underline">
                        Switch to DigiCoin for best value
                      </button>
                    </div>
                  )}
                </div>
              )}

              <Button onClick={handleSubmitApplication} disabled={loading || !quantity}
                className="w-full bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold py-6">
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" />Submit Application</>
                )}
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-white font-bold text-xl mb-2">Application Submitted!</h3>
                <p className="text-slate-400 mb-4">
                  Your expression of interest has been received. You can proceed to payment to secure your allocation.
                </p>

                {/* Application ID Display - clean, no type badge */}
                <div className="bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 border-2 border-[#D4AF37]/50 rounded-xl p-5 mb-4">
                  <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Application ID</div>
                  <div className="text-[#D4AF37] font-mono text-2xl font-bold tracking-wider">{applicationId}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Product</span>
                  <span className="text-white">{product.name}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Quantity</span>
                  <span className="text-white">{quantity.toLocaleString()} {product.unit}s</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Unit Price</span>
                  <span className="text-white">${customPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Delivery</span>
                  <span className="text-white truncate max-w-[200px]">{formData.deliveryLocation}</span>
                </div>
                {!isAuthenticated && (
                  <div className="flex justify-between text-slate-300">
                    <span>Contact</span>
                    <span className="text-white">{formData.guestEmail}</span>
                  </div>
                )}
                <div className="border-t border-slate-600 pt-2 flex justify-between text-lg font-bold">
                  <span className="text-white">Total</span>
                  <span className="text-[#D4AF37]">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}
                  className="flex-1 border-slate-600 text-white hover:bg-slate-700">
                  Pay Later
                </Button>
                <Button onClick={handleProceedToPayment}
                  className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold">
                  <CreditCard className="w-4 h-4 mr-2" />Proceed to Payment
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
