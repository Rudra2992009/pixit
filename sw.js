/**
 * AuraCode Service Worker v1.0
 * Decentralized Offline Caching Engine
 */

const CACHE_NAME = 'auracode-core-v1';

// Assets to be stored in the local cache for offline execution
const ASSETS_TO_CACHE = [
  './index.html',
  './style.css',
  './work.js',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/lucide@latest',
  'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js',
  'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide_py.tar',
  'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyscript.bin'
  ,
  // Monaco Editor loader & common assets for offline editor support
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs/loader.js',
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.33.0/min/vs/editor/editor.main.css'
];

// Install Event: Synchronizing local cache with the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[AuraCode SW] Pre-caching decentralized assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Purging legacy cache structures
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[AuraCode SW] Purging old cache node:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event: Local-first strategy for high-performance execution
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached asset if found, otherwise fetch from network
      return response || fetch(event.request).then((networkResponse) => {
        // Only cache successful GET requests
        if (event.request.method === 'GET' && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback for the main index
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
