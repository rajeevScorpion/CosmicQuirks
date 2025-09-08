const CACHE_NAME = 'cosmic-quirks-v4-navigation-fix';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/apple-touch-icon.svg'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (event.request.url.startsWith(self.location.origin)) {
    const url = new URL(event.request.url);
    
    // CRITICAL: Never cache auth-related requests
    const isAuthRequest = url.pathname.startsWith('/auth/') || 
                         url.pathname.startsWith('/api/auth') ||
                         url.pathname.includes('/api/user') ||
                         url.pathname.includes('/session') ||
                         event.request.headers.get('x-supabase-auth') ||
                         event.request.headers.has('authorization');

    // CRITICAL: Navigation requests should be network-first to get fresh server-rendered HTML
    const isNavigationRequest = event.request.mode === 'navigate';

    if (isAuthRequest || isNavigationRequest) {
      // Always go to network for auth and navigation requests, never cache
      event.respondWith(
        fetch(event.request).catch(() => {
          // For failed requests, provide appropriate fallbacks
          if (isNavigationRequest) {
            return new Response('Offline - Please check your connection', { status: 503 });
          }
          return new Response('Network Error', { status: 503 });
        })
      );
      return;
    }

    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached version or fetch from network
          if (response) {
            return response;
          }
          
          return fetch(event.request)
            .then((response) => {
              // Don't cache if not a valid response
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }

              // Only cache static assets, never auth-related responses
              if (event.request.method === 'GET' && 
                  (event.request.url.includes('/static/') || 
                   event.request.url.includes('/_next/static/')) &&
                  !isAuthRequest) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }

              return response;
            })
            .catch((error) => {
              // If network fails, try to serve the main page for navigation requests
              if (event.request.mode === 'navigate') {
                return caches.match('/');
              }
              throw error;
            });
        })
    );
  }
});

// Handle background sync for offline form submissions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'prediction-sync') {
    event.waitUntil(
      // Handle offline prediction submissions
      handleOfflinePredictions()
    );
  }
});

async function handleOfflinePredictions() {
  // Future: Handle queued predictions when back online
  console.log('Handling offline predictions...');
}