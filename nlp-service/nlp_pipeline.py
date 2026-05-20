import spacy
import feedparser
import requests
from bs4 import BeautifulSoup
import uuid
import datetime
import time
import random
import re
import os
import pandas as pd
from deep_translator import GoogleTranslator
from database import get_db_connection

def load_india_cities():
    """Loads India cities dynamically from the CSV file"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, "data", "cities_india.csv")
    
    if not os.path.exists(csv_path):
        print(f"Warning: cities_india.csv not found at {csv_path}. Falling back to empty city list.")
        return []
        
    try:
        df = pd.read_csv(csv_path)
        if "name" in df.columns:
            return df["name"].dropna().astype(str).tolist()
        else:
            print("Warning: 'name' column missing in cities_india.csv. Falling back to empty list.")
            return []
    except Exception as e:
        print(f"Warning: Failed to load cities_india.csv: {e}. Falling back to empty list.")
        return []

INDIA_CITIES = load_india_cities()

# Load spaCy English NLP model
print("Loading spaCy model...")
nlp = spacy.load('en_core_web_md')

RSS_FEEDS = [
    # Pan-India English Feeds
    {"source": "TOI India", "url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "language": "en"},
    {"source": "The Hindu National", "url": "https://www.thehindu.com/news/national/feeder/default.rss", "language": "en"},
    {"source": "NDTV India", "url": "https://feeds.feedburner.com/ndtvnews-india-news", "language": "en"},
    {"source": "Indian Express", "url": "https://indianexpress.com/section/india/feed/", "language": "en"},
    {"source": "News18 India", "url": "https://www.news18.com/rss/india.xml", "language": "en"},
    {"source": "India Today", "url": "https://www.indiatoday.in/rss/1206514", "language": "en"},
    {"source": "Hindustan Times", "url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", "language": "en"},
    # City specific for extra coverage
    {"source": "TOI Delhi", "url": "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", "language": "en"},
    {"source": "TOI Mumbai", "url": "https://timesofindia.indiatimes.com/rssfeeds/29806822.cms", "language": "en"},
    {"source": "TOI Bangalore", "url": "https://timesofindia.indiatimes.com/rssfeeds/29806888.cms", "language": "en"},
    {"source": "TOI Chennai", "url": "https://timesofindia.indiatimes.com/rssfeeds/29806887.cms", "language": "en"},
    {"source": "NDTV Cities", "url": "https://feeds.feedburner.com/ndtvnews-cities-news", "language": "en"},
    
    # Top Hindi Feeds (Auto-translated to English)
    {"source": "Jagran Hindi", "url": "https://www.jagran.com/rss/news/national.xml", "language": "hi"},
    {"source": "Amar Ujala", "url": "https://www.amarujala.com/rss/breaking-news.xml", "language": "hi"},
    {"source": "Aaj Tak", "url": "https://aajtak.in/rssfeeds/?id=home", "language": "hi"},
    {"source": "NDTV Khabar", "url": "https://feeds.feedburner.com/ndtvkhabar-latest", "language": "hi"},
    {"source": "Live Hindustan", "url": "https://www.livehindustan.com/rss/india", "language": "hi"},
    {"source": "Navbharat Times", "url": "https://navbharattimes.indiatimes.com/rssfeeds/1055808.cms", "language": "hi"},
    {"source": "OneIndia Hindi", "url": "https://hindi.oneindia.com/rss/hindi-news-fb.xml", "language": "hi"},
    {"source": "News18 Hindi", "url": "https://hindi.news18.com/rss/khabar/nation/nation.xml", "language": "hi"},
    {"source": "Zee News Hindi", "url": "https://zeenews.india.com/hindi/india/rss", "language": "hi"},
    {"source": "TV9 Bharatvarsh", "url": "https://www.tv9hindi.com/india/feed", "language": "hi"},
    {"source": "Prabhat Khabar", "url": "https://www.prabhatkhabar.com/rss/india", "language": "hi"},
]

# Keywords to classify crime type
CRIME_KEYWORDS = {
    "theft": ["theft", "stolen", "robbery", "burglary", "snatch", "looted", "thief", "extortion", "scam", "fraud"],
    "harassment": ["harassment", "molestation", "eve-teasing", "stalking", "rape", "abused"],
    "assault": ["assault", "murder", "killed", "attacked", "shot", "stabbed", "violence", "kidnapped", "abducted"],
    "suspicious": ["suspicious", "arrested", "smuggling", "drugs", "fake", "terror", "bomb", "bribe"]
}

def clean_html(raw_html):
    """Remove HTML tags from the description text"""
    soup = BeautifulSoup(raw_html, "html.parser")
    return soup.get_text()

# Geocoding cache to protect Nominatim API rate limits
GEOCODE_CACHE = {}

def extract_crime_info(text):
    """Use spaCy to extract location, classify crime type with severity priority, and compute confidence score"""
    doc = nlp(text)
    
    # Identify Location (GPE = Geopolitical Entity, LOC = Location, FAC = Facility)
    locations = [ent.text for ent in doc.ents if ent.label_ in ['GPE', 'LOC', 'FAC']]
    primary_location = locations[0] if locations else None
    
    # India-specific city matching fallback if spaCy fails to identify a location
    if not primary_location:
        for city in INDIA_CITIES:
            if re.search(r'\b' + re.escape(city) + r'\b', text, re.IGNORECASE):
                primary_location = city
                break

    # Identify Crime Type with Severity Priority
    CRIME_PRIORITY = ["assault", "harassment", "theft", "suspicious"]
    
    crime_type = "other"
    match_count = 0
    text_lower = text.lower()
    
    for c_type in CRIME_PRIORITY:
        matches = sum(1 for kw in CRIME_KEYWORDS[c_type] if kw in text_lower)
        if matches > match_count:
            match_count = matches
            crime_type = c_type
            
    # Compute confidence score: 0.0 to 1.0 based on keyword match density (cap at 1.0)
    confidence = min(match_count / 3.0, 1.0) if crime_type != "other" else 0.0
            
    return crime_type, primary_location, confidence

def geocode_location(location_name):
    """Use Nominatim API to get Latitude and Longitude from a city/area name with caching"""
    if not location_name:
        return None, None
        
    if location_name in GEOCODE_CACHE:
        return GEOCODE_CACHE[location_name]
        
    try:
        # We append 'India' to ensure it searches within the country
        url = f"https://nominatim.openstreetmap.org/search?q={location_name}, India&format=json&limit=1"
        headers = {'User-Agent': 'Jagriti_NLP_Service_App'}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data:
                lat, lng = float(data[0]['lat']), float(data[0]['lon'])
                GEOCODE_CACHE[location_name] = (lat, lng)
                return lat, lng
    except Exception as e:
        print(f"Geocoding error for {location_name}: {e}")
        
    # Store negative hit so we don't query same missing place repeatedly
    GEOCODE_CACHE[location_name] = (None, None)
    return None, None

def is_within_india(lat, lng):
    """Ensure coordinates fall roughly within India's bounding box"""
    return (6.0 <= lat <= 38.0) and (68.0 <= lng <= 98.0)

