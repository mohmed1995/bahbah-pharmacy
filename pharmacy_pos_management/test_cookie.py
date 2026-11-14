import urllib.request
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's test with currency_set=true and cookiejar
import http.cookiejar

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

urls_to_test = [
    "https://www.bahbahpharmacyonline.com/ar/brands?currency_set=true",
    "https://www.bahbahpharmacyonline.com/ar/shop?currency_set=true",
    "https://www.bahbahpharmacyonline.com/ar/shop?category=medicines&currency_set=true",
    "https://www.bahbahpharmacyonline.com/ar/shop?brand=Other&currency_set=true",
]

for url in urls_to_test:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        resp = opener.open(req, timeout=15)
        html = resp.read().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(html, 'html.parser')
        print(f"\nURL: {url}")
        print("  Page Title:", soup.title.string.strip() if soup.title else "")
        # Look for product cards / titles
        items = soup.find_all(class_=lambda c: c and any(k in str(c).lower() for k in ['product', 'item', 'card']))
        print("  Matching elements count:", len(items))
        
        # print any images from uploads/storage
        imgs = [img['src'] for img in soup.find_all('img', src=True) if not any(x in img['src'] for x in ['logo', 'WhatsApp', 'No_image'])]
        print("  Real product/brand images:", len(imgs), imgs[:5])
        
        # Let's see if there is product text
        prices = soup.find_all(string=lambda t: t and ('ج.م' in t or 'EGP' in t))
        print("  Price elements count:", len(prices))
        if prices:
            print("  Sample prices:", [p.strip() for p in prices[:5]])
    except Exception as e:
        print(f"Error {url}: {e}")
