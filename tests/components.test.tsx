import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('Component smoke tests', () => {
  it('Header renders brand and action buttons', async () => {
    const { Header } = await import('@/app/components/Header');
    const { container } = render(<Header onOpenAdmin={() => {}} onRefresh={() => {}} />);
    expect(container.querySelector('.kt-nav-brand')).toBeTruthy();
    expect(screen.getByText('Kicktale')).toBeTruthy();
    expect(container.querySelectorAll('.kt-icon-btn').length).toBe(2);
  });

  it('EmptyState renders loading state', async () => {
    const { EmptyState } = await import('@/app/components/EmptyState');
    render(<EmptyState loading={true} error={null} onRetry={() => {}} />);
    expect(screen.getByText('Loading matches...')).toBeTruthy();
  });

  it('EmptyState renders error state', async () => {
    const { EmptyState } = await import('@/app/components/EmptyState');
    render(<EmptyState loading={false} error="Test error" onRetry={() => {}} />);
    expect(screen.getByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('Test error')).toBeTruthy();
  });

  it('EmptyState renders empty state', async () => {
    const { EmptyState } = await import('@/app/components/EmptyState');
    render(<EmptyState loading={false} error={null} onRetry={() => {}} />);
    expect(screen.getByText('No matches found')).toBeTruthy();
  });

  it('AdminPanel does not render when closed', async () => {
    const { AdminPanel } = await import('@/app/components/AdminPanel');
    const { container } = render(
      <AdminPanel isOpen={false} onClose={() => {}} isTriggering={false} triggerLog={null} onTrigger={async () => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('AdminPanel renders when open', async () => {
    const { AdminPanel } = await import('@/app/components/AdminPanel');
    render(
      <AdminPanel isOpen={true} onClose={() => {}} isTriggering={false} triggerLog="test log" onTrigger={async () => {}} />
    );
    expect(screen.getByText('Pipeline Controls')).toBeTruthy();
    expect(screen.getByText('Run Pipeline')).toBeTruthy();
    expect(screen.getByText('Force Regenerate')).toBeTruthy();
    expect(screen.getByText('test log')).toBeTruthy();
  });

  it('Skeleton components render without crashing', async () => {
    const { DashboardSkeleton, SpotlightSkeleton, MatchCardSkeleton, MatchGridSkeleton } = await import('@/app/components/Skeleton');
    const { container: c1 } = render(<DashboardSkeleton />);
    expect(c1.querySelector('.kt-skeleton')).toBeTruthy();

    const { container: c2 } = render(<SpotlightSkeleton />);
    expect(c2.querySelector('.kt-skeleton')).toBeTruthy();

    const { container: c3 } = render(<MatchCardSkeleton />);
    expect(c3.querySelector('.kt-skeleton')).toBeTruthy();

    const { container: c4 } = render(<MatchGridSkeleton count={4} />);
    expect(c4.querySelectorAll('.kt-skeleton').length).toBeGreaterThanOrEqual(4);
  });

  it('PillarIcon renders all pillar types', async () => {
    const { PillarIcon } = await import('@/app/components/PillarIcon');
    const types = ['H2HHistory', 'RecordsMilestones', 'FormGuide', 'MemorableMeeting',
      'StorylinesStakes', 'TacticalAngle', 'Prediction', 'VenueConditions',
      'RefereeWatch', 'InjuryImpact', 'PostMatchRecap', 'Unknown'];
    for (const type of types) {
      const { container } = render(<PillarIcon type={type} size={16} />);
      expect(container.querySelector('svg')).toBeTruthy();
    }
  });

  it('MatchCard renders fixture data', async () => {
    const { MatchCard } = await import('@/app/components/MatchCard');
    const fixture = {
      id: 1,
      home_team_name: 'Switzerland',
      away_team_name: 'Algeria',
      status: 'SCHEDULED',
      utc_date: new Date().toISOString(),
      stage: 'GROUP_STAGE',
      insights: [{ insight_type: 'Prediction', title: 'Test insight', content: 'Content', score: 80, confidence: 0.9 }],
      home_team_crest: '', away_team_crest: '',
      competition_code: 'WC', group_name: null, home_team_id: 1, away_team_id: 2,
      score_fulltime: null, matchday: null, is_spotlight: false,
    } as any;
    render(<MatchCard
      fixture={fixture}
      formatTime={() => '12:00'}
      formatDate={() => 'Today'}
    />);
    expect(screen.getByText('Switzerland')).toBeTruthy();
    expect(screen.getByText('Algeria')).toBeTruthy();
    expect(screen.getByText('GROUP STAGE')).toBeTruthy();
    expect(screen.getByText('Test insight')).toBeTruthy();
  });
});
