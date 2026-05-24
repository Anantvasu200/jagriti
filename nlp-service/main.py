

from fastapi import FastAPI, BackgroundTasks
from apscheduler.schedulers.background import BackgroundScheduler
from nlp_pipeline import process_feeds
import datetime

app = FastAPI(title="Jagriti NLP Service")

# Initialize Scheduler
scheduler = BackgroundScheduler()

@app.on_event("startup")
async def start_scheduler():
    # Run NLP pipeline automatically every 3 hours
    scheduler.add_job(
        process_feeds,
        'interval',
        hours=1
    )

    scheduler.start()

    print("🚀 Scheduler started.", flush=True)
    print("📰 Jagriti NLP Pipeline will scrape news every 1 hour.", flush=True)

@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()
    print("🛑 Scheduler stopped.")

@app.get("/")
def read_root():
    return {
        "status": "NLP Service is running securely",
        "time": str(datetime.datetime.now()),
        "info": "This service automatically scrapes RSS feeds, extracts crime data using spaCy NLP, and stores incidents into PostgreSQL."
    }

@app.post("/trigger-pipeline")
def trigger_pipeline(background_tasks: BackgroundTasks):
    """
    Manually trigger pipeline instantly.
    Useful for testing/admin overrides.
    """

    background_tasks.add_task(process_feeds)

    return {
        "message": "✅ NLP Pipeline triggered successfully in background."
    }
