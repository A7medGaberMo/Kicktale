"use client";

import React from "react";
import type { Fixture } from "@/app/hooks/useFixtures";

interface PillarWidgetProps {
  fixture: Fixture;
  pillar: string;
}

function getSeededRandom(seedStr: string) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return () => {
    const x = Math.sin(hash++) * 10000;
    return x - Math.floor(x);
  };
}

export function generateMockStats(fixture: Fixture, pillar: string) {
  const seed = `${fixture.id}-${pillar}`;
  const rand = getSeededRandom(seed);
  const homeWinProb = Math.floor(rand() * 25) + 40;
  const drawProb = Math.floor(rand() * 15) + 15;
  const awayWinProb = 100 - homeWinProb - drawProb;
  const homeForm = Array.from({ length: 5 }, () => { const i = Math.floor(rand() * 10); return i < 5 ? "W" : i < 8 ? "D" : "L"; });
  const awayForm = Array.from({ length: 5 }, () => { const i = Math.floor(rand() * 10); return i < 4 ? "W" : i < 7 ? "D" : "L"; });
  const homeAvgGoals = (rand() * 1.2 + 1.2).toFixed(2);
  const awayAvgGoals = (rand() * 1.0 + 1.0).toFixed(2);
  const systems = ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "3-4-3", "4-1-4-1"];
  const homeSystem = systems[Math.floor(rand() * systems.length)];
  const awaySystem = systems[Math.floor(rand() * systems.length)];
  const referees = [
    { name: "Szymon Marciniak", country: "Poland" },
    { name: "Daniele Orsato", country: "Italy" },
    { name: "Clement Turpin", country: "France" },
    { name: "Michael Oliver", country: "England" },
    { name: "Anthony Taylor", country: "England" },
    { name: "Danny Makkelie", country: "Netherlands" },
    { name: "Wilton Sampaio", country: "Brazil" }
  ];
  const ref = referees[Math.floor(rand() * referees.length)];
  const yellowPerMatch = (rand() * 1.8 + 3.2).toFixed(1);
  const redPerMatch = (rand() * 0.18 + 0.08).toFixed(2);
  const temps = ["17°C", "22°C", "25°C", "28°C", "31°C"];
  const conditions = ["Clear Sky", "Partly Cloudy", "Humid", "Windy", "Breezy"];
  const stadiums = ["Lusail Iconic Stadium", "Al Bayt Stadium", "Khalifa International Stadium", "Education City Stadium", "Ahmad Bin Ali Stadium", "Al Janoub Stadium"];
  const tempIdx = Math.floor(rand() * temps.length);
  const condIdx = Math.floor(rand() * conditions.length);
  const stadium = stadiums[Math.floor(rand() * stadiums.length)];
  const humidity = Math.floor(rand() * 30) + 40;
  const stadiumCap = Math.floor(rand() * 40000) + 45000;
  const hypeScore = (rand() * 2.8 + 7.2).toFixed(1);
  const h2hPlayed = Math.floor(rand() * 8) + 6;
  const h2hHomeWins = Math.floor(rand() * (h2hPlayed - 3)) + 1;
  const h2hAwayWins = Math.floor(rand() * (h2hPlayed - h2hHomeWins - 1)) + 1;
  const h2hDraws = h2hPlayed - h2hHomeWins - h2hAwayWins;
  const milestoneProgress = Math.floor(rand() * 30) + 65;
  return {
    homeWinProb, drawProb, awayWinProb,
    homeForm, awayForm, homeAvgGoals, awayAvgGoals,
    homeSystem, awaySystem,
    ref, yellowPerMatch, redPerMatch,
    temp: temps[tempIdx], condition: conditions[condIdx],
    stadium, humidity, stadiumCap,
    hypeScore, h2hPlayed, h2hHomeWins, h2hAwayWins, h2hDraws, milestoneProgress
  };
}

