'use client';
import { useState } from 'react';

const Badge = ({ type }) => {
  const cls = type === 'reddit' ? 'badge-reddit' : type === 'tweet' ? 'badge-tweet' : 'badge-article';
  const label = type === 'reddit' ? 'FAN POST' : type === 'tweet' ? 'TWEET' : 'ARTICLE';
  return <span className={`badge ${cls}`}>{label}</span>;
};

export default function PulsePage() {
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [sources, setSources] = useState({ news: true, reddit: true, twitter: true });

  function toggleSource(key) {
    setSources((s) => ({ ...s, [key]: !s[key] }));
  }

  async function analyze() {
    if (!query.trim() || loading) return;
    if (!sources.news && !sources.reddit && !sources.twitter) {
      setError('Pick at least one source (News, Reddit, or Twitter).');
      return;
    }
    setLoading(true); setError(null); setReport(null); setShowSources(false);
    try {
      const res = await fetch('/api/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, from: from || undefined, to: to || undefined, sources }),
      });
      const data = await res.json();
      if (data.error) setError(data.error); else setReport(data);
    } catch {
      setError('Could not reach the analysis service.');
    } finally { setLoading(false); }
  }

  const needleLeft = report ? `${((report.overallScore + 1) / 2) * 100}%` : '50%';

  return (
    <>
      <h1 className="page-title">Fan Pulse</h1>
      <p className="page-sub">
        Ask about any Thunder player or topic — &quot;SGA&quot;, &quot;Chet Holmgren&quot;,
        &quot;trade deadline&quot;. Fan posts from Reddit and recent online articles are
        gathered and scored with Gemini sentiment analysis. Every source is cited.
      </p>

      <div className="pulse-form">
        <div className="grow">
          <label className="field-label" htmlFor="pulse-query">Player or topic</label>
          <input
            id="pulse-query"
            value={query}
            placeholder="How do fans feel about… SGA"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
          />
        </div>
        <div>
          <label className="field-label" htmlFor="pulse-from">From (optional)</label>
          <input id="pulse-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="pulse-to">To (optional)</label>
          <input id="pulse-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button className="btn" onClick={analyze} disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze'}
        </button>
      </div>

      <div className="source-picker" role="group" aria-label="Sources to crawl">
        <span className="field-label" style={{ marginBottom: 0 }}>Crawl:</span>
        {[
          ['news', 'News'],
          ['reddit', 'Reddit'],
          ['twitter', 'Twitter'],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`source-toggle ${sources[key] ? 'on' : ''}`}
            onClick={() => toggleSource(key)}
            aria-pressed={sources[key]}
          >
            {sources[key] ? '✓ ' : ''}{label}
          </button>
        ))}
      </div>

      <p className="sample-note" style={{ marginBottom: 16 }}>
        Leave dates empty for the current pulse (last two weeks), or set a range to look back —
        e.g. how fans felt during a past stretch.
      </p>

      {error && <p className="error">{error}</p>}
      {loading && <p className="status">Gathering posts and articles, scoring sentiment — about 10 seconds…</p>}
      {report?.sampleSize === 0 && (
        <p className="status">No recent chatter or coverage found for that. Try a different name or spelling.</p>
      )}

      {report && report.sampleSize > 0 && (
        <section aria-live="polite" className="report-card">
          <div className="verdict">{report.verdict}</div>
          <div className="sample-note">
            Overall score {report.overallScore}{from || to ? ` · ${from || 'earliest'} → ${to || 'today'}` : ''} · {report.sampleSize} items analyzed
            {report.mix && <> ({report.mix.reddit} fan posts, {report.mix.tweets ?? 0} tweets, {report.mix.articles} articles)</>} ·{' '}
            {report.breakdown.positive} positive / {report.breakdown.neutral} neutral / {report.breakdown.negative} negative
          </div>

          <div className="meter" role="img" aria-label={`Sentiment ${report.overallScore} on a scale from -1 to +1`}>
            <div className="meter-track"><div className="meter-needle" style={{ left: needleLeft }} /></div>
            <div className="meter-labels"><span>NEGATIVE −1</span><span>0</span><span>POSITIVE +1</span></div>
          </div>

          <div className="pulse-grid">
            <div className="quote-col">
              <h3>Loudest praise</h3>
              {report.mostPositive.map((q, i) => (
                <a key={i} className="quote" href={q.url} target="_blank" rel="noreferrer">
                  {q.text}
                  <div className="quote-meta">
                    <Badge type={q.sourceType} /> {q.source} · <span className="score-pos">{q.score > 0 ? '+' : ''}{q.score}</span>
                  </div>
                </a>
              ))}
            </div>
            <div className="quote-col">
              <h3>Loudest criticism</h3>
              {report.mostNegative.map((q, i) => (
                <a key={i} className="quote" href={q.url} target="_blank" rel="noreferrer">
                  {q.text}
                  <div className="quote-meta">
                    <Badge type={q.sourceType} /> {q.source} · <span className="score-neg">{q.score}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div className="sources-section">
            <button className="btn btn-ghost" onClick={() => setShowSources((s) => !s)}>
              {showSources ? 'Hide' : 'Show'} all {report.sources?.length || 0} sources
            </button>
            {showSources && (
              <ol className="sources-list">
                {report.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} target="_blank" rel="noreferrer">{s.text.slice(0, 110)}…</a>
                    <span className="quote-meta">
                      {' '}<Badge type={s.sourceType} /> {s.source} ·{' '}
                      <span className={s.score >= 0 ? 'score-pos' : 'score-neg'}>
                        {s.score > 0 ? '+' : ''}{s.score}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      )}
    </>
  );
}
