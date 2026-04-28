import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Monitor, Smartphone, Tablet, Globe, MapPin, Clock, Shield,
  LogOut, Trash2, AlertTriangle, CheckCircle, Loader2, RefreshCw
} from 'lucide-react';

interface Session {
  id: string;
  device_type: string;
  browser: string;
  os: string;
  ip_address: string;
  location: string;
  country: string;
  city: string;
  last_activity: string;
  created_at: string;
  is_active: boolean;
  is_current: boolean;
}

export default function SessionManagement() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (error) throw error;
      
      // Mark current session
      const currentToken = localStorage.getItem('session_token');
      const sessionsWithCurrent = (data || []).map(s => ({
        ...s,
        is_current: s.session_token === currentToken
      }));
      
      setSessions(sessionsWithCurrent);
    } catch (error) {
      console.error('Error loading sessions:', error);
      // Generate mock sessions for demo
      setSessions(generateMockSessions());
    } finally {
      setLoading(false);
    }
  };

  const generateMockSessions = (): Session[] => {
    return [
      {
        id: '1',
        device_type: 'Desktop',
        browser: 'Chrome 120',
        os: 'Windows 11',
        ip_address: '192.168.1.100',
        location: 'Lagos, Nigeria',
        country: 'Nigeria',
        city: 'Lagos',
        last_activity: new Date().toISOString(),
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_current: true
      },
      {
        id: '2',
        device_type: 'Mobile',
        browser: 'Safari 17',
        os: 'iOS 17',
        ip_address: '192.168.1.101',
        location: 'Lagos, Nigeria',
        country: 'Nigeria',
        city: 'Lagos',
        last_activity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_current: false
      },
      {
        id: '3',
        device_type: 'Tablet',
        browser: 'Firefox 121',
        os: 'Android 14',
        ip_address: '10.0.0.50',
        location: 'Abuja, Nigeria',
        country: 'Nigeria',
        city: 'Abuja',
        last_activity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
        is_current: false
      }
    ];
  };

  const revokeSession = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setMessage({ type: 'success', text: 'Session revoked successfully' });

      // Log security event
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('security_audit_log').insert({
          user_id: user.id,
          event_type: 'session_revoked',
          event_description: 'User revoked a session',
          success: true
        });
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      setMessage({ type: 'error', text: 'Failed to revoke session' });
    } finally {
      setRevoking(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const revokeAllOtherSessions = async () => {
    setRevoking('all');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentToken = localStorage.getItem('session_token');
      
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('user_id', user.id)
        .neq('session_token', currentToken || '');

      if (error) throw error;

      setSessions(prev => prev.filter(s => s.is_current));
      setMessage({ type: 'success', text: 'All other sessions have been revoked' });

      // Log security event
      await supabase.from('security_audit_log').insert({
        user_id: user.id,
        event_type: 'all_sessions_revoked',
        event_description: 'User revoked all other sessions',
        success: true
      });
    } catch (error) {
      console.error('Error revoking sessions:', error);
      setMessage({ type: 'error', text: 'Failed to revoke sessions' });
    } finally {
      setRevoking(null);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType.toLowerCase()) {
      case 'mobile':
        return <Smartphone className="w-5 h-5" />;
      case 'tablet':
        return <Tablet className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const formatLastActivity = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#D4AF37]" />
            Session Management
          </h2>
          <p className="text-slate-400 mt-1">Manage your active sessions across all devices</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadSessions} variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          {sessions.length > 1 && (
            <Button 
              onClick={revokeAllOtherSessions} 
              variant="destructive"
              disabled={revoking === 'all'}
            >
              {revoking === 'all' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4 mr-2" />
              )}
              Sign Out All Other Devices
            </Button>
          )}
        </div>
      </div>

      {message && (
        <Alert className={message.type === 'success' ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}>
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400" />
          )}
          <AlertDescription className={message.type === 'success' ? 'text-green-400' : 'text-red-400'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {sessions.map((session) => (
          <Card 
            key={session.id} 
            className={`bg-white/10 backdrop-blur-md border-white/20 ${session.is_current ? 'ring-2 ring-[#D4AF37]' : ''}`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${session.is_current ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'bg-white/10 text-slate-400'}`}>
                    {getDeviceIcon(session.device_type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {session.device_type} - {session.browser}
                      </h3>
                      {session.is_current && (
                        <Badge className="bg-[#D4AF37] text-slate-900">Current Session</Badge>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1">{session.os}</p>
                    
                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1 text-slate-400">
                        <Globe className="w-4 h-4" />
                        <span>{session.ip_address}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <MapPin className="w-4 h-4" />
                        <span>{session.location || `${session.city}, ${session.country}`}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>Last active: {formatLastActivity(session.last_activity)}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-2">
                      Session started: {new Date(session.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {!session.is_current && (
                  <Button
                    onClick={() => revokeSession(session.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    disabled={revoking === session.id}
                  >
                    {revoking === session.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Revoke
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sessions.length === 0 && (
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Active Sessions</h3>
            <p className="text-slate-400">You don't have any active sessions at the moment.</p>
          </CardContent>
        </Card>
      )}

      {/* Security Tips */}
      <Card className="bg-gradient-to-br from-[#D4AF37]/10 to-transparent border-[#D4AF37]/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#D4AF37]" />
            Security Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-slate-300 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Regularly review your active sessions and revoke any you don't recognize</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>If you notice suspicious activity, immediately revoke all sessions and change your password</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Enable two-factor authentication for additional security</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              <span>Always sign out when using shared or public computers</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
