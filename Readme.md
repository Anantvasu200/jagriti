# 🔦 Jagriti — Know Your Surroundings. Stay Safe.

> **Jagriti** (जागृति — *Awakening*) is a free, open-source crime awareness and safety heatmap platform built specifically for India.

It empowers women, daily commuters, and travelers to make informed decisions about their surroundings by visualizing real crime data on an interactive map.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docs.docker.com/compose/)
[![Cost](https://img.shields.io/badge/Monthly%20Cost-%E2%82%B90-brightgreen)]()

---

## 🚨 The Problem

India has a serious public safety awareness gap. Crime data exists — in NCRB reports, in daily newspapers, in police records — but it is **scattered, inaccessible, and never visualized** in a way that helps ordinary people make real-time decisions.

A woman planning to travel alone at night, a tourist visiting an unfamiliar city, or a family relocating to a new neighborhood has no reliable tool to understand the safety profile of an area.

**Jagriti exists to close that gap.**

---

## ✨ Core Features

### 🗺️ Interactive Safety Heatmap
A live heatmap built on **Leaflet.js + OpenStreetMap** showing crime density across cities and neighborhoods. Users can zoom into any area and see incident markers with details — crime type, date, source, and location. Color intensity reflects crime frequency.

### 📡 Multi-Source Data Pipeline
Crime data is automatically collected daily from three layers:
- **RSS Feeds & Scraping** — Times of India, NDTV, Hindustan Times, Amar Ujala, Dainik Bhaskar
- **NCRB Historical Data** — District-level crime statistics from the past 5 years
- **Community Reports** — Anonymous user submissions directly on the map

### 🧠 NLP Processing Pipeline
Every scraped article is processed through a Python-based NLP pipeline:
- **spaCy** extracts crime type, location names, and dates
- **LibreTranslate** translates Hindi articles to English before processing
- **Nominatim / OSM** geocodes extracted location names to GPS coordinates
- **PostgreSQL + PostGIS** stores all incidents for spatial queries

### 👥 Community Reporting
Any user can anonymously report a safety incident by dropping a pin and selecting a category: theft, harassment, assault, suspicious activity, unsafe road, or other. Reports gain a **verified badge** when 3+ users independently report the same area.

### 🤖 AI Safety Assistant (RAG)
Ask plain-language questions in Hindi or English:
> *"Is Lajpat Nagar safe at night for women?"*
> *"What incidents have happened in Connaught Place recently?"*

The system uses a **RAG pipeline** — ChromaDB stores incident data as vector embeddings, retrieves the most relevant incidents for each query, and passes them to an LLM for a clear, sourced answer. **Every answer is grounded in actual stored data.**

### 📊 Safety Score
Every area gets an automatically calculated safety score **(1–10)** with separate scores for **female safety** and **traveler safety**. Scores factor in incident frequency, crime severity, recency, and community report density. Recalculated daily.

---

## 🏗️ Architecture

```
User (Browser)
      ↓
Nginx (Reverse Proxy + SSL)
      ↓
React Frontend (Leaflet Map)
      ↓
Node.js Backend API
    ↓           ↓
PostgreSQL    Python FastAPI
+ PostGIS     NLP Service
                ↓
           spaCy + Nominatim
           ChromaDB (RAG)
           LibreTranslate
```

---

## 🛠️ Tech Stack — 100% Free & Open Source

| Layer | Technology |
|---|---|
| Frontend | React + Leaflet.js + OpenStreetMap |
| Backend API | Node.js + Express |
| NLP Service | Python FastAPI |
| Database | PostgreSQL + PostGIS |
| Vector Store | ChromaDB |
| NLP Engine | spaCy |
| Geocoding | Nominatim (OpenStreetMap) |
| Translation | LibreTranslate |
| Scraping | Feedparser + BeautifulSoup |
| Containers | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| SSL | Let's Encrypt (Certbot) |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |
| Deployment | Home Server / AWS EC2 t2.micro |

> **Total monthly infrastructure cost — ₹0**

---

## 📦 Data Sources

| Source | Description |
|---|---|
| News RSS Feeds | TOI, NDTV, Hindustan Times, Amar Ujala, Dainik Bhaskar |
| NCRB Data | Historical district-level crime statistics (5 years) |
| Community Reports | Anonymous user submissions via the platform |

---

## 🚀 Local Setup

### Prerequisites
- Docker & Docker Compose
- Git

### Clone & Run

```bash
git clone https://github.com/yourname/jagriti.git
cd jagriti
cp .env.example .env
docker compose up -d
```

Open `http://localhost:3000` in your browser.

### Services

| Service | Port |
|---|---|
| React Frontend | 3000 |
| Node.js API | 5000 |
| Python NLP Service | 8000 |
| PostgreSQL | 5432 |
| ChromaDB | 8001 |
| LibreTranslate | 5500 |
| Prometheus | 9090 |
| Grafana | 3001 |

---

## 🖥️ Self-Hosted Deployment

Jagriti is designed to run on a **single Linux server** — home lab, VPS, or cloud VM.

### System Requirements

| Resource | Minimum |
|---|---|
| CPU | 2 cores |
| RAM | 3 GB |
| Storage | 50 GB |
| OS | Ubuntu 22.04 / 24.04 |

### Production Deployment

```bash
# On your server
git clone https://github.com/yourname/jagriti.git
cd jagriti

# Configure environment
cp .env.example .env
nano .env   # Set your domain, DB passwords, API keys

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Setup SSL (replace with your domain)
certbot --nginx -d jagriti.in
```

GitHub Actions handles automated deployment on every push to `main`.

---

## 👥 Who Is It For

- 👩 Women traveling alone or commuting at night
- ✈️ Tourists and travelers visiting unfamiliar Indian cities
- 🏠 Families relocating to a new neighborhood
- 🏢 NGOs and researchers working on public safety
- 📰 Journalists covering crime and safety issues
- 💼 Corporate HR teams managing employee safety in field locations

---

## 💰 Monetization Path

Jagriti is **free for individual users forever**. Revenue potential:

- **API Licensing** — Travel platforms like MakeMyTrip, Airbnb
- **White-Label Deployments** — NGOs on grant funding
- **Safety Report Subscriptions** — Corporate HR and fleet management teams
- **Risk Assessment Reports** — Insurance companies at district/city level

---

## 🌍 Social Impact

India reports over **400,000 crimes against women annually** (NCRB). Most incidents never reach public awareness in a structured, searchable format.

Jagriti makes this data **visible, accessible, and actionable** — turning scattered reports into a tool that helps people stay safe and make informed decisions every single day.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

```bash
# Fork → Clone → Branch → Commit → PR
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
```

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🔗 Links

- **GitHub:** [github.com/yourname/jagriti](https://github.com/yourname/jagriti)
- **Domain:** [jagriti.in](https://jagriti.in) *(production)* | [jagriti.duckdns.org](https://jagriti.duckdns.org) *(free tier)*

---

<div align="center">
  <sub>Built with ❤️ for India's safety. One developer. Zero cost. Real impact.</sub>
</div>