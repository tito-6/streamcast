import httpx
import asyncio
import json

async def test_fotmob():
    # 47 is Premier League
    url = "https://www.fotmob.com/api/leagues?id=47"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    print(f"Fetching {url}...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, follow_redirects=True, timeout=20.0)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print("--- League Data ---")
                print(f"Name: {data.get('details', {}).get('name')}")
                print("Has Table:", 'table' in data)
                print("Has Matches:", 'matches' in data)
                if 'matches' in data:
                    print(f"Match Count: {len(data['matches'].get('allMatches', []))}")
                    print(f"Sample: {data['matches']['allMatches'][0] if data['matches']['allMatches'] else 'None'}")
            else:
                print(resp.text[:500])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_fotmob())
