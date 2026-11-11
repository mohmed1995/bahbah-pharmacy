// غيّر رقم V بعد أي تعديل في الواجهة عشان العملاء ياخدوا التحديث
const V='bahbah-v32',SHELL=['./','./manifest.webmanifest','./icon.svg','./icon-192.png','./icon-512.png','./pharmacy-hero-brand-bg.webp','./bahbah-logo.webp','./bahbah-logo.png','./products.json','./pharmacy-bg.jpg'];
const EMPTY=()=>new Response('[]',{headers:{'Content-Type':'application/json'}});
self.addEventListener('install',e=>e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET')return;
  if(u.origin!==location.origin&&!/fonts\.(googleapis|gstatic)\.com/.test(u.host))return;
  // الإدارة: شبكة فقط، عمرها ما تتخزن (فيها جلسات وبيانات حساسة)
  if(u.pathname.startsWith('/admin'))return;
  // الـ API: شبكة فقط بدون تخزين. البحث لو offline يرجّع [] والواجهة تكمّل من products.json
  if(u.pathname.startsWith('/api/')){e.respondWith(fetch(r).catch(()=>u.pathname==='/api/search'?EMPTY():Response.error()));return;}
  e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(V).then(x=>x.put(r,c))}return res})
    .catch(()=>caches.match(r).then(m=>m||(r.mode==='navigate'?caches.match('./'):Response.error()))))});
