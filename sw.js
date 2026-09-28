// sw.js - SoundLRC Service Worker
const CACHE_NAME = 'soundlrc-v2';

// Assets to precache for offline use
const PRECACHE = [
    './',
    './index.html',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js'
];

// Install: precache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // addAll fails if ANY asset fails. Use individual adds for resilience.
            return Promise.allSettled(
                PRECACHE.map((url) =>
                    cache.add(url).catch((err) => console.warn('Precache miss:', url, err))
                )
            );
        })
    );
    self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

// Fetch: cache-first, fallback to network, then offline fallback
self.addEventListener('fetch', (event) => {
    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // Don't intercept blob/data URLs
    const url = event.request.url;
    if (url.startsWith('blob:') || url.startsWith('data:')) return;

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request)
                .then((response) => {
                    // Cache successful responses (same-origin + CORS-enabled CDN assets)
                    if (
                        response &&
                        response.status === 200 &&
                        (response.type === 'basic' || response.type === 'cors')
                    ) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    // Offline fallback: for navigation requests, serve index.html
                    if (event.request.mode === 'navigate') {
                        return caches.match('./index.html');
                    }
                });
        })
    );
});

// Allow page to trigger an update check
self.addEventListener('message', (event) => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
