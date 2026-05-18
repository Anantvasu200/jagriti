# ----------------------------------------------------------------------
# ncrb_importer_all.py
# Unified importer for all NCRBâ€'related public datasets.
# ----------------------------------------------------------------------
import uuid
import datetime
import random
import time
import json
import requests
from database import get_db_connection

# --------------------------------------------------------------
# Configuration
# --------------------------------------------------------------
API_KEY = "579b464db66ec23bdd0000018d3ae3a14e6344d57e0eb2cfe1822a77"

# List of datasets to ingest.
#   name   â€“ humanâ€'readable title (used for incident.title)
#   url    â€“ Data.gov.in resource URL (no apiâ€'key/format params)
#   type   â€“ Jagriti incident type (must match ENUM in DB)
#   level  â€“ "state" or "city" â€“ determines geocoding granularity
#   scale  â€“ how many real crimes each pin represents
DATASETS = [
    {
        "name": "IPC Crime 2020-22 (State Level)",
        "local_file": "ncrb_data/ipc_2020_22.json",
        "type": "other",
        "level": "state",
        "scale": 1000,
        "count_field": "_2022",        # total IPC crimes in 2022
    },
    {
        "name": "Women & Girls Victims of Rape (2022)",
        "local_file": "ncrb_data/rape_2022.json",
        "type": "assault",
        "level": "state",
        "scale": 50,                   # finer scale - rape cases are lower count
        "count_field": "cases_reported___col__3_",
    },
    {
        "name": "Child Victims of Kidnapping & Abduction (2022)",
        "local_file": "ncrb_data/kidnapping_2022.json",
        "type": "suspicious",
        "level": "city",
        "scale": 10,                   # city level - fine scale
        "count_field": "total_victims__child___adult____t___col__42_",
    },
    {
        "name": "Murder Cases in Metropolitan Cities (2020-2022)",
        "local_file": "ncrb_data/murder_2020_22.json",
        "type": "assault",
        "level": "city",
        "scale": 1,                    # murder counts are small - 1 pin per case
        "count_field": "_2022",
    },
    {
        "name": "Violent Crimes Head-wise (2022)",
        "local_file": "ncrb_data/violent_crimes_2022.json",
        "type": "assault",
        "level": "state",
        "scale": 500,
        "count_field": "total_violent_crimes__cols_3_to_17_",
    },
    {
        "name": "Motives of Murder (2022)",
        "local_file": "ncrb_data/murder_motives_2022.json",
        "type": "assault",
        "level": "state",
        "scale": 10,
        "count_field": "total_motives_of_murder___col__29_",
    },
]

# --------------------------------------------------------------
# Helper: Simple inâ€'memory cache for geocoding results
# --------------------------------------------------------------
_geocode_cache = {}

def geocode_location(name: str):
    """Return (lat, lng) for a state or city using Nominatim."""
    if not name:
        return None, None
    if name in _geocode_cache:
        return _geocode_cache[name]

    try:
        url = f"https://nominatim.openstreetmap.org/search?q={name}, India&format=json&limit=1"
        headers = {"User-Agent": "Jagriti_NCRB_Importer"}
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            if data:
                lat, lng = float(data[0]["lat"]), float(data[0]["lon"])
                _geocode_cache[name] = (lat, lng)
                return lat, lng
    except Exception as e:
        print(f"Geocode error for {name}: {e}")

    return None, None

# --------------------------------------------------------------
# Helper: Robust fetch with retries for 502/503 errors
# --------------------------------------------------------------
def fetch_json(url: str, retries: int = 4, backoff: float = 5.0):
    """GET JSON from Data.gov.in with simple exponential back-off.
    NOTE: data.gov.in is a slow government server â€” responses often take 30-40s.
    We use a 60-second timeout to avoid killing valid in-flight requests.
    """
    for attempt in range(1, retries + 1):
        try:
            print(f"  Attempt {attempt}/{retries} (timeout=60s)...")
            resp = requests.get(url, timeout=60)   # 60s â€” data.gov.in is slow
            if resp.status_code == 200:
                return resp.json()
            if resp.status_code in (502, 503, 504):
                wait = backoff * attempt
                print(f"  Received {resp.status_code} â€“ waiting {wait}s before retry...")
                time.sleep(wait)
                continue
            print(f"  Unexpected status {resp.status_code} â€“ skipping.")
            return None
        except Exception as e:
            wait = backoff * attempt
            print(f"  Request exception ({e}) â€“ waiting {wait}s before retry...")
            time.sleep(wait)
    return None

