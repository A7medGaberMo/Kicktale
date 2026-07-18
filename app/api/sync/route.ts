import { NextResponse } from 'next/server';
import { getCompetitionMatches, getGeneralMatches } from '@/lib/services/football';
import { getDB } from '@/lib/db';
import { seedFallbackData } from '@/lib/data/seeder';
import { isTopLevelCompetition, normalizeCompetitionCode } from '@/lib/competitions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = normalizeCompetitionCode(searchParams.get('league') || 'ALL');
  
  try {
    const db = getDB();
    let matches = [];
    if (league === 'ALL') {
      const now = new Date();
      const dateFrom = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dateTo = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      console.log(`[Sync] Fetching all matches from ${dateFrom} to ${dateTo}`);
      matches = await getGeneralMatches(dateFrom, dateTo);
    } else {
      console.log(`[Sync] Fetching basic fixture data for: ${league}`);
      matches = await getCompetitionMatches(league);
    }

    matches = matches.filter((fixture: any) => {
      const compCode = fixture.competition?.code || league;
      return league === 'ALL' ? isTopLevelCompetition(compCode) : normalizeCompetitionCode(compCode) === league;
    });

    if (matches.length === 0) {
      console.log('[Sync] No matches from API. Seeding fallback data fixtures...');
      await seedFallbackData();
      return NextResponse.json({ success: true, count: 2, message: 'Seeded fallback fixtures' });
    }

    let saved = 0;
    for (const fixture of matches) {
      const scoreStr = fixture.score.fullTime.home !== null
        ? `${fixture.score.fullTime.home}-${fixture.score.fullTime.away}`
        : null;

      const compCode = normalizeCompetitionCode(fixture.competition?.code || league);
      const seasonYear = fixture.season?.year || 2026;

      await db.execute(
        `INSERT INTO fixtures (
          id, competition_code, season_year, status, utc_date, stage, group_name,
          home_team_id, home_team_name, home_team_crest,
          away_team_id, away_team_name, away_team_crest,
          score_fulltime, matchday, is_spotlight, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          status = excluded.status,
          score_fulltime = excluded.score_fulltime,
          utc_date = excluded.utc_date,
          stage = excluded.stage,
          group_name = excluded.group_name,
          home_team_id = excluded.home_team_id,
          home_team_name = excluded.home_team_name,
          home_team_crest = excluded.home_team_crest,
          away_team_id = excluded.away_team_id,
          away_team_name = excluded.away_team_name,
          away_team_crest = excluded.away_team_crest,
          matchday = excluded.matchday`,
        [
          fixture.id, compCode, seasonYear,
          fixture.status, fixture.utcDate, fixture.stage, fixture.group,
          fixture.homeTeam.id, fixture.homeTeam.name, fixture.homeTeam.crest,
          fixture.awayTeam.id, fixture.awayTeam.name, fixture.awayTeam.crest,
          scoreStr, fixture.matchday || null, 0, new Date().toISOString()
        ]
      );
      saved++;
    }

    return NextResponse.json({ success: true, count: saved, message: `Synced ${saved} fixtures` });
  } catch (err: any) {
    console.error('[Sync] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
