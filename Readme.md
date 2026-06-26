# Jagriti (जागृति) — Know Your Surroundings. Stay Safe.

> **Jagriti** means *Awakening* in Hindi.

Jagriti is a free, open-source crime awareness and safety heatmap platform built specifically for India. It empowers women, daily commuters, and travelers to make informed decisions about their surroundings by visualizing real crime data on an interactive map.

---

## The Problem

India has a serious public safety awareness gap. Crime data exists — in NCRB reports, in daily newspapers, in police records — but it is scattered, inaccessible, and never visualized in a way that helps ordinary people make real-time decisions.

A woman planning to travel alone at night, a tourist visiting an unfamiliar city, or a family relocating to a new neighborhood has no reliable tool to understand the safety profile of an area. Jagriti exists to close that gap.

---

## Live Demo

🌐 **[app.jagriti.online](https://app.jagriti.online)**

---

## Core Features

### 🗺️ Interactive Safety Heatmap
A live heatmap built on Leaflet.js and OpenStreetMap showing crime density across cities and neighborhoods. Users can zoom into any area and see incident markers with details — crime type, date, source, and location.

### 📰 Multi-Source Data Pipeline
Crime data is automatically collected daily from:
- **RSS Feeds** — Times of India, NDTV, Hindustan Times, Amar Ujala, Dainik Bhaskar
- **NCRB Historical Data** — District-level crime statistics (~11,344 pins ingested)
- **Community Reports** — Anonymous user-submitted incidents

### 🧠 NLP Processing Pipeline
Every scraped article is processed through a Python FastAPI NLP service using spaCy. The pipeline extracts crime type, location, and date. Hindi articles are translated via LibreTranslate before processing. Locations are geocoded using Nominatim + OpenStreetMap and stored in PostgreSQL with PostGIS.

### 📍 Community Reporting
Any user can anonymously drop a pin on the map and report a safety incident. Reports earn a **verified badge** when 3+ independent users report the same area — creating a real-time crowd-sourced safety layer.

### 🤖 AI Safety Assistant (RAG)
Ask natural language questions like *"Is Lajpat Nagar safe at night?"* The RAG pipeline uses ChromaDB for vector storage and retrieves grounded answers from actual incident data — no hallucinations.

### 🆘 SOS & Safety Alerts
Proximity alerts notify users when they enter high-incident zones. SOS and live location sharing planned for next release.

### 🔐 OTP-Verified Auth
Email OTP authentication for verified community reporting.

---

## Tech Stack

```
Frontend          →  React + Vite + Tailwind CSS + Leaflet.js (PWA)
Backend API       →  Node.js + Express + Sequelize ORM
NLP Service       →  Python FastAPI + spaCy (en_core_web_md) + APScheduler
Database          →  PostgreSQL + PostGIS
Vector Store      →  ChromaDB
Translation       →  LibreTranslate (self-hosted)
Geocoding         →  Nominatim (OpenStreetMap)
Scraping          →  Feedparser + BeautifulSoup
Containerization  →  Docker + Docker Compose (9 containers)
Reverse Proxy     →  Nginx
Tunnel / SSL      →  Cloudflare Tunnel
CI/CD             →  Jenkins (self-hosted)
Monitoring        →  Prometheus + Grafana
Deployment        →  Self-hosted Ubuntu Server
```

**Total monthly infrastructure cost — ₹0**

---

## Architecture

```
User (Browser)
      ↓
Cloudflare Tunnel (SSL + DDoS protection)
      ↓
Nginx Reverse Proxy (port 8081)
      ↓
React Frontend (Leaflet Map + PWA)
      ↓
Node.js Backend API
    ↓              ↓
PostgreSQL      Python FastAPI
+ PostGIS       NLP Service
                    ↓
               spaCy + Nominatim
               ChromaDB (RAG)
               LibreTranslate
```

---

## Data Sources

| Source | Type |
|--------|------|
| TOI, NDTV, HT, Amar Ujala, Dainik Bhaskar | RSS Feeds (daily) |
| NCRB Reports | Historical district-level data |
| User submissions | Anonymous community reports |

---

## Running Locally

### Prerequisites
- Docker + Docker Compose
- Git

### Setup

```bash
git clone https://github.com/Anantvasu200/jagriti.git
cd jagriti
cp .env.example .env
# Fill in your credentials in .env
docker compose up --build
```

App runs at `http://localhost:3000`

---

## Who Is It For

- Women traveling alone or commuting at night
- Tourists and travelers visiting unfamiliar Indian cities
- Families relocating to a new neighborhood
- NGOs and researchers working on public safety
- Journalists covering crime and safety issues
- Corporate HR teams managing employee safety

---

## Social Impact

India reports over **400,000 crimes against women annually** (NCRB). Most incidents never reach public awareness in a structured, searchable format. Jagriti makes this data visible, accessible, and actionable.

---

## Project Status

🟢 **Live** — Self-hosted, fully containerized, CI/CD via Jenkins

Built by one developer. Open source. Zero infrastructure cost. Designed to run in production using real DevOps tooling — Docker, Nginx, Cloudflare, PostgreSQL, Python, Node.js.

---

## License

MIT — Free to use, fork, and contribute.

---

**GitHub:** [github.com/Anantvasu200/jagriti](https://github.com/Anantvasu200/jagriti)  
**Live:** [app.jagriti.online](https://app.jagriti.online)