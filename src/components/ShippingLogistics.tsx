import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Truck,
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Search,
  Plus,
  RefreshCw,
  Ship,
  Plane,
  Mail,
  Phone,
  Bell,
  Navigation,
  Calendar,
  Weight,
  Box,
  DollarSign,
  Eye,
  Send,
  ArrowRight,
  Globe,
  Loader2,
  X,
  ChevronRight,
  Map
} from 'lucide-react';

interface Shipment {
  id: string;
  order_id: string;
  tracking_number: string;
  carrier: string;
  carrier_service: string;
  status: string;
  origin_address: string;
  origin_city: string;
  origin_country: string;
  origin_latitude: number;
  origin_longitude: number;
  destination_address: string;
  destination_city: string;
  destination_country: string;
  destination_latitude: number;
  destination_longitude: number;
  current_location: string;
  current_city: string;
  current_country: string;
  current_latitude: number;
  current_longitude: number;
  shipped_at: string;
  estimated_delivery: string;
  actual_delivery: string;
  weight_kg: number;
  dimensions_cm: string;
  package_count: number;
  package_type: string;
  shipping_cost: number;
  insurance_cost: number;
  currency: string;
  sender_name: string;
  sender_phone: string;
  sender_email: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email: string;
  sms_notifications: boolean;
  email_notifications: boolean;
  special_instructions: string;
  signature_required: boolean;
  insurance_value: number;
  contents_description: string;
  created_at: string;
  updated_at: string;
}

interface ShipmentEvent {
  id: string;
  shipment_id: string;
  event_type: string;
  status: string;
  description: string;
  location: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  event_timestamp: string;
}

interface ShipmentStats {
  total: number;
  by_status: Record<string, number>;
  by_carrier: Record<string, number>;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-gray-500', icon: <Clock className="w-4 h-4" /> },
  picked_up: { label: 'Picked Up', color: 'bg-blue-500', icon: <Package className="w-4 h-4" /> },
  in_transit: { label: 'In Transit', color: 'bg-purple-500', icon: <Truck className="w-4 h-4" /> },
  out_for_delivery: { label: 'Out for Delivery', color: 'bg-amber-500', icon: <Navigation className="w-4 h-4" /> },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> },
  exception: { label: 'Exception', color: 'bg-red-500', icon: <AlertTriangle className="w-4 h-4" /> },
  returned: { label: 'Returned', color: 'bg-red-600', icon: <ArrowRight className="w-4 h-4 rotate-180" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-600', icon: <X className="w-4 h-4" /> }
};

const carrierConfig: Record<string, { name: string; icon: React.ReactNode; color: string; services: string[] }> = {
  DHL: { 
    name: 'DHL Express', 
    icon: <Plane className="w-5 h-5" />, 
    color: 'bg-yellow-500',
    services: ['Express Worldwide', 'Express 12:00', 'Express 9:00', 'Economy Select', 'Freight']
  },
  FedEx: { 
    name: 'FedEx', 
    icon: <Truck className="w-5 h-5" />, 
    color: 'bg-purple-600',
    services: ['International Priority', 'International Economy', 'Ground', 'Express Saver', 'Freight']
  },
  Maersk: { 
    name: 'Maersk Line', 
    icon: <Ship className="w-5 h-5" />, 
    color: 'bg-blue-600',
    services: ['Ocean Freight FCL', 'Ocean Freight LCL', 'Reefer', 'Breakbulk', 'Project Cargo']
  },
  UPS: { 
    name: 'UPS', 
    icon: <Package className="w-5 h-5" />, 
    color: 'bg-amber-700',
    services: ['Worldwide Express', 'Worldwide Expedited', 'Standard', 'Ground', 'Freight']
  },
  USPS: { 
    name: 'USPS', 
    icon: <Mail className="w-5 h-5" />, 
    color: 'bg-blue-800',
    services: ['Priority Mail Express', 'Priority Mail', 'First-Class', 'Media Mail', 'Parcel Select']
  }
};

