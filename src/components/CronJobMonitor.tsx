import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import {
  Clock, Play, Pause, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Copy, ExternalLink, Settings, History, Zap, Shield, Globe, Terminal,
  Timer, Activity, Server, Key, Eye, EyeOff, RotateCcw
} from 'lucide-react';

interface CronConfig {
  id: string;
  job_name: string;
  is_enabled: boolean;
  frequency_minutes: number;
  last_run_at: string | null;
  next_run_at: string | null;
  cron_secret: string;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CronLog {
  id: string;
  job_name: string;
  execution_time: string;
  status: 'started' | 'completed' | 'failed';
  reports_processed: number;
  reports_sent: number;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}

export default function CronJobMonitor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<CronConfig | null>(null);
  const [logs, setLogs] = useState<CronLog[]>([]);
  const [showSecret, setShowSecret] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const supabaseUrl = 'https://api.databasepad.com';
  const webhookUrl = config?.cron_secret 
    ? `${supabaseUrl}/functions/v1/scheduled-compliance-reports/cron?secret=${config.cron_secret}`
    : '';

  const loadConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'get_cron_config' }
      });

      if (data?.config) {
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Error loading cron config:', error);
    }
  }, []);

  const loadLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'get_cron_logs', limit: 50 }
      });

      if (data?.logs) {
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Error loading cron logs:', error);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([loadConfig(), loadLogs()]);
      setLoading(false);
    };
    loadAll();
  }, [loadConfig, loadLogs]);

  const toggleEnabled = async () => {
    if (!config) return;

    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'update_cron_config', is_enabled: !config.is_enabled }
      });

      if (data?.config) {
        setConfig(data.config);
        toast({
          title: data.config.is_enabled ? 'Cron Job Enabled' : 'Cron Job Disabled',
          description: data.config.is_enabled 
            ? 'Scheduled reports will now be processed automatically'
            : 'Automatic report processing has been paused'
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update cron job status', variant: 'destructive' });
    }
  };

  const triggerNow = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'trigger_cron_now' }
      });

      if (data?.success) {
        toast({
          title: 'Cron Job Executed',
          description: `Processed ${data.processed} schedules, sent ${data.sent} reports in ${data.duration_ms}ms`
        });
        loadLogs();
        loadConfig();
      } else {
        toast({ title: 'Error', description: data?.error || 'Failed to trigger cron job', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to trigger cron job', variant: 'destructive' });
    } finally {
      setTriggering(false);
    }
  };

  const regenerateSecret = async () => {
    setRegenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('scheduled-compliance-reports', {
        body: { action: 'regenerate_cron_secret' }
      });

      if (data?.config) {
        setConfig(data.config);
        toast({
          title: 'Secret Regenerated',
          description: 'A new cron secret has been generated. Update your external cron service with the new URL.'
        });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to regenerate secret', variant: 'destructive' });
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied to clipboard` });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'started':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400">Failed</Badge>;
      case 'started':
        return <Badge className="bg-blue-500/20 text-blue-400">Running</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={`border-2 ${config?.is_enabled ? 'bg-green-500/10 border-green-500/30' : 'bg-slate-800/50 border-slate-700'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Cron Job Status</p>
                <p className={`text-2xl font-bold ${config?.is_enabled ? 'text-green-400' : 'text-slate-400'}`}>
                  {config?.is_enabled ? 'Active' : 'Disabled'}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${config?.is_enabled ? 'bg-green-500/20' : 'bg-slate-700'}`}>
                {config?.is_enabled ? (
                  <Zap className="w-8 h-8 text-green-400" />
                ) : (
                  <Pause className="w-8 h-8 text-slate-500" />
                )}
              </div>
            </div>
            <div className="mt-4">
              <Switch
                checked={config?.is_enabled || false}
                onCheckedChange={toggleEnabled}
              />
              <span className="ml-2 text-sm text-slate-400">
                {config?.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Last Execution</p>
                <p className="text-lg font-semibold text-white">
                  {formatDateTime(config?.last_run_at || null)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/20">
                <History className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Timer className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400">
                Runs every {config?.frequency_minutes || 60} minutes
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Next Scheduled Run</p>
                <p className="text-lg font-semibold text-white">
                  {formatDateTime(config?.next_run_at || null)}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Clock className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={triggerNow}
                disabled={triggering}
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600"
              >
                {triggering ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Run Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Configuration */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            External Cron Service Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <Server className="w-4 h-4" />
              Webhook URL
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={webhookUrl}
                  readOnly
                  className="bg-slate-900 border-slate-700 text-white font-mono text-sm pr-10"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Configure your external cron service to make a GET request to this URL every hour
            </p>
          </div>

          {/* Cron Secret */}
          <div className="space-y-2">
            <Label className="text-slate-300 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Cron Secret
            </Label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={showSecret ? (config?.cron_secret || '') : '••••••••••••••••••••••••'}
                  readOnly
                  className="bg-slate-900 border-slate-700 text-white font-mono text-sm pr-20"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSecret(!showSecret)}
                    className="text-slate-400 hover:text-white"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(config?.cron_secret || '', 'Cron Secret')}
                    className="text-slate-400 hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={regenerateSecret}
                disabled={regenerating}
                className="border-slate-600 text-slate-300"
              >
                {regenerating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Keep this secret secure. Regenerating will invalidate the old URL.
            </p>
          </div>

          {/* Setup Instructions */}
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-green-400" />
              Setup Instructions
            </h4>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-slate-300 font-medium mb-2">Option 1: cron-job.org (Free)</p>
                <ol className="list-decimal list-inside text-slate-400 space-y-1">
                  <li>Go to <a href="https://cron-job.org" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">cron-job.org</a> and create a free account</li>
                  <li>Click "Create Cronjob"</li>
                  <li>Paste the webhook URL above</li>
                  <li>Set schedule to "Every hour" (0 * * * *)</li>
                  <li>Save and enable the job</li>
                </ol>
              </div>
              
              <div>
                <p className="text-slate-300 font-medium mb-2">Option 2: EasyCron (Free tier available)</p>
                <ol className="list-decimal list-inside text-slate-400 space-y-1">
                  <li>Go to <a href="https://www.easycron.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">easycron.com</a></li>
                  <li>Create an account and add a new cron job</li>
                  <li>Use the webhook URL and set interval to 60 minutes</li>
                </ol>
              </div>

              <div>
                <p className="text-slate-300 font-medium mb-2">Option 3: Vercel Cron (If using Vercel)</p>
                <div className="bg-slate-800 rounded p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{`// vercel.json
{
  "crons": [{
    "path": "/api/trigger-compliance-reports",
    "schedule": "0 * * * *"
  }]
}`}</pre>
                </div>
              </div>

              <div>
                <p className="text-slate-300 font-medium mb-2">Option 4: curl command (for testing)</p>
                <div className="bg-slate-800 rounded p-3 font-mono text-xs text-slate-300 overflow-x-auto">
                  <pre>{`curl -X GET "${webhookUrl}"`}</pre>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Logs */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-400" />
            Execution History
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadLogs}
            className="border-slate-600 text-slate-300"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Executions Yet</h3>
              <p className="text-slate-400">Cron job execution history will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-400 font-medium">Status</th>
                    <th className="text-left p-3 text-slate-400 font-medium">Execution Time</th>
                    <th className="text-left p-3 text-slate-400 font-medium">Duration</th>
                    <th className="text-left p-3 text-slate-400 font-medium">Processed</th>
                    <th className="text-left p-3 text-slate-400 font-medium">Sent</th>
                    <th className="text-left p-3 text-slate-400 font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </td>
                      <td className="p-3 text-white">{formatDateTime(log.execution_time)}</td>
                      <td className="p-3 text-slate-400">{formatDuration(log.duration_ms)}</td>
                      <td className="p-3">
                        <Badge className="bg-blue-500/20 text-blue-400">
                          {log.reports_processed} schedules
                        </Badge>
                      </td>
                      <td className="p-3">
                        <Badge className="bg-green-500/20 text-green-400">
                          {log.reports_sent} emails
                        </Badge>
                      </td>
                      <td className="p-3 text-red-400 text-sm max-w-xs truncate">
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="bg-amber-500/10 border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-400 mt-0.5" />
            <div>
              <h4 className="text-amber-400 font-medium">Security Notice</h4>
              <p className="text-slate-300 text-sm mt-1">
                The webhook URL contains a secret token that authenticates cron requests. 
                Keep this URL private and only share it with trusted cron services. 
                If you suspect the URL has been compromised, regenerate the secret immediately.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
