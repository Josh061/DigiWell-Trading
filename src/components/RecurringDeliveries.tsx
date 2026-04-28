import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar,
  Clock, 
  MapPin, 
  Package, 
  Bell, 
  Edit, 
  Download,
  Plus,
  RefreshCw,
  Check,
  X,
  Pause,
  Play,
  CreditCard,
  Truck,
  Droplets,
  Fuel,
  Flame,
  DollarSign,
  CalendarDays,
  CalendarClock,
  AlertCircle,
  ChevronRight,
  Settings,
  Trash2,
  Mail,
  Phone,
  FileText,
  Home,
  Key
} from 'lucide-react';

interface RecurringSchedule {
  id: string;
  user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_zip: string;
  delivery_country: string;
  product_type: string;
  product_name: string;
  quantity: number;
  quantity_unit: string;
  unit_price: number;
  estimated_total: number;
  frequency: string;
  frequency_interval: number;
  preferred_day_of_week: number;
  preferred_day_of_month: number;
  preferred_time_window: string;
  time_window_start: string;
  time_window_end: string;
  start_date: string;
  end_date: string;
  next_delivery_date: string;
  last_delivery_date: string;
  total_deliveries_made: number;
  payment_method: string;
  stripe_payment_method_id: string;
  stripe_customer_id: string;
  auto_charge_enabled: boolean;
  auto_charge_days_before: number;
  special_instructions: string;
  access_code: string;
  signature_required: boolean;
  contact_before_delivery: boolean;
  leave_at_location: boolean;
  notify_days_before: number[];
  notify_via_email: boolean;
  notify_via_sms: boolean;
  status: string;
  paused_at: string;
  paused_reason: string;
  cancelled_at: string;
  cancellation_reason: string;
  created_at: string;
}

interface DeliveryInstance {
  id: string;
  recurring_schedule_id: string;
  scheduled_date: string;
  scheduled_time_window: string;
  status: string;
  payment_status: string;
  payment_amount: number;
  stripe_payment_intent_id: string;
  shipment_id: string;
  order_id: string;
  tracking_number: string;
  actual_delivery_date: string;
  notification_7d_sent: boolean;
  notification_3d_sent: boolean;
  notification_1d_sent: boolean;
  recurring_delivery_schedules?: RecurringSchedule;
}

const productTypes = {
  crude_oil: { name: 'Crude Oil', icon: Droplets, color: 'bg-amber-100 text-amber-800', unit_price: 75.50 },
  refined_fuel: { name: 'Refined Fuel', icon: Fuel, color: 'bg-blue-100 text-blue-800', unit_price: 85.00 },
  natural_gas: { name: 'Natural Gas', icon: Flame, color: 'bg-orange-100 text-orange-800', unit_price: 3.50 },
  lpg: { name: 'LPG', icon: Flame, color: 'bg-purple-100 text-purple-800', unit_price: 65.00 },
  diesel: { name: 'Diesel', icon: Fuel, color: 'bg-gray-100 text-gray-800', unit_price: 92.00 },
  gasoline: { name: 'Gasoline', icon: Fuel, color: 'bg-red-100 text-red-800', unit_price: 88.00 },
  jet_fuel: { name: 'Jet Fuel', icon: Fuel, color: 'bg-sky-100 text-sky-800', unit_price: 95.00 },
  heating_oil: { name: 'Heating Oil', icon: Flame, color: 'bg-yellow-100 text-yellow-800', unit_price: 78.00 }
};

const frequencyOptions = [
  { value: 'weekly', label: 'Weekly', description: 'Every week' },
  { value: 'bi_weekly', label: 'Bi-Weekly', description: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly', description: 'Once a month' },
  { value: 'custom', label: 'Custom', description: 'Set custom interval' }
];

const timeWindows = {
  morning: { start: '08:00', end: '12:00', label: 'Morning (8 AM - 12 PM)' },
  afternoon: { start: '12:00', end: '17:00', label: 'Afternoon (12 PM - 5 PM)' },
  evening: { start: '17:00', end: '21:00', label: 'Evening (5 PM - 9 PM)' },
  all_day: { start: '08:00', end: '21:00', label: 'All Day (8 AM - 9 PM)' }
};

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  paused: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800'
};

const instanceStatusColors: Record<string, string> = {
  pending: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  in_transit: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  skipped: 'bg-gray-100 text-gray-800'
};

