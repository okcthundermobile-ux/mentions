import { NextResponse } from 'next/server';
import { getNews } from '@/lib/news';
import { parseApiKeys } from '@/lib/serverKeys';

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const apiKeys = parseApiKeys(request);
  try {
    const result = await getNews({
      from: params.get('from') || undefined,
      to: params.get('to') || undefined,
      apiKeys,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
