import psycopg2
import json
import re
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

# Curated key sub-localities in top Indian metros
METRO_GAZETTEER = {
    "Delhi": [
        {"name": "Lajpat Nagar", "admin_level": 8, "lat": 28.5685, "lon": 77.2410},
        {"name": "Connaught Place", "admin_level": 8, "lat": 28.6304, "lon": 77.2177},
        {"name": "Dwarka", "admin_level": 8, "lat": 28.5889, "lon": 77.0573},
        {"name": "Saket", "admin_level": 8, "lat": 28.5244, "lon": 77.2066},
        {"name": "Karol Bagh", "admin_level": 8, "lat": 28.6517, "lon": 77.1907},
        {"name": "Hauz Khas", "admin_level": 8, "lat": 28.5494, "lon": 77.2001},
        {"name": "Rohini", "admin_level": 8, "lat": 28.7159, "lon": 77.1126},
        {"name": "Vasant Kunj", "admin_level": 8, "lat": 28.5293, "lon": 77.1516},
        {"name": "Greater Kailash", "admin_level": 8, "lat": 28.5482, "lon": 77.2347},
        {"name": "Rajouri Garden", "admin_level": 8, "lat": 28.6415, "lon": 77.1218},
        {"name": "Mayur Vihar", "admin_level": 8, "lat": 28.6041, "lon": 77.2911},
        {"name": "Chanakyapuri", "admin_level": 8, "lat": 28.5992, "lon": 77.1825},
        {"name": "Janakpuri", "admin_level": 8, "lat": 28.6219, "lon": 77.0878},
        {"name": "Pitampura", "admin_level": 8, "lat": 28.6989, "lon": 77.1384},
        {"name": "Paschim Vihar", "admin_level": 8, "lat": 28.6692, "lon": 77.0934},
        {"name": "Shalimar Bagh", "admin_level": 8, "lat": 28.7166, "lon": 77.1561},
        {"name": "Mangolpuri", "admin_level": 8, "lat": 28.6837, "lon": 77.0915},
        {"name": "Sultanpuri", "admin_level": 8, "lat": 28.6974, "lon": 77.0754},
        {"name": "Uttam Nagar", "admin_level": 8, "lat": 28.6215, "lon": 77.0583},
        {"name": "Najafgarh", "admin_level": 8, "lat": 28.6092, "lon": 76.9798},
        {"name": "Narela", "admin_level": 8, "lat": 28.8527, "lon": 77.0927},
        {"name": "Bawana", "admin_level": 8, "lat": 28.7963, "lon": 77.0396},
        {"name": "Alipur", "admin_level": 8, "lat": 28.7974, "lon": 77.1332},
        {"name": "Burari", "admin_level": 8, "lat": 28.7540, "lon": 77.1996},
        {"name": "Civil Lines", "admin_level": 8, "lat": 28.6814, "lon": 77.2227},
        {"name": "Model Town", "admin_level": 8, "lat": 28.7028, "lon": 77.1937},
        {"name": "Mukherjee Nagar", "admin_level": 8, "lat": 28.7093, "lon": 77.2155},
        {"name": "Kamla Nagar", "admin_level": 8, "lat": 28.6801, "lon": 77.2025},
        {"name": "Kashmere Gate", "admin_level": 8, "lat": 28.6676, "lon": 77.2281},
        {"name": "Chandni Chowk", "admin_level": 8, "lat": 28.6506, "lon": 77.2303},
        {"name": "Paharganj", "admin_level": 8, "lat": 28.6440, "lon": 77.2140},
        {"name": "Daryaganj", "admin_level": 8, "lat": 28.6467, "lon": 77.2410},
        {"name": "Shahdara", "admin_level": 8, "lat": 28.6738, "lon": 77.2917},
        {"name": "Seelampur", "admin_level": 8, "lat": 28.6644, "lon": 77.2674},
        {"name": "Laxmi Nagar", "admin_level": 8, "lat": 28.6310, "lon": 77.2776},
        {"name": "Preet Vihar", "admin_level": 8, "lat": 28.6409, "lon": 77.2957},
        {"name": "Anand Vihar", "admin_level": 8, "lat": 28.6474, "lon": 77.3159},
        {"name": "Okhla", "admin_level": 8, "lat": 28.5355, "lon": 77.2732},
        {"name": "Kalkaji", "admin_level": 8, "lat": 28.5393, "lon": 77.2544},
        {"name": "Nehru Place", "admin_level": 8, "lat": 28.5492, "lon": 77.2530},
        {"name": "Malviya Nagar", "admin_level": 8, "lat": 28.5325, "lon": 77.2104},
        {"name": "Mehrauli", "admin_level": 8, "lat": 28.5177, "lon": 77.1856},
        {"name": "Sangam Vihar", "admin_level": 8, "lat": 28.5020, "lon": 77.2472},
        {"name": "Sarita Vihar", "admin_level": 8, "lat": 28.5283, "lon": 77.2952},
        {"name": "Badarpur", "admin_level": 8, "lat": 28.5056, "lon": 77.3039},
        {"name": "Defence Colony", "admin_level": 8, "lat": 28.5726, "lon": 77.2323},
        {"name": "Patel Nagar", "admin_level": 8, "lat": 28.6508, "lon": 77.1668},
        {"name": "Punjabi Bagh", "admin_level": 8, "lat": 28.6690, "lon": 77.1325},
        {"name": "Tilak Nagar", "admin_level": 8, "lat": 28.6366, "lon": 77.0963},
        {"name": "Vikaspuri", "admin_level": 8, "lat": 28.6377, "lon": 77.0722},
        {"name": "Noida Sector 18", "admin_level": 8, "lat": 28.5708, "lon": 77.3261},
        {"name": "Noida Sector 62", "admin_level": 8, "lat": 28.6219, "lon": 77.3639},
        {"name": "Gurugram Cyber City", "admin_level": 8, "lat": 28.4950, "lon": 77.0895},
        {"name": "Gurugram Sector 29", "admin_level": 8, "lat": 28.4682, "lon": 77.0632}
    ],
    "Mumbai": [
        {"name": "Bandra", "admin_level": 8, "lat": 19.0596, "lon": 72.8295},
        {"name": "Andheri", "admin_level": 8, "lat": 19.1136, "lon": 72.8697},
        {"name": "Colaba", "admin_level": 8, "lat": 18.9067, "lon": 72.8147},
        {"name": "Juhu", "admin_level": 8, "lat": 19.1018, "lon": 72.8284},
        {"name": "Dadar", "admin_level": 8, "lat": 19.0178, "lon": 72.8478},
        {"name": "Borivali", "admin_level": 8, "lat": 19.2307, "lon": 72.8567},
        {"name": "Ghatkopar", "admin_level": 8, "lat": 19.0864, "lon": 72.9080},
        {"name": "Worli", "admin_level": 8, "lat": 19.0163, "lon": 72.8168},
        {"name": "Kurla", "admin_level": 8, "lat": 19.0607, "lon": 72.8826},
        {"name": "Powai", "admin_level": 8, "lat": 19.1176, "lon": 72.9060},
        {"name": "Kandivali", "admin_level": 8, "lat": 19.2062, "lon": 72.8526},
        {"name": "Malad", "admin_level": 8, "lat": 19.1860, "lon": 72.8485},
        {"name": "Goregaon", "admin_level": 8, "lat": 19.1663, "lon": 72.8526},
        {"name": "Santacruz", "admin_level": 8, "lat": 19.0805, "lon": 72.8407},
        {"name": "Chembur", "admin_level": 8, "lat": 19.0522, "lon": 72.8994},
        {"name": "Mulund", "admin_level": 8, "lat": 19.1726, "lon": 72.9565},
        {"name": "Thane", "admin_level": 8, "lat": 19.2183, "lon": 72.9781},
        {"name": "Vashi", "admin_level": 8, "lat": 19.0771, "lon": 72.9986}
    ],
    "Bengaluru": [
        {"name": "Indiranagar", "admin_level": 8, "lat": 12.9719, "lon": 77.6412},
        {"name": "Koramangala", "admin_level": 8, "lat": 12.9352, "lon": 77.6244},
        {"name": "Jayanagar", "admin_level": 8, "lat": 12.9308, "lon": 77.5838},
        {"name": "Whitefield", "admin_level": 8, "lat": 12.9698, "lon": 77.7499},
        {"name": "HSR Layout", "admin_level": 8, "lat": 12.9101, "lon": 77.6450},
        {"name": "Malleswaram", "admin_level": 8, "lat": 12.9961, "lon": 77.5713},
        {"name": "Hebbal", "admin_level": 8, "lat": 13.0358, "lon": 77.5970},
        {"name": "Electronic City", "admin_level": 8, "lat": 12.8452, "lon": 77.6602},
        {"name": "BTM Layout", "admin_level": 8, "lat": 12.9166, "lon": 77.6101},
        {"name": "Marathahalli", "admin_level": 8, "lat": 12.9591, "lon": 77.6974},
        {"name": "Rajajinagar", "admin_level": 8, "lat": 12.9982, "lon": 77.5530},
        {"name": "Yelahanka", "admin_level": 8, "lat": 13.1007, "lon": 77.5963}
    ],
    "Kolkata": [
        {"name": "Salt Lake", "admin_level": 8, "lat": 22.5804, "lon": 88.4172},
        {"name": "Gariahat", "admin_level": 8, "lat": 22.5192, "lon": 88.3663},
        {"name": "New Town", "admin_level": 8, "lat": 22.5726, "lon": 88.4798},
        {"name": "Park Street", "admin_level": 8, "lat": 22.5529, "lon": 88.3524},
        {"name": "Alipore", "admin_level": 8, "lat": 22.5317, "lon": 88.3292},
        {"name": "Howrah", "admin_level": 8, "lat": 22.5958, "lon": 88.2636}
    ],
    "Chennai": [
        {"name": "Adyar", "admin_level": 8, "lat": 13.0033, "lon": 80.2550},
        {"name": "T Nagar", "admin_level": 8, "lat": 13.0418, "lon": 80.2341},
        {"name": "Mylapore", "admin_level": 8, "lat": 13.0330, "lon": 80.2690},
        {"name": "Velachery", "admin_level": 8, "lat": 12.9815, "lon": 80.2196},
        {"name": "Anna Nagar", "admin_level": 8, "lat": 13.0850, "lon": 80.2101},
        {"name": "Nungambakkam", "admin_level": 8, "lat": 13.0606, "lon": 80.2407}
    ],
    "Hyderabad": [
        {"name": "Banjara Hills", "admin_level": 8, "lat": 17.4156, "lon": 78.4357},
        {"name": "Jubilee Hills", "admin_level": 8, "lat": 17.4319, "lon": 78.4073},
        {"name": "Hitec City", "admin_level": 8, "lat": 17.4435, "lon": 78.3772},
        {"name": "Gachibowli", "admin_level": 8, "lat": 17.4401, "lon": 78.3489},
        {"name": "Madhapur", "admin_level": 8, "lat": 17.4483, "lon": 78.3915},
        {"name": "Kukatpally", "admin_level": 8, "lat": 17.4849, "lon": 78.4138},
        {"name": "Secunderabad", "admin_level": 8, "lat": 17.4399, "lon": 78.4983}
    ],
    "Pune": [
        {"name": "Kothrud", "admin_level": 8, "lat": 18.5074, "lon": 73.8077},
        {"name": "Hinjewadi", "admin_level": 8, "lat": 18.5913, "lon": 73.7389},
        {"name": "Viman Nagar", "admin_level": 8, "lat": 18.5679, "lon": 73.9143},
        {"name": "Koregaon Park", "admin_level": 8, "lat": 18.5362, "lon": 73.8940},
        {"name": "Wakad", "admin_level": 8, "lat": 18.5987, "lon": 73.7663},
        {"name": "Baner", "admin_level": 8, "lat": 18.5597, "lon": 73.7799}
    ],
    "Lucknow": [
        {"name": "Hazratganj", "admin_level": 8, "lat": 26.8467, "lon": 80.9462},
        {"name": "Gomti Nagar", "admin_level": 8, "lat": 26.8524, "lon": 80.9992},
        {"name": "Alambagh", "admin_level": 8, "lat": 26.8122, "lon": 80.9023},
        {"name": "Indira Nagar", "admin_level": 8, "lat": 26.8833, "lon": 80.9933},
        {"name": "Aminabad", "admin_level": 8, "lat": 26.8444, "lon": 80.9250}
    ]
}

