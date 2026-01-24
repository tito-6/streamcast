import os
import json
import redis
import httpx
import random
from bs4 import BeautifulSoup
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv
from datetime import datetime, timedelta
import asyncio

# Load Env
load_dotenv(".env.local")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis Setup
class MockRedis:
    def __init__(self): self.data = {}
    def get(self, key): return self.data.get(key)
    def set(self, key, value, ex=None): self.data[key] = value; return True

try:
    redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
    redis_client.ping()
except:
    redis_client = MockRedis()

# --- Config ---
# Using Flashscore Mobi for all as it is more reliable for scraping without heavy blocking for now
FLASHSCORE_MOBI = "https://www.flashscore.mobi"
HEADERS_MOBI = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
}

# Extensive ID Mapping for Flashscore Mobi (?s=ID)
SPORT_MAPPING = {
    "football": {"id": 1},
    "tennis": {"id": 2},
    "basketball": {"id": 3},
    "hockey": {"id": 4},
    "american-football": {"id": 5},
    "baseball": {"id": 6},
    "handball": {"id": 7},
    "rugby-union": {"id": 8},
    "floorball": {"id": 9},
    "bandy": {"id": 10},
    "futsal": {"id": 11},
    "volleyball": {"id": 12},
    "cricket": {"id": 13},
    "rugby-league": {"id": 14},
    "darts": {"id": 15},
    "snooker": {"id": 19},
    "boxing": {"id": 16},
    "beach-volleyball": {"id": 17},
    "badminton": {"id": 21},
    "water-polo": {"id": 22},
    "golf": {"id": 23},
    "field-hockey": {"id": 24},
    "table-tennis": {"id": 25},
    "beach-soccer": {"id": 26},
    "mma": {"id": 28},
    "netball": {"id": 29},
    "pesapallo": {"id": 30},
    "motorsport": {"id": 31}, # varying
    "motorsport-auto": {"id": 31},
    "motorsport-moto": {"id": 32},
    "cycling": {"id": 33},
    "horse-racing": {"id": 34},
    "esports": {"id": 27},
    "winter-sports": {"id": 37},
    "kabaddi": {"id": 42},
}

# --- Data Fetchers ---

async def fetch_flashscore_scrape(sport_id: int, day_offset: int):
    """Scrape sports from Flashscore Mobi"""
    url = f"{FLASHSCORE_MOBI}/?s={sport_id}&d={day_offset}"
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=HEADERS_MOBI, timeout=8.0)
            if resp.status_code == 200:
                return parse_flashscore_html(resp.text)
        except Exception as e:
             print(f"Flashscore Error: {e}")
    return []

def generate_odds():
    """Generate synthetic odds for demonstration"""
    # 1 / X / 2
    o1 = round(random.uniform(1.1, 4.0), 2)
    ox = round(random.uniform(2.5, 4.5), 2)
    o2 = round(random.uniform(1.1, 4.0), 2)
    return {"1": o1, "X": ox, "2": o2}

