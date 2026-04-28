import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  escrowId: string;
  onSubmit: (escrowId: string, reason: string) => void;
}

export default function DisputeModal({ isOpen, onClose, escrowId, onSubmit }: DisputeModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(escrowId, reason);
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Raise Dispute - {escrowId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Dispute Reason</Label>
            <Textarea
              id="reason"
              placeholder="Describe the issue with this transaction..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={6}
              className="mt-2"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="flex-1">
              Submit Dispute
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}