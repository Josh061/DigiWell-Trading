import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { products } from '@/data/products';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload, FileText, Check, X, AlertTriangle, Download, Loader2,
  Package, Calculator, BarChart3, CheckCircle
} from 'lucide-react';

interface BulkOrderRow {
  rowNum: number;
  product_code: string;
  quantity: number;
  delivery_location: string;
  delivery_date: string;
  payment_method: string;
  valid: boolean;
  errors: string[];
  product?: any;
  subtotal: number;
  serviceFee: number;
  total: number;
  discount: number;
}

const VALID_PAYMENT_METHODS = ['card', 'bank_transfer', 'loc', 'digicoin', 'crypto', 'flutterwave', 'stripe', 'wire_transfer', 'invoice', 'auto_card', 'prepaid'];
const SERVICE_FEE_RATE = 0.0087;

const VOLUME_DISCOUNTS = [
  { minQty: 100000, discount: 0.05, label: '5% off (100K+)' },
  { minQty: 50000, discount: 0.03, label: '3% off (50K+)' },
  { minQty: 10000, discount: 0.02, label: '2% off (10K+)' },
  { minQty: 5000, discount: 0.01, label: '1% off (5K+)' },
];

function getVolumeDiscount(qty: number): number {
  for (const tier of VOLUME_DISCOUNTS) {
    if (qty >= tier.minQty) return tier.discount;
  }
  return 0;
}

const generateAppId = () => {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let random = '';
  for (let i = 0; i < 5; i++) random += chars.charAt(Math.floor(Math.random() * chars.length));
  return `DW-${year}-${random}-BK`;
};