export default function ShippingLogistics() {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<ShipmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [carrierFilter, setCarrierFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [shipmentEvents, setShipmentEvents] = useState<ShipmentEvent[]>([]);
  const [processing, setProcessing] = useState(false);

  // Create shipment form state
  const [createForm, setCreateForm] = useState({
    order_id: '',
    carrier: 'DHL',
    carrier_service: '',
    origin_address: '',
    origin_city: '',
    origin_country: '',
    origin_postal_code: '',
    destination_address: '',
    destination_city: '',
    destination_country: '',
    destination_postal_code: '',
    weight_kg: '',
    dimensions_cm: '',
    package_count: '1',
    package_type: 'box',
    shipping_cost: '',
    insurance_cost: '',
    sender_name: '',
    sender_phone: '',
    sender_email: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_email: '',
    sms_notifications: true,
    email_notifications: true,
    special_instructions: '',
    signature_required: false,
    insurance_value: '',
    contents_description: ''
  });

  // Update status form state
  const [updateForm, setUpdateForm] = useState({
    status: '',
    description: '',
    location: '',
    city: '',
    country: ''
  });

  useEffect(() => {
    loadShipments();
    loadStats();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {

      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_shipments', limit: 100 }
      });

      if (error) throw error;
      if (data?.success) {
        setShipments(data.shipments || []);
      } else {
        // Use fallback empty state
        setShipments([]);
      }
    } catch (error: any) {
      console.warn('Shipping API unavailable, using fallback:', error.message);
      // Graceful fallback - don't show error toast for API unavailability
      setShipments([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_stats' }
      });

      if (error) throw error;
      if (data?.success) {
        setStats(data.stats);
      } else {
        // Fallback stats
        setStats({ total: 0, by_status: {}, by_carrier: {} });
      }
    } catch (error) {
      console.warn('Failed to load stats, using fallback:', error);
      setStats({ total: 0, by_status: {}, by_carrier: {} });
    }
  };


  const loadShipmentDetails = async (shipment: Shipment) => {
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_shipment', shipment_id: shipment.id }
      });

      if (error) throw error;
      if (data.success) {
        setSelectedShipment(data.shipment);
        setShipmentEvents(data.events || []);
        setShowDetailModal(true);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load shipment details',
        variant: 'destructive'
      });
    }
  };

  const handleCreateShipment = async () => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: {
          action: 'create_shipment',
          ...createForm,
          weight_kg: parseFloat(createForm.weight_kg) || null,
          package_count: parseInt(createForm.package_count) || 1,
          shipping_cost: parseFloat(createForm.shipping_cost) || null,
          insurance_cost: parseFloat(createForm.insurance_cost) || null,
          insurance_value: parseFloat(createForm.insurance_value) || null
        }
      });

      if (error) throw error;
      if (data.success) {
        toast({
          title: 'Shipment Created',
          description: `Tracking number: ${data.shipment.tracking_number}`
        });
        setShowCreateModal(false);
        resetCreateForm();
        loadShipments();
        loadStats();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create shipment',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedShipment) return;
    
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: {
          action: 'update_status',
          shipment_id: selectedShipment.id,
          ...updateForm
        }
      });

      if (error) throw error;
      if (data.success) {
        toast({
          title: 'Status Updated',
          description: `Shipment status updated to ${updateForm.status}`
        });
        setShowUpdateModal(false);
        setUpdateForm({ status: '', description: '', location: '', city: '', country: '' });
        loadShipments();
        loadStats();
        loadShipmentDetails(selectedShipment);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      order_id: '',
      carrier: 'DHL',
      carrier_service: '',
      origin_address: '',
      origin_city: '',
      origin_country: '',
      origin_postal_code: '',
      destination_address: '',
      destination_city: '',
      destination_country: '',
      destination_postal_code: '',
      weight_kg: '',
      dimensions_cm: '',
      package_count: '1',
      package_type: 'box',
      shipping_cost: '',
      insurance_cost: '',
      sender_name: '',
      sender_phone: '',
      sender_email: '',
      recipient_name: '',
      recipient_phone: '',
      recipient_email: '',
      sms_notifications: true,
      email_notifications: true,
      special_instructions: '',
      signature_required: false,
      insurance_value: '',
      contents_description: ''
    });
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch = searchQuery === '' || 
      s.tracking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.recipient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.destination_city?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchesCarrier = carrierFilter === 'all' || s.carrier === carrierFilter;
    
    const matchesTab = activeTab === 'all' ||
      (activeTab === 'active' && ['pending', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status)) ||
      (activeTab === 'delivered' && s.status === 'delivered') ||
      (activeTab === 'exception' && ['exception', 'returned', 'cancelled'].includes(s.status));
    
    return matchesSearch && matchesStatus && matchesCarrier && matchesTab;
  });

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
              <Truck className="w-8 h-8 text-white" />
            </div>
            Shipping & Logistics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage shipments across all carriers
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { loadShipments(); loadStats(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Plus className="w-4 h-4 mr-2" />
            Create Shipment
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-0">
          <CardContent className="p-4 text-center">
            <Package className="w-6 h-6 mx-auto mb-2 text-gray-600" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total || 0}</p>
            <p className="text-xs text-gray-500">Total</p>
          </CardContent>
        </Card>
        {Object.entries(statusConfig).slice(0, 7).map(([key, config]) => (
          <Card key={key} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-0">
            <CardContent className="p-4 text-center">
              <div className={`w-6 h-6 mx-auto mb-2 ${config.color} rounded-full flex items-center justify-center text-white`}>
                {config.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.by_status[key] || 0}
              </p>
              <p className="text-xs text-gray-500">{config.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Carrier Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(carrierConfig).map(([key, config]) => (
          <Card key={key} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setCarrierFilter(carrierFilter === key ? 'all' : key)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-3 ${config.color} rounded-xl text-white`}>
                {config.icon}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{config.name}</p>
                <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                  {stats?.by_carrier[key] || 0}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by tracking number, recipient, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={carrierFilter} onValueChange={setCarrierFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                {Object.entries(carrierConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Shipments Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="delivered">Delivered</TabsTrigger>
          <TabsTrigger value="exception">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredShipments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No shipments found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredShipments.map((shipment) => (
                <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Carrier & Tracking */}
                      <div className="flex items-center gap-4 min-w-[200px]">
                        <div className={`p-3 ${carrierConfig[shipment.carrier]?.color || 'bg-gray-500'} rounded-xl text-white`}>
                          {carrierConfig[shipment.carrier]?.icon || <Package className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-mono font-semibold text-gray-900 dark:text-white">
                            {shipment.tracking_number}
                          </p>
                          <p className="text-sm text-gray-500">
                            {carrierConfig[shipment.carrier]?.name || shipment.carrier}
                          </p>
                        </div>
                      </div>

                      {/* Route */}
                      <div className="flex-1 flex items-center gap-2">
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {shipment.origin_city}
                          </p>
                          <p className="text-xs text-gray-500">{shipment.origin_country}</p>
                        </div>
                        <div className="flex-1 flex items-center justify-center">
                          <div className="h-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
                          <ChevronRight className="w-4 h-4 text-gray-400 mx-1" />
                          <div className="h-0.5 flex-1 bg-gray-200 dark:bg-gray-700" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {shipment.destination_city}
                          </p>
                          <p className="text-xs text-gray-500">{shipment.destination_country}</p>
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-4">
                        <Badge className={`${statusConfig[shipment.status]?.color || 'bg-gray-500'} text-white`}>
                          {statusConfig[shipment.status]?.icon}
                          <span className="ml-1">{statusConfig[shipment.status]?.label || shipment.status}</span>
                        </Badge>
                      </div>

                      {/* Delivery Date */}
                      <div className="text-center min-w-[120px]">
                        <p className="text-xs text-gray-500">Est. Delivery</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatDate(shipment.estimated_delivery)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadShipmentDetails(shipment)}>
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedShipment(shipment);
                            setShowMapModal(true);
                          }}
                        >
                          <Map className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Shipment Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Create New Shipment
            </DialogTitle>
            <DialogDescription>
              Enter shipment details to generate a tracking number
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Carrier Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Carrier</Label>
                <Select value={createForm.carrier} onValueChange={(v) => setCreateForm({ ...createForm, carrier: v, carrier_service: '' })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(carrierConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {config.icon}
                          {config.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Service</Label>
                <Select value={createForm.carrier_service} onValueChange={(v) => setCreateForm({ ...createForm, carrier_service: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {carrierConfig[createForm.carrier]?.services.map((service) => (
                      <SelectItem key={service} value={service}>{service}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Origin */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Origin Address
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={createForm.origin_address}
                    onChange={(e) => setCreateForm({ ...createForm, origin_address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={createForm.origin_city}
                    onChange={(e) => setCreateForm({ ...createForm, origin_city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={createForm.origin_country}
                    onChange={(e) => setCreateForm({ ...createForm, origin_country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Destination */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                Destination Address
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={createForm.destination_address}
                    onChange={(e) => setCreateForm({ ...createForm, destination_address: e.target.value })}
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={createForm.destination_city}
                    onChange={(e) => setCreateForm({ ...createForm, destination_city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={createForm.destination_country}
                    onChange={(e) => setCreateForm({ ...createForm, destination_country: e.target.value })}
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Box className="w-4 h-4" />
                Package Details
              </h3>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={createForm.weight_kg}
                    onChange={(e) => setCreateForm({ ...createForm, weight_kg: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Dimensions (cm)</Label>
                  <Input
                    value={createForm.dimensions_cm}
                    onChange={(e) => setCreateForm({ ...createForm, dimensions_cm: e.target.value })}
                    placeholder="L x W x H"
                  />
                </div>
                <div>
                  <Label>Package Count</Label>
                  <Input
                    type="number"
                    value={createForm.package_count}
                    onChange={(e) => setCreateForm({ ...createForm, package_count: e.target.value })}
                    min="1"
                  />
                </div>
                <div>
                  <Label>Package Type</Label>
                  <Select value={createForm.package_type} onValueChange={(v) => setCreateForm({ ...createForm, package_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="envelope">Envelope</SelectItem>
                      <SelectItem value="pallet">Pallet</SelectItem>
                      <SelectItem value="container">Container</SelectItem>
                      <SelectItem value="crate">Crate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Contents Description</Label>
                <Textarea
                  value={createForm.contents_description}
                  onChange={(e) => setCreateForm({ ...createForm, contents_description: e.target.value })}
                  placeholder="Describe the package contents..."
                  rows={2}
                />
              </div>
            </div>

            {/* Sender & Recipient */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Sender Information</h3>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={createForm.sender_name}
                    onChange={(e) => setCreateForm({ ...createForm, sender_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={createForm.sender_phone}
                    onChange={(e) => setCreateForm({ ...createForm, sender_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={createForm.sender_email}
                    onChange={(e) => setCreateForm({ ...createForm, sender_email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold">Recipient Information</h3>
                <div>
                  <Label>Name</Label>
                  <Input
                    value={createForm.recipient_name}
                    onChange={(e) => setCreateForm({ ...createForm, recipient_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={createForm.recipient_phone}
                    onChange={(e) => setCreateForm({ ...createForm, recipient_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={createForm.recipient_email}
                    onChange={(e) => setCreateForm({ ...createForm, recipient_email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Notifications & Options */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.email_notifications}
                  onCheckedChange={(v) => setCreateForm({ ...createForm, email_notifications: v })}
                />
                <Label className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email Notifications
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.sms_notifications}
                  onCheckedChange={(v) => setCreateForm({ ...createForm, sms_notifications: v })}
                />
                <Label className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  SMS Notifications
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={createForm.signature_required}
                  onCheckedChange={(v) => setCreateForm({ ...createForm, signature_required: v })}
                />
                <Label>Signature Required</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateShipment} disabled={processing} className="bg-gradient-to-r from-blue-600 to-purple-600">
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Create Shipment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Shipment Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedShipment && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`p-2 ${carrierConfig[selectedShipment.carrier]?.color || 'bg-gray-500'} rounded-lg text-white`}>
                    {carrierConfig[selectedShipment.carrier]?.icon || <Package className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="font-mono">{selectedShipment.tracking_number}</span>
                    <Badge className={`ml-3 ${statusConfig[selectedShipment.status]?.color || 'bg-gray-500'} text-white`}>
                      {statusConfig[selectedShipment.status]?.label || selectedShipment.status}
                    </Badge>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="overview" className="mt-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  {/* Route Visualization */}
                  <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white mb-2 mx-auto">
                            <MapPin className="w-6 h-6" />
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedShipment.origin_city}</p>
                          <p className="text-sm text-gray-500">{selectedShipment.origin_country}</p>
                        </div>
                        
                        <div className="flex-1 mx-8">
                          <div className="relative">
                            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                              <div 
                                className="h-1 bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all"
                                style={{ 
                                  width: selectedShipment.status === 'delivered' ? '100%' : 
                                         selectedShipment.status === 'out_for_delivery' ? '85%' :
                                         selectedShipment.status === 'in_transit' ? '50%' :
                                         selectedShipment.status === 'picked_up' ? '25%' : '5%'
                                }}
                              />
                            </div>
                            {selectedShipment.current_city && selectedShipment.status !== 'delivered' && (
                              <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
                                <Navigation className="w-5 h-5 text-purple-500 mx-auto animate-pulse" />
                                <p className="text-xs text-gray-500 mt-1">
                                  {selectedShipment.current_city}, {selectedShipment.current_country}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className={`w-12 h-12 ${selectedShipment.status === 'delivered' ? 'bg-blue-500' : 'bg-gray-300'} rounded-full flex items-center justify-center text-white mb-2 mx-auto`}>
                            <MapPin className="w-6 h-6" />
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedShipment.destination_city}</p>
                          <p className="text-sm text-gray-500">{selectedShipment.destination_country}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Calendar className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                        <p className="text-xs text-gray-500">Shipped</p>
                        <p className="font-semibold">{formatDate(selectedShipment.shipped_at)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Clock className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                        <p className="text-xs text-gray-500">Est. Delivery</p>
                        <p className="font-semibold">{formatDate(selectedShipment.estimated_delivery)}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Weight className="w-5 h-5 mx-auto mb-2 text-gray-400" />
                        <p className="text-xs text-gray-500">Weight</p>
                        <p className="font-semibold">{selectedShipment.weight_kg || '-'} kg</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <DollarSign className="w-5 h-5 mx-auto mb-2 text-green-500" />
                        <p className="text-xs text-gray-500">Shipping Cost</p>
                        <p className="font-semibold">${selectedShipment.shipping_cost || '0.00'}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button onClick={() => {
                      setUpdateForm({ ...updateForm, status: '' });
                      setShowUpdateModal(true);
                    }}>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Update Status
                    </Button>
                    <Button variant="outline" onClick={() => setShowMapModal(true)}>
                      <Map className="w-4 h-4 mr-2" />
                      View on Map
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <div className="space-y-4">
                    {shipmentEvents.map((event, index) => (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${statusConfig[event.status]?.color || 'bg-gray-500'}`}>
                            {statusConfig[event.status]?.icon || <Clock className="w-4 h-4" />}
                          </div>
                          {index < shipmentEvents.length - 1 && (
                            <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 my-2" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {statusConfig[event.status]?.label || event.status}
                            </p>
                            <p className="text-sm text-gray-500">{formatDateTime(event.event_timestamp)}</p>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mt-1">{event.description}</p>
                          {event.location && (
                            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="details" className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Sender</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="font-medium">{selectedShipment.sender_name || '-'}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {selectedShipment.sender_phone || '-'}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {selectedShipment.sender_email || '-'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Recipient</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="font-medium">{selectedShipment.recipient_name || '-'}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          {selectedShipment.recipient_phone || '-'}
                        </p>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          {selectedShipment.recipient_email || '-'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Package Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Type</p>
                          <p className="font-medium capitalize">{selectedShipment.package_type || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Count</p>
                          <p className="font-medium">{selectedShipment.package_count || 1}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Dimensions</p>
                          <p className="font-medium">{selectedShipment.dimensions_cm || '-'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Insurance Value</p>
                          <p className="font-medium">${selectedShipment.insurance_value || '0.00'}</p>
                        </div>
                      </div>
                      {selectedShipment.contents_description && (
                        <div className="mt-4">
                          <p className="text-gray-500 text-sm">Contents</p>
                          <p className="font-medium">{selectedShipment.contents_description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Mail className={`w-5 h-5 ${selectedShipment.email_notifications ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-sm">Email: {selectedShipment.email_notifications ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className={`w-5 h-5 ${selectedShipment.sms_notifications ? 'text-green-500' : 'text-gray-400'}`} />
                        <span className="text-sm">SMS: {selectedShipment.sms_notifications ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Notifications are automatically sent to both sender and recipient when shipment status changes.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={showUpdateModal} onOpenChange={setShowUpdateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipment Status</DialogTitle>
            <DialogDescription>
              Update the status and location for tracking #{selectedShipment?.tracking_number}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>New Status</Label>
              <Select value={updateForm.status} onValueChange={(v) => setUpdateForm({ ...updateForm, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(statusConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        {config.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={updateForm.description}
                onChange={(e) => setUpdateForm({ ...updateForm, description: e.target.value })}
                placeholder="Enter status update description..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Location</Label>
                <Input
                  value={updateForm.location}
                  onChange={(e) => setUpdateForm({ ...updateForm, location: e.target.value })}
                  placeholder="Facility/Address"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={updateForm.city}
                  onChange={(e) => setUpdateForm({ ...updateForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={updateForm.country}
                  onChange={(e) => setUpdateForm({ ...updateForm, country: e.target.value })}
                  placeholder="Country"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowUpdateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateStatus} disabled={processing || !updateForm.status}>
                {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Update Status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Map Modal */}
      <Dialog open={showMapModal} onOpenChange={setShowMapModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Shipment Location
            </DialogTitle>
          </DialogHeader>

          {selectedShipment && (
            <div className="space-y-4">
              {/* Map Placeholder with Route Visualization */}
              <div className="relative h-96 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Globe className="w-32 h-32 text-blue-200 dark:text-blue-800" />
                </div>
                
                {/* Origin Marker */}
                <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs shadow">
                      {selectedShipment.origin_city}
                    </div>
                  </div>
                </div>

                {/* Current Location Marker */}
                {selectedShipment.current_city && selectedShipment.status !== 'delivered' && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <div className="relative">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white shadow-lg">
                        <Navigation className="w-5 h-5 animate-bounce" />
                      </div>
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs shadow font-semibold">
                        {selectedShipment.current_city}
                      </div>
                    </div>
                  </div>
                )}

                {/* Destination Marker */}
                <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2">
                  <div className="relative">
                    <div className={`w-8 h-8 ${selectedShipment.status === 'delivered' ? 'bg-blue-500' : 'bg-gray-400'} rounded-full flex items-center justify-center text-white shadow-lg`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white dark:bg-gray-800 px-2 py-1 rounded text-xs shadow">
                      {selectedShipment.destination_city}
                    </div>
                  </div>
                </div>

                {/* Route Line */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <path
                    d="M 25% 25% Q 50% 30%, 50% 50% Q 50% 70%, 75% 75%"
                    fill="none"
                    stroke="rgba(59, 130, 246, 0.5)"
                    strokeWidth="3"
                    strokeDasharray="10,5"
                  />
                </svg>
              </div>

              {/* Location Details */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-900/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">ORIGIN</p>
                    <p className="font-medium">{selectedShipment.origin_city}</p>
                    <p className="text-sm text-gray-500">{selectedShipment.origin_country}</p>
                    <p className="text-xs text-gray-400 mt-2">{selectedShipment.origin_address}</p>
                  </CardContent>
                </Card>
                <Card className="bg-purple-50 dark:bg-purple-900/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold mb-1">CURRENT LOCATION</p>
                    <p className="font-medium">{selectedShipment.current_city || '-'}</p>
                    <p className="text-sm text-gray-500">{selectedShipment.current_country || '-'}</p>
                    <p className="text-xs text-gray-400 mt-2">{selectedShipment.current_location || '-'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-blue-50 dark:bg-blue-900/20">
                  <CardContent className="p-4">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">DESTINATION</p>
                    <p className="font-medium">{selectedShipment.destination_city}</p>
                    <p className="text-sm text-gray-500">{selectedShipment.destination_country}</p>
                    <p className="text-xs text-gray-400 mt-2">{selectedShipment.destination_address}</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
