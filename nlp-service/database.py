import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            user=os.getenv("DB_USER", "jagriti_user"),
            password=os.getenv("DB_PASSWORD", "yourpassword"),
            dbname=os.getenv("DB_NAME", "jagriti_db")
        )
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None
