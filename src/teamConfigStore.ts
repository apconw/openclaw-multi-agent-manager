import { getDb } from './db';

export interface SavedTeamConfig {
  id: string;
  name: string;
  templates: unknown[];
  selectedIds: string[];
  credentials: Record<string, unknown>;
  /** 历史字段，新保存可为空对象 */
  models?: Record<string, string>;
  defaultAgentId: string;
  edges: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface SavedTeamSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  agentCount: number;
  defaultAgentId: string;
  customRoleCount: number;
  selectedAgentIds: string[];
}

export interface TeamConfigPayload {
  id?: string;
  name: string;
  templates: unknown[];
  selectedIds: string[];
  credentials: Record<string, unknown>;
  models?: Record<string, string>;
  defaultAgentId: string;
  edges: unknown[];
}

function toSafeId(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}

export interface TeamRoleConflict {
  roleId: string;
  teamId: string;
  teamName: string;
}

/** 检测 selectedIds 中的角色 id 是否已被其它已保存团队占用（excludeTeamId 为当前编辑中的团队，新建时不传）。 */
export function findTeamRoleConflicts(
  selectedIds: string[],
  excludeTeamId?: string,
): TeamRoleConflict[] {
  const teams = listTeamConfigs();
  const exclude = excludeTeamId?.trim();
  const conflicts: TeamRoleConflict[] = [];

  for (const roleId of new Set(selectedIds)) {
    for (const team of teams) {
      if (exclude && team.id === exclude) continue;
      if (team.selectedIds.includes(roleId)) {
        conflicts.push({ roleId, teamId: team.id, teamName: team.name });
        break;
      }
    }
  }

  return conflicts;
}

function formatTeamRoleConflictMessage(conflicts: TeamRoleConflict[], templates: unknown[]): string {
  const lines = conflicts.map((c) => {
    const t = templates.find((x) => (x as { id?: string }).id === c.roleId) as
      | { id?: string; name?: string }
      | undefined;
    const label = t?.name ? `「${t.name}」(${c.roleId})` : c.roleId;
    return `  • 角色 ${label} 已在团队「${c.teamName}」中使用`;
  });
  return (
    `以下角色已在其他团队中创建，不能重复：\n${lines.join('\n')}\n\n` +
    `请前往「团队管理」删除占用这些角色的团队，或更换为未使用的角色。`
  );
}

function buildSummary(config: SavedTeamConfig): SavedTeamSummary {
  const customRoleCount = config.templates.filter(
    (t) => !(t as Record<string, unknown>).isPreset
  ).length;
  return {
    id: config.id,
    name: config.name,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
    agentCount: config.selectedIds.length,
    defaultAgentId: config.defaultAgentId,
    customRoleCount,
    selectedAgentIds: config.selectedIds,
  };
}

export function listTeamConfigs(): SavedTeamConfig[] {
  const database = getDb();
  const rows = database
    .prepare(
      'SELECT id, name, data_json, created_at, updated_at FROM team_configs ORDER BY updated_at DESC'
    )
    .all() as Array<{
    id: string;
    name: string;
    data_json: string;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((r) => {
    const data = JSON.parse(r.data_json) as Record<string, unknown>;
    return {
      ...data,
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    } as SavedTeamConfig;
  });
}

export function getTeamConfig(id: string): SavedTeamConfig | null {
  const database = getDb();
  const row = database
    .prepare(
      'SELECT id, name, data_json, created_at, updated_at FROM team_configs WHERE id = ?'
    )
    .get(id) as
    | {
        id: string;
        name: string;
        data_json: string;
        created_at: string;
        updated_at: string;
      }
    | undefined;
  if (!row) return null;
  const data = JSON.parse(row.data_json) as Record<string, unknown>;
  return {
    ...data,
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as SavedTeamConfig;
}

export function saveTeamConfig(payload: TeamConfigPayload): SavedTeamConfig {
  const conflicts = findTeamRoleConflicts(payload.selectedIds, payload.id);
  if (conflicts.length > 0) {
    throw new Error(formatTeamRoleConflictMessage(conflicts, payload.templates));
  }

  const database = getDb();
  const fallbackId = `team-${Date.now()}`;
  const nextId = toSafeId(payload.id || payload.name) || fallbackId;
  const existing = getTeamConfig(nextId) || (payload.id ? getTeamConfig(payload.id) : null);
  const now = new Date().toISOString();

  const savedConfig: SavedTeamConfig = {
    ...payload,
    id: nextId,
    name: payload.name.trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const dataJson = JSON.stringify({
    ...payload,
    id: nextId,
    name: payload.name.trim(),
    createdAt: savedConfig.createdAt,
    updatedAt: savedConfig.updatedAt,
  });

  database
    .prepare(
      `INSERT INTO team_configs (id, name, data_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         data_json = excluded.data_json,
         updated_at = excluded.updated_at`
    )
    .run(nextId, savedConfig.name, dataJson, savedConfig.createdAt, savedConfig.updatedAt);

  if (payload.id && payload.id !== nextId) {
    database.prepare('DELETE FROM team_configs WHERE id = ?').run(payload.id);
  }

  return savedConfig;
}

export function deleteTeamConfig(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM team_configs WHERE id = ?').run(id);
  return result.changes > 0;
}

export { buildSummary };
