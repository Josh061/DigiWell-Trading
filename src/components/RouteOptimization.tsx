import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Route,
  MapPin,
  Truck,
  Clock,
  Fuel,
  Navigation,
  Plus,
  Play,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Trash2,
  RefreshCw,
  Calendar,
  Target,
  TrendingUp,
  Zap,
  Package,
  Settings,
  Eye,
  Download,
  Users,
  ChevronRight,
  Sparkles,
  BarChart3,
  Timer,
  DollarSign,
  Map
} from 'lucide-react';

interface DeliveryRoute {
  id: string;
  route_name: string;
  route_date: string;
  driver_name?: string;
  vehicle_type: string;
  vehicle_capacity?: number;
  vehicle_fuel_efficiency: number;
  fuel_price_per_liter: number;
  status: string;
  total_distance_km?: number;
  total_duration_minutes?: number;
  estimated_fuel_cost?: number;
  total_deliveries: number;
  total_volume?: number;
  start_location_address?: string;
  start_location_lat?: number;
  start_location_lng?: number;
  end_location_address?: string;
  optimization_score?: number;
  optimization_savings_km?: number;
  optimization_savings_time?: number;
  schedule_suggestions?: any[];
  created_at: string;
}

interface RouteStop {
  id: string;
  route_id: string;
  stop_order: number;
  original_order?: number;
  customer_name: string;
  customer_phone?: string;
  address: string;
  city?: string;
  state?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  product_type?: string;
  quantity?: number;
  unit?: string;
  time_window_start?: string;
  time_window_end?: string;
  estimated_arrival?: string;
  estimated_duration_minutes: number;
  actual_arrival?: string;
  status: string;
  distance_from_previous_km?: number;
  duration_from_previous_minutes?: number;
  special_instructions?: string;
  signature_required: boolean;
}

