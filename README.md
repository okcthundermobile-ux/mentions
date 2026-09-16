# Thunder Mentions

Four-page OKC Thunder site: **Roster & Stats** (`/`), **News** (`/news`),
**Fan Pulse** sentiment analysis (`/pulse`), and **Connect APIs** (`/connect`)
for wiring up your own keys. Next.js 14 → Firebase App Hosting.

Data sources: **ESPN's public NBA API** for roster/stats, **NewsAPI** for
news, **Reddit** + **Twitter/X** (via Apify actors) + NewsAPI/Google CSE for
Fan Pulse, and the **Gemini API** for sentiment.

## Connect your API keys — no file editing required

Open **`/connect`** in the running app and paste in your keys. They're saved
in that browser's `localStorage` only, sent with each request to this app's
own `/api/*` routes, and never written to disk or committed to git. This is
the fastest way to try the app — no `.env.local`, no redeploy.

Prefer environment variables (e.g. for a shared deployment)? Set the same
values as server-side env vars instead (see below) — pasted keys always take
priority over env vars when both are present.

| Key | Powers | Get one |
|---|---|---|
| `GEMINI_API_KEY` | Fan Pulse sentiment scoring | https://aistudio.google.com/apikey (free) |
| `NEWS_API_KEY` | News page + one Fan Pulse article source | https://newsapi.org/register (free) |
| `APIFY_API_TOKEN` | Reddit + Twitter/X gathering, web-scraper articles | https://console.apify.com/account/integrations (free tier) |
| `GOOGLE_CSE_KEY` / `GOOGLE_CSE_ID` | Optional extra article source | https://programmablesearchengine.google.com |

## Run locally

You only need the Next.js app:

```bash
npm install
npm run dev # http://localhost:3000
```

Then either open `/connect` and paste your keys in, or `cp .env.example
.env.local` and fill in `GEMINI_API_KEY` (Pulse) + `NEWS_API_KEY` (News).

- **Roster & Stats** (`/`) is available immediately through ESPN's public
  API — no API key or separate service is needed.
- **News** (`/news`) needs a NewsAPI key.
- **Fan Pulse** (`/pulse`) needs a Gemini key, plus an Apify token to pull
  Reddit and Twitter/X chatter.

## Deploy to Firebase App Hosting

The repo is App Hosting ready: `npm run build` produces a standard Next.js
build and `apphosting.yaml` declares the runtime config.

```bash
# 1. Create the backend once (connects to this GitHub repo)
firebase apphosting:backends:create --project thunder-mentions

# 2. Every push to the live branch triggers a rollout automatically,
#    or roll out manually:
firebase apphosting:rollouts:create BACKEND_ID
```

No Gemini/NewsAPI/Apify secrets are required to deploy — roster and stats
work immediately, and visitors can paste their own optional keys on
`/connect`. If you'd rather configure those keys once for everyone instead
of per-visitor, create secrets and grant the backend access to them, then add
a secret-backed `env:` entry in `apphosting.yaml` (see the commented examples
already in that file):

```bash
firebase apphosting:secrets:set NEWS_API_KEY --project thunder-mentions
firebase apphosting:secrets:grantaccess NEWS_API_KEY --project thunder-mentions
# repeat for GEMINI_API_KEY, APIFY_API_TOKEN
```

## Where things live

| Path | Purpose |
|---|---|
| `app/page.js`, `app/news/`, `app/pulse/` | The three data pages |
| `app/connect/` | Paste-your-own-API-keys settings page |
| `app/api/*/route.js` | Server-side routes (keys stay off the browser) |
| `lib/stats.js` | ESPN API adapter for roster + player season averages |
| `lib/news.js` | NewsAPI with date filtering |
| `lib/reddit.js` | Reddit posts via the Apify `fatihtahta/reddit-scraper-search-fast` actor |
| `lib/twitter.js` | Tweets via the Apify `apidojo/twitter-scraper-lite` actor |
| `lib/apify.js` | General web article gathering via the Apify web-scraper actor |
| `lib/articles.js` | Web article gathering (Google CSE / NewsAPI / Apify) |
| `lib/sentiment.js` | Gemini API scoring + report builder |
| `lib/clientKeys.js` | Browser localStorage helpers for pasted API keys |
| `lib/serverKeys.js` | Reads pasted keys from the `x-api-keys` request header |

## Free-tier limits to know

- **ESPN NBA API**: no key is required. Roster and player-stat responses are
  cached for one hour to avoid unnecessary upstream requests.
- **Gemini API**: free tier covers light daily use; each Pulse query is 1–2 batched calls.
- **NewsAPI dev key**: 100 req/day, dev use only — upgrade or switch to GNews for production.
- **Apify actors**: Reddit and Twitter/X gathering are capped at ~100 results per
  Pulse query to control run cost; both actors bill per result on Apify's
  free/paid tiers.
