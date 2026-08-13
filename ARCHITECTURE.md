# Thunder Hub — Architecture Plan

A three-page OKC Thunder site: roster & stats, news, and a fan-sentiment "pulse" tool.
Stack: **Next.js 14 (App Router) → Docker → Google Cloud Run**, with Google Cloud
Natural Language for sentiment. No Claude API anywhere.

---

## System overview

```
                        ┌─────────────────────────────────────────┐
                        │            Cloud Run (Next.js)          │
  Browser ──────────►   │                                         │
                        │  Pages (server-rendered React)          │
   /        roster      │   /        → app/page.js                │
   /news    news feed   │   /news    → app/news/page.js           │
   /pulse   sentiment   │   /pulse   → app/pulse/page.js          │
                        │                                         │
                        │  API routes (server-side only)          │
                        │   /api/players   ──► ESPN API (free)    │
                        │   /api/news      ──► NewsAPI / ESPN     │
                        │   /api/sentiment ──► Reddit JSON        │
                        │                  ──► GCP Natural Lang.  │
                        └─────────────────────────────────────────┘
                                          │
                              (optional, later) Firestore cache
```

All third-party calls happen server-side in API routes, so API keys never
reach the browser and you can add caching later without touching the UI.

---

## Page 1 — Roster & player stats (`/`)

**Data source: ESPN's public API.** Free, no key, no signup.

- Roster: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/okc/roster`
  → names, jersey numbers, positions, height/weight, headshot URLs.
- Per-player season stats: `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/{id}/overview`
  → PPG, RPG, APG and more.

Stats load lazily when a player card is opened, so the page makes 1 request
up front instead of ~17.

**Caveat:** ESPN's API is unofficial (undocumented). It has been stable for
years, but for a production company site budget for a paid fallback later —
**balldontlie** (free tier, documented) or **SportsDataIO** (paid, SLA-backed).
The fetch logic lives in `lib/espn.js`, so swapping providers means editing
one file.

## Page 2 — Thunder news (`/news`)

**Primary: NewsAPI.org** (free developer key at newsapi.org/register).
- Query: `"OKC Thunder" OR "Oklahoma City Thunder"` with `from`/`to` date
  params — this powers the date picker. Defaults to the last 7 days.
- Free-tier limits: 100 requests/day, articles up to 1 month old,
  **dev/localhost use only**. For production: NewsAPI paid tier, or switch
  to **GNews** (cheaper) — again isolated in `lib/news.js`.

**Fallback: ESPN team news** (`.../teams/okc/news`) — free, no key, always
current. The route uses it automatically when no `NEWS_API_KEY` is set, so
the scaffold works out of the box before you register anywhere.

## Page 3 — Fan pulse / sentiment (`/pulse`)

The flow for "How do people feel about SGA right now?":

1. **Gather** — `lib/reddit.js` searches Reddit's public JSON endpoints
   (r/Thunder, r/nba) for the query, pulling recent post titles + top comments.
   Free, no key for light testing (just a User-Agent header). For production
   volume, register a free Reddit app and use OAuth. (Skipping X/Twitter —
   its API pricing is prohibitive.)
2. **Analyze** — `lib/sentiment.js` sends the collected snippets to
   **Google Cloud Natural Language** (`analyzeSentiment`). You already have
   GCP; free tier covers 5,000 units/month.
3. **Report** — the route aggregates into: overall score (−1 to +1),
   positive/negative/neutral breakdown, most positive & most negative
   sample quotes, and post volume.

Easy later additions: YouTube Data API comments (also Google, free quota),
news headlines from Page 2's pipeline, entity-level sentiment
(`analyzeEntitySentiment`) to separate "SGA" from "the refs" in one post.

---

## Google Cloud setup

```bash
# 1. Enable services
gcloud services enable language.googleapis.com run.googleapis.com \
    cloudbuild.googleapis.com artifactregistry.googleapis.com

# 2. Local dev credentials (one time)
gcloud auth application-default login

# 3. Deploy — builds the Dockerfile and ships to Cloud Run
gcloud run deploy thunder-hub --source . --region us-central1 \
    --allow-unauthenticated --set-env-vars NEWS_API_KEY=your_key
```

On Cloud Run, the Natural Language client authenticates automatically via
the service account — no key files to manage. Locally it uses the
`gcloud auth application-default login` credentials.

**Cost at testing scale: ~$0.** Cloud Run free tier (2M requests/mo),
NL free tier (5k units/mo), ESPN/Reddit free, NewsAPI dev key free.

## Later hardening (when it goes beyond testing)

- **Firestore cache**: cache roster (24h), news (15min), sentiment reports
  (1h per query) — cuts API usage ~90% and speeds up pages.
- **Cloud Scheduler + Cloud Function**: pre-compute sentiment for star
  players hourly instead of on-demand.
- Swap NewsAPI dev key → paid tier or GNews; add Reddit OAuth.
- Rate-limit `/api/sentiment` (it's the expensive route).
