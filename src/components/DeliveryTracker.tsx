import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
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
  RefreshCw,
  Ship,
  Plane,
  Mail,
  Phone,
  Bell,
  Navigation,
  Calendar,
  Globe,
  Loader2,
  X,
  ChevronRight,
  Map,
  Send,
  Eye,
  Timer,
  Compass,
  Target,
  Route,
  Zap,
  MessageSquare
} from 'lucide-react';

interface TrackingInfo {
  tracking_number: string;
  carrier: string;
  carrier_service: string;
  status: string;
  progress: number;
  remaining_time: {
    days: number;
    hours: number;
    isOverdue: boolean;
  } | null;
  estimated_delivery: string;
  actual_delivery: string | null;
  origin: {
    address: string;
    city: string;
    country: string;
    coordinates: { lat: number; lng: number } | null;
  };
  destination: {
    address: string;
    city: string;
    country: string;
    coordinates: { lat: number; lng: number } | null;
  };
  current_location: {
    address: string;
    city: string;
    country: string;
    coordinates: { lat: number; lng: number } | null;
  };
  events: Array<{
    id: string;
    status: string;
    event_type: string;
    description: string;
    location: string;
    city: string;
    country: string;
    timestamp: string;
    coordinates: { lat: number; lng: number } | null;
  }>;
  tracking_url: string;
  recipient: {
    name: string;
    email: string;
    phone: string;
  };
  sender: {
    name: string;
    email: string;
    phone: string;
  };
}

interface DeliveryTrackerProps {
  trackingNumber?: string;
  orderId?: string;
  onClose?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'text-gray-400', bgColor: 'bg-gray-500', icon: <Clock className="w-4 h-4" /> },
  picked_up: { label: 'Picked Up', color: 'text-blue-400', bgColor: 'bg-blue-500', icon: <Package className="w-4 h-4" /> },
  in_transit: { label: 'In Transit', color: 'text-purple-400', bgColor: 'bg-purple-500', icon: <Truck className="w-4 h-4" /> },
  out_for_delivery: { label: 'Out for Delivery', color: 'text-amber-400', bgColor: 'bg-amber-500', icon: <Navigation className="w-4 h-4" /> },
  delivered: { label: 'Delivered', color: 'text-green-400', bgColor: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> },
  exception: { label: 'Exception', color: 'text-red-400', bgColor: 'bg-red-500', icon: <AlertTriangle className="w-4 h-4" /> },
  returned: { label: 'Returned', color: 'text-red-400', bgColor: 'bg-red-600', icon: <X className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'text-gray-400', bgColor: 'bg-gray-600', icon: <X className="w-4 h-4" /> }
};

const carrierConfig: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  DHL: { name: 'DHL Express', icon: <Plane className="w-5 h-5" />, color: 'bg-yellow-500' },
  FedEx: { name: 'FedEx', icon: <Truck className="w-5 h-5" />, color: 'bg-purple-600' },
  Maersk: { name: 'Maersk Line', icon: <Ship className="w-5 h-5" />, color: 'bg-blue-600' },
  UPS: { name: 'UPS', icon: <Package className="w-5 h-5" />, color: 'bg-amber-700' },
  USPS: { name: 'USPS', icon: <Mail className="w-5 h-5" />, color: 'bg-blue-800' }
};

