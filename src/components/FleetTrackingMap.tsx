import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  MapPin, Truck, Navigation, Phone, MessageSquare, Clock, 
  User, Package, Route, RefreshCw, Send, CheckCircle,
  Circle, Wifi, WifiOff, ChevronRight, History,
  Calendar, X, Search, AlertTriangle, Info
} from 'lucide-react';

interface Driver {
  id: string;
  name: string;
  phone: string;
  status: 'online' | 'offline' | 'on_delivery' | 'idle';
  location: { lat: number; lng: number; heading: number; speed: number; address: string; updated_at: string; } | null;
  current_route: { id: string; name: string; status: string; total_stops: number; completed_stops: number; progress: number; estimated_completion: string; started_at: string; } | null;
  vehicle: { type: string; plate: string; capacity: string; };
}

// Demo fleet data
const DEMO_DRIVERS: Driver[] = [
  { id: 'd1', name: 'Adebayo Ogundimu', phone: '+234 809 123 4567', status: 'on_delivery', location: { lat: 6.4541, lng: 3.3947, heading: 45, speed: 42, address: 'Lekki Phase 1, Lagos', updated_at: new Date().toISOString() }, current_route: { id: 'r1', name: 'Lagos-Lekki Route A', status: 'in_progress', total_stops: 8, completed_stops: 5, progress: 63, estimated_completion: '14:30', started_at: new Date(Date.now() - 3600000).toISOString() }, vehicle: { type: 'Tanker', plate: 'LND-234-KJ', capacity: '33,000L' } },
  { id: 'd2', name: 'Chukwuemeka Nwosu', phone: '+234 802 345 6789', status: 'on_delivery', location: { lat: 6.5244, lng: 3.3792, heading: 180, speed: 28, address: 'Victoria Island, Lagos', updated_at: new Date().toISOString() }, current_route: { id: 'r2', name: 'VI-Ikoyi Express', status: 'in_progress', total_stops: 5, completed_stops: 2, progress: 40, estimated_completion: '16:00', started_at: new Date(Date.now() - 7200000).toISOString() }, vehicle: { type: 'Tanker', plate: 'APP-567-FG', capacity: '45,000L' } },
  { id: 'd3', name: 'Ibrahim Musa', phone: '+234 816 789 0123', status: 'online', location: { lat: 6.4698, lng: 3.5852, heading: 90, speed: 0, address: 'Ajah Depot, Lagos', updated_at: new Date().toISOString() }, current_route: null, vehicle: { type: 'Truck', plate: 'KSF-891-AB', capacity: '20,000L' } },
  { id: 'd4', name: 'Oluwaseun Bakare', phone: '+234 703 456 7890', status: 'idle', location: { lat: 6.4281, lng: 3.4219, heading: 270, speed: 0, address: 'Chevron Depot, Lekki', updated_at: new Date(Date.now() - 1800000).toISOString() }, current_route: null, vehicle: { type: 'Tanker', plate: 'MUS-112-CD', capacity: '33,000L' } },
  { id: 'd5', name: 'Fatima Abdullahi', phone: '+234 810 234 5678', status: 'on_delivery', location: { lat: 6.5955, lng: 3.3421, heading: 315, speed: 55, address: 'Ikeja GRA, Lagos', updated_at: new Date().toISOString() }, current_route: { id: 'r3', name: 'Ikeja-Apapa Route', status: 'in_progress', total_stops: 6, completed_stops: 4, progress: 67, estimated_completion: '15:15', started_at: new Date(Date.now() - 5400000).toISOString() }, vehicle: { type: 'Tanker', plate: 'LAG-445-EF', capacity: '45,000L' } },
  { id: 'd6', name: 'Emeka Obi', phone: '+234 905 678 9012', status: 'offline', location: null, current_route: null, vehicle: { type: 'Truck', plate: 'ABJ-778-GH', capacity: '20,000L' } },
  { id: 'd7', name: 'Yusuf Garba', phone: '+234 706 890 1234', status: 'online', location: { lat: 6.4400, lng: 3.4150, heading: 0, speed: 0, address: 'Ibeju-Lekki Terminal', updated_at: new Date().toISOString() }, current_route: null, vehicle: { type: 'Tanker', plate: 'KAN-223-IJ', capacity: '33,000L' } },
  { id: 'd8', name: 'Ngozi Eze', phone: '+234 812 345 6789', status: 'on_delivery', location: { lat: 6.5100, lng: 3.3600, heading: 135, speed: 35, address: 'Surulere, Lagos', updated_at: new Date().toISOString() }, current_route: { id: 'r4', name: 'Mainland Distribution', status: 'in_progress', total_stops: 10, completed_stops: 7, progress: 70, estimated_completion: '13:45', started_at: new Date(Date.now() - 9000000).toISOString() }, vehicle: { type: 'Truck', plate: 'OGU-556-KL', capacity: '20,000L' } },
];

