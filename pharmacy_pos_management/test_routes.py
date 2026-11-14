import urllib.request
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's check https://www.bahbahpharmacyonline.com/en
url = "https://www.bahbahpharmacyonline.com/en"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req, timeout=15) as resp:
        html = resp.read().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(html, 'html.parser')
        print("Title /en:", soup.title.string.strip() if soup.title else "")
        imgs = [img.get('src') for img in soup.find_all('img') if img.get('src')]
        print(f"Total imgs on /en: {len(imgs)}")
        for im in imgs[:15]:
            print("  Img:", im)
except Exception as e:
    print("Error /en:", e)

# Also let's check sitemap.xml or robots.txt
for path in ['/robots.txt', '/sitemap.xml', '/sitemap_index.xml']:
    try:
        u = "https://www.bahbahpharmacyonline.com" + path
        r = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(r, timeout=10) as resp:
            content = resp.read().decode('utf-8', errors='ignore')
            print(f"\n--- {path} (len: {len(content)}) ---")
            print(content[:500])
    except Exception as e:
        print(f"Error {path}: {e}")
