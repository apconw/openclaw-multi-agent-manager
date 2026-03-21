import { getDb } from './db';

export interface RoleCategoryItem {
  id: string;
  label: string;
}

const PRESET_CATEGORIES: RoleCategoryItem[] = [
  { id: 'academic', label: '学术研究' },
  { id: 'design', label: '设计创意' },
  { id: 'engineering', label: '工程技术' },
  { id: 'game-development', label: '游戏开发' },
  { id: 'marketing', label: '营销增长' },
  { id: 'paid-media', label: '付费媒体' },
  { id: 'product', label: '产品管理' },
  { id: 'project-management', label: '项目管理' },
  { id: 'other', label: '其他' },
];

function toId(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '') || label.trim();
}

export function listCategories(): RoleCategoryItem[] {
  const database = getDb();
  const presetLabels = new Set(PRESET_CATEGORIES.map((c) => c.label));
  const dbRows = database
    .prepare('SELECT id, label FROM role_categories ORDER BY created_at ASC')
    .all() as Array<{ id: string; label: string }>;

  const seen = new Set<string>();
  const result: RoleCategoryItem[] = [];

  for (const p of PRESET_CATEGORIES) {
    result.push(p);
    seen.add(p.label);
    seen.add(p.id);
  }

  for (const row of dbRows) {
    if (!seen.has(row.label) && !presetLabels.has(row.label)) {
      result.push({ id: row.id, label: row.label });
      seen.add(row.label);
    }
  }

  return result;
}

export function addCategory(label: string): RoleCategoryItem {
  const trimmed = label.trim();
  if (!trimmed) throw new Error('分类名称不能为空');

  const database = getDb();
  const existing = database
    .prepare('SELECT id, label FROM role_categories WHERE label = ?')
    .get(trimmed) as { id: string; label: string } | undefined;
  if (existing) return existing;

  const id = toId(trimmed) || trimmed;
  const now = Date.now();

  try {
    database
      .prepare(
        `INSERT INTO role_categories (id, label, created_at)
         VALUES (?, ?, ?)`
      )
      .run(id, trimmed, now);
  } catch {
    const row = database
      .prepare('SELECT id, label FROM role_categories WHERE label = ?')
      .get(trimmed) as { id: string; label: string };
    if (row) return row;
  }
  return { id, label: trimmed };
}

export function getOrCreateCategory(label: string): RoleCategoryItem {
  const trimmed = (label || '其他').trim() || '其他';

  const preset = PRESET_CATEGORIES.find(
    (c) => c.label === trimmed || c.id === trimmed
  );
  if (preset) return preset;

  const database = getDb();
  const existing = database
    .prepare('SELECT id, label FROM role_categories WHERE label = ?')
    .get(trimmed) as { id: string; label: string } | undefined;

  if (existing) return existing;

  return addCategory(trimmed);
}
