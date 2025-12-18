/**
 * Overmind Service Worker
 * Enables offline functionality and PWA features
 */

const CACHE_NAME = 'overmind-v1.0.0';
const RUNTIME_CACHE = 'overmind-runtime';

// Assets to cache on install
const PRECACHE_ASSETS = [
    '/',
    '/GUI.html',
    '/auth.html',
    '/css/tokens.css',
    '/css/base.css',
    '/css/components.css',
    '/css/style.css',
    '/js/app.js',
    '/js/ui-magic.js',
    '/manifest.json',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
    console.log('[ServiceWorker] Installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[ServiceWorker] Precaching assets');
                return cache.addAll(PRECACHE_ASSETS).catch(err => {
                    console.warn('[ServiceWorker] Some assets failed to cache:', err);
                    // Continue even if some assets fail
                    return Promise.resolve();
                });
            })
            .then(() => {
                console.log('[ServiceWorker] Install complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[ServiceWorker] Activating...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map((name) => {
                        console.log('[ServiceWorker] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[ServiceWorker] Activation complete');
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip WebSocket requests
    if (url.pathname.startsWith('/ws/')) {
        return;
    }

    // Skip API requests (except health check)
    if (url.pathname.startsWith('/api/') && !url.pathname.includes('/health')) {
        return;
    }

    // Handle same-origin requests
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    // Return cached response and update in background
                    event.waitUntil(
                        fetch(request)
                            .then((response) => {
                                if (response && response.status === 200) {
                                    const responseClone = response.clone();
                                    caches.open(RUNTIME_CACHE).then((cache) => {
                                        cache.put(request, responseClone);
                                    });
                                }
                            })
                            .catch(() => {
                                // Network error, cached version is fine
                            })
                    );
                    return cachedResponse;
                }

                // Not in cache, fetch from network
                return fetch(request).then((response) => {
                    // Don't cache non-successful responses
                    if (!response || response.status !== 200 || response.type === 'error') {
                        return response;
                    }

                    // Clone response for caching
                    const responseClone = response.clone();

                    // Cache HTML, CSS, JS, and images
                    if (
                        request.destination === 'document' ||
                        request.destination === 'style' ||
                        request.destination === 'script' ||
                        request.destination === 'image'
                    ) {
                        caches.open(RUNTIME_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }

                    return response;
                }).catch(() => {
                    // Network failed, return offline page if available
                    if (request.destination === 'document') {
                        return caches.match('/').then(response => {
                            return response || new Response(
                                '<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>',
                                {
                                    headers: { 'Content-Type': 'text/html' }
                                }
                            );
                        });
                    }
                    return new Response('Network error', { status: 408 });
                });
            })
        );
    }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
    console.log('[ServiceWorker] Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => caches.delete(name))
                );
            }).then(() => {
                event.ports[0].postMessage({ success: true });
            })
        );
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});

// Background sync for queued requests (future enhancement)
self.addEventListener('sync', (event) => {
    console.log('[ServiceWorker] Background sync:', event.tag);
    
    if (event.tag === 'sync-messages') {
        event.waitUntil(
            // Implement message sync logic here
            Promise.resolve()
        );
    }
});

// Push notifications (future enhancement)
self.addEventListener('push', (event) => {
    console.log('[ServiceWorker] Push notification received');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'Overmind';
    const options = {
        body: data.body || 'You have a new notification',
        icon: '/images/icon-192x192.png',
        badge: '/images/icon-72x72.png',
        data: data.url || '/',
        tag: data.tag || 'default',
        requireInteraction: false
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[ServiceWorker] Notification clicked');
    
    event.notification.close();
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (const client of clientList) {
                    if (client.url === event.notification.data && 'focus' in client) {
                        return client.focus();
                    }
                }
                // Open new window if none found
                if (clients.openWindow) {
                    return clients.openWindow(event.notification.data);
                }
            })
    );
});

console.log('[ServiceWorker] Script loaded');
