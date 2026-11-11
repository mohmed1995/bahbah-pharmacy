const V='bahbah-v32',SHELL=['./','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./pharmacy-hero-brand-bg.webp','./bahbah-logo.webp','./bahbah-logo.png','./products.json','./pharmacy-bg.jpg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
  if(u.origin!==location.origin&&!/fonts\.(googleapis|gstatic)\.com/.test(u.host))return;
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})
    .catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./'):u.pathname.startsWith('/api/')?new Response('[]',{headers:{'Content-Type':'application/json'}}):Response.error()))))});
