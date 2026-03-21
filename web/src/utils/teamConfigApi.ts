import type {
  SavedTeamConfig,
  TeamConfigItemResponse,
  TeamConfigListResponse,
  TeamConfigPayload,
} from '../types';

const configuredBaseUrl = (import.meta.env.VITE_TEAM_CONFIG_API_BASE_URL as string | undefined)?.trim();
const API_BASE = (configuredBaseUrl
  ? configuredBaseUrl.replace(/\/$/, '')
  : import.meta.env.DEV
    ? '/api'
    : 'http://localhost:3789/api');

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `请求失败：${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listTeamConfigs() {
  return requestJson<TeamConfigListResponse>('/team-configs');
}

export async function getTeamConfig(id: string) {
  return requestJson<TeamConfigItemResponse>(`/team-configs/${encodeURIComponent(id)}`);
}

export async function saveTeamConfig(payload: TeamConfigPayload) {
  return requestJson<TeamConfigItemResponse>('/team-configs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function deleteTeamConfig(id: string) {
  return requestJson<{ ok: boolean }>(`/team-configs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/** 与后端 `src/localOpenclawInit.ts` 中 `TEAM_TEARDOWN_PROGRESS_PHASES` 顺序一致 */
export const TEAM_TEARDOWN_PROGRESS_PHASES = [
  'list',
  'delete-agents',
  'rm-workspaces',
  'reset-config',
  'config-validate',
  'gateway-restart',
  'done',
] as const;

export type TeamTeardownProgressPhase = (typeof TEAM_TEARDOWN_PROGRESS_PHASES)[number];
export type TeamTeardownPhase = TeamTeardownProgressPhase | 'error';

export type TeamTeardownSseEvent =
  | {
      type: 'phase';
      phase: TeamTeardownPhase;
      agentId?: string;
      message?: string;
    }
  | { type: 'log'; line: string; stream: 'stdout' | 'stderr' }
  | {
      type: 'result';
      ok: boolean;
      error?: string;
      logLines: string[];
      dbDeleted?: boolean;
    };

function parseTeamTeardownSseChunks(buffer: string): { events: TeamTeardownSseEvent[]; rest: string } {
  const events: TeamTeardownSseEvent[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    const line = part.trim();
    if (!line.startsWith('data: ')) continue;
    try {
      events.push(JSON.parse(line.slice(6)) as TeamTeardownSseEvent);
    } catch {
      /* skip malformed */
    }
  }
  return { events, rest };
}

/** POST /team-configs/:id/teardown with SSE — OpenClaw cleanup then DB delete on success */
export async function postTeamTeardownStream(
  id: string,
  onEvent: (e: TeamTeardownSseEvent) => void,
): Promise<{ ok: boolean; error?: string; logLines: string[]; dbDeleted?: boolean }> {
  const res = await fetch(`${API_BASE}/team-configs/${encodeURIComponent(id)}/teardown`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('无法读取响应流');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const { events, rest } = parseTeamTeardownSseChunks(buffer);
    buffer = rest;
    for (const ev of events) {
      onEvent(ev);
      if (ev.type === 'result') {
        return { ok: ev.ok, error: ev.error, logLines: ev.logLines, dbDeleted: ev.dbDeleted };
      }
    }
  }

  const { events } = parseTeamTeardownSseChunks(buffer + '\n\n');
  for (const ev of events) {
    onEvent(ev);
    if (ev.type === 'result') {
      return { ok: ev.ok, error: ev.error, logLines: ev.logLines, dbDeleted: ev.dbDeleted };
    }
  }

  return { ok: false, error: '未收到完整结果', logLines: [] };
}

export function isSavedTeamConfig(value: unknown): value is SavedTeamConfig {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'name' in value &&
      'templates' in value &&
      'selectedIds' in value &&
      'credentials' in value &&
      'defaultAgentId' in value &&
      'edges' in value,
  );
}
