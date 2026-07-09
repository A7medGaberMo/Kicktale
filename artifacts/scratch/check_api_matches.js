const fs = require('fs');
const path = require('path');

// Read key from .env.local manually
const envLocal = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf-8');
const match = envLocal.match(/FOOTBALL_DATA_KEYS=([^,\r\n\s]+)/);
const key = match ? match[1] : null;

async function check() {
  if (!key) {
    console.error("No football data key found!");
    return;
  }
  
  const url = `https://api.football-data.org/v4/competitions/WC/matches`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': key }
  });
  const data = await res.json();
  console.log("=== API MATCHES ===");
  console.log(data.matches.map(m => ({
    id: m.id,
    matchup: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
    status: m.status,
    utcDate: m.utcDate,
    score: m.score.fullTime
  })));
}

check();
