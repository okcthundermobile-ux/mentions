// Gathers online ARTICLES about the query for sentiment analysis.
// Three layers, all run in parallel, best-available wins:
//   1. Google Custom Search JSON API (if GOOGLE_CSE_KEY + GOOGLE_CSE_ID set)
//      100 queries/day free, then $5 per 1,000.
//   2. NewsAPI web-wide search (if NEWS_API_KEY set)
//   3. Apify Web Scraper actor (if APIFY_API_TOKEN set) — crawls real pages
// ESPN fallback removed per project direction.

import { gatherApify } from './apify';

export async function gatherArticles(query, range) {
  const [cse, newsapi, apify] = await Promise.all([
    searchGoogleCSE(query, range),
    searchNewsApi(query, range),
    gatherApify(query, range),
  ]);
  // De-dupe by URL, prefer CSE results first.
  const seen = new Set();
  const items = [];
  for (const item of [...cse, ...newsapi, ...apify]) {
    if (item.url && seen.has(item.url)) continue;
    seen.add(item.url);
    items.push(item);
  }
  return items.slice(0, 15);
}

async function searchGoogleCSE(query, range) {
  if (!process.env.GOOGLE_CSE_KEY || !process.env.GOOGLE_CSE_ID) return [];
  try {
    const params = new URLSearchParams({
      key: process.env.GOOGLE_CSE_KEY,
      cx: process.env.GOOGLE_CSE_ID,
      q: `${query} Oklahoma City Thunder`,
      num: '10',
    });
    // Specific window -> sort=date:r:YYYYMMDD:YYYYMMDD; otherwise last 2 weeks.
    if (range?.from && range?.to) {
      params.set('sort', `date:r:${range.from.replaceAll('-', '')}:${range.to.replaceAll('-', '')}`);
    } else {
      params.set('dateRestrict', 'w2');
    }
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item) => ({
      text: [item.title, item.snippet].filter(Boolean).join('. ').slice(0, 500),
      source: item.displayLink || 'web',
      sourceType: 'article',
      url: item.link,
      createdAt: null,
    }));
  } catch { return []; }
}

async function searchNewsApi(query, range) {
  if (!process.env.NEWS_API_KEY) return [];
  try {
    const params = new URLSearchParams({
      q: `"${query}" AND (Thunder OR NBA)`,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: '10',
      apiKey: process.env.NEWS_API_KEY,
    });
    if (range?.from) params.set('from', range.from);
    if (range?.to) params.set('to', range.to);
    const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
      next: { revalidate: 900 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles || []).map((a) => ({
      text: [a.title, a.description].filter(Boolean).join('. ').slice(0, 500),
      source: a.source?.name || 'News',
      sourceType: 'article',
      url: a.url,
      createdAt: a.publishedAt,
    }));
  } catch { return []; }
}
