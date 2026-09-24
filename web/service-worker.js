const CACHE = 'neuron-beat-shell-v4';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './icon.svg', './css/style.css',
  './data/circuit.json', './data/songs_config.json',
  './js/main.js', './js/sim.js', './js/simulation.js', './js/sim.worker.js',
  './js/chart.js', './js/engine.js', './js/rival.js', './js/audio.js', './js/layers.js',
  './js/fly-mood.js', './js/progress.js', './js/storage.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE).then(cache => cache.put('./index.html', response.clone()));
      return response;
    }).catch(() => caches.match('./index.html')));
    return;
  }
  event.respondWith(fetch(request).then(response => {
    if (response.ok) event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, response.clone())));
    return response;
  }).catch(() => caches.match(request)));
});
