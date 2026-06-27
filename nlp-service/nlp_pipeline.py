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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import pandas as pd
import json
from deep_translator import GoogleTranslator
from database import get_db_connection
from gazetteer_builder import SubLocalityGazetteer
from kalman_filter import denoise_incident_locations
import sys
import io

def determine_city_from_text(text):
    text_lower = text.lower()
    for city in MAJOR_CITIES:
        if re.search(r'\b' + re.escape(city.lower()) + r'\b', text_lower):
            return city
    return "Delhi"


# Force UTF-8 encoding for standard output and error stream
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except AttributeError:
        sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding='utf-8', errors='replace')

def load_india_cities():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(script_dir, "data", "cities_india.csv")
    if not os.path.exists(csv_path):
        print(f"Warning: cities_india.csv not found at {csv_path}.")
        return []
    try:
        df = pd.read_csv(csv_path)
        if "name" in df.columns:
            return df["name"].dropna().astype(str).tolist()
        else:
            return []
    except Exception as e:
        print(f"Warning: Failed to load cities_india.csv: {e}")
        return []

INDIA_CITIES = load_india_cities()

print("Loading spaCy model...")
nlp = spacy.load('en_core_web_md')

RSS_FEEDS = [
    {"source": "TOI India", "url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms", "language": "en"},
    {"source": "The Hindu National", "url": "https://www.thehindu.com/news/national/feeder/default.rss", "language": "en"},
    {"source": "NDTV India", "url": "https://feeds.feedburner.com/ndtvnews-india-news", "language": "en"},
    {"source": "Indian Express", "url": "https://indianexpress.com/section/india/feed/", "language": "en"},
    {"source": "News18 India", "url": "https://www.news18.com/rss/india.xml", "language": "en"},
    {"source": "India Today", "url": "https://www.indiatoday.in/rss/1206514", "language": "en"},
    {"source": "Hindustan Times", "url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml", "language": "en"},
    {"source": "TOI Delhi", "url": "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", "language": "en"},
    {"source": "TOI Mumbai", "url": "https://timesofindia.indiatimes.com/rssfeeds/29806822.cms", "language": "en"},
    {"source": "TOI Bangalore", "url": "https://timesofindia.indiatimes.com/rssfeeds/29806888.cms", "language": "en"},
    {"source": "TOI Chennai", "url": "https://timesofindia.indiatimes.com/rssfeeds/29806887.cms", "language": "en"},
    {"source": "NDTV Cities", "url": "https://feeds.feedburner.com/ndtvnews-cities-news", "language": "en"},
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

CRIME_KEYWORDS = {
    "theft": ["theft", "stolen", "robbery", "burglary", "snatch", "looted", "thief", "extortion", "scam", "fraud"],
    "harassment": ["harassment", "molestation", "eve-teasing", "stalking", "rape", "abused"],
    "assault": ["assault", "murder", "killed", "attacked", "shot", "stabbed", "violence", "kidnapped", "abducted"],
    "suspicious": ["suspicious", "arrested", "smuggling", "drugs", "fake", "terror", "bomb", "bribe"]
}

def clean_html(raw_html):
    soup = BeautifulSoup(raw_html, "html.parser")
    return soup.get_text()

GEOCODE_CACHE = {}

INDIA_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", 
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", 
    "Ladakh", "Puducherry", "Chandigarh", "Andaman and Nicobar Islands", "Dadra and Nagar Haveli and Daman and Diu", 
    "Lakshadweep"
]

MAJOR_CITIES = [
    "Mumbai", "Delhi", "Bengaluru", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", 
    "Pune", "Jaipur", "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", 
    "Pimpri-Chinchwad", "Patna", "Vadodara", "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", 
    "Meerut", "Rajkot", "Kalyan-Dombivli", "Vasai-Virar", "Varanasi", "Srinagar", "Aurangabad", 
    "Dhanbad", "Amritsar", "Navi Mumbai", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur", 
    "Gwalior", "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", 
    "Solapur", "Hubli-Dharwad", "Bareilly", "Moradabad", "Mysore", "Gurgaon", "Aligarh", "Jalandhar", 
    "Tiruchirappalli", "Bhubaneswar", "Salem", "Mira-Bhayandar", "Thiruvananthapuram", "Bhiwandi", 
    "Saharanpur", "Gorakhpur", "Guntur", "Bikaner", "Amravati", "Noida", "Jamshedpur", "Bhilai", 
    "Cuttack", "Firozabad", "Kochi", "Nellore", "Bhavnagar", "Dehradun", "Durgapur", "Asansol", 
    "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Jamnagar", "Ujjain", "Loni", 
    "Siliguri", "Jhansi", "Ulhasnagar", "Nellore", "Jammu", "Belgaum", "Mangalore"
]

