import { NextResponse } from 'next/server';

// Roster + stats come from the local FastAPI service (stats_service.py),
// which wraps the official NBA Stats API via `nba_api`.
const STATS_SERVICE = process.env.STATS_SERVICE_URL || 'http://localhost:8000';

async function fetchService(path) {
  const res = await fetch(`${STATS_SERVICE}${path}`, { next: { revalidate: 3600 } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Stats service error ${res.status}`);
  }
  return res.json();
}

export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    if (id) return NextResponse.json(await fetchService(`/stats/${id}`));
    const { players } = await fetchService('/roster');
    return NextResponse.json(players);
  } catch (err) {
    return NextResponse.json(
      { error: `${err.message}. Is the stats service running? (uvicorn stats_service:app --port 8000)` },
      { status: 502 }
    );
  }
}
