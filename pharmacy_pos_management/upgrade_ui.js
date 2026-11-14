import fs from 'fs';

let html = fs.readFileSync('public/index.html', 'utf8');

// 1. Add modern sleek CSS before </style>
const styleNeedle = '</style>';
const modernCss = `
/* ==========================================================================
   BAHBAH PRO APEX UI - استغلال مساحات وتطوير احترافي فائق
   ========================================================================== */

/* 1. Header Desktop Split & Master Compact Layout */
@media (min-width: 992px) {
  .bahbah-clean-header {
    padding: 16px 28px !important;
  }
  .header-main-row {
    display: grid !important;
    grid-template-columns: auto 1fr auto !important;
    align-items: center !important;
    gap: 24px !important;
    max-width: var(--container) !important;
    margin: 0 auto !important;
  }
  .search-section-wrap {
    margin: 0 !important;
    max-width: none !important;
    width: 100% !important;
  }
}

.header-main-row {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 2. Top Smart Action Strip (صوّر الروشتة + علاجي الشهري + استشارة + تكرار آخر طلب) */
.action-strip {
  max-width: var(--container);
  margin: 12px auto 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 9px;
  background: #FFFFFF;
  border: 1px solid #E1E8F2;
  border-radius: 14px;
  padding: 8px 12px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 1px 3px rgba(27,79,142,0.03);
}

.action-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(27,79,142,0.08);
}

.action-card .ac-icon {
  font-size: 20px;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.action-card .ac-txt {
  display: flex;
  flex-direction: column;
  text-align: start;
}

.action-card .ac-txt b {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--bahbah-navy);
  line-height: 1.25;
}

.action-card .ac-txt small {
  font-size: 10.5px;
  color: #64748B;
}

.ac-rx { border-color: #FCD34D; background: #FFFDF7; }
.ac-rx .ac-icon { background: #FEF3C7; color: #B45309; }
.ac-rx .ac-txt b { color: #B45309; }

.ac-monthly { border-color: #BAE6FD; background: #F8FCFF; }
.ac-monthly .ac-icon { background: #E0F2FE; color: #0369A1; }

.ac-ask { border-color: #BBF7D0; background: #F9FEFA; }
.ac-ask .ac-icon { background: #DCFCE7; color: #15803D; }

.ac-reorder { border-color: #E2E8F0; background: #FFFFFF; }
.ac-reorder .ac-icon { background: #F1F5F9; color: #475569; }

@media (max-width: 768px) {
  .action-strip {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* 3. Horizontal Smooth Pills (#chips) */
#chips {
  padding: 12px 16px 6px !important;
  margin: 0 auto !important;
}

/* 4. Tab Navigation Hub (محور الأقسام الذكي بالتابات) */
.home-tabs-wrapper {
  max-width: var(--container);
  margin: 14px auto 0;
  padding: 0 16px;
}

.home-tabs-nav {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 4px;
}
.home-tabs-nav::-webkit-scrollbar { display: none; }

.tab-btn {
  padding: 8px 16px;
  border-radius: 99px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid #E2E8F0;
  background: #FFFFFF;
  color: #475569;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: var(--bahbah-blue);
  color: #FFFFFF;
  border-color: var(--bahbah-blue);
  box-shadow: 0 4px 12px rgba(27,79,142,0.25);
}

/* 5. Compact Section Header with Counter */
.section-head-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 10px;
  max-width: var(--container);
  margin: 0 auto;
}

.section-head-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-head-title h2 {
  margin: 0;
  font-size: clamp(16px, 2vw, 19px);
  font-weight: 800;
  color: var(--bahbah-navy);
}

.section-badge {
  background: #EFF6FF;
  color: var(--bahbah-blue);
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 99px;
  border: 1px solid #DBEAFE;
}

.section-link-btn {
  font-size: 12px;
  font-weight: 700;
  color: var(--bahbah-blue);
  background: none;
  border: 0;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}
.section-link-btn:hover {
  background: #EFF6FF;
}

/* 6. Smart Bottom Mobile Navigation Bar */
.bahbah-bottom-nav {
  position: fixed;
  bottom: 0;
  inset-inline: 0;
  height: calc(60px + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid #E2EBF5;
  display: flex;
  align-items: center;
  justify-content: space-around;
  z-index: 85;
}

.bnav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: none;
  border: 0;
  color: #64748B;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  padding: 6px 12px;
  position: relative;
  text-decoration: none;
  transition: color 0.15s ease;
}

.bnav-item svg, .bnav-item span.bnav-ico {
  font-size: 18px;
  line-height: 1;
}

.bnav-item.active {
  color: var(--bahbah-blue);
}

.bnav-rx-btn {
  margin-top: -16px;
  background: linear-gradient(135deg, #FFA439, #F7921D);
  color: #FFFFFF !important;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  box-shadow: 0 6px 16px rgba(247, 146, 29, 0.45);
  border: 2px solid #FFFFFF;
}

.bnav-badge {
  position: absolute;
  top: 2px;
  inset-inline-end: 8px;
  min-width: 17px;
  height: 17px;
  border-radius: 99px;
  background: #EF4444;
  color: #FFFFFF;
  font-size: 10px;
  font-weight: 800;
  display: grid;
  place-items: center;
  padding: 0 4px;
}

/* رفع زر السلة فوق البار السفلي دائماً */
#cartbar {
  bottom: calc(72px + env(safe-area-inset-bottom)) !important;
  z-index: 88 !important;
}

/* ضبط المسافة السفلية لمراعاة البار السفلي */
body {
  padding-bottom: calc(140px + env(safe-area-inset-bottom)) !important;
}

/* إخفاء easyBar القديم واستبداله بالبار السفلي الذكي */
#easyBar {
  display: none !important;
}
`;

