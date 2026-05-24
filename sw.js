// VocaSnap Service Worker v7 - 캐시 완전 비활성화 (개발 중)
const SW_VERSION = 'v7-' + Date.now();

self.addEventListener('install', e => {
  console.log('[SW] Installing', SW_VERSION);
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating', SW_VERSION);
  e.waitUntil(
    // 모든 기존 캐시 완전 삭제
    caches.keys().then(keys =>
      Promise.all(keys.map(k => {
        console.log('[SW] Deleting cache:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
     .then(() => {
       // 모든 클라이언트에 강제 리로드 메시지
       return self.clients.matchAll().then(clients => {
         clients.forEach(c => c.postMessage({type: 'FORCE_RELOAD'}));
       });
     })
  );
});

self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if(e.data?.type === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});

// Network-only - 모든 요청을 항상 네트워크에서 가져옴 (캐시 사용 안 함)
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // API는 그냥 통과 (캐싱/가로채기 안 함)
  if(url.hostname.includes('script.google.com') ||
     url.hostname.includes('googleapis.com')) return;

  // 모든 자원을 항상 네트워크에서 가져옴 (no-cache)
  e.respondWith(
    fetch(e.request, {cache: 'no-store'})
      .catch(() => {
        // 네트워크 실패 시에만 캐시 폴백 (오프라인 대비)
        return caches.match(e.request);
      })
  );
});
