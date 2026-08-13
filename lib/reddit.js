// Gathers fan chatter from Reddit's public JSON endpoints.
// Fine for testing at low volume with a descriptive User-Agent.
// For production traffic, register a (free) Reddit app and switch to OAuth:
// https://www.reddit.com/prefs/apps

const HEADERS = { 'User-Agent': 'thunder-hub/0.1 (fan sentiment demo)' };
const SUBREDDITS = ['Thunder', 'nba'];

async function searchSubreddit(sub, query, range, limit = 25) {
  const params = new URLSearchParams({
    q: query,
    restrict_sr: 'on',
    sort: 'new',
    t: range ? 'year' : 'week', // widen the window when filtering to specific dates
    limit: String(limit),
  });
  const res = await fetch(
    `https://www.reddit.com/r/${sub}/search.json?${params}`,
    { headers: HEADERS, next: { revalidate: 600 } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.data?.children || []).map((c) => ({
    text: [c.data.title, c.data.selftext].filter(Boolean).join('. ').slice(0, 500),
    score: c.data.score,
    source: `r/${sub}`,
    sourceType: 'reddit',
    url: `https://reddit.com${c.data.permalink}`,
    createdAt: new Date(c.data.created_utc * 1000).toISOString(),
  }));
}

export async function gatherPosts(query, range) {
  const results = await Promise.all(
    SUBREDDITS.map((sub) => searchSubreddit(sub, query, range))
  );
  let posts = results.flat().filter((p) => p.text.trim().length > 10);
  if (range?.from) posts = posts.filter((p) => p.createdAt >= `${range.from}T00:00:00`);
  if (range?.to) posts = posts.filter((p) => p.createdAt <= `${range.to}T23:59:59`);
  // Highest-engagement first, cap total to stay inside free NL quota.
  return posts.sort((a, b) => b.score - a.score).slice(0, 20);
}
