import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  RefreshCw, Clock, CheckCircle, XCircle, Loader2,
  Activity, TrendingUp, Bell, AlertTriangle, Zap, BarChart3, Timer
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SyncRun {
  id: string;
  run_type: string;
  status: string;
  total_orders_checked: number;
  adjustments_created: number;
  notifications_sent: number;
  errors: string[];
  started_at: string;
  completed_at: string | null;
  created_at: string;
}

interface SyncStats {
  total_runs: number;
  last_run: SyncRun | null;
  total_adjustments_created: number;
  total_notifications_sent: number;
  failed_runs: number;
  success_rate: string;
}

export default function PriceSyncDashboard() {
  const { toast } = useToast();
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [nextSyncIn, setNextSyncIn] = useState(900); // 15 minutes in seconds

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      setNextSyncIn(prev => {
        if (prev <= 1) {
          fetchData();
          return 900;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, historyRes] = await Promise.all([
        supabase.functions.invoke('price-sync', { body: { action: 'get_sync_stats' } }),
        supabase.functions.invoke('price-sync', { body: { action: 'get_sync_history', limit: 15 } })
      ]);
      if (statsRes.data?.stats) setStats(statsRes.data.stats);
      if (historyRes.data?.runs) setRuns(historyRes.data.runs);
    } catch (e) {
      console.error('Failed to fetch sync data:', e);
    }
    setLoading(false);
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('price-sync', {
        body: { action: 'run_sync', run_type: 'manual' }
      });
      if (error) throw error;
      toast({
        title: 'Price Sync Complete',
        description: `Checked ${data?.summary?.total_orders_checked || 0} orders, created ${data?.summary?.adjustments_created || 0} adjustments.`
      });
      setNextSyncIn(900);
      fetchData();
    } catch (e: any) {
      toast({ title: 'Sync Failed', description: e.message || 'Failed to run price sync', variant: 'destructive' });
    }
    setSyncing(false);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case 'running': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
      case 'failed': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default: return <Badge className="bg-slate-500/20 text-slate-400">{status}</Badge>;
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#D4AF37]" />
            Price Sync Dashboard
          </h2>
          <p className="text-slate-400 text-sm">Automated market price synchronization every 15 minutes</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-4 py-2 border border-white/10">
            <Timer className="w-4 h-4 text-[#00D4FF]" />
            <span className="text-[#00D4FF] font-mono text-sm">Next sync: {formatDuration(nextSyncIn)}</span>
          </div>
          <Button
            onClick={handleForceSync}
            disabled={syncing}
            className="bg-[#D4AF37] text-slate-900 hover:bg-[#B8941F]"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            Force Sync Now
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Total Runs</div>
                <div className="text-xl font-bold text-white">{stats?.total_runs || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Adjustments</div>
                <div className="text-xl font-bold text-white">{stats?.total_adjustments_created || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Notifications</div>
                <div className="text-xl font-bold text-white">{stats?.total_notifications_sent || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Failed Runs</div>
                <div className="text-xl font-bold text-white">{stats?.failed_runs || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Success Rate</div>
                <div className="text-xl font-bold text-white">{stats?.success_rate || '100'}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <div className="text-slate-400 text-xs">Last Run</div>
                <div className="text-sm font-bold text-white">
                  {stats?.last_run?.completed_at
                    ? new Date(stats.last_run.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Never'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Run Summary */}
      {stats?.last_run && (
        <Card className="bg-gradient-to-r from-[#D4AF37]/10 to-[#00D4FF]/10 border-[#D4AF37]/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold mb-1">Last Sync Run</h3>
                <p className="text-slate-400 text-sm">
                  {stats.last_run.run_type === 'manual' ? 'Manual sync' : 'Scheduled sync'} at{' '}
                  {new Date(stats.last_run.started_at).toLocaleString()}
                </p>
              </div>
              {getStatusBadge(stats.last_run.status)}
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{stats.last_run.total_orders_checked}</div>
                <div className="text-slate-400 text-xs">Orders Checked</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-[#D4AF37]">{stats.last_run.adjustments_created}</div>
                <div className="text-slate-400 text-xs">Adjustments Created</div>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-400">{stats.last_run.notifications_sent}</div>
                <div className="text-slate-400 text-xs">Emails Sent</div>
              </div>
            </div>
            {stats.last_run.errors && stats.last_run.errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-xs font-medium mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Errors ({stats.last_run.errors.length})
                </p>
                {stats.last_run.errors.slice(0, 3).map((err, i) => (
                  <p key={i} className="text-slate-400 text-xs">{err}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#00D4FF]" />Sync History
          </CardTitle>
          <Button onClick={fetchData} variant="outline" size="sm" className="border-white/20 text-slate-300">
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No sync runs yet. Click "Force Sync Now" to start.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-slate-400 py-2 px-3 font-medium">Time</th>
                    <th className="text-left text-slate-400 py-2 px-3 font-medium">Type</th>
                    <th className="text-left text-slate-400 py-2 px-3 font-medium">Status</th>
                    <th className="text-center text-slate-400 py-2 px-3 font-medium">Orders</th>
                    <th className="text-center text-slate-400 py-2 px-3 font-medium">Adjustments</th>
                    <th className="text-center text-slate-400 py-2 px-3 font-medium">Emails</th>
                    <th className="text-center text-slate-400 py-2 px-3 font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map(run => (
                    <tr key={run.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-3 text-white text-xs">
                        {new Date(run.started_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={run.run_type === 'manual' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}>
                          {run.run_type}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">{getStatusBadge(run.status)}</td>
                      <td className="py-2 px-3 text-center text-white">{run.total_orders_checked}</td>
                      <td className="py-2 px-3 text-center text-[#D4AF37] font-medium">{run.adjustments_created}</td>
                      <td className="py-2 px-3 text-center text-green-400">{run.notifications_sent}</td>
                      <td className="py-2 px-3 text-center text-red-400">{run.errors?.length || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
