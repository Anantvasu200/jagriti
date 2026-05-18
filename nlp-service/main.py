from fastapi import FastAPI, BackgroundTasks
from apscheduler.schedulers.background import BackgroundScheduler
from nlp_pipeline import process_feeds
import datetime

app = FastAPI(title="Jagriti NLP Service")

# Initialize APScheduler
scheduler = BackgroundScheduler()

@app.on_event("startup")
def start_scheduler():
    # Run the NLP pipeline automatically every 1 hour
    scheduler.add_job(process_feeds, 'interval', hours=1)
    scheduler.start()
    print("Scheduler started. Jagriti NLP Pipeline will scrape news every 1 hour.")

@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()

@app.get("/")
def read_root():
    return {
        "status": "NLP Service is running securely", 
        "time": datetime.datetime.now(),
        "info": "This service automatically scrapes TOI & NDTV every hour, extracts crime data using spaCy, and populates the Postgres database."
    }

@app.post("/trigger-pipeline")
def trigger_pipeline(background_tasks: BackgroundTasks):
    """
    Manually trigger the pipeline to run right now in the background.
    Useful for testing or manual overrides.
    """
    background_tasks.add_task(process_feeds)
    return {"message": "NLP Pipeline triggered successfully and is running in the background."}