def is_less_specific(loc):
    loc_lower = loc.strip().lower()
    if any(state.lower() == loc_lower for state in INDIA_STATES):
        return 2
    if any(city.lower() == loc_lower for city in MAJOR_CITIES):
        return 1
    return 0

def extract_crime_info(text):
    doc = nlp(text)
    locations = [ent.text.strip() for ent in doc.ents if ent.label_ in ['GPE', 'LOC', 'FAC']]
    is_ner_extracted = len(locations) > 0
    
    if not is_ner_extracted:
        for city in INDIA_CITIES:
            if re.search(r'\b' + re.escape(city) + r'\b', text, re.IGNORECASE):
                locations = [city]
                break
                
    if locations:
        seen = set()
        unique_locs = []
        for loc in locations:
            if loc.lower() not in seen and len(loc) > 1:
                seen.add(loc.lower())
                unique_locs.append(loc)
        sorted_locs = sorted(unique_locs, key=is_less_specific)
        combined_location = ", ".join(sorted_locs)
    else:
        combined_location = None
        
    CRIME_PRIORITY = ["assault", "harassment", "theft", "suspicious"]
    crime_type = "other"
    match_count = 0
    text_lower = text.lower()
    for c_type in CRIME_PRIORITY:
        matches = sum(1 for kw in CRIME_KEYWORDS[c_type] if kw in text_lower)
        if matches > match_count:
            match_count = matches
            crime_type = c_type
    confidence = min(match_count / 3.0, 1.0) if crime_type != "other" else 0.0
    return crime_type, combined_location, confidence, is_ner_extracted

def format_nominatim_address(data):
    address = data.get('address', {})
    name = data.get('name', '')
    
    country = address.get('country', '')
    state = address.get('state', '')
    city = address.get('city', address.get('town', address.get('municipality', '')))
    district = address.get('city_district', address.get('district', address.get('county', address.get('state_district', ''))))
    
    locality = None
    for key in ['neighbourhood', 'suburb', 'locality', 'village', 'hamlet', 'quarter', 'subdivision', 'residential', 'commercial', 'industrial', 'railway', 'landmark', 'road']:
        if key in address:
            locality = address[key]
            break
            
    parts = []
    if name:
        parts.append(name)
        
    if locality and locality.lower() != name.lower():
        parts.append(locality)
        
    if district and district.lower() not in [p.lower() for p in parts] and district.lower() != city.lower():
        parts.append(district)
        
    if city and city.lower() not in [p.lower() for p in parts]:
        parts.append(city)
        
    if state and state.lower() not in [p.lower() for p in parts]:
        parts.append(state)
        
    if country and country.lower() not in [p.lower() for p in parts]:
        parts.append(country)
        
    seen = set()
    unique_parts = []
    for p in parts:
        p_strip = p.strip()
        if p_strip.lower() not in seen:
            seen.add(p_strip.lower())
            unique_parts.append(p_strip)
            
    return ", ".join(unique_parts)

def calculate_location_confidence(place_rank, importance, is_ner_extracted):
    if place_rank >= 26:
        base = 0.95
    elif place_rank >= 20:
        base = 0.90
    elif place_rank >= 16:
        base = 0.80
    elif place_rank >= 10:
        base = 0.60
    else:
        base = 0.40
        
    importance_bonus = min(importance * 0.1, 0.05) if importance else 0.0
    ner_bonus = 0.05 if is_ner_extracted else 0.0
    
    return min(base + importance_bonus + ner_bonus, 1.0)

def geocode_location(location_name, is_ner_extracted=True):
    if not location_name:
        return None, None, None, 0.0
    if location_name in GEOCODE_CACHE:
        return GEOCODE_CACHE[location_name]
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={requests.utils.quote(location_name)}, India&format=json&limit=1&addressdetails=1"
        headers = {'User-Agent': 'Jagriti_NLP_Service_App'}
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data:
                lat, lng = float(data[0]['lat']), float(data[0]['lon'])
                place_rank = data[0].get('place_rank', 15)
                importance = data[0].get('importance', 0.3)
                formatted_address = format_nominatim_address(data[0])
                loc_confidence = calculate_location_confidence(place_rank, importance, is_ner_extracted)
                
                res = (lat, lng, formatted_address, loc_confidence)
                GEOCODE_CACHE[location_name] = res
                return res
    except Exception as e:
        print(f"Geocoding error for {location_name}: {e}")
    GEOCODE_CACHE[location_name] = (None, None, None, 0.0)
    return None, None, None, 0.0

