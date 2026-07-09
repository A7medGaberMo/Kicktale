const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'kicktale.db');
const db = new Database(dbPath);

console.log("=== FIXTURES IN DB ===");
const fixtures = db.prepare("SELECT * FROM fixtures").all();
console.log(fixtures.map(f => ({
  id: f.id,
  matchup: `${f.home_team_name} vs ${f.away_team_name}`,
  status: f.status,
  utc_date: f.utc_date,
  is_spotlight: f.is_spotlight
})));

console.log("\n=== INSIGHTS SUMMARY ===");
const insights = db.prepare("SELECT * FROM insights").all();
console.log(insights.map(i => ({
  id: i.id,
  fixture_id: i.fixture_id,
  insight_type: i.insight_type,
  title_en: i.title_en
})));