html = html.replace(styleNeedle, modernCss + '\n' + styleNeedle);

// 2. Rewrite Header HTML for space genius
const headerStart = html.indexOf('<header class="bahbah-clean-header">');
const headerEnd = html.indexOf('</header>', headerStart) + 9;

const newHeaderHtml = `<header class="bahbah-clean-header">
  <div class="header-main-row">
    <!-- شعار الصيدلية وهوية ديروط -->
    <div class="brand-side">
      <a class="clean-logo" href="./" aria-label="صيدلية بحبح الرئيسية">
        <img src="./bahbah-logo.webp" alt="صيدلية بحبح" width="180" height="70">
      </a>
      <div class="brand-tagline">
        <span class="pharmacy-title">صيدلية بحبح</span>
        <small class="pharmacy-sub">ديروط • صحتك أمانة في أيدٍ أمينة</small>
      </div>
    </div>

    <!-- شريط البحث الذكي في المنتصف -->
    <div class="search-section-wrap">
      <div class="search-box-clean">
        <svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2" fill="none"/>
          <path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <input id="q" type="search" placeholder="ابحث باسم الدواء، المادة الفعالة، أو منتجات العناية…" autocomplete="off" enterkeyhint="search">
        <button id="mic" type="button" aria-label="بحث صوتي" class="mic-clean-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="3" width="6" height="11" rx="3"/>
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- أزرار الإجراءات السريعة في الهيدر -->
    <div class="top-actions">
      <button type="button" class="action-pill pill-elderly" onclick="toggleSeniorMode()" title="تكبير الخط وتسهيل القراءة">
        👓 تكبير الخط
      </button>
      <a href="tel:+201011500166" class="action-pill pill-call">
        📞 <span class="hide-mobile">اتصال: </span>01011500166
      </a>
    </div>
  </div>

  <!-- شريط الخدمات السريعة المتطورة (4 كروت أفقية مضغوطة ومنظمة) -->
  <div class="action-strip">
    <div class="action-card ac-rx" onclick="openFastRxModal()">
      <span class="ac-icon">📷</span>
      <div class="ac-txt">
        <b>صوّر الروشتة</b>
        <small>واتساب وتوصيل فوري</small>
      </div>
    </div>
    <div class="action-card ac-monthly" onclick="openMonthlyModal()">
      <span class="ac-icon">🗓️</span>
      <div class="ac-txt">
        <b>علاجي الشهري</b>
        <small>تذكير وتوصيل دوري</small>
      </div>
    </div>
    <a href="https://wa.me/201011500166?text=السلام%20عليكم%20دكتور%20صيدلية%20بحبح،%20عندي%20استشارة%20دوائية" target="_blank" rel="noopener" class="action-card ac-ask">
      <span class="ac-icon">💬</span>
      <div class="ac-txt">
        <b>استشارة صيدلي</b>
        <small>مجانية طوال اليوم</small>
      </div>
    </a>
    <div class="action-card ac-reorder" onclick="reorderLast()">
      <span class="ac-icon">🔁</span>
      <div class="ac-txt">
        <b>تكرار آخر طلب</b>
        <small>بنقرة واحدة</small>
      </div>
    </div>
  </div>
</header>`;

