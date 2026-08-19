"use client";

import React from "react";

function SkeletonBlock({
  width = "100%",
  height = 16,
  borderRadius = 4,
  style,
}: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="kt-skeleton"
      style={{ width, height, borderRadius, ...style }}
    />
  );
}

export function SpotlightSkeleton() {
  return (
    <div className="kt-spotlight">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <SkeletonBlock width={90} height={22} borderRadius={4} />
          <SkeletonBlock width={100} height={22} borderRadius={4} />
        </div>
        <SkeletonBlock width={60} height={24} borderRadius={6} />
      </div>
      <div className="kt-spotlight-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SkeletonBlock width="85%" height={32} borderRadius={6} />
          <SkeletonBlock width="100%" height={14} />
          <SkeletonBlock width="98%" height={14} />
          <SkeletonBlock width="92%" height={14} />
          <SkeletonBlock width="70%" height={14} />
          <SkeletonBlock width={110} height={30} borderRadius={6} style={{ marginTop: 8 }} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            background: "var(--bg-surface-2)",
            padding: 20,
            borderRadius: 14,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
              <SkeletonBlock width={48} height={48} borderRadius={9999} />
              <SkeletonBlock width={70} height={12} />
            </div>
            <SkeletonBlock width={36} height={24} borderRadius={4} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1 }}>
              <SkeletonBlock width={48} height={48} borderRadius={9999} />
              <SkeletonBlock width={70} height={12} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <SkeletonBlock width={70} height={20} borderRadius={4} />
            <SkeletonBlock width={60} height={20} borderRadius={4} />
            <SkeletonBlock width={80} height={20} borderRadius={4} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchCardSkeleton() {
  return (
    <div className="kt-match">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SkeletonBlock width={70} height={12} />
        <SkeletonBlock width={36} height={12} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
          <SkeletonBlock width={36} height={36} borderRadius={9999} />
          <SkeletonBlock width={60} height={10} />
        </div>
        <SkeletonBlock width={26} height={20} borderRadius={4} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
          <SkeletonBlock width={36} height={36} borderRadius={9999} />
          <SkeletonBlock width={60} height={10} />
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-hairline)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
        <SkeletonBlock width="90%" height={11} />
        <SkeletonBlock width="65%" height={11} />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <main className="kt-container">
      <nav className="kt-nav">
        <div className="kt-nav-brand">
          <SkeletonBlock width={36} height={36} borderRadius={6} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width={140} height={10} />
          </div>
        </div>
        <div className="kt-nav-actions">
          <SkeletonBlock width={36} height={36} borderRadius={10} />
          <SkeletonBlock width={36} height={36} borderRadius={10} />
        </div>
      </nav>

      <div style={{ display: "flex", gap: 6, overflowX: "hidden" }}>
        <SkeletonBlock width={85} height={28} borderRadius={9999} />
        <SkeletonBlock width={120} height={28} borderRadius={9999} />
        <SkeletonBlock width={110} height={28} borderRadius={9999} />
        <SkeletonBlock width={95} height={28} borderRadius={9999} />
      </div>

      <SpotlightSkeleton />

      <div className="kt-split">
        <div className="kt-column">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <SkeletonBlock width={140} height={18} />
            <SkeletonBlock width={32} height={18} borderRadius={9999} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </div>
        </div>
        <div className="kt-column">
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <SkeletonBlock width={120} height={18} />
            <SkeletonBlock width={32} height={18} borderRadius={9999} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <MatchCardSkeleton />
            <MatchCardSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}