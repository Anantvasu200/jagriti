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
from deep_translator import GoogleTranslator
from database import get_db_connection

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

def extract_crime_info(text):
    doc = nlp(text)
    locations = [ent.text for ent in doc.ents if ent.label_ in ['GPE', 'LOC', 'FAC']]
    primary_location = locations[0] if locations else None
    if not primary_location:
        for city in INDIA_CITIES:
            if re.search(r'\b' + re.escape(city) + r'\b', text, re.IGNORECASE):
                primary_location = city
                break
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
    return crime_type, primary_location, confidence

def geocode_location(location_name):
    if not location_name:
        return None, None
    if location_name in GEOCODE_CACHE:
        return GEOCODE_CACHE[location_name]
    try:
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
    GEOCODE_CACHE[location_name] = (None, None)
    return None, None

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
    else:
        cleanup_old_data(conn)
        cursor = conn.cursor()

    saved_incidents = []

    for feed in RSS_FEEDS:
        print(f"\n--- Processing feed: {feed['source']} ---")
        parsed_feed = feedparser.parse(feed['url'])

        for entry in parsed_feed.entries:
            title = entry.title
            description = clean_html(entry.get('description', ''))

            if conn:
                cursor.execute("SELECT id FROM incident_sources WHERE \"sourceUrl\" = %s", (entry.link,))
                if cursor.fetchone():
                    continue

            if feed.get("language") == "hi":
                title = translate_hindi_to_english(title)
                description = translate_hindi_to_english(description)

            full_text = f"{title}. {description}"
            crime_type, extracted_location, confidence = extract_crime_info(full_text)

            if crime_type != "other" and extracted_location:
                lat, lng = geocode_location(extracted_location)

                if lat and lng:
                    if not is_within_india(lat, lng):
                        print(f"⚠️ Skipped: Location '{extracted_location}' ({lat}, {lng}) is outside India.")
                        continue

                    print(f" Geocoded: {extracted_location} -> ({lat}, {lng})")

                    jitter_lat = lat + random.uniform(-0.05, 0.05)
                    jitter_lng = lng + random.uniform(-0.05, 0.05)

                    if conn:
                        incident_id = str(uuid.uuid4())
                        current_time = datetime.datetime.now()

                        try:
                            cursor.execute("""
                                INSERT INTO incidents (id, title, description, type, date, location, city, "confidence_score", "createdAt", "updatedAt")
                                VALUES (%s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s, %s, %s)
                            """, (
                                incident_id, title[:255], description, crime_type, current_time,
                                jitter_lng, jitter_lat, extracted_location[:255], confidence, current_time, current_time
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
                                "location": extracted_location
                            })

                            safe_title = title[:80].encode('ascii', 'replace').decode('ascii')
                            print(f"\n✅ NEW INCIDENT RECEIVED & SAVED!")
                            print(f"   Source   : {feed['source']}")
                            print(f"   Crime    : [{crime_type.upper()}] in {extracted_location}")
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
