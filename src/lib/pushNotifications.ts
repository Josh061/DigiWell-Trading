import { supabase } from './supabase';

// Push Notification Service
export class PushNotificationService {
  private static instance: PushNotificationService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  // Check if push notifications are supported
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Get current permission status
  getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  // Request notification permission
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  // Register service worker
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered');
      return this.swRegistration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  // Subscribe to push notifications
  async subscribe(userId: string): Promise<boolean> {
    if (!this.swRegistration) {
      await this.registerServiceWorker();
    }

    if (!this.swRegistration) return false;

    try {
      // Get existing subscription or create new one
      this.subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!this.subscription) {
        // Create new subscription (would need VAPID keys in production)
        // For now, we'll use local notifications
        console.log('Push subscription would be created here with VAPID keys');
      }

      // Store subscription in database
      await this.saveSubscription(userId);
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return false;
    }
  }

  // Save subscription to database
  private async saveSubscription(userId: string): Promise<void> {
    try {
      await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        subscription_data: this.subscription ? JSON.stringify(this.subscription) : null,
        device_type: this.getDeviceType(),
        is_active: true,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save subscription:', error);
    }
  }

  // Get device type
  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Windows Phone/.test(ua)) return 'windows_phone';
    return 'web';
  }

  // Show local notification
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (this.getPermissionStatus() !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    const defaultOptions: NotificationOptions = {
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200],
      tag: 'digiwell-notification',
      renotify: true,
      ...options
    };

    if (this.swRegistration) {
      await this.swRegistration.showNotification(title, defaultOptions);
    } else {
      new Notification(title, defaultOptions);
    }
  }

  // Show price alert notification
  async showPriceAlert(commodity: string, price: number, targetPrice: number, type: 'above' | 'below'): Promise<void> {
    const direction = type === 'above' ? 'risen above' : 'fallen below';
    await this.showNotification(
      `Price Alert: ${commodity}`,
      {
        body: `${commodity} has ${direction} your target of $${targetPrice.toFixed(2)}. Current price: $${price.toFixed(2)}`,
        icon: '/icons/price-alert.png',
        tag: `price-alert-${commodity}`,
        data: {
          type: 'price_alert',
          commodity,
          price,
          targetPrice
        },
        actions: [
          { action: 'view', title: 'View Prices' },
          { action: 'dismiss', title: 'Dismiss' }
        ]
      }
    );
  }

  // Show order update notification
  async showOrderUpdate(orderId: string, status: string, details?: string): Promise<void> {
    const statusMessages: Record<string, string> = {
      confirmed: 'Your order has been confirmed',
      processing: 'Your order is being processed',
      shipped: 'Your order has been shipped',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled'
    };

    await this.showNotification(
      `Order Update: ${orderId}`,
      {
        body: statusMessages[status] || `Order status: ${status}${details ? ` - ${details}` : ''}`,
        icon: '/icons/order-update.png',
        tag: `order-${orderId}`,
        data: {
          type: 'order_update',
          orderId,
          status
        },
        actions: [
          { action: 'view', title: 'View Order' },
          { action: 'track', title: 'Track Shipment' }
        ]
      }
    );
  }

  // Show auction notification
  async showAuctionNotification(auctionId: string, message: string, type: 'outbid' | 'won' | 'ending'): Promise<void> {
    const titles: Record<string, string> = {
      outbid: 'You\'ve been outbid!',
      won: 'Congratulations! You won!',
      ending: 'Auction ending soon'
    };

    await this.showNotification(
      titles[type] || 'Auction Update',
      {
        body: message,
        icon: '/icons/auction.png',
        tag: `auction-${auctionId}`,
        data: {
          type: 'auction',
          auctionId,
          notificationType: type
        },
        actions: [
          { action: 'view', title: 'View Auction' },
          { action: 'bid', title: 'Place Bid' }
        ]
      }
    );
  }

  // Show support message notification
  async showSupportMessage(conversationId: string, message: string, senderName: string): Promise<void> {
    await this.showNotification(
      `Message from ${senderName}`,
      {
        body: message.length > 100 ? message.substring(0, 100) + '...' : message,
        icon: '/icons/support.png',
        tag: `support-${conversationId}`,
        data: {
          type: 'support_message',
          conversationId
        },
        actions: [
          { action: 'reply', title: 'Reply' },
          { action: 'view', title: 'View Chat' }
        ]
      }
    );
  }

  // Unsubscribe from push notifications
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      if (this.subscription) {
        await this.subscription.unsubscribe();
        this.subscription = null;
      }

      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId);

      return true;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pushNotifications = PushNotificationService.getInstance();

// Hook for using push notifications in React components
export function usePushNotifications() {
  const service = PushNotificationService.getInstance();

  return {
    isSupported: service.isSupported(),
    permissionStatus: service.getPermissionStatus(),
    requestPermission: () => service.requestPermission(),
    subscribe: (userId: string) => service.subscribe(userId),
    unsubscribe: (userId: string) => service.unsubscribe(userId),
    showNotification: (title: string, options?: NotificationOptions) => 
      service.showNotification(title, options),
    showPriceAlert: (commodity: string, price: number, targetPrice: number, type: 'above' | 'below') =>
      service.showPriceAlert(commodity, price, targetPrice, type),
    showOrderUpdate: (orderId: string, status: string, details?: string) =>
      service.showOrderUpdate(orderId, status, details),
    showAuctionNotification: (auctionId: string, message: string, type: 'outbid' | 'won' | 'ending') =>
      service.showAuctionNotification(auctionId, message, type),
    showSupportMessage: (conversationId: string, message: string, senderName: string) =>
      service.showSupportMessage(conversationId, message, senderName)
  };
}
