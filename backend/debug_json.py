import json

with open(r'd:\streamcast\services\sports_engine\production_posts.json', 'rb') as f:
    raw_data = f.read()

decoded_data = raw_data.decode('utf-8', errors='ignore')
data = json.loads(decoded_data)
for post in data['data']:
    if post.get('id') == 33:
        title = post.get('title_ar', '')
        print(f"Post 33 Title Ar: {title}")
        print(f"Hex: {title.encode('utf-8').hex()}")
        # Check for 0xd8 0x2e in the encoded title
        if b'\xd8\x2e' in title.encode('utf-8'):
            print("Found 0xd8 0x2e in encoded title!")
        else:
            print("Did not find 0xd8 0x2e in encoded title.")
            
        # Check the WHOLE post raw bytes
        post_str = json.dumps(post)
        if b'\xd8\x2e' in post_str.encode('utf-8'):
            print("Found 0xd8 0x2e in post JSON bytes!")
