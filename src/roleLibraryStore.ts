import { getDb } from './db';
import { getOrCreateCategory } from './roleCategoryStore';

export interface RoleLibraryItem {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  description: string;
  descriptionEn: string;
  coreMission: string;
  criticalRules: string;
  category?: string;
  createdAt?: number;
}

export function listRoles(): RoleLibraryItem[] {
  const database = getDb();
  const rows = database
    .prepare(
      'SELECT id, data_json FROM role_library ORDER BY updated_at DESC'
    )
    .all() as Array<{ id: string; data_json: string }>;
  return rows.map((r) => {
    const item = JSON.parse(r.data_json) as RoleLibraryItem;
    return { ...item, id: r.id };
  });
}

export function getRole(id: string): RoleLibraryItem | null {
  const database = getDb();
  const row = database
    .prepare('SELECT id, data_json FROM role_library WHERE id = ?')
    .get(id) as { id: string; data_json: string } | undefined;
  if (!row) return null;
  const item = JSON.parse(row.data_json) as RoleLibraryItem;
  return { ...item, id: row.id };
}

export function saveRole(item: RoleLibraryItem): RoleLibraryItem {
  const database = getDb();
  const now = Date.now();
  const existing = getRole(item.id);
  const createdAt = item.createdAt ?? existing?.createdAt ?? now;
  const categoryLabel = item.category?.trim() || '其他';
  getOrCreateCategory(categoryLabel);
  const toSave: RoleLibraryItem = {
    id: item.id,
    name: item.name,
    nameEn: item.nameEn ?? item.name,
    emoji: item.emoji ?? '🤖',
    description: item.description ?? '',
    descriptionEn: item.descriptionEn ?? item.description ?? '',
    coreMission: item.coreMission ?? '1. [待完善]',
    criticalRules: item.criticalRules ?? '1. [待完善]',
    category: categoryLabel,
    createdAt,
  };
  const dataJson = JSON.stringify(toSave);

  database
    .prepare(
      `INSERT INTO role_library (id, data_json, created_at, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         data_json = excluded.data_json,
         updated_at = excluded.updated_at`
    )
    .run(item.id, dataJson, createdAt, now);

  return toSave;
}

export function deleteRole(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM role_library WHERE id = ?').run(id);
  return result.changes > 0;
}
