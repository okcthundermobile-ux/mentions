'use client';

// Client-side storage for user-pasted API keys (see the /connect page).
// Keys live only in this browser's localStorage — never sent anywhere
// except as a header on this app's own /api/* requests, and never written
// to disk or committed to git.

const STORAGE_KEY = 'thunderhub:apiKeys';

export const DEFAULT_KEYS = {
  geminiKey: '',
  newsApiKey: '',
  apifyToken: '',
  googleCseKey: '',
  googleCseId: '',
  statsServiceUrl: '',
};

export function getStoredKeys() {
  if (typeof window === 'undefined') return { ...DEFAULT_KEYS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYS };
    return { ...DEFAULT_KEYS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_KEYS };
  }
}

export function saveStoredKeys(keys) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearStoredKeys() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

// Build the header to attach to fetch() calls. Empty values are stripped
// so they don't shadow server-side environment variables.
export function apiKeysHeader() {
  const keys = getStoredKeys();
  const nonEmpty = Object.fromEntries(
    Object.entries(keys).filter(([, v]) => typeof v === 'string' && v.trim())
  );
  if (Object.keys(nonEmpty).length === 0) return {};
  return { 'x-api-keys': JSON.stringify(nonEmpty) };
}
