import { Bell, BellOff, Trash2, Mail, Phone, MessageSquare, Zap, Clock } from 'lucide-react';

interface Alert {
  id: string;
  commodity_symbol: string;
  commodity_name: string;
  // Support both old and new field names
  condition?: 'above' | 'below';
  alert_type?: 'above' | 'below';
  threshold_price: number;
  is_active: boolean;
  is_triggered?: boolean;
  triggered_at?: string;
  triggered_price?: number;
  trigger_count?: number;
  notification_method?: string;
  notification_methods?: string[];
  notes?: string;
  created_at: string;
}

interface Props {
  alerts: Alert[];
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
  loading: boolean;
}

export default function PriceAlertList({ alerts, onToggle, onDelete, loading }: Props) {
  const getMethodDisplay = (alert: Alert) => {
    const methods = alert.notification_methods || (alert.notification_method ? [alert.notification_method] : ['email']);
    const hasEmail = methods.includes('email');
    const hasSms = methods.includes('sms');
    
    if (hasEmail && hasSms) {
      return { icon: <MessageSquare className="w-3 h-3" />, label: 'Email + SMS', className: 'bg-purple-500/20 text-purple-400' };
    }
    if (hasSms) {
      return { icon: <Phone className="w-3 h-3" />, label: 'SMS', className: 'bg-blue-500/20 text-blue-400' };
    }
    return { icon: <Mail className="w-3 h-3" />, label: 'Email', className: 'bg-slate-600 text-slate-300' };
  };

  const getCondition = (alert: Alert) => alert.alert_type || alert.condition || 'below';
  const isTriggered = (alert: Alert) => !!alert.triggered_at || alert.is_triggered;

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-700 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Bell className="w-5 h-5 text-[#D4AF37]" />
        Active Alerts ({alerts.filter(a => a.is_active).length})
      </h3>
      
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No alerts created yet</p>
          <p className="text-xs mt-1">Create your first price alert to get notified</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {alerts.map(alert => {
            const condition = getCondition(alert);
            const triggered = isTriggered(alert);
            const method = getMethodDisplay(alert);

            return (
              <div key={alert.id} className={`p-4 rounded-lg border transition-all ${
                triggered ? 'bg-amber-500/10 border-amber-500/30' :
                alert.is_active ? 'bg-slate-700/50 border-slate-600 hover:border-slate-500' : 
                'bg-slate-800/50 border-slate-700 opacity-60'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white">{alert.commodity_name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${method.className}`}>
                        {method.icon}
                        {method.label}
                      </span>
                      {triggered && (
                        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded flex items-center gap-1">
                          <Zap className="w-3 h-3" />Triggered
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1">
                      <span className={condition === 'below' ? 'text-red-400' : 'text-green-400'}>
                        {condition === 'below' ? 'Below' : 'Above'}
                      </span>
                      <span className="text-[#D4AF37] font-bold ml-2">${alert.threshold_price.toFixed(2)}</span>
                    </p>
                    {triggered && alert.triggered_price && (
                      <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        Triggered at ${alert.triggered_price.toFixed(2)}
                        {alert.triggered_at && (
                          <span className="text-slate-500 ml-1">
                            ({new Date(alert.triggered_at).toLocaleDateString()})
                          </span>
                        )}
                      </p>
                    )}
                    {alert.notes && <p className="text-slate-500 text-xs mt-1">{alert.notes}</p>}
                    {alert.trigger_count && alert.trigger_count > 0 && (
                      <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />Triggered {alert.trigger_count} time(s)
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    {!triggered && (
                      <button onClick={() => onToggle(alert.id, !alert.is_active)}
                        className={`p-2 rounded-lg transition-colors ${alert.is_active ? 'text-green-400 hover:bg-green-500/20' : 'text-slate-500 hover:bg-slate-700'}`}>
                        {alert.is_active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </button>
                    )}
                    <button onClick={() => onDelete(alert.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
