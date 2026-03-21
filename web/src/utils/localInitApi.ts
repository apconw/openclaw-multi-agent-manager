import type { OpenClawConfig } from '../types';

/** 与后端 `src/localInitPhases.ts` 顺序保持一致 */
export const LOCAL_INIT_PROGRESS_PHASES = [
  'create-roles',
  'write-workspace',
  'config-path',
  'config-channels',
  'config-bindings',
  'config-tools',
  'config-session',
  'config-validate',
  'gateway-restart',
  'done',
] as const;

export type LocalInitProgressPhase = (typeof LOCAL_INIT_PROGRESS_PHASES)[number];
export type LocalInitPhase = LocalInitProgressPhase | 'error';

export type LocalInitSseEvent =
  | {
      type: 'phase';
      phase: LocalInitPhase;
      agentIndex?: number;
      agentId?: string;
      message?: string;
    }
  | { type: 'log'; line: string; stream: 'stdout' | 'stderr' }
  | {
      type: 'result';
      ok: boolean;
      steps: Array<{
        phase: LocalInitPhase;
        ok: boolean;
        detail?: string;
        agentId?: string;
        agentIndex?: number;
      }>;
      error?: string;
      logLines: string[];
    };

export interface LocalInitRequestBody {
  openclawConfig: OpenClawConfig;
  soulFiles: Record<string, Record<string, string>>;
}

function parseSseChunks(buffer: string): { events: LocalInitSseEvent[]; rest: string } {
  const events: LocalInitSseEvent[] = [];
  const parts = buffer.split('\n\n');
  const rest = parts.pop() ?? '';
  for (const part of parts) {
    const line = part.trim();
    if (!line.startsWith('data: ')) continue;
    try {
      events.push(JSON.parse(line.slice(6)) as LocalInitSseEvent);
    } catch {
      /* skip malformed */
    }
  }
  return { events, rest };
}

/** Stream POST /api/local-init with SSE; invokes onEvent for each parsed event. */
export async function postLocalInitStream(
  body: LocalInitRequestBody,
  onEvent: (e: LocalInitSseEvent) => void,
): Promise<{ ok: boolean; error?: string; logLines: string[] }> {
  const res = await fetch('/api/local-init', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(body),
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
    const { events, rest } = parseSseChunks(buffer);
    buffer = rest;
    for (const ev of events) {
      onEvent(ev);
      if (ev.type === 'result') {
        return { ok: ev.ok, error: ev.error, logLines: ev.logLines };
      }
    }
  }

  const { events } = parseSseChunks(buffer + '\n\n');
  for (const ev of events) {
    onEvent(ev);
    if (ev.type === 'result') {
      return { ok: ev.ok, error: ev.error, logLines: ev.logLines };
    }
  }

  return { ok: false, error: '未收到完整结果', logLines: [] };
}

/** Non-streaming fallback (e.g. SSE blocked). */
export async function postLocalInitJson(body: LocalInitRequestBody): Promise<{
  ok: boolean;
  steps: Array<{ phase: string; ok: boolean; detail?: string }>;
  logLines: string[];
  error?: string;
}> {
  const res = await fetch('/api/local-init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    ok: boolean;
    steps: Array<{ phase: string; ok: boolean; detail?: string }>;
    logLines: string[];
    error?: string;
  };
  if (!res.ok && !data.error) {
    throw new Error(`HTTP ${res.status}`);
  }
  return data;
}
