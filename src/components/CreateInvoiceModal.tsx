import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Building,
  User,
  Package,
  Calculator,
  Send,
  Download,
} from 'lucide-react';

interface LineItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceCreated: (invoice: any) => void;
}

// Digiwell Exploration Limited Company Details
const COMPANY_INFO = {
  name: 'Digiwell Exploration Limited',
  tagline: 'Premium Energy Trading Solutions',
  address: 'Plot 123, Victoria Island, Lagos, Nigeria',
  phone: '+234 1 234 5678',
  email: 'billing@digiwellexploration.com',
  website: 'www.digiwellexploration.com',
  taxId: 'NG-TIN-12345678',
  rcNumber: 'RC 1234567'
};

const CURRENCIES = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

const UNITS = ['barrels', 'liters', 'gallons', 'MT', 'kg', 'units', 'hours', 'days'];

export default function CreateInvoiceModal({
  open,
  onOpenChange,
  onInvoiceCreated,
}: CreateInvoiceModalProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'details' | 'items' | 'review' | 'success'>('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [invoiceType, setInvoiceType] = useState('order');
  const [currency, setCurrency] = useState('NGN');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Payment due within 30 days of invoice date');

  // Line Items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', name: '', description: '', quantity: 1, unit: 'units', unitPrice: 0, total: 0 }
  ]);

  // Tax and Discounts
  const [taxRate, setTaxRate] = useState(7.5); // Nigerian VAT
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shippingAmount, setShippingAmount] = useState(0);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { id: Date.now().toString(), name: '', description: '', quantity: 1, unit: 'units', unitPrice: 0, total: 0 }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: any) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * (taxRate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - discountAmount + shippingAmount;
  };

  const formatCurrency = (amount: number) => {
    const curr = CURRENCIES.find(c => c.code === currency);
    return `${curr?.symbol || currency + ' '}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleCreateInvoice = async (sendEmail: boolean = false) => {
    setLoading(true);
    setError(null);

    try {
      const invoiceLineItems = lineItems.map(item => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        total: item.total
      }));

      const { data, error: invoiceError } = await supabase.functions.invoke('invoice-generator', {
        body: {
          action: 'create_invoice',
          user_id: user?.id,
          user_email: customerEmail,
          user_name: customerName,
          billing_name: customerName,
          billing_email: customerEmail,
          billing_phone: customerPhone,
          billing_address: customerAddress,
          invoice_type: invoiceType,
          currency: currency,
          line_items: invoiceLineItems,
          tax_rate: taxRate,
          discount_amount: discountAmount,
          shipping_amount: shippingAmount,
          due_date: dueDate || undefined,
          payment_terms: paymentTerms,
          notes: notes || undefined,
        },
      });

      if (invoiceError) throw invoiceError;

      if (data.success) {
        setCreatedInvoice(data.invoice);

        // Send email if requested
        if (sendEmail) {
          await supabase.functions.invoke('invoice-generator', {
            body: {
              action: 'send_invoice',
              invoice_id: data.invoice.id,
            },
          });
        }

        setStep('success');
        onInvoiceCreated(data.invoice);
      } else {
        throw new Error(data.error || 'Failed to create invoice');
      }
    } catch (err: any) {
      console.error('Error creating invoice:', err);
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (createdInvoice?.pdf_html) {
      const blob = new Blob([createdInvoice.pdf_html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${createdInvoice.invoice_number}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const resetForm = () => {
    setStep('details');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCustomerAddress('');
    setInvoiceType('order');
    setCurrency('NGN');
    setDueDate('');
    setNotes('');
    setPaymentTerms('Payment due within 30 days of invoice date');
    setLineItems([{ id: '1', name: '', description: '', quantity: 1, unit: 'units', unitPrice: 0, total: 0 }]);
    setTaxRate(7.5);
    setDiscountAmount(0);
    setShippingAmount(0);
    setCreatedInvoice(null);
    setError(null);
  };

  const isDetailsValid = customerName && customerEmail && currency;
  const isItemsValid = lineItems.every(item => item.name && item.quantity > 0 && item.unitPrice > 0);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#D4AF37]" />
            Create New Invoice
          </DialogTitle>
        </DialogHeader>

        {/* Company Header */}
        <Card className="bg-gradient-to-r from-slate-800 to-slate-800/50 border-slate-700">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 bg-[#D4AF37]/20 rounded-lg">
              <Building className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <div>
              <div className="text-[#D4AF37] font-bold text-lg">{COMPANY_INFO.name}</div>
              <div className="text-slate-400 text-sm">{COMPANY_INFO.address}</div>
              <div className="text-slate-500 text-xs mt-1">RC: {COMPANY_INFO.rcNumber} | Tax ID: {COMPANY_INFO.taxId}</div>
            </div>
          </CardContent>
        </Card>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-4">
          {['details', 'items', 'review', 'success'].map((s, index) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === s ? 'bg-[#D4AF37] text-slate-900' :
                ['details', 'items', 'review', 'success'].indexOf(step) > index ? 'bg-green-500 text-white' :
                'bg-slate-700 text-slate-400'
              }`}>
                {['details', 'items', 'review', 'success'].indexOf(step) > index ? <CheckCircle className="w-4 h-4" /> : index + 1}
              </div>
              {index < 3 && (
                <div className={`w-16 h-1 mx-2 ${
                  ['details', 'items', 'review', 'success'].indexOf(step) > index ? 'bg-green-500' : 'bg-slate-700'
                }`} />
              )}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Customer Details */}
        {step === 'details' && (
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Customer Name *</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="John Doe"
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Email Address *</Label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="john@example.com"
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Phone Number</Label>
                    <Input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+234 801 234 5678"
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Invoice Type</Label>
                    <Select value={invoiceType} onValueChange={setInvoiceType}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="order">Order</SelectItem>
                        <SelectItem value="auction">Auction</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                        <SelectItem value="subscription">Subscription</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Billing Address</Label>
                  <Textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    placeholder="123 Main Street, Lagos, Nigeria"
                    className="bg-slate-800/50 border-slate-600 text-white"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-300 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Invoice Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Currency *</Label>
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {CURRENCIES.map(c => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.symbol} {c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Tax Rate (%)</Label>
                    <Input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      min={0}
                      max={100}
                      step={0.5}
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Payment Terms</Label>
                  <Input
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="Payment due within 30 days"
                    className="bg-slate-800/50 border-slate-600 text-white"
                  />
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
                Cancel
              </Button>
              <Button
                onClick={() => setStep('items')}
                disabled={!isDetailsValid}
                className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                Next: Add Items
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 2: Line Items */}
        {step === 'items' && (
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Line Items
                  </div>
                  <Button
                    size="sm"
                    onClick={addLineItem}
                    className="bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="p-4 bg-slate-700/30 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">Item #{index + 1}</span>
                      {lineItems.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeLineItem(item.id)}
                          className="text-red-400 hover:text-red-400 hover:bg-red-500/20 h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Product/Service Name *</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateLineItem(item.id, 'name', e.target.value)}
                          placeholder="Brent Crude Oil"
                          className="bg-slate-800/50 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          placeholder="Premium grade crude oil"
                          className="bg-slate-800/50 border-slate-600 text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Quantity *</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                          min={1}
                          className="bg-slate-800/50 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Unit</Label>
                        <Select value={item.unit} onValueChange={(v) => updateLineItem(item.id, 'unit', v)}>
                          <SelectTrigger className="bg-slate-800/50 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {UNITS.map(u => (
                              <SelectItem key={u} value={u}>{u}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Unit Price *</Label>
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(item.id, 'unitPrice', Number(e.target.value))}
                          min={0}
                          step={0.01}
                          className="bg-slate-800/50 border-slate-600 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">Total</Label>
                        <div className="h-10 flex items-center px-3 bg-slate-700/50 rounded-md text-[#D4AF37] font-medium">
                          {formatCurrency(item.total)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Discount Amount</Label>
                    <Input
                      type="number"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(Number(e.target.value))}
                      min={0}
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Shipping Amount</Label>
                    <Input
                      type="number"
                      value={shippingAmount}
                      onChange={(e) => setShippingAmount(Number(e.target.value))}
                      min={0}
                      className="bg-slate-800/50 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Notes (Optional)</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes or instructions..."
                    className="bg-slate-800/50 border-slate-600 text-white"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Totals Summary */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-white">{formatCurrency(calculateSubtotal())}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Discount</span>
                    <span className="text-green-400">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tax ({taxRate}%)</span>
                  <span className="text-white">{formatCurrency(calculateTax())}</span>
                </div>
                {shippingAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Shipping</span>
                    <span className="text-white">{formatCurrency(shippingAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Service Fee</span>
                  <span className="text-green-400">0% (FREE)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-700">
                  <span className="text-white font-semibold">Total</span>
                  <span className="text-[#D4AF37] font-bold text-xl">{formatCurrency(calculateTotal())}</span>
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep('details')} className="text-slate-400">
                Back
              </Button>
              <Button
                onClick={() => setStep('review')}
                disabled={!isItemsValid}
                className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                Review Invoice
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 'review' && (
          <div className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-xs text-slate-500 uppercase mb-2">Bill To</div>
                    <div className="text-white font-medium">{customerName}</div>
                    <div className="text-slate-400 text-sm">{customerEmail}</div>
                    {customerPhone && <div className="text-slate-400 text-sm">{customerPhone}</div>}
                    {customerAddress && <div className="text-slate-400 text-sm mt-1">{customerAddress}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500 uppercase mb-2">Invoice Details</div>
                    <div className="text-slate-400 text-sm">Type: <span className="text-white capitalize">{invoiceType}</span></div>
                    <div className="text-slate-400 text-sm">Currency: <span className="text-white">{currency}</span></div>
                    {dueDate && <div className="text-slate-400 text-sm">Due: <span className="text-white">{new Date(dueDate).toLocaleDateString()}</span></div>}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-300">Line Items ({lineItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-slate-700/30 rounded">
                      <div>
                        <div className="text-white font-medium">{item.name}</div>
                        <div className="text-slate-400 text-xs">{item.quantity} {item.unit} × {formatCurrency(item.unitPrice)}</div>
                      </div>
                      <div className="text-[#D4AF37] font-medium">{formatCurrency(item.total)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-[#D4AF37]/20 to-[#B8941F]/20 border-[#D4AF37]/50">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[#D4AF37]/70 text-sm">Total Amount</div>
                    <div className="text-[#D4AF37] font-bold text-3xl">{formatCurrency(calculateTotal())}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 text-sm font-medium">0% Service Fee</div>
                    <div className="text-slate-400 text-xs">No additional charges</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setStep('items')} className="text-slate-400">
                Back
              </Button>
              <Button
                onClick={() => handleCreateInvoice(false)}
                disabled={loading}
                variant="outline"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/20"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                Create & Download
              </Button>
              <Button
                onClick={() => handleCreateInvoice(true)}
                disabled={loading}
                className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Create & Send Email
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 'success' && createdInvoice && (
          <div className="space-y-4 text-center py-6">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-xl">Invoice Created Successfully!</h3>
              <p className="text-slate-400 mt-2">
                Invoice <span className="text-[#D4AF37] font-mono">{createdInvoice.invoice_number}</span> has been created.
              </p>
            </div>

            {createdInvoice.qr_code_url && (
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-lg">
                  <img src={createdInvoice.qr_code_url} alt="QR Code" className="w-32 h-32" />
                </div>
              </div>
            )}

            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-400">Invoice Total</span>
                  <span className="text-green-400 font-bold text-xl">
                    {formatCurrency(createdInvoice.total_amount)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <DialogFooter className="justify-center gap-2">
              <Button
                onClick={handleDownloadInvoice}
                variant="outline"
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Invoice
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
      </DialogContent>
    </Dialog>
  );
}
