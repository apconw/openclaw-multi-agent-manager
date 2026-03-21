import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ROLE_LIBRARY } from '../shared/role-library';

const DB_PATH_ENV = process.env.FEISHU_MULTI_AGENT_DB_PATH;
const DEFAULT_DB_PATH = path.join(
  process.cwd(),
  'data',
  'feishu-multi-agent.db'
);
const ALT_DB_PATH = path.join(
  os.homedir(),
  '.openclaw',
  'feishu-multi-agent.db'
);

function resolveDbPath(): string {
  if (DB_PATH_ENV) return DB_PATH_ENV;
  const cwd = process.cwd();
  const dataDir = path.join(cwd, 'data');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return DEFAULT_DB_PATH;
  } catch {
    const openclawDir = path.join(os.homedir(), '.openclaw');
    if (!fs.existsSync(openclawDir)) {
      fs.mkdirSync(openclawDir, { recursive: true });
    }
    return ALT_DB_PATH;
  }
}

let db: Database.Database | null = null;

function getDbPath(): string {
  return resolveDbPath();
}

function ensureDbDir(): void {
  const p = resolveDbPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function getDb(): Database.Database {
  if (db) return db;
  ensureDbDir();
  const dbPath = resolveDbPath();
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initSchema(db);
  seedData(db);
  return db;
}

function initSchema(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS team_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_library (
      id TEXT PRIMARY KEY,
      data_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS role_categories (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_team_configs_updated ON team_configs(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_role_library_updated ON role_library(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_role_categories_label ON role_categories(label);
  `);
}

/** 首次启动时从代码中的 ROLE_LIBRARY 写入种子数据 */
function seedData(database: Database.Database): void {
  const count = database
    .prepare('SELECT COUNT(*) as c FROM role_categories')
    .get() as { c: number };
  if (count.c > 0) return; // 已有数据，跳过

  const now = Date.now();

  const insertCategory = database.prepare(
    'INSERT OR IGNORE INTO role_categories (id, label, created_at) VALUES (?, ?, ?)'
  );
  const insertRole = database.prepare(
    `INSERT OR IGNORE INTO role_library (id, data_json, created_at, updated_at)
     VALUES (?, ?, ?, ?)`
  );

  const seed = database.transaction(() => {
    for (const category of ROLE_LIBRARY) {
      insertCategory.run(category.id, category.label, now);
      for (const item of category.items) {
        const roleData = { ...item, category: category.label };
        insertRole.run(item.id, JSON.stringify(roleData), now, now);
      }
    }
  });

  seed();
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export { getDbPath };
