import json
try:
    with open("production_posts.json", "r", encoding="utf-16") as f:
        data = json.load(f)
    print(f"Loaded {len(data.get("data", []))} posts.")
    with open("production_posts.json", "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("re-saved as utf-8")
except Exception as e:
    print(f"Error: {e}")