export const PillarWidget: React.FC<PillarWidgetProps> = ({ fixture, pillar }) => {
  const stats = generateMockStats(fixture, pillar);
  const homeInitial = fixture.home_team_name.substring(0, 3).toUpperCase();
  const awayInitial = fixture.away_team_name.substring(0, 3).toUpperCase();

  if (pillar === "Prediction") {
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">AI MATCH PREDICTION</h4>
        <div className="kt-prob-bar">
          <div className="kt-prob-seg home" style={{ width: `${stats.homeWinProb}%` }}>
            <span className="seg-lbl">{homeInitial}</span>
          </div>
          <div className="kt-prob-seg draw" style={{ width: `${stats.drawProb}%` }}>
            <span>DRW</span>
          </div>
          <div className="kt-prob-seg away" style={{ width: `${stats.awayWinProb}%` }}>
            <span className="seg-lbl">{awayInitial}</span>
          </div>
        </div>
        <div className="kt-prob-labels">
          <div className="kt-prob-row">
            <span className="kt-prob-dot gold" />
            <span className="kt-prob-name">{fixture.home_team_name}</span>
            <span className="kt-prob-val">{stats.homeWinProb}%</span>
          </div>
          <div className="kt-prob-row">
            <span className="kt-prob-dot gray" />
            <span className="kt-prob-name">Draw</span>
            <span className="kt-prob-val">{stats.drawProb}%</span>
          </div>
          <div className="kt-prob-row">
            <span className="kt-prob-dot blue" />
            <span className="kt-prob-name">{fixture.away_team_name}</span>
            <span className="kt-prob-val">{stats.awayWinProb}%</span>
          </div>
        </div>
        <div className="kt-widget-verdict">
          <span className="kt-verdict-tag">AI VERDICT</span>
          <div className="kt-verdict-text">
            {stats.homeWinProb > stats.awayWinProb
              ? `${fixture.home_team_name} is favored to win`
              : `${fixture.away_team_name} is favored to win`}
          </div>
        </div>
      </div>
    );
  }

  if (pillar === "TacticalAngle") {
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">TACTICAL CHALKBOARD</h4>
        <div className="kt-pitch">
          <svg viewBox="0 0 200 130">
            <rect x="5" y="5" width="190" height="120" rx="3" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="100" y1="5" x2="100" y2="125" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <circle cx="100" cy="65" r="22" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <circle cx="100" cy="65" r="2" fill="rgba(255,255,255,0.5)" />
            <rect x="5" y="30" width="25" height="70" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <rect x="170" y="30" width="25" height="70" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            <circle cx="45" cy="35" r="4.5" fill="#cca43b" className="player-node pulse-slow" />
            <text x="45" y="32" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">LW</text>
            <circle cx="45" cy="95" r="4.5" fill="#cca43b" />
            <text x="45" y="92" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">RW</text>
            <circle cx="65" cy="65" r="4.5" fill="#cca43b" className="player-node pulse-slow" />
            <text x="65" y="62" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">CF</text>
            <circle cx="28" cy="65" r="4.5" fill="#cca43b" />
            <text x="28" y="62" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">AM</text>
            <circle cx="150" cy="45" r="4.5" fill="#3b82f6" />
            <text x="150" y="42" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">LD</text>
            <circle cx="150" cy="85" r="4.5" fill="#3b82f6" />
            <text x="150" y="82" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">RD</text>
            <circle cx="165" cy="55" r="4.5" fill="#3b82f6" className="player-node pulse-slow" />
            <text x="165" y="52" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">CB</text>
            <circle cx="165" cy="75" r="4.5" fill="#3b82f6" />
            <text x="165" y="72" fontSize="5" fill="#fff" textAnchor="middle" fontWeight="bold">CB</text>
            <path d="M 68 65 L 125 65" stroke="#cca43b" strokeWidth="1.5" strokeDasharray="3,2" fill="none" />
            <polygon points="125,62 131,65 125,68" fill="#cca43b" />
          </svg>
        </div>
        <div className="kt-tactic-row">
          <div className="kt-tactic-spec">
            <span className="kt-tactic-lbl">{fixture.home_team_name}</span>
            <span className="kt-tactic-val gold">{stats.homeSystem}</span>
          </div>
          <div className="kt-tactic-spec">
            <span className="kt-tactic-lbl">{fixture.away_team_name}</span>
            <span className="kt-tactic-val blue">{stats.awaySystem}</span>
          </div>
        </div>
      </div>
    );
  }

  if (pillar === "FormGuide") {
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">FORM GUIDE</h4>
        <div className="kt-form-compare">
          <div className="kt-form-col">
            <span className="kt-form-team-name">{fixture.home_team_name}</span>
            <div className="kt-form-dots">
              {stats.homeForm.map((res, i) => (
                <span key={i} className={`kt-form-dot ${res.toLowerCase()}`}>{res}</span>
              ))}
            </div>
          </div>
          <div className="kt-form-vs" />
          <div className="kt-form-col">
            <span className="kt-form-team-name">{fixture.away_team_name}</span>
            <div className="kt-form-dots">
              {stats.awayForm.map((res, i) => (
                <span key={i} className={`kt-form-dot ${res.toLowerCase()}`}>{res}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="kt-avg-goals">
          <div className="kt-avg-lbl">Avg Goals / Match</div>
          <div className="kt-avg-bar">
            <span className="kt-avg-val">{stats.homeAvgGoals}</span>
            <div className="kt-avg-track">
              <div className="kt-avg-fill home" style={{ width: `${(parseFloat(stats.homeAvgGoals) / 3.5) * 100}%` }} />
            </div>
            <span className="kt-avg-val">{stats.awayAvgGoals}</span>
          </div>
        </div>
      </div>
    );
  }

  if (pillar === "H2HHistory") {
    const homePercent = stats.h2hPlayed > 0 ? (stats.h2hHomeWins / stats.h2hPlayed) * 100 : 0;
    const awayPercent = stats.h2hPlayed > 0 ? (stats.h2hAwayWins / stats.h2hPlayed) * 100 : 0;
    const drawPercent = Math.max(0, 100 - homePercent - awayPercent);
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">HEAD-TO-HEAD</h4>
        <div style={{ textAlign: 'center' }}>
          <span className="kt-h2h-total">{stats.h2hPlayed} Previous Meetings</span>
        </div>
        <div className="kt-h2h-bars">
          <div className="kt-h2h-row">
            <span className="kt-h2h-lbl">{fixture.home_team_name} ({stats.h2hHomeWins})</span>
            <div className="kt-h2h-track">
              <div className="kt-h2h-fill home" style={{ width: `${homePercent}%` }} />
            </div>
          </div>
          <div className="kt-h2h-row">
            <span className="kt-h2h-lbl">Draws ({stats.h2hDraws})</span>
            <div className="kt-h2h-track">
              <div className="kt-h2h-fill draw" style={{ width: `${drawPercent}%` }} />
            </div>
          </div>
          <div className="kt-h2h-row">
            <span className="kt-h2h-lbl">{fixture.away_team_name} ({stats.h2hAwayWins})</span>
            <div className="kt-h2h-track">
              <div className="kt-h2h-fill away" style={{ width: `${awayPercent}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pillar === "RecordsMilestones") {
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">MILESTONE TRACKER</h4>
        <div className="kt-milestone-card">
          <div className="kt-milestone-icon">🏅</div>
          <div>
            <span className="kt-milestone-tag">RECORD ATTEMPT</span>
            <div className="kt-milestone-detail">Chasing historical milestone</div>
          </div>
        </div>
        <div className="kt-milestone-bar">
          <div className="kt-milestone-bar-lbl">
            <span>Proximity</span>
            <span>{stats.milestoneProgress}%</span>
          </div>
          <div className="kt-milestone-track">
            <div className="kt-milestone-fill" style={{ width: `${stats.milestoneProgress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (pillar === "MemorableMeeting") {
    const year = 2020 + Math.floor(parseFloat(stats.hypeScore) * 0.5);
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">MEMORABLE CLASH</h4>
        <div className="kt-ticket">
          <div className="kt-ticket-top">
            <span>HISTORIC CLASSIC</span>
            <span>{year}</span>
          </div>
          <div className="kt-ticket-score">
            <span>{homeInitial}</span>
            <span className="sc"> 3 - 2 </span>
            <span>{awayInitial}</span>
          </div>
          <div className="kt-ticket-dash" />
          <p className="kt-ticket-desc">
            A classic thriller decided in the 94th minute by a sensational overhead kick.
          </p>
        </div>
      </div>
    );
  }

  if (pillar === "InjuryImpact") {
    const homeSquadDepth = 100 - (stats.h2hHomeWins % 15) - 5;
    const awaySquadDepth = 100 - (stats.h2hAwayWins % 15) - 5;
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">SQUAD INJURY REPORT</h4>
        <div className="kt-injury-meter">
          <div className="kt-injury-row">
            <span className="kt-injury-lbl">{homeInitial}</span>
            <div className="kt-injury-track">
              <div className="kt-injury-fill home" style={{ width: `${homeSquadDepth}%` }} />
            </div>
            <span className="kt-injury-val">{homeSquadDepth}%</span>
          </div>
          <div className="kt-injury-row">
            <span className="kt-injury-lbl">{awayInitial}</span>
            <div className="kt-injury-track">
              <div className="kt-injury-fill away" style={{ width: `${awaySquadDepth}%` }} />
            </div>
            <span className="kt-injury-val">{awaySquadDepth}%</span>
          </div>
        </div>
        <div className="kt-injury-alert">
          <span className="kt-injury-alert-icon">⚠️</span>
          <span>Key absences in defense may force tactical adjustments.</span>
        </div>
      </div>
    );
  }

  if (pillar === "VenueConditions") {
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">VENUE & WEATHER</h4>
        <div className="kt-venue-stadium">
          <span style={{ fontSize: '1.2rem' }}>🏟️</span>
          <span>{stats.stadium}</span>
        </div>
        <div className="kt-venue-grid">
          <div className="kt-venue-item">
            <span className="lbl">Condition</span>
            <span className="val">{stats.condition}</span>
          </div>
          <div className="kt-venue-item">
            <span className="lbl">Temp</span>
            <span className="val">{stats.temp}</span>
          </div>
          <div className="kt-venue-item">
            <span className="lbl">Humidity</span>
            <span className="val">{stats.humidity}%</span>
          </div>
          <div className="kt-venue-item">
            <span className="lbl">Capacity</span>
            <span className="val">{stats.stadiumCap.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }

  if (pillar === "RefereeWatch") {
    const isStrict = parseFloat(stats.yellowPerMatch) > 4.1;
    return (
      <div className="kt-widget">
        <h4 className="kt-widget-title">REFEREE INTELLIGENCE</h4>
        <div className="kt-ref-profile">
          <div className="kt-ref-avatar">🏁</div>
          <div>
            <div className="kt-ref-name">{stats.ref.name}</div>
            <div className="kt-ref-country">{stats.ref.country}</div>
          </div>
        </div>
        <div className="kt-ref-metrics">
          <div className="kt-ref-metric">
            <span className="kt-ref-card yellow" />
            <div className="val">{stats.yellowPerMatch}</div>
            <div className="lbl">Yel/Match</div>
          </div>
          <div className="kt-ref-metric">
            <span className="kt-ref-card red" />
            <div className="val">{stats.redPerMatch}</div>
            <div className="lbl">Red/Match</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <span className={`kt-ref-badge ${isStrict ? "strict" : "lenient"}`}>
            {isStrict ? "STRICT REFEREE" : "LENIENT REFEREE"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="kt-widget">
      <h4 className="kt-widget-title">STAKES & INTENSITY</h4>
      <div className="kt-hype">
        <div className="kt-hype-ring">
          <svg viewBox="0 0 36 36" className="kt-hype-svg">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3.5"
            />
            <path
              strokeDasharray={`${parseFloat(stats.hypeScore) * 10}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none" stroke="#cca43b" strokeWidth="3.5"
              strokeDashoffset="0" strokeLinecap="round"
              style={{ animation: 'hypeReveal 0.8s ease forwards' }}
            />
          </svg>
          <div className="kt-hype-center">
            <span className="kt-hype-val">{stats.hypeScore}</span>
            <span className="kt-hype-lbl">/10</span>
          </div>
        </div>
      </div>
      <div className="kt-hype-verdict">
        <span className="lbl">EXPECTED DRAMA LEVEL</span>
        <span className="val">
          {parseFloat(stats.hypeScore) > 8.5
            ? "CRITICAL HEAD-TO-HEAD CLASH"
            : "BALANCED TACTICAL FIXTURE"}
        </span>
      </div>
    </div>
  );
};