import { createClient } from '@supabase/supabase-js';

// Initialize database client with enhanced configuration
const supabaseUrl = 'https://rqeipfewtwwvepzbkntp.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImExNjA2NzBmLTgxZjktNDY5Yi1hMmQwLWUyYWI5MmViZDNiMyJ9.eyJwcm9qZWN0SWQiOiJycWVpcGZld3R3d3ZlcHpia250cCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYyODg4NTQ2LCJleHAiOjIwNzgyNDg1NDYsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.zxE3Djcbmno_crt-hqi9KJIw4VWo4nroSvBnKDPe4fc';

// Storage key used by Supabase auth to persist session
const STORAGE_KEY = `sb-rqeipfewtwwvepzbkntp-auth-token`;

/**
 * Safely clear a potentially corrupted or expired auth session from localStorage.
 * This prevents infinite refresh loops when the token is stale.
 */
export function clearStaleSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage may not be available
  }
}

/**
 * Check if there's a stored session that might be stale
 */
export function hasStoredSession(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    return false;
  }
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
    // Disable heartbeat timeout to prevent disconnections
    heartbeatIntervalMs: 30000,
    reconnectAfterMs: (tries: number) => {
      // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
      return Math.min(1000 * Math.pow(2, tries), 30000);
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'digiwell-web'
    },
    fetch: (url, options) => {
      // Wrap the global fetch to handle network errors gracefully
      return fetch(url, {
        ...options,
        // Add a timeout for auth requests to prevent hanging
        signal: options?.signal || (typeof AbortController !== 'undefined'
          ? (() => {
              const controller = new AbortController();
              setTimeout(() => controller.abort(), 15000); // 15s timeout
              return controller.signal;
            })()
          : undefined),
      }).catch((err) => {
        const urlStr = typeof url === 'string' ? url : url?.toString?.() || '';
        
        // If this is a token refresh request that failed, clear the stale session
        // to prevent infinite retry loops
        if (urlStr.includes('/auth/v1/token') && urlStr.includes('grant_type=refresh_token')) {
          console.warn('[Supabase] Token refresh failed - clearing stale session:', err.message);
          clearStaleSession();
        }
        
        // Re-throw so Supabase client can handle it
        throw err;
      });
    }
  },
  db: {
    schema: 'public'
  }
});

// Global error handler for realtime WebSocket decode errors ("a is not iterable")
// This prevents the error from crashing the entire application
if (typeof window !== 'undefined') {
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (error && (
      (error.message && error.message.includes('is not iterable')) ||
      (typeof message === 'string' && message.includes('is not iterable'))
    )) {
      console.warn('[Realtime] Suppressed WebSocket decode error:', message);
      return true; // Prevent the error from propagating
    }
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Also catch unhandled promise rejections from realtime
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && (
      (event.reason.message && event.reason.message.includes('is not iterable')) ||
      (String(event.reason).includes('is not iterable'))
    )) {
      console.warn('[Realtime] Suppressed WebSocket promise rejection:', event.reason);
      event.preventDefault();
    }
  });
}

export { supabase };

