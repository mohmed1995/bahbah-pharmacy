import urllib.request
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Follow redirect or check /ar
url = "https://www.bahbahpharmacyonline.com/ar"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

soup = BeautifulSoup(html, 'html.parser')
print("Title:", soup.title.string.strip() if soup.title else "")
imgs = [img.get('src') for img in soup.find_all('img') if img.get('src')]
print(f"Total imgs on /ar: {len(imgs)}")
for im in imgs[:15]:
    print("  Img:", im)

# Check all links containing product or item
prod_links = [a['href'] for a in soup.find_all('a', href=True) if '/product' in a['href'] or '/item' in a['href'] or '/shop/' in a['href']]
print(f"Product links on /ar: {len(prod_links)}")
for pl in prod_links[:10]:
    print("  Prod:", pl)
