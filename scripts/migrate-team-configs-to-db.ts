#!/usr/bin/env npx tsx
/**
 * Migrate team-configs/*.json to SQLite database.
 * Run from project root: npx tsx scripts/migrate-team-configs-to-db.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../src/db';

const TEAM_CONFIG_DIR = path.resolve(process.cwd(), 'team-configs');

function migrate() {
  if (!fs.existsSync(TEAM_CONFIG_DIR)) {
    console.log('No team-configs directory found, nothing to migrate.');
    return;
  }

  const files = fs.readdirSync(TEAM_CONFIG_DIR).filter((f) => f.endsWith('.json'));
  if (files.length === 0) {
    console.log('No JSON files in team-configs, nothing to migrate.');
    return;
  }

  const db = getDb();
  let migrated = 0;

  for (const file of files) {
    const filePath = path.join(TEAM_CONFIG_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    let config: Record<string, unknown>;
    try {
      config = JSON.parse(content);
    } catch {
      console.warn(`Skipping invalid JSON: ${file}`);
      continue;
    }

    const id = (config.id as string) || path.basename(file, '.json');
    const name = (config.name as string) || id;
    const createdAt = (config.createdAt as string) || new Date().toISOString();
    const updatedAt = (config.updatedAt as string) || new Date().toISOString();
    const dataJson = JSON.stringify(config);

    db.prepare(
      `INSERT OR REPLACE INTO team_configs (id, name, data_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, name, dataJson, createdAt, updatedAt);

    migrated++;
    console.log(`Migrated: ${id}`);
  }

  console.log(`Done. Migrated ${migrated} team config(s) to database.`);
}

migrate();
