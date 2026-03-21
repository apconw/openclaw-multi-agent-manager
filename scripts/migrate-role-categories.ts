#!/usr/bin/env npx tsx
/**
 * Migrate role categories: create role_categories table if missing,
 * insert preset categories from ROLE_LIBRARY, and extract distinct
 * categories from role_library.data_json.
 *
 * Run from project root: npx tsx scripts/migrate-role-categories.ts
 */
import { getDb } from '../src/db';
import { ROLE_LIBRARY } from '../shared/role-library';

function toId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '') || label.trim();
}

function migrate() {
  const db = getDb();
  const now = Date.now();
  let inserted = 0;

  // 1. Insert preset categories from ROLE_LIBRARY
  const presetLabels = new Set(ROLE_LIBRARY.map((c) => c.label));
  for (const cat of ROLE_LIBRARY) {
    const id = cat.id;
    const label = cat.label;
    try {
      db.prepare(
        `INSERT INTO role_categories (id, label, created_at)
         VALUES (?, ?, ?)`
      ).run(id, label, now);
      inserted++;
      console.log(`Preset: ${id} (${label})`);
    } catch {
      // Already exists, skip
    }
  }

  // 2. Extract distinct categories from role_library.data_json
  const rows = db
    .prepare('SELECT data_json FROM role_library')
    .all() as Array<{ data_json: string }>;

  const seenLabels = new Set<string>(presetLabels);
  for (const row of rows) {
    let item: { category?: string };
    try {
      item = JSON.parse(row.data_json) as { category?: string };
    } catch {
      continue;
    }
    const cat = (item.category || '').trim();
    if (!cat || seenLabels.has(cat)) continue;

    seenLabels.add(cat);
    const id = toId(cat) || cat;
    try {
      db.prepare(
        `INSERT INTO role_categories (id, label, created_at)
         VALUES (?, ?, ?)`
      ).run(id, cat, now);
      inserted++;
      console.log(`From role_library: ${id} (${cat})`);
    } catch {
      // Duplicate, skip
    }
  }

  console.log(`Done. Inserted ${inserted} role category(ies).`);
}

migrate();
