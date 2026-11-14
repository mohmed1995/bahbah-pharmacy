import os
import sys
import time
import json
import urllib.request
import http.cookiejar
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "https://www.bahbahpharmacyonline.com"
OUTPUT_DIR = "downloaded_data"
IMAGES_DIR = os.path.join(OUTPUT_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Setup session
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
opener.open(f"{BASE_URL}/ar/brands?currency=egp")

def fetch_page(page_num):
    url = f"{BASE_URL}/ar/shop?brand=Other&currency_set=true&page={page_num}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        resp = opener.open(req, timeout=20)
        html = resp.read().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(html, 'html.parser')
        
        products = []
        imgs = soup.find_all('img', src=lambda s: s and '/images/products/' in s)
        for img in imgs:
            img_src = img.get('src')
            title = img.get('alt', '').strip()
            
            # Find detail link
            parent = img.find_parent('div', class_='product-img')
            detail_link = ""
            if parent:
                a_tag = parent.find('a', href=True)
                if a_tag:
                    detail_link = a_tag['href']
                    
            if title and img_src:
                products.append({
                    'title': title,
                    'image_url': img_src,
                    'product_url': detail_link,
                    'page': page_num
                })
        return products
    except Exception as e:
        print(f"Error page {page_num}: {e}")
        return []

def download_image(item):
    url = item['image_url']
    fname = os.path.basename(url.split('?')[0])
    save_path = os.path.join(IMAGES_DIR, fname)
    if os.path.exists(save_path):
        return True
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as r, open(save_path, 'wb') as f:
            f.write(r.read())
        return True
    except Exception as e:
        return False

if __name__ == '__main__':
    print("Test scraper for 2 pages...")
    all_prods = []
    for p in range(1, 3):
        res = fetch_page(p)
        print(f"Page {p}: retrieved {len(res)} products")
        all_prods.extend(res)
        
    print(f"Total retrieved in sample: {len(all_prods)}")
    # test downloading first 5 images
    for item in all_prods[:5]:
        s = download_image(item)
        print(f"Downloaded {item['title'][:25]}: {s}")
