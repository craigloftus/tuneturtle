// @ts-check

// Use self instead of window since we're in a service worker
self.importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js'
);

const { precacheAndRoute } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { CacheFirst, NetworkFirst } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheable.response;
const { ExpirationPlugin } = workbox.expiration;

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST || []);

// Cache music files
registerRoute(
  ({ url }) => url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav') || url.pathname.endsWith('.flac'),
  new CacheFirst({
    cacheName: 'music-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        maxEntries: 50, // Maximum number of entries to cache
      }),
    ],
  })
);

// Cache API responses
registerRoute(
  ({ request }) => request.destination === 'audio',
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Handle offline album storage
self.addEventListener('message', async (event) => {
  if (event.data.type === 'DOWNLOAD_ALBUM') {
    const { albumKey, tracks } = event.data;
    try {
      const cache = await caches.open('offline-albums');
      await Promise.all(
        tracks.map(async (track) => {
          const response = await fetch(track.url);
          if (!response.ok) {
            throw new Error(`Failed to download track: ${track.key}`);
          }
          await cache.put(track.key, response.clone());
        })
      );
      event.ports[0].postMessage({ success: true, albumKey });
    } catch (error) {
      console.error('Album download failed:', error);
      event.ports[0].postMessage({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        albumKey 
      });
    }
  }
});