# Pre-compile flattened lookup
FLAT_LOCALITIES = {}
for city_name, loc_list in METRO_GAZETTEER.items():
    for loc in loc_list:
        FLAT_LOCALITIES[loc["name"].lower()] = (loc["name"], city_name, loc["lat"], loc["lon"])


class SubLocalityGazetteer:
    """Build and manage sub-locality reference data."""
    
    def __init__(self, db_conn):
        self.conn = db_conn
    
    def load_or_build_gazetteer(self):
        """
        Load sub-localities for top metros into PostgreSQL sub_localities table.
        """
        cursor = self.conn.cursor()
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS sub_localities (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            city VARCHAR(100) NOT NULL,
            geom GEOMETRY(POINT, 4326),
            admin_level INT,
            bounds JSONB,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, city)
        );
        """)
        
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_localities_geom ON sub_localities USING GIST(geom);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_localities_city ON sub_localities(city);")
        
        insert_query = """
        INSERT INTO sub_localities (name, city, geom, admin_level, bounds)
        VALUES (%s, %s, ST_SetSRID(ST_Point(%s, %s), 4326), %s, %s)
        ON CONFLICT (name, city) DO NOTHING;
        """
        
        for city, localities in METRO_GAZETTEER.items():
            for loc in localities:
                bounds_data = {
                    "center_lat": loc['lat'],
                    "center_lon": loc['lon']
                }
                cursor.execute(insert_query, (
                    loc['name'],
                    city,
                    loc['lon'],
                    loc['lat'],
                    loc['admin_level'],
                    json.dumps(bounds_data)
                ))
        
        self.conn.commit()
        cursor.close()
        print(f"[Gazetteer] Loaded {len(FLAT_LOCALITIES)} sub-localities across metros successfully.")
    
    def fuzzy_match_sublocality(self, text, city):
        """
        Fuzzy match extracted location text against gazetteer.
        """
        if not text:
            return None
            
        # First check fast in-memory gazetteer
        text_lower = text.lower()
        for loc_key, (loc_name, loc_city, lat, lon) in FLAT_LOCALITIES.items():
            if re.search(r'\b' + re.escape(loc_key) + r'\b', text_lower):
                return {
                    "matched_name": loc_name,
                    "city": loc_city,
                    "lat": lat,
                    "lon": lon,
                    "confidence": 0.95,
                    "source": "gazetteer_memory"
                }

        if not self.conn or not city:
            return None
            
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                "SELECT name FROM sub_localities WHERE city = %s",
                (city,)
            )
            gazetteer_names = [row[0] for row in cursor.fetchall()]
            cursor.close()
            
            if not gazetteer_names:
                return None
            
            match = process.extractOne(text, gazetteer_names, scorer=fuzz.token_set_ratio)
            if match and match[1] >= 75:
                return {
                    "matched_name": match[0],
                    "city": city,
                    "confidence": match[1] / 100.0,
                    "source": "gazetteer_db"
                }
        except Exception:
            pass
        return None

    @staticmethod
    def extract_location_hierarchy(text, default_city=None):
        """
        Extract detailed Indian location hierarchy:
        (gali/sector/pocket/block, sub-locality, landmark/station, city).
        """
        if not text:
            return None

        # 1. Match sub-locality in text
        matched_sublocality = None
        detected_city = default_city

        for loc_key, (loc_name, loc_city, lat, lon) in FLAT_LOCALITIES.items():
            if re.search(r'\b' + re.escape(loc_key) + r'\b', text, re.IGNORECASE):
                matched_sublocality = loc_name
                detected_city = loc_city
                break

        # 2. Extract specific address components
        sec_match = re.search(r'\b(?:Sector|Sec\.?)[-\s]*\d+[A-Za-z]?\b', text, re.IGNORECASE)
        pkt_match = re.search(r'\b(?:Pocket|Pkt\.?)[-\s]*\d+[A-Za-z]?\b', text, re.IGNORECASE)
        blk_match = re.search(r'\b(?:Block)[-\s]*[A-Za-z0-9]+\b', text, re.IGNORECASE)
        phs_match = re.search(r'\b(?:Phase)[-\s]*[IVX0-9]+\b', text, re.IGNORECASE)
        gali_match = re.search(r'\b(?:Gali\s+(?:No\.?\s*)?\d+|Street\s+(?:No\.?\s*)?\d+)\b', text, re.IGNORECASE)

        # 3. Extract transport / landmark / thana components
        metro_match = re.search(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+Metro\s+Station\b', text, re.IGNORECASE)
        thana_match = re.search(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Thana|Police\s+Station)\b', text, re.IGNORECASE)
        mkt_match = re.search(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:Market|Chowk|Flyover|Hospital)\b', text, re.IGNORECASE)

        specific_parts = []
        if gali_match: specific_parts.append(gali_match.group(0))
        if blk_match: specific_parts.append(blk_match.group(0))
        if pkt_match: specific_parts.append(pkt_match.group(0))
        if sec_match: specific_parts.append(sec_match.group(0))
        if phs_match: specific_parts.append(phs_match.group(0))
        if matched_sublocality: specific_parts.append(matched_sublocality)
        if metro_match: specific_parts.append(metro_match.group(0))
        elif thana_match: specific_parts.append(thana_match.group(0))
        elif mkt_match and not matched_sublocality: specific_parts.append(mkt_match.group(0))

        # Deduplicate parts while maintaining order
        clean_parts = []
        for p in specific_parts:
            if p.lower() not in [x.lower() for x in clean_parts]:
                clean_parts.append(p)

        city_for_query = detected_city or "Delhi"

        if clean_parts:
            primary_query = ", ".join(clean_parts) + f", {city_for_query}, India"
            fallback_query = (matched_sublocality or clean_parts[-1]) + f", {city_for_query}, India"
        else:
            primary_query = f"{city_for_query}, India"
            fallback_query = f"{city_for_query}, India"

        return {
            "sub_locality": matched_sublocality or (clean_parts[0] if clean_parts else None),
            "specific_detail": ", ".join(clean_parts) if clean_parts else None,
            "city": detected_city,
            "primary_query": primary_query,
            "fallback_query": fallback_query,
            "is_specific": len(clean_parts) > 0
        }
