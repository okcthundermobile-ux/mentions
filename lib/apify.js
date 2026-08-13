// Gathers web mentions via the Apify Web Scraper actor (apify/web-scraper).
// Runs the actor synchronously and returns items shaped like the other
// gatherers ({ text, source, sourceType, url, createdAt }) so it slots
// straight into the Fan Pulse pipeline.
//
// Needs APIFY_API_TOKEN (free account: https://console.apify.com/account/integrations).
// Optional APIFY_TARGET_URLS — comma-separated list of start URLs to crawl.
// Defaults to a Google News search for the query (broad, no per-site config).

const ACTOR = 'apify~web-scraper';
const API = `https://api.apify.com/v2/acts/${ACTOR}/run-sync-get-dataset-items`;

// Extracts readable text + title from each crawled page.
const PAGE_FUNCTION = `async function pageFunction(context) {
  const { request, log, jQuery } = context;
  const $ = jQuery;
  const title = $('title').first().text().trim();
  const h1 = $('h1').first().text().trim();
  const text = $('p').map((_, el) => $(el).text()).get().join(' ')
    .replace(/\\s+/g, ' ').trim().slice(0, 600);
  return { url: request.url, title: h1 || title, text };
}`;

export async function gatherApify(query, range) {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return [];

  // Start URLs: user-configured, else a Google News search for the query.
  const custom = (process.env.APIFY_TARGET_URLS || '')
    .split(',').map((u) => u.trim()).filter(Boolean);
  const startUrls = custom.length
    ? custom.map((url) => ({ url }))
    : [{ url: `https://news.google.com/search?q=${encodeURIComponent(query + ' Oklahoma City Thunder')}&hl=en-US&gl=US&ceid=US:en` }];

  const input = {
    startUrls,
    maxPagesPerCrawl: 10,
    maxConcurrency: 5,
    pageFunction: PAGE_FUNCTION,
    // Don't follow links off the start pages — keeps runs fast + cheap.
    linkSelector: '',
    proxyConfiguration: { useApifyProxy: true },
  };

  try {
    const res = await fetch(`${API}?token=${token}&timeout=120&memory=512`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Apify actor failed (${res.status})`);
    }
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    return items
      .filter((d) => d.text && d.text.length > 20)
      .map((d) => ({
        text: `${d.title ? d.title + '. ' : ''}${d.text}`.slice(0, 500),
        source: safeHost(d.url),
        sourceType: 'article',
        url: d.url,
        createdAt: null,
      }))
      .slice(0, 10);
  } catch {
    return []; // never let Apify take down the whole Pulse run
  }
}

function safeHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'web'; }
}
