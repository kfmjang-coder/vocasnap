// VocaSnap Service Worker v6 - 강제 캐시 무효화
const CACHE_VERSION = 'v6-' + new Date().toISOString().split('T')[0];
const CACHE_NAME    = 'vocasnap-' + CACHE_VERSION;

self.addEventListener('install', e => {
  console.log('[SW] Installing', CACHE_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating', CACHE_VERSION);
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        console.log('[SW] Deleting old cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if(e.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});

// Network-first 전략 - HTML/JS는 항상 최신
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API 호출은 캐싱 제외
  if(url.hostname.includes('script.google.com') ||
     url.hostname.includes('googleapis.com')) return;

  // HTML / JS / CSS는 항상 네트워크 우선
  if(e.request.mode === 'navigate' ||
     url.pathname.endsWith('.html') ||
     url.pathname.endsWith('.js') ||
     url.pathname.endsWith('.css') ||
     url.pathname === '/' ||
     url.pathname.endsWith('/')) {
    e.respondWith(
      fetch(e.request, {cache: 'no-store'})
        .then(res => {
          if(res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // 이미지/아이콘 등 정적 자원: 캐시 우선
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if(res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
