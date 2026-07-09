const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(process.cwd(), 'kicktale.db');
const db = new Database(dbPath);

console.log("Clearing all insights and fixtures...");
db.prepare("DELETE FROM insights").run();
db.prepare("DELETE FROM fixtures").run();
console.log("Database cleared successfully!");
