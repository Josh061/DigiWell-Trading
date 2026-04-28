import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Navigation,
  MapPin,
  Truck,
  Clock,
  Phone,
  CheckCircle,
  AlertTriangle,
  Camera,
  PenTool,
  MessageSquare,
  Send,
  Fuel,
  Package,
  User,
  Play,
  Pause,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Map,
  Compass,
  Battery,
  Wifi,
  WifiOff,
  Target,
  Route,
  FileText,
  AlertCircle,
  Timer,
  ExternalLink,
  RotateCcw,
  Upload,
  Check,
  XCircle,
  Home,
  Settings,
  Bell,
  Menu
} from 'lucide-react';

interface DeliveryRoute {
  id: string;
  route_name: string;
  route_date: string;
  driver_name?: string;
  vehicle_type: string;
  status: string;
  total_distance_km?: number;
  total_duration_minutes?: number;
  total_deliveries: number;
  start_location_address?: string;
  current_stop_id?: string;
}

interface RouteStop {
  id: string;
  route_id: string;
  stop_order: number;
  customer_name: string;
  customer_phone?: string;
  address: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  product_type?: string;
  quantity?: number;
  unit?: string;
  time_window_start?: string;
  time_window_end?: string;
  estimated_arrival?: string;
  estimated_duration_minutes: number;
  status: string;
  distance_from_previous_km?: number;
  duration_from_previous_minutes?: number;
  special_instructions?: string;
  signature_required: boolean;
}

interface DispatchMessage {
  id: string;
  sender_type: string;
  sender_name?: string;
  message: string;
  message_type: string;
  created_at: string;
  is_read: boolean;
}

