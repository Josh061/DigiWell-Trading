// Digiwell Service Worker for Push Notifications and Offline Support
const CACHE_NAME = 'digiwell-v2';
const STATIC_CACHE = 'digiwell-static-v2';
const DYNAMIC_CACHE = 'digiwell-dynamic-v2';
const DATA_CACHE = 'digiwell-data-v2';

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/placeholder.svg'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/rest/v1/users',
  '/rest/v1/orders',
  '/rest/v1/auctions',
  '/rest/v1/commodities'
];

// Offline queue for background sync
let offlineQueue = [];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('digiwell-') && 
                     name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE && 
                     name !== DATA_CACHE;
            })
            .map((name) => caches.delete(name))
        );
      })
      .then(() => clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API requests - Network first, then cache
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/functions/v1/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets - Cache first, then network
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Dynamic content - Stale while revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// Cache first strategy
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response(JSON.stringify({ 
      error: 'Offline',
      message: 'You are currently offline. Data will sync when connection is restored.',
      cached: false
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);

  return cachedResponse || fetchPromise;
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  let data = {
    title: 'Digiwell Trading',
    body: 'You have a new notification',
    icon: '/icons/digiwell-icon.png',
    badge: '/icons/badge-72.png',
    tag: 'digiwell-notification',
    data: {}
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/icons/digiwell-icon.png',
    badge: data.badge || '/icons/badge-72.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'digiwell-notification',
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  const action = event.action;
  const notificationData = event.notification.data;
  
  let targetUrl = '/';
  
  // Handle different notification types
  if (notificationData.type === 'price_alert') {
    targetUrl = '/?tab=commodities';
  } else if (notificationData.type === 'order_update') {
    targetUrl = '/?tab=orders';
  } else if (notificationData.type === 'auction') {
    targetUrl = '/?tab=auctions';
  } else if (notificationData.type === 'support_message') {
    targetUrl = '/?tab=support';
  } else if (notificationData.type === 'comment') {
    targetUrl = '/?tab=news';
  }
  
  // Handle specific actions
  if (action === 'view') {
    // Default view action
  } else if (action === 'track') {
    targetUrl = '/?tab=shipping';
  } else if (action === 'bid') {
    targetUrl = '/?tab=auctions';
  } else if (action === 'reply') {
    targetUrl = '/?tab=support';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              action: action,
              data: notificationData
            });
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// Background sync for offline support
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event.tag);
  
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  } else if (event.tag === 'sync-bids') {
    event.waitUntil(syncBids());
  } else if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  } else if (event.tag === 'sync-alerts') {
    event.waitUntil(syncAlerts());
  } else if (event.tag === 'sync-all') {
    event.waitUntil(syncAll());
  }
});

// Sync orders when back online
async function syncOrders() {
  console.log('Syncing offline orders...');
  const queue = await getOfflineQueue('order');
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: JSON.stringify(item.body)
      });
      
      if (response.ok) {
        await removeFromQueue(item.id);
        await notifyClients({
          type: 'SYNC_SUCCESS',
          action: 'order',
          data: item.body
        });
      }
    } catch (error) {
      console.error('Failed to sync order:', error);
    }
  }
}

// Sync bids when back online
async function syncBids() {
  console.log('Syncing offline bids...');
  const queue = await getOfflineQueue('bid');
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: JSON.stringify(item.body)
      });
      
      if (response.ok) {
        await removeFromQueue(item.id);
        await notifyClients({
          type: 'SYNC_SUCCESS',
          action: 'bid',
          data: item.body
        });
      }
    } catch (error) {
      console.error('Failed to sync bid:', error);
    }
  }
}

// Sync comments when back online
async function syncComments() {
  console.log('Syncing offline comments...');
  const queue = await getOfflineQueue('comment');
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: JSON.stringify(item.body)
      });
      
      if (response.ok) {
        await removeFromQueue(item.id);
        await notifyClients({
          type: 'SYNC_SUCCESS',
          action: 'comment',
          data: item.body
        });
      }
    } catch (error) {
      console.error('Failed to sync comment:', error);
    }
  }
}

// Sync alerts when back online
async function syncAlerts() {
  console.log('Syncing offline alerts...');
  const queue = await getOfflineQueue('alert');
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: JSON.stringify(item.body)
      });
      
      if (response.ok) {
        await removeFromQueue(item.id);
      }
    } catch (error) {
      console.error('Failed to sync alert:', error);
    }
  }
}

// Sync all pending items
async function syncAll() {
  await syncOrders();
  await syncBids();
  await syncComments();
  await syncAlerts();
}

// Get items from offline queue
async function getOfflineQueue(type) {
  // In a real implementation, this would use IndexedDB
  return offlineQueue.filter(item => item.type === type);
}

// Remove item from queue
async function removeFromQueue(id) {
  offlineQueue = offlineQueue.filter(item => item.id !== id);
}

// Notify all clients
async function notifyClients(message) {
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  allClients.forEach(client => {
    client.postMessage(message);
  });
}

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'QUEUE_ACTION') {
    // Add action to offline queue
    const queueItem = {
      id: Date.now().toString(),
      type: event.data.actionType,
      url: event.data.url,
      method: event.data.method || 'POST',
      headers: event.data.headers || {},
      body: event.data.body,
      timestamp: Date.now()
    };
    offlineQueue.push(queueItem);
    
    // Try to sync immediately if online
    if (navigator.onLine) {
      self.registration.sync.register(`sync-${event.data.actionType}s`);
    }
  }
  
  if (event.data.type === 'GET_QUEUE_STATUS') {
    event.ports[0].postMessage({
      queueLength: offlineQueue.length,
      items: offlineQueue
    });
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.startsWith('digiwell-')) {
          caches.delete(name);
        }
      });
    });
  }
  
  if (event.data.type === 'CHECK_ONLINE_STATUS') {
    event.ports[0].postMessage({ online: navigator.onLine });
  }
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncAll());
  }
});

// Handle online/offline events
self.addEventListener('online', () => {
  console.log('Back online - syncing data...');
  syncAll();
  notifyClients({ type: 'ONLINE_STATUS', online: true });
});

self.addEventListener('offline', () => {
  console.log('Gone offline');
  notifyClients({ type: 'ONLINE_STATUS', online: false });
});
