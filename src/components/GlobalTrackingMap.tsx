import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Globe, MapPin, Ship, Truck, Plane, Package, Clock, Navigation, RefreshCw,
  Loader2, X, ChevronRight, Anchor, Building, Filter, Fuel, Gem, Calendar,
  ArrowRight, Timer, Hash, User, Phone, Mail, Route, Eye, EyeOff, Layers,
  ZoomIn, ZoomOut, Maximize2, AlertTriangle, CheckCircle, Circle
} from 'lucide-react';

interface Refinery {
  id: string; name: string; location: string; country: string;
  lat: number; lng: number; capacity: string; type: string;
  products: string[]; status: string; quality: string; quality_score: number;
  email: string; owner: string;
}

interface Shipment {
  id: string; order_id: string; tracking_number: string; carrier: string;
  status: string; origin_address: string; origin_lat: number; origin_lng: number;
  destination_address: string; destination_lat: number; destination_lng: number;
  current_lat: number; current_lng: number; estimated_delivery: string;
  product_type?: string; quantity?: number; total_amount?: number;
}

interface FleetDriver {
  id: string; name: string; status: string;
  location: { lat: number; lng: number; heading: number; speed: number; address: string } | null;
  current_route: { id: string; name: string; progress: number } | null;
  vehicle: { type: string; plate: string; capacity: string };
}

// World map SVG paths (simplified continents)
const CONTINENT_PATHS = [
  // North America
  "M 80 80 Q 120 60 180 70 Q 220 80 240 100 Q 250 130 230 160 Q 200 180 160 170 Q 130 160 100 140 Q 80 120 80 80",
  // South America
  "M 160 190 Q 190 180 210 200 Q 220 240 210 280 Q 190 310 170 300 Q 150 270 150 240 Q 150 210 160 190",
  // Europe
  "M 350 70 Q 380 60 420 70 Q 440 90 430 110 Q 410 120 380 115 Q 360 105 350 90 Q 345 80 350 70",
  // Africa
  "M 360 130 Q 400 120 420 140 Q 430 180 420 220 Q 400 260 380 250 Q 360 230 355 200 Q 350 170 355 150 Q 355 140 360 130",
  // Asia
  "M 440 60 Q 520 50 600 70 Q 640 90 650 130 Q 640 160 600 170 Q 550 180 500 160 Q 460 140 440 110 Q 430 80 440 60",
  // Oceania
  "M 560 220 Q 600 210 630 230 Q 640 260 620 280 Q 590 280 570 260 Q 555 240 560 220",
];

