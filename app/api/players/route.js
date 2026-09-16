import { NextResponse } from 'next/server';
import { getRoster, getPlayerStats } from '@/lib/stats';

// Roster + stats come straight from ESPN's public API (no key required) —
// runs entirely inside this route, no separate service to host or run.
export async function GET(request) {
  const id = new URL(request.url).searchParams.get('id');
  try {
    if (id) return NextResponse.json(await getPlayerStats(id));
    return NextResponse.json(await getRoster());
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Failed to load stats.' }, { status: 502 });
  }
}
