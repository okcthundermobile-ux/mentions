// Gathers tweets about the query via the Apify Tweet Scraper actor
// (apidojo/tweet-scraper). Returns items shaped like the other gatherers
// ({ text, source, sourceType: 'tweet', url, createdAt }) so they slot into
// the Fan Pulse pipeline alongside Reddit + articles.
//
// Needs APIFY_API_TOKEN. Free tier: ~5 runs/month, 10 items each.
// Pricing beyond that: ~$0.40 per 1,000 tweets.

const ACTOR = 'apidojo~tweet-scraper';
const API = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;

export async function gatherTweets(query, range) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return [];

  // Build a Twitter advanced-search query. Append Thunder context so generic
  // names ("SGA", "Chet") stay on-topic. Respect the optional date range.
  let term = `${query} (Thunder OR OKC OR NBA)`;
  if (range?.from) term += ` since:${range.from}`;
  if (range?.to) term += ` until:${range.to}`;

  const input = {
    searchTerms: [term],
    sort: 'Latest',
    tweetLanguage: 'en',
    maxItems: 20,
  };

  try {
    const res = await fetch(`${API}?token=${token}&timeout=120&memory=512`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Tweet scraper failed (${res.status})`);
    }
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items
      .map((t) => {
        const text = (t.full_text || t.text || '').replace(/\s+/g, ' ').trim();
        if (text.length < 10) return null;
        const user = t.author?.userName || t.user?.screen_name || 'twitter';
        const handle = t.author?.userName || t.user?.screen_name;
        const id = t.id_str || t.id;
        return {
          text: text.slice(0, 500),
          source: `@${user}`,
          sourceType: 'tweet',
          url: t.url || (handle && id ? `https://x.com/${handle}/status/${id}` : null),
          createdAt: t.created_at || t.createdAt || null,
        };
      })
      .filter(Boolean)
      .slice(0, 20);
  } catch {
    return []; // never let Twitter take down the whole Pulse run
  }
}