export default function RecurringDeliveries() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<RecurringSchedule[]>([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<DeliveryInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<RecurringSchedule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState('schedules');

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    delivery_zip: '',
    delivery_country: 'USA',
    product_type: 'diesel',
    quantity: 100,
    quantity_unit: 'barrels',
    frequency: 'weekly',
    frequency_interval: 7,
    preferred_day_of_week: 1,
    preferred_day_of_month: 1,
    preferred_time_window: 'morning',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    payment_method: 'invoice',
    stripe_payment_method_id: '',
    stripe_customer_id: '',
    auto_charge_enabled: false,
    auto_charge_days_before: 3,
    special_instructions: '',
    access_code: '',
    signature_required: true,
    contact_before_delivery: false,
    leave_at_location: false,
    notify_days_before: [7, 3, 1],
    notify_via_email: true,
    notify_via_sms: true
  });

  const [pauseReason, setPauseReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [resumeDate, setResumeDate] = useState('');

  useEffect(() => {
    fetchSchedules();
    fetchUpcomingDeliveries();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_recurring_schedules', limit: 100 }
      });

      if (error) {
        console.warn('Schedules fetch error:', error);
        setSchedules([]);
      } else {
        setSchedules(data?.schedules || []);
      }
    } catch (error: any) {
      console.warn('Failed to fetch schedules:', error?.message);
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUpcomingDeliveries = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_upcoming_deliveries', days_ahead: 30 }
      });

      if (error) {
        console.warn('Upcoming deliveries fetch error:', error);
        setUpcomingDeliveries([]);
      } else {
        setUpcomingDeliveries(data?.instances || []);
      }
    } catch (error: any) {
      console.warn('Failed to fetch upcoming deliveries:', error?.message);
      setUpcomingDeliveries([]);
    }
  };


  const handleCreateSchedule = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'create_recurring_schedule', ...formData }
      });

      if (error) throw error;

      toast({
        title: 'Schedule Created',
        description: `Recurring delivery for ${data.schedule.product_name} has been set up successfully`
      });

      setShowCreateModal(false);
      resetForm();
      fetchSchedules();
      fetchUpcomingDeliveries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create schedule',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { 
          action: 'update_recurring_schedule', 
          schedule_id: selectedSchedule.id,
          ...formData 
        }
      });

      if (error) throw error;

      toast({
        title: 'Schedule Updated',
        description: 'Recurring delivery schedule has been updated'
      });

      setShowEditModal(false);
      fetchSchedules();
      fetchUpcomingDeliveries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update schedule',
        variant: 'destructive'
      });
    }
  };

  const handlePauseSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      const { error } = await supabase.functions.invoke('shipping-logistics', {
        body: { 
          action: 'pause_recurring_schedule', 
          schedule_id: selectedSchedule.id,
          reason: pauseReason
        }
      });

      if (error) throw error;

      toast({
        title: 'Schedule Paused',
        description: 'Recurring delivery has been paused'
      });

      setShowPauseModal(false);
      setPauseReason('');
      fetchSchedules();
      fetchUpcomingDeliveries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to pause schedule',
        variant: 'destructive'
      });
    }
  };

  const handleResumeSchedule = async (schedule: RecurringSchedule) => {
    try {
      const { error } = await supabase.functions.invoke('shipping-logistics', {
        body: { 
          action: 'resume_recurring_schedule', 
          schedule_id: schedule.id,
          resume_date: resumeDate || undefined
        }
      });

      if (error) throw error;

      toast({
        title: 'Schedule Resumed',
        description: 'Recurring delivery has been resumed'
      });

      setResumeDate('');
      fetchSchedules();
      fetchUpcomingDeliveries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to resume schedule',
        variant: 'destructive'
      });
    }
  };

  const handleCancelSchedule = async () => {
    if (!selectedSchedule) return;

    try {
      const { error } = await supabase.functions.invoke('shipping-logistics', {
        body: { 
          action: 'cancel_recurring_schedule', 
          schedule_id: selectedSchedule.id,
          reason: cancelReason
        }
      });

      if (error) throw error;

      toast({
        title: 'Schedule Cancelled',
        description: 'Recurring delivery has been cancelled'
      });

      setShowCancelModal(false);
      setCancelReason('');
      fetchSchedules();
      fetchUpcomingDeliveries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel schedule',
        variant: 'destructive'
      });
    }
  };

  const handleSkipDelivery = async (instanceId: string) => {
    try {
      const { error } = await supabase.functions.invoke('shipping-logistics', {
        body: { 
          action: 'skip_delivery_instance', 
          instance_id: instanceId,
          reason: 'Skipped by customer'
        }
      });

      if (error) throw error;

      toast({
        title: 'Delivery Skipped',
        description: 'This delivery has been skipped'
      });

      fetchUpcomingDeliveries();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to skip delivery',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      delivery_address: '',
      delivery_city: '',
      delivery_state: '',
      delivery_zip: '',
      delivery_country: 'USA',
      product_type: 'diesel',
      quantity: 100,
      quantity_unit: 'barrels',
      frequency: 'weekly',
      frequency_interval: 7,
      preferred_day_of_week: 1,
      preferred_day_of_month: 1,
      preferred_time_window: 'morning',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      payment_method: 'invoice',
      stripe_payment_method_id: '',
      stripe_customer_id: '',
      auto_charge_enabled: false,
      auto_charge_days_before: 3,
      special_instructions: '',
      access_code: '',
      signature_required: true,
      contact_before_delivery: false,
      leave_at_location: false,
      notify_days_before: [7, 3, 1],
      notify_via_email: true,
      notify_via_sms: true
    });
  };

  const openEditModal = (schedule: RecurringSchedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      customer_name: schedule.customer_name,
      customer_email: schedule.customer_email,
      customer_phone: schedule.customer_phone || '',
      delivery_address: schedule.delivery_address,
      delivery_city: schedule.delivery_city || '',
      delivery_state: schedule.delivery_state || '',
      delivery_zip: schedule.delivery_zip || '',
      delivery_country: schedule.delivery_country || 'USA',
      product_type: schedule.product_type,
      quantity: schedule.quantity,
      quantity_unit: schedule.quantity_unit,
      frequency: schedule.frequency,
      frequency_interval: schedule.frequency_interval || 7,
      preferred_day_of_week: schedule.preferred_day_of_week || 1,
      preferred_day_of_month: schedule.preferred_day_of_month || 1,
      preferred_time_window: schedule.preferred_time_window,
      start_date: schedule.start_date,
      end_date: schedule.end_date || '',
      payment_method: schedule.payment_method,
      stripe_payment_method_id: schedule.stripe_payment_method_id || '',
      stripe_customer_id: schedule.stripe_customer_id || '',
      auto_charge_enabled: schedule.auto_charge_enabled,
      auto_charge_days_before: schedule.auto_charge_days_before,
      special_instructions: schedule.special_instructions || '',
      access_code: schedule.access_code || '',
      signature_required: schedule.signature_required,
      contact_before_delivery: schedule.contact_before_delivery,
      leave_at_location: schedule.leave_at_location,
      notify_days_before: schedule.notify_days_before || [7, 3, 1],
      notify_via_email: schedule.notify_via_email,
      notify_via_sms: schedule.notify_via_sms
    });
    setShowEditModal(true);
  };

  const getProductIcon = (type: string) => {
    const product = productTypes[type as keyof typeof productTypes];
    return product?.icon || Package;
  };

  const getFrequencyLabel = (frequency: string, interval?: number) => {
    switch (frequency) {
      case 'weekly': return 'Weekly';
      case 'bi_weekly': return 'Bi-Weekly';
      case 'monthly': return 'Monthly';
      case 'custom': return `Every ${interval} days`;
      default: return frequency;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysUntilDelivery = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delivery = new Date(dateStr);
    delivery.setHours(0, 0, 0, 0);
    const diff = Math.ceil((delivery.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const estimatedTotal = formData.quantity * (productTypes[formData.product_type as keyof typeof productTypes]?.unit_price || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Deliveries</h1>
          <p className="text-gray-600">Manage automated petroleum product deliveries</p>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          New Recurring Schedule
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Schedules</p>
                <p className="text-xl font-bold">{schedules.filter(s => s.status === 'active').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Pause className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Paused</p>
                <p className="text-xl font-bold">{schedules.filter(s => s.status === 'paused').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarDays className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Upcoming (30 days)</p>
                <p className="text-xl font-bold">{upcomingDeliveries.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Monthly Value</p>
                <p className="text-xl font-bold">
                  ${schedules.filter(s => s.status === 'active').reduce((sum, s) => {
                    const multiplier = s.frequency === 'weekly' ? 4 : s.frequency === 'bi_weekly' ? 2 : 1;
                    return sum + (s.estimated_total * multiplier);
                  }, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="schedules">Recurring Schedules</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming Deliveries</TabsTrigger>
        </TabsList>

        <TabsContent value="schedules" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Recurring Schedules</h3>
                <p className="text-gray-600 mb-4">Set up automated deliveries for your petroleum products</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Schedule
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => {
                const ProductIcon = getProductIcon(schedule.product_type);
                const product = productTypes[schedule.product_type as keyof typeof productTypes];
                const daysUntil = schedule.next_delivery_date ? getDaysUntilDelivery(schedule.next_delivery_date) : null;
                
                return (
                  <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          {/* Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-3 rounded-lg ${product?.color || 'bg-gray-100'}`}>
                                <ProductIcon className="h-6 w-6" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{schedule.product_name}</h3>
                                <p className="text-gray-600">{schedule.quantity} {schedule.quantity_unit} • {getFrequencyLabel(schedule.frequency, schedule.frequency_interval)}</p>
                              </div>
                            </div>
                            <Badge className={statusColors[schedule.status]}>
                              {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                            </Badge>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="flex items-start gap-2">
                              <Calendar className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm text-gray-600">Next Delivery</p>
                                <p className="font-medium">
                                  {schedule.next_delivery_date ? formatDate(schedule.next_delivery_date) : 'N/A'}
                                </p>
                                {daysUntil !== null && schedule.status === 'active' && (
                                  <p className={`text-xs ${daysUntil <= 3 ? 'text-orange-600' : 'text-gray-500'}`}>
                                    {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <Clock className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm text-gray-600">Time Window</p>
                                <p className="font-medium">
                                  {timeWindows[schedule.preferred_time_window as keyof typeof timeWindows]?.label || schedule.preferred_time_window}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm text-gray-600">Delivery Address</p>
                                <p className="font-medium truncate max-w-xs">{schedule.delivery_address}</p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <DollarSign className="h-4 w-4 text-gray-400 mt-1" />
                              <div>
                                <p className="text-sm text-gray-600">Est. per Delivery</p>
                                <p className="font-medium">${schedule.estimated_total?.toLocaleString()}</p>
                              </div>
                            </div>
                          </div>

                          {/* Payment & Notifications */}
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 text-gray-600">
                              <CreditCard className="h-4 w-4" />
                              {schedule.payment_method === 'auto_card' ? 'Auto-Pay' : schedule.payment_method === 'prepaid' ? 'Prepaid' : 'Invoice'}
                            </span>
                            {schedule.auto_charge_enabled && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                Auto-charge {schedule.auto_charge_days_before}d before
                              </Badge>
                            )}
                            {schedule.notify_via_email && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Mail className="h-4 w-4" />
                                Email
                              </span>
                            )}
                            {schedule.notify_via_sms && (
                              <span className="flex items-center gap-1 text-gray-600">
                                <Phone className="h-4 w-4" />
                                SMS
                              </span>
                            )}
                            <span className="text-gray-500">
                              {schedule.total_deliveries_made} deliveries made
                            </span>
                          </div>

                          {/* Paused Info */}
                          {schedule.status === 'paused' && schedule.paused_reason && (
                            <div className="bg-yellow-50 p-3 rounded-lg">
                              <p className="text-sm text-yellow-800">
                                <strong>Paused:</strong> {schedule.paused_reason}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                          {schedule.status === 'active' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditModal(schedule)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSchedule(schedule);
                                  setShowPauseModal(true);
                                }}
                                className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                              >
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </Button>
                            </>
                          )}
                          {schedule.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResumeSchedule(schedule)}
                              className="text-green-600 border-green-600 hover:bg-green-50"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Resume
                            </Button>
                          )}
                          {['active', 'paused'].includes(schedule.status) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSchedule(schedule);
                                setShowCancelModal(true);
                              }}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedSchedule(schedule);
                              setShowDetailsModal(true);
                            }}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {upcomingDeliveries.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarDays className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Upcoming Deliveries</h3>
                <p className="text-gray-600">No deliveries scheduled in the next 30 days</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {upcomingDeliveries.map((instance) => {
                const schedule = instance.recurring_delivery_schedules;
                const daysUntil = getDaysUntilDelivery(instance.scheduled_date);
                const ProductIcon = schedule ? getProductIcon(schedule.product_type) : Package;
                const product = schedule ? productTypes[schedule.product_type as keyof typeof productTypes] : null;

                return (
                  <Card key={instance.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${product?.color || 'bg-gray-100'}`}>
                            <ProductIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{schedule?.product_name || 'Delivery'}</h4>
                              <Badge className={instanceStatusColors[instance.status]}>
                                {instance.status}
                              </Badge>
                              {instance.payment_status === 'charged' && (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Paid
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(instance.scheduled_date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {timeWindows[instance.scheduled_time_window as keyof typeof timeWindows]?.label || instance.scheduled_time_window}
                              </span>
                              {schedule && (
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {schedule.quantity} {schedule.quantity_unit}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-sm font-medium ${daysUntil <= 1 ? 'text-orange-600' : daysUntil <= 3 ? 'text-yellow-600' : 'text-gray-600'}`}>
                              {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                            </p>
                            <p className="text-sm text-gray-500">${instance.payment_amount?.toLocaleString()}</p>
                          </div>
                          {instance.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSkipDelivery(instance.id)}
                              className="text-gray-600"
                            >
                              Skip
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Notification Status */}
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Bell className="h-3 w-3" />
                          Reminders:
                        </span>
                        <span className={instance.notification_7d_sent ? 'text-green-600' : ''}>
                          7 days {instance.notification_7d_sent ? '✓' : '○'}
                        </span>
                        <span className={instance.notification_3d_sent ? 'text-green-600' : ''}>
                          3 days {instance.notification_3d_sent ? '✓' : '○'}
                        </span>
                        <span className={instance.notification_1d_sent ? 'text-green-600' : ''}>
                          1 day {instance.notification_1d_sent ? '✓' : '○'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Schedule Modal */}
      <Dialog open={showCreateModal || showEditModal} onOpenChange={(open) => { setShowCreateModal(false); setShowEditModal(false); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditModal ? 'Edit Recurring Schedule' : 'Create Recurring Delivery Schedule'}</DialogTitle>
            <DialogDescription>
              Set up automated recurring deliveries for petroleum products
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Customer Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    placeholder="Company or Individual Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Address *</Label>
                  <Input
                    value={formData.delivery_address}
                    onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    placeholder="123 Industrial Blvd"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input
                    value={formData.delivery_city}
                    onChange={(e) => setFormData({ ...formData, delivery_city: e.target.value })}
                    placeholder="Houston"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={formData.delivery_state}
                    onChange={(e) => setFormData({ ...formData, delivery_state: e.target.value })}
                    placeholder="TX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ZIP Code</Label>
                  <Input
                    value={formData.delivery_zip}
                    onChange={(e) => setFormData({ ...formData, delivery_zip: e.target.value })}
                    placeholder="77001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={formData.delivery_country}
                    onChange={(e) => setFormData({ ...formData, delivery_country: e.target.value })}
                    placeholder="USA"
                  />
                </div>
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                Product Details
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Product Type *</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value) => setFormData({ ...formData, product_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(productTypes).map(([key, product]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <product.icon className="h-4 w-4" />
                            {product.name} (${product.unit_price}/barrel)
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity *</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select
                    value={formData.quantity_unit}
                    onValueChange={(value) => setFormData({ ...formData, quantity_unit: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="barrels">Barrels</SelectItem>
                      <SelectItem value="gallons">Gallons</SelectItem>
                      <SelectItem value="liters">Liters</SelectItem>
                      <SelectItem value="cubic_meters">Cubic Meters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-purple-800">Estimated Cost per Delivery:</span>
                  <span className="text-xl font-bold text-purple-900">${estimatedTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Schedule Frequency */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Delivery Schedule
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div>
                            <span className="font-medium">{opt.label}</span>
                            <span className="text-gray-500 ml-2">- {opt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.frequency === 'custom' && (
                  <div className="space-y-2">
                    <Label>Every X Days</Label>
                    <Input
                      type="number"
                      value={formData.frequency_interval}
                      onChange={(e) => setFormData({ ...formData, frequency_interval: parseInt(e.target.value) || 7 })}
                      min="1"
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(formData.frequency === 'weekly' || formData.frequency === 'bi_weekly') && (
                  <div className="space-y-2">
                    <Label>Preferred Day of Week</Label>
                    <Select
                      value={formData.preferred_day_of_week.toString()}
                      onValueChange={(value) => setFormData({ ...formData, preferred_day_of_week: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {daysOfWeek.map((day, index) => (
                          <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {formData.frequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Preferred Day of Month</Label>
                    <Select
                      value={formData.preferred_day_of_month.toString()}
                      onValueChange={(value) => setFormData({ ...formData, preferred_day_of_month: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Time Window</Label>
                  <Select
                    value={formData.preferred_time_window}
                    onValueChange={(value) => setFormData({ ...formData, preferred_time_window: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(timeWindows).map(([key, window]) => (
                        <SelectItem key={key} value={key}>{window.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                  />
                  <p className="text-xs text-gray-500">Leave empty for indefinite schedule</p>
                </div>
              </div>
            </div>

            {/* Payment Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Settings
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice (Pay Later)</SelectItem>
                      <SelectItem value="auto_card">Auto-Charge Card</SelectItem>
                      <SelectItem value="prepaid">Prepaid Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.payment_method === 'auto_card' && (
                  <div className="space-y-2">
                    <Label>Charge Days Before Delivery</Label>
                    <Select
                      value={formData.auto_charge_days_before.toString()}
                      onValueChange={(value) => setFormData({ ...formData, auto_charge_days_before: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day before</SelectItem>
                        <SelectItem value="2">2 days before</SelectItem>
                        <SelectItem value="3">3 days before</SelectItem>
                        <SelectItem value="5">5 days before</SelectItem>
                        <SelectItem value="7">7 days before</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {formData.payment_method === 'auto_card' && (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <Label>Enable Auto-Charge</Label>
                  </div>
                  <Switch
                    checked={formData.auto_charge_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_charge_enabled: checked })}
                  />
                </div>
              )}
            </div>

            {/* Delivery Preferences */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Delivery Preferences
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <Label>Signature Required</Label>
                  </div>
                  <Switch
                    checked={formData.signature_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, signature_required: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <Label>Contact Before Delivery</Label>
                  </div>
                  <Switch
                    checked={formData.contact_before_delivery}
                    onCheckedChange={(checked) => setFormData({ ...formData, contact_before_delivery: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Home className="h-4 w-4 text-gray-500" />
                    <Label>Leave at Location (No Signature)</Label>
                  </div>
                  <Switch
                    checked={formData.leave_at_location}
                    onCheckedChange={(checked) => setFormData({ ...formData, leave_at_location: checked })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Access Code</Label>
                <Input
                  value={formData.access_code}
                  onChange={(e) => setFormData({ ...formData, access_code: e.target.value })}
                  placeholder="Gate code, facility access, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Special Instructions</Label>
                <Textarea
                  value={formData.special_instructions}
                  onChange={(e) => setFormData({ ...formData, special_instructions: e.target.value })}
                  placeholder="Any special delivery instructions..."
                  rows={3}
                />
              </div>
            </div>

            {/* Notification Settings */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Reminder Notifications
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <Label>Email Reminders</Label>
                  </div>
                  <Switch
                    checked={formData.notify_via_email}
                    onCheckedChange={(checked) => setFormData({ ...formData, notify_via_email: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <Label>SMS Reminders</Label>
                  </div>
                  <Switch
                    checked={formData.notify_via_sms}
                    onCheckedChange={(checked) => setFormData({ ...formData, notify_via_sms: checked })}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                You'll receive reminders 7 days, 3 days, and 1 day before each scheduled delivery
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
              Cancel
            </Button>
            <Button 
              onClick={showEditModal ? handleUpdateSchedule : handleCreateSchedule} 
              className="bg-purple-600 hover:bg-purple-700"
            >
              {showEditModal ? 'Update Schedule' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pause Modal */}
      <Dialog open={showPauseModal} onOpenChange={setShowPauseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pause Recurring Schedule</DialogTitle>
            <DialogDescription>
              Temporarily pause this recurring delivery schedule. You can resume it anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSchedule && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="font-medium">{selectedSchedule.product_name}</p>
                <p className="text-sm text-gray-600">
                  {selectedSchedule.quantity} {selectedSchedule.quantity_unit} • {getFrequencyLabel(selectedSchedule.frequency)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for Pausing (Optional)</Label>
              <Textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="e.g., Temporary facility closure, inventory adjustment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPauseModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePauseSchedule} className="bg-yellow-600 hover:bg-yellow-700">
              <Pause className="h-4 w-4 mr-2" />
              Pause Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Recurring Schedule</DialogTitle>
            <DialogDescription>
              This will permanently cancel the recurring delivery schedule. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedSchedule && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 text-red-800 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Warning</span>
                </div>
                <p className="text-sm text-red-700">
                  Cancelling will stop all future deliveries for {selectedSchedule.product_name}.
                  Any pending deliveries will also be cancelled.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Reason for Cancellation</Label>
              <Textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please provide a reason for cancellation..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelModal(false)}>
              Keep Schedule
            </Button>
            <Button onClick={handleCancelSchedule} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Cancel Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Schedule Details</DialogTitle>
          </DialogHeader>
          {selectedSchedule && (
            <div className="space-y-6 py-4">
              <div className="flex items-center gap-4">
                {(() => {
                  const ProductIcon = getProductIcon(selectedSchedule.product_type);
                  const product = productTypes[selectedSchedule.product_type as keyof typeof productTypes];
                  return (
                    <div className={`p-4 rounded-lg ${product?.color || 'bg-gray-100'}`}>
                      <ProductIcon className="h-8 w-8" />
                    </div>
                  );
                })()}
                <div>
                  <h3 className="text-xl font-semibold">{selectedSchedule.product_name}</h3>
                  <p className="text-gray-600">
                    {selectedSchedule.quantity} {selectedSchedule.quantity_unit} • {getFrequencyLabel(selectedSchedule.frequency, selectedSchedule.frequency_interval)}
                  </p>
                </div>
                <Badge className={`ml-auto ${statusColors[selectedSchedule.status]}`}>
                  {selectedSchedule.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Customer</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Name:</span> {selectedSchedule.customer_name}</p>
                    <p><span className="text-gray-500">Email:</span> {selectedSchedule.customer_email}</p>
                    {selectedSchedule.customer_phone && (
                      <p><span className="text-gray-500">Phone:</span> {selectedSchedule.customer_phone}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Delivery Address</h4>
                  <div className="text-sm">
                    <p>{selectedSchedule.delivery_address}</p>
                    {selectedSchedule.delivery_city && (
                      <p>{selectedSchedule.delivery_city}, {selectedSchedule.delivery_state} {selectedSchedule.delivery_zip}</p>
                    )}
                    <p>{selectedSchedule.delivery_country}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Schedule</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Frequency:</span> {getFrequencyLabel(selectedSchedule.frequency, selectedSchedule.frequency_interval)}</p>
                    <p><span className="text-gray-500">Time Window:</span> {timeWindows[selectedSchedule.preferred_time_window as keyof typeof timeWindows]?.label}</p>
                    <p><span className="text-gray-500">Start Date:</span> {formatDate(selectedSchedule.start_date)}</p>
                    {selectedSchedule.end_date && (
                      <p><span className="text-gray-500">End Date:</span> {formatDate(selectedSchedule.end_date)}</p>
                    )}
                    <p><span className="text-gray-500">Next Delivery:</span> {selectedSchedule.next_delivery_date ? formatDate(selectedSchedule.next_delivery_date) : 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-900">Payment</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">Method:</span> {selectedSchedule.payment_method === 'auto_card' ? 'Auto-Charge Card' : selectedSchedule.payment_method === 'prepaid' ? 'Prepaid' : 'Invoice'}</p>
                    <p><span className="text-gray-500">Est. per Delivery:</span> ${selectedSchedule.estimated_total?.toLocaleString()}</p>
                    <p><span className="text-gray-500">Total Deliveries:</span> {selectedSchedule.total_deliveries_made}</p>
                    {selectedSchedule.auto_charge_enabled && (
                      <p><span className="text-gray-500">Auto-charge:</span> {selectedSchedule.auto_charge_days_before} days before</p>
                    )}
                  </div>
                </div>
              </div>

              {selectedSchedule.special_instructions && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Special Instructions</h4>
                  <p className="text-sm bg-gray-50 p-3 rounded-lg">{selectedSchedule.special_instructions}</p>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>Created: {formatDate(selectedSchedule.created_at)}</span>
                {selectedSchedule.paused_at && (
                  <span>Paused: {formatDate(selectedSchedule.paused_at)}</span>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
            {selectedSchedule?.status === 'active' && (
              <Button onClick={() => { setShowDetailsModal(false); openEditModal(selectedSchedule); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Schedule
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
