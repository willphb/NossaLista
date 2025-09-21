// sw.js - Nosso Service Worker

const CACHE_NAME = 'nossa-lista-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// Evento de Instalação: Salva os arquivos principais no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de Fetch: Tenta servir os arquivos do cache primeiro
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrar no cache, retorna do cache. Senão, busca na rede.
        return response || fetch(event.request);
      })
  );
});