def parse_flashscore_html(html: str):
    soup = BeautifulSoup(html, 'html.parser')
    main_div = soup.find('div', id='score-data')
    if not main_div: return []

    groups = []
    current_group = None
    
    # Iterate linear elements
    for el in main_div.children:
        if el.name == 'h4':
            raw_txt = el.get_text(strip=True)
            # Remove "Standings" or "Draw" which often stick to the league name in mobi
            txt = raw_txt.replace("Standings", "").replace("Draw", "").strip()
            
            parts = txt.split(':', 1)
            country = parts[0].strip() if len(parts) > 1 else "World"
            league = parts[1].strip() if len(parts) > 1 else txt
            
            # --- FILTER: Exclude specific countries ---
            if "israel" in country.lower():
                current_group = None
                continue
            
            current_group = {
                "id": str(hash(txt)),
                "group_title": txt,
                "country": country,
                "league": league,
                "logo": "", 
                "items": []
            }
            groups.append(current_group)
            
        elif el.name == 'span' and current_group is not None:
             try:
                 # Structure: span(Time/Status) -> Text(Home - Away) -> a(Score)
                 time_status = el.get_text(strip=True)
                 
                 # Next node: text "Home - Away"
                 text_node = el.next_sibling
                 if not text_node or isinstance(text_node, str) == False: continue
                 
                 teams_str = str(text_node).strip()
                 home, away = "Home", "Away"
                 if " - " in teams_str:
                     parts = teams_str.split(" - ")
                     home, away = parts[0].strip(), parts[1].strip()
                 
                 # Next node: a (score)
                 score_node = text_node.next_sibling
                 score = "-"
                 status = "UPCOMING"
                 match_id = ""
                 score_home = 0
                 score_away = 0
                 
                 if score_node and score_node.name == 'a':
                     score = score_node.get_text(strip=True)
                     cl = score_node.get('class', [])
                     if 'live' in cl: status = "LIVE"
                     elif 'fin' in cl: status = "FINISHED"
                     
                     # Check score parsing
                     if "-" in score and score != "-":
                         sp = score.split("-")
                         try:
                             score_home = int(sp[0].strip())
                             score_away = int(sp[1].strip())
                         except: pass

                     # Extract ID from href
                     href = score_node.get('href', '')
                     # href usually /match/ID/...
                     parts = href.split('/')
                     if len(parts) > 2: match_id = parts[2]
                 
                 # Generate Odds
                 odds = generate_odds()

                 current_group['items'].append({
                     "id": match_id or str(hash(teams_str)),
                     "time": time_status,
                     "status": status,
                     "home": home,
                     "away": away,
                     "score": score,
                     "home_logo": "", # Will handle on frontend via local lookup or shield
                     "away_logo": "",
                     "score_home": score_home,
                     "score_away": score_away,
                     "odds": odds
                 })
             except:
                 continue
                 
    return groups

# --- API Endpoints ---

@app.get("/api/scores")
async def get_scores(sport: str = "football", date: str = "today", lang: str = "en"):
    # 1. Resolve Date
    target_dt = datetime.now()
    if date == "yesterday": target_dt -= timedelta(days=1)
    elif date == "tomorrow": target_dt += timedelta(days=1)
    elif date != "today":
        try: target_dt = datetime.strptime(date, "%Y-%m-%d")
        except: pass # fallback to today

    date_str_iso = target_dt.strftime("%Y-%m-%d")
    
    # 2. Redis Cache
    # cache_key = f"scores:{sport}:{date_str_iso}:{lang}"
    # cached = redis_client.get(cache_key)
    # if cached: return json.loads(cached)
    # Disabled Cache momentarily for debugging dynamic odds/scraping
    
    config = SPORT_MAPPING.get(sport.lower(), SPORT_MAPPING["football"])
    
    # Calculate offset
    delta = (target_dt.date() - datetime.now().date()).days
    
    # Fetch
    result_data = await fetch_flashscore_scrape(config["id"], delta)
            
    # Response Wrapper
    resp = {
        "date": date_str_iso,
        "sport": sport,
        "all_leagues": result_data,
        "pinned": [l for l in result_data if l.get("items") and len(l["items"]) > 0][:5]
    }
    
    # redis_client.set(cache_key, json.dumps(resp), ex=120) 
    return resp

# --- CMS / News Endpoint (Synced from Production) ---
@app.get("/api/posts")
async def get_posts():
    """
    Returns latest news posts (Synced from Production).
    """
    try:
        if os.path.exists("production_posts.json"):
            with open("production_posts.json", "r", encoding="utf-8") as f:
                data = json.load(f)
            return data
    except Exception as e:
        print(f"Error loading posts: {e}")
    
    # Fallback to empty if file missing
    return {"data": []}

# --- Settings & Instagram ---
SETTINGS_FILE = "settings.json"

