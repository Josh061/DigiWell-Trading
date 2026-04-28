import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { cachePrices, getCachedPrices, FALLBACK_PRICES, getCacheAge } from '@/lib/priceCache';

export interface LivePrice {
  id: string;
  symbol: string;
  name: string;
  category: string;
  price: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  unit: string;
  timestamp: number;
  source: string;
  direction: 'up' | 'down' | 'neutral';
  flash?: 'up' | 'down' | null;
}

interface UseLivePricesOptions {
  enabled?: boolean;
  onPriceUpdate?: (prices: LivePrice[]) => void;
  onAlertTriggered?: (alert: any) => void;
}

interface UseLivePricesReturn {
  prices: LivePrice[];
  priceMap: Record<string, LivePrice>;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  reconnect: () => void;
  lastUpdate: Date | null;
  getPriceBySymbol: (symbol: string) => LivePrice | undefined;
  checkPriceAlerts: (alerts: any[]) => any[];
}

const SUPABASE_FUNCTIONS_URL = 'https://rqeipfewtwwvepzbkntp.supabase.co/functions/v1';

export function useLivePrices(options: UseLivePricesOptions = {}): UseLivePricesReturn {
  const { enabled = true, onPriceUpdate, onAlertTriggered } = options;
  
  const [prices, setPrices] = useState<LivePrice[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, LivePrice>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const previousPricesRef = useRef<Record<string, number>>({});
  const alertsRef = useRef<any[]>([]);

  const processPrices = useCallback((rawPrices: Record<string, any>): LivePrice[] => {
    return Object.entries(rawPrices).map(([symbol, data]: [string, any]) => {
      const prevPrice = previousPricesRef.current[symbol];
      let flash: 'up' | 'down' | null = null;
      let direction: 'up' | 'down' | 'neutral' = 'neutral';
      
      // Safe number helper
      const safeNum = (val: any, fallback: number = 0): number => {
        if (val === null || val === undefined || isNaN(Number(val))) return fallback;
        return Number(val);
      };

      const currentPrice = safeNum(data?.price);
      const currentChange = safeNum(data?.change);
      const currentChangePercent = safeNum(data?.changePercent);
      
      if (prevPrice !== undefined && prevPrice !== currentPrice) {
        flash = currentPrice > prevPrice ? 'up' : 'down';
        direction = currentPrice > prevPrice ? 'up' : 'down';
      } else if (currentChange > 0) {
        direction = 'up';
      } else if (currentChange < 0) {
        direction = 'down';
      }
      
      previousPricesRef.current[symbol] = currentPrice;
      
      return {
        id: symbol,
        symbol: data?.symbol || symbol,
        name: data?.name || symbol,
        category: data?.category || 'other',
        price: currentPrice,
        previousPrice: safeNum(data?.previousPrice, prevPrice !== undefined ? prevPrice : currentPrice),
        change: currentChange,
        changePercent: currentChangePercent,
        unit: data?.category === 'oil' ? '/bbl' : '/oz',
        timestamp: data?.timestamp || Date.now(),
        source: data?.source || 'OilPrice.com',
        direction,
        flash
      };
    });
  }, []);


  const checkPriceAlerts = useCallback((alerts: any[]): any[] => {
    const triggeredAlerts: any[] = [];
    
    alerts.forEach(alert => {
      const price = priceMap[alert.commodity_symbol];
      if (!price || !alert.is_active) return;
      
      const shouldTrigger = 
        (alert.alert_type === 'above' && price.price >= alert.threshold_price) ||
        (alert.alert_type === 'below' && price.price <= alert.threshold_price);
      
      if (shouldTrigger) {
        triggeredAlerts.push({
          ...alert,
          currentPrice: price.price,
          triggeredAt: new Date().toISOString()
        });
        
        if (onAlertTriggered) {
          onAlertTriggered({
            ...alert,
            currentPrice: price.price
          });
        }
      }
    });
    
    return triggeredAlerts;
  }, [priceMap, onAlertTriggered]);

  const updatePrices = useCallback((newPrices: LivePrice[]) => {
    setPrices(newPrices);
    
    const map: Record<string, LivePrice> = {};
    newPrices.forEach(p => {
      map[p.id] = p;
      map[p.symbol] = p;
    });
    setPriceMap(map);
    
    setLastUpdate(new Date());
    
    if (onPriceUpdate) {
      onPriceUpdate(newPrices);
    }
    
    // Check alerts
    if (alertsRef.current.length > 0) {
      checkPriceAlerts(alertsRef.current);
    }
    
    // Clear flash after animation
    setTimeout(() => {
      setPrices(prev => prev.map(p => ({ ...p, flash: null })));
    }, 500);
  }, [onPriceUpdate, checkPriceAlerts]);

  const pollPrices = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('price-stream', {
        body: {}
      });
      
      if (!fetchError && data?.prices) {
        const newPrices = processPrices(data.prices);
        updatePrices(newPrices);
        setIsConnected(true);
        
        // Cache successful prices to localStorage
        try {
          cachePrices(data.prices);
        } catch (cacheErr) {
          console.warn('[LivePrices] Cache write failed:', cacheErr);
        }
      } else {
        // API failed - try to load from cache
        loadFromCache();
      }
    } catch (e) {
      console.error('[LivePrices] Polling error:', e);
      // On error, try to load cached prices
      loadFromCache();
    }
  }, [processPrices, updatePrices]);

  const loadFromCache = useCallback(() => {
    const cached = getCachedPrices();
    if (cached && Object.keys(cached.prices).length > 0) {
      console.log('[LivePrices] Loading from cache, age:', getCacheAge());
      const cachedLivePrices = processPrices(cached.prices);
      updatePrices(cachedLivePrices);
      setError(`Using cached prices (updated ${getCacheAge() || 'recently'})`);
    } else {
      // Use hardcoded fallback prices as last resort
      console.log('[LivePrices] Loading fallback prices');
      const fallbackLivePrices = processPrices(FALLBACK_PRICES);
      updatePrices(fallbackLivePrices);
      setError('Using estimated prices - live feed unavailable');
    }
  }, [processPrices, updatePrices]);


  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    console.log('[LivePrices] Starting polling');
    pollPrices();
    pollingIntervalRef.current = setInterval(pollPrices, 3000);
  }, [pollPrices]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!enabled) return;
    
    setIsConnecting(true);
    setError(null);
    
    // Use polling for reliability
    startPolling();
    setIsConnecting(false);
  }, [enabled, startPolling]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    stopPolling();
    setIsConnected(false);
    setIsConnecting(false);
  }, [stopPolling]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  const getPriceBySymbol = useCallback((symbol: string): LivePrice | undefined => {
    return priceMap[symbol] || priceMap[symbol.toUpperCase()];
  }, [priceMap]);

  // Connect on mount if enabled
  useEffect(() => {
    if (enabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // Load user's price alerts
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data } = await supabase
          .from('price_alerts_config')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (data) {
          alertsRef.current = data;
        }
      } catch (e) {
        console.error('Error loading alerts:', e);
      }
    };
    
    loadAlerts();
  }, []);

  return {
    prices,
    priceMap,
    isConnected,
    isConnecting,
    error,
    reconnect,
    lastUpdate,
    getPriceBySymbol,
    checkPriceAlerts
  };
}

export default useLivePrices;
