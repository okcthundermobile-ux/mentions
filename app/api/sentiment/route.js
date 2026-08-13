import { NextResponse } from 'next/server';
import { gatherPosts } from '@/lib/reddit';
import { gatherArticles } from '@/lib/articles';
import { gatherTweets } from '@/lib/twitter';
import { buildReport } from '@/lib/sentiment';

export async function POST(request) {
  const { query, from, to, sources } = await request.json();
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: 'Enter a player or topic to analyze.' }, { status: 400 });
  }

  // Default to all sources when the client doesn't specify.
  const use = {
    news: sources?.news !== false,
    reddit: sources?.reddit !== false,
    twitter: sources?.twitter !== false,
  };
  if (!use.news && !use.reddit && !use.twitter) {
    return NextResponse.json({ error: 'Pick at least one source to crawl.' }, { status: 400 });
  }

  try {
    const q = query.trim();
    const range = from || to ? { from, to } : null;
    // Only crawl the sources the user selected. Disabled ones resolve to [].
    const [posts, tweets, articles] = await Promise.all([
      use.reddit ? gatherPosts(q, range) : Promise.resolve([]),
      use.twitter ? gatherTweets(q, range) : Promise.resolve([]),
      use.news ? gatherArticles(q, range) : Promise.resolve([]),
    ]);
    const combined = [...posts, ...tweets, ...articles];
    if (combined.length === 0) {
      return NextResponse.json({ query: q, sampleSize: 0, range });
    }
    const report = await buildReport(q, combined);
    report.mix = {
      reddit: posts.length,
      tweets: tweets.length,
      articles: articles.length,
    };
    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}
