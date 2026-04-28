import { useState } from 'react';
import PriceAlertManager from '@/components/PriceAlertManager';
import PriceAlertAnalytics from '@/components/PriceAlertAnalytics';
import { BellRing, BarChart3 } from 'lucide-react';

export default function SmartAlertsHub() {
  const [tab, setTab] = useState<'manage' | 'analytics'>('manage');
  return (
    <div>
      <div className="flex gap-2 mb-4 bg-slate-900/70 rounded-lg p-1 w-fit border border-white/10">
        <button onClick={() => setTab('manage')}
          className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
            tab === 'manage' ? 'bg-[#D4AF37] text-slate-900' : 'text-white/80 hover:text-white'
          }`}>
          <BellRing className="w-4 h-4" /> Manage Alerts
        </button>
        <button onClick={() => setTab('analytics')}
          className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
            tab === 'analytics' ? 'bg-[#D4AF37] text-slate-900' : 'text-white/80 hover:text-white'
          }`}>
          <BarChart3 className="w-4 h-4" /> Analytics
        </button>
      </div>
      {tab === 'manage' ? <PriceAlertManager /> : <PriceAlertAnalytics />}
    </div>
  );
}
