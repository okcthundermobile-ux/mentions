'use client';
import { useEffect, useState } from 'react';

export default function RosterPage() {
  const [players, setPlayers] = useState(null);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({}); // id -> stats | 'loading'

  useEffect(() => {
    fetch('/api/players')
      .then((r) => r.json())
      .then((data) => (data.error ? setError(data.error) : setPlayers(data)))
      .catch(() => setError('Could not reach the stats service.'));
  }, []);

  async function toggleStats(id) {
    if (stats[id]) {
      setStats((s) => ({ ...s, [id]: undefined }));
      return;
    }
    setStats((s) => ({ ...s, [id]: 'loading' }));
    const res = await fetch(`/api/players?id=${id}`);
    const data = await res.json();
    setStats((s) => ({ ...s, [id]: data }));
  }

  return (
    <>
      <h1 className="page-title">Roster &amp; Stats</h1>
      <p className="page-sub">
        The current Oklahoma City Thunder roster. Select a player to load their
        season averages.
      </p>

      {error && <p className="error">{error}</p>}
      {!players && !error && <p className="status">Loading roster…</p>}

      <div className="roster-grid">
        {players?.map((p) => {
          const s = stats[p.id];
          return (
            <button key={p.id} className="player-card" onClick={() => toggleStats(p.id)}>
              <div className="player-top">
                {p.headshot ? (
                  <img
                    className="player-photo"
                    src={p.headshot}
                    alt={`${p.name} headshot`}
                    onError={(e) => { e.currentTarget.outerHTML = `<span class="player-num-fallback">#${p.jersey}</span>`; }}
                  />
                ) : (
                  <span className="player-num-fallback">#{p.jersey}</span>
                )}
                <div>
                  <div className="player-name">{p.name}</div>
                  <div className="player-meta">
                    #{p.jersey} · {p.position} · {p.height} · {p.weight}
                  </div>
                </div>
              </div>
              {s === 'loading' && <div className="player-meta" style={{ marginTop: 12 }}>Loading stats…</div>}
              {s && s !== 'loading' && s.available && (
                <div className="player-stats">
                  <div><div className="stat-val">{s.ppg}</div><div className="stat-label">PPG</div></div>
                  <div><div className="stat-val">{s.rpg}</div><div className="stat-label">RPG</div></div>
                  <div><div className="stat-val">{s.apg}</div><div className="stat-label">APG</div></div>
                </div>
              )}
              {s && s !== 'loading' && s.available === false && (
                <div className="player-meta" style={{ marginTop: 12 }}>No season stats available.</div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
