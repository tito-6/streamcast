import httpx
import asyncio
import json

async def test_fotmob_matches():
    # Matches endpoint often differs or is included in league?
    # Actually matches might be in 'matches' key which was False above.
    # Let's try matches specifically or check for fixtures.
    # New endpoints: /api/matches?date=20240125
    
    url = "https://www.fotmob.com/api/matches?date=20250125"
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
                print("--- Matches Data ---")
                print(f"Leagues in response: {len(data.get('leagues', []))}")
                if data.get('leagues'):
                    l = data['leagues'][0]
                    print(f"League: {l.get('name')}")
                    print(f"Matches: {len(l.get('matches', []))}")
                    if l.get('matches'):
                        print("Sample match details:", l['matches'][0])
            else:
                print(resp.text[:500])
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_fotmob_matches())
