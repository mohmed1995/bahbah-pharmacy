import urllib.request
from bs4 import BeautifulSoup
import http.cookiejar
import sys

sys.stdout.reconfigure(encoding='utf-8')

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

# First request to establish session and cookies
r1 = opener.open("https://www.bahbahpharmacyonline.com/ar/brands?currency=egp")

# Second request to the shop with brand=Other
url = "https://www.bahbahpharmacyonline.com/ar/shop?brand=Other&currency_set=true"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
resp = opener.open(req)
html = resp.read().decode('utf-8', errors='ignore')

with open('shop_other.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Saved shop_other.html, length:", len(html))

soup = BeautifulSoup(html, 'html.parser')
imgs = soup.find_all('img', src=lambda s: s and '/images/products/' in s)
print(f"Found {len(imgs)} product images")
for img in imgs[:5]:
    print("IMG:", img['src'])
    p = img.find_parent('div')
    if p:
        print("Parent text:", p.get_text(separator=' | ', strip=True)[:100])
