import { supabase } from '@/lib/supabase';

/**
 * Safely create a Supabase realtime channel with error handling.
 * Wraps channel creation in try-catch and adds error event handlers
 * to prevent "a is not iterable" decode errors from crashing the app.
 */
export function safeChannel(channelName: string) {
  try {
    const channel = supabase.channel(channelName);
    return channel;
  } catch (err) {
    console.warn(`[Realtime] Failed to create channel "${channelName}":`, err);
    return null;
  }
}

/**
 * Safely subscribe to a channel with error handling.
 * Returns a cleanup function.
 */
export function safeSubscribe(
  channelName: string,
  config: {
    event: string;
    schema?: string;
    table: string;
    filter?: string;
  },
  callback: (payload: any) => void
): () => void {
  try {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event: config.event as any,
          schema: config.schema || 'public',
          table: config.table,
          ...(config.filter ? { filter: config.filter } : {}),
        },
        (payload: any) => {
          try {
            callback(payload);
          } catch (err) {
            console.warn(`[Realtime] Callback error on "${channelName}":`, err);
          }
        }
      )
      .subscribe((status: string, err?: Error) => {
        if (err) {
          console.warn(`[Realtime] Subscription error on "${channelName}":`, err);
        }
      });

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (err) {
        console.warn(`[Realtime] Cleanup error on "${channelName}":`, err);
      }
    };
  } catch (err) {
    console.warn(`[Realtime] Failed to subscribe "${channelName}":`, err);
    return () => {};
  }
}

/**
 * Safely remove a channel
 */
export function safeRemoveChannel(channel: any) {
  if (!channel) return;
  try {
    supabase.removeChannel(channel);
  } catch (err) {
    console.warn('[Realtime] Error removing channel:', err);
  }
}
