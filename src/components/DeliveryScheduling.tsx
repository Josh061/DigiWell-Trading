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
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Package, 
  Bell, 
  Edit, 
  Download,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Check,
  X,
  Home,
  Key,
  FileText,
  Phone,
  Mail,
  AlertCircle,
  Truck
} from 'lucide-react';

interface DeliverySchedule {
  id: string;
  order_id: string;
  shipment_id: string;
  recipient_id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_phone: string;
  delivery_address: string;
  preferred_date: string;
  time_window: string;
  time_window_start: string;
  time_window_end: string;
  special_instructions: string;
  access_code: string;
  leave_at_door: boolean;
  signature_required: boolean;
  contact_before_delivery: boolean;
  status: string;
  original_date: string;
  reschedule_count: number;
  reschedule_reason: string;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  reminder_email: boolean;
  reminder_sms: boolean;
  created_at: string;
  confirmed_at: string;
  completed_at: string;
}

interface TimeWindow {
  id: string;
  start: string;
  end: string;
  label: string;
  available?: boolean;
  slots_remaining?: number;
}

const defaultTimeWindows: Record<string, TimeWindow> = {
  morning: { id: 'morning', start: '08:00', end: '12:00', label: 'Morning (8 AM - 12 PM)' },
  afternoon: { id: 'afternoon', start: '12:00', end: '17:00', label: 'Afternoon (12 PM - 5 PM)' },
  evening: { id: 'evening', start: '17:00', end: '21:00', label: 'Evening (5 PM - 9 PM)' },
  all_day: { id: 'all_day', start: '08:00', end: '21:00', label: 'All Day (8 AM - 9 PM)' }
};

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  rescheduled: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