@app.get("/api/settings")
async def get_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            return json.load(f)
    return {
        "siteName": "StreamCast Platform",
        "adminEmail": "admin@streamcast.com",
        "maintenanceMode": False,
        "allowRegistration": True,
        "instagram_username": "event_01s"
    }

@app.post("/api/settings")
async def save_settings(request: Request):
    data = await request.json()
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f)
    return {"status": "saved"}

@app.get("/api/instagram")
async def get_instagram():
    # Load username from settings
    username = "event_01s"
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, "r") as f:
            username = json.load(f).get("instagram_username", "event_01s")

    # Return mock data for the frontend to render
    # In a real scenario, this would use the Instagram Basic Display API
    return {
        "data": [
            {
                "id": "1",
                "media_url": "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=400&q=80",
                "caption": f"Follow us @{username} for live updates! ⚽🔥 #football #live",
                "permalink": f"https://instagram.com/{username}"
            },
            {
                "id": "2",
                "media_url": "https://images.unsplash.com/photo-1541252260730-0412e8e2108e?auto=format&fit=crop&w=400&q=80",
                "caption": "Championship finals details announced! 🏆",
                "permalink": f"https://instagram.com/{username}"
            },
            {
                "id": "3",
                "media_url": "https://images.unsplash.com/photo-1579952363873-27f3bde9be2d?auto=format&fit=crop&w=400&q=80",
                "caption": "Who is your player of the match? 🌟",
                "permalink": f"https://instagram.com/{username}"
            }
        ]
    }

# --- AI Chat Agent ---
@app.post("/api/chat")
async def chat_agent(request: Request):
    try:
        body = await request.json()
        user_msg = body.get("message", "")
        history_raw = body.get("history", [])
        
        import google.generativeai as genai
        GENAI_KEY = os.getenv("GEMINI_API_KEY")
        if not GENAI_KEY: 
            return {"response": "I'm offline right now (No Key)."}
        
        genai.configure(api_key=GENAI_KEY)
        
        # DEBUG: Check what models are actually seen by this Key
        valid_model_name = 'gemini-pro'
        try:
            available = []
            for m in genai.list_models():
                if 'generateContent' in m.supported_generation_methods:
                    available.append(m.name)
            
            print(f"DEBUG - Available Models: {available}")
            
            # Smart selection
            if 'models/gemini-1.5-flash' in available: 
                valid_model_name = 'gemini-1.5-flash'
            elif 'models/gemini-pro' in available:
                valid_model_name = 'gemini-pro'
            elif available:
                valid_model_name = available[0].split('/')[-1] # Take first available
                
        except Exception as e:
            print(f"DEBUG - ListModels Failed: {e}. Defaulting to gemini-pro")

        system_rules = """
        You are 'Athena', the elite AI sports analyst.
        Your personality: Sharp, knowledgeable, slightly witty, and professional.
        RULES:
        1. Talk ONLY about sports.
        2. Keep answers concise usually (2-3 sentences).
        3. ALWAYS reply in the SAME LANGUAGE as the user's message (e.g., if asked in Arabic, reply in Arabic).
        """
        
        print(f"DEBUG - Using Model: {valid_model_name}")
        model = genai.GenerativeModel(valid_model_name)

        # Convert History
        formatted_history = []
        
        # Inject System Prompt as a fake first turn
        formatted_history.append({"role": "user", "parts": [system_rules]})
        formatted_history.append({"role": "model", "parts": ["Understood. I am Athena."]})
        
        for turn in history_raw:
            role = turn['role']
            if role == 'assistant': role = 'model'
            formatted_history.append({
                "role": role,
                "parts": [turn['content']]
            })
            
        chat = model.start_chat(history=formatted_history)
        
        response = chat.send_message(user_msg)
        return {"response": response.text}
        
    except Exception as e:
        print(f"Chat Error: {e}")
        return {"response": f"Tactical Error: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