const DEMO_STATS = {
  total_drivers: 8, online: 2, on_delivery: 4, idle: 1, offline: 1,
  active_routes: 4, pending_deliveries: 3, deliveries_today: 12
};

const DEMO_MESSAGES = [
  { id: 'm1', message: 'Delivery confirmed at Lekki Phase 1 depot', message_type: 'update', priority: 'normal', status: 'delivered', sent_at: new Date(Date.now() - 600000).toISOString(), sender: { full_name: 'Dispatch' } },
  { id: 'm2', message: 'Traffic delay on Third Mainland Bridge - ETA updated', message_type: 'alert', priority: 'high', status: 'delivered', sent_at: new Date(Date.now() - 1800000).toISOString(), sender: { full_name: 'Traffic Control' } },
  { id: 'm3', message: 'Please confirm fuel level before next delivery', message_type: 'request', priority: 'normal', status: 'read', sent_at: new Date(Date.now() - 3600000).toISOString(), sender: { full_name: 'Fleet Manager' } },
];

const DEMO_HISTORY = [
  { id: 'h1', stop_name: 'Total Filling Station - Lekki', address: '123 Admiralty Way, Lekki Phase 1', status: 'completed', completed_at: new Date(Date.now() - 3600000).toISOString(), signature_url: null, notes: 'Delivered 5,000L PMS' },
  { id: 'h2', stop_name: 'Oando Depot - VI', address: '45 Adeola Odeku St, Victoria Island', status: 'completed', completed_at: new Date(Date.now() - 7200000).toISOString(), signature_url: null, notes: 'Delivered 10,000L AGO' },
  { id: 'h3', stop_name: 'Conoil Station - Ajah', address: 'Lekki-Epe Expressway, Ajah', status: 'completed', completed_at: new Date(Date.now() - 10800000).toISOString(), signature_url: null, notes: 'Delivered 8,000L PMS' },
];