def translate_hindi_to_english(text):
    """Sends Hindi text to Google Translate API using deep-translator"""
    if not text.strip(): return text
    try:
        translated = GoogleTranslator(source='hi', target='en').translate(text[:500])
        return translated
    except Exception as e:
        print(f"Translation Error for text '{text[:20]}...': {e}")
    return text

def cleanup_old_data(conn):
    """Deletes incidents and sources older than 180 days to prevent the database from overfilling."""
    if not conn:
        return
        
    try:
        cursor = conn.cursor()
        print(f"[{datetime.datetime.now()}] Running database cleanup for records older than 180 days...")
        
        # Delete from incident_sources first (in case ON DELETE CASCADE is missing)
        cursor.execute("""
            DELETE FROM incident_sources 
            WHERE "createdAt" < NOW() - INTERVAL '180 days'
        """)
        sources_deleted = cursor.rowcount
        
        # Delete from incidents
        cursor.execute("""
            DELETE FROM incidents 
            WHERE "createdAt" < NOW() - INTERVAL '180 days'
        """)
        incidents_deleted = cursor.rowcount
        
        conn.commit()
        cursor.close()
        
        if incidents_deleted > 0 or sources_deleted > 0:
            print(f" Cleanup successful: Removed {incidents_deleted} old incidents and {sources_deleted} old sources.")
        else:
            print(" Cleanup complete: No old records found.")
            
    except Exception as e:
        conn.rollback()
        print(f"Database Cleanup Error: {e}")

