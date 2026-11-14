import urllib.request
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

# Let's check homepage
url = "https://www.bahbahpharmacyonline.com/"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

soup = BeautifulSoup(html, 'html.parser')
print("Title:", soup.title.string.strip() if soup.title else "")
imgs = [img.get('src') for img in soup.find_all('img') if img.get('src')]
print(f"Total imgs on home: {len(imgs)}")
for im in imgs[:15]:
    print("  ", im)

# find links to products or categories
links = set([a['href'] for a in soup.find_all('a', href=True)])
print(f"Total links: {len(links)}")
for l in list(links)[:15]:
    print("  Link:", l)
