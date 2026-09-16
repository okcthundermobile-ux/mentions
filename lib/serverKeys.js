// Reads user-supplied API keys from the `x-api-keys` request header.
// Keys pasted on the /connect page are stored client-side (localStorage)
// and sent with each request so the server can use them instead of (or in
// addition to) server-side environment variables. Never logged, never
// persisted server-side.

export function parseApiKeys(request) {
  try {
    const raw = request.headers.get('x-api-keys');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
