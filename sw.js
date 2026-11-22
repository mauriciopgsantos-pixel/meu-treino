/* Versioned precache + online-first pages so new deployments do not remain permanently stale. */
const VERSION = 'meu-treino-v5.0.0';
const ASSETS = [
 './','./index.html','./app.js','./v5.js','./v5.css','./exercises-extra.js','./catalog-v5.js',
 './manifest.webmanifest','./icon-192.png','./icon-512.png','./landing.html','./landing.css','./privacidade.html','./termos.html','./demo.html','./demo-app.js',
 './art-peito.svg','./art-costas.svg','./art-pernas.svg','./art-ombros.svg','./art-bracos.svg','./art-abdomen.svg','./art-cardio.svg'
];
self.addEventListener('install', event => {
 event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil(Promise.all([
   self.clients.claim(),
   caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('meu-treino-') && key !== VERSION).map(key => caches.delete(key))))
 ]));
});
self.addEventListener('fetch', event => {
 if(event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
 const request = event.request;
 const isDocument = request.mode === 'navigate' || /\.(?:html|js|css)$/.test(new URL(request.url).pathname);
 if(isDocument) {
   event.respondWith(fetch(request).then(response => {
     if(response.ok) {const clone=response.clone(); event.waitUntil(caches.open(VERSION).then(cache=>cache.put(request, clone)));}
     return response;
   }).catch(()=>caches.match(request).then(cached=>cached || (request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
 } else event.respondWith(caches.match(request).then(cached=>cached || fetch(request).then(response => {if(response.ok){const clone=response.clone();event.waitUntil(caches.open(VERSION).then(cache=>cache.put(request,clone)));}return response;})));
});
