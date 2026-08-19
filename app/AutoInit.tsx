'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AmbientGlow from './components/AmbientGlow';

export default function AutoInit() {
  const router = useRouter();
  const [status, setStatus] = useState('Initializing Football Intelligence...');
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const trigger = useCallback(async () => {
    if (running) return;
    setRunning(true);
    setStatus('Scouting fixtures and synthesizing tactical narratives...');
    setError(null);
    try {
      const res = await fetch('/api/sync?league=ALL');
      const data = await res.json();
      if (data.success && data.count > 0) {
        setStatus('Analysis complete! Loading dashboard...');
        router.refresh();
      } else if (data.success && data.count === 0) {
        setStatus('No upcoming matches found in the active window.');
        setError('Try again later or check back soon.');
        setRunning(false);
      } else if (res.status === 404) {
        setStatus('No matches returned from data source.');
        setError('Check API configuration or try again.');
        setRunning(false);
      } else {
        setStatus('Intelligence pipeline encountered an issue.');
        setError(data.error || data.message || 'Unknown error');
        setRunning(false);
      }
    } catch (e: any) {
      setStatus('Network connection error');
      setError(e.message);
      setRunning(false);
    }
  }, [router, running]);

  useEffect(() => {
    trigger();
  }, [trigger]);

  return (
    <main className="kt-container">
      <AmbientGlow />
      <header className="kt-app-header">
        <nav className="kt-nav">
          <div className="kt-nav-brand">
            <Image
              src="/logo.png"
              alt="Kicktale"
              className="kt-nav-logo"
              width={36}
              height={36}
              priority
            />
            <div className="kt-nav-text-group">
              <span className="kt-nav-title">Kicktale</span>
              <span className="kt-nav-tagline">AI Match Intelligence &amp; Narratives</span>
            </div>
          </div>
        </nav>
      </header>

      <div className="kt-empty anim-fade-up">
        {running ? (
          <>
            <div className="kt-spinner" />
            <h2>{status}</h2>
            <p>AI agents are researching head-to-head records, tactical formations, and injury impacts.</p>
          </>
        ) : (
          <>
            <div className="kt-empty-icon" style={{ color: error ? 'var(--status-live)' : 'var(--gold-primary)' }}>
              {error ? (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              ) : (
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
              )}
            </div>
            <h2>{status}</h2>
            {error && <p className="kt-error-msg">{error}</p>}
            <button className="kt-btn" onClick={trigger} style={{ marginTop: 8 }}>
              Try Again
            </button>
          </>
        )}
      </div>
    </main>
  );
}

