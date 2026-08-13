# Thunder Hub

Three-page OKC Thunder site: **Roster & Stats** (`/`), **News** (`/news`),
and **Fan Pulse** sentiment analysis (`/pulse`). Next.js 14 → Cloud Run.
Full design rationale in `ARCHITECTURE.md`.

Data sources: **NBA Stats API** (via `nba_api`, through a local FastAPI
service) for roster/stats, **NewsAPI** for news, **Reddit** + NewsAPI/Google
CSE for Fan Pulse, and the **Gemini API** for sentiment.

## Run locally

You need two processes running:

```bash
# 1. Stats microservice (official NBA Stats API via nba_api)
pip install nba_api fastapi "uvicorn[standard]"
uvicorn stats_service:app --port 8000        # http://localhost:8000

# 2. Next.js app
npm install
cp .env.example .env.local    # add GEMINI_API_KEY (Pulse) + NEWS_API_KEY (News)
npm run dev                   # http://localhost:3000
```

- **Roster & Stats** (`/`) needs the FastAPI service running — no API key.
- **News** (`/news`) needs a free NewsAPI key from https://newsapi.org/register.
- **Fan Pulse** (`/pulse`) needs a free Gemini key from
  https://aistudio.google.com/apikey — no GCP setup required.

## Deploy to Cloud Run

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
    artifactregistry.googleapis.com

gcloud run deploy thunder-hub --source . --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars GEMINI_API_KEY=your_key_here,NEWS_API_KEY=your_key_here
```

Sentiment runs through the Gemini API with a plain key — no service
accounts or key files to manage. The stats service is separate (see
`stats_service.py`); point `STATS_SERVICE_URL` at wherever you host it.

## Where things live

| Path | Purpose |
|---|---|
| `app/page.js`, `app/news/`, `app/pulse/` | The three pages |
| `app/api/*/route.js` | Server-side routes (keys stay off the browser) |
| `stats_service.py` | FastAPI service: roster + stats from the NBA Stats API |
| `lib/news.js` | NewsAPI with date filtering |
| `lib/reddit.js` | Gathers fan posts (swap in OAuth for production) |
| `lib/articles.js` | Web article gathering (Google CSE / NewsAPI) |
| `lib/sentiment.js` | Gemini API scoring + report builder |

## Free-tier limits to know

- **NBA Stats API** (via `nba_api`): unofficial but stable; rate-limited — the
  FastAPI service caches roster/stats in memory per process.
- **Gemini API**: free tier covers light daily use; each Pulse query is 1–2 batched calls.
- **NewsAPI dev key**: 100 req/day, dev use only — upgrade or switch to GNews for production.
- **Reddit public JSON**: fine for testing; register a free app + OAuth for real traffic.
