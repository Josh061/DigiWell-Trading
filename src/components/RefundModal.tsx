
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, DollarSign, RotateCcw, Shield } from 'lucide-react';

interface RefundOrder {
  id: string;
  order_number: string;
  product_name: string;
  total_amount: number;
  currency?: string;
  payment_intent_id: string | null;
  status: string;
  guest_name?: string | null;
  guest_email?: string | null;
  users?: { full_name: string; email: string } | null;
}

interface RefundModalProps {
  open: boolean;
  onClose: () => void;
  orders: RefundOrder[];
  onConfirm: (reason: string, stripeReason: string, notes: string) => Promise<void>;
  processing: boolean;
}

const REFUND_REASONS = [
  { value: 'requested_by_customer', label: 'Customer Request', description: 'Customer requested a refund' },
  { value: 'duplicate', label: 'Duplicate Order', description: 'Order was placed twice by mistake' },
  { value: 'fraudulent', label: 'Fraudulent', description: 'Suspected fraudulent transaction' },
  { value: 'product_issue', label: 'Product Issue', description: 'Product quality or delivery issue' },
  { value: 'order_error', label: 'Order Error', description: 'Wrong product or quantity ordered' },
  { value: 'delivery_failure', label: 'Delivery Failure', description: 'Unable to deliver the order' },
  { value: 'other', label: 'Other', description: 'Other reason' },
];

export default function RefundModal({ open, onClose, orders, onConfirm, processing }: RefundModalProps) {
  const [reason, setReason] = useState('requested_by_customer');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const totalRefundAmount = orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const ordersWithPayment = orders.filter(o => o.payment_intent_id);
  const ordersWithoutPayment = orders.filter(o => !o.payment_intent_id);

  // Map internal reasons to Stripe-compatible reasons
  const getStripeReason = (r: string) => {
    const stripeReasons = ['duplicate', 'fraudulent', 'requested_by_customer'];
    return stripeReasons.includes(r) ? r : 'requested_by_customer';
  };

  const handleConfirm = async () => {
    if (!reason) {
      setError('Please select a refund reason');
      return;
    }
    setError('');
    try {
      await onConfirm(reason, getStripeReason(reason), notes);
    } catch (err: any) {
      setError(err.message || 'Refund processing failed');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-slate-800 to-slate-900 border-orange-500/30 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-orange-400" />
            Confirm Refund
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Review and confirm the refund for {orders.length} order{orders.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <Alert className="bg-orange-500/10 border-orange-500/30">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
            <AlertDescription className="text-orange-200">
              This action will process refunds via Stripe and update order statuses. This cannot be easily undone.
            </AlertDescription>
          </Alert>

          {/* Refund Summary */}
          <div className="bg-slate-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Total Refund Amount</span>
              <span className="text-orange-400 font-bold text-2xl flex items-center gap-1">
                <DollarSign className="w-5 h-5" />
                {totalRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                {orders.length} order{orders.length > 1 ? 's' : ''}
              </Badge>
              {ordersWithPayment.length > 0 && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  {ordersWithPayment.length} with Stripe payment
                </Badge>
              )}
              {ordersWithoutPayment.length > 0 && (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  {ordersWithoutPayment.length} without payment ID
                </Badge>
              )}
            </div>
          </div>

          {/* Order List */}
          <div className="max-h-32 overflow-y-auto space-y-1">
            {orders.map(order => (
              <div key={order.id} className="flex items-center justify-between text-sm bg-slate-700/30 rounded-lg px-3 py-2">
                <div>
                  <span className="text-[#D4AF37] font-mono text-xs">{order.order_number}</span>
                  <span className="text-slate-400 ml-2">{order.product_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-mono">${Number(order.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {order.payment_intent_id ? (
                    <Shield className="w-3 h-3 text-green-400" title="Has Stripe payment" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-yellow-400" title="No Stripe payment ID" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label className="text-white text-sm">Refund Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REFUND_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    <div>
                      <span className="font-medium">{r.label}</span>
                      <span className="text-slate-400 ml-2 text-xs">- {r.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-white text-sm">Additional Notes (Optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add any additional notes about this refund..."
              className="bg-slate-700/50 border-slate-600 text-white min-h-[60px]"
            />
          </div>

          {error && (
            <Alert className="bg-red-500/20 border-red-500/50">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={processing}
              className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:from-orange-600 hover:to-red-600"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing Refund...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Process Refund (${totalRefundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