def is_within_india(lat, lng):
    return (6.0 <= lat <= 38.0) and (68.0 <= lng <= 98.0)

def translate_hindi_to_english(text):
    if not text.strip():
        return text
    try:
        translated = GoogleTranslator(source='hi', target='en').translate(text[:500])
        return translated
    except Exception as e:
        print(f"Translation Error: {e}")
    return text

def translate_english_to_hindi(text):
    if not text or not text.strip():
        return text
    try:
        translated = GoogleTranslator(source='en', target='hi').translate(text[:500])
        return translated
    except Exception as e:
        print(f"Translation Error: {e}")
    return text

def cleanup_old_data(conn):
    if not conn:
        return
    try:
        cursor = conn.cursor()
        print(f"[{datetime.datetime.now()}] Running database cleanup for records older than 180 days...")
        cursor.execute("""DELETE FROM incident_sources WHERE "createdAt" < NOW() - INTERVAL '180 days'""")
        sources_deleted = cursor.rowcount
        cursor.execute("""DELETE FROM incidents WHERE "createdAt" < NOW() - INTERVAL '180 days'""")
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


def send_pipeline_email(subject, incidents, total, scraped_at, next_run_at):
    try:
        sender_email = os.getenv("EMAIL_USER")
        sender_password = os.getenv("EMAIL_PASS")
        receiver_email = "anantawasthi773@gmail.com"

        def crime_color(ct):
            ct = ct.upper()
            if ct == "ASSAULT":    return "#ef4444", "#450a0a"
            if ct == "THEFT":      return "#f59e0b", "#451a03"
            if ct == "HARASSMENT": return "#8b5cf6", "#2e1065"
            return "#06b6d4", "#083344"

        incident_rows = ""
        for inc in incidents[:8]:
            ct = inc.get("crime_type", "other")
            fg, bg = crime_color(ct)
            loc = inc.get("location", "Unknown")
            title = inc.get("title", "")[:90]
            incident_rows += f"""
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;background:#0f172a;border-radius:10px;border-left:4px solid {fg};">
              <tr><td style="padding:12px 14px;">
                <span style="font-size:10px;font-weight:bold;color:{fg};background:{bg};padding:3px 8px;border-radius:4px;letter-spacing:1px;">{ct.upper()}</span>
                <span style="color:#94a3b8;font-size:11px;margin-left:10px;">📍 {loc}</span>
                <p style="color:#cbd5e1;font-size:12px;margin:8px 0 0;line-height:1.5;">{title}...</p>
              </td></tr>
            </table>"""

        if not incident_rows:
            incident_rows = '<p style="color:#64748b;font-size:13px;padding:12px 0;">No new incidents this run.</p>'

        html = f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:30px 0;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">

    <!-- HEADER -->
    <tr><td style="background:#4f46e5;padding:32px 24px;text-align:center;">
      <div style="font-size:36px;margin-bottom:8px;">🛡️</div>
      <h1 style="color:#ffffff;margin:0 0 6px;font-size:26px;letter-spacing:2px;font-weight:bold;">JAGRITI</h1>
      <p style="color:#c7d2fe;margin:0;font-size:13px;letter-spacing:1px;">SAFETY INTELLIGENCE REPORT</p>
    </td></tr>

    <!-- STATS ROW -->
    <tr><td style="padding:24px 20px 16px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:32%;text-align:center;background:#0f172a;border-radius:12px;padding:18px 8px;border:1px solid #1e3a5f;">
            <div style="font-size:32px;font-weight:bold;color:#6366f1;">{total}</div>
            <div style="color:#64748b;font-size:11px;margin-top:6px;letter-spacing:1px;">NEW INCIDENTS</div>
          </td>
          <td style="width:4%;"></td>
          <td style="width:32%;text-align:center;background:#0f172a;border-radius:12px;padding:18px 8px;border:1px solid #064e3b;">
            <div style="font-size:15px;font-weight:bold;color:#34d399;">{scraped_at.strftime('%I:%M %p')}</div>
            <div style="color:#64748b;font-size:11px;margin-top:6px;letter-spacing:1px;">SCRAPED AT</div>
          </td>
          <td style="width:4%;"></td>
          <td style="width:32%;text-align:center;background:#0f172a;border-radius:12px;padding:18px 8px;border:1px solid #78350f;">
            <div style="font-size:15px;font-weight:bold;color:#f59e0b;">{next_run_at.strftime('%I:%M %p')}</div>
            <div style="color:#64748b;font-size:11px;margin-top:6px;letter-spacing:1px;">NEXT RUN</div>
          </td>
        </tr>
      </table>
    </td></tr>

    <!-- DATE BAR -->
    <tr><td style="padding:0 20px 20px;">
      <div style="background:#0f172a;border-radius:8px;padding:10px 14px;border:1px solid #1e293b;">
        <span style="color:#475569;font-size:12px;">📅 {scraped_at.strftime('%A, %d %B %Y  •  %I:%M:%S %p IST')}</span>
      </div>
    </td></tr>

    <!-- DIVIDER -->
    <tr><td style="padding:0 20px;">
      <div style="border-top:1px solid #334155;"></div>
    </td></tr>

    <!-- INCIDENTS -->
    <tr><td style="padding:20px;">
      <h3 style="color:#94a3b8;font-size:11px;margin:0 0 14px;text-transform:uppercase;letter-spacing:2px;">Latest Incidents Detected</h3>
      {incident_rows}
    </td></tr>

    <!-- DIVIDER -->
    <tr><td style="padding:0 20px;">
      <div style="border-top:1px solid #1e293b;"></div>
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="padding:24px;text-align:center;">
      <a href="https://app.jagriti.online" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:13px;font-weight:bold;letter-spacing:1px;">VIEW LIVE MAP →</a>
      <p style="color:#1e293b;font-size:11px;margin:16px 0 0;">
        <span style="color:#334155;">Jagriti  •  Know Your Surroundings. Stay Safe.</span><br>
        <span style="color:#1e293b;">github.com/Anantvasu200/jagriti</span>
      </p>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>"""

        msg = MIMEMultipart('alternative')
        msg["From"] = sender_email
        msg["To"] = receiver_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html, "html"))

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(sender_email, sender_password)
        server.sendmail(sender_email, receiver_email, msg.as_string())
        server.quit()
        print("✅ Pipeline summary email sent.")
    except Exception as e:
        print(f"❌ Email sending failed: {e}")


def process_feeds():
    print(f"[{datetime.datetime.now()}] Starting NLP Pipeline for RSS Feeds...")

    conn = get_db_connection()
    if not conn:
        print("Warning: Failed to connect to database. Running in dry-run mode.")
        gazetteer = None
    else:
        cleanup_old_data(conn)
        
        # Build and load gazetteer
        try:
            gazetteer = SubLocalityGazetteer(conn)
            gazetteer.load_or_build_gazetteer()
        except Exception as e:
            print(f"Error seeding gazetteer: {e}")
            gazetteer = None
            
        cursor = conn.cursor()

    saved_incidents = []

    for feed in RSS_FEEDS:
        print(f"\n--- Processing feed: {feed['source']} ---")
        parsed_feed = feedparser.parse(feed['url'])

        for entry in parsed_feed.entries:
            orig_title = entry.title
            orig_desc = clean_html(entry.get('description', ''))

            if conn:
                cursor.execute("SELECT id FROM incident_sources WHERE \"sourceUrl\" = %s", (entry.link,))
                if cursor.fetchone():
                    continue

            title = orig_title
            description = orig_desc
            title_hi = orig_title
            description_hi = orig_desc

            if feed.get("language") == "hi":
                title = translate_hindi_to_english(orig_title)
                description = translate_hindi_to_english(orig_desc)
                title_hi = orig_title
                description_hi = orig_desc
            else:
                title_hi = translate_english_to_hindi(orig_title)
                description_hi = translate_english_to_hindi(orig_desc)

            full_text = f"{title}. {description}"
            crime_type, extracted_location, confidence, is_ner_extracted = extract_crime_info(full_text)

            if crime_type != "other" and extracted_location:
                # 1. Determine city
                city = determine_city_from_text(full_text)
                
                # 2. Fuzzy match against sub-locality gazetteer
                sub_locality = None
                gazetteer_match = None
                if conn and gazetteer:
                    try:
                        gazetteer_match = gazetteer.fuzzy_match_sublocality(extracted_location, city)
                    except Exception as e:
                        print(f"Gazetteer matching error: {e}")
                
                # If matched, update the query name for geocoding and boost confidence
                geocoding_query = extracted_location
                location_confidence_boost = 0.0
                if gazetteer_match:
                    sub_locality = gazetteer_match['matched_name']
                    geocoding_query = f"{sub_locality}, {city}"
                    location_confidence_boost = 0.15
                    print(f"   Gazetteer Match: '{extracted_location}' -> '{sub_locality}' in {city} (boost: +0.15)")
                
                # 3. Geocode location
                lat, lng, formatted_address, loc_confidence = geocode_location(geocoding_query, is_ner_extracted)
                
                loc_confidence = min(loc_confidence + location_confidence_boost, 1.0)

                if lat and lng:
                    if not is_within_india(lat, lng):
                        print(f"⚠️ Skipped: Location '{extracted_location}' ({lat}, {lng}) is outside India.")
                        continue

                    print(f" Geocoded: {extracted_location} -> ({lat}, {lng}) [{formatted_address}]")

                    # Default filtered coordinates to raw
                    filtered_lat = lat
                    filtered_lng = lng
                    is_kalman_filtered = False
                    kalman_state = None

                    if conn:
                        # 4. Fetch previous incidents for this location to apply Kalman Filter
                        try:
                            # Use sub_locality or geocoded address as key
                            match_key = sub_locality if sub_locality else formatted_address
                            
                            cursor.execute("""
                                SELECT ST_Y(location::geometry) as lat, ST_X(location::geometry) as lng, kalman_state 
                                FROM incidents 
                                WHERE sub_locality = %s OR city = %s 
                                ORDER BY "createdAt" DESC 
                                LIMIT 5
                            """, (match_key, match_key))
                            previous = []
                            for row in cursor.fetchall():
                                previous.append({
                                    'lat': row[0],
                                    'lng': row[1],
                                    'kalman_state': row[2]
                                })
                            
                            if previous:
                                # Apply Kalman filter
                                kf_res = denoise_incident_locations(match_key, lat, lng, previous)
                                filtered_lat = kf_res['filtered_lat']
                                filtered_lng = kf_res['filtered_lon']
                                is_kalman_filtered = kf_res['is_filtered']
                                kalman_state = kf_res['kalman_state']
                                if is_kalman_filtered:
                                    print(f"   Kalman filter applied: ({lat:.5f}, {lng:.5f}) -> ({filtered_lat:.5f}, {filtered_lng:.5f})")
                        except Exception as e:
                            print(f"Kalman filter error: {e}")

                        incident_id = str(uuid.uuid4())
                        current_time = datetime.datetime.now()
                        combined_confidence = confidence * loc_confidence
                        is_verified = combined_confidence >= 0.5
                        try:
                            # Insert into incidents with new columns
                            cursor.execute("""
                                INSERT INTO incidents (id, title, description, title_hi, description_hi, type, date, location, city, "confidence_score", "isVerified", "createdAt", "updatedAt", sub_locality, location_confidence, is_kalman_filtered, kalman_state)
                                VALUES (%s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            """, (
                                incident_id, title[:255], description, title_hi[:255], description_hi, crime_type, current_time,
                                filtered_lng, filtered_lat, formatted_address[:255], combined_confidence, is_verified, current_time, current_time,
                                sub_locality, loc_confidence, is_kalman_filtered, json.dumps(kalman_state) if kalman_state else None
                            ))

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
                                "location": formatted_address
                            })

                            safe_title = title[:80].encode('ascii', 'replace').decode('ascii')
                            print(f"\n✅ NEW INCIDENT RECEIVED & SAVED!")
                            print(f"   Source   : {feed['source']}")
                            print(f"   Crime    : [{crime_type.upper()}] in {formatted_address}")
                            print(f"   Headline : {safe_title}...")
                            print(f"   Status   : Successfully committed to PostgreSQL Database\n")

                            time.sleep(1.5)

                        except Exception as e:
                            conn.rollback()
                            print(f"DB Insert Error: {e}")

    if conn:
        cursor.close()
        conn.close()

    now = datetime.datetime.now() + datetime.timedelta(hours=5, minutes=30)
    next_run = now + datetime.timedelta(hours=1)

    print(f"\n[{now}] Pipeline finished. Added {len(saved_incidents)} new real incidents to the map.")

    send_pipeline_email(
        subject=f"🛡️ Jagriti Pipeline — {len(saved_incidents)} new incidents detected",
        incidents=saved_incidents,
        total=len(saved_incidents),
        scraped_at=now,
        next_run_at=next_run
    )

    return saved_incidents


if __name__ == "__main__":
    process_feeds()