# --------------------------------------------------------------
# Core import logic â€“ one dataset at a time
# --------------------------------------------------------------
def import_dataset(ds):
    print(f"\nProcessing {ds['name']} from local file...")
    try:
        with open(ds['local_file'], 'r', encoding='utf-8') as f:
            payload = json.load(f)
    except FileNotFoundError:
        print(f"  File not found: {ds['local_file']} -- skipping.")
        return 0
    except Exception as e:
        print(f"  Error reading file: {e} -- skipping.")
        return 0

    records = payload.get('records', [])
    if not records:
        print("  Empty record set -- skipping.")
        return 0
    print(f"  Loaded {len(records)} records from file.")

    conn = get_db_connection()
    if not conn:
        print("  â - DB connection failed â€“ aborting.")
        return 0
    cur = conn.cursor()
    inserted = 0

    for row in records:
        # --------------------------------------------------
        # Determine location name based on dataset level
        # --------------------------------------------------
        location_name = None
        if ds["level"] == "state":
            location_name = row.get("state_ut") or row.get("State") or row.get("state")
        else:  # city level
            location_name = row.get("city_name") or row.get("city") or row.get("District")

        if not location_name:
            continue

        # --------------------------------------------------
        # Extract the numeric count using the dataset-specific field
        # --------------------------------------------------
        count_val = None
        count_field = ds.get('count_field')
        if count_field and count_field in row:
            try:
                count_val = int(row[count_field])
            except Exception:
                pass

        # Fallback: try common generic keys
        if count_val is None:
            for key in ["_2022", "2022", "total", "count", "victims", "value"]:
                if key in row and row[key]:
                    try:
                        count_val = int(row[key])
                        break
                    except Exception:
                        pass

        # Last resort: sum all year columns (_YYYY pattern)
        if count_val is None:
            sum_keys = [k for k in row if k.startswith("_") and k[1:].isdigit()]
            try:
                count_val = sum(int(row[k]) for k in sum_keys if row[k])
            except Exception:
                count_val = None

        if not count_val or count_val <= 0:
            continue

        # --------------------------------------------------
        # Scale down to a manageable number of pins
        # --------------------------------------------------
        scaled = max(1, int(count_val / ds["scale"]))

        # --------------------------------------------------
        # Geocode (cached) and create pins
        # --------------------------------------------------
        lat, lng = geocode_location(location_name)
        if not lat or not lng:
            print(f"  âš ï¸ Could not geocode {location_name} â€“ skipping.")
            continue

        for _ in range(scaled):
            jitter_lat = lat + random.uniform(-1.5, 1.5)
            jitter_lng = lng + random.uniform(-1.5, 1.5)

            # Random date within the year range (most datasets are 2022)
            year = 2022
            start_date = datetime.date(year, 1, 1)
            random_day = datetime.timedelta(days=random.randint(0, 364))
            incident_date = start_date + random_day

            incident_id = str(uuid.uuid4())
            now = datetime.datetime.now()

            try:
                cur.execute(
                    """
                    INSERT INTO incidents
                        (id, title, description, type, date, location,
                         city, "isVerified", source, confirmations,
                         "createdAt", "updatedAt")
                    VALUES (%s, %s, %s, %s, %s,
                            ST_SetSRID(ST_MakePoint(%s, %s), 4326),
                            %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        incident_id,
                        f"{ds['name']} - {location_name}",
                        f"Official NCRB statistic: {count_val} incidents represented by this pin.",
                        ds["type"],
                        incident_date,
                        jitter_lng,
                        jitter_lat,
                        location_name,
                        True,          # official data is verified
                        "ncrb",
                        3,              # auto-verified
                        now,
                        now,
                    ),
                )
                inserted += 1
            except Exception as e:
                print(f"  â- DB insert error for {location_name}: {e}")
                conn.rollback()
                continue

        conn.commit()
        # Respect Nominatim rateâ€'limit
        time.sleep(1.5)

    cur.close()
    conn.close()
    print(f"  âœ… Finished {ds['name']}: inserted {inserted} pins.")
    return inserted

# --------------------------------------------------------------
# Main driver
# --------------------------------------------------------------
def main():
    total_inserted = 0
    for ds in DATASETS:
        total_inserted += import_dataset(ds)
    print(f"\n[SUCCESS] All NCRB datasets imported â€“ total pins added: {total_inserted}\n")

if __name__ == "__main__":
    main()