export default function FleetTrackingMap() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState(DEMO_STATS);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [routeStatusFilter, setRouteStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDriverDetails, setShowDriverDetails] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messagePriority, setMessagePriority] = useState('normal');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [driverMessages, setDriverMessages] = useState(DEMO_MESSAGES);
  const [deliveryHistory, setDeliveryHistory] = useState(DEMO_HISTORY);
  const [isDemoMode] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDrivers(DEMO_DRIVERS);
      setIsLoading(false);
      setLastUpdated(new Date());
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers(prev => prev.map(d => ({
        ...d,
        location: d.location ? {
          ...d.location,
          speed: d.status === 'on_delivery' ? Math.max(0, d.location.speed + (Math.random() - 0.5) * 10) : 0,
          updated_at: new Date().toISOString()
        } : null
      })));
      setLastUpdated(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setLastUpdated(new Date());
      setRefreshing(false);
    }, 1000);
  };

  const filteredDrivers = drivers.filter(driver => {
    if (statusFilter !== 'all' && driver.status !== statusFilter) return false;
    if (routeStatusFilter === 'with_route' && !driver.current_route) return false;
    if (routeStatusFilter === 'no_route' && driver.current_route) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return driver.name.toLowerCase().includes(q) || driver.vehicle.plate.toLowerCase().includes(q) || driver.location?.address?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleSendMessage = () => {
    if (!selectedDriver || !messageText.trim()) return;
    setSendingMessage(true);
    setTimeout(() => {
      setDriverMessages(prev => [{ id: `m-${Date.now()}`, message: messageText, message_type: 'dispatch', priority: messagePriority, status: 'sent', sent_at: new Date().toISOString(), sender: { full_name: 'You (Dispatch)' } }, ...prev]);
      setMessageText('');
      setShowMessageModal(false);
      setSendingMessage(false);
    }, 500);
  };

  const handleDriverClick = (driver: Driver) => {
    setSelectedDriver(driver);
    setShowDriverDetails(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'on_delivery': return 'bg-blue-500';
      case 'idle': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online': return <Badge className="bg-green-100 text-green-700"><Wifi className="h-3 w-3 mr-1" />Online</Badge>;
      case 'on_delivery': return <Badge className="bg-blue-100 text-blue-700"><Truck className="h-3 w-3 mr-1" />On Delivery</Badge>;
      case 'idle': return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Idle</Badge>;
      default: return <Badge className="bg-gray-100 text-gray-700"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-3">
          <Info className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <span className="text-amber-300 font-medium text-sm">Demo Mode</span>
            <span className="text-amber-200/70 text-sm ml-2">Showing simulated fleet data. Connect GPS tracking hardware for live data.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Navigation className="h-6 w-6 text-purple-400" />Fleet Tracking
          </h2>
          <p className="text-white/70 text-sm mt-1">Real-time driver locations and route monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-sm">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Drivers', value: stats.total_drivers, bg: 'bg-white/10', color: 'text-white', border: 'border-white/20' },
          { label: 'Online', value: stats.online, bg: 'bg-green-500/20', color: 'text-green-400', border: 'border-green-500/30' },
          { label: 'On Delivery', value: stats.on_delivery, bg: 'bg-blue-500/20', color: 'text-blue-400', border: 'border-blue-500/30' },
          { label: 'Idle', value: stats.idle, bg: 'bg-yellow-500/20', color: 'text-yellow-400', border: 'border-yellow-500/30' },
          { label: 'Offline', value: stats.offline, bg: 'bg-gray-500/20', color: 'text-gray-400', border: 'border-gray-500/30' },
          { label: 'Active Routes', value: stats.active_routes, bg: 'bg-purple-500/20', color: 'text-purple-400', border: 'border-purple-500/30' },
          { label: 'Pending', value: stats.pending_deliveries, bg: 'bg-orange-500/20', color: 'text-orange-400', border: 'border-orange-500/30' },
          { label: 'Today', value: stats.deliveries_today, bg: 'bg-cyan-500/20', color: 'text-cyan-400', border: 'border-cyan-500/30' },
        ].map((s, i) => (
          <Card key={i} className={`${s.bg} backdrop-blur-md ${s.border}`}>
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className={`text-xs ${s.color} opacity-70`}>{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search drivers, plates, or locations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50" />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white"><SelectValue placeholder="Driver Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="on_delivery">On Delivery</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="offline">Offline</SelectItem>
                </SelectContent>
              </Select>
              <Select value={routeStatusFilter} onValueChange={setRouteStatusFilter}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white"><SelectValue placeholder="Route Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Routes</SelectItem>
                  <SelectItem value="with_route">With Active Route</SelectItem>
                  <SelectItem value="no_route">No Active Route</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map View */}
        <div className="lg:col-span-2">
          <Card className="bg-white/10 backdrop-blur-md border-white/20 h-[600px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center gap-2"><MapPin className="h-5 w-5 text-purple-400" />Live Fleet Map</CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-60px)]">
              <div className="relative w-full h-full rounded-b-lg overflow-hidden">
                {/* OpenStreetMap embed */}
                <iframe
                  src="https://www.openstreetmap.org/export/embed.html?bbox=3.2%2C6.35%2C3.7%2C6.65&layer=mapnik"
                  className="w-full h-full border-0"
                  style={{ filter: 'hue-rotate(200deg) saturate(0.5) brightness(0.7)' }}
                  title="Fleet Map"
                />
                {/* Driver markers overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {filteredDrivers.filter(d => d.location).map((driver, index) => {
                    const left = 15 + (index * 12) % 70;
                    const top = 15 + (index * 18) % 65;
                    return (
                      <div key={driver.id} className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 pointer-events-auto transition-all hover:scale-110" style={{ left: `${left}%`, top: `${top}%` }} onClick={() => handleDriverClick(driver)}>
                        <div className={`relative ${driver.status === 'on_delivery' ? 'animate-pulse' : ''}`}>
                          <div className={`w-10 h-10 rounded-full ${getStatusColor(driver.status)} flex items-center justify-center shadow-lg border-2 border-white/30`}>
                            <Truck className="h-5 w-5 text-white" style={{ transform: `rotate(${driver.location?.heading || 0}deg)` }} />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                            <Circle className={`h-3 w-3 ${getStatusColor(driver.status)}`} fill="currentColor" />
                          </div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 whitespace-nowrap">
                          <span className="text-xs text-white bg-black/70 px-2 py-0.5 rounded">{driver.name.split(' ')[0]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3">
                  <p className="text-xs text-white/70 mb-2 font-medium">Legend</p>
                  <div className="space-y-1">
                    {[{ color: 'bg-green-500', label: 'Online' }, { color: 'bg-blue-500', label: 'On Delivery' }, { color: 'bg-yellow-500', label: 'Idle' }, { color: 'bg-gray-400', label: 'Offline' }].map(l => (
                      <div key={l.label} className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${l.color}`} /><span className="text-xs text-white">{l.label}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Driver List */}
        <div>
          <Card className="bg-white/10 backdrop-blur-md border-white/20 h-[600px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center justify-between">
                <span className="flex items-center gap-2"><User className="h-5 w-5 text-purple-400" />Drivers</span>
                <Badge variant="secondary">{filteredDrivers.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[520px]">
                <div className="p-4 space-y-3">
                  {filteredDrivers.length === 0 ? (
                    <div className="text-center py-8 text-white/60"><Truck className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No drivers match your filters</p></div>
                  ) : filteredDrivers.map((driver) => (
                    <div key={driver.id} onClick={() => handleDriverClick(driver)} className="bg-white/5 hover:bg-white/10 rounded-lg p-3 cursor-pointer transition-all border border-white/10 hover:border-white/20">
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-purple-600 text-white">{driver.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ${getStatusColor(driver.status)} border-2 border-slate-800`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-white truncate">{driver.name}</p>
                            {getStatusBadge(driver.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                            <Truck className="h-3 w-3" /><span>{driver.vehicle.plate}</span><span>-</span><span>{driver.vehicle.type}</span>
                          </div>
                          {driver.location && <p className="text-xs text-white/50 mt-1 truncate"><MapPin className="h-3 w-3 inline mr-1" />{driver.location.address}</p>}
                          {driver.current_route && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="text-white/70">{driver.current_route.name}</span>
                                <span className="text-purple-400">{driver.current_route.progress}%</span>
                              </div>
                              <Progress value={driver.current_route.progress} className="h-1" />
                              <p className="text-xs text-white/50 mt-1">{driver.current_route.completed_stops}/{driver.current_route.total_stops} stops</p>
                            </div>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-white/40" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Driver Details Modal */}
      <Dialog open={showDriverDetails} onOpenChange={setShowDriverDetails}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedDriver && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-12 w-12"><AvatarFallback className="bg-purple-600 text-white text-lg">{selectedDriver.name.charAt(0)}</AvatarFallback></Avatar>
                  <div>
                    <p className="text-xl">{selectedDriver.name}</p>
                    <div className="flex items-center gap-2 mt-1">{getStatusBadge(selectedDriver.status)}<span className="text-sm text-gray-500">{selectedDriver.vehicle.plate}</span></div>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-gray-400" /><span>{selectedDriver.phone}</span>
                      <Button size="sm" variant="outline" asChild><a href={`tel:${selectedDriver.phone}`}>Call</a></Button>
                    </div>
                    <div className="flex items-center gap-3"><Truck className="h-4 w-4 text-gray-400" /><span>{selectedDriver.vehicle.type} - {selectedDriver.vehicle.capacity}</span></div>
                    {selectedDriver.location && (
                      <div className="flex items-start gap-3"><MapPin className="h-4 w-4 text-gray-400 mt-0.5" /><div><p>{selectedDriver.location.address}</p><p className="text-xs text-gray-500">Speed: {selectedDriver.location.speed?.toFixed(1) || 0} km/h</p></div></div>
                    )}
                    {selectedDriver.current_route && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2"><h4 className="font-medium">{selectedDriver.current_route.name}</h4><Badge>{selectedDriver.current_route.status}</Badge></div>
                        <Progress value={selectedDriver.current_route.progress} className="mb-2" />
                        <p className="text-sm text-gray-500">{selectedDriver.current_route.completed_stops}/{selectedDriver.current_route.total_stops} stops completed</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => { setShowDriverDetails(false); setShowMessageModal(true); }}><MessageSquare className="h-4 w-4 mr-2" />Send Message</Button>
                  <Button variant="outline" className="flex-1" onClick={() => { setShowDriverDetails(false); setShowHistoryModal(true); }}><History className="h-4 w-4 mr-2" />View History</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={showMessageModal} onOpenChange={setShowMessageModal}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Send Message to {selectedDriver?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Priority</label>
              <Select value={messagePriority} onValueChange={setMessagePriority}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent></Select>
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Type your message..." className="mt-1" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMessageModal(false)}>Cancel</Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage || !messageText.trim()}><Send className="h-4 w-4 mr-2" />Send Message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delivery History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><History className="h-5 w-5" />Delivery History - {selectedDriver?.name}</DialogTitle></DialogHeader>
          <ScrollArea className="h-96">
            <div className="space-y-3 p-1">
              {deliveryHistory.map((delivery) => (
                <Card key={delivery.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div><p className="font-medium">{delivery.stop_name}</p><p className="text-sm text-gray-500">{delivery.address}</p>{delivery.notes && <p className="text-sm text-gray-600 mt-1">{delivery.notes}</p>}</div>
                      <div className="text-right"><Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge><p className="text-xs text-gray-500 mt-1">{new Date(delivery.completed_at).toLocaleString()}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
