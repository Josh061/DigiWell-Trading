import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface EscrowCardProps {
  escrow: any;
  userRole: 'buyer' | 'seller';
  onConfirmShipment: (id: string) => void;
  onConfirmDelivery: (id: string) => void;
  onRaiseDispute: (id: string) => void;
  onViewTracking: (id: string) => void;
}

export default function EscrowCard({ escrow, userRole, onConfirmShipment, onConfirmDelivery, onRaiseDispute, onViewTracking }: EscrowCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'funds_held': return 'bg-yellow-500';
      case 'in_transit': return 'bg-blue-500';
      case 'delivered': return 'bg-green-500';
      case 'completed': return 'bg-emerald-600';
      case 'disputed': return 'bg-red-500';
      case 'resolved': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-lg">{escrow.escrowId}</h3>
          <p className="text-sm text-gray-600">{escrow.productType}</p>
        </div>
        <Badge className={getStatusColor(escrow.status)}>
          {escrow.status.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>
      
      <div className="space-y-2 mb-4">
        <p className="text-sm"><span className="font-semibold">Amount:</span> ${escrow.amount.toLocaleString()}</p>
        <p className="text-sm"><span className="font-semibold">Quantity:</span> {escrow.quantity}</p>
        <p className="text-sm"><span className="font-semibold">Created:</span> {new Date(escrow.createdAt).toLocaleDateString()}</p>
        {escrow.trackingNumber && (
          <p className="text-sm"><span className="font-semibold">Tracking:</span> {escrow.trackingNumber}</p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {userRole === 'seller' && escrow.status === 'funds_held' && (
          <Button size="sm" onClick={() => onConfirmShipment(escrow.escrowId)}>
            Confirm Shipment
          </Button>
        )}
        {userRole === 'buyer' && escrow.status === 'in_transit' && (
          <Button size="sm" onClick={() => onConfirmDelivery(escrow.escrowId)}>
            Confirm Delivery
          </Button>
        )}
        {escrow.status === 'in_transit' && (
          <Button size="sm" variant="outline" onClick={() => onViewTracking(escrow.escrowId)}>
            Track Shipment
          </Button>
        )}
        {(escrow.status === 'in_transit' || escrow.status === 'delivered') && (
          <Button size="sm" variant="destructive" onClick={() => onRaiseDispute(escrow.escrowId)}>
            Raise Dispute
          </Button>
        )}
      </div>
    </Card>
  );
}