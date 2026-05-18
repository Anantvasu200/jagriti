from database import get_db_connection

def clear_ncrb_data():
    conn = get_db_connection()
    if not conn:
        print("Failed to connect to database.")
        return
    try:
        cur = conn.cursor()
        cur.execute("DELETE FROM incidents WHERE source='ncrb'")
        conn.commit()
        print("Cleared NCRB data successfully.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    clear_ncrb_data()