const DriverMobileInterface: React.FC = () => {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Driver info (would come from auth in real app)
  const [driverId] = useState('driver_' + Math.random().toString(36).substr(2, 9));
  const [driverName] = useState('John Driver');
  
  // State
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [activeRoute, setActiveRoute] = useState<DeliveryRoute | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [currentStop, setCurrentStop] = useState<RouteStop | null>(null);
  const [messages, setMessages] = useState<DispatchMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('route');
  const [isOnline, setIsOnline] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(85);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showStopDetails, setShowStopDetails] = useState(false);
  const [expandedStop, setExpandedStop] = useState<string | null>(null);
  
  // Delivery confirmation state
  const [confirmationStatus, setConfirmationStatus] = useState('completed');
  const [quantityDelivered, setQuantityDelivered] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [deliveryPhotos, setDeliveryPhotos] = useState<string[]>([]);
  
  // Issue report state
  const [issueType, setIssueType] = useState('');
  const [issueSeverity, setIssueSeverity] = useState('medium');
  const [issueTitle, setIssueTitle] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [estimatedDelay, setEstimatedDelay] = useState('');
  
  // Chat state
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    loadRoutes();
    startLocationTracking();
    
    // Simulate battery updates
    const batteryInterval = setInterval(() => {
      setBatteryLevel(prev => Math.max(10, prev - Math.random() * 2));
    }, 60000);
    
    return () => {
      clearInterval(batteryInterval);
    };
  }, []);

  useEffect(() => {
    if (activeRoute) {
      loadRouteDetails(activeRoute.id);
      loadMessages();
      
      // Poll for new messages
      const messageInterval = setInterval(loadMessages, 10000);
      return () => clearInterval(messageInterval);
    }
  }, [activeRoute?.id]);

  useEffect(() => {
    if (showConfirmModal && canvasRef.current) {
      initializeCanvas();
    }
  }, [showConfirmModal]);

  const startLocationTracking = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentLocation({ lat: latitude, lng: longitude });
          setIsOnline(true);
          
          if (isTracking && activeRoute) {
            updateDriverLocation(latitude, longitude);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          // Use default location for demo
          setCurrentLocation({ lat: 6.5244, lng: 3.3792 });
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    } else {
      // Default location for demo
      setCurrentLocation({ lat: 6.5244, lng: 3.3792 });
    }
  };

  const updateDriverLocation = async (lat: number, lng: number) => {
    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'update_driver_location',
          driver_id: driverId,
          driver_name: driverName,
          route_id: activeRoute?.id,
          latitude: lat,
          longitude: lng,
          battery_level: Math.round(batteryLevel)
        }
      });
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  };

  const loadRoutes = async () => {
    setLoading(true);
    try {
      // For demo, load all in-progress and optimized routes
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: { action: 'get_routes', limit: 20 }
      });

      if (error) throw error;
      
      const availableRoutes = (data.routes || []).filter(
        (r: DeliveryRoute) => r.status === 'optimized' || r.status === 'in_progress'
      );
      setRoutes(availableRoutes);
      
      // Auto-select first in-progress route
      const inProgress = availableRoutes.find((r: DeliveryRoute) => r.status === 'in_progress');
      if (inProgress) {
        setActiveRoute(inProgress);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load routes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRouteDetails = async (routeId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: { action: 'get_route_for_driver', route_id: routeId, driver_id: driverId }
      });

      if (error) throw error;
      
      setStops(data.stops || []);
      setUnreadMessages(data.unread_messages || 0);
      
      // Find current stop (first pending or arrived)
      const current = data.stops?.find((s: RouteStop) => s.status === 'arrived') ||
                      data.stops?.find((s: RouteStop) => s.status === 'pending');
      setCurrentStop(current || null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load route details',
        variant: 'destructive'
      });
    }
  };

  const loadMessages = async () => {
    if (!activeRoute) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: { action: 'get_dispatch_messages', route_id: activeRoute.id }
      });

      if (error) throw error;
      setMessages(data.messages || []);
      
      const unread = (data.messages || []).filter(
        (m: DispatchMessage) => m.sender_type === 'dispatch' && !m.is_read
      ).length;
      setUnreadMessages(unread);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const startRoute = async () => {
    if (!activeRoute) return;
    
    try {
      await supabase.functions.invoke('route-optimization', {
        body: { action: 'start_route', route_id: activeRoute.id }
      });
      
      setIsTracking(true);
      setActiveRoute({ ...activeRoute, status: 'in_progress' });
      
      toast({
        title: 'Route Started',
        description: 'Location tracking is now active'
      });
      
      loadRouteDetails(activeRoute.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start route',
        variant: 'destructive'
      });
    }
  };

  const arriveAtStop = async (stop: RouteStop) => {
    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'arrive_at_stop',
          stop_id: stop.id,
          route_id: activeRoute?.id,
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng
        }
      });
      
      setCurrentStop({ ...stop, status: 'arrived' });
      loadRouteDetails(activeRoute!.id);
      
      toast({
        title: 'Arrived',
        description: `Arrived at ${stop.customer_name}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark arrival',
        variant: 'destructive'
      });
    }
  };

  const openNavigation = async (stop: RouteStop, app: string = 'google') => {
    if (!stop.latitude || !stop.longitude) {
      toast({
        title: 'Error',
        description: 'Location coordinates not available',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      const { data } = await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'get_navigation_url',
          latitude: stop.latitude,
          longitude: stop.longitude,
          app
        }
      });
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      // Fallback to direct URL
      const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}&travelmode=driving`;
      window.open(url, '_blank');
    }
  };

  const initializeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, canvas.offsetHeight - 20);
    ctx.lineTo(canvas.offsetWidth - 20, canvas.offsetHeight - 20);
    ctx.stroke();

    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawnSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    if (hasDrawnSignature && canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    setHasDrawnSignature(false);
    setSignatureData('');
    initializeCanvas();
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setDeliveryPhotos(prev => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const confirmDelivery = async () => {
    if (!currentStop || !activeRoute) return;
    
    if (currentStop.signature_required && !hasDrawnSignature) {
      toast({
        title: 'Signature Required',
        description: 'Please capture customer signature',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'confirm_delivery',
          stop_id: currentStop.id,
          route_id: activeRoute.id,
          driver_id: driverId,
          driver_name: driverName,
          confirmation_type: 'delivery',
          status: confirmationStatus,
          quantity_delivered: quantityDelivered ? parseFloat(quantityDelivered) : currentStop.quantity,
          quantity_unit: currentStop.unit,
          signature_data: signatureData,
          signature_name: signatureName,
          photo_urls: deliveryPhotos,
          notes: deliveryNotes,
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng
        }
      });

      if (error) throw error;

      toast({
        title: 'Delivery Confirmed',
        description: data.route_completed ? 'Route completed!' : 'Moving to next stop'
      });

      setShowConfirmModal(false);
      resetConfirmationForm();
      
      if (data.next_stop) {
        setCurrentStop(data.next_stop);
      } else {
        setCurrentStop(null);
      }
      
      loadRouteDetails(activeRoute.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm delivery',
        variant: 'destructive'
      });
    }
  };

  const resetConfirmationForm = () => {
    setConfirmationStatus('completed');
    setQuantityDelivered('');
    setSignatureName('');
    setSignatureData('');
    setHasDrawnSignature(false);
    setDeliveryNotes('');
    setDeliveryPhotos([]);
  };

  const reportIssue = async () => {
    if (!issueType || !issueTitle) {
      toast({
        title: 'Error',
        description: 'Please select issue type and provide a title',
        variant: 'destructive'
      });
      return;
    }

    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'report_issue',
          driver_id: driverId,
          driver_name: driverName,
          route_id: activeRoute?.id,
          stop_id: currentStop?.id,
          issue_type: issueType,
          severity: issueSeverity,
          title: issueTitle,
          description: issueDescription,
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng,
          estimated_delay_minutes: estimatedDelay ? parseInt(estimatedDelay) : null
        }
      });

      toast({
        title: 'Issue Reported',
        description: 'Dispatch has been notified'
      });

      setShowIssueModal(false);
      setIssueType('');
      setIssueSeverity('medium');
      setIssueTitle('');
      setIssueDescription('');
      setEstimatedDelay('');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to report issue',
        variant: 'destructive'
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeRoute) return;

    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'send_dispatch_message',
          route_id: activeRoute.id,
          sender_type: 'driver',
          sender_id: driverId,
          sender_name: driverName,
          message: newMessage,
          message_type: 'text',
          latitude: currentLocation?.lat,
          longitude: currentLocation?.lng
        }
      });

      setNewMessage('');
      loadMessages();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message',
        variant: 'destructive'
      });
    }
  };

  const markMessagesRead = async () => {
    if (!activeRoute) return;
    
    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'mark_messages_read',
          route_id: activeRoute.id,
          reader_type: 'driver'
        }
      });
      setUnreadMessages(0);
    } catch (error) {
      console.error('Failed to mark messages read:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'arrived': return 'bg-blue-500';
      case 'pending': return 'bg-gray-400';
      case 'skipped': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getProductIcon = (productType?: string) => {
    switch (productType) {
      case 'diesel': return <Fuel className="h-4 w-4 text-amber-500" />;
      case 'petrol': return <Fuel className="h-4 w-4 text-green-500" />;
      case 'kerosene': return <Fuel className="h-4 w-4 text-blue-500" />;
      default: return <Package className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (minutes?: number) => {
    if (!minutes) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const completedStops = stops.filter(s => s.status === 'completed').length;
  const progress = stops.length > 0 ? (completedStops / stops.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">{driverName}</h1>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                {isOnline ? (
                  <span className="flex items-center gap-1 text-green-400">
                    <Wifi className="h-3 w-3" /> Online
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-400">
                    <WifiOff className="h-3 w-3" /> Offline
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Battery className="h-3 w-3" /> {Math.round(batteryLevel)}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="relative"
              onClick={() => { setShowChatModal(true); markMessagesRead(); }}
            >
              <MessageSquare className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowIssueModal(true)}
            >
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Route Selection (if no active route) */}
      {!activeRoute && (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Available Routes</h2>
          {routes.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-8 text-center">
                <Route className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No routes assigned</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {routes.map(route => (
                <Card 
                  key={route.id}
                  className="bg-gray-800 border-gray-700 cursor-pointer hover:bg-gray-750"
                  onClick={() => setActiveRoute(route)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{route.route_name}</h3>
                        <p className="text-sm text-gray-400">
                          {route.total_deliveries} stops • {route.total_distance_km?.toFixed(1)} km
                        </p>
                      </div>
                      <Badge className={route.status === 'in_progress' ? 'bg-amber-500' : 'bg-blue-500'}>
                        {route.status === 'in_progress' ? 'In Progress' : 'Ready'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active Route View */}
      {activeRoute && (
        <>
          {/* Route Progress */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-semibold">{activeRoute.route_name}</h2>
                <p className="text-xs text-gray-400">
                  {completedStops} of {stops.length} deliveries completed
                </p>
              </div>
              {activeRoute.status === 'optimized' && (
                <Button size="sm" onClick={startRoute} className="bg-green-600 hover:bg-green-700">
                  <Play className="h-4 w-4 mr-1" /> Start
                </Button>
              )}
              {activeRoute.status === 'in_progress' && (
                <Button
                  size="sm"
                  variant={isTracking ? 'default' : 'outline'}
                  onClick={() => setIsTracking(!isTracking)}
                  className={isTracking ? 'bg-green-600' : ''}
                >
                  {isTracking ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {isTracking ? 'Tracking' : 'Track'}
                </Button>
              )}
            </div>
            <Progress value={progress} className="h-2 bg-gray-700" />
          </div>

          {/* Current Stop Card */}
          {currentStop && (
            <div className="p-4 bg-indigo-900/30 border-b border-indigo-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-indigo-400" />
                <span className="text-sm font-medium text-indigo-400">
                  {currentStop.status === 'arrived' ? 'Current Stop' : 'Next Stop'}
                </span>
              </div>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{currentStop.customer_name}</h3>
                      <p className="text-sm text-gray-400">{currentStop.address}</p>
                      {currentStop.city && (
                        <p className="text-sm text-gray-500">{currentStop.city}, {currentStop.state}</p>
                      )}
                    </div>
                    <Badge className={`${getStatusColor(currentStop.status)} text-white`}>
                      Stop {currentStop.stop_order}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 mb-4 text-sm">
                    {currentStop.product_type && (
                      <div className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded">
                        {getProductIcon(currentStop.product_type)}
                        <span>{currentStop.quantity} {currentStop.unit}</span>
                      </div>
                    )}
                    {currentStop.time_window_start && (
                      <div className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded">
                        <Clock className="h-4 w-4 text-blue-400" />
                        <span>{currentStop.time_window_start} - {currentStop.time_window_end}</span>
                      </div>
                    )}
                    {currentStop.estimated_arrival && (
                      <div className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded">
                        <Timer className="h-4 w-4 text-green-400" />
                        <span>ETA: {new Date(currentStop.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>

                  {currentStop.special_instructions && (
                    <div className="bg-amber-900/30 border border-amber-700 rounded p-2 mb-4">
                      <p className="text-xs text-amber-400 font-medium">Special Instructions:</p>
                      <p className="text-sm text-amber-200">{currentStop.special_instructions}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {currentStop.status === 'pending' && (
                      <>
                        <Button
                          onClick={() => openNavigation(currentStop)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Navigation className="h-4 w-4 mr-2" />
                          Navigate
                        </Button>
                        <Button
                          onClick={() => arriveAtStop(currentStop)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Arrive
                        </Button>
                      </>
                    )}
                    {currentStop.status === 'arrived' && (
                      <>
                        {currentStop.customer_phone && (
                          <Button
                            variant="outline"
                            onClick={() => window.open(`tel:${currentStop.customer_phone}`)}
                            className="border-gray-600"
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Call
                          </Button>
                        )}
                        <Button
                          onClick={() => setShowConfirmModal(true)}
                          className="bg-green-600 hover:bg-green-700 col-span-full"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Complete Delivery
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stops List */}
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Route className="h-5 w-5 text-indigo-400" />
              All Stops ({stops.length})
            </h3>
            
            <ScrollArea className="h-[calc(100vh-450px)]">
              <div className="space-y-2">
                {stops.map((stop, index) => (
                  <Card 
                    key={stop.id}
                    className={`bg-gray-800 border-gray-700 ${
                      stop.status === 'completed' ? 'opacity-60' : ''
                    }`}
                  >
                    <CardContent className="p-3">
                      <div 
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={() => setExpandedStop(expandedStop === stop.id ? null : stop.id)}
                      >
                        <div className={`w-8 h-8 rounded-full ${getStatusColor(stop.status)} flex items-center justify-center text-white font-bold text-sm`}>
                          {stop.status === 'completed' ? <Check className="h-4 w-4" /> : stop.stop_order}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{stop.customer_name}</h4>
                          <p className="text-xs text-gray-400 truncate">{stop.address}</p>
                        </div>
                        
                        <div className="text-right text-xs text-gray-400">
                          {stop.distance_from_previous_km && (
                            <p>{stop.distance_from_previous_km.toFixed(1)} km</p>
                          )}
                          {expandedStop === stop.id ? (
                            <ChevronUp className="h-4 w-4 ml-auto mt-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-auto mt-1" />
                          )}
                        </div>
                      </div>
                      
                      {expandedStop === stop.id && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                            {stop.product_type && (
                              <div className="flex items-center gap-1">
                                {getProductIcon(stop.product_type)}
                                <span>{stop.quantity} {stop.unit}</span>
                              </div>
                            )}
                            {stop.time_window_start && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-blue-400" />
                                <span>{stop.time_window_start} - {stop.time_window_end}</span>
                              </div>
                            )}
                          </div>
                          
                          {stop.status !== 'completed' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 border-gray-600"
                                onClick={() => openNavigation(stop)}
                              >
                                <Navigation className="h-3 w-3 mr-1" />
                                Navigate
                              </Button>
                              {stop.customer_phone && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-gray-600"
                                  onClick={() => window.open(`tel:${stop.customer_phone}`)}
                                >
                                  <Phone className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Bottom Navigation */}
          <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-4 py-2 flex justify-around">
            <Button
              variant="ghost"
              size="sm"
              className="flex-col h-auto py-2"
              onClick={() => setActiveRoute(null)}
            >
              <Home className="h-5 w-5 mb-1" />
              <span className="text-xs">Routes</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-col h-auto py-2"
              onClick={() => setShowChatModal(true)}
            >
              <MessageSquare className="h-5 w-5 mb-1" />
              <span className="text-xs">Chat</span>
              {unreadMessages > 0 && (
                <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                  {unreadMessages}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-col h-auto py-2"
              onClick={() => setShowIssueModal(true)}
            >
              <AlertTriangle className="h-5 w-5 mb-1 text-amber-500" />
              <span className="text-xs">Report</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-col h-auto py-2"
              onClick={loadRoutes}
            >
              <RefreshCw className="h-5 w-5 mb-1" />
              <span className="text-xs">Refresh</span>
            </Button>
          </div>
        </>
      )}

      {/* Delivery Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Confirm Delivery
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Status Selection */}
            <div>
              <Label>Delivery Status</Label>
              <Select value={confirmationStatus} onValueChange={setConfirmationStatus}>
                <SelectTrigger className="bg-gray-900 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="partial">Partial Delivery</SelectItem>
                  <SelectItem value="refused">Refused</SelectItem>
                  <SelectItem value="not_home">Customer Not Home</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Quantity */}
            {currentStop?.quantity && (
              <div>
                <Label>Quantity Delivered ({currentStop.unit})</Label>
                <Input
                  type="number"
                  value={quantityDelivered}
                  onChange={(e) => setQuantityDelivered(e.target.value)}
                  placeholder={currentStop.quantity.toString()}
                  className="bg-gray-900 border-gray-600"
                />
              </div>
            )}

            {/* Signature */}
            {currentStop?.signature_required && (
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <PenTool className="h-4 w-4" />
                  Customer Signature *
                </Label>
                <div className="space-y-2">
                  <Input
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Signer's name"
                    className="bg-gray-900 border-gray-600"
                  />
                  <div className="relative">
                    <canvas
                      ref={canvasRef}
                      className="w-full h-32 bg-white rounded-lg cursor-crosshair touch-none"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                    {!hasDrawnSignature && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-gray-400 text-sm">Sign here</p>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                    className="border-gray-600"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            )}

            {/* Photos */}
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Camera className="h-4 w-4" />
                Delivery Photos
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2 mb-2">
                {deliveryPhotos.map((photo, idx) => (
                  <div key={idx} className="relative w-20 h-20">
                    <img src={photo} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover rounded" />
                    <button
                      onClick={() => setDeliveryPhotos(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="border-gray-600"
              >
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </Button>
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Any additional notes..."
                className="bg-gray-900 border-gray-600"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)} className="border-gray-600">
              Cancel
            </Button>
            <Button onClick={confirmDelivery} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Issue Report Modal */}
      <Dialog open={showIssueModal} onOpenChange={setShowIssueModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Report Issue
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Issue Type *</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="bg-gray-900 border-gray-600">
                  <SelectValue placeholder="Select issue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="traffic">Heavy Traffic</SelectItem>
                  <SelectItem value="vehicle_breakdown">Vehicle Breakdown</SelectItem>
                  <SelectItem value="customer_unavailable">Customer Unavailable</SelectItem>
                  <SelectItem value="access_issue">Access Issue</SelectItem>
                  <SelectItem value="weather">Weather Conditions</SelectItem>
                  <SelectItem value="accident">Accident/Road Block</SelectItem>
                  <SelectItem value="fuel">Fuel Issue</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severity</Label>
              <Select value={issueSeverity} onValueChange={setIssueSeverity}>
                <SelectTrigger className="bg-gray-900 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Title *</Label>
              <Input
                value={issueTitle}
                onChange={(e) => setIssueTitle(e.target.value)}
                placeholder="Brief description"
                className="bg-gray-900 border-gray-600"
              />
            </div>

            <div>
              <Label>Details</Label>
              <Textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                placeholder="Provide more details..."
                className="bg-gray-900 border-gray-600"
                rows={3}
              />
            </div>

            <div>
              <Label>Estimated Delay (minutes)</Label>
              <Input
                type="number"
                value={estimatedDelay}
                onChange={(e) => setEstimatedDelay(e.target.value)}
                placeholder="e.g., 30"
                className="bg-gray-900 border-gray-600"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowIssueModal(false)} className="border-gray-600">
              Cancel
            </Button>
            <Button onClick={reportIssue} className="bg-amber-600 hover:bg-amber-700">
              <Send className="h-4 w-4 mr-2" />
              Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Chat Modal */}
      <Dialog open={showChatModal} onOpenChange={(open) => { setShowChatModal(open); if (open) markMessagesRead(); }}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Dispatch Chat
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'driver' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        msg.sender_type === 'driver'
                          ? 'bg-indigo-600 text-white'
                          : msg.message_type === 'alert'
                          ? 'bg-amber-900/50 border border-amber-700 text-amber-200'
                          : 'bg-gray-700 text-white'
                      }`}
                    >
                      {msg.sender_type === 'dispatch' && (
                        <p className="text-xs text-gray-400 mb-1">{msg.sender_name || 'Dispatch'}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2 pt-4 border-t border-gray-700">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="bg-gray-900 border-gray-600"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage} className="bg-indigo-600 hover:bg-indigo-700">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverMobileInterface;
