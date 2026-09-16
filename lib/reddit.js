// Gathers fan chatter from Reddit via the Apify Reddit Scraper actor
// (fatihtahta/reddit-scraper-search-fast). Replaces the old public
// r/subreddit/search.json scraping, which Reddit increasingly rate-limits
// for anonymous requests.
//
// Needs an Apify token — either APIFY_API_TOKEN in the environment, or an
// apifyToken pasted on the /connect page (sent via the x-api-keys header).

const ACTOR = 'fatihtahta~reddit-scraper-search-fast';
const API = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;
const MAX_RESULTS = 100;

export async function gatherPosts(query, range, apiKeys = {}) {
  const token = apiKeys.apifyToken || process.env.APIFY_API_TOKEN;
  if (!token) return [];

  const input = {
    queries: [`${query} Thunder OKC NBA`],
    sort: 'new',
    timeframe: range ? 'year' : 'month', // widen the window when filtering to specific dates
    maxPosts: MAX_RESULTS,
  };
  if (range?.from) input.dateFrom = range.from;
  if (range?.to) input.dateTo = range.to;

  try {
    const res = await fetch(`${API}?token=${token}&timeout=120&memory=512`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Reddit scraper failed (${res.status})`);
    }
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items
      .map((p) => {
        const body = p.body ?? p.selftext ?? p.text ?? '';
        const text = [p.title, body].filter(Boolean).join('. ').replace(/\s+/g, ' ').trim();
        if (text.length < 10) return null;
        const sub = p.subreddit || p.community || 'reddit';
        const url = p.permalink || p.url || null;
        const created = p.createdAt ?? p.created_at ?? p.created_utc ?? null;
        return {
          text: text.slice(0, 500),
          score: Number(p.score ?? p.upVotes ?? p.ups ?? 0),
          source: `r/${sub}`,
          sourceType: 'reddit',
          url: url?.startsWith('http') ? url : url ? `https://reddit.com${url}` : null,
          createdAt: toIso(created),
        };
      })
      .filter(Boolean)
      .slice(0, MAX_RESULTS);
  } catch {
    return []; // never let Reddit take down the whole Pulse run
  }
}

// Actor may return epoch seconds, epoch millis, or an ISO string.
function toIso(value) {
  if (!value) return null;
  if (typeof value === 'number') {
    return new Date(value < 1e12 ? value * 1000 : value).toISOString();
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
