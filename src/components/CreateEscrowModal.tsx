import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

interface CreateEscrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  userRole: 'buyer' | 'seller';
}

export default function CreateEscrowModal({ isOpen, onClose, onSubmit, userRole }: CreateEscrowModalProps) {
  const [formData, setFormData] = useState({
    counterpartyId: '',
    amount: '',
    productType: '',
    quantity: '',
  });

  const handleSubmit = () => {
    if (formData.counterpartyId && formData.amount && formData.productType && formData.quantity) {
      onSubmit(formData);
      setFormData({ counterpartyId: '', amount: '', productType: '', quantity: '' });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Escrow Transaction</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="counterparty">{userRole === 'buyer' ? 'Seller' : 'Buyer'} ID</Label>
            <Input
              id="counterparty"
              placeholder="Enter counterparty ID"
              value={formData.counterpartyId}
              onChange={(e) => setFormData({...formData, counterpartyId: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="product">Product Type</Label>
            <Select value={formData.productType} onValueChange={(v) => setFormData({...formData, productType: v})}>
              <SelectTrigger>
                <SelectValue placeholder="Select product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Crude Oil">Crude Oil</SelectItem>
                <SelectItem value="Refined Petroleum">Refined Petroleum</SelectItem>
                <SelectItem value="Natural Gas">Natural Gas</SelectItem>
                <SelectItem value="Diesel">Diesel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity (Barrels)</Label>
            <Input
              id="quantity"
              type="number"
              placeholder="Enter quantity"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
          </div>
          <Button onClick={handleSubmit} className="w-full">
            Create Escrow
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}