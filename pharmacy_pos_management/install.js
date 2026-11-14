// أضف <script src="/install.js" defer></script> قبل </body> في index.html
(()=>{ let ev; const ios=/iphone|ipad/i.test(navigator.userAgent), standalone=matchMedia('(display-mode: standalone)').matches;
 if(standalone||localStorage.getItem('noInstall')) return;
 const bar=(txt,btn,fn)=>{ const d=document.createElement('div');
  d.style.cssText='position:fixed;inset-inline:12px;top:12px;background:#fff;border:1px solid #D8E2E0;border-radius:12px;padding:12px;z-index:9;display:flex;gap:8px;align-items:center;box-shadow:0 4px 16px #0002';
  const s=document.createElement('span'); s.textContent=txt; s.style.flex='1';
  const b=document.createElement('button'); b.textContent=btn; b.onclick=()=>{fn();d.remove();};
  const x=document.createElement('button'); x.textContent='لاحقًا'; x.onclick=()=>{localStorage.setItem('noInstall','1');d.remove();};
  [b,x].forEach(e=>e.style.cssText='border:1px solid #0E5A57;background:#fff;color:#0E5A57;border-radius:8px;padding:6px 10px;font:inherit'); d.append(s,b,x); document.body.append(d); };
 addEventListener('beforeinstallprompt',e=>{e.preventDefault();ev=e;bar('ثبّت بحبح على موبايلك وافتحه بضغطة','تثبيت',()=>ev.prompt());});
 if(ios) bar('على الآيفون: افتح من Safari واضغط مشاركة ثم "إضافة إلى الشاشة الرئيسية"','تمام',()=>{});
})();
