// OKC Thunder roster + season stats, sourced directly from ESPN's public
// (unauthenticated, no-key-required) JSON API. This runs entirely inside
// the Next.js server — no separate Python/FastAPI process needed, so it
// works out of the box on Firebase App Hosting.
//
// Endpoints used (undocumented but stable and widely relied upon):
//   https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{team}/roster
//   https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/{id}/stats

const TEAM = 'okc';
const ROSTER_URL = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${TEAM}/roster`;
const STATS_URL = (id) =>
  `https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/athletes/${id}/stats`;

// Averages category "names" order is fixed by ESPN; map to the indices we need.
const STAT_INDEX = {
  gamesPlayed: 0,
  ppg: 17,
  rpg: 11,
  apg: 12,
  spg: 14,
  bpg: 13,
  fgPct: 4,
  threePct: 6,
};

let rosterCache = null;
let rosterCacheAt = 0;
const statsCache = new Map(); // id -> { data, at }
const CACHE_MS = 60 * 60 * 1000; // 1 hour, mirrors the old service's in-memory cache

async function fetchJson(url) {
  const res = await fetch(url, {
    next: { revalidate: 3600 },
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ThunderMentions/1.0 (+https://github.com/zzthecoder/ThunderMentions)',
    },
  });
  if (!res.ok) throw new Error(`ESPN request failed (${res.status})`);
  return res.json();
}

function formatHeight(inches) {
  if (!inches) return '—';
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches % 12);
  return `${ft}' ${inch}"`;
}

export async function getRoster() {
  if (rosterCache && Date.now() - rosterCacheAt < CACHE_MS) return rosterCache;

  const data = await fetchJson(ROSTER_URL);
  const players = (data.athletes || [])
    .map((a) => ({
      id: String(a.id),
      name: a.fullName,
      jersey: a.jersey || '—',
      position: a.position?.abbreviation || '—',
      height: a.displayHeight || formatHeight(a.height),
      weight: a.displayWeight || (a.weight ? `${a.weight} lbs` : '—'),
      age: a.age ?? null,
      headshot: a.headshot?.href || null,
    }))
    .sort((a, b) => {
      const aj = parseInt(a.jersey, 10);
      const bj = parseInt(b.jersey, 10);
      if (!Number.isNaN(aj) && !Number.isNaN(bj)) return aj - bj;
      if (!Number.isNaN(aj)) return -1;
      if (!Number.isNaN(bj)) return 1;
      return a.name.localeCompare(b.name);
    });

  rosterCache = players;
  rosterCacheAt = Date.now();
  return players;
}

export async function getPlayerStats(id) {
  const cached = statsCache.get(id);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.data;

  const data = await fetchJson(STATS_URL(id));
  const averages = (data.categories || []).find((c) => c.name === 'averages');
  const rows = averages?.statistics || [];
  const latest = rows[rows.length - 1];

  let result;
  if (!latest || !latest.stats?.length) {
    result = { available: false };
  } else {
    const s = latest.stats;
    const gp = Number(s[STAT_INDEX.gamesPlayed]) || 0;
    if (!gp) {
      result = { available: false };
    } else {
      result = {
        available: true,
        label: `${latest.season?.displayName || ''} season · ${gp} GP`.trim(),
        ppg: s[STAT_INDEX.ppg],
        rpg: s[STAT_INDEX.rpg],
        apg: s[STAT_INDEX.apg],
        spg: s[STAT_INDEX.spg],
        bpg: s[STAT_INDEX.bpg],
        fgPct: `${s[STAT_INDEX.fgPct]}%`,
        threePct: `${s[STAT_INDEX.threePct]}%`,
      };
    }
  }

  statsCache.set(id, { data: result, at: Date.now() });
  return result;
}
