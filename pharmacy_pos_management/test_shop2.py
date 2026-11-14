import urllib.request
from bs4 import BeautifulSoup
import sys

sys.stdout.reconfigure(encoding='utf-8')

url = "https://www.bahbahpharmacyonline.com/ar/shop"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=15) as resp:
    html = resp.read().decode('utf-8', errors='ignore')

soup = BeautifulSoup(html, 'html.parser')
main = soup.find('div', class_='main-wrapper')
if main:
    # let's see text inside main or divs
    print("Main wrapper inner text length:", len(main.get_text(strip=True)))
    # print all links inside main
    links = [(a.get_text(strip=True), a['href']) for a in main.find_all('a', href=True) if a['href'] != '#']
    print("Links in main:", len(links))
    for l in links[:20]:
        print("  ", l)
