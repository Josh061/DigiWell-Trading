import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { 
  Truck, MapPin, Navigation, Clock, CheckCircle, Camera, 
  MessageSquare, Phone, Send, Package, Route, AlertCircle,
  Play, Pause, RefreshCw, Upload, X, User
} from 'lucide-react';

interface Delivery {
  id: string;
  order_id: string;
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_address: string;
  pilot_id: string;
  pilot_name: string;
  vehicle_id: string;
  vehicle_type: string;
  product_name: string;
  quantity: number;
  unit: string;
  status: string;
  current_lat: number;
  current_lng: number;
  origin_lat: number;
  origin_lng: number;
  origin_address: string;
  destination_lat: number;
  destination_lng: number;
  destination_address: string;
  estimated_arrival: string;
  actual_arrival: string;
  distance_km: number;
  proof_of_delivery_url: string;
  notes: string;
  created_at: string;
}

interface Message {
  id: string;
  delivery_id: string;
  sender_id: string;
  sender_type: string;
  message: string;
  read: boolean;
  created_at: string;
}

const statusSteps = [
  { key: 'pending', label: 'Pending', icon: Clock },
  { key: 'assigned', label: 'Assigned', icon: User },
  { key: 'dispatched', label: 'Dispatched', icon: Truck },
  { key: 'in_transit', label: 'In Transit', icon: Navigation },
  { key: 'arriving', label: 'Arriving', icon: MapPin },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle }
];

