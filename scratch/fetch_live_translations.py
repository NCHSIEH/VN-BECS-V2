import urllib.request
import json

url = "https://becs-v1.web.app/api/v1/translations"

try:
    print(f"Fetching from {url}...")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as response:
        html = response.read().decode('utf-8')
        data = json.loads(html)
        print(f"Success! Found {len(data)} translation items in database.")
        
        # Look for mdm_role_ds_desc
        matches = [item for item in data if item.get('key') == 'mdm_role_ds_desc']
        print(f"Matches for 'mdm_role_ds_desc': {matches}")
        
        # Check a few keys
        keys = set(item.get('key') for item in data)
        print(f"Total distinct keys: {len(keys)}")
        print("Sample keys:", list(keys)[:10])
except Exception as e:
    print(f"Error fetching: {e}")
