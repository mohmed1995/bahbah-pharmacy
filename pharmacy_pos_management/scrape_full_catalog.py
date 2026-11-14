import os
import sys
import re
import json
import csv
import sqlite3
import time
import urllib.request
import http.cookiejar
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://www.bahbahpharmacyonline.com"
TOTAL_PAGES = 123
NUM_WORKERS = 10

def normalize_arabic(text):
    if not text:
        return ""
    text = re.sub(r'[\u064B-\u065F\u0670]', '', text)  # remove tashkeel
    text = re.sub(r'[إأآا]', 'ا', text)
    text = re.sub(r'ة', 'ه', text)
    text = re.sub(r'ى', 'ي', text)
    text = re.sub(r'[^a-zA-Z0-9\u0600-\u06FF\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text.lower()

def extract_form(name):
    forms = [
        ('أقراص', ['قرص', 'اقراص', 'tablets', 'tablet', 'tab']),
        ('كبسولات', ['كبسول', 'كبسولات', 'capsules', 'capsule', 'cap']),
        ('شراب', ['شراب', 'syrup', 'suspension', 'susp']),
        ('حقن', ['حقن', 'حقنة', 'امبول', 'امبولات', 'فيال', 'ampoule', 'amp', 'vial', 'injection', 'inj']),
        ('نقط', ['نقط', 'قطرة', 'drops', 'drop']),
        ('كريم', ['كريم', 'cream']),
        ('مرهم', ['مرهم', 'ointment', 'oint']),
        ('جل', ['جل', 'gel']),
        ('فوار', ['فوار', 'effervescent', 'sachet', 'اكياس']),
        ('بخاخ', ['بخاخ', 'سبراي', 'spray']),
        ('غسول', ['غسول', 'lotion', 'wash', 'cleanser']),
        ('شامبو', ['شامبو', 'shampoo']),
        ('صابون', ['صابونة', 'صابون', 'soap']),
    ]
    name_l = name.lower()
    for standard, keywords in forms:
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', name_l) or kw in name_l:
                return standard
    return 'أخرى'

def extract_strength(name):
    # Regex to find strength like 1000 mg, 500 مجم, 75 iu, 100 ml, etc.
    m = re.search(r'(\d+(?:\.\d+)?)\s*(مجم|مكجم|ملغ|مللي|مل|وحدة دولية|mg|mcg|ml|gm|g|iu|iu/ml|%)\b', name, re.IGNORECASE)
    if m:
        return f"{m.group(1)} {m.group(2)}"
    return ""

def create_opener():
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    # warm up session
    opener.open(f"{BASE_URL}/ar/brands?currency=egp")
    return opener

# Local thread storage or opener per thread
openers = {}

def get_thread_opener():
    import threading
    tid = threading.get_ident()
    if tid not in openers:
        openers[tid] = create_opener()
    return openers[tid]

def scrape_page(page_num):
    opener = get_thread_opener()
    url = f"{BASE_URL}/ar/shop?currency_set=true&page={page_num}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    
    for attempt in range(3):
        try:
            resp = opener.open(req, timeout=25)
            html = resp.read().decode('utf-8', errors='ignore')
            soup = BeautifulSoup(html, 'html.parser')
            wraps = soup.find_all('div', class_='single-product-wrap')
            
            items = []
            for wrap in wraps:
                # Image & detail link
                img_tag = wrap.find('img')
                img_url = img_tag['src'] if (img_tag and img_tag.get('src')) else ''
                
                # Product link & title
                a_tag = wrap.find('h3').find('a') if wrap.find('h3') else None
                title = a_tag.get_text(strip=True) if a_tag else (img_tag.get('alt', '').strip() if img_tag else '')
                detail_url = a_tag['href'] if (a_tag and a_tag.get('href')) else ''
                
                # Product ID from wishlist or cart
                prod_id = None
                wish_a = wrap.find('a', href=lambda h: h and 'id=' in h)
                if wish_a and wish_a.get('href'):
                    m = re.search(r'id=(\d+)', wish_a['href'])
                    if m:
                        prod_id = int(m.group(1))
                        
                # Price
                price_span = wrap.find('div', class_='product-price-2')
                price_val = 0.0
                if price_span:
                    p_text = price_span.get_text(strip=True)
                    m_p = re.search(r'([\d\.]+)', p_text)
                    if m_p:
                        try:
                            price_val = float(m_p.group(1))
                        except ValueError:
                            price_val = 0.0
                            
                # English name / slug from url
                slug = ""
                if detail_url:
                    slug = detail_url.rstrip('/').split('/')[-1]
                
                # Form & Strength
                form = extract_form(title)
                strength = extract_strength(title)
                name_norm = normalize_arabic(title)
                
                # Category heuristic
                category = 'دواء'
                if any(k in name_norm for k in ['عطر', 'شامبو', 'كريم مرطب', 'غسول', 'سيروم', 'صابون', 'شاور', 'واقي شمس', 'معجون']):
                    category = 'عناية وتجميل'
                elif any(k in name_norm for k in ['حفاض', 'بيبي', 'لهاية', 'ببرونة', 'رضاعة', 'لبن']):
                    category = 'مستلزمات أطفال'
                elif any(k in name_norm for k in ['جهاز', 'شاش', 'قطن', 'ترمومتر', 'سرنجة', 'بلاستر', 'قياس']):
                    category = 'أجهزة ومستلزمات طبية'
                    
                items.append({
                    'id': prod_id,
                    'name_ar': title,
                    'name_en': slug.replace('-', ' ').title(),
                    'slug': slug,
                    'name_normalized': name_norm,
                    'strength': strength,
                    'form': form,
                    'category': category,
                    'price_public': price_val,
                    'image_url': img_url,
                    'product_url': detail_url,
                    'page': page_num
                })
            return page_num, items, None
        except Exception as e:
            if attempt == 2:
                return page_num, [], str(e)
            time.sleep(2)

def main():
    print(f"🚀 بدء سحب كامل كتالوج صيدلية بحبح ({TOTAL_PAGES} صفحة)...")
    start_time = time.time()
    
    all_products = []
    failed_pages = []
    
    with ThreadPoolExecutor(max_workers=NUM_WORKERS) as executor:
        futures = {executor.submit(scrape_page, p): p for p in range(1, TOTAL_PAGES + 1)}
        for future in as_completed(futures):
            p_num, items, err = future.result()
            if err:
                print(f"❌ صفحة {p_num} فشلت: {err}")
                failed_pages.append(p_num)
            else:
                all_products.extend(items)
                print(f"✅ صفحة {p_num:3d}/{TOTAL_PAGES} - تم جلب {len(items):2d} منتج (الإجمالي: {len(all_products)})")
                
    # Retry failed
    if failed_pages:
        print(f"🔄 إعادة محاولة للصفحات التي تعثرت ({len(failed_pages)})...")
        for p_num in failed_pages:
            _, items, err = scrape_page(p_num)
            if items:
                all_products.extend(items)
                
    # Deduplicate by id or product_url
    unique_products = {}
    for p in all_products:
        key = p['id'] if p['id'] else p['product_url']
        if key and key not in unique_products:
            unique_products[key] = p
            
    products_list = list(unique_products.values())
    print(f"\n✨ اكتمل السحب بنجاح! إجمالي المنتجات الفريدة: {len(products_list)} في {time.time()-start_time:.1f} ثانية")
    
    # 1. Save JSON
    with open('products_catalog.json', 'w', encoding='utf-8') as f:
        json.dump(products_list, f, ensure_ascii=False, indent=2)
    print("📁 تم حفظ المنتجات في: products_catalog.json")
    
    # 2. Save CSV
    if products_list:
        with open('products_catalog.csv', 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=products_list[0].keys())
            writer.writeheader()
            writer.writerows(products_list)
        print("📁 تم حفظ المنتجات في: products_catalog.csv")
        
    # 3. Create SQLite Database matching Claude schema
    db_path = "pharmacy.db"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        name_ar TEXT NOT NULL,
        name_en TEXT,
        slug TEXT,
        name_normalized TEXT NOT NULL,
        active_ingredient TEXT,
        strength TEXT,
        form TEXT,
        category TEXT,
        image_url TEXT,
        product_url TEXT,
        price_public REAL,
        is_active INTEGER DEFAULT 1
    )
    """)
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS pharmacy_stock (
        product_id INTEGER PRIMARY KEY REFERENCES products(id),
        qty INTEGER NOT NULL DEFAULT 50,
        last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cur.execute("DELETE FROM products")
    cur.execute("DELETE FROM pharmacy_stock")
    
    for p in products_list:
        cur.execute("""
        INSERT OR REPLACE INTO products 
        (id, name_ar, name_en, slug, name_normalized, active_ingredient, strength, form, category, image_url, product_url, price_public, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            p['id'], p['name_ar'], p['name_en'], p['slug'], p['name_normalized'],
            None, p['strength'], p['form'], p['category'], p['image_url'], p['product_url'], p['price_public']
        ))
        
        # Default mock stock
        if p['id']:
            cur.execute("INSERT OR REPLACE INTO pharmacy_stock (product_id, qty) VALUES (?, ?)", (p['id'], 25))
            
    conn.commit()
    conn.close()
    print("🗄️ تم إنشاء قاعدة بيانات SQLite جاهزة: pharmacy.db")

if __name__ == '__main__':
    main()
