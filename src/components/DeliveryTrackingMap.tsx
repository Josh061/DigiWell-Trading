import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Truck, MapPin, Clock, Phone, User, Navigation, RefreshCw, Loader2, Route } from 'lucide-react';

interface DeliveryTrackingMapProps {
  order: {
    id: string;
    order_number: string;
    delivery_address: string;
    delivery_coordinates?: any;
    delivery_date?: string;
    status: string;
    delivery_status: string;
    shipped_at?: string | null;
  };
}

interface Coordinates {
  lat: number;
  lng: number;
}

// Simulated warehouse locations
const WAREHOUSES: Record<string, Coordinates> = {
  default: { lat: 6.5244, lng: 3.3792 }, // Lagos
  us: { lat: 29.7604, lng: -95.3698 }, // Houston
  uk: { lat: 51.5074, lng: -0.1278 }, // London
  uae: { lat: 25.2048, lng: 55.2708 }, // Dubai
};

function getWarehouseForAddress(address: string): Coordinates {
  const lower = (address || '').toLowerCase();
  if (lower.includes('houston') || lower.includes('texas') || lower.includes('us') || lower.includes('america')) return WAREHOUSES.us;
  if (lower.includes('london') || lower.includes('uk') || lower.includes('england')) return WAREHOUSES.uk;
  if (lower.includes('dubai') || lower.includes('uae') || lower.includes('abu dhabi')) return WAREHOUSES.uae;
  return WAREHOUSES.default;
}

function getDestinationCoords(address: string): Coordinates {
  const lower = (address || '').toLowerCase();
  if (lower.includes('abuja')) return { lat: 9.0579, lng: 7.4951 };
  if (lower.includes('port harcourt')) return { lat: 4.8156, lng: 7.0498 };
  if (lower.includes('warri')) return { lat: 5.5167, lng: 5.7500 };
  if (lower.includes('kaduna')) return { lat: 10.5105, lng: 7.4165 };
  if (lower.includes('kano')) return { lat: 12.0022, lng: 8.5920 };
  if (lower.includes('new york')) return { lat: 40.7128, lng: -74.0060 };
  if (lower.includes('dallas')) return { lat: 32.7767, lng: -96.7970 };
  if (lower.includes('chicago')) return { lat: 41.8781, lng: -87.6298 };
  if (lower.includes('london')) return { lat: 51.5074, lng: -0.1278 };
  if (lower.includes('dubai')) return { lat: 25.2048, lng: 55.2708 };
  // Default: slightly offset from Lagos
  return { lat: 6.45 + Math.random() * 0.5, lng: 3.35 + Math.random() * 0.3 };
}

function interpolatePosition(start: Coordinates, end: Coordinates, progress: number): Coordinates {
  return {
    lat: start.lat + (end.lat - start.lat) * progress,
    lng: start.lng + (end.lng - start.lng) * progress,
  };
}

function calculateDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatETA(distanceKm: number): string {
  const avgSpeed = 60; // km/h
  const hours = distanceKm / avgSpeed;
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${Math.round(hours)} hrs`;
  return `${Math.round(hours / 24)} days ${Math.round(hours % 24)} hrs`;
}

const driverInfo = {
  name: 'Emeka Okafor',
  phone: '+234 801 234 5678',
  vehicle: 'Tanker Truck #DW-4521',
  license: 'DW-PIL-2026-0087',
};

export default function DeliveryTrackingMap({ order }: DeliveryTrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const routeRef = useRef<any>(null);
  const [truckPosition, setTruckPosition] = useState<Coordinates | null>(null);
  const [progress, setProgress] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [totalDistance, setTotalDistance] = useState(0);
  const [eta, setEta] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const pollIntervalRef = useRef<any>(null);

  const warehouse = getWarehouseForAddress(order.delivery_address);
  const destination = getDestinationCoords(order.delivery_address);

  // Calculate progress based on shipped time
  const calculateProgress = () => {
    if (!order.shipped_at) return 0.05;
    const shippedTime = new Date(order.shipped_at).getTime();
    const now = Date.now();
    const elapsed = now - shippedTime;
    const estimatedDuration = 3 * 24 * 60 * 60 * 1000; // 3 days
    return Math.min(Math.max(elapsed / estimatedDuration, 0.05), 0.95);
  };

  const updateTruckPosition = () => {
    const currentProgress = calculateProgress();
    setProgress(currentProgress);
    
    const pos = interpolatePosition(warehouse, destination, currentProgress);
    // Add slight random offset to simulate real movement
    pos.lat += (Math.random() - 0.5) * 0.005;
    pos.lng += (Math.random() - 0.5) * 0.005;
    setTruckPosition(pos);

    const total = calculateDistance(warehouse, destination);
    const remaining = total * (1 - currentProgress);
    setTotalDistance(Math.round(total));
    setDistanceRemaining(Math.round(remaining));
    setEta(formatETA(remaining));
    setLastUpdate(new Date());
  };

  // Poll delivery_coordinates from orders table
  const pollCoordinates = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('delivery_coordinates')
        .eq('id', order.id)
        .single();

      if (data?.delivery_coordinates) {
        const coords = typeof data.delivery_coordinates === 'string'
          ? JSON.parse(data.delivery_coordinates)
          : data.delivery_coordinates;
        if (coords.lat && coords.lng) {
          setTruckPosition({ lat: coords.lat, lng: coords.lng });
          const remaining = calculateDistance(coords, destination);
          setDistanceRemaining(Math.round(remaining));
          setEta(formatETA(remaining));
          setLastUpdate(new Date());
          return;
        }
      }
    } catch (e) {
      // Fallback to simulated position
    }
    updateTruckPosition();
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current) return;
    
    let cleanup = false;

    const initMap = async () => {
      try {
        const L = await import('leaflet');
        
        // Import CSS
        if (!document.getElementById('leaflet-css')) {
          const link = document.createElement('link');
          link.id = 'leaflet-css';
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (cleanup || !mapRef.current) return;

        // Fix default icon paths
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const center: [number, number] = [
          (warehouse.lat + destination.lat) / 2,
          (warehouse.lng + destination.lng) / 2,
        ];

        const map = L.map(mapRef.current, {
          center,
          zoom: 6,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map);

        // Warehouse marker
        const warehouseIcon = L.divIcon({
          html: `<div style="background:#D4AF37;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        L.marker([warehouse.lat, warehouse.lng], { icon: warehouseIcon })
          .addTo(map)
          .bindPopup('<b>Digiwell Warehouse</b><br/>Dispatch Origin');

        // Destination marker
        const destIcon = L.divIcon({
          html: `<div style="background:#22c55e;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        L.marker([destination.lat, destination.lng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<b>Delivery Destination</b><br/>${order.delivery_address}`);

        // Route line
        const routeLine = L.polyline(
          [[warehouse.lat, warehouse.lng], [destination.lat, destination.lng]],
          { color: '#D4AF37', weight: 3, opacity: 0.6, dashArray: '10, 10' }
        ).addTo(map);
        routeRef.current = routeLine;

        // Truck marker
        const truckIcon = L.divIcon({
          html: `<div style="background:#3b82f6;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 2px 12px rgba(59,130,246,0.5);animation:pulse 2s infinite;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 5v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          </div>`,
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const initialPos = interpolatePosition(warehouse, destination, calculateProgress());
        const truckMarker = L.marker([initialPos.lat, initialPos.lng], { icon: truckIcon })
          .addTo(map)
          .bindPopup(`<b>${driverInfo.vehicle}</b><br/>Driver: ${driverInfo.name}`);

        markerRef.current = truckMarker;
        mapInstanceRef.current = map;

        // Fit bounds
        map.fitBounds([
          [warehouse.lat, warehouse.lng],
          [destination.lat, destination.lng],
        ], { padding: [50, 50] });

        setLoading(false);
        updateTruckPosition();
      } catch (e) {
        console.error('Map init error:', e);
        setLoading(false);
      }
    };

    initMap();

    return () => {
      cleanup = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update truck marker position
  useEffect(() => {
    if (truckPosition && markerRef.current) {
      markerRef.current.setLatLng([truckPosition.lat, truckPosition.lng]);
    }
  }, [truckPosition]);

  // Poll every 30 seconds
  useEffect(() => {
    pollCoordinates();
    pollIntervalRef.current = setInterval(pollCoordinates, 30000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [order.id]);

  // Add CSS animation for pulse
  useEffect(() => {
    if (!document.getElementById('truck-pulse-css')) {
      const style = document.createElement('style');
      style.id = 'truck-pulse-css';
      style.textContent = `@keyframes pulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.1);opacity:0.8}}`;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-white/20">
        {loading && (
          <div className="absolute inset-0 z-10 bg-slate-800/80 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin mx-auto mb-2" />
              <p className="text-white text-sm">Loading delivery map...</p>
            </div>
          </div>
        )}
        <div ref={mapRef} style={{ height: '350px', width: '100%' }} className="z-0" />
      </div>

      {/* Delivery Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-3 text-center">
            <Route className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{distanceRemaining} km</p>
            <p className="text-xs text-slate-400">Distance Remaining</p>
          </CardContent>
        </Card>
        <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
          <CardContent className="p-3 text-center">
            <Clock className="w-5 h-5 text-[#D4AF37] mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{eta || 'Calculating...'}</p>
            <p className="text-xs text-slate-400">Estimated Arrival</p>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-3 text-center">
            <Navigation className="w-5 h-5 text-green-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{Math.round(progress * 100)}%</p>
            <p className="text-xs text-slate-400">Journey Complete</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/30">
          <CardContent className="p-3 text-center">
            <MapPin className="w-5 h-5 text-purple-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-white">{totalDistance} km</p>
            <p className="text-xs text-slate-400">Total Distance</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="bg-slate-700/30 rounded-xl p-4">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Warehouse</span>
          <span>Destination</span>
        </div>
        <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#D4AF37] to-blue-500 rounded-full transition-all duration-1000"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg transition-all duration-1000"
            style={{ left: `calc(${progress * 100}% - 10px)` }}
          />
        </div>
      </div>

      {/* Driver Info */}
      <Card className="bg-slate-700/30 border-white/10">
        <CardContent className="p-4">
          <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#D4AF37]" />
            Driver & Vehicle Information
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{driverInfo.name}</p>
                <p className="text-slate-400 text-xs">Certified Pilot</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">{driverInfo.phone}</p>
                <Button variant="ghost" size="sm" className="h-5 px-2 text-[#00D4FF] text-xs">
                  Call Driver
                </Button>
              </div>
            </div>
            <div>
              <p className="text-slate-400 text-xs">Vehicle</p>
              <p className="text-white text-sm">{driverInfo.vehicle}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs">License</p>
              <p className="text-white text-sm font-mono">{driverInfo.license}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Update */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={pollCoordinates}
          className="text-[#00D4FF] hover:text-[#00D4FF]/80 h-6 text-xs"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