html = html.slice(0, headerStart) + newHeaderHtml + html.slice(headerEnd);

// 3. Add Bottom Navigation Bar right before </body>
const bnavHtml = `
<!-- شريط التنقل السفلي الذكي (Mobile App Navigation) -->
<nav class="bahbah-bottom-nav">
  <button type="button" class="bnav-item active" onclick="setCat('all');window.scrollTo({top:0,behavior:'smooth'})">
    <span class="bnav-ico">🏠</span>
    <span>الرئيسية</span>
  </button>
  <button type="button" class="bnav-item" onclick="setCat('drug')">
    <span class="bnav-ico">💊</span>
    <span>الأدوية</span>
  </button>
  <button type="button" class="bnav-item bnav-rx-btn" onclick="openFastRxModal()" title="صوّر الروشتة فوراً">
    <span style="font-size:22px">📷</span>
  </button>
  <button type="button" class="bnav-item" onclick="showFavs()">
    <span class="bnav-ico">❤️</span>
    <span>المفضلة</span>
  </button>
  <button type="button" class="bnav-item" onclick="cartSheet()">
    <span class="bnav-ico">🛒</span>
    <span>السلة</span>
    <span class="bnav-badge" id="bnavCartBadge" style="display:none">0</span>
  </button>
</nav>
`;

html = html.replace('</body>', bnavHtml + '\n</body>');

// 4. Update drawCart to also update bnavCartBadge
const oldDrawCart = 'function drawCart() {';
const newDrawCart = `function drawCart() {
  const n = Object.values(cart).reduce((a, b) => a + b, 0);
  const badge = $('bnavCartBadge');
  if (badge) {
    badge.textContent = n;
    badge.style.display = n > 0 ? 'grid' : 'none';
  }
`;
html = html.replace(oldDrawCart, newDrawCart);

// 5. Replace search() home HTML template with space-smart tabbed layout
const searchHomeStart = html.indexOf('const fHair = () => ALL.filter(isHair);');
const searchHomeEnd = html.indexOf('bbExtras();', searchHomeStart) + 11;