export default function DeliveryScheduling() {
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState<DeliverySchedule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, DeliverySchedule[]>>({});
  const [availableWindows, setAvailableWindows] = useState<TimeWindow[]>([]);
  const [activeTab, setActiveTab] = useState('list');

  // Form states
  const [formData, setFormData] = useState({
    order_id: '',
    shipment_id: '',
    recipient_name: '',
    recipient_email: '',
    recipient_phone: '',
    delivery_address: '',
    preferred_date: '',
    time_window: 'morning',
    special_instructions: '',
    access_code: '',
    leave_at_door: false,
    signature_required: true,
    contact_before_delivery: false,
    reminder_email: true,
    reminder_sms: true
  });

  const [rescheduleData, setRescheduleData] = useState({
    new_date: '',
    new_time_window: '',
    reason: ''
  });

  const [instructionsData, setInstructionsData] = useState({
    special_instructions: '',
    access_code: '',
    leave_at_door: false,
    signature_required: true,
    contact_before_delivery: false
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendarData();
    }
  }, [activeTab, calendarDate]);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_schedules', limit: 100 }
      });

      if (error) throw error;
      setSchedules(data.schedules || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch schedules',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: {
          action: 'get_calendar_data',
          month: calendarDate.getMonth() + 1,
          year: calendarDate.getFullYear()
        }
      });

      if (error) throw error;
      setCalendarData(data.calendar_data || {});
    } catch (error: any) {
      console.error('Failed to fetch calendar data:', error);
    }
  };

  const fetchAvailableWindows = async (date: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'get_available_time_windows', date }
      });

      if (error) throw error;
      setAvailableWindows(data.time_windows || []);
    } catch (error: any) {
      console.error('Failed to fetch available windows:', error);
      setAvailableWindows(Object.values(defaultTimeWindows));
    }
  };

  const handleCreateSchedule = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'create_schedule', ...formData }
      });

      if (error) throw error;

      toast({
        title: 'Schedule Created',
        description: 'Delivery has been scheduled successfully'
      });

      setShowCreateModal(false);
      fetchSchedules();
      
      // Download ICS file
      if (data.ics_content) {
        downloadICS(data.ics_content, `delivery-${data.schedule.id}.ics`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create schedule',
        variant: 'destructive'
      });
    }
  };

  const handleReschedule = async () => {
    if (!selectedSchedule) return;

    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: {
          action: 'reschedule',
          schedule_id: selectedSchedule.id,
          ...rescheduleData
        }
      });

      if (error) throw error;

      toast({
        title: 'Rescheduled',
        description: 'Delivery has been rescheduled successfully'
      });

      setShowRescheduleModal(false);
      fetchSchedules();

      if (data.ics_content) {
        downloadICS(data.ics_content, `delivery-rescheduled-${selectedSchedule.id}.ics`);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reschedule',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateInstructions = async () => {
    if (!selectedSchedule) return;

    try {
      const { error } = await supabase.functions.invoke('shipping-logistics', {
        body: {
          action: 'update_instructions',
          schedule_id: selectedSchedule.id,
          ...instructionsData
        }
      });

      if (error) throw error;

      toast({
        title: 'Updated',
        description: 'Delivery instructions updated successfully'
      });

      setShowInstructionsModal(false);
      fetchSchedules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update instructions',
        variant: 'destructive'
      });
    }
  };

  const handleConfirmSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'confirm_schedule', schedule_id: scheduleId }
      });

      if (error) throw error;

      toast({
        title: 'Confirmed',
        description: 'Delivery schedule confirmed'
      });

      fetchSchedules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to confirm schedule',
        variant: 'destructive'
      });
    }
  };

  const handleCancelSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'cancel_schedule', schedule_id: scheduleId, reason: 'Cancelled by user' }
      });

      if (error) throw error;

      toast({
        title: 'Cancelled',
        description: 'Delivery schedule cancelled'
      });

      fetchSchedules();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel schedule',
        variant: 'destructive'
      });
    }
  };

  const handleSendReminder = async (scheduleId: string, type: string) => {
    try {
      const { error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'send_reminder', schedule_id: scheduleId, reminder_type: type }
      });

      if (error) throw error;

      toast({
        title: 'Reminder Sent',
        description: `${type} reminder sent successfully`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send reminder',
        variant: 'destructive'
      });
    }
  };

  const downloadICS = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadICS = async (scheduleId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('shipping-logistics', {
        body: { action: 'generate_ics', schedule_id: scheduleId }
      });

      if (error) throw error;

      downloadICS(data.ics_content, `delivery-${scheduleId}.ics`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to download calendar file',
        variant: 'destructive'
      });
    }
  };

  const openRescheduleModal = (schedule: DeliverySchedule) => {
    setSelectedSchedule(schedule);
    setRescheduleData({
      new_date: schedule.preferred_date,
      new_time_window: schedule.time_window,
      reason: ''
    });
    fetchAvailableWindows(schedule.preferred_date);
    setShowRescheduleModal(true);
  };

  const openInstructionsModal = (schedule: DeliverySchedule) => {
    setSelectedSchedule(schedule);
    setInstructionsData({
      special_instructions: schedule.special_instructions || '',
      access_code: schedule.access_code || '',
      leave_at_door: schedule.leave_at_door,
      signature_required: schedule.signature_required,
      contact_before_delivery: schedule.contact_before_delivery
    });
    setShowInstructionsModal(true);
  };

  const getTimeWindowLabel = (window: string, start?: string, end?: string) => {
    if (defaultTimeWindows[window]) {
      return defaultTimeWindows[window].label;
    }
    return `${start} - ${end}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCalendarDate(newDate);
  };

  const getDaysInMonth = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    const days = [];
    
    // Previous month's days
    for (let i = 0; i < startingDay; i++) {
      const prevDate = new Date(year, month, -startingDay + i + 1);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month's days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return calendarData[dateStr] || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Scheduling</h1>
          <p className="text-gray-600">Manage delivery time windows and preferences</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Delivery
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Scheduled</p>
                <p className="text-xl font-bold">{schedules.filter(s => s.status === 'scheduled').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Confirmed</p>
                <p className="text-xl font-bold">{schedules.filter(s => s.status === 'confirmed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rescheduled</p>
                <p className="text-xl font-bold">{schedules.filter(s => s.status === 'rescheduled').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Truck className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-xl font-bold">{schedules.filter(s => s.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : schedules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Scheduled Deliveries</h3>
                <p className="text-gray-600 mb-4">Schedule your first delivery to get started</p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Delivery
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {schedules.map((schedule) => (
                <Card key={schedule.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-3">
                          <Badge className={statusColors[schedule.status]}>
                            {schedule.status.charAt(0).toUpperCase() + schedule.status.slice(1)}
                          </Badge>
                          {schedule.reschedule_count > 0 && (
                            <Badge variant="outline" className="text-yellow-600">
                              Rescheduled {schedule.reschedule_count}x
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex items-start gap-2">
                            <CalendarIcon className="h-4 w-4 text-gray-400 mt-1" />
                            <div>
                              <p className="text-sm text-gray-600">Date</p>
                              <p className="font-medium">{formatDate(schedule.preferred_date)}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Clock className="h-4 w-4 text-gray-400 mt-1" />
                            <div>
                              <p className="text-sm text-gray-600">Time Window</p>
                              <p className="font-medium">
                                {getTimeWindowLabel(schedule.time_window, schedule.time_window_start, schedule.time_window_end)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-gray-400 mt-1" />
                            <div>
                              <p className="text-sm text-gray-600">Address</p>
                              <p className="font-medium truncate max-w-xs">{schedule.delivery_address}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {schedule.recipient_name}
                          </span>
                          {schedule.signature_required && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              Signature Required
                            </span>
                          )}
                          {schedule.leave_at_door && (
                            <span className="flex items-center gap-1">
                              <Home className="h-4 w-4" />
                              Leave at Door
                            </span>
                          )}
                          {schedule.access_code && (
                            <span className="flex items-center gap-1">
                              <Key className="h-4 w-4" />
                              Access Code Set
                            </span>
                          )}
                        </div>

                        {schedule.special_instructions && (
                          <div className="bg-yellow-50 p-3 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              <strong>Instructions:</strong> {schedule.special_instructions}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {schedule.status === 'scheduled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConfirmSchedule(schedule.id)}
                            className="text-green-600 border-green-600 hover:bg-green-50"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Confirm
                          </Button>
                        )}
                        {['scheduled', 'confirmed', 'rescheduled'].includes(schedule.status) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRescheduleModal(schedule)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openInstructionsModal(schedule)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Instructions
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadICS(schedule.id)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Calendar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSendReminder(schedule.id, '24h')}
                            >
                              <Bell className="h-4 w-4 mr-1" />
                              Remind
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelSchedule(schedule.id)}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                    {day}
                  </div>
                ))}
                {getDaysInMonth().map(({ date, isCurrentMonth }, index) => {
                  const daySchedules = getSchedulesForDate(date);
                  const isToday = date.toDateString() === new Date().toDateString();
                  
                  return (
                    <div
                      key={index}
                      className={`min-h-24 p-1 border rounded-lg ${
                        isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                      } ${isToday ? 'border-emerald-500 border-2' : 'border-gray-200'}`}
                    >
                      <div className={`text-sm font-medium mb-1 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      } ${isToday ? 'text-emerald-600' : ''}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {daySchedules.slice(0, 2).map((s) => (
                          <div
                            key={s.id}
                            className={`text-xs p-1 rounded truncate cursor-pointer ${statusColors[s.status]}`}
                            onClick={() => {
                              setSelectedSchedule(s);
                              openInstructionsModal(s);
                            }}
                          >
                            {s.time_window_start} - {s.recipient_name}
                          </div>
                        ))}
                        {daySchedules.length > 2 && (
                          <div className="text-xs text-gray-500 text-center">
                            +{daySchedules.length - 2} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Schedule Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule New Delivery</DialogTitle>
            <DialogDescription>
              Choose your preferred delivery date, time window, and provide any special instructions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Recipient Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Recipient Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipient Name</Label>
                  <Input
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.recipient_email}
                    onChange={(e) => setFormData({ ...formData, recipient_email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={formData.recipient_phone}
                    onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delivery Address</Label>
                  <Input
                    value={formData.delivery_address}
                    onChange={(e) => setFormData({ ...formData, delivery_address: e.target.value })}
                    placeholder="123 Main St, City, Country"
                  />
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Delivery Date & Time</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    value={formData.preferred_date}
                    onChange={(e) => {
                      setFormData({ ...formData, preferred_date: e.target.value });
                      fetchAvailableWindows(e.target.value);
                    }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time Window</Label>
                  <Select
                    value={formData.time_window}
                    onValueChange={(value) => setFormData({ ...formData, time_window: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select time window" />
                    </SelectTrigger>
                    <SelectContent>
                      {(availableWindows.length > 0 ? availableWindows : Object.values(defaultTimeWindows)).map((window) => (
                        <SelectItem
                          key={window.id}
                          value={window.id}
                          disabled={window.available === false}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{window.label}</span>
                            {window.slots_remaining !== undefined && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({window.slots_remaining} slots)
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Delivery Preferences */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Delivery Preferences</h3>
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
                    <Home className="h-4 w-4 text-gray-500" />
                    <Label>Leave at Door</Label>
                  </div>
                  <Switch
                    checked={formData.leave_at_door}
                    onCheckedChange={(checked) => setFormData({ ...formData, leave_at_door: checked })}
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
              </div>
              <div className="space-y-2">
                <Label>Access Code (if applicable)</Label>
                <Input
                  value={formData.access_code}
                  onChange={(e) => setFormData({ ...formData, access_code: e.target.value })}
                  placeholder="Gate code, building access, etc."
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

            {/* Reminder Preferences */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Reminder Notifications</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <Label>Email Reminders</Label>
                  </div>
                  <Switch
                    checked={formData.reminder_email}
                    onCheckedChange={(checked) => setFormData({ ...formData, reminder_email: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <Label>SMS Reminders</Label>
                  </div>
                  <Switch
                    checked={formData.reminder_sms}
                    onCheckedChange={(checked) => setFormData({ ...formData, reminder_sms: checked })}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500">
                You'll receive reminders 24 hours and 2 hours before your scheduled delivery
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule} className="bg-emerald-600 hover:bg-emerald-700">
              Schedule Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Delivery</DialogTitle>
            <DialogDescription>
              Choose a new date and time for your delivery
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedSchedule && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Current Schedule:</p>
                <p className="font-medium">
                  {formatDate(selectedSchedule.preferred_date)} - {getTimeWindowLabel(selectedSchedule.time_window)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>New Date</Label>
              <Input
                type="date"
                value={rescheduleData.new_date}
                onChange={(e) => {
                  setRescheduleData({ ...rescheduleData, new_date: e.target.value });
                  fetchAvailableWindows(e.target.value);
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-2">
              <Label>New Time Window</Label>
              <Select
                value={rescheduleData.new_time_window}
                onValueChange={(value) => setRescheduleData({ ...rescheduleData, new_time_window: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time window" />
                </SelectTrigger>
                <SelectContent>
                  {(availableWindows.length > 0 ? availableWindows : Object.values(defaultTimeWindows)).map((window) => (
                    <SelectItem key={window.id} value={window.id} disabled={window.available === false}>
                      {window.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason for Rescheduling</Label>
              <Textarea
                value={rescheduleData.reason}
                onChange={(e) => setRescheduleData({ ...rescheduleData, reason: e.target.value })}
                placeholder="Optional: Why are you rescheduling?"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRescheduleModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleReschedule} className="bg-yellow-600 hover:bg-yellow-700">
              Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Instructions Modal */}
      <Dialog open={showInstructionsModal} onOpenChange={setShowInstructionsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Delivery Instructions</DialogTitle>
            <DialogDescription>
              Modify special instructions and delivery preferences
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <Label>Signature Required</Label>
                </div>
                <Switch
                  checked={instructionsData.signature_required}
                  onCheckedChange={(checked) => setInstructionsData({ ...instructionsData, signature_required: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-500" />
                  <Label>Leave at Door</Label>
                </div>
                <Switch
                  checked={instructionsData.leave_at_door}
                  onCheckedChange={(checked) => setInstructionsData({ ...instructionsData, leave_at_door: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <Label>Contact Before Delivery</Label>
                </div>
                <Switch
                  checked={instructionsData.contact_before_delivery}
                  onCheckedChange={(checked) => setInstructionsData({ ...instructionsData, contact_before_delivery: checked })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Access Code</Label>
              <Input
                value={instructionsData.access_code}
                onChange={(e) => setInstructionsData({ ...instructionsData, access_code: e.target.value })}
                placeholder="Gate code, building access, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Special Instructions</Label>
              <Textarea
                value={instructionsData.special_instructions}
                onChange={(e) => setInstructionsData({ ...instructionsData, special_instructions: e.target.value })}
                placeholder="Any special delivery instructions..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInstructionsModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateInstructions}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
