import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import {
  MapPin, Truck, Clock, Package, Star, Phone, Mail, Calendar,
  Navigation, RefreshCw, CheckCircle, AlertCircle, MessageSquare,
  Bell, BellOff, ChevronRight, User, Fuel, ThumbsUp, ThumbsDown,
  Edit, Send, X, Search, Home, FileText, Settings, ArrowLeft
} from 'lucide-react';

interface DeliveryStatus {
  tracking_code: string;
  customer_name: string;
  delivery: {
    status: string;
    product_type: string;
    quantity: number;
    unit: string;
    address: string;
    scheduled_date: string;
    time_window_start: string;
    time_window_end: string;
    estimated_arrival: string;
    stop_order: number;
    special_instructions: string;
  };
  route: {
    status: string;
    driver_name: string;
    vehicle_type: string;
    started_at: string;
    completed_at: string;
  };
  driver_location: {
    latitude: number;
    longitude: number;
    heading: number;
    speed: number;
    updated_at: string;
  } | null;
  estimated_eta_minutes: number | null;
  custom_instructions: any;
  confirmation: any;
  has_rated: boolean;
}

const CustomerTrackingPortal: React.FC = () => {
  const [trackingCode, setTrackingCode] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('track');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState({ sms: true, email: true });
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  // Rating state
  const [ratings, setRatings] = useState({
    overall: 5,
    driver: 5,
    timeliness: 5,
    communication: 5
  });
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackTags, setFeedbackTags] = useState<string[]>([]);
  const [wouldRecommend, setWouldRecommend] = useState(true);

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTimeStart, setRescheduleTimeStart] = useState('');
  const [rescheduleTimeEnd, setRescheduleTimeEnd] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  // Instructions state
  const [instructions, setInstructions] = useState('');
  const [gateCode, setGateCode] = useState('');
  const [contactOnArrival, setContactOnArrival] = useState(false);
  const [leaveAtDoor, setLeaveAtDoor] = useState(false);

  const feedbackTagOptions = [
    'Friendly Driver', 'On Time', 'Professional', 'Clean Vehicle',
    'Good Communication', 'Careful Handling', 'Quick Delivery', 'Helpful'
  ];

  const trackDelivery = async () => {
    if (!trackingCode.trim()) {
      setError('Please enter a tracking code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase.functions.invoke('customer-tracking', {
        body: { action: 'get_delivery_status', tracking_code: trackingCode.toUpperCase() }
      });

      if (fetchError) throw fetchError;
      if (data.error) throw new Error(data.error);

      setDeliveryStatus(data);
      setNotificationPrefs(data.notification_preferences || { sms: true, email: true });

      // Pre-fill instructions if they exist
      if (data.custom_instructions) {
        setInstructions(data.custom_instructions.instructions || '');
        setGateCode(data.custom_instructions.gate_code || '');
        setContactOnArrival(data.custom_instructions.contact_on_arrival || false);
        setLeaveAtDoor(data.custom_instructions.leave_at_door || false);
      }

      // Start auto-refresh if delivery is in progress
      if (data.route?.status === 'in_progress') {
        startAutoRefresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to find delivery');
      setDeliveryStatus(null);
    } finally {
      setLoading(false);
    }
  };

  const startAutoRefresh = () => {
    if (refreshInterval) clearInterval(refreshInterval);
    const interval = setInterval(() => {
      if (trackingCode) {
        refreshLocation();
      }
    }, 30000); // Refresh every 30 seconds
    setRefreshInterval(interval);
  };

  const refreshLocation = async () => {
    if (!trackingCode) return;

    try {
      const { data } = await supabase.functions.invoke('customer-tracking', {
        body: { action: 'get_driver_location', tracking_code: trackingCode.toUpperCase() }
      });

      if (data && deliveryStatus) {
        setDeliveryStatus({
          ...deliveryStatus,
          driver_location: data.driver_location,
          estimated_eta_minutes: data.estimated_eta_minutes
        });
      }
    } catch (err) {
      console.error('Failed to refresh location:', err);
    }
  };

  const submitRating = async () => {
    if (!deliveryStatus) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-tracking', {
        body: {
          action: 'submit_rating',
          tracking_code: deliveryStatus.tracking_code,
          overall_rating: ratings.overall,
          driver_rating: ratings.driver,
          timeliness_rating: ratings.timeliness,
          communication_rating: ratings.communication,
          feedback_text: feedbackText,
          feedback_tags: feedbackTags,
          would_recommend: wouldRecommend
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setShowRatingModal(false);
      setDeliveryStatus({ ...deliveryStatus, has_rated: true });
      alert('Thank you for your feedback!');
    } catch (err: any) {
      alert(err.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const submitReschedule = async () => {
    if (!deliveryStatus || !rescheduleDate) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-tracking', {
        body: {
          action: 'request_reschedule',
          tracking_code: deliveryStatus.tracking_code,
          requested_date: rescheduleDate,
          requested_time_start: rescheduleTimeStart || null,
          requested_time_end: rescheduleTimeEnd || null,
          reason: rescheduleReason
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setShowRescheduleModal(false);
      alert('Reschedule request submitted! We will notify you once it\'s processed.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit reschedule request');
    } finally {
      setLoading(false);
    }
  };

  const updateInstructions = async () => {
    if (!deliveryStatus) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-tracking', {
        body: {
          action: 'update_delivery_instructions',
          tracking_code: deliveryStatus.tracking_code,
          instructions,
          gate_code: gateCode,
          contact_on_arrival: contactOnArrival,
          leave_at_door: leaveAtDoor
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setShowInstructionsModal(false);
      alert('Delivery instructions updated!');
    } catch (err: any) {
      alert(err.message || 'Failed to update instructions');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationPrefs = async (prefs: { sms: boolean; email: boolean }) => {
    if (!deliveryStatus) return;

    try {
      await supabase.functions.invoke('customer-tracking', {
        body: {
          action: 'update_notification_preferences',
          tracking_code: deliveryStatus.tracking_code,
          ...prefs
        }
      });
      setNotificationPrefs(prefs);
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': case 'arrived': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'skipped': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Delivered';
      case 'in_progress': return 'Out for Delivery';
      case 'arrived': return 'Driver Arrived';
      case 'pending': return 'Scheduled';
      case 'skipped': return 'Skipped';
      default: return status;
    }
  };

  const getProductIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'diesel': return '⛽';
      case 'gasoline': case 'petrol': return '🛢️';
      case 'lpg': return '🔥';
      case 'kerosene': return '💧';
      default: return '📦';
    }
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const StarRating = ({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) => (
    <div className="space-y-1">
      <Label className="text-sm text-gray-600">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => onChange(star)}
            className={`p-1 transition-colors ${star <= value ? 'text-yellow-400' : 'text-gray-300'}`}
          >
            <Star className="w-6 h-6 fill-current" />
          </button>
        ))}
      </div>
    </div>
  );

  // Tracking Entry View
  const TrackingEntry = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-amber-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Truck className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-2xl">Track Your Delivery</CardTitle>
          <p className="text-blue-100 mt-2">Enter your tracking code to see real-time updates</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Code</Label>
            <div className="relative">
              <Input
                id="tracking"
                placeholder="e.g., TRK-ABC12345"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                onKeyPress={(e) => e.key === 'Enter' && trackDelivery()}
                className="pl-10 text-lg font-mono"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          <Button
            onClick={trackDelivery}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <RefreshCw className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Navigation className="w-5 h-5 mr-2" />
            )}
            Track Delivery
          </Button>

          <div className="text-center text-sm text-gray-500 pt-4 border-t">
            <p>Your tracking code was sent via SMS or email</p>
            <p className="mt-1">when your delivery was scheduled.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Main Tracking View
  const TrackingView = () => {
    if (!deliveryStatus) return <TrackingEntry />;

    const { delivery, route, driver_location, estimated_eta_minutes, confirmation, has_rated } = deliveryStatus;
    const isInProgress = route?.status === 'in_progress';
    const isCompleted = delivery?.status === 'completed';

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sticky top-0 z-10">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => setDeliveryStatus(null)} className="p-2 hover:bg-white/10 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex-1">
                <p className="text-blue-100 text-sm">Tracking Code</p>
                <p className="font-mono font-bold">{deliveryStatus.tracking_code}</p>
              </div>
              <button onClick={refreshLocation} className="p-2 hover:bg-white/10 rounded-lg">
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto p-4 space-y-4">
          {/* Status Card */}
          <Card className="overflow-hidden">
            <div className={`p-4 text-white ${isCompleted ? 'bg-green-500' : isInProgress ? 'bg-blue-500' : 'bg-yellow-500'}`}>
              <div className="flex items-center gap-3">
                {isCompleted ? (
                  <CheckCircle className="w-8 h-8" />
                ) : isInProgress ? (
                  <Truck className="w-8 h-8" />
                ) : (
                  <Clock className="w-8 h-8" />
                )}
                <div>
                  <h2 className="text-xl font-bold">{getStatusText(delivery?.status)}</h2>
                  {estimated_eta_minutes && !isCompleted && (
                    <p className="text-white/90">Estimated arrival in {estimated_eta_minutes} minutes</p>
                  )}
                  {isCompleted && confirmation && (
                    <p className="text-white/90">Delivered at {new Date(confirmation.completed_at).toLocaleTimeString()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                {['Scheduled', 'Out for Delivery', 'Arrived', 'Delivered'].map((step, idx) => {
                  const stepStatus = delivery?.status;
                  const isActive = 
                    (idx === 0) ||
                    (idx === 1 && ['in_progress', 'arrived', 'completed'].includes(stepStatus)) ||
                    (idx === 2 && ['arrived', 'completed'].includes(stepStatus)) ||
                    (idx === 3 && stepStatus === 'completed');
                  
                  return (
                    <div key={step} className="flex flex-col items-center flex-1">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isActive ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {idx === 3 && isActive ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                      </div>
                      <span className={`text-xs mt-1 text-center ${isActive ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex mt-2">
                {[0, 1, 2].map((idx) => {
                  const stepStatus = delivery?.status;
                  const isActive = 
                    (idx === 0 && ['in_progress', 'arrived', 'completed'].includes(stepStatus)) ||
                    (idx === 1 && ['arrived', 'completed'].includes(stepStatus)) ||
                    (idx === 2 && stepStatus === 'completed');
                  
                  return (
                    <div key={idx} className={`flex-1 h-1 mx-1 rounded ${isActive ? 'bg-blue-500' : 'bg-gray-200'}`} />
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Live Map (when driver is en route) */}
          {isInProgress && driver_location && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-blue-500" />
                  Live Driver Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  ref={mapRef}
                  className="h-48 bg-gradient-to-br from-blue-100 to-green-100 rounded-lg flex items-center justify-center relative overflow-hidden"
                >
                  {/* Simplified map visualization */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-1/4 left-1/4 w-32 h-32 border-2 border-blue-300 rounded-full" />
                    <div className="absolute top-1/3 right-1/4 w-24 h-24 border-2 border-green-300 rounded-full" />
                  </div>
                  
                  {/* Driver marker */}
                  <div className="absolute" style={{ 
                    left: '30%', 
                    top: '40%',
                    transform: `rotate(${driver_location.heading || 0}deg)`
                  }}>
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                      <Truck className="w-5 h-5 text-white" />
                    </div>
                  </div>

                  {/* Destination marker */}
                  <div className="absolute" style={{ left: '70%', top: '60%' }}>
                    <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                      <MapPin className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Route line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line 
                      x1="35%" y1="45%" 
                      x2="72%" y2="63%" 
                      stroke="#3b82f6" 
                      strokeWidth="3" 
                      strokeDasharray="8,4"
                    />
                  </svg>
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{route?.driver_name || 'Driver'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>Updated {new Date(driver_location.updated_at).toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Delivery Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-500" />
                Delivery Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-3 bg-amber-50 rounded-lg">
                <div className="text-3xl">{getProductIcon(delivery?.product_type)}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{delivery?.product_type}</h3>
                  <p className="text-gray-600">{delivery?.quantity} {delivery?.unit}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Delivery Address</p>
                    <p className="font-medium">{delivery?.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Scheduled Date</p>
                    <p className="font-medium">{formatDate(delivery?.scheduled_date)}</p>
                  </div>
                </div>

                {(delivery?.time_window_start || delivery?.time_window_end) && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Time Window</p>
                      <p className="font-medium">
                        {formatTime(delivery?.time_window_start)} - {formatTime(delivery?.time_window_end)}
                      </p>
                    </div>
                  </div>
                )}

                {delivery?.special_instructions && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Special Instructions</p>
                      <p className="font-medium">{delivery?.special_instructions}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Driver Info (when assigned) */}
          {route?.driver_name && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-500" />
                  Your Driver
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                    <User className="w-7 h-7 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{route.driver_name}</h3>
                    <p className="text-gray-500 text-sm">{route.vehicle_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {!isCompleted && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowInstructionsModal(true)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Update Instructions
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRescheduleModal(true)}
                  className="flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  Reschedule
                </Button>
              </>
            )}
            
            {isCompleted && !has_rated && (
              <Button
                onClick={() => setShowRatingModal(true)}
                className="col-span-2 bg-amber-500 hover:bg-amber-600"
              >
                <Star className="w-4 h-4 mr-2" />
                Rate Your Delivery
              </Button>
            )}

            {isCompleted && has_rated && (
              <div className="col-span-2 p-3 bg-green-50 border border-green-200 rounded-lg text-center text-green-700">
                <CheckCircle className="w-5 h-5 inline mr-2" />
                Thank you for your feedback!
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-500" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>SMS Notifications</span>
                </div>
                <Switch
                  checked={notificationPrefs.sms}
                  onCheckedChange={(checked) => updateNotificationPrefs({ ...notificationPrefs, sms: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>Email Notifications</span>
                </div>
                <Switch
                  checked={notificationPrefs.email}
                  onCheckedChange={(checked) => updateNotificationPrefs({ ...notificationPrefs, email: checked })}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Rating Modal */}
        {showRatingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Rate Your Delivery</CardTitle>
                <button onClick={() => setShowRatingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <StarRating
                  value={ratings.overall}
                  onChange={(v) => setRatings({ ...ratings, overall: v })}
                  label="Overall Experience"
                />
                <StarRating
                  value={ratings.driver}
                  onChange={(v) => setRatings({ ...ratings, driver: v })}
                  label="Driver"
                />
                <StarRating
                  value={ratings.timeliness}
                  onChange={(v) => setRatings({ ...ratings, timeliness: v })}
                  label="Timeliness"
                />
                <StarRating
                  value={ratings.communication}
                  onChange={(v) => setRatings({ ...ratings, communication: v })}
                  label="Communication"
                />

                <div className="space-y-2">
                  <Label>What did you like?</Label>
                  <div className="flex flex-wrap gap-2">
                    {feedbackTagOptions.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          if (feedbackTags.includes(tag)) {
                            setFeedbackTags(feedbackTags.filter(t => t !== tag));
                          } else {
                            setFeedbackTags([...feedbackTags, tag]);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-sm transition-colors ${
                          feedbackTags.includes(tag)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Additional Comments</Label>
                  <Textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us about your experience..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Would you recommend us?</Label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setWouldRecommend(true)}
                      className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                        wouldRecommend ? 'border-green-500 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <ThumbsUp className={`w-6 h-6 mx-auto ${wouldRecommend ? 'text-green-500' : 'text-gray-400'}`} />
                      <span className="text-sm mt-1 block">Yes</span>
                    </button>
                    <button
                      onClick={() => setWouldRecommend(false)}
                      className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                        !wouldRecommend ? 'border-red-500 bg-red-50' : 'border-gray-200'
                      }`}
                    >
                      <ThumbsDown className={`w-6 h-6 mx-auto ${!wouldRecommend ? 'text-red-500' : 'text-gray-400'}`} />
                      <span className="text-sm mt-1 block">No</span>
                    </button>
                  </div>
                </div>

                <Button onClick={submitRating} disabled={loading} className="w-full">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Rating
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Request Reschedule</CardTitle>
                <button onClick={() => setShowRescheduleModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>New Delivery Date *</Label>
                  <Input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Preferred Start Time</Label>
                    <Input
                      type="time"
                      value={rescheduleTimeStart}
                      onChange={(e) => setRescheduleTimeStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred End Time</Label>
                    <Input
                      type="time"
                      value={rescheduleTimeEnd}
                      onChange={(e) => setRescheduleTimeEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Reason for Reschedule</Label>
                  <Textarea
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Please let us know why you need to reschedule..."
                    rows={3}
                  />
                </div>

                <Button onClick={submitReschedule} disabled={loading || !rescheduleDate} className="w-full">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Submit Request
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Instructions Modal */}
        {showInstructionsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Delivery Instructions</CardTitle>
                <button onClick={() => setShowInstructionsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Special Instructions</Label>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g., Ring doorbell twice, leave at back gate..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gate Code (if applicable)</Label>
                  <Input
                    value={gateCode}
                    onChange={(e) => setGateCode(e.target.value)}
                    placeholder="e.g., #1234"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Call me when arriving</Label>
                    <Switch
                      checked={contactOnArrival}
                      onCheckedChange={setContactOnArrival}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Leave at door (no signature needed)</Label>
                    <Switch
                      checked={leaveAtDoor}
                      onCheckedChange={setLeaveAtDoor}
                    />
                  </div>
                </div>

                <Button onClick={updateInstructions} disabled={loading} className="w-full">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save Instructions
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  return <TrackingView />;
};

export default CustomerTrackingPortal;
