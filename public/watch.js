// أضف <script src="/watch.js" defer></script> في index.html، وفي بطاقة الدواء (drug) لما availability==='out':
//   <button class="btn" onclick="watchDialog(${p.id})">بلّغني أول ما يتوفر</button>
(()=>{ const h=(t,p={},...k)=>{const e=document.createElement(t);Object.assign(e,p);e.append(...k);return e;};
 window.watchDialog=id=>{
  const ph=h('input',{type:'tel',inputMode:'tel',placeholder:'رقم الموبايل 01xxxxxxxxx',autocomplete:'tel'}), ck=h('input',{type:'checkbox'}), msg=h('div',{role:'status'});
  const d=h('dialog',{style:'border:1px solid #D8E2E0;border-radius:14px;padding:16px;max-width:92vw;width:380px;font:16px Tahoma,sans-serif;direction:rtl'});
  const send=h('button',{className:'btn fill',onclick:async()=>{
    const r=await fetch('/api/watch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product_id:id,phone:ph.value,consent:ck.checked})});
    const j=await r.json(); msg.textContent=r.ok?`تمام. هنبلغك على واتساب لما "${j.name}" يتوفر.`:j.error; if(r.ok) setTimeout(()=>d.close(),2500);}},'بلّغني');
  [ph].forEach(e=>e.style.cssText='width:100%;box-sizing:border-box;padding:10px;font:inherit;border:1px solid #D8E2E0;border-radius:8px;margin:8px 0');
  d.append(h('b',{},'هنبلغك لما الدواء يتوفر'),ph,
   h('label',{style:'display:flex;gap:8px;font-size:14px'},ck,'أوافق إن صيدلية بحبح تبعتلي رسالة واتساب على الرقم ده مرة لما الدواء يتوفر. الرقم بيتحذف بعد الإبلاغ أو بعد 30 يوم، وأقدر أوقف الرسائل أي وقت.'),
   msg,h('div',{style:'display:flex;gap:8px;margin-top:10px'},send,h('button',{className:'btn',onclick:()=>d.close()},'إغلاق')));
  d.onclose=()=>d.remove(); document.body.append(d); d.showModal(); }; })();