export default function PilotDashboard() {
  const { user, userProfile } = useAuth();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [trackingActive, setTrackingActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);

  // Fetch deliveries assigned to this pilot
  const fetchDeliveries = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*')
        .eq('pilot_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      // Use mock data for demo
      setDeliveries([
        {
          id: '1',
          order_id: 'ORD-2025-1001',
          customer_id: 'cust-1',
          customer_name: 'Lagos Petroleum Ltd',
          customer_email: 'orders@lagospetro.com',
          customer_phone: '+234 801 234 5678',
          customer_address: '45 Marina Road, Lagos Island, Lagos',
          pilot_id: user.id,
          pilot_name: userProfile?.full_name || 'Pilot',
          vehicle_id: 'TRK-2025-001',
          vehicle_type: 'Tanker Truck',
          product_name: 'Premium Motor Spirit (PMS)',
          quantity: 33000,
          unit: 'liters',
          status: 'in_transit',
          current_lat: 6.4541,
          current_lng: 3.3947,
          origin_lat: 6.5244,
          origin_lng: 3.3792,
          origin_address: 'NNPC Depot, Apapa, Lagos',
          destination_lat: 6.4281,
          destination_lng: 3.4219,
          destination_address: '45 Marina Road, Lagos Island, Lagos',
          estimated_arrival: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          actual_arrival: '',
          distance_km: 15.5,
          proof_of_delivery_url: '',
          notes: 'Handle with care - Premium fuel',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          order_id: 'ORD-2025-1002',
          customer_id: 'cust-2',
          customer_name: 'Abuja Gas Station',
          customer_email: 'supply@abujags.com',
          customer_phone: '+234 802 345 6789',
          customer_address: '12 Central Business District, Abuja',
          pilot_id: user.id,
          pilot_name: userProfile?.full_name || 'Pilot',
          vehicle_id: 'TRK-2025-002',
          vehicle_type: 'LPG Carrier',
          product_name: 'Liquefied Petroleum Gas (LPG)',
          quantity: 20,
          unit: 'MT',
          status: 'dispatched',
          current_lat: 9.0765,
          current_lng: 7.3986,
          origin_lat: 9.0579,
          origin_lng: 7.4951,
          origin_address: 'NIPCO Gas Plant, Abuja',
          destination_lat: 9.0820,
          destination_lng: 7.4000,
          destination_address: '12 Central Business District, Abuja',
          estimated_arrival: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          actual_arrival: '',
          distance_km: 25.3,
          proof_of_delivery_url: '',
          notes: 'LPG delivery - Safety protocols required',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          order_id: 'ORD-2025-0998',
          customer_id: 'cust-3',
          customer_name: 'Port Harcourt Refinery',
          customer_email: 'logistics@phrefinery.com',
          customer_phone: '+234 803 456 7890',
          customer_address: 'Eleme Petrochemical, Port Harcourt',
          pilot_id: user.id,
          pilot_name: userProfile?.full_name || 'Pilot',
          vehicle_id: 'TRK-2025-003',
          vehicle_type: 'Crude Oil Tanker',
          product_name: 'Bonny Light Crude',
          quantity: 50000,
          unit: 'barrels',
          status: 'delivered',
          current_lat: 4.7774,
          current_lng: 7.0134,
          origin_lat: 4.4429,
          origin_lng: 7.0847,
          origin_address: 'Bonny Island Terminal',
          destination_lat: 4.7774,
          destination_lng: 7.0134,
          destination_address: 'Eleme Petrochemical, Port Harcourt',
          estimated_arrival: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          actual_arrival: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(),
          distance_km: 85.2,
          proof_of_delivery_url: 'https://example.com/pod-1.jpg',
          notes: 'Delivered successfully',
          created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  }, [user, userProfile]);

  // Fetch messages for a delivery
  const fetchMessages = useCallback(async (deliveryId: string) => {
    try {
      const { data, error } = await supabase
        .from('delivery_messages')
        .select('*')
        .eq('delivery_id', deliveryId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Mock messages for demo
      setMessages([
        {
          id: '1',
          delivery_id: deliveryId,
          sender_id: 'customer-1',
          sender_type: 'customer',
          message: 'Please call when you are 30 minutes away',
          read: true,
          created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          delivery_id: deliveryId,
          sender_id: user?.id || '',
          sender_type: 'pilot',
          message: 'Understood, will call ahead. Currently loading at depot.',
          read: true,
          created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString()
        }
      ]);
    }
  }, [user]);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  // GPS Tracking
  useEffect(() => {
    let watchId: number;

    if (trackingActive && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setCurrentLocation(newLocation);
          
          // Update delivery location in database
          if (selectedDelivery) {
            updateDeliveryLocation(selectedDelivery.id, newLocation.lat, newLocation.lng);
          }
        },
        (error) => {
          console.error('GPS Error:', error);
          toast({
            title: 'GPS Error',
            description: 'Unable to get your location. Please enable location services.',
            variant: 'destructive'
          });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [trackingActive, selectedDelivery]);

  const updateDeliveryLocation = async (deliveryId: string, lat: number, lng: number) => {
    try {
      await supabase
        .from('deliveries')
        .update({ 
          current_lat: lat, 
          current_lng: lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId);
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const updateDeliveryStatus = async (deliveryId: string, newStatus: string) => {
    try {
      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'delivered') {
        updates.actual_arrival = new Date().toISOString();
      }

      // Update local state
      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId ? { ...d, ...updates } : d
      ));

      if (selectedDelivery?.id === deliveryId) {
        setSelectedDelivery(prev => prev ? { ...prev, ...updates } : null);
      }

      // Update database
      await supabase
        .from('deliveries')
        .update(updates)
        .eq('id', deliveryId);

      // Send email notification
      const delivery = deliveries.find(d => d.id === deliveryId);
      if (delivery) {
        await supabase.functions.invoke('sendgrid-notifications', {
          body: {
            type: 'deliveryTracking',
            toEmail: delivery.customer_email,
            data: {
              orderId: delivery.order_id,
              customerName: delivery.customer_name,
              status: newStatus.replace('_', ' ').toUpperCase(),
              currentLocation: `${currentLocation?.lat.toFixed(4)}, ${currentLocation?.lng.toFixed(4)}`,
              driverName: delivery.pilot_name,
              vehicleId: delivery.vehicle_id,
              eta: newStatus !== 'delivered' ? new Date(delivery.estimated_arrival).toLocaleString() : undefined
            }
          }
        });
      }

      toast({
        title: 'Status Updated',
        description: `Delivery status changed to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedDelivery || !user) return;

    try {
      const message: Message = {
        id: Date.now().toString(),
        delivery_id: selectedDelivery.id,
        sender_id: user.id,
        sender_type: 'pilot',
        message: newMessage,
        read: false,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, message]);
      setNewMessage('');

      await supabase
        .from('delivery_messages')
        .insert({
          delivery_id: selectedDelivery.id,
          sender_id: user.id,
          sender_type: 'pilot',
          message: newMessage
        });

      toast({
        title: 'Message Sent',
        description: 'Your message has been delivered to the customer',
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitProofOfDelivery = async () => {
    if (!proofImage || !selectedDelivery) return;

    try {
      // In production, upload to Supabase storage
      // For now, just update the status
      await updateDeliveryStatus(selectedDelivery.id, 'delivered');
      
      setShowProofModal(false);
      setProofImage(null);

      toast({
        title: 'Delivery Completed',
        description: 'Proof of delivery has been recorded',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const getStatusIndex = (status: string) => {
    return statusSteps.findIndex(s => s.key === status);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-slate-500/20 text-slate-400';
      case 'assigned': return 'bg-blue-500/20 text-blue-400';
      case 'dispatched': return 'bg-purple-500/20 text-purple-400';
      case 'in_transit': return 'bg-[#00D4FF]/20 text-[#00D4FF]';
      case 'arriving': return 'bg-orange-500/20 text-orange-400';
      case 'delivered': return 'bg-green-500/20 text-green-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-7 h-7 text-[#D4AF37]" />
            Pilot Delivery Dashboard
          </h2>
          <p className="text-white/70 mt-1">Manage your deliveries and track routes</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={fetchDeliveries} variant="outline" className="border-white/30 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button 
            onClick={() => setTrackingActive(!trackingActive)}
            className={trackingActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}
          >
            {trackingActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {trackingActive ? 'Stop Tracking' : 'Start GPS'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#00D4FF]/20 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-[#00D4FF]" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Active Deliveries</p>
                <p className="text-2xl font-bold text-white">
                  {deliveries.filter(d => ['dispatched', 'in_transit', 'arriving'].includes(d.status)).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Completed Today</p>
                <p className="text-2xl font-bold text-white">
                  {deliveries.filter(d => d.status === 'delivered' && new Date(d.actual_arrival).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <Route className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Total Distance</p>
                <p className="text-2xl font-bold text-white">
                  {deliveries.reduce((sum, d) => sum + (d.distance_km || 0), 0).toFixed(1)} km
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-white/70 text-sm">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {deliveries.filter(d => d.status === 'pending' || d.status === 'assigned').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GPS Status */}
      {trackingActive && currentLocation && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 font-medium">GPS Active</span>
              <span className="text-white/60">|</span>
              <span className="text-white/80">
                Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
              </span>
            </div>
            <Badge className="bg-green-500/20 text-green-400">Live Tracking</Badge>
          </CardContent>
        </Card>
      )}

      {/* Deliveries List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deliveries.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 col-span-2">
            <CardContent className="p-8 text-center">
              <Truck className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">No deliveries assigned to you</p>
            </CardContent>
          </Card>
        ) : (
          deliveries.map(delivery => (
            <Card 
              key={delivery.id} 
              className={`bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all cursor-pointer ${
                selectedDelivery?.id === delivery.id ? 'ring-2 ring-[#D4AF37]' : ''
              }`}
              onClick={() => {
                setSelectedDelivery(delivery);
                fetchMessages(delivery.id);
              }}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white text-lg flex items-center gap-2">
                      <Package className="w-5 h-5 text-[#D4AF37]" />
                      {delivery.order_id}
                    </CardTitle>
                    <CardDescription className="text-white/60">{delivery.product_name}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(delivery.status)}>
                    {delivery.status.replace('_', ' ')}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Status Progress */}
                <div className="flex items-center justify-between">
                  {statusSteps.slice(0, -1).map((step, index) => {
                    const currentIndex = getStatusIndex(delivery.status);
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    const Icon = step.icon;
                    
                    return (
                      <div key={step.key} className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-500' : 'bg-slate-700'
                        } ${isCurrent ? 'ring-2 ring-[#D4AF37]' : ''}`}>
                          <Icon className={`w-4 h-4 ${isCompleted ? 'text-white' : 'text-slate-400'}`} />
                        </div>
                        {index < statusSteps.length - 2 && (
                          <div className={`w-8 h-1 ${index < currentIndex ? 'bg-green-500' : 'bg-slate-700'}`}></div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/60">Customer</p>
                    <p className="text-white font-medium">{delivery.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Quantity</p>
                    <p className="text-white font-medium">{delivery.quantity.toLocaleString()} {delivery.unit}</p>
                  </div>
                </div>

                <div className="bg-slate-800/50 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-[#00D4FF] mt-0.5" />
                    <div>
                      <p className="text-white/60 text-xs">Destination</p>
                      <p className="text-white text-sm">{delivery.destination_address}</p>
                    </div>
                  </div>
                </div>

                {delivery.estimated_arrival && delivery.status !== 'delivered' && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60 flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      ETA
                    </span>
                    <span className="text-[#D4AF37] font-medium">
                      {new Date(delivery.estimated_arrival).toLocaleTimeString()}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                {delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
                  <div className="flex gap-2 pt-2">
                    {delivery.status === 'assigned' && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); updateDeliveryStatus(delivery.id, 'dispatched'); }}
                        className="flex-1 bg-purple-500 hover:bg-purple-600"
                        size="sm"
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        Start Delivery
                      </Button>
                    )}
                    {delivery.status === 'dispatched' && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); updateDeliveryStatus(delivery.id, 'in_transit'); }}
                        className="flex-1 bg-[#00D4FF] hover:bg-[#00D4FF]/80 text-slate-900"
                        size="sm"
                      >
                        <Navigation className="w-4 h-4 mr-1" />
                        In Transit
                      </Button>
                    )}
                    {delivery.status === 'in_transit' && (
                      <Button 
                        onClick={(e) => { e.stopPropagation(); updateDeliveryStatus(delivery.id, 'arriving'); }}
                        className="flex-1 bg-orange-500 hover:bg-orange-600"
                        size="sm"
                      >
                        <MapPin className="w-4 h-4 mr-1" />
                        Arriving
                      </Button>
                    )}
                    {delivery.status === 'arriving' && (
                      <Button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setSelectedDelivery(delivery);
                          setShowProofModal(true); 
                        }}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        size="sm"
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        Complete Delivery
                      </Button>
                    )}
                    <Button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedDelivery(delivery);
                        fetchMessages(delivery.id);
                        setShowMessageModal(true); 
                      }}
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                      size="sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    <Button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        window.open(`tel:${delivery.customer_phone}`);
                      }}
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10"
                      size="sm"
                    >
                      <Phone className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {delivery.status === 'delivered' && (
                  <div className="bg-green-500/10 border border-green-500/30 p-3 rounded-lg text-center">
                    <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
                    <p className="text-green-400 font-medium">Delivered</p>
                    <p className="text-white/60 text-xs">
                      {delivery.actual_arrival && new Date(delivery.actual_arrival).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Message Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#00D4FF]" />
              Customer Communication
            </DialogTitle>
            <DialogDescription className="text-white/60">
              {selectedDelivery?.customer_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="h-64 overflow-y-auto space-y-3 bg-slate-800/50 p-3 rounded-lg">
              {messages.length === 0 ? (
                <p className="text-white/50 text-center py-8">No messages yet</p>
              ) : (
                messages.map(msg => (
                  <div 
                    key={msg.id} 
                    className={`flex ${msg.sender_type === 'pilot' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      msg.sender_type === 'pilot' 
                        ? 'bg-[#D4AF37] text-slate-900' 
                        : 'bg-slate-700 text-white'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.sender_type === 'pilot' ? 'text-slate-700' : 'text-white/50'}`}>
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="bg-slate-800 border-white/20 text-white"
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <Button onClick={sendMessage} className="bg-[#D4AF37] text-slate-900">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Proof of Delivery Modal */}
      <Dialog open={showProofModal} onOpenChange={setShowProofModal}>
        <DialogContent className="bg-slate-900 border-white/20 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-green-400" />
              Proof of Delivery
            </DialogTitle>
            <DialogDescription className="text-white/60">
              Upload a photo to confirm delivery
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleProofUpload}
              className="hidden"
            />
            
            {proofImage ? (
              <div className="relative">
                <img 
                  src={proofImage} 
                  alt="Proof of delivery" 
                  className="w-full h-64 object-cover rounded-lg"
                />
                <Button
                  onClick={() => setProofImage(null)}
                  variant="outline"
                  size="sm"
                  className="absolute top-2 right-2 bg-slate-900/80"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center cursor-pointer hover:border-[#D4AF37] transition-colors"
              >
                <Camera className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <p className="text-white/70">Click to take or upload a photo</p>
                <p className="text-white/50 text-sm mt-1">Photo of delivered goods or signature</p>
              </div>
            )}

            <Button 
              onClick={submitProofOfDelivery}
              className="w-full bg-green-500 hover:bg-green-600"
              disabled={!proofImage}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Delivery
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
