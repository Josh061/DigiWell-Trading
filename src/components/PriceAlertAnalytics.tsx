import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, Clock, Mail, MessageSquare, Activity, Flame, CheckCircle2, XCircle } from 'lucide-react';

interface TriggerRow {
  id: string;
  config_id: string | null;
  product: string;
  product_name: string | null;
  threshold_type: string;
  threshold_value: number;
  triggered_price: number;
  price_source: string | null;
  sms_sent: boolean;
  email_sent: boolean;
  sms_sid: string | null;
  notification_error: string | null;
  created_at: string;
}

interface ConfigRow {
  id: string;
  product: string;
  product_name: string | null;
  created_at: string;
}

const COMMODITY_COLORS: Record<string, string> = {
  WTI: '#10B981', BRENT: '#059669', 'NATURAL-GAS': '#3B82F6',
  GOLD: '#F59E0B', SILVER: '#94A3B8', COPPER: '#B45309',
  PLATINUM: '#6366F1', GASOLINE: '#EF4444', 'HEATING-OIL': '#DC2626',
  'JET-FUEL': '#8B5CF6', LPG: '#EC4899', LITHIUM: '#06B6D4'
};

const colorFor = (p: string) => COMMODITY_COLORS[p?.toUpperCase()] || '#64748B';

