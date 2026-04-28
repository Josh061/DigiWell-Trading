import { supabase } from '@/lib/supabase';

export type EmailTemplateType = 
  | 'application_submitted'
  | 'application_status_update'
  | 'price_alert_trigger'
  | 'order_confirmation'
  | 'payment_receipt'
  | 'kyc_status_change'
  | 'dispute_update'
  | 'weekly_market_summary';

/**
 * Send a templated email notification via the sendgrid-notifications edge function.
 * This is fire-and-forget - errors are logged but never thrown.
 */
export async function sendEmailNotification(
  templateType: EmailTemplateType,
  toEmail: string,
  toName: string,
  data: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: response, error } = await supabase.functions.invoke('sendgrid-notifications', {
      body: {
        action: 'send_template_email',
        to_email: toEmail,
        to_name: toName,
        template_type: templateType,
        data,
      }
    });

    if (error) {
      console.warn('Email notification error:', error);
      return { success: false, error: error.message };
    }

    return { success: response?.success ?? true };
  } catch (error: any) {
    console.warn('Email notification error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log an email event to the email_logs table (non-blocking)
 */
export async function logEmailEvent(
  userId: string | null,
  emailType: string,
  recipientEmail: string,
  subject: string,
  status: 'sent' | 'failed' = 'sent',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('email_logs').insert({
      user_id: userId,
      email_type: emailType,
      recipient_email: recipientEmail,
      subject,
      status,
      metadata: metadata || {},
    });
  } catch (e) {
    console.warn('Failed to log email event:', e);
  }
}

// Convenience functions
export const sendOrderConfirmation = (toEmail: string, toName: string, data: Record<string, any>) =>
  sendEmailNotification('order_confirmation', toEmail, toName, data);

export const sendPaymentReceipt = (toEmail: string, toName: string, data: Record<string, any>) =>
  sendEmailNotification('payment_receipt', toEmail, toName, data);

export const sendApplicationSubmitted = (toEmail: string, toName: string, data: Record<string, any>) =>
  sendEmailNotification('application_submitted', toEmail, toName, data);

export const sendPriceAlertEmail = (toEmail: string, toName: string, data: Record<string, any>) =>
  sendEmailNotification('price_alert_trigger', toEmail, toName, data);

export const sendKYCStatusChange = (toEmail: string, toName: string, data: Record<string, any>) =>
  sendEmailNotification('kyc_status_change', toEmail, toName, data);

export const sendDisputeUpdate = (toEmail: string, toName: string, data: Record<string, any>) =>
  sendEmailNotification('dispute_update', toEmail, toName, data);

/**
 * Check user's email preferences before sending.
 * Returns true if the user wants to receive this type of email.
 */
export async function checkEmailPreference(
  userId: string,
  preferenceKey: string
): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('email_preferences')
      .select(preferenceKey)
      .eq('user_id', userId)
      .single();
    
    if (!data) return true; // Default to sending if no preferences set
    return data[preferenceKey] !== false;
  } catch {
    return true; // Default to sending on error
  }
}

/**
 * Send email only if user has the preference enabled.
 */
export async function sendEmailWithPreferenceCheck(
  userId: string,
  preferenceKey: string,
  templateType: EmailTemplateType,
  toEmail: string,
  toName: string,
  data: Record<string, any>
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const shouldSend = await checkEmailPreference(userId, preferenceKey);
  if (!shouldSend) {
    return { success: true, skipped: true };
  }
  return sendEmailNotification(templateType, toEmail, toName, data);
}
