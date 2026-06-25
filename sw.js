const CACHE_NAME = 'azkar-companion-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/store.js',
    './js/app.js',
    './manifest.json',
    'https://unpkg.com/lucide@latest',
    'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(ASSETS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                return response || fetch(event.request);
            })
    );
});
