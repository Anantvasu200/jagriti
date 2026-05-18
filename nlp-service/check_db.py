from database import get_db_connection

def check_db():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM incidents WHERE source='ncrb'")
        ncrb_count = cur.fetchone()[0]
        
        cur.execute("SELECT COUNT(*) FROM incidents")
        total_count = cur.fetchone()[0]
        
        print(f"--- DB CHECK ---")
        print(f"NCRB Incidents Count: {ncrb_count}")
        print(f"Total Incidents Count (all sources): {total_count}")
        print(f"----------------")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_db()
