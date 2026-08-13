'use client';
import { useEffect, useMemo, useState } from 'react';

const iso = (d) => d.toISOString().slice(0, 10);

export default function NewsPage() {
  const today = iso(new Date());
  const weekAgo = iso(new Date(Date.now() - 7 * 86400000));
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  async function load(f, t) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/news?from=${f}&to=${t}`);
      const data = await res.json();
      if (data.error) setError(data.error);
      else setResult(data);
    } catch {
      setError('Could not reach the news service.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(weekAgo, today); }, []); // eslint-disable-line

  // Client-side filter over the already-fetched articles.
  const articles = useMemo(() => {
    const list = result?.articles || [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((a) =>
      `${a.title || ''} ${a.description || ''} ${a.source || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [result, query]);

  return (
    <>
      <h1 className="page-title">Thunder News</h1>
      <p className="page-sub">
        Latest coverage of the Oklahoma City Thunder. Adjust the dates to look
        back at a specific stretch, or filter the headlines below.
      </p>

      <div className="date-row">
        <div>
          <label htmlFor="from">From</label>
          <input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label htmlFor="to">To</label>
          <input id="to" type="date" value={to} max={today} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn" onClick={() => load(from, to)} disabled={loading}>
          {loading ? 'Loading…' : 'Update'}
        </button>
        <div className="news-search">
          <label htmlFor="news-q">Search</label>
          <input
            id="news-q"
            type="search"
            value={query}
            placeholder="Filter by player, topic, source…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {result?.noKey && (
        <p className="notice">
          Add a NewsAPI key to <code>.env.local</code> to load Thunder news
          (free at newsapi.org/register).
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {!result && !error && <p className="status">Loading news…</p>}
      {result && result.articles?.length > 0 && articles.length === 0 && (
        <p className="status">No headlines match “{query}”.</p>
      )}
      {result?.articles?.length === 0 && (
        <p className="status">No articles found for this date range. Try widening it.</p>
      )}

      <div className="news-list">
        {articles.map((a, i) => (
          <a key={i} className="news-item" href={a.url} target="_blank" rel="noreferrer">
            {a.image && (
              <img
                className="news-thumb"
                src={a.image}
                alt=""
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            <div className="news-body">
              <h3>{a.title}</h3>
              {a.description && <p>{a.description}</p>}
              <div className="news-meta">
                {a.source} · {a.publishedAt ? new Date(a.publishedAt).toLocaleDateString() : ''}
              </div>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