def process_feeds():
    """Main pipeline: Fetch RSS -> Translate (if Hindi) -> Extract Info -> Geocode -> Save to Postgres"""
    print(f"[{datetime.datetime.now()}] Starting NLP Pipeline for RSS Feeds...")
    
    conn = get_db_connection()
    if not conn:
        print("Warning: Failed to connect to database. Running in dry-run mode (printing to terminal only).")
    else:
        cleanup_old_data(conn)
        cursor = conn.cursor()

    saved_incidents = []

    for feed in RSS_FEEDS:
        print(f"\n--- Processing feed: {feed['source']} ---")
        parsed_feed = feedparser.parse(feed['url'])
        
        for entry in parsed_feed.entries: # Process all available entries per feed
            title = entry.title
            description = clean_html(entry.get('description', ''))
            
            # Check if this article URL already exists in incident_sources (prevent duplicates)
            if conn:
                cursor.execute("SELECT id FROM incident_sources WHERE \"sourceUrl\" = %s", (entry.link,))
                if cursor.fetchone():
                    continue # Already processed, skip
            
            # Translate to English if it's a Hindi feed
            if feed.get("language") == "hi":
                title = translate_hindi_to_english(title)
                description = translate_hindi_to_english(description)
                
            full_text = f"{title}. {description}"
                
            crime_type, extracted_location, confidence = extract_crime_info(full_text)
            
            # (Terminal printing moved down to successful database save to reduce noise)
            
            # Only save if it looks like a crime AND has a location extracted
            if crime_type != "other" and extracted_location:
                lat, lng = geocode_location(extracted_location)
                
                # If we successfully found geographic coordinates AND they are in India
                if lat and lng:
                    if not is_within_india(lat, lng):
                        print(f"⚠️ Skipped: Location '{extracted_location}' ({lat}, {lng}) is outside India.")
                        continue
                        
                    print(f" Geocoded: {extracted_location} -> ({lat}, {lng})")
                    
                    # Add small random jitter (~1-5km) so multiple incidents in the same city don't completely overlap
                    jitter_lat = lat + random.uniform(-0.05, 0.05)
                    jitter_lng = lng + random.uniform(-0.05, 0.05)
                    
                    if conn:
                        incident_id = str(uuid.uuid4())
                        current_time = datetime.datetime.now()
                        
                        try:
                            # 1. Insert into incidents table (using PostGIS ST_MakePoint)
                            cursor.execute("""
                                INSERT INTO incidents (id, title, description, type, date, location, city, "confidence_score", "createdAt", "updatedAt")
                                VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s)
                            """, (
                                incident_id, title[:255], description, crime_type, current_time, 
                                jitter_lng, jitter_lat, extracted_location[:255], confidence, current_time, current_time
                            ))
                            
                            # 2. Insert into incident_sources table
                            source_id = str(uuid.uuid4())
                            cursor.execute("""
                                INSERT INTO incident_sources (id, "incidentId", "sourceName", "sourceUrl", "reliabilityScore", "createdAt", "updatedAt")
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """, (
                                source_id, incident_id, feed['source'], entry.link, 0.8, current_time, current_time
                            ))
                            
                            conn.commit()
                            
                            saved_incidents.append({
                                "title": title,
                                "source": feed['source'],
                                "crime_type": crime_type,
                                "location": extracted_location
                            })
                            
                            safe_title = title[:80].encode('ascii', 'replace').decode('ascii')
                            print(f"\n✅ NEW INCIDENT RECEIVED & SAVED!")
                            print(f"   Source   : {feed['source']}")
                            print(f"   Crime    : [{crime_type.upper()}] in {extracted_location}")
                            print(f"   Headline : {safe_title}...")
                            print(f"   Status   : Successfully committed to PostgreSQL Database\n")
                            
                            # Be polite to Nominatim API (Max 1 request per second as per their policy)
                            time.sleep(1.5) 
                            
                        except Exception as e:
                            conn.rollback()
                            print(f"DB Insert Error: {e}")
 
    if conn:
        cursor.close()
        conn.close()
    print(f"\n[{datetime.datetime.now()}] Pipeline finished. Added {len(saved_incidents)} new real incidents to the map.")
    return saved_incidents

def run_scheduler():
    """Runs the pipeline immediately, then schedules it to run every 3 hours."""
    print("=================================================================")
    print(f"[{datetime.datetime.now()}] Starting NLP Engine in Scheduler Mode")
    print("=================================================================")
    
    while True:
        next_run = datetime.datetime.now() + datetime.timedelta(hours=3)
        try:
            saved_incidents = process_feeds()
            
            # Print Cycle Summary
            print("\n=======================================================")
            print("                SCRAPING CYCLE SUMMARY                 ")
            print("=======================================================")
            if saved_incidents:
                print(f"Total New Incidents Found & Saved: {len(saved_incidents)}\n")
                for i, inc in enumerate(saved_incidents, 1):
                    # Clean up headline for safe console printing
                    safe_headline = inc['title'][:80].encode('ascii', 'replace').decode('ascii')
                    print(f"{i}. [{inc['crime_type'].upper()}] - {safe_headline}...")
                    print(f"   📍 Location: {inc['location']} | 📰 Source: {inc['source']}")
            else:
                print("No new incidents found in this cycle.")
            print("=======================================================")
            
        except Exception as e:
            print(f"[{datetime.datetime.now()}] Unexpected Error in pipeline: {e}")
            
        print(f"\n⏰ Next scheduled scraping run: {next_run.strftime('%Y-%m-%d %H:%M:%S')}")
        print("Sleeping for 3 hours...\n")
        time.sleep(3 * 60 * 60) # Sleep for 3 hours (10800 seconds)

if __name__ == "__main__":
    run_scheduler()
