import urllib.request
import re

url = 'https://bahbah-pharmacy.pages.dev/'
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        scripts = re.findall(r'src=["\']([^"\']+)["\']', html)
        print("Scripts:")
        for s in scripts:
            print(" ", s)
            try:
                asset_url = url.rstrip('/') + s if s.startswith('/') else url + s
                areq = urllib.request.Request(asset_url, headers=headers)
                with urllib.request.urlopen(areq) as a_res:
                    print(f"    -> OK ({a_res.status})")
            except Exception as e:
                print(f"    -> ERROR: {e}")
except Exception as e:
    print("Fetch error:", e)
