import urllib.request
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "https://www.bahbahpharmacyonline.com/ar/shop"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(html, 'html.parser')
        
        # Look for products
        product_cards = soup.find_all('div', class_=lambda c: c and ('product' in c.lower() or 'item' in c.lower()))
        print(f"Product cards candidate count: {len(product_cards)}")
        
        # Look for product links and images
        products = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            if '/product/' in href or '/products/' in href or '/item/' in href:
                img = a.find('img')
                src = (img.get('src') or img.get('data-src')) if img else None
                title = a.get_text(strip=True)
                products.append((title, href, src))
        
        print(f"Found {len(products)} product links:")
        for p in products[:10]:
            print(f"  Title: {p[0][:30]} | URL: {p[1]} | Img: {p[2]}")
            
        # Also check pagination or total count
        pagination = soup.find('ul', class_=lambda c: c and 'pagination' in c.lower())
        if pagination:
            print("Pagination found:", pagination.get_text(strip=True))
            
except Exception as e:
    print("Error:", e)
