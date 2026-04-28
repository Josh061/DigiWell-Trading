import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EscrowCard from '@/components/EscrowCard';
import CreateEscrowModal from '@/components/CreateEscrowModal';
import DisputeModal from '@/components/DisputeModal';
import GPSTracker from '@/components/GPSTracker';
import { toast } from 'sonner';

export default function EscrowDashboard() {
  const [escrows, setEscrows] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<'buyer' | 'seller'>('buyer');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedEscrowId, setSelectedEscrowId] = useState('');
  const [showTracking, setShowTracking] = useState(false);
  const [trackingOrderId, setTrackingOrderId] = useState('');

  useEffect(() => {
    // Load mock escrow data
    setEscrows([
      {
        escrowId: 'ESC-2025-001',
        status: 'funds_held',
        amount: 500000,
        productType: 'Crude Oil',
        quantity: '10,000 barrels',
        createdAt: new Date().toISOString(),
        trackingNumber: 'TRK-ABC123XYZ'
      },
      {
        escrowId: 'ESC-2025-002',
        status: 'in_transit',
        amount: 750000,
        productType: 'Natural Gas',
        quantity: '15,000 MMBtu',
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        trackingNumber: 'TRK-DEF456UVW'
      }
    ]);
  }, []);

  const handleCreateEscrow = async (formData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('escrow-transaction', {
        body: {
          action: 'create',
          buyerId: userRole === 'buyer' ? 'USER-001' : formData.counterpartyId,
          sellerId: userRole === 'seller' ? 'USER-001' : formData.counterpartyId,
          amount: parseFloat(formData.amount),
          productType: formData.productType,
          quantity: formData.quantity
        }
      });

      if (error) throw error;
      setEscrows([...escrows, data]);
      toast.success('Escrow created successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirmShipment = async (escrowId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('escrow-transaction', {
        body: { action: 'confirm_shipment', escrowId }
      });
      if (error) throw error;
      setEscrows(escrows.map(e => e.escrowId === escrowId ? {...e, ...data} : e));
      toast.success('Shipment confirmed!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleConfirmDelivery = async (escrowId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('escrow-transaction', {
        body: { action: 'confirm_delivery', escrowId }
      });
      if (error) throw error;
      setEscrows(escrows.map(e => e.escrowId === escrowId ? {...e, ...data} : e));
      toast.success('Delivery confirmed! Funds will be released in 24 hours.');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRaiseDispute = (escrowId: string) => {
    setSelectedEscrowId(escrowId);
    setShowDisputeModal(true);
  };

  const handleSubmitDispute = async (escrowId: string, reason: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('escrow-transaction', {
        body: { action: 'raise_dispute', escrowId, disputeReason: reason }
      });
      if (error) throw error;
      setEscrows(escrows.map(e => e.escrowId === escrowId ? {...e, ...data} : e));
      toast.success('Dispute raised successfully!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleViewTracking = (escrowId: string) => {
    setTrackingOrderId(escrowId);
    setShowTracking(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Escrow Dashboard</h2>
          <p className="text-slate-400">Secure petroleum trading with automated fund release</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>Create Escrow</Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Button 
          variant={userRole === 'buyer' ? 'default' : 'outline'}
          onClick={() => setUserRole('buyer')}
        >
          Buyer View
        </Button>
        <Button 
          variant={userRole === 'seller' ? 'default' : 'outline'}
          onClick={() => setUserRole('seller')}
        >
          Seller View
        </Button>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="disputed">Disputed</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="space-y-4">
          {escrows.filter(e => ['funds_held', 'in_transit', 'delivered'].includes(e.status)).map(escrow => (
            <EscrowCard 
              key={escrow.escrowId}
              escrow={escrow}
              userRole={userRole}
              onConfirmShipment={handleConfirmShipment}
              onConfirmDelivery={handleConfirmDelivery}
              onRaiseDispute={handleRaiseDispute}
              onViewTracking={handleViewTracking}
            />
          ))}
        </TabsContent>
        <TabsContent value="completed">
          {escrows.filter(e => e.status === 'completed').length === 0 ? (
            <p className="text-slate-400 text-center py-8">No completed transactions</p>
          ) : null}
        </TabsContent>
        <TabsContent value="disputed">
          {escrows.filter(e => e.status === 'disputed').length === 0 ? (
            <p className="text-slate-400 text-center py-8">No disputed transactions</p>
          ) : null}
        </TabsContent>
      </Tabs>

      <CreateEscrowModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEscrow}
        userRole={userRole}
      />

      <DisputeModal 
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        escrowId={selectedEscrowId}
        onSubmit={handleSubmitDispute}
      />

      {showTracking && (
        <GPSTracker 
          orderId={trackingOrderId}
          onClose={() => setShowTracking(false)}
        />
      )}
    </div>
  );
}