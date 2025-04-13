const CACHE_NAME = 'image-cache-v1';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('fetch', event => {
  if (event.request.url.includes('/api/image')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return cache.match(event.request).then(response => {
          return (
            response ||
            fetch(event.request).then(newResponse => {
              cache.put(event.request, newResponse.clone());
              return newResponse;
            })
          );
        });
      })
    );
  }
});
