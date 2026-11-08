/* Ганста: офлайн-кэш и обновления.
   Игра открывается сразу из кэша, даже на плохом интернете. Новая сборка скачивается в фоне
   новым сервис-воркером и ждёт: игра показывает плашку «Обновить», и по нажатию она включается.
   VERSION поднимается при каждом релизе вместе с BUILD в index.html и version.json. */
const VERSION = 'gansta-G001.048';
const CORE = ['./', 'index.html', 'three.min.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))));
});
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
  else if (e.data && e.data.type === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('gansta') && k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function put(key, res) {
  if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(VERSION).then(c => c.put(key, cp)); }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.pathname.endsWith('version.json') || u.pathname.endsWith('sw.js')) return;

  // шрифты Google: из кэша, иначе из сети
  if (u.origin !== location.origin) {
    if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))
      e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => put(req, r))));
    return;
  }

  // страница и файлы игры: сначала кэш этой сборки, без него — сеть не дольше 3 с, потом любая сохранённая копия
  const key = req.mode === 'navigate' ? 'index.html' : req;
  e.respondWith(caches.open(VERSION).then(c => c.match(key)).then(hit => {
    if (hit) return hit;
    const net = fetch(req).then(r => put(key, r));
    const late = new Promise(ok => setTimeout(ok, 3000)).then(() => caches.match(key)).then(any => any || net);
    return Promise.race([net.catch(() => late), late]).catch(() => caches.match(key));
  }));
});