const newSearchHomeBlock = `const fHair = () => ALL.filter(isHair);
    const fCough = () => ALL.filter(isCough);
    const fCold = () => ALL.filter(isCold);
    const fMen = () => ALL.filter(isMen);
    const fShave = () => ALL.filter(isShave);
    const fSkin = () => ALL.filter(isSkin);
    const fKids = () => ALL.filter(isKids);

    $('home').innerHTML = \`
      <!-- محور التبويبات الذكي لتوفير المساحة وتسهيل التصفح -->
      <div class="home-tabs-wrapper">
        <div class="home-tabs-nav" id="homeTabsNav">
          <button type="button" class="tab-btn active" onclick="switchHomeTab('all', this)">🔥 الأكثر طلباً</button>
          <button type="button" class="tab-btn" onclick="switchHomeTab('cough', this)">🫁 كحة وسعال (\${fCough().length})</button>
          <button type="button" class="tab-btn" onclick="switchHomeTab('cold', this)">🤧 برد ومسكنات (\${fCold().length})</button>
          <button type="button" class="tab-btn" onclick="switchHomeTab('skin', this)">✨ عناية بالبشرة (\${fSkin().length})</button>
          <button type="button" class="tab-btn" onclick="switchHomeTab('hair', this)">💇‍♀️ عناية بالشعر (\${fHair().length})</button>
          <button type="button" class="tab-btn" onclick="switchHomeTab('men', this)">🛡️ صحة رجالية (\${fMen().length})</button>
          <button type="button" class="tab-btn" onclick="switchHomeTab('kids', this)">👶 أطفال ورضع (\${fKids().length})</button>
        </div>
      </div>

      <!-- محتوى التاب النشط -->
      <div id="homeTabContent">
        <div class="section-head-bar">
          <div class="section-head-title">
            <h2>🔥 الأكثر طلباً في صيدلية بحبح</h2>
            <span class="section-badge">\${ALL.length} صنف متوفر</span>
          </div>
          <button type="button" class="section-link-btn" onclick="setCat('all')">عرض الكل ⬅️</button>
        </div>
        \${gridHTML(ALL.slice(0, 36))}
      </div>

      <section class="seo-intro" aria-labelledby="seo-title" style="margin-top:24px">
        <h2 id="seo-title">صيدلية بحبح — رعاية صحية ودواء آمن في ديروط</h2>
        <p>تصفّح كافة الأدوية والمستلزمات الطبية ومنتجات العناية بالبشرة والشعر مع إمكانية معرفة المثيل الأوفر، طلب الروشتة فوراً، وتحديد موقعك عبر GPS للتوصيل السريع.</p>
        <ul>
          <li>صرف الأدوية بإشراف صيدلي معتمد</li>
          <li>بدائل ومثائل موفرة بنفس الفاعلية</li>
          <li>توصيل سريع ودقيق داخل ديروط وضواحيها</li>
        </ul>
      </section>
    \`;

    // إتاحة دالة التبديل بين التابات
    window.switchHomeTab = (tab, btn) => {
      document.querySelectorAll('#homeTabsNav .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      btn.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      vib(8);

      const target = $('homeTabContent');
      let items = ALL;
      let title = '🔥 الأكثر طلباً في صيدلية بحبح';
      let catKey = 'all';

      if (tab === 'cough') { items = fCough(); title = '🫁 أدوية الكحة والسعال والبلغم'; catKey = 'cough'; }
      else if (tab === 'cold') { items = fCold(); title = '🤧 نزلات البرد وخافض الحرارة والمسكنات'; catKey = 'cold'; }
      else if (tab === 'skin') { items = fSkin(); title = '✨ منتجات العناية بالبشرة والوجه'; catKey = 'skin'; }
      else if (tab === 'hair') { items = fHair(); title = '💇‍♀️ علاجات ومستحضرات العناية بالشعر'; catKey = 'hair'; }
      else if (tab === 'men') { items = fMen(); title = '🛡️ الصحة الرجالية والعلاقة الخاصة'; catKey = 'men'; }
      else if (tab === 'kids') { items = fKids(); title = '👶 مستلزمات ورعاية الأطفال والرضع'; catKey = 'kids'; }

      target.innerHTML = \`
        <div class="section-head-bar">
          <div class="section-head-title">
            <h2>\${title}</h2>
            <span class="section-badge">\${items.length} صنف</span>
          </div>
          <button type="button" class="section-link-btn" onclick="setCat('\${catKey}')">عرض قسم بالكامل ⬅️</button>
        </div>
        \${gridHTML(items.slice(0, 36))}
      \`;
    };`;

html = html.slice(0, searchHomeStart) + newSearchHomeBlock + html.slice(searchHomeEnd);

// 6. Clean bbExtras to avoid repeating banners
const bbExtrasStart = html.indexOf('function bbExtras() {');
const bbExtrasEnd = html.indexOf('async function search()');
const newBbExtras = `function bbExtras() {
  const h = $('home');
  const ban = $('ban');
  if (ban) ban.hidden = true;
  h.querySelectorAll('.x-ex').forEach(e => e.remove());
  if (h.hidden) return;
  const pick = k => k.map(id => M[id]).filter(p => p && !bbStore.deleted.includes(String(p.id)));
  const sec = (c, d, t, s, a) => a.length
    ? \`<section class="corner \${c} x-ex"><span class="deco">\${d}</span><div class="sec"><div><h2>\${t}</h2><small>\${s}</small></div></div>\${rail(a)}</section>\`
    : '';
  const favs = pick(bbFavs());
  if (favs.length) {
    h.insertAdjacentHTML('afterbegin', sec('fv', '❤️', '❤️ مفضلتك', 'أصنافك المحفوظة للطلب السريع', favs));
  }
}
`;
html = html.slice(0, bbExtrasStart) + newBbExtras + html.slice(bbExtrasEnd);

fs.writeFileSync('public/index.html', html);
console.log('Public index.html updated successfully with brilliant space-smart UI!');
