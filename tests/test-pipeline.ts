import { getCompetitionMatches } from '../lib/services/football';
import { runPipelineForFixture, updateSpotlights } from '../lib/pipeline/run';
import { getDB } from '../lib/db';

async function runTest() {
  console.log('--- KICKTALE PIPELINE TEST ---');
  try {
    // 1. Fetch fixtures
    console.log('Fetching World Cup fixtures...');
    const matches = await getCompetitionMatches('WC');
    console.log(`Fetched ${matches.length} fixtures.`);

    if (matches.length === 0) {
      console.log('No matches found. Check your API key or network connection.');
      return;
    }

    // 2. Select a match to run the pipeline on (e.g. the first one or a match on July 3, 2026)
    // Switzerland (id 788) vs Algeria (id 778) starts on July 3
    const targetMatch = matches.find(m => m.homeTeam.name === 'Switzerland' || m.homeTeam.name === 'Argentina') || matches[0];
    
    console.log(`Selected Match: ${targetMatch.homeTeam.name} vs ${targetMatch.awayTeam.name} (ID: ${targetMatch.id})`);
    console.log(`Kickoff time: ${targetMatch.utcDate}`);

    // 3. Run pipeline
    console.log('\nRunning Layer 1-5 pipeline (forcing generation)...');
    const result = await runPipelineForFixture(targetMatch, 'WC', 2026, true);
    console.log('Pipeline Result:', JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error('Pipeline failed:', result.message);
      return;
    }

    // 4. Update spotlights
    console.log('\nUpdating Spotlight designations...');
    const spotlightId = await updateSpotlights('WC');
    console.log(`Updated Spotlight Fixture ID: ${spotlightId}`);

    // 5. Query the database to verify the stored insights
    console.log('\nVerifying database contents...');
    const db = getDB();
    
    const dbFixtures = await db.query('SELECT * FROM fixtures WHERE id = $1', [targetMatch.id]);
    console.log('Stored Fixture in DB:', JSON.stringify(dbFixtures[0], null, 2));

    const dbInsights = await db.query('SELECT * FROM insights WHERE fixture_id = $1 ORDER BY score DESC', [targetMatch.id]);
    console.log(`Stored Insights in DB (${dbInsights.length} total):`);
    dbInsights.forEach((ins: any, idx: number) => {
      console.log(`\n--- Insight #${idx + 1} (${ins.insight_type} - Score: ${ins.score}) ---`);
      console.log(`Title (EN): ${ins.title_en}`);
      console.log(`Title (AR): ${ins.title_ar}`);
      console.log(`Content (EN): ${ins.content_en}`);
      console.log(`Content (AR): ${ins.content_ar}`);
      console.log(`Evidence (EN): ${ins.evidence_en}`);
    });

  } catch (err: any) {
    console.error('Test run error:', err);
  }
}

runTest();
