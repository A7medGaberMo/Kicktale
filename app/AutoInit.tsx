'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
      const res = await fetch('/api/cron?league=WC');
      const data = await res.json();
      if (data.success && data.processedCount > 0) {
        setStatus('Done! Loading dashboard...');
        router.refresh();
      } else if (data.success && data.processedCount === 0) {
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
          <img src="/logo.png" alt="Kicktale" className="kt-nav-logo" />
          <span className="kt-nav-title">Kicktale</span>
          <span className="kt-nav-tagline"> &mdash; The Autonomous War Room</span>
        </div>
      </nav>
      <div className="kt-empty anim-fade-up">
        {running ? (
          <>
            <div className="kt-empty-icon">🤖</div>
            <div className="kt-spinner" />
            <h2>{status}</h2>
            <p>This may take a minute — AI agents are analyzing matches.</p>
          </>
        ) : (
          <>
            <div className="kt-empty-icon">{error ? '⚠️' : '📡'}</div>
            <h2>{status}</h2>
            {error && <p className="kt-error-msg">{error}</p>}
            <button className="kt-btn" onClick={trigger}>Retry</button>
          </>
        )}
      </div>
    </main>
  );
}