import path from 'path';

// Database Client Interface
export interface DBClient {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  close(): Promise<void>;
}

// Helper to convert standard ? bindings to Postgres $1, $2, etc.
function convertToPostgresSql(sql: string): string {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

// 1. SQLite Native Implementation (using better-sqlite3)
class SQLiteClient implements DBClient {
  private db: any;
  private schemaInitialized = false;

  constructor() {
    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'kicktale.db');
    this.db = new Database(dbPath);
    console.log(`Connected to local SQLite database via better-sqlite3 at: ${dbPath}`);
    this.initSchema();
  }

  private initSchema() {
    if (this.schemaInitialized) return;
    
    // Check if table already exists to avoid redundant executions
    const checkTable = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='fixtures'").all();
    if (checkTable.length > 0) {
      this.schemaInitialized = true;
      console.log('SQLite database tables already exist. Skipping schema initialization.');
      return;
    }

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS fixtures (
        id INTEGER PRIMARY KEY,
        competition_code TEXT,
        season_year INTEGER,
        status TEXT,
        utc_date TEXT,
        stage TEXT,
        group_name TEXT,
        home_team_id INTEGER,
        home_team_name TEXT,
        home_team_crest TEXT,
        away_team_id INTEGER,
        away_team_name TEXT,
        away_team_crest TEXT,
        score_fulltime TEXT,
        matchday INTEGER,
        is_spotlight INTEGER DEFAULT 0,
        created_at TEXT
      );
    `);

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fixture_id INTEGER,
        entity_type TEXT,
        entity_name TEXT,
        insight_type TEXT,
        title TEXT,
        content TEXT,
        evidence TEXT,
        score REAL,
        confidence REAL,
        created_at TEXT,
        FOREIGN KEY(fixture_id) REFERENCES fixtures(id)
      );
    `);
    
    this.schemaInitialized = true;
    console.log('SQLite database schema initialized successfully.');
  }

  public async query(sql: string, params: any[] = []): Promise<any[]> {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as any[];
  }

  public async execute(sql: string, params: any[] = []): Promise<void> {
    const stmt = this.db.prepare(sql);
    stmt.run(...params);
  }

  public async close(): Promise<void> {
    this.db.close();
  }
}

// 2. Postgres Client Implementation (using pg)
class PostgresClient implements DBClient {
  private pool: import('pg').Pool;
  private schemaInitialized = false;

  constructor(connectionString: string) {
    const { Pool } = require('pg');
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    }) as import('pg').Pool;
    console.log('Connected to PostgreSQL database.');
    this.initSchema();
  }

  private async initSchema() {
    if (this.schemaInitialized) return;
    
    try {
      // Check if table already exists in Postgres
      const checkTable = await this.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fixtures'"
      );
      if (checkTable.length > 0) {
        this.schemaInitialized = true;
        console.log('PostgreSQL database tables already exist. Skipping schema initialization.');
        return;
      }

      await this.execute(`
        CREATE TABLE IF NOT EXISTS fixtures (
          id INTEGER PRIMARY KEY,
          competition_code TEXT,
          season_year INTEGER,
          status TEXT,
          utc_date TEXT,
          stage TEXT,
          group_name TEXT,
          home_team_id INTEGER,
          home_team_name TEXT,
          home_team_crest TEXT,
          away_team_id INTEGER,
          away_team_name TEXT,
          away_team_crest TEXT,
          score_fulltime TEXT,
          matchday INTEGER,
          is_spotlight INTEGER DEFAULT 0,
          created_at TEXT
        );
      `);

      await this.execute(`
        CREATE TABLE IF NOT EXISTS insights (
          id SERIAL PRIMARY KEY,
          fixture_id INTEGER,
          entity_type TEXT,
          entity_name TEXT,
          insight_type TEXT,
          title TEXT,
          content TEXT,
          evidence TEXT,
          score REAL,
          confidence REAL,
          created_at TEXT,
          CONSTRAINT fk_fixture FOREIGN KEY(fixture_id) REFERENCES fixtures(id) ON DELETE CASCADE
        );
      `);
      this.schemaInitialized = true;
      console.log('PostgreSQL database schema initialized successfully.');
    } catch (err: any) {
      console.error('PostgreSQL schema init error:', err.message);
    }
  }

  public async query(sql: string, params: any[] = []): Promise<any[]> {
    const pgSql = convertToPostgresSql(sql);
    const res = await this.pool.query(pgSql, params);
    return res.rows;
  }

  public async execute(sql: string, params: any[] = []): Promise<void> {
    const pgSql = convertToPostgresSql(sql);
    await this.pool.query(pgSql, params);
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Dynamic Factory Singleton
let clientInstance: DBClient | null = null;

export function getDB(): DBClient {
  if (clientInstance) {
    return clientInstance;
  }

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://'))) {
    clientInstance = new PostgresClient(dbUrl);
  } else {
    clientInstance = new SQLiteClient();
  }

  return clientInstance;
}
