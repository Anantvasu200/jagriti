import psycopg2
import json
from fuzzywuzzy import fuzz
from fuzzywuzzy import process

class SubLocalityGazetteer:
    """Build and manage sub-locality reference data."""
    
    def __init__(self, db_conn):
        self.conn = db_conn
    
    def load_or_build_gazetteer(self):
        """
        Load sub-localities for top metros.
        """
        # Curated key sub-localities in top Indian metros (Delhi, Mumbai, Bengaluru, Chennai, Kolkata)
        gazetteer_data = {
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
                {"name": "Noida Sector 62", "admin_level": 8, "lat": 28.6219, "lon": 77.3639},
                {"name": "Gurugram Phase 3", "admin_level": 8, "lat": 28.4908, "lon": 77.0896}
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
                {"name": "Powai", "admin_level": 8, "lat": 19.1176, "lon": 72.9060}
            ],
            "Bengaluru": [
                {"name": "Indiranagar", "admin_level": 8, "lat": 12.9719, "lon": 77.6412},
                {"name": "Koramangala", "admin_level": 8, "lat": 12.9352, "lon": 77.6244},
                {"name": "Jayanagar", "admin_level": 8, "lat": 12.9308, "lon": 77.5838},
                {"name": "Whitefield", "admin_level": 8, "lat": 12.9698, "lon": 77.7499},
                {"name": "HSR Layout", "admin_level": 8, "lat": 12.9101, "lon": 77.6450},
                {"name": "Malleswaram", "admin_level": 8, "lat": 12.9961, "lon": 77.5713},
                {"name": "Hebbal", "admin_level": 8, "lat": 13.0358, "lon": 77.5970},
                {"name": "Electronic City", "admin_level": 8, "lat": 12.8452, "lon": 77.6602}
            ],
            "Chennai": [
                {"name": "Adyar", "admin_level": 8, "lat": 13.0033, "lon": 80.2550},
                {"name": "T Nagar", "admin_level": 8, "lat": 13.0418, "lon": 80.2341},
                {"name": "Mylapore", "admin_level": 8, "lat": 13.0330, "lon": 80.2690},
                {"name": "Velachery", "admin_level": 8, "lat": 12.9815, "lon": 80.2196},
                {"name": "Anna Nagar", "admin_level": 8, "lat": 13.0850, "lon": 80.2101},
                {"name": "Nungambakkam", "admin_level": 8, "lat": 13.0606, "lon": 80.2407}
            ],
            "Kolkata": [
                {"name": "Salt Lake", "admin_level": 8, "lat": 22.5804, "lon": 88.4172},
                {"name": "Gariahat", "admin_level": 8, "lat": 22.5192, "lon": 88.3663},
                {"name": "New Town", "admin_level": 8, "lat": 22.5726, "lon": 88.4798},
                {"name": "Park Street", "admin_level": 8, "lat": 22.5529, "lon": 88.3524},
                {"name": "Alipore", "admin_level": 8, "lat": 22.5317, "lon": 88.3292},
                {"name": "Howrah", "admin_level": 8, "lat": 22.5958, "lon": 88.2636}
            ]
        }
        
        cursor = self.conn.cursor()
        
        # Ensure table exists
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
        
        # Create spatial index if not exists
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_localities_geom ON sub_localities USING GIST(geom);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sub_localities_city ON sub_localities(city);")
        
        insert_query = """
        INSERT INTO sub_localities (name, city, geom, admin_level, bounds)
        VALUES (%s, %s, ST_SetSRID(ST_Point(%s, %s), 4326), %s, %s)
        ON CONFLICT (name, city) DO NOTHING;
        """
        
        for city, localities in gazetteer_data.items():
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
        print(f"[Gazetteer] Loaded sub-localities successfully.")
    
    def fuzzy_match_sublocality(self, text, city):
        """
        Fuzzy match extracted location text against gazetteer.
        """
        if not text or not city:
            return None
            
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
        
        if match and match[1] >= 75:  # confidence threshold
            return {
                "matched_name": match[0],
                "confidence": match[1] / 100.0,
                "source": "gazetteer"
            }
        return None
