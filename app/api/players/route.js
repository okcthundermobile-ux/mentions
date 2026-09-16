import { NextResponse } from 'next/server';
import { parseApiKeys } from '@/lib/serverKeys';

// Roster + stats come from the local FastAPI service (stats_service.py),
// which wraps the official NBA Stats API via `nba_api`.
async function fetchService(base, path) {
  const res = await fetch(`${base}${path}`, { next: { revalidate: 3600 } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Stats service error ${res.status}`);
  }
  return res.json();
}

export async function GET(request) {
  const apiKeys = parseApiKeys(request);
  const STATS_SERVICE = apiKeys.statsServiceUrl || process.env.STATS_SERVICE_URL || 'http://localhost:8000';
  const id = new URL(request.url).searchParams.get('id');
  try {
    if (id) return NextResponse.json(await fetchService(STATS_SERVICE, `/stats/${id}`));
    const { players } = await fetchService(STATS_SERVICE, '/roster');
    return NextResponse.json(players);
  } catch (err) {
    return NextResponse.json(
      { error: `${err.message}. Is the stats service running? (uvicorn stats_service:app --port 8000)` },
      { status: 502 }
    );
  }
}