export default function PriceAlertAnalytics() {
  const [triggers, setTriggers] = useState<TriggerRow[]>([]);
  const [configs, setConfigs] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(30);

  const load = async () => {
    setLoading(true);
    try {
      const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
      const [trigRes, cfgRes] = await Promise.all([
        supabase.from('price_alert_trigger_log')
          .select('*')
          .gte('created_at', since)
          .order('created_at', { ascending: false })
          .limit(2000),
        supabase.from('price_alert_configs').select('id, product, product_name, created_at')
      ]);
      setTriggers((trigRes.data as any) || []);
      setConfigs((cfgRes.data as any) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [rangeDays]);

  // ---- Aggregations ----
  const stats = useMemo(() => {
    const smsSuccess = triggers.filter(t => t.sms_sent).length;
    const emailSuccess = triggers.filter(t => t.email_sent).length;
    const total = triggers.length;
    const smsAttempts = triggers.filter(t => t.sms_sent || (t.notification_error || '').toLowerCase().includes('sms')).length || smsSuccess;
    const emailAttempts = triggers.filter(t => t.email_sent || (t.notification_error || '').toLowerCase().includes('email')).length || emailSuccess;
    return {
      total,
      smsSuccess, emailSuccess,
      smsRate: smsAttempts ? Math.round((smsSuccess / smsAttempts) * 100) : 0,
      emailRate: emailAttempts ? Math.round((emailSuccess / emailAttempts) * 100) : 0,
      uniqueCommodities: new Set(triggers.map(t => t.product)).size,
    };
  }, [triggers]);

  // Heatmap: commodity x hour-of-day
  const heatmap = useMemo(() => {
    const commodities = Array.from(new Set(triggers.map(t => t.product))).sort();
    const matrix: Record<string, number[]> = {};
    commodities.forEach(c => { matrix[c] = new Array(24).fill(0); });
    triggers.forEach(t => {
      const h = new Date(t.created_at).getUTCHours();
      if (matrix[t.product]) matrix[t.product][h]++;
    });
    const max = Math.max(1, ...Object.values(matrix).flat());
    return { commodities, matrix, max };
  }, [triggers]);

  // Most-triggered ranking
  const ranking = useMemo(() => {
    const counts: Record<string, { count: number; name: string }> = {};
    triggers.forEach(t => {
      if (!counts[t.product]) counts[t.product] = { count: 0, name: t.product_name || t.product };
      counts[t.product].count++;
    });
    return Object.entries(counts)
      .map(([product, v]) => ({ product, name: v.name, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [triggers]);

  // Avg time: config creation -> first trigger
  const avgTimeToFirstTrigger = useMemo(() => {
    const firstTriggerByConfig: Record<string, string> = {};
    // triggers are ordered desc, iterate to find earliest per config
    triggers.forEach(t => {
      if (!t.config_id) return;
      if (!firstTriggerByConfig[t.config_id] || t.created_at < firstTriggerByConfig[t.config_id]) {
        firstTriggerByConfig[t.config_id] = t.created_at;
      }
    });
    const hoursList: number[] = [];
    configs.forEach(c => {
      const first = firstTriggerByConfig[c.id];
      if (first) {
        const hours = (new Date(first).getTime() - new Date(c.created_at).getTime()) / 3_600_000;
        if (hours >= 0) hoursList.push(hours);
      }
    });
    if (!hoursList.length) return null;
    const avg = hoursList.reduce((a, b) => a + b, 0) / hoursList.length;
    return avg;
  }, [triggers, configs]);

  // Price movement overlay (per commodity)
  const priceOverlays = useMemo(() => {
    const grouped: Record<string, TriggerRow[]> = {};
    triggers.forEach(t => {
      if (!grouped[t.product]) grouped[t.product] = [];
      grouped[t.product].push(t);
    });
    return Object.entries(grouped)
      .map(([product, rows]) => {
        const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
        return { product, name: sorted[0].product_name || product, rows: sorted };
      })
      .sort((a, b) => b.rows.length - a.rows.length)
      .slice(0, 4);
  }, [triggers]);

  const exportCSV = () => {
    const headers = ['created_at','product','product_name','threshold_type','threshold_value','triggered_price','price_source','sms_sent','email_sent','sms_sid','notification_error'];
    const rows = triggers.map(t => headers.map(h => {
      const v = (t as any)[h];
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `price-alert-triggers-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const heatColor = (v: number) => {
    if (!v) return 'rgba(148,163,184,0.08)';
    const pct = v / heatmap.max;
    if (pct < 0.25) return 'rgba(34,197,94,0.35)';
    if (pct < 0.5) return 'rgba(234,179,8,0.55)';
    if (pct < 0.75) return 'rgba(249,115,22,0.75)';
    return 'rgba(239,68,68,0.95)';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Price Alert Analytics</h2>
          <p className="text-white/70 text-sm">Trigger patterns, delivery performance and commodity insights</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map(d => (
            <Button key={d} size="sm" variant={rangeDays === d ? 'default' : 'outline'} onClick={() => setRangeDays(d)}
              className={rangeDays === d ? 'bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]' : 'border-white/30 text-white'}>
              {d}d
            </Button>
          ))}
          <Button size="sm" onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard icon={<Flame className="w-5 h-5" />} label="Total Triggers" value={stats.total.toString()} color="from-orange-500/30 to-red-500/20" />
        <StatCard icon={<Activity className="w-5 h-5" />} label="Commodities" value={stats.uniqueCommodities.toString()} color="from-blue-500/30 to-indigo-500/20" />
        <StatCard icon={<MessageSquare className="w-5 h-5" />} label="SMS Delivery" value={`${stats.smsRate}%`} sub={`${stats.smsSuccess} sent`} color="from-emerald-500/30 to-green-500/20" />
        <StatCard icon={<Mail className="w-5 h-5" />} label="Email Delivery" value={`${stats.emailRate}%`} sub={`${stats.emailSuccess} sent`} color="from-violet-500/30 to-purple-500/20" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="Avg Time to Trigger"
          value={avgTimeToFirstTrigger !== null ? (avgTimeToFirstTrigger < 1 ? `${Math.round(avgTimeToFirstTrigger * 60)}m` : `${avgTimeToFirstTrigger.toFixed(1)}h`) : '—'}
          color="from-cyan-500/30 to-blue-500/20" />
      </div>

      {/* Heatmap */}
      <Card className="bg-slate-900/70 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" /> Trigger Heatmap (Commodity × Hour UTC)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? <div className="text-white/60 py-6 text-center">Loading…</div> : heatmap.commodities.length === 0 ? (
            <div className="text-white/50 py-6 text-center">No triggers yet in this range.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-white/60 font-normal px-2 py-1">Commodity</th>
                    {Array.from({ length: 24 }).map((_, h) => (
                      <th key={h} className="text-center text-white/50 font-normal px-0.5">{h}</th>
                    ))}
                    <th className="text-right text-white/60 font-normal px-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {heatmap.commodities.map(c => {
                    const row = heatmap.matrix[c];
                    const total = row.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={c}>
                        <td className="px-2 py-1 text-white/90 font-medium whitespace-nowrap">
                          <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: colorFor(c) }} />
                          {c}
                        </td>
                        {row.map((v, h) => (
                          <td key={h} className="p-0.5">
                            <div title={`${c} ${h}:00 UTC — ${v} triggers`}
                              className="w-6 h-6 rounded text-[9px] flex items-center justify-center text-white/90 font-bold"
                              style={{ background: heatColor(v) }}>
                              {v || ''}
                            </div>
                          </td>
                        ))}
                        <td className="text-right text-white font-bold px-2">{total}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-white/60">
            <span>Intensity:</span>
            {['0','low','med','high','peak'].map((l, i) => (
              <span key={l} className="flex items-center gap-1">
                <span className="w-4 h-4 rounded" style={{ background: heatColor(i * heatmap.max / 4) }} />{l}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ranking + Delivery */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-slate-900/70 border-white/10">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> Most Triggered Commodities</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {ranking.length === 0 ? <div className="text-white/50 text-sm">No data.</div> :
              ranking.map((r, i) => {
                const pct = (r.count / ranking[0].count) * 100;
                return (
                  <div key={r.product}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/90 font-medium">
                        <span className="text-white/40 mr-2">#{i + 1}</span>
                        {r.name}
                      </span>
                      <span className="text-white/70">{r.count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colorFor(r.product) }} />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/70 border-white/10">
          <CardHeader><CardTitle className="text-white flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-cyan-400" /> Notification Delivery</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <DeliveryBar label="SMS (Twilio)" icon={<MessageSquare className="w-4 h-4" />} success={stats.smsSuccess} rate={stats.smsRate} color="emerald" />
            <DeliveryBar label="Email (SendGrid)" icon={<Mail className="w-4 h-4" />} success={stats.emailSuccess} rate={stats.emailRate} color="violet" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/60 mb-1">Failed Notifications</div>
                <div className="text-lg font-bold text-red-400 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  {triggers.filter(t => t.notification_error).length}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-3">
                <div className="text-xs text-white/60 mb-1">Both Channels</div>
                <div className="text-lg font-bold text-emerald-400">{triggers.filter(t => t.sms_sent && t.email_sent).length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Price trigger history charts */}
      <Card className="bg-slate-900/70 border-white/10">
        <CardHeader><CardTitle className="text-white flex items-center gap-2"><Activity className="w-5 h-5 text-[#00D4FF]" /> Price Movement at Trigger Time</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          {priceOverlays.length === 0 ? <div className="text-white/50 text-sm">No data to chart.</div> :
            priceOverlays.map(p => <PriceChart key={p.product} data={p} />)}
        </CardContent>
      </Card>

      {/* Recent triggers table */}
      <Card className="bg-slate-900/70 border-white/10">
        <CardHeader><CardTitle className="text-white">Recent Trigger Log</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-white/60 border-b border-white/10">
                <tr>
                  <th className="py-2 pr-2">When</th>
                  <th className="pr-2">Commodity</th>
                  <th className="pr-2">Threshold</th>
                  <th className="pr-2">Price</th>
                  <th className="pr-2">SMS</th>
                  <th className="pr-2">Email</th>
                  <th className="pr-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {triggers.slice(0, 25).map(t => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-1.5 pr-2 text-white/70 whitespace-nowrap">{new Date(t.created_at).toLocaleString()}</td>
                    <td className="pr-2 text-white">{t.product_name || t.product}</td>
                    <td className="pr-2 text-white/80">{t.threshold_type} ${t.threshold_value}</td>
                    <td className="pr-2 font-bold" style={{ color: colorFor(t.product) }}>${Number(t.triggered_price).toFixed(2)}</td>
                    <td className="pr-2">{t.sms_sent ? <Badge className="bg-emerald-500/20 text-emerald-400">Sent</Badge> : <Badge className="bg-slate-500/20 text-slate-400">—</Badge>}</td>
                    <td className="pr-2">{t.email_sent ? <Badge className="bg-violet-500/20 text-violet-400">Sent</Badge> : <Badge className="bg-slate-500/20 text-slate-400">—</Badge>}</td>
                    <td className="pr-2 text-white/50 text-xs">{t.price_source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} border border-white/10 rounded-xl p-4`}>
      <div className="flex items-center gap-2 text-white/80 text-xs mb-1">{icon}{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-white/60 mt-1">{sub}</div>}
    </div>
  );
}

function DeliveryBar({ label, icon, success, rate, color }: { label: string; icon: React.ReactNode; success: number; rate: number; color: string }) {
  const bg = color === 'emerald' ? 'bg-emerald-500' : 'bg-violet-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-white flex items-center gap-2">{icon}{label}</span>
        <span className="text-white/80">{success} sent • {rate}% success</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${bg}`} style={{ width: `${Math.min(100, rate)}%` }} />
      </div>
    </div>
  );
}

function PriceChart({ data }: { data: { product: string; name: string; rows: TriggerRow[] } }) {
  const color = colorFor(data.product);
  const prices = data.rows.map(r => Number(r.triggered_price)).filter(n => !isNaN(n));
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 0.0001);
  const W = 800;
  const H = 110;
  const P = 8;
  const step = prices.length > 1 ? (W - 2 * P) / (prices.length - 1) : 0;
  const pathD = data.rows.map((r, i) => {
    const x = P + i * step;
    const y = H - P - ((Number(r.triggered_price) - min) / range) * (H - 2 * P);
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-white font-semibold flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ background: color }} />
          {data.name}
        </span>
        <span className="text-white/60 text-xs">{data.rows.length} triggers • ${min.toFixed(2)} – ${max.toFixed(2)}</span>
      </div>
      <div className="bg-slate-950/60 rounded-lg p-2 border border-white/10">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
          <defs>
            <linearGradient id={`grad-${data.product}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.5" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${pathD} L ${W - P} ${H - P} L ${P} ${H - P} Z`} fill={`url(#grad-${data.product})`} />
          <path d={pathD} stroke={color} strokeWidth="2" fill="none" />
          {data.rows.map((r, i) => {
            const x = P + i * step;
            const y = H - P - ((Number(r.triggered_price) - min) / range) * (H - 2 * P);
            return <circle key={r.id} cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="1.5">
              <title>{new Date(r.created_at).toLocaleString()} — ${Number(r.triggered_price).toFixed(2)}</title>
            </circle>;
          })}
        </svg>
      </div>
    </div>
  );
}
