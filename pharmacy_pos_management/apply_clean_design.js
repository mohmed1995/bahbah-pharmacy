import fs from 'fs';

let html = fs.readFileSync('f:/صيدليه/public/index.html', 'utf8');

// We want to replace everything from <header> down to <div id="chips"></div> with a clean, luxury top section:
const pHeader = html.indexOf('<header>');
const pChips = html.indexOf('<div id="chips"></div>');

if (pHeader !== -1 && pChips !== -1) {
  const cleanHeader = `<!-- ===== هيدر صيدلية بحبح الجديد - راقي ونظيف ومريح للعين ===== -->
<header class="bahbah-clean-header">
  <div class="top-nav-container">
    <div class="brand-side">
      <a class="clean-logo" href="./" aria-label="صيدلية بحبح الرئيسية">
        <img src="./bahbah-logo.webp" alt="صيدلية بحبح" width="180" height="70">
      </a>
      <div class="brand-tagline">
        <span class="pharmacy-title">صيدلية بحبح</span>
        <small class="pharmacy-sub">ديروط • صحتك أمانة في أيدٍ أمينة</small>
      </div>
    </div>

    <div class="top-actions">
      <button type="button" class="action-pill pill-elderly" onclick="toggleSeniorMode()" title="تكبير الخط وتسهيل القراءة">
        👓 تكبير الخط
      </button>
      <a href="tel:+201011500166" class="action-pill pill-call">
        📞 <span class="hide-mobile">اتصال: </span>01011500166
      </a>
    </div>
  </div>

  <!-- شريط البحث الذكي في قلب الهيدر -->
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

  <!-- 3 كروت خدمات سريعة وأنيقة بدلاً من الزحمة -->
  <div class="quick-service-pills">
    <button type="button" class="service-pill rx-pill" onclick="openFastRxModal()">
      <span class="pill-ico">📷</span>
      <div class="pill-txt">
        <b>صوّر الروشتة</b>
        <small>واتساب مباشر</small>
      </div>
    </button>
    <button type="button" class="service-pill monthly-pill" onclick="openMonthlyModal()">
      <span class="pill-ico">🗓️</span>
      <div class="pill-txt">
        <b>علاجي الشهري</b>
        <small>توصيل تلقائي</small>
      </div>
    </button>
    <a href="https://wa.me/201011500166?text=السلام%20عليكم%20دكتور%20صيدلية%20بحبح،%20عندي%20استشارة%20دوائية" target="_blank" rel="noopener" class="service-pill ask-pill">
      <span class="pill-ico">💬</span>
      <div class="pill-txt">
        <b>استشارة صيدلي</b>
        <small>مجاناً 24 ساعة</small>
      </div>
    </a>
  </div>
</header>

<div class="sw" style="display:none">
  <div class="search">
    <input type="hidden">
  </div>
</div>
`;

  html = html.substring(0, pHeader) + cleanHeader + html.substring(pChips);
  console.log('Replaced header section cleanly');
}

