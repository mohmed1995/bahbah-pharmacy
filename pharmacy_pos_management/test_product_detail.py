import urllib.request
from bs4 import BeautifulSoup
import http.cookiejar
import sys

sys.stdout.reconfigure(encoding='utf-8')

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# Fetch product detail page
opener.open("https://www.bahbahpharmacyonline.com/ar/brands?currency=egp")
prod_url = "https://www.bahbahpharmacyonline.com/ar/shop/doliprane-1000mg-15-tablets"
req = urllib.request.Request(prod_url, headers={'User-Agent': 'Mozilla/5.0'})
resp = opener.open(req)
html = resp.read().decode('utf-8', errors='ignore')
soup = BeautifulSoup(html, 'html.parser')

print("Product Page Title:", soup.title.string.strip() if soup.title else "")
h1 = soup.find('h1')
print("H1 Title:", h1.get_text(strip=True) if h1 else "")

# Images in product detail
imgs = [img['src'] for img in soup.find_all('img', src=True) if '/images/products/' in img['src']]
print(f"Product images ({len(imgs)}):", imgs)

# Description
desc = soup.find('div', class_=lambda c: c and ('description' in c or 'tab-pane' in c or 'detail' in c))
if desc:
    print("Description snippet:", desc.get_text(strip=True)[:200])

# Price
prices = [p.get_text(strip=True) for p in soup.find_all(class_=lambda c: c and 'price' in str(c).lower())]
print("Prices found:", prices[:5])
