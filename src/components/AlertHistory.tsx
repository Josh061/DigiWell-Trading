import { Clock, CheckCircle, XCircle, Mail, Phone, Zap, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HistoryItem {
  id: string;
  commodity_symbol: string;
  commodity_name: string;
  condition: string;
  threshold_price: number;
  triggered_price: number;
  email_sent: boolean;
  sms_sent?: boolean;
  triggered_at: string;
}

interface Props {
  history: HistoryItem[];
  loading: boolean;
}

export default function AlertHistory({ history, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-700 rounded-lg" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
      <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-[#00D4FF]" /> Alert History
        {history.length > 0 && (
          <Badge className="bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30 text-xs ml-2">{history.length} triggered</Badge>
        )}
      </h3>

      {history.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No triggered alerts yet</p>
          <p className="text-xs mt-1">Alerts will appear here when price thresholds are crossed</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                <th className="pb-3 pr-4">Commodity</th>
                <th className="pb-3 pr-4">Condition</th>
                <th className="pb-3 pr-4">Target</th>
                <th className="pb-3 pr-4">Triggered At</th>
                <th className="pb-3 pr-4">Notifications</th>
                <th className="pb-3">Date & Time</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {history.map(item => {
                const priceDiff = item.triggered_price - item.threshold_price;
                const isAbove = item.condition === 'above';
                
                return (
                  <tr key={item.id} className="border-b border-slate-700/50 hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <div>
                          <span className="font-medium text-white">{item.commodity_name}</span>
                          <span className="text-slate-500 ml-2 text-xs">({item.commodity_symbol})</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Badge className={`text-xs ${
                        isAbove ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {isAbove ? 'Above' : 'Below'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="text-[#D4AF37] font-bold">${item.threshold_price.toFixed(2)}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div>
                        <span className="text-[#00D4FF] font-bold">${item.triggered_price.toFixed(2)}</span>
                        <span className={`text-xs ml-2 ${priceDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ({priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(2)})
                        </span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 ${item.email_sent ? 'text-green-400' : 'text-slate-600'}`}>
                          <Mail className="w-3.5 h-3.5" />
                          {item.email_sent ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </span>
                        {item.sms_sent !== undefined && (
                          <span className={`flex items-center gap-1 ${item.sms_sent ? 'text-blue-400' : 'text-slate-600'}`}>
                            <Phone className="w-3.5 h-3.5" />
                            {item.sms_sent ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.triggered_at).toLocaleDateString()}</span>
                        <span className="text-slate-500 text-xs ml-1">
                          {new Date(item.triggered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
