// Category Service Worker for Offline Support
const CACHE_NAME = 'rapidex-categories-v1';
const CATEGORY_API_PATTERN = /\/api\/categorias\/estabelecimentos\/\d+\/categorias/;

// URLs to cache for offline functionality
const urlsToCache = [
  '/categories',
  '/categories/create',
  '/categories/edit',
  // Add other category-related routes
];

// Install event - cache resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Category SW: Caching category resources');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Category SW: Installation complete');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('rapidex-categories-')) {
            console.log('Category SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Category SW: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - handle network requests
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle category API requests
  if (CATEGORY_API_PATTERN.test(url.pathname)) {
    event.respondWith(handleCategoryApiRequest(request));
    return;
  }

  // Handle category page requests
  if (url.pathname.startsWith('/categories')) {
    event.respondWith(handleCategoryPageRequest(request));
    return;
  }

  // Handle other requests with default strategy
  event.respondWith(handleDefaultRequest(request));
});

// Handle category API requests with network-first strategy
async function handleCategoryApiRequest(request) {
  const cacheKey = `api-${request.url}-${request.method}`;
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful GET responses
      if (request.method === 'GET') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(cacheKey, networkResponse.clone());
      }
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Category SW: Network failed, trying cache for:', request.url);
    
    // For GET requests, try to return cached response
    if (request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(cacheKey);
      
      if (cachedResponse) {
        console.log('Category SW: Returning cached response for:', request.url);
        return cachedResponse;
      }
    }
    
    // For POST/PUT/DELETE requests when offline, return a custom response
    // The app will handle these with the offline queue
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      return new Response(
        JSON.stringify({
          error: 'offline',
          message: 'Request queued for when online',
          queued: true
        }),
        {
          status: 202, // Accepted
          statusText: 'Queued for sync',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    // Return network error for other cases
    throw error;
  }
}

// Handle category page requests with cache-first strategy
async function handleCategoryPageRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Category SW: Returning cached page for:', request.url);
      return cachedResponse;
    }
    
    // If not in cache, try network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Category SW: Failed to load page:', request.url, error);
    
    // Return offline page or error response
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Rapidex</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background-color: #f5f5f5;
            }
            .offline-message {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 0 auto;
            }
            .offline-icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 { color: #333; margin-bottom: 10px; }
            p { color: #666; line-height: 1.5; }
            .retry-btn {
              background: #2196f3;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 6px;
              cursor: pointer;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="offline-icon">📱</div>
            <h1>Você está offline</h1>
            <p>Esta página não está disponível offline. Verifique sua conexão com a internet e tente novamente.</p>
            <button class="retry-btn" onclick="window.location.reload()">
              Tentar Novamente
            </button>
          </div>
        </body>
      </html>
      `,
      {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'text/html'
        }
      }
    );
  }
}

// Handle other requests with default caching strategy
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Background sync for category operations
self.addEventListener('sync', event => {
  console.log('Category SW: Background sync triggered:', event.tag);
  
  if (event.tag === 'category-sync') {
    event.waitUntil(syncCategoryOperations());
  }
});

// Sync category operations when back online
async function syncCategoryOperations() {
  try {
    console.log('Category SW: Starting category sync');
    
    // Notify the main app to start syncing
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_CATEGORIES',
        timestamp: Date.now()
      });
    });
    
    console.log('Category SW: Category sync notification sent');
  } catch (error) {
    console.error('Category SW: Sync failed:', error);
  }
}

// Handle messages from the main app
self.addEventListener('message', event => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_CATEGORY_DATA':
      handleCacheCategoryData(data);
      break;
      
    case 'CLEAR_CATEGORY_CACHE':
      handleClearCategoryCache();
      break;
      
    default:
      console.log('Category SW: Unknown message type:', type);
  }
});

// Cache category data from the main app
async function handleCacheCategoryData(data) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey = `category-data-${data.estabelecimentoId}`;
    
    const response = new Response(JSON.stringify(data.categories), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=300' // 5 minutes
      }
    });
    
    await cache.put(cacheKey, response);
    console.log('Category SW: Cached category data for establishment:', data.estabelecimentoId);
  } catch (error) {
    console.error('Category SW: Failed to cache category data:', error);
  }
}

// Clear category cache
async function handleClearCategoryCache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    
    const categoryKeys = keys.filter(request => 
      request.url.includes('category-data-') || 
      request.url.includes('/api/categorias/')
    );
    
    await Promise.all(categoryKeys.map(key => cache.delete(key)));
    console.log('Category SW: Cleared category cache');
  } catch (error) {
    console.error('Category SW: Failed to clear category cache:', error);
  }
}

// Periodic cleanup of old cache entries
setInterval(async () => {
  try {
    const cache = await caches.open(CACHE_NAME);
    const keys = await cache.keys();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const responseDate = new Date(dateHeader).getTime();
          if (now - responseDate > maxAge) {
            await cache.delete(request);
            console.log('Category SW: Cleaned up old cache entry:', request.url);
          }
        }
      }
    }
  } catch (error) {
    console.error('Category SW: Cache cleanup failed:', error);
  }
}, 60 * 60 * 1000); // Run every hour