import urllib.request
from bs4 import BeautifulSoup
import http.cookiejar
import sys

sys.stdout.reconfigure(encoding='utf-8')

cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

url = "https://www.bahbahpharmacyonline.com/ar/shop?currency_set=true"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
resp = opener.open(req)
soup = BeautifulSoup(resp.read().decode('utf-8', errors='ignore'), 'html.parser')

# Find img tags with /images/products/
imgs = soup.find_all('img', src=lambda s: s and '/images/products/' in s)
print(f"Found {len(imgs)} product images")
for img in imgs[:5]:
    parent = img.parent
    # climb up 2-4 parents to get the card
    card = parent
    for _ in range(3):
        if card.parent and card.parent.name != 'body':
            card = card.parent
    print("\n--- Card snippet ---")
    print("IMG:", img['src'])
    print("Text:", card.get_text(separator=' | ', strip=True)[:150])
    # links inside card
    for a in card.find_all('a', href=True):
        print("Link:", a['href'], "Text:", a.get_text(strip=True))