const RouteOptimization: React.FC = () => {
  const { toast } = useToast();
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<DeliveryRoute | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState('routes');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [draggedStop, setDraggedStop] = useState<RouteStop | null>(null);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);

  const [newRoute, setNewRoute] = useState({
    route_name: '',
    route_date: new Date().toISOString().split('T')[0],
    driver_name: '',
    vehicle_type: 'truck',
    vehicle_capacity: '',
    vehicle_fuel_efficiency: '8.5',
    fuel_price_per_liter: '1.50',
    start_location_address: '',
    end_location_address: ''
  });

  const [newStop, setNewStop] = useState({
    customer_name: '',
    customer_phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    product_type: 'diesel',
    quantity: '',
    unit: 'liters',
    time_window_start: '',
    time_window_end: '',
    estimated_duration_minutes: '15',
    special_instructions: '',
    signature_required: false
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: { action: 'get_routes', limit: 50 }
      });

      if (error) throw error;
      setRoutes(data.routes || []);
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
        body: { action: 'get_route', route_id: routeId }
      });

      if (error) throw error;
      setSelectedRoute(data.route);
      setStops(data.stops || []);
      setActiveTab('planner');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load route details',
        variant: 'destructive'
      });
    }
  };

  const createRoute = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'create_route',
          ...newRoute,
          vehicle_capacity: newRoute.vehicle_capacity ? parseFloat(newRoute.vehicle_capacity) : null,
          vehicle_fuel_efficiency: parseFloat(newRoute.vehicle_fuel_efficiency),
          fuel_price_per_liter: parseFloat(newRoute.fuel_price_per_liter)
        }
      });

      if (error) throw error;

      toast({
        title: 'Route Created',
        description: 'New delivery route has been created successfully'
      });

      setShowCreateModal(false);
      setNewRoute({
        route_name: '',
        route_date: new Date().toISOString().split('T')[0],
        driver_name: '',
        vehicle_type: 'truck',
        vehicle_capacity: '',
        vehicle_fuel_efficiency: '8.5',
        fuel_price_per_liter: '1.50',
        start_location_address: '',
        end_location_address: ''
      });
      loadRoutes();
      
      // Open the new route
      if (data.route) {
        loadRouteDetails(data.route.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create route',
        variant: 'destructive'
      });
    }
  };

  const addStop = async () => {
    if (!selectedRoute) return;

    try {
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'add_stop',
          route_id: selectedRoute.id,
          ...newStop,
          quantity: newStop.quantity ? parseFloat(newStop.quantity) : null,
          estimated_duration_minutes: parseInt(newStop.estimated_duration_minutes)
        }
      });

      if (error) throw error;

      toast({
        title: 'Stop Added',
        description: 'New delivery stop has been added to the route'
      });

      setShowAddStopModal(false);
      setNewStop({
        customer_name: '',
        customer_phone: '',
        address: '',
        city: '',
        state: '',
        postal_code: '',
        product_type: 'diesel',
        quantity: '',
        unit: 'liters',
        time_window_start: '',
        time_window_end: '',
        estimated_duration_minutes: '15',
        special_instructions: '',
        signature_required: false
      });
      loadRouteDetails(selectedRoute.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add stop',
        variant: 'destructive'
      });
    }
  };

  const optimizeRoute = async (optimizationType: string = 'balanced') => {
    if (!selectedRoute) return;

    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'optimize_route',
          route_id: selectedRoute.id,
          optimization_type: optimizationType
        }
      });

      if (error) throw error;

      setOptimizationResult(data.optimization);
      toast({
        title: 'Route Optimized!',
        description: `Saved ${data.optimization.distance_saved.toFixed(1)} km and ${data.optimization.time_saved} minutes`
      });

      loadRouteDetails(selectedRoute.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to optimize route',
        variant: 'destructive'
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleDragStart = (stop: RouteStop) => {
    setDraggedStop(stop);
  };

  const handleDragOver = (e: React.DragEvent, targetStop: RouteStop) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStop: RouteStop) => {
    e.preventDefault();
    if (!draggedStop || !selectedRoute || draggedStop.id === targetStop.id) return;

    const newStops = [...stops];
    const draggedIndex = newStops.findIndex(s => s.id === draggedStop.id);
    const targetIndex = newStops.findIndex(s => s.id === targetStop.id);

    newStops.splice(draggedIndex, 1);
    newStops.splice(targetIndex, 0, draggedStop);

    // Update stop orders
    const stopOrders = newStops.map((stop, index) => ({
      stop_id: stop.id,
      new_order: index + 1
    }));

    setStops(newStops.map((s, i) => ({ ...s, stop_order: i + 1 })));
    setDraggedStop(null);

    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'reorder_stops',
          route_id: selectedRoute.id,
          stop_orders: stopOrders
        }
      });

      toast({
        title: 'Stops Reordered',
        description: 'Route has been updated with new stop order'
      });

      loadRouteDetails(selectedRoute.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reorder stops',
        variant: 'destructive'
      });
    }
  };

  const moveStop = async (stopId: string, direction: 'up' | 'down') => {
    if (!selectedRoute) return;

    const currentIndex = stops.findIndex(s => s.id === stopId);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= stops.length) return;

    const newStops = [...stops];
    [newStops[currentIndex], newStops[newIndex]] = [newStops[newIndex], newStops[currentIndex]];

    const stopOrders = newStops.map((stop, index) => ({
      stop_id: stop.id,
      new_order: index + 1
    }));

    setStops(newStops.map((s, i) => ({ ...s, stop_order: i + 1 })));

    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'reorder_stops',
          route_id: selectedRoute.id,
          stop_orders: stopOrders
        }
      });

      loadRouteDetails(selectedRoute.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reorder stops',
        variant: 'destructive'
      });
    }
  };

  const deleteStop = async (stopId: string) => {
    if (!selectedRoute) return;

    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'delete_stop',
          stop_id: stopId,
          route_id: selectedRoute.id
        }
      });

      toast({
        title: 'Stop Removed',
        description: 'Delivery stop has been removed from the route'
      });

      loadRouteDetails(selectedRoute.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete stop',
        variant: 'destructive'
      });
    }
  };

  const startRoute = async () => {
    if (!selectedRoute) return;

    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'start_route',
          route_id: selectedRoute.id
        }
      });

      toast({
        title: 'Route Started',
        description: 'Route is now in progress'
      });

      loadRouteDetails(selectedRoute.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start route',
        variant: 'destructive'
      });
    }
  };

  const completeStop = async (stopId: string) => {
    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'complete_stop',
          stop_id: stopId
        }
      });

      toast({
        title: 'Stop Completed',
        description: 'Delivery has been marked as completed'
      });

      if (selectedRoute) {
        loadRouteDetails(selectedRoute.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to complete stop',
        variant: 'destructive'
      });
    }
  };

  const deleteRoute = async (routeId: string) => {
    try {
      await supabase.functions.invoke('route-optimization', {
        body: {
          action: 'delete_route',
          route_id: routeId
        }
      });

      toast({
        title: 'Route Deleted',
        description: 'Delivery route has been deleted'
      });

      setSelectedRoute(null);
      setStops([]);
      setActiveTab('routes');
      loadRoutes();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete route',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      optimized: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-amber-100 text-amber-800',
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-gray-100 text-gray-800',
      arrived: 'bg-blue-100 text-blue-800',
      skipped: 'bg-red-100 text-red-800'
    };

    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-800'}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const getProductIcon = (productType?: string) => {
    switch (productType) {
      case 'diesel':
        return <Fuel className="h-4 w-4 text-amber-600" />;
      case 'petrol':
        return <Fuel className="h-4 w-4 text-green-600" />;
      case 'kerosene':
        return <Fuel className="h-4 w-4 text-blue-600" />;
      case 'lpg':
        return <Package className="h-4 w-4 text-purple-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Calculate stats
  const routeStats = {
    total: routes.length,
    draft: routes.filter(r => r.status === 'draft').length,
    optimized: routes.filter(r => r.status === 'optimized').length,
    inProgress: routes.filter(r => r.status === 'in_progress').length,
    completed: routes.filter(r => r.status === 'completed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Route className="h-7 w-7 text-indigo-600" />
            Route Optimization
          </h1>
          <p className="text-gray-600 mt-1">
            Plan and optimize delivery routes for maximum efficiency
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus className="h-4 w-4 mr-2" />
          Create Route
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-gray-50 to-gray-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total Routes</p>
                <p className="text-2xl font-bold text-gray-900">{routeStats.total}</p>
              </div>
              <Route className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-600 uppercase">Optimized</p>
                <p className="text-2xl font-bold text-blue-900">{routeStats.optimized}</p>
              </div>
              <Sparkles className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-600 uppercase">In Progress</p>
                <p className="text-2xl font-bold text-amber-900">{routeStats.inProgress}</p>
              </div>
              <Truck className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-600 uppercase">Completed</p>
                <p className="text-2xl font-bold text-green-900">{routeStats.completed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-600 uppercase">Draft</p>
                <p className="text-2xl font-bold text-purple-900">{routeStats.draft}</p>
              </div>
              <Settings className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
          <TabsTrigger value="routes" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Routes
          </TabsTrigger>
          <TabsTrigger value="planner" className="flex items-center gap-2" disabled={!selectedRoute}>
            <Map className="h-4 w-4" />
            Route Planner
          </TabsTrigger>
        </TabsList>

        {/* Routes List */}
        <TabsContent value="routes" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : routes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Route className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Routes Yet</h3>
                <p className="text-gray-500 mb-4">Create your first delivery route to get started</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Route
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {routes.map((route) => (
                <Card 
                  key={route.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => loadRouteDetails(route.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${
                          route.status === 'optimized' ? 'bg-blue-100' :
                          route.status === 'in_progress' ? 'bg-amber-100' :
                          route.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <Route className={`h-6 w-6 ${
                            route.status === 'optimized' ? 'text-blue-600' :
                            route.status === 'in_progress' ? 'text-amber-600' :
                            route.status === 'completed' ? 'text-green-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{route.route_name}</h3>
                            {getStatusBadge(route.status)}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {new Date(route.route_date).toLocaleDateString()}
                            </span>
                            {route.driver_name && (
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {route.driver_name}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {route.total_deliveries} stops
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                        {route.total_distance_km && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Distance</p>
                            <p className="font-semibold text-gray-900">{route.total_distance_km.toFixed(1)} km</p>
                          </div>
                        )}
                        {route.total_duration_minutes && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Duration</p>
                            <p className="font-semibold text-gray-900">{formatDuration(route.total_duration_minutes)}</p>
                          </div>
                        )}
                        {route.estimated_fuel_cost && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Fuel Cost</p>
                            <p className="font-semibold text-gray-900">${route.estimated_fuel_cost.toFixed(2)}</p>
                          </div>
                        )}
                        {route.optimization_score && (
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Efficiency</p>
                            <p className="font-semibold text-indigo-600">{route.optimization_score.toFixed(0)}%</p>
                          </div>
                        )}
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Route Planner */}
        <TabsContent value="planner" className="mt-4">
          {selectedRoute && (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Route Details & Controls */}
              <div className="lg:col-span-1 space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{selectedRoute.route_name}</CardTitle>
                      {getStatusBadge(selectedRoute.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Date</p>
                        <p className="font-medium">{new Date(selectedRoute.route_date).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Driver</p>
                        <p className="font-medium">{selectedRoute.driver_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Vehicle</p>
                        <p className="font-medium capitalize">{selectedRoute.vehicle_type}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Stops</p>
                        <p className="font-medium">{stops.length}</p>
                      </div>
                    </div>

                    {selectedRoute.total_distance_km && (
                      <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
                        <div className="text-center">
                          <Navigation className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">Distance</p>
                          <p className="font-semibold">{selectedRoute.total_distance_km.toFixed(1)} km</p>
                        </div>
                        <div className="text-center">
                          <Clock className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">Duration</p>
                          <p className="font-semibold">{formatDuration(selectedRoute.total_duration_minutes)}</p>
                        </div>
                        <div className="text-center">
                          <Fuel className="h-5 w-5 text-indigo-600 mx-auto mb-1" />
                          <p className="text-xs text-gray-500">Fuel</p>
                          <p className="font-semibold">${selectedRoute.estimated_fuel_cost?.toFixed(2)}</p>
                        </div>
                      </div>
                    )}

                    {selectedRoute.optimization_score && (
                      <div className="p-3 bg-indigo-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-indigo-900">Optimization Score</span>
                          <span className="text-lg font-bold text-indigo-600">{selectedRoute.optimization_score.toFixed(0)}%</span>
                        </div>
                        <Progress value={selectedRoute.optimization_score} className="h-2" />
                        {selectedRoute.optimization_savings_km && (
                          <p className="text-xs text-indigo-700 mt-2">
                            Saved {selectedRoute.optimization_savings_km.toFixed(1)} km and {selectedRoute.optimization_savings_time} min
                          </p>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button 
                        onClick={() => setShowAddStopModal(true)} 
                        className="w-full"
                        variant="outline"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Stop
                      </Button>

                      {stops.length > 1 && selectedRoute.status !== 'completed' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            onClick={() => optimizeRoute('distance')}
                            disabled={optimizing}
                            variant="outline"
                            size="sm"
                          >
                            {optimizing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4 mr-1" />}
                            Shortest
                          </Button>
                          <Button 
                            onClick={() => optimizeRoute('time_windows')}
                            disabled={optimizing}
                            variant="outline"
                            size="sm"
                          >
                            {optimizing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4 mr-1" />}
                            Time-Based
                          </Button>
                        </div>
                      )}

                      {stops.length > 1 && selectedRoute.status !== 'completed' && (
                        <Button 
                          onClick={() => optimizeRoute('balanced')}
                          disabled={optimizing}
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                        >
                          {optimizing ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Optimize Route
                        </Button>
                      )}

                      {selectedRoute.status === 'optimized' && (
                        <Button onClick={startRoute} className="w-full bg-green-600 hover:bg-green-700">
                          <Play className="h-4 w-4 mr-2" />
                          Start Route
                        </Button>
                      )}

                      <Button 
                        onClick={() => deleteRoute(selectedRoute.id)}
                        variant="outline"
                        className="w-full text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Route
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggestions */}
                {selectedRoute.schedule_suggestions && selectedRoute.schedule_suggestions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500" />
                        Suggestions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedRoute.schedule_suggestions.map((suggestion: any, idx: number) => (
                          <div 
                            key={idx}
                            className={`p-3 rounded-lg text-sm ${
                              suggestion.severity === 'high' ? 'bg-red-50 border border-red-200' :
                              suggestion.severity === 'medium' ? 'bg-amber-50 border border-amber-200' :
                              'bg-blue-50 border border-blue-200'
                            }`}
                          >
                            <p className="font-medium">{suggestion.title}</p>
                            <p className="text-gray-600 mt-1">{suggestion.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Stops List with Drag & Drop */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Delivery Stops</CardTitle>
                      <p className="text-sm text-gray-500">Drag to reorder</p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {stops.length === 0 ? (
                      <div className="py-8 text-center">
                        <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Stops Added</h3>
                        <p className="text-gray-500 mb-4">Add delivery stops to plan your route</p>
                        <Button onClick={() => setShowAddStopModal(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Stop
                        </Button>
                      </div>
                    ) : (
                      <ScrollArea className="h-[600px] pr-4">
                        <div className="space-y-3">
                          {/* Start Location */}
                          {selectedRoute.start_location_address && (
                            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-sm">
                                S
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-green-900">Start: Depot</p>
                                <p className="text-sm text-green-700">{selectedRoute.start_location_address}</p>
                              </div>
                            </div>
                          )}

                          {/* Stops */}
                          {stops.map((stop, index) => (
                            <div
                              key={stop.id}
                              draggable
                              onDragStart={() => handleDragStart(stop)}
                              onDragOver={(e) => handleDragOver(e, stop)}
                              onDrop={(e) => handleDrop(e, stop)}
                              className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                draggedStop?.id === stop.id ? 'opacity-50 border-indigo-400 bg-indigo-50' :
                                stop.status === 'completed' ? 'bg-green-50 border-green-200' :
                                'bg-white border-gray-200 hover:border-indigo-300 hover:shadow-sm'
                              } cursor-grab active:cursor-grabbing`}
                            >
                              <div className="flex flex-col items-center gap-1">
                                <GripVertical className="h-5 w-5 text-gray-400" />
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                  stop.status === 'completed' ? 'bg-green-500' : 'bg-indigo-500'
                                }`}>
                                  {stop.stop_order}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-gray-900 truncate">{stop.customer_name}</h4>
                                  {stop.status === 'completed' && (
                                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 truncate">{stop.address}</p>
                                {stop.city && (
                                  <p className="text-sm text-gray-500">{stop.city}, {stop.state}</p>
                                )}

                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                                  {stop.product_type && (
                                    <span className="flex items-center gap-1">
                                      {getProductIcon(stop.product_type)}
                                      {stop.quantity} {stop.unit}
                                    </span>
                                  )}
                                  {stop.time_window_start && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {stop.time_window_start} - {stop.time_window_end}
                                    </span>
                                  )}
                                  {stop.distance_from_previous_km && (
                                    <span className="flex items-center gap-1">
                                      <Navigation className="h-3 w-3" />
                                      {stop.distance_from_previous_km.toFixed(1)} km
                                    </span>
                                  )}
                                  {stop.duration_from_previous_minutes && (
                                    <span className="flex items-center gap-1">
                                      <Timer className="h-3 w-3" />
                                      {stop.duration_from_previous_minutes} min
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); moveStop(stop.id, 'up'); }}
                                  disabled={index === 0}
                                  className="h-7 w-7 p-0"
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); moveStop(stop.id, 'down'); }}
                                  disabled={index === stops.length - 1}
                                  className="h-7 w-7 p-0"
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                {selectedRoute.status === 'in_progress' && stop.status !== 'completed' && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => { e.stopPropagation(); completeStop(stop.id); }}
                                    className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => { e.stopPropagation(); deleteStop(stop.id); }}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {/* End Location */}
                          {selectedRoute.end_location_address && (
                            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">
                                E
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-red-900">End: Return to Depot</p>
                                <p className="text-sm text-red-700">{selectedRoute.end_location_address}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Route Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Route</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Route Name *</Label>
              <Input
                value={newRoute.route_name}
                onChange={(e) => setNewRoute({ ...newRoute, route_name: e.target.value })}
                placeholder="e.g., Lagos North Route"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Route Date *</Label>
                <Input
                  type="date"
                  value={newRoute.route_date}
                  onChange={(e) => setNewRoute({ ...newRoute, route_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Driver Name</Label>
                <Input
                  value={newRoute.driver_name}
                  onChange={(e) => setNewRoute({ ...newRoute, driver_name: e.target.value })}
                  placeholder="Driver name"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vehicle Type</Label>
                <Select
                  value={newRoute.vehicle_type}
                  onValueChange={(value) => setNewRoute({ ...newRoute, vehicle_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="tanker">Tanker</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="pickup">Pickup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vehicle Capacity (L)</Label>
                <Input
                  type="number"
                  value={newRoute.vehicle_capacity}
                  onChange={(e) => setNewRoute({ ...newRoute, vehicle_capacity: e.target.value })}
                  placeholder="e.g., 10000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fuel Efficiency (km/L)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={newRoute.vehicle_fuel_efficiency}
                  onChange={(e) => setNewRoute({ ...newRoute, vehicle_fuel_efficiency: e.target.value })}
                />
              </div>
              <div>
                <Label>Fuel Price ($/L)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newRoute.fuel_price_per_liter}
                  onChange={(e) => setNewRoute({ ...newRoute, fuel_price_per_liter: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Start Location (Depot Address)</Label>
              <Input
                value={newRoute.start_location_address}
                onChange={(e) => setNewRoute({ ...newRoute, start_location_address: e.target.value })}
                placeholder="e.g., 123 Depot Road, Lagos"
              />
            </div>

            <div>
              <Label>End Location (Leave blank to return to start)</Label>
              <Input
                value={newRoute.end_location_address}
                onChange={(e) => setNewRoute({ ...newRoute, end_location_address: e.target.value })}
                placeholder="Same as start if empty"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createRoute}
              disabled={!newRoute.route_name || !newRoute.route_date}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Create Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Stop Modal */}
      <Dialog open={showAddStopModal} onOpenChange={setShowAddStopModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Delivery Stop</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input
                  value={newStop.customer_name}
                  onChange={(e) => setNewStop({ ...newStop, customer_name: e.target.value })}
                  placeholder="Customer name"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={newStop.customer_phone}
                  onChange={(e) => setNewStop({ ...newStop, customer_phone: e.target.value })}
                  placeholder="+234..."
                />
              </div>
            </div>

            <div>
              <Label>Address *</Label>
              <Input
                value={newStop.address}
                onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input
                  value={newStop.city}
                  onChange={(e) => setNewStop({ ...newStop, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <Label>State</Label>
                <Input
                  value={newStop.state}
                  onChange={(e) => setNewStop({ ...newStop, state: e.target.value })}
                  placeholder="State"
                />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input
                  value={newStop.postal_code}
                  onChange={(e) => setNewStop({ ...newStop, postal_code: e.target.value })}
                  placeholder="Postal"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Product</Label>
                <Select
                  value={newStop.product_type}
                  onValueChange={(value) => setNewStop({ ...newStop, product_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel (AGO)</SelectItem>
                    <SelectItem value="petrol">Petrol (PMS)</SelectItem>
                    <SelectItem value="kerosene">Kerosene (DPK)</SelectItem>
                    <SelectItem value="lpg">LPG</SelectItem>
                    <SelectItem value="jet_fuel">Jet Fuel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={newStop.quantity}
                  onChange={(e) => setNewStop({ ...newStop, quantity: e.target.value })}
                  placeholder="Amount"
                />
              </div>
              <div>
                <Label>Unit</Label>
                <Select
                  value={newStop.unit}
                  onValueChange={(value) => setNewStop({ ...newStop, unit: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="liters">Liters</SelectItem>
                    <SelectItem value="gallons">Gallons</SelectItem>
                    <SelectItem value="barrels">Barrels</SelectItem>
                    <SelectItem value="kg">Kilograms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Time Window Start</Label>
                <Input
                  type="time"
                  value={newStop.time_window_start}
                  onChange={(e) => setNewStop({ ...newStop, time_window_start: e.target.value })}
                />
              </div>
              <div>
                <Label>Time Window End</Label>
                <Input
                  type="time"
                  value={newStop.time_window_end}
                  onChange={(e) => setNewStop({ ...newStop, time_window_end: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Estimated Duration (minutes)</Label>
              <Input
                type="number"
                value={newStop.estimated_duration_minutes}
                onChange={(e) => setNewStop({ ...newStop, estimated_duration_minutes: e.target.value })}
              />
            </div>

            <div>
              <Label>Special Instructions</Label>
              <Input
                value={newStop.special_instructions}
                onChange={(e) => setNewStop({ ...newStop, special_instructions: e.target.value })}
                placeholder="Gate code, contact person, etc."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="signature_required"
                checked={newStop.signature_required}
                onChange={(e) => setNewStop({ ...newStop, signature_required: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="signature_required">Signature required on delivery</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStopModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={addStop}
              disabled={!newStop.customer_name || !newStop.address}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Add Stop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RouteOptimization;
