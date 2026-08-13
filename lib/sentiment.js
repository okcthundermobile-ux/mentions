// Sentiment via the Gemini API (GEMINI_API_KEY in .env).
// Free key: https://aistudio.google.com/apikey
// Replaces the previous GCP Natural Language implementation — no gcloud
// auth needed, one batched call scores every snippet, and Gemini also
// provides a short rationale per item.

// 'gemini-flash-latest' always resolves to the current stable Flash model,
// so it won't break when specific versions are deprecated for new keys.
const MODEL = 'gemini-flash-latest';

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is not set. Add it to .env.local');
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini API error ${res.status}`);
  }
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
}

function parseJsonArray(raw) {
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return null;
}

// Score every post in ONE Gemini call. Returns a map of index -> score in [-1, 1].
async function scoreBatch(query, texts) {
  const numbered = texts.map((t, i) => `${i}. ${t.replace(/\s+/g, ' ').slice(0, 400)}`).join('\n');
  const prompt = `You are a sentiment analysis engine. The following are fan posts and article snippets about "${query}" (Oklahoma City Thunder NBA context).

${numbered}

For EACH numbered item, rate the sentiment TOWARD "${query}" specifically (not toward opponents or other topics) on a scale from -1.0 (very negative) to +1.0 (very positive). Neutral reporting or mixed feelings = near 0.

Return ONLY a valid JSON array with one object per item, in order, no markdown:
[{"i": 0, "score": 0.0}, ...]`;

  const raw = await callGemini(prompt);
  const parsed = parseJsonArray(raw);
  const scores = new Map();
  if (parsed) {
    for (const item of parsed) {
      const i = Number(item.i);
      const s = Number(item.score);
      if (Number.isInteger(i) && Number.isFinite(s)) {
        scores.set(i, Math.max(-1, Math.min(1, s)));
      }
    }
  }
  return scores;
}

export async function buildReport(query, posts) {
  // Batch in groups of 20 to stay well inside output token limits.
  const items = [];
  for (let start = 0; start < posts.length; start += 20) {
    const batch = posts.slice(start, start + 20);
    try {
      const scores = await scoreBatch(query, batch.map((p) => p.text));
      batch.forEach((post, j) => {
        const score = scores.get(j);
        if (score !== undefined) items.push({ ...post, score });
      });
    } catch (err) {
      // If Gemini fails entirely (no key, quota), surface it on the first batch.
      if (start === 0) throw err;
    }
  }

  if (items.length === 0) {
    return { query, sampleSize: 0 };
  }

  const overall = items.reduce((sum, i) => sum + i.score, 0) / items.length;
  const positive = items.filter((i) => i.score > 0.15);
  const negative = items.filter((i) => i.score < -0.15);
  const neutral = items.length - positive.length - negative.length;
  const byScore = [...items].sort((a, b) => b.score - a.score);

  return {
    query,
    sampleSize: items.length,
    overallScore: Number(overall.toFixed(2)),
    verdict:
      overall > 0.25 ? 'Strongly positive'
      : overall > 0.05 ? 'Leaning positive'
      : overall < -0.25 ? 'Strongly negative'
      : overall < -0.05 ? 'Leaning negative'
      : 'Mixed / neutral',
    breakdown: {
      positive: positive.length,
      neutral,
      negative: negative.length,
    },
    mostPositive: byScore.slice(0, 3).map(pick),
    mostNegative: byScore.slice(-3).reverse().map(pick),
    // Every item that went into the analysis, for full source attribution.
    sources: byScore.map(pick),
    generatedAt: new Date().toISOString(),
  };
}

const pick = (i) => ({
  text: i.text.slice(0, 280),
  score: Number(i.score.toFixed(2)),
  source: i.source || 'Unknown',
  sourceType: i.sourceType || 'article',
  url: i.url,
});
