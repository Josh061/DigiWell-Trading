import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  WifiOff,
  Wifi,
  RefreshCw,
  CloudOff,
  Cloud,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';

interface QueuedAction {
  id: string;
  type: string;
  timestamp: number;
}

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      // Auto-hide after 3 seconds when back online
      setTimeout(() => setShowBanner(false), 3000);
      // Trigger sync
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    // Listen for online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for service worker messages
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Check initial status
    if (!navigator.onLine) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  }, []);

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { data } = event;
    
    if (data.type === 'ONLINE_STATUS') {
      setIsOnline(data.online);
      setShowBanner(!data.online);
    }
    
    if (data.type === 'SYNC_SUCCESS') {
      // Remove synced item from queue
      setQueuedActions(prev => prev.filter(action => action.type !== data.action));
    }
    
    if (data.type === 'QUEUE_UPDATE') {
      setQueuedActions(data.items || []);
    }
  };

  const triggerSync = async () => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    
    setSyncing(true);
    
    try {
      // Request sync from service worker
      if ('sync' in (navigator.serviceWorker as any)) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-all');
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setTimeout(() => setSyncing(false), 2000);
    }
  };

  const getQueueStatus = async () => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return;
    
    const messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = (event) => {
      setQueuedActions(event.data.items || []);
    };
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'GET_QUEUE_STATUS' },
      [messageChannel.port2]
    );
  };

  useEffect(() => {
    getQueueStatus();
    const interval = setInterval(getQueueStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!showBanner && queuedActions.length === 0) return null;

  return (
    <>
      {/* Floating Indicator */}
      <div className="fixed bottom-20 md:bottom-6 left-4 z-50">
        <Badge
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-all ${
            isOnline
              ? 'bg-green-500/20 text-green-400 border-green-500/30 hover:bg-green-500/30'
              : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30 animate-pulse'
          }`}
          onClick={() => setShowDetails(!showDetails)}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              Online
              {syncing && <RefreshCw className="w-3 h-3 animate-spin" />}
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              Offline
              {queuedActions.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 rounded-full">
                  {queuedActions.length}
                </span>
              )}
            </>
          )}
        </Badge>
      </div>

      {/* Details Panel */}
      {showDetails && (
        <div className="fixed bottom-32 md:bottom-16 left-4 z-50 w-72">
          <Card className="bg-slate-800 border-slate-700 shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isOnline ? (
                    <Cloud className="w-5 h-5 text-green-400" />
                  ) : (
                    <CloudOff className="w-5 h-5 text-red-400" />
                  )}
                  <span className="text-white font-medium">
                    {isOnline ? 'Connected' : 'Offline Mode'}
                  </span>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {!isOnline && (
                <p className="text-slate-400 text-sm mb-3">
                  You're currently offline. Your actions will be saved and synced when you're back online.
                </p>
              )}

              {queuedActions.length > 0 && (
                <div className="space-y-2 mb-3">
                  <p className="text-slate-300 text-sm font-medium">
                    Pending Actions ({queuedActions.length})
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {queuedActions.map((action) => (
                      <div
                        key={action.id}
                        className="flex items-center gap-2 text-xs bg-slate-900/50 p-2 rounded"
                      >
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span className="text-slate-300 capitalize">{action.type}</span>
                        <span className="text-slate-500 ml-auto">
                          {new Date(action.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isOnline && queuedActions.length > 0 && (
                <Button
                  size="sm"
                  onClick={triggerSync}
                  disabled={syncing}
                  className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-slate-900"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}

              {isOnline && queuedActions.length === 0 && (
                <div className="flex items-center gap-2 text-green-400 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  All data synced
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top Banner for Offline */}
      {!isOnline && showBanner && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 z-50 flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">
            You're offline. Changes will be saved and synced when you're back online.
          </span>
          <button
            onClick={() => setShowBanner(false)}
            className="ml-4 hover:bg-red-600 p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}

// Hook for queuing offline actions
export const useOfflineQueue = () => {
  const queueAction = async (
    actionType: string,
    url: string,
    body: any,
    method: string = 'POST'
  ) => {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      console.warn('Service worker not available');
      return false;
    }

    navigator.serviceWorker.controller.postMessage({
      type: 'QUEUE_ACTION',
      actionType,
      url,
      method,
      body,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return true;
  };

  const isOnline = () => navigator.onLine;

  return { queueAction, isOnline };
};
