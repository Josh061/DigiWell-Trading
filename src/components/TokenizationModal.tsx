import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';

interface TokenizationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TokenizationModal({ open, onClose, onSuccess }: TokenizationModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assetName: '',
    assetType: 'petroleum',
    assetValue: '',
    totalTokens: '',
    pricePerToken: '',
    investmentType: 'investor_trading',
    description: ''
  });

  const handleTokenize = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('asset-tokenization', {
        body: {
          action: 'tokenize',
          userId: 'user-123',
          ...formData,
          assetValue: parseFloat(formData.assetValue),
          totalTokens: parseInt(formData.totalTokens),
          pricePerToken: parseFloat(formData.pricePerToken)
        }
      });

      if (error) throw error;
      alert(`Asset tokenized successfully! Token ID: ${data.tokenId}`);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tokenize Asset with Digicoin</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Asset Name</Label>
            <Input value={formData.assetName} onChange={(e) => setFormData({...formData, assetName: e.target.value})} />
          </div>
          <div>
            <Label>Asset Type</Label>
            <Select value={formData.assetType} onValueChange={(v) => setFormData({...formData, assetType: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="petroleum">Petroleum</SelectItem>
                <SelectItem value="commodity">Commodity</SelectItem>
                <SelectItem value="real_estate">Real Estate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Asset Value (USD)</Label>
            <Input type="number" value={formData.assetValue} onChange={(e) => setFormData({...formData, assetValue: e.target.value})} />
          </div>
          <div>
            <Label>Total Tokens to Issue</Label>
            <Input type="number" value={formData.totalTokens} onChange={(e) => setFormData({...formData, totalTokens: e.target.value})} />
          </div>
          <div>
            <Label>Price per Token (Digicoin)</Label>
            <Input type="number" value={formData.pricePerToken} onChange={(e) => setFormData({...formData, pricePerToken: e.target.value})} />
          </div>
          <div>
            <Label>Investment Type</Label>
            <Select value={formData.investmentType} onValueChange={(v) => setFormData({...formData, investmentType: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="investor_trading">Investor Trading</SelectItem>
                <SelectItem value="seed_investment">Seed Investment</SelectItem>
                <SelectItem value="fdi">Foreign Direct Investment</SelectItem>
                <SelectItem value="ipo">Initial Public Offering</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={3} />
          </div>
          <Button onClick={handleTokenize} disabled={loading} className="w-full">
            {loading ? 'Tokenizing...' : 'Tokenize Asset'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}