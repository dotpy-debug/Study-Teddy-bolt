// Service Worker for Study Teddy - Offline Support and Performance
const CACHE_NAME = 'study-teddy-v1'
const STATIC_CACHE_NAME = 'study-teddy-static-v1'
const DYNAMIC_CACHE_NAME = 'study-teddy-dynamic-v1'

// Cache static assets immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Core CSS and JS will be added automatically by Next.js
]

// Cache API responses for offline functionality
const API_CACHE_PATTERNS = [
  /\/api\/subjects/,
  /\/api\/tasks/,
  /\/api\/focus-sessions/,
  /\/api\/goals/,
  /\/api\/analytics/
]

// Images and assets that should be cached
const IMAGE_CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
  /\/images\//,
  /\/icons\//
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Static assets cached')
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME &&
              cacheName !== CACHE_NAME
            ) {
              console.log('[SW] Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service worker activated')
        // Take control of all pages immediately
        return self.clients.claim()
      })
  )
})

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return
  }

  // Handle different types of requests with appropriate strategies
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME))
  } else if (isImage(request)) {
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE_NAME))
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirstWithCacheStrategy(request, DYNAMIC_CACHE_NAME))
  } else if (isNavigationRequest(request)) {
    event.respondWith(networkFirstWithOfflineStrategy(request))
  } else {
    event.respondWith(networkFirstStrategy(request))
  }
})

// Strategy: Cache First (for static assets)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch (error) {
    console.error('[SW] Cache first strategy failed:', error)
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// Strategy: Network First with Cache Fallback (for API requests)
async function networkFirstWithCacheStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      // Only cache GET requests with successful responses
      if (request.method === 'GET') {
        cache.put(request, networkResponse.clone())
      }
    }

    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed, trying cache for:', request.url)

    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      // Add a header to indicate this is a cached response
      const response = cachedResponse.clone()
      response.headers.set('X-Served-By', 'SW-Cache')
      return response
    }

    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This data is not available offline',
        cached: false
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'SW-Offline'
        }
      }
    )
  }
}

// Strategy: Network First with Offline Page (for navigation)
async function networkFirstWithOfflineStrategy(request) {
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log('[SW] Network failed for navigation, serving offline page')

    const cache = await caches.open(STATIC_CACHE_NAME)
    const offlineResponse = await cache.match('/offline.html')

    if (offlineResponse) {
      return offlineResponse
    }

    // Fallback offline page if none cached
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Offline - Study Teddy</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body {
              font-family: system-ui, sans-serif;
              text-align: center;
              padding: 50px;
              background: #f5f5f5;
            }
            .offline-container {
              max-width: 400px;
              margin: 0 auto;
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #333; margin-bottom: 20px; }
            p { color: #666; line-height: 1.5; }
            button {
              background: #007bff;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 4px;
              cursor: pointer;
              margin-top: 20px;
            }
            button:hover { background: #0056b3; }
          </style>
        </head>
        <body>
          <div class="offline-container">
            <h1>You're Offline</h1>
            <p>Study Teddy needs an internet connection to work properly. Please check your connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}

// Strategy: Network First (default)
async function networkFirstStrategy(request) {
  try {
    return await fetch(request)
  } catch (error) {
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// Helper functions to categorize requests
function isStaticAsset(request) {
  const url = new URL(request.url)
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.includes('.css') ||
    url.pathname.includes('.js') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/favicon.ico'
  )
}

function isImage(request) {
  return IMAGE_CACHE_PATTERNS.some(pattern => pattern.test(request.url))
}

function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))
}

function isNavigationRequest(request) {
  return request.mode === 'navigate'
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag)

  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks())
  } else if (event.tag === 'sync-focus-sessions') {
    event.waitUntil(syncFocusSessions())
  }
})

// Sync offline tasks when connection is restored
async function syncTasks() {
  try {
    console.log('[SW] Syncing offline tasks...')

    // Get offline tasks from IndexedDB (implementation would depend on your offline storage)
    // This is a placeholder for the actual sync logic
    const offlineTasks = await getOfflineTasks()

    for (const task of offlineTasks) {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task)
        })

        if (response.ok) {
          await removeOfflineTask(task.id)
          console.log('[SW] Task synced successfully:', task.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync task:', task.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Sync offline focus sessions
async function syncFocusSessions() {
  try {
    console.log('[SW] Syncing offline focus sessions...')

    const offlineSessions = await getOfflineFocusSessions()

    for (const session of offlineSessions) {
      try {
        const response = await fetch('/api/focus-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(session)
        })

        if (response.ok) {
          await removeOfflineFocusSession(session.id)
          console.log('[SW] Focus session synced successfully:', session.id)
        }
      } catch (error) {
        console.error('[SW] Failed to sync focus session:', session.id, error)
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error)
  }
}

// Placeholder functions for offline storage
// These would be implemented with IndexedDB or similar
async function getOfflineTasks() {
  // Implementation would retrieve tasks from IndexedDB
  return []
}

async function removeOfflineTask(taskId) {
  // Implementation would remove task from IndexedDB
}

async function getOfflineFocusSessions() {
  // Implementation would retrieve focus sessions from IndexedDB
  return []
}

async function removeOfflineFocusSession(sessionId) {
  // Implementation would remove focus session from IndexedDB
}

// Handle push notifications (for future implementation)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')

  if (!event.data) {
    return
  }

  const data = event.data.json()

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification.tag)

  event.notification.close()

  const data = event.notification.data
  const action = event.action

  let url = '/'

  if (action === 'view-tasks') {
    url = '/tasks'
  } else if (action === 'start-focus') {
    url = '/focus'
  } else if (data && data.url) {
    url = data.url
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }

      // Open new window if none found
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then((size) => {
      event.ports[0].postMessage({ cacheSize: size })
    })
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ cleared: true })
    })
  }
})

async function getCacheSize() {
  const cacheNames = await caches.keys()
  let totalSize = 0

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const requests = await cache.keys()

    for (const request of requests) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.blob()
        totalSize += blob.size
      }
    }
  }

  return totalSize
}

async function clearAllCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)))
}