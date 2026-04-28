import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Map, MapPin, Ship, Truck, Plane, Package, Clock, Navigation,
  RefreshCw, Loader2, X, ChevronRight, Globe, Anchor
} from 'lucide-react';

interface Shipment {
  id: string;
  order_id: string;
  tracking_number: string;
  carrier: string;
  status: string;
  origin_address: string;
  origin_lat: number;
  origin_lng: number;
  destination_address: string;
  destination_lat: number;
  destination_lng: number;
  current_lat: number;
  current_lng: number;
  estimated_delivery: string;
  product_type?: string;
  quantity?: number;
  total_amount?: number;
}

interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  created_at: string;
}

export default function ShipmentMap() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [shipmentEvents, setShipmentEvents] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCarrier, setFilterCarrier] = useState('all');
  const [showDetails, setShowDetails] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapCenter, setMapCenter] = useState({ lat: 20, lng: 0 });
  const [mapZoom, setMapZoom] = useState(2);

  useEffect(() => {
    loadShipments();
  }, []);

  const loadShipments = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_shipments' }
      });
      if (data?.shipments) {
        setShipments(data.shipments);
      }
    } catch (error) {
      console.error('Error loading shipments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShipmentEvents = async (shipmentId: string) => {
    try {
      const { data } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_shipment', shipment_id: shipmentId }
      });
      if (data?.events) {
        setShipmentEvents(data.events);
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleShipmentClick = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    loadShipmentEvents(shipment.id);
    setShowDetails(true);
    // Center map on shipment
    if (shipment.current_lat && shipment.current_lng) {
      setMapCenter({ lat: shipment.current_lat, lng: shipment.current_lng });
      setMapZoom(6);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#22c55e';
      case 'in_transit': return '#3b82f6';
      case 'out_for_delivery': return '#f59e0b';
      case 'pending': return '#8b5cf6';
      case 'exception': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500/20 text-green-400';
      case 'in_transit': return 'bg-blue-500/20 text-blue-400';
      case 'out_for_delivery': return 'bg-yellow-500/20 text-yellow-400';
      case 'pending': return 'bg-purple-500/20 text-purple-400';
      case 'exception': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getCarrierIcon = (carrier: string) => {
    switch (carrier?.toLowerCase()) {
      case 'maersk': return <Anchor className="w-4 h-4" />;
      case 'dhl':
      case 'fedex':
      case 'ups':
      case 'usps': return <Truck className="w-4 h-4" />;
      default: return <Ship className="w-4 h-4" />;
    }
  };

  const filteredShipments = shipments.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterCarrier !== 'all' && s.carrier !== filterCarrier) return false;
    return true;
  });

  const activeShipments = shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery');
  const carriers = [...new Set(shipments.map(s => s.carrier))];

  // Calculate progress percentage for route
  const calculateProgress = (shipment: Shipment) => {
    if (!shipment.origin_lat || !shipment.destination_lat || !shipment.current_lat) return 50;
    
    const totalDistance = Math.sqrt(
      Math.pow(shipment.destination_lat - shipment.origin_lat, 2) +
      Math.pow(shipment.destination_lng - shipment.origin_lng, 2)
    );
    const currentDistance = Math.sqrt(
      Math.pow(shipment.current_lat - shipment.origin_lat, 2) +
      Math.pow(shipment.current_lng - shipment.origin_lng, 2)
    );
    
    return Math.min(100, Math.max(0, (currentDistance / totalDistance) * 100));
  };

  // SVG Map Component
  const WorldMap = () => {
    const width = 800;
    const height = 400;
    
    // Simple mercator projection
    const projectLng = (lng: number) => ((lng + 180) / 360) * width;
    const projectLat = (lat: number) => ((90 - lat) / 180) * height;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full bg-slate-800/50 rounded-lg">
        {/* World outline - simplified */}
        <rect x="0" y="0" width={width} height={height} fill="#1e293b" />
        
        {/* Grid lines */}
        {[-60, -30, 0, 30, 60].map(lat => (
          <line
            key={`lat-${lat}`}
            x1="0"
            y1={projectLat(lat)}
            x2={width}
            y2={projectLat(lat)}
            stroke="#334155"
            strokeWidth="0.5"
          />
        ))}
        {[-120, -60, 0, 60, 120].map(lng => (
          <line
            key={`lng-${lng}`}
            x1={projectLng(lng)}
            y1="0"
            x2={projectLng(lng)}
            y2={height}
            stroke="#334155"
            strokeWidth="0.5"
          />
        ))}

        {/* Simplified continent outlines */}
        <path
          d="M 150 120 Q 200 100 250 110 Q 280 130 270 160 Q 250 180 200 170 Q 160 150 150 120"
          fill="#475569"
          opacity="0.5"
        />
        <path
          d="M 350 100 Q 450 80 500 100 Q 520 150 480 200 Q 400 220 350 180 Q 330 140 350 100"
          fill="#475569"
          opacity="0.5"
        />
        <path
          d="M 520 120 Q 600 100 680 130 Q 700 180 650 220 Q 580 240 530 200 Q 500 160 520 120"
          fill="#475569"
          opacity="0.5"
        />
        <path
          d="M 580 250 Q 620 240 650 260 Q 660 300 630 320 Q 590 310 580 280 Q 570 260 580 250"
          fill="#475569"
          opacity="0.5"
        />

        {/* Shipping routes */}
        {filteredShipments.map(shipment => {
          if (!shipment.origin_lat || !shipment.destination_lat) return null;
          
          const x1 = projectLng(shipment.origin_lng);
          const y1 = projectLat(shipment.origin_lat);
          const x2 = projectLng(shipment.destination_lng);
          const y2 = projectLat(shipment.destination_lat);
          const cx = projectLng(shipment.current_lng || shipment.origin_lng);
          const cy = projectLat(shipment.current_lat || shipment.origin_lat);
          
          // Calculate control point for curved path
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2 - 30;
          
          return (
            <g key={shipment.id}>
              {/* Route line */}
              <path
                d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                fill="none"
                stroke={getStatusColor(shipment.status)}
                strokeWidth="2"
                strokeDasharray={shipment.status === 'delivered' ? '0' : '5,5'}
                opacity="0.6"
              />
              
              {/* Origin marker */}
              <circle cx={x1} cy={y1} r="6" fill="#22c55e" stroke="#fff" strokeWidth="2" />
              
              {/* Destination marker */}
              <circle cx={x2} cy={y2} r="6" fill="#ef4444" stroke="#fff" strokeWidth="2" />
              
              {/* Current position marker (animated) */}
              {shipment.status !== 'delivered' && shipment.current_lat && (
                <g
                  className="cursor-pointer"
                  onClick={() => handleShipmentClick(shipment)}
                >
                  <circle cx={cx} cy={cy} r="12" fill={getStatusColor(shipment.status)} opacity="0.3">
                    <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={cx} cy={cy} r="8" fill={getStatusColor(shipment.status)} stroke="#fff" strokeWidth="2" />
                </g>
              )}
            </g>
          );
        })}

        {/* Legend */}
        <g transform="translate(20, 350)">
          <rect x="0" y="0" width="150" height="40" fill="#1e293b" rx="4" opacity="0.9" />
          <circle cx="15" cy="12" r="4" fill="#22c55e" />
          <text x="25" y="16" fill="#94a3b8" fontSize="10">Origin</text>
          <circle cx="75" cy="12" r="4" fill="#ef4444" />
          <text x="85" y="16" fill="#94a3b8" fontSize="10">Destination</text>
          <circle cx="15" cy="30" r="4" fill="#3b82f6" />
          <text x="25" y="34" fill="#94a3b8" fontSize="10">In Transit</text>
        </g>
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe className="w-7 h-7 text-[#00D4FF]" />
            Shipment Tracking Map
          </h2>
          <p className="text-slate-400">Real-time visualization of all active shipments</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="exception">Exception</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCarrier} onValueChange={setFilterCarrier}>
            <SelectTrigger className="w-32 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Carrier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Carriers</SelectItem>
              {carriers.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={loadShipments} variant="outline" size="icon" className="border-white/20 text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white/10 border-white/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-white">{shipments.length}</div>
            <div className="text-sm text-slate-400">Total Shipments</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/20 border-blue-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{activeShipments.length}</div>
            <div className="text-sm text-blue-300">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/20 border-green-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {shipments.filter(s => s.status === 'delivered').length}
            </div>
            <div className="text-sm text-green-300">Delivered</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/20 border-yellow-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">
              {shipments.filter(s => s.status === 'out_for_delivery').length}
            </div>
            <div className="text-sm text-yellow-300">Out for Delivery</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/20 border-red-500/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400">
              {shipments.filter(s => s.status === 'exception').length}
            </div>
            <div className="text-sm text-red-300">Exceptions</div>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Map className="w-5 h-5" />
            Live Shipment Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[400px] flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
            </div>
          ) : (
            <div ref={mapRef} className="h-[400px] rounded-lg overflow-hidden">
              <WorldMap />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shipments List */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Active Shipments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredShipments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No shipments found</p>
              </div>
            ) : (
              filteredShipments.map(shipment => (
                <div
                  key={shipment.id}
                  onClick={() => handleShipmentClick(shipment)}
                  className="bg-white/5 rounded-lg p-4 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                        {getCarrierIcon(shipment.carrier)}
                      </div>
                      <div>
                        <div className="font-medium text-white">{shipment.tracking_number}</div>
                        <div className="text-sm text-slate-400">{shipment.carrier}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusBadgeClass(shipment.status)}>
                        {shipment.status.replace('_', ' ')}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span className="truncate max-w-[40%]">{shipment.origin_address}</span>
                      <span className="truncate max-w-[40%] text-right">{shipment.destination_address}</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${calculateProgress(shipment)}%`,
                          backgroundColor: getStatusColor(shipment.status)
                        }}
                      />
                    </div>
                  </div>
                  
                  {shipment.estimated_delivery && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      ETA: {new Date(shipment.estimated_delivery).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shipment Details Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="bg-slate-800 border-white/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-[#D4AF37]" />
              Shipment Details
            </DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Tracking Number</div>
                  <div className="text-white font-medium">{selectedShipment.tracking_number}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Carrier</div>
                  <div className="text-white font-medium flex items-center gap-2">
                    {getCarrierIcon(selectedShipment.carrier)}
                    {selectedShipment.carrier}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Status</div>
                  <Badge className={getStatusBadgeClass(selectedShipment.status)}>
                    {selectedShipment.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Estimated Delivery</div>
                  <div className="text-white">
                    {selectedShipment.estimated_delivery 
                      ? new Date(selectedShipment.estimated_delivery).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4">
                <div className="text-sm text-slate-400 mb-2">Route</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-green-400">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Origin</span>
                    </div>
                    <div className="text-white text-sm mt-1">{selectedShipment.origin_address}</div>
                  </div>
                  <Navigation className="w-6 h-6 text-[#D4AF37]" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-red-400">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">Destination</span>
                    </div>
                    <div className="text-white text-sm mt-1">{selectedShipment.destination_address}</div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="border-t border-white/10 pt-4">
                <div className="text-sm text-slate-400 mb-3">Tracking History</div>
                <div className="space-y-3">
                  {shipmentEvents.length === 0 ? (
                    <div className="text-slate-400 text-sm">No tracking events yet</div>
                  ) : (
                    shipmentEvents.map((event, index) => (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-[#D4AF37]' : 'bg-white/30'}`} />
                          {index < shipmentEvents.length - 1 && (
                            <div className="w-0.5 h-full bg-white/20 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="text-white text-sm">{event.description}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {event.location} • {new Date(event.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
