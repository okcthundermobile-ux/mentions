// News client: NewsAPI.org (free dev key: https://newsapi.org/register).
// Supports date filtering via from/to. ESPN fallback removed per project direction.

const QUERY = '"Oklahoma City Thunder" OR "OKC Thunder"';

export async function getNews({ from, to } = {}) {
  const key = process.env.NEWS_API_KEY;
  if (!key) {
    return {
      provider: 'none',
      dateFilterSupported: true,
      noKey: true,
      articles: [],
    };
  }

  const params = new URLSearchParams({
    q: QUERY,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize: '30',
    apiKey: key,
  });
  if (from) params.set('from', from); // YYYY-MM-DD
  if (to) params.set('to', to);

  const res = await fetch(`https://newsapi.org/v2/everything?${params}`, {
    next: { revalidate: 900 },
  });
  if (!res.ok) {
    // 426 = free dev key can't search articles older than ~30 days.
    if (res.status === 426) {
      throw new Error('NewsAPI free key only covers the last ~30 days. Pick a more recent "From" date.');
    }
    throw new Error(`NewsAPI request failed (${res.status})`);
  }
  const data = await res.json();
  return {
    provider: 'newsapi',
    dateFilterSupported: true,
    articles: (data.articles || []).map((a) => ({
      title: a.title,
      description: a.description,
      url: a.url,
      source: a.source?.name || 'Unknown',
      publishedAt: a.publishedAt,
      image: a.urlToImage || null,
    })),
  };
}