// Add modern luxury styling for Bahbah clean look:
const luxuryCSS = `
/* ===== ستايل صيدلية بحبح المودرن الفاخر والنظيف (Modern Clean Luxury) ===== */
:root {
  --bahbah-blue: #1B4F8E;
  --bahbah-navy: #0E2F5A;
  --bahbah-orange: #F7921D;
  --bahbah-orange-soft: #FFF7ED;
  --bahbah-bg: #F8FAFD;
  --bahbah-border: #E2EBF5;
}

body {
  background-color: var(--bahbah-bg) !important;
  background-image: none !important;
  color: #0F2038 !important;
}

/* هيدر ناصع النظافة مع كونتراست رزين */
.bahbah-clean-header {
  background: #FFFFFF !important;
  border-bottom: 2px solid var(--bahbah-border);
  box-shadow: 0 4px 20px rgba(27, 79, 142, 0.05);
  padding: 14px 16px 18px !important;
  border-radius: 0 0 24px 24px;
}

.top-nav-container {
  max-width: var(--container);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.brand-side {
  display: flex;
  align-items: center;
  gap: 12px;
}

.clean-logo {
  display: block;
  text-decoration: none;
}

.clean-logo img {
  height: clamp(48px, 10vw, 64px);
  width: auto;
  object-fit: contain;
  display: block;
}

.brand-tagline {
  display: flex;
  flex-direction: column;
}

.pharmacy-title {
  font-size: clamp(16px, 2vw, 20px);
  font-weight: 800;
  color: var(--bahbah-blue);
  line-height: 1.2;
}

.pharmacy-sub {
  font-size: 11.5px;
  color: #64748B;
  font-weight: 500;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-pill {
  border: 1px solid var(--bahbah-border);
  background: #F8FAFD;
  color: var(--bahbah-blue);
  font-size: 12px;
  font-weight: 700;
  padding: 7px 12px;
  border-radius: 99px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  transition: all 0.2s ease;
}

.action-pill:hover {
  background: #EEF4FC;
  border-color: var(--bahbah-blue);
}

.pill-call {
  background: var(--bahbah-blue);
  color: #FFFFFF !important;
  border-color: var(--bahbah-blue);
}

.pill-call:hover {
  background: var(--bahbah-navy);
}

/* شريط البحث المودرن الفخم */
.search-section-wrap {
  max-width: 760px;
  margin: 16px auto 0;
}

.search-box-clean {
  background: #F8FAFD;
  border: 1.5px solid #D5E2F1;
  border-radius: 999px;
  display: flex;
  align-items: center;
  padding: 4px 16px;
  transition: all 0.2s ease;
  box-shadow: 0 2px 10px rgba(27, 79, 142, 0.04);
}

.search-box-clean:focus-within {
  background: #FFFFFF;
  border-color: var(--bahbah-blue);
  box-shadow: 0 4px 18px rgba(27, 79, 142, 0.12);
}

.search-box-clean .search-icon {
  width: 20px;
  height: 20px;
  color: var(--bahbah-blue);
  flex-shrink: 0;
  margin-inline-end: 8px;
}

.search-box-clean input {
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  padding: 10px 4px;
  font-size: 15px;
  color: #0F2038;
}

.mic-clean-btn {
  background: transparent;
  border: 0;
  color: var(--bahbah-blue);
  padding: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  border-radius: 50%;
}

.mic-clean-btn:hover {
  background: #E8F1FC;
}

/* 3 كروت خدمات سريعة ونظيفة جداً */
.quick-service-pills {
  max-width: 760px;
  margin: 14px auto 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.service-pill {
  background: #FFFFFF;
  border: 1px solid var(--bahbah-border);
  border-radius: 14px;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 2px 6px rgba(27, 79, 142, 0.03);
  transition: all 0.2s ease;
}

.service-pill:hover, .service-pill:active {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(27, 79, 142, 0.08);
}

.service-pill .pill-ico {
  font-size: 22px;
  flex-shrink: 0;
}

.service-pill .pill-txt {
  display: flex;
  flex-direction: column;
  text-align: start;
}

.service-pill b {
  font-size: 13px;
  font-weight: 700;
  color: var(--bahbah-blue);
  line-height: 1.2;
}

.service-pill small {
  font-size: 10.5px;
  color: #64748B;
}

.rx-pill {
  border-color: #FED7AA;
  background: #FFFDF9;
}
.rx-pill b { color: #C25E00; }

.monthly-pill {
  border-color: #BAE6FD;
  background: #F8FCFF;
}

.ask-pill {
  border-color: #BBF7D0;
  background: #F9FEFA;
}
.ask-pill b { color: #15803D; }

/* أزرار وتصنيفات الأقسام النظيفة (#chips) */
#chips {
  padding: 16px 16px 8px !important;
  gap: 8px !important;
}

.chip {
  background: #FFFFFF !important;
  border: 1px solid var(--bahbah-border) !important;
  border-radius: 12px !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03) !important;
  color: #334155 !important;
  min-height: 54px !important;
  padding: 8px 14px !important;
  transition: all 0.2s ease !important;
}

.chip:hover {
  border-color: #BFDBFE !important;
  color: var(--bahbah-blue) !important;
}

.chip.on {
  background: var(--bahbah-blue) !important;
  color: #FFFFFF !important;
  border-color: var(--bahbah-blue) !important;
  box-shadow: 0 4px 14px rgba(27, 79, 142, 0.25) !important;
}

.chip.on::after {
  display: none !important;
}

/* كروت الأدوية النظيفة (Product Cards) */
.card {
  background: #FFFFFF !important;
  border: 1px solid #E8EEF5 !important;
  border-radius: 16px !important;
  box-shadow: 0 2px 6px rgba(27, 79, 142, 0.04) !important;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease !important;
}

.card:hover {
  transform: translateY(-3px) !important;
  box-shadow: 0 12px 24px -8px rgba(27, 79, 142, 0.15) !important;
  border-color: #BCD5F3 !important;
}

.card .pic {
  background: #F9FBFE !important;
  border-bottom: 1px solid #EDF3FA !important;
}

.card .nm {
  color: #0F2038 !important;
  font-weight: 700 !important;
  font-size: 14.5px !important;
}

.card .pr {
  color: var(--bahbah-blue) !important;
  font-weight: 800 !important;
  font-size: 19px !important;
}

.card .btn {
  background: var(--bahbah-blue) !important;
  color: #FFFFFF !important;
  border-radius: 10px !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  box-shadow: 0 4px 12px rgba(27, 79, 142, 0.2) !important;
}

.card .btn:hover {
  background: var(--bahbah-navy) !important;
}

/* شريط السلة الراقي */
#cartbar {
  background: #0E2F5A !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 16px !important;
  box-shadow: 0 14px 34px -8px rgba(14, 47, 90, 0.45) !important;
}

#go {
  background: var(--bahbah-orange) !important;
  color: #FFFFFF !important;
  font-weight: 800 !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 14px rgba(247, 146, 29, 0.4) !important;
}

#go:hover {
  background: #E57D0D !important;
}

/* إخفاء الزحمة الزائدة في الشاشات الصغيرة */
@media (max-width: 600px) {
  .brand-tagline { display: none !important; }
  .hide-mobile { display: none !important; }
  .quick-service-pills { grid-template-columns: repeat(3, 1fr) !important; gap: 6px !important; }
  .service-pill { padding: 8px 6px !important; gap: 6px !important; }
  .service-pill .pill-ico { font-size: 18px !important; }
  .service-pill b { font-size: 11.5px !important; }
  .service-pill small { display: none !important; }
}
`;

html = html.replace('</style>', luxuryCSS + '\n</style>');

// Bump service worker cache
html = html.replace('bahbah-v17', 'bahbah-v18');

fs.writeFileSync('f:/صيدليه/public/index.html', html, 'utf8');
console.log('Clean luxury design applied to index.html successfully!');
