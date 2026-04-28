import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Phone, Truck, Clock, Navigation } from 'lucide-react';

interface GPSTrackerProps {
  orderId: string;
  onClose: () => void;
}

interface DeliveryData {
  id: string;
  order_id: string;
  origin_location: string;
  destination_location: string;
  pilot_name: string;
  pilot_phone: string;
  vehicle_type: string;
  vehicle_id: string;
  estimated_distance: number;
  distance_covered: number;
  progress_percentage: number;
  estimated_arrival: string;
  status: string;
  tracking_updates: any[];
}

export default function GPSTracker({ orderId, onClose }: GPSTrackerProps) {
  const [progress, setProgress] = useState(45);
  const [delivery, setDelivery] = useState<DeliveryData | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDelivery = async () => {
      try {
        const { data } = await supabase
          .from('deliveries')
          .select('*')
          .eq('order_id', orderId)
          .single();
        
        if (data) {
          setDelivery(data);
          setProgress(data.progress_percentage || 45);
        }
      } catch (err) {
        // Table may not exist yet - use default demo data
        console.warn('Delivery fetch skipped:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();

    // Simulate real-time updates
    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 1, 100));
    }, 3000);

    // Subscribe to real-time updates with error handling
    let channel: any = null;
    try {
      channel = supabase
        .channel(`delivery-${orderId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'deliveries',
          filter: `order_id=eq.${orderId}`
        }, (payload) => {
          try {
            setDelivery(payload.new as DeliveryData);
            setProgress((payload.new as any).progress_percentage || progress);
          } catch (e) {
            console.warn('Delivery update parse error:', e);
          }
        })
        .subscribe((status: string, err?: Error) => {
          if (err) {
            console.warn('GPS tracker subscription error:', err.message);
          }
        });
    } catch (e) {
      console.warn('GPS tracker channel setup error:', e);
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [orderId]);

  const milestones = [
    { label: 'Order Confirmed', time: '10:30 AM', status: progress >= 10 ? 'completed' : 'pending' },
    { label: 'Departed Depot', time: '11:45 AM', status: progress >= 25 ? 'completed' : progress >= 20 ? 'active' : 'pending' },
    { label: 'In Transit', time: '2:15 PM', status: progress >= 50 ? 'completed' : progress >= 30 ? 'active' : 'pending' },
    { label: 'Arriving Soon', time: 'Est. 4:30 PM', status: progress >= 80 ? 'completed' : progress >= 70 ? 'active' : 'pending' },
    { label: 'Delivered', time: 'Pending', status: progress >= 100 ? 'completed' : 'pending' }
  ];

  const pilotName = delivery?.pilot_name || 'John Mensah';
  const pilotPhone = delivery?.pilot_phone || '+234 801 234 5678';
  const vehicleType = delivery?.vehicle_type || 'Petroleum Tanker';
  const vehicleId = delivery?.vehicle_id || 'PTR-2025-001';
  const estimatedDistance = delivery?.estimated_distance || 450;
  const distanceRemaining = estimatedDistance * (1 - progress / 100);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl max-w-4xl w-full border border-[#D4AF37] max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center sticky top-0 bg-slate-800/95 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Navigation className="w-6 h-6 text-[#00D4FF]" />
              Live GPS Tracking
            </h2>
            <p className="text-slate-400 text-sm">Order #{orderId}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl">&times;</button>
        </div>
        
        <div className="p-6">
          {/* Map visualization */}
          <div className="bg-slate-800 rounded-xl p-6 mb-6 relative overflow-hidden">
            <img 
              src="https://d64gsuwffb70l.cloudfront.net/69138b477443873c621b20e5_1762888626258_ba8612e7.webp" 
              alt="GPS Map" 
              className="w-full h-64 object-cover rounded-lg opacity-80"
            />
            <div className="absolute top-10 left-10 bg-[#00D4FF] text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Origin
            </div>
            <div className="absolute bottom-10 right-10 bg-[#D4AF37] text-slate-900 px-4 py-2 rounded-full font-bold shadow-lg animate-pulse flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Destination
            </div>
            {/* Moving vehicle indicator */}
            <div 
              className="absolute top-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg transition-all duration-1000"
              style={{ left: `${Math.min(progress, 85)}%`, transform: 'translate(-50%, -50%)' }}
            >
              <Truck className="w-4 h-4 inline mr-1" />
              {vehicleId}
            </div>
          </div>
          
          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="text-slate-400 text-sm mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Distance Remaining
              </div>
              <div className="text-2xl font-bold text-white">{distanceRemaining.toFixed(0)} km</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="text-slate-400 text-sm mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                ETA
              </div>
              <div className="text-2xl font-bold text-[#D4AF37]">
                {delivery?.estimated_arrival 
                  ? new Date(delivery.estimated_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '4:30 PM'}
              </div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="text-slate-400 text-sm mb-1">Progress</div>
              <div className="text-2xl font-bold text-[#00D4FF]">{progress}%</div>
            </div>
            <div className="bg-slate-800 p-4 rounded-lg">
              <div className="text-slate-400 text-sm mb-1 flex items-center gap-1">
                <Truck className="w-3 h-3" />
                Vehicle
              </div>
              <div className="text-lg font-bold text-white">{vehicleType}</div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-semibold">Delivery Progress</span>
              <span className="text-[#00D4FF]">{progress}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-[#00D4FF] to-[#D4AF37] h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Milestones */}
          <div className="space-y-3 mb-6">
            {milestones.map((milestone, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full flex-shrink-0 ${
                  milestone.status === 'completed' ? 'bg-green-500' :
                  milestone.status === 'active' ? 'bg-[#00D4FF] animate-pulse' :
                  'bg-slate-600'
                }`}></div>
                <div className="flex-1">
                  <div className="text-white font-semibold">{milestone.label}</div>
                  <div className="text-slate-400 text-sm">{milestone.time}</div>
                </div>
                {milestone.status === 'completed' && (
                  <span className="text-green-400 text-sm">Completed</span>
                )}
                {milestone.status === 'active' && (
                  <span className="text-[#00D4FF] text-sm animate-pulse">In Progress</span>
                )}
              </div>
            ))}
          </div>

          {/* Pilot Contact */}
          <div className="bg-slate-800 p-4 rounded-lg">
            <div className="text-white font-semibold mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#00D4FF]" />
              Pilot Contact
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{pilotName}</div>
                <div className="text-slate-400 text-sm">{pilotPhone}</div>
              </div>
              <div className="flex gap-2">
                <a 
                  href={`tel:${pilotPhone.replace(/\s/g, '')}`}
                  className="bg-[#00D4FF] text-slate-900 font-bold px-4 py-2 rounded-lg hover:bg-[#00B8E6] transition-all flex items-center gap-2"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </a>
                <a 
                  href={`sms:${pilotPhone.replace(/\s/g, '')}`}
                  className="bg-slate-700 text-white font-bold px-4 py-2 rounded-lg hover:bg-slate-600 transition-all"
                >
                  SMS
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
