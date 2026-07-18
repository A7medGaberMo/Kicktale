'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AmbientGlow from './components/AmbientGlow';

export default function AutoInit() {
  const router = useRouter();
  const [status, setStatus] = useState('Bootstrapping the War Room...');
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const trigger = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStatus('Scouting fixtures and generating AI insights...');
    setError(null);
    try {
      const res = await fetch('/api/sync?league=ALL');
      const data = await res.json();
      if (data.success && data.count > 0) {
        setStatus('Done! Loading dashboard...');
        router.refresh();
      } else if (data.success && data.count === 0) {
        setStatus('No upcoming matches found in the 48h window.');
        setError('Try again later or use a different competition.');
        setRunning(false);
      } else if (res.status === 404) {
        setStatus('No matches returned from the data source.');
        setError('Check API key connectivity or try again.');
        setRunning(false);
      } else {
        setStatus('Pipeline encountered an issue.');
        setError(data.error || data.message || 'Unknown error');
        setRunning(false);
      }
    } catch (e: any) {
      setStatus('Network error');
      setError(e.message);
      setRunning(false);
    }
  }, [router, running]);

  useEffect(() => { trigger(); }, [trigger]);

  return (
    <main className="kt-container">
      <AmbientGlow />
      <nav className="kt-nav">
        <div className="kt-nav-brand">
          <Image src="/logo.png" alt="Kicktale" className="kt-nav-logo" width={40} height={40} priority />
          <span className="kt-nav-title">Kicktale</span>
          <span className="kt-nav-tagline"> &mdash; Every match tells a story.</span>
        </div>
      </nav>
      <div className="kt-empty anim-fade-up">
        {running ? (
          <>
            <div className="kt-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold-bright)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 9.9-1" />
              </svg>
            </div>
            <div className="kt-spinner" />
            <h2>{status}</h2>
            <p>This may take a minute — AI agents are analyzing matches.</p>
          </>
        ) : (
          <>
            <div className="kt-empty-icon">
              {error ? (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              ) : (
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--gold-bright)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6L8.5 2l6.5 4-6.5 4L2 6z" />
                  <path d="M8.5 2v8" />
                  <circle cx="8.5" cy="10" r="2.5" />
                  <path d="M13 13.5l5-5" />
                  <path d="M13 17l2-2" />
                  <path d="M15 19l5-5" />
                </svg>
              )}
            </div>
            <h2>{status}</h2>
            {error && <p className="kt-error-msg">{error}</p>}
            <button className="kt-btn" onClick={trigger}>Retry</button>
          </>
        )}
      </div>
    </main>
  );
}