export default function DeliveryTracker({ trackingNumber: initialTrackingNumber, orderId, onClose }: DeliveryTrackerProps) {
  const { toast } = useToast();
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber || '');
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const loadTracking = useCallback(async (trackingNum?: string) => {
    const numToTrack = trackingNum || trackingNumber;
    if (!numToTrack) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'track_shipment', tracking_number: numToTrack }
      });

      if (error) throw error;
      if (data.success) {
        setTracking(data.tracking);
      } else {
        throw new Error(data.error || 'Tracking not found');
      }
    } catch (error: any) {
      toast({
        title: 'Tracking Error',
        description: error.message || 'Failed to load tracking information',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [trackingNumber, toast]);

  useEffect(() => {
    if (initialTrackingNumber) {
      loadTracking(initialTrackingNumber);
    }
  }, [initialTrackingNumber, loadTracking]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadTracking();
  };

  const sendNotification = async (type: 'email' | 'sms' | 'both') => {
    if (!tracking) return;

    setSendingNotification(true);
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: {
          action: 'send_notification',
          shipment_id: tracking.tracking_number,
          notification_type: type
        }
      });

      if (error) throw error;

      toast({
        title: 'Notification Sent',
        description: `${type === 'both' ? 'Email and SMS' : type.toUpperCase()} notification sent successfully`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send notification',
        variant: 'destructive'
      });
    } finally {
      setSendingNotification(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
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
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderProgressBar = () => {
    if (!tracking) return null;
    const progress = tracking.progress || 0;
    const status = tracking.status;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Delivery Progress</span>
          <span className="text-white font-semibold">{progress}%</span>
        </div>
        <div className="relative">
          <Progress value={progress} className="h-3 bg-slate-700" />
          <div 
            className="absolute top-0 h-3 rounded-full bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Origin</span>
          <span>In Transit</span>
          <span>Destination</span>
        </div>
      </div>
    );
  };

  const renderRemainingTime = () => {
    if (!tracking?.remaining_time) return null;
    const { days, hours, isOverdue } = tracking.remaining_time;

    if (tracking.status === 'delivered') {
      return (
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-4 text-center">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-green-400 font-semibold">Delivered</p>
          <p className="text-slate-400 text-sm">{formatDateTime(tracking.actual_delivery || '')}</p>
        </div>
      );
    }

    if (isOverdue) {
      return (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-semibold">Delivery Overdue</p>
          <p className="text-slate-400 text-sm">Expected: {formatDate(tracking.estimated_delivery)}</p>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4 text-center">
        <Timer className="w-8 h-8 text-blue-400 mx-auto mb-2" />
        <p className="text-slate-400 text-sm">Estimated arrival in</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <div>
            <span className="text-3xl font-bold text-white">{days}</span>
            <span className="text-slate-400 text-sm ml-1">days</span>
          </div>
          <div>
            <span className="text-3xl font-bold text-white">{hours}</span>
            <span className="text-slate-400 text-sm ml-1">hours</span>
          </div>
        </div>
        <p className="text-slate-500 text-xs mt-2">
          Expected: {formatDate(tracking.estimated_delivery)}
        </p>
      </div>
    );
  };

  const renderRouteVisualization = () => {
    if (!tracking) return null;

    const statusSteps = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
    const currentIndex = statusSteps.indexOf(tracking.status);

    return (
      <div className="relative">
        {/* Route Line */}
        <div className="absolute top-6 left-0 right-0 h-1 bg-slate-700 rounded-full">
          <div 
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-500"
            style={{ width: `${tracking.progress}%` }}
          />
        </div>

        {/* Status Points */}
        <div className="flex justify-between relative z-10">
          {statusSteps.map((step, index) => {
            const config = statusConfig[step];
            const isCompleted = index <= currentIndex && tracking.status !== 'cancelled';
            const isCurrent = step === tracking.status;

            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted ? `${config.bgColor} text-white shadow-lg` :
                  isCurrent ? 'bg-[#D4AF37] text-slate-900 shadow-lg animate-pulse' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {config.icon}
                </div>
                <span className={`text-xs mt-2 font-medium ${isCompleted || isCurrent ? 'text-white' : 'text-slate-500'}`}>
                  {config.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderGoogleMap = () => {
    if (!tracking) return null;

    const { origin, destination, current_location } = tracking;
    const hasCoordinates = origin.coordinates && destination.coordinates;

    if (!hasCoordinates) {
      return (
        <div className="h-96 bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-xl flex items-center justify-center">
          <div className="text-center">
            <Globe className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400">Map coordinates not available</p>
          </div>
        </div>
      );
    }

    // Create Google Maps embed URL
    const originStr = `${origin.coordinates.lat},${origin.coordinates.lng}`;
    const destStr = `${destination.coordinates.lat},${destination.coordinates.lng}`;
    const currentStr = current_location.coordinates 
      ? `${current_location.coordinates.lat},${current_location.coordinates.lng}`
      : originStr;

    // Use Google Maps Static API via embed
    const mapUrl = `https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${originStr}&destination=${destStr}&mode=driving`;

    return (
      <div className="space-y-4">
        {/* Map Container */}
        <div className="relative h-96 bg-slate-800 rounded-xl overflow-hidden">
          {/* Fallback visualization when iframe doesn't work */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-green-900/50">
            {/* Origin Marker */}
            <div className="absolute top-1/4 left-1/4 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative group">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg animate-pulse">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 px-3 py-1 rounded-lg text-xs shadow-lg border border-slate-700">
                  <span className="text-green-400 font-semibold">Origin:</span>
                  <span className="text-white ml-1">{origin.city}</span>
                </div>
              </div>
            </div>

            {/* Current Location Marker */}
            {current_location.coordinates && tracking.status !== 'delivered' && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <div className="w-12 h-12 bg-[#D4AF37] rounded-full flex items-center justify-center text-slate-900 shadow-lg">
                    <Navigation className="w-6 h-6 animate-bounce" />
                  </div>
                  <div className="absolute w-20 h-20 -top-4 -left-4 border-4 border-[#D4AF37]/30 rounded-full animate-ping" />
                  <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 px-3 py-1 rounded-lg text-xs shadow-lg border border-[#D4AF37]/50">
                    <span className="text-[#D4AF37] font-semibold">Current:</span>
                    <span className="text-white ml-1">{current_location.city || 'In Transit'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Destination Marker */}
            <div className="absolute bottom-1/4 right-1/4 transform translate-x-1/2 translate-y-1/2">
              <div className="relative">
                <div className={`w-10 h-10 ${tracking.status === 'delivered' ? 'bg-blue-500' : 'bg-slate-500'} rounded-full flex items-center justify-center text-white shadow-lg`}>
                  <Target className="w-5 h-5" />
                </div>
                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 px-3 py-1 rounded-lg text-xs shadow-lg border border-slate-700">
                  <span className="text-blue-400 font-semibold">Destination:</span>
                  <span className="text-white ml-1">{destination.city}</span>
                </div>
              </div>
            </div>

            {/* Route Path */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="50%" stopColor="#D4AF37" />
                  <stop offset="100%" stopColor="#3B82F6" />
                </linearGradient>
              </defs>
              <path
                d="M 25% 25% Q 50% 35%, 50% 50% Q 50% 65%, 75% 75%"
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeDasharray="10,5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Map Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-slate-300">Origin</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-[#D4AF37] rounded-full" />
                <span className="text-slate-300">Current</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-slate-300">Destination</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-green-500/10 border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-xs font-semibold">ORIGIN</span>
              </div>
              <p className="text-white font-medium">{origin.city}</p>
              <p className="text-slate-400 text-sm">{origin.country}</p>
              {origin.coordinates && (
                <p className="text-slate-500 text-xs mt-1">
                  {origin.coordinates.lat.toFixed(4)}, {origin.coordinates.lng.toFixed(4)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#D4AF37]/10 border-[#D4AF37]/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-[#D4AF37] text-xs font-semibold">CURRENT</span>
              </div>
              <p className="text-white font-medium">{current_location.city || 'In Transit'}</p>
              <p className="text-slate-400 text-sm">{current_location.country || '-'}</p>
              {current_location.coordinates && (
                <p className="text-slate-500 text-xs mt-1">
                  {current_location.coordinates.lat.toFixed(4)}, {current_location.coordinates.lng.toFixed(4)}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-500/10 border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 text-xs font-semibold">DESTINATION</span>
              </div>
              <p className="text-white font-medium">{destination.city}</p>
              <p className="text-slate-400 text-sm">{destination.country}</p>
              {destination.coordinates && (
                <p className="text-slate-500 text-xs mt-1">
                  {destination.coordinates.lat.toFixed(4)}, {destination.coordinates.lng.toFixed(4)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    if (!tracking?.events || tracking.events.length === 0) {
      return (
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400">No tracking events yet</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {tracking.events.map((event, index) => {
          const config = statusConfig[event.status] || statusConfig.pending;
          const isFirst = index === 0;

          return (
            <div key={event.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                  isFirst ? config.bgColor + ' shadow-lg' : 'bg-slate-700'
                }`}>
                  {config.icon}
                </div>
                {index < tracking.events.length - 1 && (
                  <div className="w-0.5 flex-1 bg-slate-700 my-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold ${isFirst ? 'text-white' : 'text-slate-300'}`}>
                      {config.label}
                    </p>
                    <p className="text-slate-400 text-sm mt-1">{event.description}</p>
                  </div>
                  <span className="text-slate-500 text-xs whitespace-nowrap">
                    {formatDateTime(event.timestamp)}
                  </span>
                </div>
                {event.location && (
                  <div className="flex items-center gap-1 mt-2 text-slate-500 text-sm">
                    <MapPin className="w-3 h-3" />
                    {event.location}{event.city ? `, ${event.city}` : ''}{event.country ? `, ${event.country}` : ''}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
              <Compass className="w-8 h-8 text-white" />
            </div>
            Delivery Tracker
          </h1>
          <p className="text-slate-400 mt-1">
            Real-time shipment tracking with GPS location updates
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        )}
      </div>

      {/* Search Form */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Enter tracking number..."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="pl-10 bg-slate-800/50 border-slate-600 text-white h-12 text-lg"
              />
            </div>
            <Button 
              type="submit" 
              disabled={loading || !trackingNumber}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 h-12 px-8"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5 mr-2" />}
              Track
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tracking Results */}
      {tracking && (
        <div className="space-y-6">
          {/* Status Header */}
          <Card className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-md border-slate-700">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                {/* Carrier & Tracking */}
                <div className="flex items-center gap-4">
                  <div className={`p-4 ${carrierConfig[tracking.carrier]?.color || 'bg-slate-600'} rounded-xl text-white`}>
                    {carrierConfig[tracking.carrier]?.icon || <Package className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-slate-400 text-sm">Tracking Number</p>
                    <p className="text-white font-mono text-xl font-bold">{tracking.tracking_number}</p>
                    <p className="text-slate-500 text-sm">{carrierConfig[tracking.carrier]?.name || tracking.carrier} - {tracking.carrier_service || 'Standard'}</p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-4">
                  <Badge className={`${statusConfig[tracking.status]?.bgColor || 'bg-slate-500'} text-white px-4 py-2 text-lg`}>
                    {statusConfig[tracking.status]?.icon}
                    <span className="ml-2">{statusConfig[tracking.status]?.label || tracking.status}</span>
                  </Badge>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => loadTracking()} className="border-slate-600 text-slate-300">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  {tracking.tracking_url && (
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(tracking.tracking_url, '_blank')}
                      className="border-cyan-500/50 text-cyan-400"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Track on {tracking.carrier}
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                {renderProgressBar()}
              </div>
            </CardContent>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-800/50 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-slate-900">
                <Eye className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="map" className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
                <Map className="w-4 h-4 mr-2" />
                Map View
              </TabsTrigger>
              <TabsTrigger value="timeline" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <Route className="w-4 h-4 mr-2" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="notifications" className="data-[state=active]:bg-green-500 data-[state=active]:text-white">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Remaining Time */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Timer className="w-5 h-5 text-[#D4AF37]" />
                      Delivery Estimate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderRemainingTime()}
                  </CardContent>
                </Card>

                {/* Route Visualization */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Route className="w-5 h-5 text-cyan-400" />
                      Delivery Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {renderRouteVisualization()}
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-slate-300">Sender</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-white font-medium">{tracking.sender.name || '-'}</p>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {tracking.sender.email || '-'}
                    </p>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {tracking.sender.phone || '-'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-sm text-slate-300">Recipient</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-white font-medium">{tracking.recipient.name || '-'}</p>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {tracking.recipient.email || '-'}
                    </p>
                    <p className="text-slate-400 text-sm flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {tracking.recipient.phone || '-'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Map className="w-5 h-5 text-cyan-400" />
                    Shipment Location Map
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Real-time GPS tracking of your shipment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderGoogleMap()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="timeline" className="mt-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Route className="w-5 h-5 text-purple-400" />
                    Tracking History
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Complete timeline of shipment events
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {renderTimeline()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-green-400" />
                    Send Notifications
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Send delivery updates via email or SMS
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                      onClick={() => sendNotification('email')}
                      disabled={sendingNotification || !tracking.recipient.email}
                      className="bg-blue-600 hover:bg-blue-700 h-16 flex-col"
                    >
                      {sendingNotification ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-6 h-6 mb-1" />}
                      <span>Send Email</span>
                    </Button>
                    <Button
                      onClick={() => sendNotification('sms')}
                      disabled={sendingNotification || !tracking.recipient.phone}
                      className="bg-green-600 hover:bg-green-700 h-16 flex-col"
                    >
                      {sendingNotification ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-6 h-6 mb-1" />}
                      <span>Send SMS</span>
                    </Button>
                    <Button
                      onClick={() => sendNotification('both')}
                      disabled={sendingNotification || (!tracking.recipient.email && !tracking.recipient.phone)}
                      className="bg-purple-600 hover:bg-purple-700 h-16 flex-col"
                    >
                      {sendingNotification ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-6 h-6 mb-1" />}
                      <span>Send Both</span>
                    </Button>
                  </div>

                  <div className="bg-slate-900/50 rounded-lg p-4 mt-4">
                    <h4 className="text-white font-medium mb-2">Notification Recipients</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Email</p>
                        <p className="text-slate-300">{tracking.recipient.email || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Phone</p>
                        <p className="text-slate-300">{tracking.recipient.phone || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <Bell className="w-5 h-5 text-blue-400 mt-0.5" />
                      <div>
                        <p className="text-blue-400 font-medium">Automatic Notifications</p>
                        <p className="text-slate-400 text-sm mt-1">
                          Notifications are automatically sent when shipment status changes. 
                          Use manual notifications for custom updates.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Empty State */}
      {!tracking && !loading && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-16 text-center">
            <Package className="w-16 h-16 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Track Your Shipment</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Enter your tracking number above to get real-time updates on your delivery, 
              including GPS location, estimated arrival time, and notification options.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
