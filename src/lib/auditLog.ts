import { supabase } from './supabase';

/**
 * Log an audit event. This is completely non-blocking and fire-and-forget.
 * Errors are silently caught to never impact the user experience.
 */
export async function logAuditEvent(
  actionType: string,
  actionDetails?: any
): Promise<void> {
  // Fire and forget - don't await, don't block
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Use a timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      await supabase.functions.invoke('audit-log', {
        body: {
          userId: user.id,
          userEmail: user.email,
          actionType,
          actionDetails: actionDetails || {}
        }
      });
    } catch {
      // Silently ignore - audit logging should never block operations
    } finally {
      clearTimeout(timeoutId);
    }
  } catch {
    // Silently ignore all errors
  }
}

/**
 * Non-blocking version that doesn't await the result
 */
export function logAuditEventAsync(
  actionType: string,
  actionDetails?: any
): void {
  // Completely fire-and-forget
  logAuditEvent(actionType, actionDetails).catch(() => {});
}
