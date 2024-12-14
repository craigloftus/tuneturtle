// @ts-check

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache static assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache music files
registerRoute(
  ({ url }) => url.pathname.endsWith('.mp3') || url.pathname.endsWith('.wav'),
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
    const { tracks } = event.data;
    try {
      const cache = await caches.open('offline-albums');
      await Promise.all(
        tracks.map(async (track) => {
          const response = await fetch(track.signedUrl);
          await cache.put(track.key, response);
        })
      );
      event.ports[0].postMessage({ success: true });
    } catch (error) {
      event.ports[0].postMessage({ success: false, error: error.message });
    }
  }
});
