'use client';
import { useEffect, useState } from 'react';
import { getStoredKeys, saveStoredKeys, clearStoredKeys } from '@/lib/clientKeys';

const FIELDS = [
  {
    key: 'geminiKey',
    label: 'Gemini API Key',
    placeholder: 'AIza…',
    help: 'Powers Fan Pulse sentiment scoring.',
    link: 'https://aistudio.google.com/apikey',
    linkLabel: 'Get a free key at aistudio.google.com',
  },
  {
    key: 'newsApiKey',
    label: 'NewsAPI.org Key',
    placeholder: 'e.g. c545b90d…',
    help: 'Powers the News page and one Fan Pulse article source.',
    link: 'https://newsapi.org/register',
    linkLabel: 'Register free at newsapi.org',
  },
  {
    key: 'apifyToken',
    label: 'Apify API Token',
    placeholder: 'apify_api_…',
    help: 'Powers Reddit + Twitter/X gathering and the web-scraper article source for Fan Pulse.',
    link: 'https://console.apify.com/account/integrations',
    linkLabel: 'Get your token from the Apify console',
  },
];

export default function ConnectPage() {
  const [keys, setKeys] = useState(null);
  const [savedKeys, setSavedKeys] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredKeys();
    setKeys(stored);
    setSavedKeys(stored);
  }, []);

  function update(key, value) {
    setKeys((k) => ({ ...k, [key]: value }));
    setSaved(false);
  }

  function save() {
    saveStoredKeys(keys);
    setSavedKeys(keys);
    setSaved(true);
  }

  function clearAll() {
    clearStoredKeys();
    const stored = getStoredKeys();
    setKeys(stored);
    setSavedKeys(stored);
    setSaved(false);
  }

  const connectedCount = savedKeys
    ? Object.values(savedKeys).filter((v) => v.trim()).length
    : 0;
  const isDirty = keys && savedKeys && JSON.stringify(keys) !== JSON.stringify(savedKeys);

  return (
    <>
      <h1 className="page-title">Connect APIs</h1>
      <p className="page-sub">
        Thunder Mentions calls a few free (and optional) APIs for news, sentiment, and
        social data. Paste your own keys below — they&apos;re saved{' '}
        <strong>only in this browser&apos;s local storage</strong> and sent to this
        app&apos;s own <code>/api/*</code> routes with each request. Keys are never
        written to a file, never committed to git, and never sent to any
        third-party server.
      </p>

      <div className="notice">
        Prefer environment variables instead? Set the same values as server-side
        env vars (<code>.env.local</code> locally, or Secret Manager values via{' '}
        <code>apphosting.yaml</code> when deployed) and skip this page entirely.
        Keys pasted here take priority over environment variables whenever both
        are set.
      </div>

      {keys && (
        <>
          <div className="connect-grid">
            {FIELDS.map((f) => (
              <div key={f.key} className="connect-field">
                <label className="field-label" htmlFor={f.key}>{f.label}</label>
                <input
                  id={f.key}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={keys[f.key] || ''}
                  placeholder={f.placeholder}
                  onChange={(e) => update(f.key, e.target.value)}
                />
                <p className="connect-help">
                  {f.help}
                  {f.link && (
                    <>
                      {' '}
                      <a href={f.link} target="_blank" rel="noreferrer">{f.linkLabel} →</a>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>

          <div className="connect-actions">
            <button className="btn" onClick={save} disabled={!isDirty}>Save keys</button>
            <button className="btn btn-ghost" onClick={clearAll}>Clear all</button>
            {saved && <span className="status connect-saved">Saved to this browser.</span>}
            {isDirty && !saved && <span className="status connect-saved">Unsaved changes.</span>}
          </div>

          <p className="sample-note" style={{ marginTop: 24 }}>
            {connectedCount === 0
              ? 'No keys saved yet — pages will fall back to any server-side environment variables.'
              : `${connectedCount} key${connectedCount === 1 ? '' : 's'} saved in this browser.`}
          </p>
        </>
      )}
    </>
  );
}