export default function BulkOrderProcessor() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<BulkOrderRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<{ success: number; failed: number; ids: string[] }>({ success: 0, failed: 0, ids: [] });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;

      const parsed: BulkOrderRow[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length < 5) continue;

        const [product_code, qtyStr, delivery_location, delivery_date, payment_method] = cols;
        const quantity = parseFloat(qtyStr) || 0;
        const errors: string[] = [];

        const product = products.find(p => p.code.toLowerCase() === product_code.toLowerCase());
        if (!product) errors.push(`Unknown product: ${product_code}`);
        if (quantity <= 0) errors.push('Invalid quantity');
        if (!delivery_location) errors.push('Missing delivery location');
        if (!delivery_date) errors.push('Missing delivery date');
        if (!VALID_PAYMENT_METHODS.includes(payment_method.toLowerCase())) {
          errors.push(`Invalid payment method: ${payment_method}`);
        }
        if (product && product.minOrderQuantity && quantity < product.minOrderQuantity) {
          errors.push(`Min order: ${product.minOrderQuantity} ${product.unit}s`);
        }

        const price = product?.price || 0;
        const discount = getVolumeDiscount(quantity);
        const discountedPrice = price * (1 - discount);
        const subtotal = quantity * discountedPrice;
        const isDigiCoin = payment_method.toLowerCase() === 'digicoin';
        const serviceFee = isDigiCoin ? 0 : subtotal * SERVICE_FEE_RATE;

        parsed.push({
          rowNum: i,
          product_code: product_code.toUpperCase(),
          quantity,
          delivery_location,
          delivery_date,
          payment_method: payment_method.toLowerCase(),
          valid: errors.length === 0,
          errors,
          product,
          subtotal,
          serviceFee,
          total: subtotal + serviceFee,
          discount,
        });
      }

      setRows(parsed);
      setSubmitted(false);
    };
    reader.readAsText(file);
  };

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);
  const grandSubtotal = validRows.reduce((sum, r) => sum + r.subtotal, 0);
  const grandServiceFee = validRows.reduce((sum, r) => sum + r.serviceFee, 0);
  const grandTotal = validRows.reduce((sum, r) => sum + r.total, 0);
  const totalDiscount = validRows.reduce((sum, r) => sum + (r.product?.price || 0) * r.quantity * r.discount, 0);

  const handleSubmitBatch = async () => {
    if (validRows.length === 0) return;
    setProcessing(true);
    setProgress(0);

    const successIds: string[] = [];
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        const appId = generateAppId();
        const { error } = await supabase.from('applications').insert({
          user_id: user?.id || null,
          product_id: row.product?.id,
          product_name: row.product?.name,
          product_code: row.product_code,
          product_unit: row.product?.unit,
          application_type: 'bulk_order',
          application_number: appId,
          quantity: row.quantity,
          proposed_price: row.product?.price,
          delivery_location: row.delivery_location,
          delivery_date: row.delivery_date,
          payment_method: row.payment_method,
          status: 'pending',
          service_fee: row.serviceFee,
          total_amount: row.total,
          notes: `Bulk order - Volume discount: ${(row.discount * 100).toFixed(0)}%`,
        });

        if (!error) {
          successCount++;
          successIds.push(appId);
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }

      setProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setResults({ success: successCount, failed: failCount, ids: successIds });
    setSubmitted(true);
    setProcessing(false);
  };

  const downloadTemplate = () => {
    const csv = 'product_code,quantity,delivery_location,delivery_date,payment_method\nBRENT,10000,"Lagos, Nigeria",2026-04-15,wire_transfer\nGOLD,100,"London, UK",2026-04-20,card\nNATGAS,50000,"Houston, TX",2026-05-01,digicoin';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'digiwell-bulk-order-template.csv';
    a.click();
  };

  const downloadReport = () => {
    const headers = ['Row', 'Product', 'Qty', 'Location', 'Date', 'Payment', 'Status', 'Subtotal', 'Fee', 'Total', 'Errors'];
    const csvRows = rows.map(r => [
      r.rowNum, r.product_code, r.quantity, `"${r.delivery_location}"`, r.delivery_date, r.payment_method,
      r.valid ? 'VALID' : 'INVALID', r.subtotal.toFixed(2), r.serviceFee.toFixed(2), r.total.toFixed(2),
      `"${r.errors.join('; ')}"`
    ]);
    const csv = [headers, ...csvRows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bulk-order-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
          <Package className="w-7 h-7 text-[#D4AF37]" />
          Bulk Order Processing
        </h2>
        <p className="text-slate-400">Enterprise CSV upload for batch commodity orders</p>
      </div>

      {/* Upload Section */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 border-2 border-dashed border-[#D4AF37]/50 rounded-xl p-8 text-center cursor-pointer hover:bg-white/5 transition-all" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" />
              <p className="text-white font-medium">Upload CSV File</p>
              <p className="text-slate-400 text-sm mt-1">Columns: product_code, quantity, delivery_location, delivery_date, payment_method</p>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={downloadTemplate} variant="outline" className="border-[#D4AF37]/50 text-[#D4AF37]">
                <Download className="w-4 h-4 mr-2" />Download Template
              </Button>
              <div className="text-xs text-slate-400 space-y-1">
                <p>Valid payment methods:</p>
                <p className="text-[10px]">{VALID_PAYMENT_METHODS.join(', ')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Volume Discount Tiers */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Calculator className="w-5 h-5 text-[#D4AF37]" />
            Volume Discount Tiers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {VOLUME_DISCOUNTS.map((tier, i) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-3 text-center">
                <p className="text-[#D4AF37] font-bold text-lg">{(tier.discount * 100).toFixed(0)}% OFF</p>
                <p className="text-slate-400 text-xs">{tier.minQty.toLocaleString()}+ units</p>
              </div>
            ))}
          </div>
          <p className="text-amber-400 text-xs mt-3 text-center">0.87% service fee on all methods (DigiCoin = 0% fee)</p>
        </CardContent>
      </Card>

      {/* Preview Table */}
      {rows.length > 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <BarChart3 className="w-5 h-5 text-[#D4AF37]" />
              Order Preview ({rows.length} rows)
            </CardTitle>
            <div className="flex gap-2">
              <Badge className="bg-green-500/20 text-green-400">{validRows.length} Valid</Badge>
              {invalidRows.length > 0 && <Badge className="bg-red-500/20 text-red-400">{invalidRows.length} Invalid</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50 sticky top-0">
                  <tr>
                    <th className="text-left text-slate-400 p-2">#</th>
                    <th className="text-left text-slate-400 p-2">Product</th>
                    <th className="text-right text-slate-400 p-2">Qty</th>
                    <th className="text-left text-slate-400 p-2">Location</th>
                    <th className="text-left text-slate-400 p-2">Date</th>
                    <th className="text-left text-slate-400 p-2">Payment</th>
                    <th className="text-right text-slate-400 p-2">Discount</th>
                    <th className="text-right text-slate-400 p-2">Fee</th>
                    <th className="text-right text-slate-400 p-2">Total</th>
                    <th className="text-center text-slate-400 p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowNum} className={`border-t border-white/5 ${!row.valid ? 'bg-red-500/5' : ''}`}>
                      <td className="p-2 text-slate-400">{row.rowNum}</td>
                      <td className="p-2 text-white font-mono">{row.product_code}</td>
                      <td className="p-2 text-right text-white">{row.quantity.toLocaleString()}</td>
                      <td className="p-2 text-slate-300 truncate max-w-[120px]">{row.delivery_location}</td>
                      <td className="p-2 text-slate-300">{row.delivery_date}</td>
                      <td className="p-2 text-slate-300">{row.payment_method}</td>
                      <td className="p-2 text-right text-green-400">{row.discount > 0 ? `${(row.discount * 100).toFixed(0)}%` : '-'}</td>
                      <td className="p-2 text-right text-amber-400">${row.serviceFee.toFixed(2)}</td>
                      <td className="p-2 text-right text-white font-bold">${row.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-center">
                        {row.valid ? (
                          <Check className="w-4 h-4 text-green-400 mx-auto" />
                        ) : (
                          <div className="group relative">
                            <X className="w-4 h-4 text-red-400 mx-auto cursor-help" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-red-900 text-red-200 text-xs p-2 rounded hidden group-hover:block whitespace-nowrap z-10">
                              {row.errors.join(', ')}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="bg-slate-800/50 rounded-lg p-4 mt-4 space-y-2">
              <div className="flex justify-between text-slate-300"><span>Subtotal ({validRows.length} orders)</span><span>${grandSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              {totalDiscount > 0 && <div className="flex justify-between text-green-400"><span>Volume Discounts</span><span>-${totalDiscount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>}
              <div className="flex justify-between text-amber-400"><span>Service Fees (0.87%)</span><span>${grandServiceFee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-white font-bold text-lg border-t border-slate-600 pt-2"><span>Grand Total</span><span className="text-[#D4AF37]">${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
            </div>

            {/* Error Summary */}
            {invalidRows.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mt-3">
                <p className="text-red-400 font-medium flex items-center gap-1 mb-2"><AlertTriangle className="w-4 h-4" />{invalidRows.length} rows have errors:</p>
                <ul className="text-red-300 text-xs space-y-1">
                  {invalidRows.slice(0, 5).map(r => (
                    <li key={r.rowNum}>Row {r.rowNum}: {r.errors.join(', ')}</li>
                  ))}
                  {invalidRows.length > 5 && <li>...and {invalidRows.length - 5} more</li>}
                </ul>
              </div>
            )}

            {/* Progress Bar */}
            {processing && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-slate-400 mb-1">
                  <span>Processing orders...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            {/* Results */}
            {submitted && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4 text-center">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-green-400 font-bold text-lg">Batch Processing Complete</p>
                <p className="text-slate-300">{results.success} orders submitted, {results.failed} failed</p>
                <Button onClick={downloadReport} variant="outline" className="mt-3 border-white/20 text-white">
                  <Download className="w-4 h-4 mr-2" />Download Report
                </Button>
              </div>
            )}

            {/* Actions */}
            {!submitted && (
              <div className="flex gap-3 mt-4">
                <Button onClick={downloadReport} variant="outline" className="border-white/20 text-white">
                  <Download className="w-4 h-4 mr-2" />Export CSV
                </Button>
                <Button onClick={handleSubmitBatch} disabled={processing || validRows.length === 0} className="flex-1 bg-gradient-to-r from-[#D4AF37] to-[#B8941F] text-slate-900 font-bold">
                  {processing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</> : <><FileText className="w-4 h-4 mr-2" />Submit {validRows.length} Orders</>}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
