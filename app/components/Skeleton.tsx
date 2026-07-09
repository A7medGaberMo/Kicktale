"use client";

import React from 'react';

function SkeletonBlock({ width = '100%', height = 16, borderRadius = 6 }: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
}) {
  return <div className="kt-skeleton" style={{ width, height, borderRadius }} />;
}

export function SpotlightSkeleton() {
  return (
    <div className="kt-spotlight">
      <div className="kt-spotlight-ambient" />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <SkeletonBlock width={160} height={20} />
        <SkeletonBlock width={80} height={20} />
      </div>
      <div className="kt-spotlight-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SkeletonBlock width={140} height={18} />
          <SkeletonBlock width="90%" height={32} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="65%" height={14} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <SkeletonBlock width={52} height={52} borderRadius={50} />
              <SkeletonBlock width={80} height={14} />
            </div>
            <SkeletonBlock width={32} height={32} borderRadius={8} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <SkeletonBlock width={52} height={52} borderRadius={50} />
              <SkeletonBlock width={80} height={14} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <SkeletonBlock width={80} height={22} borderRadius={8} />
            <SkeletonBlock width={70} height={22} borderRadius={8} />
            <SkeletonBlock width={90} height={22} borderRadius={8} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="kt-match">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <SkeletonBlock width={60} height={14} />
        <SkeletonBlock width={36} height={14} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <SkeletonBlock width={36} height={36} borderRadius={50} />
          <SkeletonBlock width={70} height={12} />
        </div>
        <SkeletonBlock width={28} height={22} borderRadius={6} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <SkeletonBlock width={36} height={36} borderRadius={50} />
          <SkeletonBlock width={70} height={12} />
        </div>
      </div>
      <SkeletonBlock width={100} height={14} />
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <SkeletonBlock width="80%" height={14} />
        <SkeletonBlock width="60%" height={14} />
      </div>
    </div>
  );
}

export function MatchGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="kt-match-grid">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="kt-container">
      <nav className="kt-nav">
        <div className="kt-nav-brand">
          <SkeletonBlock width={40} height={40} borderRadius={10} />
          <SkeletonBlock width={120} height={24} />
        </div>
        <div className="kt-nav-actions">
          <SkeletonBlock width={38} height={38} borderRadius={50} />
          <SkeletonBlock width={38} height={38} borderRadius={50} />
        </div>
      </nav>
      <SpotlightSkeleton />
      <div style={{ display: 'flex', gap: 10 }}>
        <SkeletonBlock width={100} height={30} borderRadius={20} />
        <SkeletonBlock width={80} height={30} borderRadius={20} />
        <SkeletonBlock width={90} height={30} borderRadius={20} />
      </div>
      <MatchGridSkeleton count={6} />
    </main>
  );
}