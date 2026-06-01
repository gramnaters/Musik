import sys, json

data = json.load(sys.stdin)
results = data.get('results', {})
albums = results.get('albums', {}).get('data', [])
for a in albums:
    attrs = a.get('attributes', {})
    print(f'{a["id"]}: {attrs.get("name")}')
