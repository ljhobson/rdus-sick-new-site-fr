// sw.js (This runs in the browser in the background)
const CACHE_VERSION = 'v0';

self.addEventListener('install', (event) => {
    console.log('[Service Worker] Install');
    // Static cache
    event.waitUntil(
        caches.open(`rdu-cache-${CACHE_VERSION}`).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/styles/style.css',
                '/js/main.js',
                '/routes/contact.html',
                '/routes/home.html',
                '/assets/nz-on-air.png',
                '/assets/Saltbox-White.png',
                '/assets/RDU50_Full Logo_White.png',
                '/assets/RDU50_Full Logo_Black.png',
                '/assets/RDU50_Logo_White.png',
            ]);
        })
    );

  // Dynamic cache
    event.waitUntil(
        caches.open(`rdu-dynamic-${CACHE_VERSION}`).then((cache) => {
            return cache.addAll([
                '/routes/gig-guide.html',
                '/routes/podcasts.html',
                '/routes/show-schedule.html',
            ]);
        })
    );
});


// Listen for fetch events to intercept network requests
self.addEventListener('fetch', (event) => {
    event.respondWith(caches.open(cacheName).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
            const fetchedResponse = fetch(event.request).then((networkResponse) => {
                cache.put(event.request, networkResponse.clone());

                return networkResponse;
            });

            return cachedResponse || fetchedResponse;
        });
    }));
});


// Listen for the activate event to clean up old caches (only needed when cache version changes)
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activate');

    // Logic to remove old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
        return Promise.all(
            cacheNames.map(cacheName => {
            // If cache is not current version, delete it
            if (!cacheName.includes(CACHE_VERSION)) {
                return caches.delete(cacheName);
            }
            })
        );
        })
    );

    event.waitUntil(self.clients.claim());
});