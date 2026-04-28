import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { products } from '@/data/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FileText, ChevronRight, ChevronLeft, Check, Download, Pen,
  Building, Package, Ship, CreditCard, Shield, Scale, User, Calendar
} from 'lucide-react';

const INCOTERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'AED', 'CHF', 'JPY'];
const PAYMENT_METHODS = [
  { value: 'wire_transfer', label: 'Wire Transfer' },
  { value: 'letter_of_credit', label: 'Letter of Credit (LC)' },
  { value: 'documentary_collection', label: 'Documentary Collection' },
  { value: 'escrow', label: 'Escrow Service' },
  { value: 'digicoin', label: 'DigiCoin' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'flutterwave', label: 'Flutterwave' },
];

const STEPS = [
  { id: 1, label: 'Parties', icon: Building },
  { id: 2, label: 'Commodity', icon: Package },
  { id: 3, label: 'Delivery', icon: Ship },
  { id: 4, label: 'Payment', icon: CreditCard },
  { id: 5, label: 'Quality', icon: Shield },
  { id: 6, label: 'Legal', icon: Scale },
  { id: 7, label: 'Sign', icon: Pen },
  { id: 8, label: 'Complete', icon: Check },
];

export default function SPAWizard() {
  const { user, userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasBuyerSig, setHasBuyerSig] = useState(false);
  const [hasSupplierSig, setHasSupplierSig] = useState(false);
  const [activeSignature, setActiveSignature] = useState<'buyer' | 'supplier'>('buyer');
  const [buyerSigData, setBuyerSigData] = useState('');
  const [supplierSigData, setSupplierSigData] = useState('');
  const [spaId, setSpaId] = useState('');

  const [formData, setFormData] = useState({
    // Buyer
    buyerName: userProfile?.full_name || '',
    buyerCompany: userProfile?.company_name || '',
    buyerAddress: '',
    buyerRegNumber: '',
    buyerEmail: userProfile?.email || '',
    buyerPhone: '',
    // Supplier
    supplierName: '',
    supplierCompany: '',
    supplierAddress: '',
    supplierRegNumber: '',
    supplierEmail: '',
    supplierPhone: '',
    // Commodity
    commodityType: '',
    commodityGrade: '',
    quantity: '',
    unit: 'barrels',
    unitPrice: '',
    currency: 'USD',
    // Delivery
    incoterm: 'FOB',
    portOfLoading: '',
    portOfDischarge: '',
    deliveryStartDate: '',
    deliveryEndDate: '',
    vesselType: '',
    // Payment
    paymentMethod: 'wire_transfer',
    paymentTerms: 'Net 30',
    lcBank: '',
    lcNumber: '',
    // Quality
    apiGravity: '',
    sulfurContent: '',
    waterContent: '',
    sediment: '',
    customSpecs: '',
    // Legal
    governingLaw: 'English Law',
    arbitrationVenue: 'London Court of International Arbitration (LCIA)',
    forceMajeure: true,
    disputeResolution: 'arbitration',
  });

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedProduct = products.find(p => p.code === formData.commodityType);
  const quantity = parseFloat(formData.quantity) || 0;
  const unitPrice = parseFloat(formData.unitPrice) || (selectedProduct?.price || 0);
  const subtotal = quantity * unitPrice;
  const serviceFee = formData.paymentMethod === 'digicoin' ? 0 : subtotal * 0.0087;
  const total = subtotal + serviceFee;

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, [step, activeSignature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL();
    if (activeSignature === 'buyer') {
      setBuyerSigData(sigData);
      setHasBuyerSig(true);
    } else {
      setSupplierSigData(sigData);
      setHasSupplierSig(true);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (activeSignature === 'buyer') {
      setBuyerSigData('');
      setHasBuyerSig(false);
    } else {
      setSupplierSigData('');
      setHasSupplierSig(false);
    }
  };

  const handleSaveSPA = async () => {
    setSaving(true);
    try {
      const id = `SPA-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setSpaId(id);

      const spaDocument = {
        spa_id: id,
        user_id: user?.id || null,
        buyer: { name: formData.buyerName, company: formData.buyerCompany, address: formData.buyerAddress, regNumber: formData.buyerRegNumber, email: formData.buyerEmail },
        supplier: { name: formData.supplierName, company: formData.supplierCompany, address: formData.supplierAddress, regNumber: formData.supplierRegNumber, email: formData.supplierEmail },
        commodity: { type: formData.commodityType, grade: formData.commodityGrade, quantity, unit: formData.unit, unitPrice, currency: formData.currency },
        delivery: { incoterm: formData.incoterm, portOfLoading: formData.portOfLoading, portOfDischarge: formData.portOfDischarge, startDate: formData.deliveryStartDate, endDate: formData.deliveryEndDate },
        payment: { method: formData.paymentMethod, terms: formData.paymentTerms, lcBank: formData.lcBank },
        quality: { apiGravity: formData.apiGravity, sulfurContent: formData.sulfurContent, waterContent: formData.waterContent },
        legal: { governingLaw: formData.governingLaw, arbitration: formData.arbitrationVenue, forceMajeure: formData.forceMajeure },
        financials: { subtotal, serviceFee, serviceFeeRate: formData.paymentMethod === 'digicoin' ? 0 : 0.87, total },
        signatures: { buyer: { signed: hasBuyerSig, timestamp: hasBuyerSig ? new Date().toISOString() : null }, supplier: { signed: hasSupplierSig, timestamp: hasSupplierSig ? new Date().toISOString() : null } },
        status: 'executed',
        created_at: new Date().toISOString(),
      };

      // Store in document vault
      await supabase.functions.invoke('document-vault', {
        body: { action: 'store', document: spaDocument, type: 'spa', id }
      }).catch(() => {});

      setStep(8);
    } catch (e) {
      console.error('Error saving SPA:', e);
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = () => {
    const content = `
INTERNATIONAL DIGITAL SALE AND PURCHASE AGREEMENT
Agreement ID: ${spaId}
Date: ${new Date().toLocaleDateString()}
Platform: Digiwell Trading LLC

═══════════════════════════════════════════════
PARTIES
═══════════════════════════════════════════════
BUYER: ${formData.buyerCompany} (${formData.buyerName})
Address: ${formData.buyerAddress}
Registration: ${formData.buyerRegNumber}

SUPPLIER: ${formData.supplierCompany} (${formData.supplierName})
Address: ${formData.supplierAddress}
Registration: ${formData.supplierRegNumber}

═══════════════════════════════════════════════
COMMODITY SPECIFICATIONS
═══════════════════════════════════════════════
Product: ${formData.commodityType} - ${formData.commodityGrade}
Quantity: ${quantity.toLocaleString()} ${formData.unit}
Unit Price: ${formData.currency} ${unitPrice.toFixed(2)}
Subtotal: ${formData.currency} ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
Service Fee (0.87%): ${formData.currency} ${serviceFee.toLocaleString(undefined, {minimumFractionDigits: 2})}
TOTAL: ${formData.currency} ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}

═══════════════════════════════════════════════
DELIVERY TERMS
═══════════════════════════════════════════════
Incoterms 2020: ${formData.incoterm}
Port of Loading: ${formData.portOfLoading}
Port of Discharge: ${formData.portOfDischarge}
Delivery Period: ${formData.deliveryStartDate} to ${formData.deliveryEndDate}

═══════════════════════════════════════════════
PAYMENT TERMS
═══════════════════════════════════════════════
Method: ${formData.paymentMethod}
Terms: ${formData.paymentTerms}
${formData.lcBank ? `LC Issuing Bank: ${formData.lcBank}` : ''}

═══════════════════════════════════════════════
QUALITY SPECIFICATIONS
═══════════════════════════════════════════════
${formData.apiGravity ? `API Gravity: ${formData.apiGravity}°` : ''}
${formData.sulfurContent ? `Sulfur Content: ${formData.sulfurContent}%` : ''}
${formData.waterContent ? `Water Content: ${formData.waterContent}%` : ''}

═══════════════════════════════════════════════
GOVERNING LAW & DISPUTE RESOLUTION
═══════════════════════════════════════════════
Governing Law: ${formData.governingLaw}
Arbitration: ${formData.arbitrationVenue}
Force Majeure: ${formData.forceMajeure ? 'Included' : 'Excluded'}

═══════════════════════════════════════════════
DIGITAL SIGNATURES
═══════════════════════════════════════════════
Buyer Signature: ${hasBuyerSig ? 'SIGNED - ' + new Date().toISOString() : 'PENDING'}
Supplier Signature: ${hasSupplierSig ? 'SIGNED - ' + new Date().toISOString() : 'PENDING'}

This agreement is executed digitally via Digiwell Trading Platform.
A 0.87% service fee applies to all transactions (free with DigiCoin).
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spaId}-SPA-Agreement.txt`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <FileText className="w-7 h-7 text-[#D4AF37]" />
          International Sale & Purchase Agreement
        </h2>
        <p className="text-slate-400">Digital SPA Wizard - Incoterms 2020 Compliant</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => s.id <= step && setStep(s.id)}
                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  step === s.id ? 'bg-[#D4AF37] text-slate-900' :
                  step > s.id ? 'bg-green-500/20 text-green-400' :
                  'bg-white/5 text-slate-500'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden md:inline">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600 mx-1" />}
            </div>
          );
        })}
      </div>

      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          {/* Step 1: Parties */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Building className="w-5 h-5 text-[#D4AF37]" />Party Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-white font-semibold border-b border-white/10 pb-2">Buyer</h4>
                  <div><Label className="text-white">Full Name *</Label><Input value={formData.buyerName} onChange={e => updateField('buyerName', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-white">Company *</Label><Input value={formData.buyerCompany} onChange={e => updateField('buyerCompany', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-white">Address *</Label><Textarea value={formData.buyerAddress} onChange={e => updateField('buyerAddress', e.target.value)} className="bg-slate-800 border-slate-600 text-white" rows={2} /></div>
                  <div><Label className="text-white">Registration Number</Label><Input value={formData.buyerRegNumber} onChange={e => updateField('buyerRegNumber', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-white">Email *</Label><Input value={formData.buyerEmail} onChange={e => updateField('buyerEmail', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-white font-semibold border-b border-white/10 pb-2">Supplier</h4>
                  <div><Label className="text-white">Full Name *</Label><Input value={formData.supplierName} onChange={e => updateField('supplierName', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-white">Company *</Label><Input value={formData.supplierCompany} onChange={e => updateField('supplierCompany', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-white">Address *</Label><Textarea value={formData.supplierAddress} onChange={e => updateField('supplierAddress', e.target.value)} className="bg-slate-800 border-slate-600 text-white" rows={2} /></div>
                  <div><Label className="text-white">Registration Number</Label><Input value={formData.supplierRegNumber} onChange={e => updateField('supplierRegNumber', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                  <div><Label className="text-white">Email *</Label><Input value={formData.supplierEmail} onChange={e => updateField('supplierEmail', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Commodity */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Package className="w-5 h-5 text-[#D4AF37]" />Commodity Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-white">Commodity Type *</Label>
                  <Select value={formData.commodityType} onValueChange={v => { updateField('commodityType', v); const p = products.find(pr => pr.code === v); if (p) { updateField('unitPrice', p.price.toString()); updateField('unit', p.unit + 's'); } }}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue placeholder="Select commodity" /></SelectTrigger>
                    <SelectContent>{products.map(p => <SelectItem key={p.code} value={p.code}>{p.name} ({p.code})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white">Grade/Specification</Label><Input value={formData.commodityGrade} onChange={e => updateField('commodityGrade', e.target.value)} placeholder="e.g., Bonny Light, API 35°" className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Quantity *</Label><Input type="number" value={formData.quantity} onChange={e => updateField('quantity', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Unit</Label><Input value={formData.unit} onChange={e => updateField('unit', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Unit Price *</Label><Input type="number" step="0.01" value={formData.unitPrice} onChange={e => updateField('unitPrice', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Currency</Label>
                  <Select value={formData.currency} onValueChange={v => updateField('currency', v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              {quantity > 0 && (
                <div className="bg-slate-800/50 rounded-lg p-4 space-y-1">
                  <div className="flex justify-between text-slate-300"><span>Subtotal</span><span>{formData.currency} {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between text-amber-400"><span>Service Fee (0.87%)</span><span>{formData.currency} {serviceFee.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                  <div className="flex justify-between text-white font-bold text-lg border-t border-slate-600 pt-1"><span>Total</span><span>{formData.currency} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Delivery */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Ship className="w-5 h-5 text-[#D4AF37]" />Delivery Terms (Incoterms 2020)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-white">Incoterms 2020 *</Label>
                  <Select value={formData.incoterm} onValueChange={v => updateField('incoterm', v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{INCOTERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white">Vessel Type</Label><Input value={formData.vesselType} onChange={e => updateField('vesselType', e.target.value)} placeholder="e.g., VLCC, Suezmax" className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Port of Loading *</Label><Input value={formData.portOfLoading} onChange={e => updateField('portOfLoading', e.target.value)} placeholder="e.g., Bonny Terminal, Nigeria" className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Port of Discharge *</Label><Input value={formData.portOfDischarge} onChange={e => updateField('portOfDischarge', e.target.value)} placeholder="e.g., Rotterdam, Netherlands" className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Delivery Start Date *</Label><Input type="date" value={formData.deliveryStartDate} onChange={e => updateField('deliveryStartDate', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Delivery End Date *</Label><Input type="date" value={formData.deliveryEndDate} onChange={e => updateField('deliveryEndDate', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
              </div>
            </div>
          )}

          {/* Step 4: Payment */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><CreditCard className="w-5 h-5 text-[#D4AF37]" />Payment Terms</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-white">Payment Method *</Label>
                  <Select value={formData.paymentMethod} onValueChange={v => updateField('paymentMethod', v)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}{m.value === 'digicoin' ? ' (0% fee)' : ' (0.87% fee)'}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-white">Payment Terms</Label><Input value={formData.paymentTerms} onChange={e => updateField('paymentTerms', e.target.value)} placeholder="e.g., Net 30, CAD" className="bg-slate-800 border-slate-600 text-white" /></div>
                {formData.paymentMethod === 'letter_of_credit' && (
                  <>
                    <div><Label className="text-white">LC Issuing Bank</Label><Input value={formData.lcBank} onChange={e => updateField('lcBank', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                    <div><Label className="text-white">LC Number</Label><Input value={formData.lcNumber} onChange={e => updateField('lcNumber', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                  </>
                )}
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-amber-400 text-sm font-medium">0.87% Service Fee applies to all payment methods except DigiCoin (0% fee).</p>
              </div>
            </div>
          )}

          {/* Step 5: Quality */}
          {step === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Shield className="w-5 h-5 text-[#D4AF37]" />Quality Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-white">API Gravity (°)</Label><Input type="number" step="0.1" value={formData.apiGravity} onChange={e => updateField('apiGravity', e.target.value)} placeholder="e.g., 35.4" className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Sulfur Content (%)</Label><Input type="number" step="0.01" value={formData.sulfurContent} onChange={e => updateField('sulfurContent', e.target.value)} placeholder="e.g., 0.14" className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Water Content (%)</Label><Input type="number" step="0.01" value={formData.waterContent} onChange={e => updateField('waterContent', e.target.value)} placeholder="e.g., 0.5" className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Sediment (%)</Label><Input type="number" step="0.01" value={formData.sediment} onChange={e => updateField('sediment', e.target.value)} placeholder="e.g., 0.05" className="bg-slate-800 border-slate-600 text-white" /></div>
              </div>
              <div><Label className="text-white">Additional Specifications</Label><Textarea value={formData.customSpecs} onChange={e => updateField('customSpecs', e.target.value)} placeholder="Any additional quality requirements..." className="bg-slate-800 border-slate-600 text-white" rows={3} /></div>
            </div>
          )}

          {/* Step 6: Legal */}
          {step === 6 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Scale className="w-5 h-5 text-[#D4AF37]" />Legal & Dispute Resolution</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label className="text-white">Governing Law</Label><Input value={formData.governingLaw} onChange={e => updateField('governingLaw', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
                <div><Label className="text-white">Arbitration Venue</Label><Input value={formData.arbitrationVenue} onChange={e => updateField('arbitrationVenue', e.target.value)} className="bg-slate-800 border-slate-600 text-white" /></div>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={formData.forceMajeure} onChange={e => updateField('forceMajeure', e.target.checked)} className="w-4 h-4" />
                <Label className="text-white">Include Force Majeure Clause</Label>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-4 text-sm text-slate-300 space-y-2">
                <p className="font-medium text-white">Standard Clauses Included:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Force Majeure (Acts of God, war, sanctions, pandemics)</li>
                  <li>Limitation of Liability</li>
                  <li>Confidentiality & Non-Disclosure</li>
                  <li>Anti-Bribery & Anti-Corruption (FCPA/UK Bribery Act)</li>
                  <li>Sanctions Compliance (OFAC, EU, UN)</li>
                  <li>Environmental Compliance</li>
                  <li>Digiwell 0.87% Service Fee Terms</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 7: Signatures */}
          {step === 7 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Pen className="w-5 h-5 text-[#D4AF37]" />Digital Signatures</h3>
              <div className="flex gap-3 mb-4">
                <Button onClick={() => setActiveSignature('buyer')} variant={activeSignature === 'buyer' ? 'default' : 'outline'} className={activeSignature === 'buyer' ? 'bg-[#D4AF37] text-slate-900' : 'border-white/20 text-white'}>
                  <User className="w-4 h-4 mr-1" />Buyer {hasBuyerSig && <Check className="w-3 h-3 ml-1 text-green-400" />}
                </Button>
                <Button onClick={() => setActiveSignature('supplier')} variant={activeSignature === 'supplier' ? 'default' : 'outline'} className={activeSignature === 'supplier' ? 'bg-[#D4AF37] text-slate-900' : 'border-white/20 text-white'}>
                  <User className="w-4 h-4 mr-1" />Supplier {hasSupplierSig && <Check className="w-3 h-3 ml-1 text-green-400" />}
                </Button>
              </div>
              <p className="text-slate-400 text-sm">Sign as <span className="text-white font-medium">{activeSignature === 'buyer' ? formData.buyerName : formData.supplierName}</span> - Draw your signature below:</p>
              <div className="border-2 border-dashed border-[#D4AF37]/50 rounded-lg overflow-hidden">
                <canvas ref={canvasRef} width={600} height={150} className="w-full cursor-crosshair" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} />
              </div>
              <div className="flex gap-2">
                <Button onClick={clearSignature} variant="outline" className="border-white/20 text-white">Clear</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`rounded-lg p-3 ${hasBuyerSig ? 'bg-green-500/10 border border-green-500/30' : 'bg-slate-800/50 border border-slate-700'}`}>
                  <p className="text-xs text-slate-400">Buyer Signature</p>
                  <p className={`text-sm font-medium ${hasBuyerSig ? 'text-green-400' : 'text-slate-500'}`}>{hasBuyerSig ? `Signed - ${new Date().toLocaleString()}` : 'Pending'}</p>
                </div>
                <div className={`rounded-lg p-3 ${hasSupplierSig ? 'bg-green-500/10 border border-green-500/30' : 'bg-slate-800/50 border border-slate-700'}`}>
                  <p className="text-xs text-slate-400">Supplier Signature</p>
                  <p className={`text-sm font-medium ${hasSupplierSig ? 'text-green-400' : 'text-slate-500'}`}>{hasSupplierSig ? `Signed - ${new Date().toLocaleString()}` : 'Pending'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Complete */}
          {step === 8 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">SPA Executed Successfully</h3>
              <p className="text-slate-400 mb-4">Agreement ID: <span className="text-[#D4AF37] font-mono">{spaId}</span></p>
              <div className="bg-slate-800/50 rounded-lg p-4 max-w-md mx-auto text-left space-y-2 mb-6">
                <div className="flex justify-between text-slate-300"><span>Commodity</span><span className="text-white">{formData.commodityType}</span></div>
                <div className="flex justify-between text-slate-300"><span>Quantity</span><span className="text-white">{quantity.toLocaleString()} {formData.unit}</span></div>
                <div className="flex justify-between text-slate-300"><span>Total</span><span className="text-[#D4AF37] font-bold">{formData.currency} {total.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></div>
                <div className="flex justify-between text-slate-300"><span>Incoterm</span><span className="text-white">{formData.incoterm}</span></div>
              </div>
              <Button onClick={generatePDF} className="bg-[#D4AF37] text-slate-900 hover:bg-[#c9a432]">
                <Download className="w-4 h-4 mr-2" />Download Agreement
              </Button>
            </div>
          )}

          {/* Navigation */}
          {step < 8 && (
            <div className="flex justify-between mt-6 pt-4 border-t border-white/10">
              <Button onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} variant="outline" className="border-white/20 text-white">
                <ChevronLeft className="w-4 h-4 mr-1" />Back
              </Button>
              {step < 7 ? (
                <Button onClick={() => setStep(step + 1)} className="bg-[#D4AF37] text-slate-900 hover:bg-[#c9a432]">
                  Next<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleSaveSPA} disabled={saving || (!hasBuyerSig && !hasSupplierSig)} className="bg-green-600 text-white hover:bg-green-700">
                  {saving ? 'Saving...' : 'Execute Agreement'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
