/* Ганста: офлайн-кэш. Сеть в приоритете — при интернете всегда свежая сборка, без сети — последняя сохранённая. */
const CACHE='gansta-cache';
const CORE=['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png','icon-180.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim())});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);
  if(u.pathname.endsWith('version.json'))return;
  if(u.origin!==location.origin){
    if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname))e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));return res})));
    return}
  const key=r.mode==='navigate'?'index.html':r;
  e.respondWith(fetch(r,{cache:'no-store'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(key,cp))}return res}).catch(()=>caches.match(key).then(m=>m||caches.match('index.html'))));
});