export default function GlobalTrackingMap() {
  const [refineries, setRefineries] = useState<Refinery[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [fleetDrivers, setFleetDrivers] = useState<FleetDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'refinery' | 'shipment' | 'driver' | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Route calculation state
  const [calculatedRoute, setCalculatedRoute] = useState<any>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeMode, setRouteMode] = useState<'sea' | 'road' | 'air'>('sea');
  const [animationProgress, setAnimationProgress] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProductType, setFilterProductType] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');

  // Layer visibility
  const [showRefineries, setShowRefineries] = useState(true);
  const [showShipments, setShowShipments] = useState(true);
  const [showFleet, setShowFleet] = useState(true);

  // Map viewport
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 720, h: 360 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Projection helpers
  const projectLng = (lng: number) => ((lng + 180) / 360) * 720;
  const projectLat = (lat: number) => ((90 - lat) / 180) * 360;

  // Load data
  const loadRefineries = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('refinery-database', {
        body: { action: 'list' }
      });
      if (data?.success) setRefineries(data.refineries || []);
    } catch (e) { console.warn('Failed to load refineries:', e); }
  }, []);

  const loadShipments = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_shipments' }
      });
      if (data?.shipments) setShipments(data.shipments);
    } catch (e) { console.warn('Failed to load shipments:', e); }
  }, []);

  const loadFleet = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke('fleet-tracking', {
        body: { action: 'get_all_drivers', include_offline: false }
      });
      if (data?.success) setFleetDrivers(data.drivers || []);
    } catch (e) { console.warn('Failed to load fleet:', e); }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.allSettled([loadRefineries(), loadShipments(), loadFleet()]);
      setLoading(false);
    };
    loadAll();
    const interval = setInterval(() => { loadShipments(); loadFleet(); }, 30000);
    return () => clearInterval(interval);
  }, [loadRefineries, loadShipments, loadFleet]);

  // Animate route polyline
  useEffect(() => {
    if (!calculatedRoute) {
      setAnimationProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setAnimationProgress(p => (p + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [calculatedRoute]);

  // Calculate route when a shipment is selected
  const calculateShipmentRoute = async (shipment: Shipment, mode: 'sea' | 'road' | 'air' = 'sea') => {
    if (!shipment.origin_lat || !shipment.destination_lat) return;
    setCalculatingRoute(true);
    setCalculatedRoute(null);
    try {
      const { data } = await supabase.functions.invoke('route-calculator', {
        body: {
          action: 'calculate_route',
          origin_lat: shipment.origin_lat,
          origin_lng: shipment.origin_lng,
          destination_lat: shipment.destination_lat,
          destination_lng: shipment.destination_lng,
          origin_name: shipment.origin_address || 'Origin',
          destination_name: shipment.destination_address || 'Destination',
          transport_mode: mode,
          include_weather: true,
          departure_time: new Date().toISOString()
        }
      });
      if (data?.success) setCalculatedRoute(data.route);
    } catch (e) {
      console.warn('Route calculation failed:', e);
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Filter shipments
  const filteredShipments = shipments.filter(s => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterProductType !== 'all' && s.product_type !== filterProductType) return false;
    return true;
  });

  // Stats
  const stats = {
    totalRefineries: refineries.length,
    petroleumRefineries: refineries.filter(r => r.type === 'petroleum').length,
    rwaFacilities: refineries.filter(r => r.type === 'rwa').length,
    activeShipments: shipments.filter(s => s.status === 'in_transit' || s.status === 'out_for_delivery').length,
    deliveredShipments: shipments.filter(s => s.status === 'delivered').length,
    pendingShipments: shipments.filter(s => s.status === 'pending').length,
    onlineDrivers: fleetDrivers.filter(d => d.status !== 'offline').length,
    totalDrivers: fleetDrivers.length,
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      delivered: '#22c55e', in_transit: '#3b82f6', out_for_delivery: '#f59e0b',
      pending: '#8b5cf6', exception: '#ef4444', online: '#22c55e',
      on_delivery: '#3b82f6', idle: '#f59e0b', offline: '#64748b',
    };
    return colors[status] || '#64748b';
  };

  const handleItemClick = (item: any, type: 'refinery' | 'shipment' | 'driver') => {
    setSelectedItem(item);
    setSelectedType(type);
    setShowSidebar(true);
    // Auto-calculate route when clicking a shipment
    if (type === 'shipment' && item.origin_lat && item.destination_lat) {
      calculateShipmentRoute(item as Shipment, routeMode);
    } else {
      setCalculatedRoute(null);
    }
  };

  const getEtaCountdown = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const eta = new Date(dateStr).getTime();
    const now = Date.now();
    const diff = eta - now;
    if (diff <= 0) return 'Arrived';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  };




  // Zoom controls
  const zoomIn = () => {
    setViewBox(v => ({
      x: v.x + v.w * 0.1,
      y: v.y + v.h * 0.1,
      w: Math.max(100, v.w * 0.8),
      h: Math.max(50, v.h * 0.8),
    }));
  };
  const zoomOut = () => {
    setViewBox(v => ({
      x: Math.max(0, v.x - v.w * 0.1),
      y: Math.max(0, v.y - v.h * 0.1),
      w: Math.min(720, v.w * 1.2),
      h: Math.min(360, v.h * 1.2),
    }));
  };
  const resetView = () => setViewBox({ x: 0, y: 0, w: 720, h: 360 });

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStart.x) * (viewBox.w / 720);
    const dy = (e.clientY - dragStart.y) * (viewBox.h / 360);
    setViewBox(v => ({ ...v, x: v.x - dx, y: v.y - dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Globe className="w-8 h-8 text-[#00D4FF]" /> Global Order Tracking
          </h2>
          <p className="text-slate-400 mt-1">
            Real-time map of refineries, shipments, and fleet positions worldwide
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          <Select value={filterProductType} onValueChange={setFilterProductType}>
            <SelectTrigger className="w-36 bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="petroleum">Petroleum</SelectItem>
              <SelectItem value="rwa">RWA / Metals</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { loadShipments(); loadFleet(); loadRefineries(); }} variant="outline" size="icon"
            className="border-white/20 text-white">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Refineries', value: stats.totalRefineries, icon: Building, color: 'text-[#D4AF37]', bg: 'bg-[#D4AF37]/20' },
          { label: 'Petroleum', value: stats.petroleumRefineries, icon: Fuel, color: 'text-orange-400', bg: 'bg-orange-500/20' },
          { label: 'RWA', value: stats.rwaFacilities, icon: Gem, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { label: 'In Transit', value: stats.activeShipments, icon: Ship, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Delivered', value: stats.deliveredShipments, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
          { label: 'Pending', value: stats.pendingShipments, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Fleet Online', value: stats.onlineDrivers, icon: Truck, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
          { label: 'Exceptions', value: shipments.filter(s => s.status === 'exception').length, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
        ].map((s, i) => (
          <Card key={i} className="bg-white/5 border-white/10">
            <CardContent className="p-3 flex items-center gap-2">
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-[10px] text-slate-400">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map + Sidebar */}
      <div className="flex gap-4">
        {/* Main Map */}
        <Card className="flex-1 bg-white/5 border-white/10 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#00D4FF]" /> Interactive World Map
              </CardTitle>
              <div className="flex items-center gap-2">
                {/* Layer toggles */}
                <Button size="sm" variant={showRefineries ? 'default' : 'outline'}
                  onClick={() => setShowRefineries(!showRefineries)}
                  className={`h-7 text-xs ${showRefineries ? 'bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/50' : 'text-slate-400 border-white/20'}`}>
                  <Building className="w-3 h-3 mr-1" /> Refineries
                </Button>
                <Button size="sm" variant={showShipments ? 'default' : 'outline'}
                  onClick={() => setShowShipments(!showShipments)}
                  className={`h-7 text-xs ${showShipments ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'text-slate-400 border-white/20'}`}>
                  <Ship className="w-3 h-3 mr-1" /> Shipments
                </Button>
                <Button size="sm" variant={showFleet ? 'default' : 'outline'}
                  onClick={() => setShowFleet(!showFleet)}
                  className={`h-7 text-xs ${showFleet ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : 'text-slate-400 border-white/20'}`}>
                  <Truck className="w-3 h-3 mr-1" /> Fleet
                </Button>
                <div className="border-l border-white/20 pl-2 flex gap-1">
                  <Button size="icon" variant="ghost" onClick={zoomIn} className="h-7 w-7 text-slate-400"><ZoomIn className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={zoomOut} className="h-7 w-7 text-slate-400"><ZoomOut className="w-3.5 h-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={resetView} className="h-7 w-7 text-slate-400"><Maximize2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="h-[500px] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
              </div>
            ) : (
              <div className="relative">
                <svg ref={svgRef}
                  viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
                  className="w-full h-[500px] bg-[#0a1628] cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}>
                  
                  {/* Ocean gradient */}
                  <defs>
                    <radialGradient id="ocean" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0f2847" />
                      <stop offset="100%" stopColor="#0a1628" />
                    </radialGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                      <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <rect x="0" y="0" width="720" height="360" fill="url(#ocean)" />

                  {/* Grid */}
                  {[-60, -30, 0, 30, 60].map(lat => (
                    <line key={`lat-${lat}`} x1="0" y1={projectLat(lat)} x2="720" y2={projectLat(lat)} stroke="#1e3a5f" strokeWidth="0.3" />
                  ))}
                  {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lng => (
                    <line key={`lng-${lng}`} x1={projectLng(lng)} y1="0" x2={projectLng(lng)} y2="360" stroke="#1e3a5f" strokeWidth="0.3" />
                  ))}

                  {/* Continents */}
                  {CONTINENT_PATHS.map((d, i) => (
                    <path key={i} d={d} fill="#1a2d47" stroke="#2a4a6b" strokeWidth="0.5" opacity="0.8" />
                  ))}

                  {/* Shipment Routes */}
                  {showShipments && filteredShipments.map(s => {
                    if (!s.origin_lat || !s.destination_lat) return null;
                    const x1 = projectLng(s.origin_lng);
                    const y1 = projectLat(s.origin_lat);
                    const x2 = projectLng(s.destination_lng);
                    const y2 = projectLat(s.destination_lat);
                    const cx = projectLng(s.current_lng || s.origin_lng);
                    const cy = projectLat(s.current_lat || s.origin_lat);
                    const midX = (x1 + x2) / 2;
                    const midY = Math.min(y1, y2) - 20;
                    const color = getStatusColor(s.status);

                    return (
                      <g key={`route-${s.id}`}>
                        <path d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
                          fill="none" stroke={color} strokeWidth="1.5"
                          strokeDasharray={s.status === 'delivered' ? '0' : '4,4'} opacity="0.5">
                          {s.status === 'in_transit' && (
                            <animate attributeName="stroke-dashoffset" values="0;-8" dur="1s" repeatCount="indefinite" />
                          )}
                        </path>
                        <circle cx={x1} cy={y1} r="3" fill="#22c55e" stroke="#fff" strokeWidth="1" />
                        <circle cx={x2} cy={y2} r="3" fill="#ef4444" stroke="#fff" strokeWidth="1" />
                        {s.status !== 'delivered' && s.current_lat && (
                          <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); handleItemClick(s, 'shipment'); }}>
                            <circle cx={cx} cy={cy} r="8" fill={color} opacity="0.2">
                              <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                            </circle>
                            <circle cx={cx} cy={cy} r="5" fill={color} stroke="#fff" strokeWidth="1.5" />
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* Refinery Markers */}
                  {showRefineries && refineries.map(r => {
                    if (filterProductType !== 'all' && r.type !== filterProductType) return null;
                    const x = projectLng(r.lng);
                    const y = projectLat(r.lat);
                    const color = r.type === 'petroleum' ? '#D4AF37' : '#a855f7';
                    return (
                      <g key={`ref-${r.id}`} className="cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleItemClick(r, 'refinery'); }}>
                        <rect x={x - 5} y={y - 5} width="10" height="10" rx="2" fill={color} stroke="#fff" strokeWidth="1" opacity="0.9" />
                        <rect x={x - 3} y={y - 3} width="6" height="6" rx="1" fill="#fff" opacity="0.3" />
                      </g>
                    );
                  })}

                  {/* Fleet Drivers */}
                  {showFleet && fleetDrivers.map(d => {
                    if (!d.location) return null;
                    const x = projectLng(d.location.lng);
                    const y = projectLat(d.location.lat);
                    const color = getStatusColor(d.status);
                    return (
                      <g key={`drv-${d.id}`} className="cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); handleItemClick(d, 'driver'); }}>
                        <polygon points={`${x},${y - 6} ${x + 4},${y + 3} ${x - 4},${y + 3}`}
                          fill={color} stroke="#fff" strokeWidth="1" />
                        {d.status === 'on_delivery' && (
                          <circle cx={x} cy={y} r="8" fill="none" stroke={color} strokeWidth="0.5" opacity="0.5">
                            <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                      </g>
                    );
                  })}

                  {/* Legend */}
                  <g transform="translate(10, 310)">
                    <rect x="0" y="0" width="180" height="45" rx="4" fill="#0f172a" opacity="0.9" stroke="#334155" strokeWidth="0.5" />
                    <rect x="8" y="8" width="8" height="8" rx="1" fill="#D4AF37" />
                    <text x="20" y="15" fill="#94a3b8" fontSize="7">Petroleum Refinery</text>
                    <rect x="95" y="8" width="8" height="8" rx="1" fill="#a855f7" />
                    <text x="107" y="15" fill="#94a3b8" fontSize="7">RWA Facility</text>
                    <circle cx="12" cy="28" r="4" fill="#3b82f6" />
                    <text x="20" y="31" fill="#94a3b8" fontSize="7">In Transit</text>
                    <polygon points="103,24 107,32 99,32" fill="#22c55e" />
                    <text x="112" y="31" fill="#94a3b8" fontSize="7">Fleet Driver</text>
                  </g>
                </svg>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        {showSidebar && selectedItem && (
          <Card className="w-96 bg-slate-800/95 border-white/20 overflow-y-auto max-h-[600px]">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  {selectedType === 'refinery' && <Building className="w-5 h-5 text-[#D4AF37]" />}
                  {selectedType === 'shipment' && <Ship className="w-5 h-5 text-blue-400" />}
                  {selectedType === 'driver' && <Truck className="w-5 h-5 text-cyan-400" />}
                  {selectedType === 'refinery' ? 'Refinery Details' :
                   selectedType === 'shipment' ? 'Shipment Details' : 'Driver Details'}
                </CardTitle>
                <Button size="icon" variant="ghost" onClick={() => setShowSidebar(false)}
                  className="h-8 w-8 text-slate-400"><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Refinery Details */}
              {selectedType === 'refinery' && (() => {
                const r = selectedItem as Refinery;
                return (
                  <>
                    <div>
                      <h3 className="text-xl font-bold text-white">{r.name}</h3>
                      <p className="text-sm text-slate-400">{r.location}</p>
                      <div className="flex gap-2 mt-2">
                        <Badge className={r.type === 'petroleum' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'}>
                          {r.type === 'petroleum' ? <Fuel className="w-3 h-3 mr-1" /> : <Gem className="w-3 h-3 mr-1" />}
                          {r.type}
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-400">{r.status}</Badge>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Capacity</span><span className="text-white font-medium">{r.capacity}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Quality</span><span className="text-white font-medium">{r.quality}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Score</span>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-slate-700 rounded-full"><div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${r.quality_score}%` }} /></div>
                          <span className="text-[#D4AF37] font-bold text-sm">{r.quality_score}/100</span>
                        </div>
                      </div>
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Owner</span><span className="text-white">{r.owner}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Contact</span><span className="text-[#00D4FF] text-sm">{r.email}</span></div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Products</p>
                      <div className="flex flex-wrap gap-1">
                        {r.products.map(p => <Badge key={p} variant="outline" className="text-xs text-slate-300 border-slate-600">{p}</Badge>)}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Lat: {r.lat.toFixed(4)}</span>
                      <span>Lng: {r.lng.toFixed(4)}</span>
                    </div>
                  </>
                );
              })()}

              {/* Shipment Details */}
              {selectedType === 'shipment' && (() => {
                const s = selectedItem as Shipment;
                return (
                  <>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Hash className="w-4 h-4 text-slate-400" />
                        <span className="text-white font-bold">{s.tracking_number}</span>
                      </div>
                      <Badge className={`${
                        s.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' :
                        s.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                        s.status === 'pending' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>{s.status.replace('_', ' ')}</Badge>
                    </div>

                    {/* ETA Countdown */}
                    {s.estimated_delivery && s.status !== 'delivered' && (
                      <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                        <Timer className="w-6 h-6 text-[#00D4FF] mx-auto mb-1" />
                        <p className="text-2xl font-bold text-white">{getEtaCountdown(s.estimated_delivery)}</p>
                        <p className="text-xs text-slate-400">Estimated Arrival</p>
                        <p className="text-xs text-slate-500 mt-1">{new Date(s.estimated_delivery).toLocaleDateString()}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Carrier</span><span className="text-white">{s.carrier}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Order ID</span><span className="text-white">{s.order_id}</span></div>
                      {s.product_type && <div className="flex justify-between"><span className="text-slate-400 text-sm">Product</span><span className="text-white">{s.product_type}</span></div>}
                      {s.quantity && <div className="flex justify-between"><span className="text-slate-400 text-sm">Quantity</span><span className="text-white">{s.quantity?.toLocaleString()}</span></div>}
                      {s.total_amount && <div className="flex justify-between"><span className="text-slate-400 text-sm">Value</span><span className="text-[#D4AF37] font-bold">${s.total_amount?.toLocaleString()}</span></div>}
                    </div>

                    {/* Route */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 mt-1 shrink-0" />
                        <div><p className="text-xs text-slate-400">Origin</p><p className="text-sm text-white">{s.origin_address}</p></div>
                      </div>
                      <div className="ml-1.5 border-l border-dashed border-slate-600 h-4" />
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500 mt-1 shrink-0" />
                        <div><p className="text-xs text-slate-400">Destination</p><p className="text-sm text-white">{s.destination_address}</p></div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* Driver Details */}
              {selectedType === 'driver' && (() => {
                const d = selectedItem as FleetDriver;
                return (
                  <>
                    <div>
                      <h3 className="text-lg font-bold text-white">{d.name}</h3>
                      <Badge className={`${
                        d.status === 'online' ? 'bg-green-500/20 text-green-400' :
                        d.status === 'on_delivery' ? 'bg-blue-500/20 text-blue-400' :
                        d.status === 'idle' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>{d.status}</Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Vehicle</span><span className="text-white">{d.vehicle.type}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Plate</span><span className="text-white">{d.vehicle.plate}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 text-sm">Capacity</span><span className="text-white">{d.vehicle.capacity}</span></div>
                      {d.location && (
                        <>
                          <div className="flex justify-between"><span className="text-slate-400 text-sm">Speed</span><span className="text-white">{d.location.speed || 0} km/h</span></div>
                          <div className="flex justify-between"><span className="text-slate-400 text-sm">Location</span><span className="text-white text-xs text-right max-w-[180px]">{d.location.address || 'Updating...'}</span></div>
                        </>
                      )}
                    </div>
                    {d.current_route && (
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        <p className="text-sm font-medium text-white mb-2">{d.current_route.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-700 rounded-full">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${d.current_route.progress}%` }} />
                          </div>
                          <span className="text-xs text-blue-400 font-medium">{d.current_route.progress}%</span>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Shipments List */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-[#D4AF37]" /> Active Shipments ({filteredShipments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredShipments.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Ship className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No shipments match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredShipments.slice(0, 12).map(s => (
                <div key={s.id} onClick={() => handleItemClick(s, 'shipment')}
                  className="p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium text-sm">{s.tracking_number}</span>
                    <Badge className={`text-xs ${
                      s.status === 'in_transit' ? 'bg-blue-500/20 text-blue-400' :
                      s.status === 'delivered' ? 'bg-green-500/20 text-green-400' :
                      s.status === 'pending' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>{s.status.replace('_', ' ')}</Badge>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-green-400" />{s.origin_address?.substring(0, 30)}...</div>
                    <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-red-400" />{s.destination_address?.substring(0, 30)}...</div>
                  </div>
                  {s.estimated_delivery && s.status !== 'delivered' && (
                    <div className="mt-2 flex items-center gap-1 text-xs">
                      <Timer className="w-3 h-3 text-[#00D4FF]" />
                      <span className="text-[#00D4FF] font-medium">ETA: {getEtaCountdown(s.estimated_delivery)}</span>
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{s.carrier}</span>
                    {s.total_amount && <span className="text-[#D4AF37]">${s.total_amount.toLocaleString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refinery Quick List */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-[#D4AF37]" /> Refinery Network ({refineries.length} Facilities)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {refineries.filter(r => filterProductType === 'all' || r.type === filterProductType).slice(0, 9).map(r => (
              <div key={r.id} onClick={() => handleItemClick(r, 'refinery')}
                className="p-3 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white font-medium text-sm truncate max-w-[200px]">{r.name}</span>
                  <Badge className={`text-[10px] ${r.type === 'petroleum' ? 'bg-orange-500/20 text-orange-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    {r.type}
                  </Badge>
                </div>
                <p className="text-xs text-slate-400">{r.location}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-500">{r.capacity}</span>
                  <div className="flex items-center gap-1">
                    <div className="w-12 h-1.5 bg-slate-700 rounded-full">
                      <div className="h-full rounded-full bg-[#D4AF37]" style={{ width: `${r.quality_score}%` }} />
                    </div>
                    <span className="text-[10px] text-[#D4AF37]">{r.quality_score}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
