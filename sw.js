// VocaSnap Service Worker v5 - 강제 업데이트
const CACHE_NAME = 'vocasnap-v5';

self.addEventListener('install', e => {
  self.skipWaiting(); // 새 SW 즉시 활성화
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Network-first 전략
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // API 호출은 캐싱 제외
  if(url.hostname.includes('script.google.com') ||
     url.hostname.includes('googleapis.com')) return;
  // HTML은 항상 네트워크 우선
  if(e.request.mode === 'navigate' ||
     e.request.headers.get('accept')?.includes('text/html')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // 정적 자원: stale-while-revalidate
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
