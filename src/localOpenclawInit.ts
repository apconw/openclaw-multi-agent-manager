import { spawn, spawnSync } from 'child_process';
import type { ServerResponse } from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { LocalInitPhase, LocalInitProgressPhase } from './localInitPhases';

export type { LocalInitPhase, LocalInitProgressPhase } from './localInitPhases';

export type LocalInitEvent =
  | {
      type: 'phase';
      phase: LocalInitPhase;
      agentIndex?: number;
      agentId?: string;
      message?: string;
    }
  | { type: 'log'; line: string; stream: 'stdout' | 'stderr' };

export interface LocalInitPayload {
  openclawConfig: Record<string, unknown> & {
    agents: { list: Array<{ id: string; workspace: string; name?: string }> };
  };
  soulFiles: Record<string, Record<string, string>>;
}

export interface LocalInitStepRecord {
  phase: LocalInitPhase;
  ok: boolean;
  detail?: string;
  agentId?: string;
  agentIndex?: number;
}

export interface LocalInitResult {
  ok: boolean;
  steps: LocalInitStepRecord[];
  logLines: string[];
  error?: string;
}

/** 与前端 `web/src/utils/teamConfigApi.ts` 中 `TEAM_TEARDOWN_PROGRESS_PHASES` 顺序一致 */
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

export type TeamTeardownEvent =
  | { type: 'phase'; phase: TeamTeardownPhase; agentId?: string; message?: string }
  | { type: 'log'; line: string; stream: 'stdout' | 'stderr' };

export interface TeamTeardownResult {
  ok: boolean;
  logLines: string[];
  error?: string;
}

const TEAM_WORKSPACE_BASE = '~/.openclaw';

function expandUserPath(input: string): string {
  let s = input.trim();
  if (s.startsWith('~')) {
    s = path.join(os.homedir(), s.slice(1).replace(/^[\\/]+/, ''));
  }
  s = s.replace(/%USERPROFILE%/gi, os.homedir());
  s = s.replace(/%HOME%/gi, os.homedir());
  return path.normalize(s);
}

export interface ResolvedCli {
  command: string;
  argsPrefix: string[];
}

/** Resolve `openclaw` executable; optional OPENCLAW_CLI env (full path or command). */
export function resolveOpenclawCli(): ResolvedCli {
  const envCmd = process.env.OPENCLAW_CLI?.trim();
  if (envCmd) {
    const parts = envCmd.split(/\s+/).filter(Boolean);
    return { command: parts[0]!, argsPrefix: parts.slice(1) };
  }
  const isWin = process.platform === 'win32';
  const candidates = isWin ? ['openclaw.cmd', 'openclaw.exe', 'openclaw'] : ['openclaw'];
  for (const cmd of candidates) {
    const r = spawnSync(cmd, ['--version'], {
      shell: false,
      env: process.env,
      encoding: 'utf8',
      timeout: 20000,
      windowsHide: true,
    });
    const err = r.error as NodeJS.ErrnoException | undefined;
    if (err?.code === 'ENOENT') continue;
    if (r.status === 0 || (r.stdout && String(r.stdout).length > 0)) {
      return { command: cmd, argsPrefix: [] };
    }
  }
  const npx = isWin ? 'npx.cmd' : 'npx';
  return { command: npx, argsPrefix: ['-y', 'openclaw'] };
}

function validatePayload(body: unknown): LocalInitPayload {
  if (!body || typeof body !== 'object') {
    throw new Error('请求体无效');
  }
  const o = body as Record<string, unknown>;
  if (!o.openclawConfig || typeof o.openclawConfig !== 'object') {
    throw new Error('缺少 openclawConfig');
  }
  const cfg = o.openclawConfig as { agents?: { list?: unknown } };
  if (!Array.isArray(cfg.agents?.list) || cfg.agents.list.length === 0) {
    throw new Error('openclawConfig.agents.list 不能为空');
  }
  for (const a of cfg.agents.list) {
    if (!a || typeof a !== 'object') throw new Error('agents.list 项无效');
    const item = a as { id?: string; workspace?: string };
    if (!item.id || typeof item.id !== 'string') throw new Error('每个 agent 需要 id');
    if (!item.workspace || typeof item.workspace !== 'string') throw new Error('每个 agent 需要 workspace');
  }
  if (!o.soulFiles || typeof o.soulFiles !== 'object') {
    throw new Error('缺少 soulFiles');
  }
  return {
    openclawConfig: o.openclawConfig as LocalInitPayload['openclawConfig'],
    soulFiles: o.soulFiles as Record<string, Record<string, string>>,
  };
}

function pushLog(
  logLines: string[],
  emit: ((e: LocalInitEvent) => void) | undefined,
  line: string,
  stream: 'stdout' | 'stderr',
) {
  logLines.push(line);
  emit?.({ type: 'log', line, stream });
}

/**
 * CLI 中已存在该 agent 时，在 `agents delete --force` 之后、`agents add` 之前，
 * 物理删除 workspace 目录（与 `rm -rf` 一致），避免旧文件与重新注册冲突。
 */
function removeWorkspaceDirPhysicalForInit(
  wsExpanded: string,
  agentId: string,
  logLines: string[],
  emit: ((e: LocalInitEvent) => void) | undefined,
): boolean {
  try {
    pushLog(
      logLines,
      emit,
      `[${agentId}] CLI 中已存在该角色：delete 后清理工作区目录（物理删除）`,
      'stdout',
    );
    if (fs.existsSync(wsExpanded)) {
      fs.rmSync(wsExpanded, { recursive: true, force: true });
      pushLog(logLines, emit, `[${agentId}] 已删除目录 ${wsExpanded}`, 'stdout');
    } else {
      pushLog(logLines, emit, `[${agentId}] 工作区目录不存在，跳过 rm`, 'stdout');
    }
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    emit?.({ type: 'phase', phase: 'error', agentId, message: msg });
    pushLog(logLines, emit, msg, 'stderr');
    return false;
  }
}

function pushTeardownLog(
  logLines: string[],
  emit: ((e: TeamTeardownEvent) => void) | undefined,
  line: string,
  stream: 'stdout' | 'stderr',
) {
  logLines.push(line);
  emit?.({ type: 'log', line, stream });
}

/** `runOpenclaw` 仅通过 pushLog 发 log 行，桥接到 TeamTeardown SSE */
function bridgeLocalInitEmitForTeardown(
  emit: ((e: TeamTeardownEvent) => void) | undefined,
): ((e: LocalInitEvent) => void) | undefined {
  if (!emit) return undefined;
  return (e: LocalInitEvent) => {
    if (e.type === 'log') {
      emit({ type: 'log', line: e.line, stream: e.stream });
    }
  };
}

/** 收集 stdout/stderr（用于 `agents list --json` 等需解析的输出） */
async function runOpenclawCapture(
  resolved: ResolvedCli,
  args: string[],
): Promise<{ code: number; stdout: string; stderr: string }> {
  const fullArgs = [...resolved.argsPrefix, ...args];
  return new Promise((resolve, reject) => {
    const chunksOut: Buffer[] = [];
    const chunksErr: Buffer[] = [];
    const child = spawn(resolved.command, fullArgs, {
      shell: false,
      env: process.env,
      windowsHide: true,
    });
    child.stdout?.on('data', (d: Buffer) => chunksOut.push(d));
    child.stderr?.on('data', (d: Buffer) => chunksErr.push(d));
    child.on('error', err => reject(err));
    child.on('close', code => {
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(chunksOut).toString('utf-8'),
        stderr: Buffer.concat(chunksErr).toString('utf-8'),
      });
    });
  });
}

function parseAgentsListJson(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const data = JSON.parse(trimmed) as unknown;
  if (!Array.isArray(data)) {
    throw new Error('agents list --json 的返回不是 JSON 数组');
  }
  const ids: string[] = [];
  for (const item of data) {
    if (item && typeof item === 'object' && typeof (item as { id?: string }).id === 'string') {
      ids.push((item as { id: string }).id);
    }
  }
  return ids;
}

async function runOpenclaw(
  resolved: ResolvedCli,
  args: string[],
  logLines: string[],
  emit: ((e: LocalInitEvent) => void) | undefined,
  prefix: string,
): Promise<number> {
  const fullArgs = [...resolved.argsPrefix, ...args];
  const cmdLine = [resolved.command, ...fullArgs].join(' ');
  pushLog(logLines, emit, `${prefix}$ ${cmdLine}`, 'stdout');

  return new Promise((resolve, reject) => {
    const child = spawn(resolved.command, fullArgs, {
      shell: false,
      env: process.env,
      windowsHide: true,
    });
    const onChunk = (buf: Buffer, stream: 'stdout' | 'stderr') => {
      const text = buf.toString('utf-8');
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.length) pushLog(logLines, emit, line, stream);
      }
    };
    child.stdout?.on('data', (d: Buffer) => onChunk(d, 'stdout'));
    child.stderr?.on('data', (d: Buffer) => onChunk(d, 'stderr'));
    child.on('error', err => reject(err));
    child.on('close', code => resolve(code ?? 1));
  });
}

export function sseWrite(response: ServerResponse, data: object) {
  const line = `data: ${JSON.stringify(data)}\n\n`;
  response.write(line);
}

/**
 * 从 `openclaw config file` 指向的路径读取原始 openclaw.json。
 * `openclaw config get` 会对 appSecret 等字段脱敏为 __OPENCLAW_REDACTED__，写回会破坏配置，合并/删除时应以磁盘为准。
 */
async function readOpenclawConfigRootFromDisk(
  resolved: ResolvedCli,
  logLines: string[],
  emit: ((e: TeamTeardownEvent) => void) | undefined,
  logPrefix: string,
): Promise<Record<string, unknown> | null> {
  pushTeardownLog(logLines, emit, `${logPrefix}$ openclaw config file`, 'stdout');
  const fileCap = await runOpenclawCapture(resolved, ['config', 'file']);
  if (fileCap.stderr.trim()) {
    for (const line of fileCap.stderr.split(/\r?\n/)) {
      if (line.length) pushTeardownLog(logLines, emit, line, 'stderr');
    }
  }
  const rawPath =
    fileCap.stdout.trim().split(/\r?\n/)[0]?.trim().replace(/^["']|["']$/g, '') ?? '';
  if (!rawPath) {
    pushTeardownLog(logLines, emit, `${logPrefix} 未解析到 openclaw config file 路径`, 'stdout');
    return null;
  }
  const configPath = expandUserPath(rawPath);
  pushTeardownLog(logLines, emit, `${logPrefix} 读盘: ${configPath}`, 'stdout');
  if (!fs.existsSync(configPath)) {
    pushTeardownLog(logLines, emit, `${logPrefix} 文件不存在`, 'stdout');
    return null;
  }
  try {
    const text = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      pushTeardownLog(logLines, emit, `${logPrefix} 根节点不是 JSON 对象`, 'stderr');
      return null;
    }
    return parsed as Record<string, unknown>;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    pushTeardownLog(logLines, emit, `${logPrefix} 读盘失败: ${msg}`, 'stderr');
    return null;
  }
}

/** Remove OpenClaw agents + workspace dirs for saved team `selectedIds` (aligned with configGenerator paths). */
export async function runTeamDeleteCleanup(
  config: {
    selectedIds: string[];
    /** 与团队 channels.feishu.accounts 的 key 一致，用于从磁盘 accounts 中删除；缺省为 selectedIds */
    feishuAccountKeysToRemove?: string[];
  },
  options: {
    emit?: (e: TeamTeardownEvent) => void;
  } = {},
): Promise<TeamTeardownResult> {
  const { emit } = options;
  const logLines: string[] = [];
  const selectedIds = [...config.selectedIds];
  const feishuAccountKeysToRemove =
    config.feishuAccountKeysToRemove?.length ? config.feishuAccountKeysToRemove : selectedIds;
  const cliEmit = bridgeLocalInitEmitForTeardown(emit);

  try {
    const resolved = resolveOpenclawCli();
    emit?.({ type: 'phase', phase: 'list', message: 'openclaw agents list --json' });
    pushTeardownLog(logLines, emit, '[list]$ openclaw agents list --json', 'stdout');
    const listOut = await runOpenclawCapture(resolved, ['agents', 'list', '--json']);
    if (listOut.stderr.trim()) {
      for (const line of listOut.stderr.split(/\r?\n/)) {
        if (line.length) pushTeardownLog(logLines, emit, line, 'stderr');
      }
    }
    if (listOut.code !== 0) {
      const msg = `openclaw agents list --json 退出码 ${listOut.code}`;
      emit?.({ type: 'phase', phase: 'error', message: msg });
      return { ok: false, logLines, error: msg };
    }

    let existingIds: Set<string>;
    try {
      const ids = parseAgentsListJson(listOut.stdout);
      existingIds = new Set(ids);
      pushTeardownLog(
        logLines,
        emit,
        `当前已存在智能体 id（共 ${existingIds.size} 个）: ${[...existingIds].join(', ') || '(无)'}`,
        'stdout',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emit?.({ type: 'phase', phase: 'error', message: msg });
      if (listOut.stdout.trim()) {
        pushTeardownLog(
          logLines,
          emit,
          `原始输出前 500 字符: ${listOut.stdout.slice(0, 500)}`,
          'stderr',
        );
      }
      return { ok: false, logLines, error: msg };
    }

    emit?.({
      type: 'phase',
      phase: 'delete-agents',
      message: `删除 CLI 中的智能体（本团队共 ${selectedIds.length} 个选中 id）`,
    });

    for (let i = 0; i < selectedIds.length; i++) {
      const agentId = selectedIds[i]!;
      pushTeardownLog(logLines, emit, `[${agentId}] ${i + 1}/${selectedIds.length}`, 'stdout');

      if (existingIds.has(agentId)) {
        const codeDel = await runOpenclaw(
          resolved,
          ['agents', 'delete', '--force', agentId],
          logLines,
          cliEmit,
          `[${agentId}]`,
        );
        if (codeDel !== 0) {
          const msg = `openclaw agents delete 退出码 ${codeDel}`;
          emit?.({ type: 'phase', phase: 'error', agentId, message: msg });
          return { ok: false, logLines, error: msg };
        }
        existingIds.delete(agentId);
      } else {
        pushTeardownLog(
          logLines,
          emit,
          `[${agentId}] 本地未找到该智能体，跳过 delete（避免 not found）`,
          'stdout',
        );
      }
    }

    emit?.({ type: 'phase', phase: 'rm-workspaces', message: '删除本地 workspace 目录' });

    for (let i = 0; i < selectedIds.length; i++) {
      const agentId = selectedIds[i]!;
      const wsTilde = `${TEAM_WORKSPACE_BASE}/workspace-${agentId}`;
      const wsExpanded = expandUserPath(wsTilde);
      pushTeardownLog(
        logLines,
        emit,
        `[${agentId}] 工作区 ${wsTilde} → ${wsExpanded}`,
        'stdout',
      );
      try {
        if (fs.existsSync(wsExpanded)) {
          fs.rmSync(wsExpanded, { recursive: true, force: true });
          pushTeardownLog(logLines, emit, `已删除目录 ${wsExpanded}`, 'stdout');
        } else {
          pushTeardownLog(
            logLines,
            emit,
            `[${agentId}] 目录不存在，跳过`,
            'stdout',
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        emit?.({ type: 'phase', phase: 'error', agentId, message: msg });
        return { ok: false, logLines, error: msg };
      }
    }

    emit?.({
      type: 'phase',
      phase: 'reset-config',
      message: 'channels.feishu.accounts 剔除团队 key（读盘原始值）/ bindings',
    });
    const keysRemoveSet = new Set(feishuAccountKeysToRemove);
    pushTeardownLog(
      logLines,
      emit,
      `[reset-config] 团队 accounts 待删除 key（与本地团队配置对齐）: ${[...keysRemoveSet].join(', ') || '(无)'}`,
      'stdout',
    );

    const diskRoot = await readOpenclawConfigRootFromDisk(
      resolved,
      logLines,
      emit,
      '[reset-config]',
    );
    if (diskRoot !== null) {
      const channelsFromDisk = readOpenclawJsonSubtree(diskRoot, 'channels');
      const diskAccounts = readFeishuAccountsFromChannelsSubtree(channelsFromDisk);
      const remainingAccounts = { ...diskAccounts };
      let removedAcc = 0;
      for (const k of keysRemoveSet) {
        if (Object.prototype.hasOwnProperty.call(remainingAccounts, k)) {
          delete remainingAccounts[k];
          removedAcc++;
        }
      }
      pushTeardownLog(
        logLines,
        emit,
        `[reset-config] 磁盘 accounts：已按 key 删除 ${removedAcc} 个，剩余 keys [${Object.keys(remainingAccounts).join(', ')}]`,
        'stdout',
      );

      let feishuDisk: Record<string, unknown> = {};
      if (
        channelsFromDisk !== null &&
        typeof channelsFromDisk === 'object' &&
        !Array.isArray(channelsFromDisk)
      ) {
        const fr = (channelsFromDisk as Record<string, unknown>).feishu;
        if (fr !== null && typeof fr === 'object' && !Array.isArray(fr)) {
          feishuDisk = { ...(fr as Record<string, unknown>) };
        }
      }
      const mergedFeishu: Record<string, unknown> = { ...feishuDisk, accounts: remainingAccounts };
      const feishuJson = JSON.stringify(mergedFeishu);
      const preview =
        feishuJson.length > 400 ? `${feishuJson.slice(0, 400)}…` : feishuJson;
      pushTeardownLog(logLines, emit, `[reset-config] 将执行 config set channels.feishu: ${preview}`, 'stdout');

      const codeFeishu = await runOpenclaw(
        resolved,
        ['config', 'set', 'channels.feishu', feishuJson],
        logLines,
        cliEmit,
        '[reset-config]',
      );
      if (codeFeishu !== 0) {
        const msg = `openclaw config set channels.feishu 退出码 ${codeFeishu}`;
        emit?.({ type: 'phase', phase: 'error', message: msg });
        return { ok: false, logLines, error: msg };
      }
    } else {
      pushTeardownLog(
        logLines,
        emit,
        '[reset-config] 无法读盘 openclaw.json，回退为 config set channels.feishu "{}"',
        'stdout',
      );
      const codeFeishuEmpty = await runOpenclaw(
        resolved,
        ['config', 'set', 'channels.feishu', '{}'],
        logLines,
        cliEmit,
        '[reset-config]',
      );
      if (codeFeishuEmpty !== 0) {
        const msg = `openclaw config set channels.feishu 退出码 ${codeFeishuEmpty}`;
        emit?.({ type: 'phase', phase: 'error', message: msg });
        return { ok: false, logLines, error: msg };
      }
    }

    pushTeardownLog(logLines, emit, '[reset-config]$ openclaw config get bindings', 'stdout');
    const getBindings = await runOpenclawCapture(resolved, ['config', 'get', 'bindings']);
    if (getBindings.stderr.trim()) {
      for (const line of getBindings.stderr.split(/\r?\n/)) {
        if (line.length) pushTeardownLog(logLines, emit, line, 'stderr');
      }
    }
    if (getBindings.code !== 0) {
      const msg = `openclaw config get bindings 退出码 ${getBindings.code}`;
      emit?.({ type: 'phase', phase: 'error', message: msg });
      return { ok: false, logLines, error: msg };
    }
    const getOut = getBindings.stdout.trim();
    if (getOut) {
      const short = getOut.length > 280 ? `${getOut.slice(0, 280)}…` : getOut;
      pushTeardownLog(logLines, emit, `[reset-config] get bindings stdout: ${short}`, 'stdout');
    }
    const parsedBindings = parseBindingsArrayFromGetStdout(getBindings.stdout);
    if (parsedBindings === null) {
      const msg = '无法将 openclaw config get bindings 解析为 JSON 数组';
      emit?.({ type: 'phase', phase: 'error', message: msg });
      pushTeardownLog(logLines, emit, msg, 'stderr');
      return { ok: false, logLines, error: msg };
    }
    const removeAgentIds = new Set(selectedIds);
    const mergedBindings = filterBindingsExcludingAgentIds(parsedBindings, removeAgentIds);
    const removedCount = parsedBindings.length - mergedBindings.length;
    pushTeardownLog(
      logLines,
      emit,
      `[reset-config] 按 agentId 匹配：本团队 ${selectedIds.length} 个 id，已剔除 ${removedCount} 条 binding，保留 ${mergedBindings.length} 条`,
      'stdout',
    );
    const bindingsJson = JSON.stringify(mergedBindings);
    const mergedPreview =
      bindingsJson.length > 400 ? `${bindingsJson.slice(0, 400)}…` : bindingsJson;
    pushTeardownLog(logLines, emit, `[reset-config] 将执行 config set bindings: ${mergedPreview}`, 'stdout');

    const codeBindings = await runOpenclaw(
      resolved,
      ['config', 'set', 'bindings', bindingsJson],
      logLines,
      cliEmit,
      '[reset-config]',
    );
    if (codeBindings !== 0) {
      const msg = `openclaw config set bindings 退出码 ${codeBindings}`;
      emit?.({ type: 'phase', phase: 'error', message: msg });
      return { ok: false, logLines, error: msg };
    }

    emit?.({ type: 'phase', phase: 'config-validate', message: 'openclaw config validate' });
    const codeVal = await runOpenclaw(
      resolved,
      ['config', 'validate'],
      logLines,
      cliEmit,
      '[validate]',
    );
    if (codeVal !== 0) {
      const msg = `openclaw config validate 退出码 ${codeVal}`;
      emit?.({ type: 'phase', phase: 'error', message: msg });
      return { ok: false, logLines, error: msg };
    }

    emit?.({ type: 'phase', phase: 'gateway-restart', message: 'openclaw gateway restart' });
    const codeGw = await runOpenclaw(
      resolved,
      ['gateway', 'restart'],
      logLines,
      cliEmit,
      '[gateway]',
    );
    if (codeGw !== 0) {
      const msg = `openclaw gateway restart 退出码 ${codeGw}`;
      emit?.({ type: 'phase', phase: 'error', message: msg });
      return { ok: false, logLines, error: msg };
    }

    emit?.({ type: 'phase', phase: 'done', message: '清理完成' });
    return { ok: true, logLines };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    emit?.({ type: 'phase', phase: 'error', message: msg });
    logLines.push(msg);
    return { ok: false, logLines, error: msg };
  }
}

type OpenclawConfigFileKey = 'channels' | 'bindings' | 'tools' | 'session';

const CONFIG_SET_PHASE: Record<OpenclawConfigFileKey, LocalInitProgressPhase> = {
  channels: 'config-channels',
  bindings: 'config-bindings',
  tools: 'config-tools',
  session: 'config-session',
};

/** 从 CLI 输出里抠出第一段完整 JSON（避免前缀/换行/代码块导致 parse 失败） */
function extractFirstJsonValue(raw: string): unknown | null {
  const t = raw.trim();
  if (!t) return null;
  const startObj = t.indexOf('{');
  const startArr = t.indexOf('[');
  let start = -1;
  if (startObj < 0 && startArr < 0) return null;
  if (startObj < 0) start = startArr;
  else if (startArr < 0) start = startObj;
  else start = Math.min(startObj, startArr);
  const slice = t.slice(start);
  const open = slice[0]!;
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < slice.length; i++) {
    const c = slice[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') {
      inStr = true;
      continue;
    }
    if (c === open) depth++;
    if (c === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(slice.slice(0, i + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** 解析 `openclaw config get bindings` 的 stdout 为数组；空输出视为 [] */
function parseBindingsArrayFromGetStdout(stdout: string): unknown[] | null {
  const t = stdout.trim();
  if (!t) return [];
  const extracted = extractFirstJsonValue(t);
  if (extracted !== null) {
    return Array.isArray(extracted) ? extracted : null;
  }
  try {
    const v = JSON.parse(t) as unknown;
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** 从 channels 子树读取 feishu.accounts（均为对象时）；否则返回 {} */
function readFeishuAccountsFromChannelsSubtree(channels: unknown): Record<string, unknown> {
  if (!channels || typeof channels !== 'object' || Array.isArray(channels)) {
    return {};
  }
  const feishu = (channels as Record<string, unknown>).feishu;
  if (!feishu || typeof feishu !== 'object' || Array.isArray(feishu)) {
    return {};
  }
  const accounts = (feishu as Record<string, unknown>).accounts;
  if (!accounts || typeof accounts !== 'object' || Array.isArray(accounts)) {
    return {};
  }
  return { ...(accounts as Record<string, unknown>) };
}

/** 去掉 agentId 落在 removeIds 中的 binding，其余原样保留 */
function filterBindingsExcludingAgentIds(bindings: unknown[], removeIds: Set<string>): unknown[] {
  return bindings.filter(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return true;
    }
    const id = (entry as { agentId?: unknown }).agentId;
    if (typeof id !== 'string' || id.length === 0) {
      return true;
    }
    return !removeIds.has(id);
  });
}

function valueLooksConfigured(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'object' && !Array.isArray(v)) {
    return Object.keys(v as Record<string, unknown>).length > 0;
  }
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

function configGetIndicatesPresent(
  key: OpenclawConfigFileKey,
  stdout: string,
  logLines: string[],
  emit: ((e: LocalInitEvent) => void) | undefined,
): boolean {
  const t = stdout.trim();
  if (!t) return false;
  const extracted = extractFirstJsonValue(t);
  if (extracted !== null) {
    return valueLooksConfigured(extracted);
  }
  try {
    const v = JSON.parse(t) as unknown;
    return valueLooksConfigured(v);
  } catch {
    pushLog(
      logLines,
      emit,
      `[config get ${key}] 输出非 JSON，按「非空即视为有配置」处理`,
      'stdout',
    );
    return true;
  }
}

/** channels：仅替换/写入 `feishu`，其它通道（如 discord 等）整段保留自磁盘。 */
function mergeChannelsForSet(fileVal: unknown, payloadVal: unknown): unknown | undefined {
  if (fileVal === undefined && payloadVal === undefined) return undefined;
  const base =
    fileVal !== null && typeof fileVal === 'object' && !Array.isArray(fileVal)
      ? { ...(fileVal as Record<string, unknown>) }
      : {};
  if (payloadVal !== null && typeof payloadVal === 'object' && !Array.isArray(payloadVal)) {
    const p = payloadVal as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(p, 'feishu')) {
      base.feishu = p.feishu;
    }
  }
  return Object.keys(base).length > 0 ? base : undefined;
}

/**
 * bindings：以磁盘为底，按 agentId 对齐；payload 有则更新整条，无则追加；未出现在 payload 中的项原样保留。
 */
function mergeBindingsByAgentId(fileVal: unknown, payloadVal: unknown): unknown | undefined {
  if (fileVal === undefined && payloadVal === undefined) return undefined;
  if (payloadVal === undefined) return fileVal;
  if (!Array.isArray(payloadVal)) return fileVal !== undefined ? fileVal : undefined;

  const result: Array<Record<string, unknown>> = [];
  if (Array.isArray(fileVal)) {
    for (const item of fileVal) {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        result.push({ ...(item as Record<string, unknown>) });
      }
    }
  }
  const indexByAgent = new Map<string, number>();
  for (let i = 0; i < result.length; i++) {
    const id = result[i]!.agentId;
    if (typeof id === 'string' && id.length > 0 && !indexByAgent.has(id)) {
      indexByAgent.set(id, i);
    }
  }
  for (const raw of payloadVal) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const pItem = raw as Record<string, unknown>;
    const id = pItem.agentId;
    if (typeof id !== 'string' || !id.length) continue;
    if (indexByAgent.has(id)) {
      result[indexByAgent.get(id)!] = { ...pItem };
    } else {
      indexByAgent.set(id, result.length);
      result.push({ ...pItem });
    }
  }
  return result;
}

/**
 * tools / session：对象深度按 key 合并——payload 里有的 key 更新或新增；仅磁盘有的 key 保留；遇到双方皆为非数组对象则递归，否则叶子以 payload 为准。
 */
function mergeObjectsDeepByKey(file: unknown, payload: unknown): unknown | undefined {
  if (file === undefined && payload === undefined) return undefined;
  if (payload === undefined || payload === null) return file;
  if (file === undefined || file === null) return payload;
  if (Array.isArray(file) || Array.isArray(payload)) return payload;
  if (typeof file !== 'object' || typeof payload !== 'object') return payload;

  const f = file as Record<string, unknown>;
  const p = payload as Record<string, unknown>;
  const out: Record<string, unknown> = { ...f };
  for (const k of Object.keys(p)) {
    const pv = p[k];
    const fv = f[k];
    if (
      pv !== null &&
      typeof pv === 'object' &&
      !Array.isArray(pv) &&
      fv !== null &&
      typeof fv === 'object' &&
      !Array.isArray(fv)
    ) {
      const merged = mergeObjectsDeepByKey(fv, pv);
      if (merged !== undefined) out[k] = merged as object;
    } else {
      out[k] = pv;
    }
  }
  return out;
}

function mergeConfigSubtreeForSet(
  key: OpenclawConfigFileKey,
  fileVal: unknown,
  payloadVal: unknown,
): unknown | undefined {
  if (key === 'channels') {
    return mergeChannelsForSet(fileVal, payloadVal);
  }
  if (key === 'bindings') {
    return mergeBindingsByAgentId(fileVal, payloadVal);
  }
  if (key === 'tools' || key === 'session') {
    return mergeObjectsDeepByKey(fileVal, payloadVal);
  }
  return undefined;
}

function logConfigValuePreview(
  logLines: string[],
  emit: ((e: LocalInitEvent) => void) | undefined,
  tag: string,
  v: unknown,
) {
  if (v === undefined) {
    pushLog(logLines, emit, `${tag}: (无)`, 'stdout');
    return;
  }
  const s = JSON.stringify(v);
  const short = s.length > 520 ? `${s.slice(0, 520)}…` : s;
  pushLog(logLines, emit, `${tag}: ${short}`, 'stdout');
}

/** 顶层无 key 时尝试从常见嵌套根读取（如 { "openclaw": { "channels": ... } }） */
function readOpenclawJsonSubtree(root: Record<string, unknown>, key: string): unknown {
  if (Object.prototype.hasOwnProperty.call(root, key)) {
    return root[key];
  }
  const nestedRoots = ['openclaw', 'config', 'openClaw'] as const;
  for (const nr of nestedRoots) {
    const inner = root[nr];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const o = inner as Record<string, unknown>;
      if (Object.prototype.hasOwnProperty.call(o, key)) {
        return o[key];
      }
    }
  }
  return undefined;
}

async function runLocalInitOpenclawConfigCli(
  resolved: ResolvedCli,
  logLines: string[],
  emit: ((e: LocalInitEvent) => void) | undefined,
  pushStep: (rec: LocalInitStepRecord) => void,
  payload: LocalInitPayload,
): Promise<{ ok: boolean; error?: string }> {
  const keys: OpenclawConfigFileKey[] = ['channels', 'bindings', 'tools', 'session'];
  const payloadRoot = payload.openclawConfig as Record<string, unknown>;

  emit?.({ type: 'phase', phase: 'config-path', message: 'openclaw config file' });
  pushLog(logLines, emit, '[config-path]$ openclaw config file', 'stdout');
  const fileCap = await runOpenclawCapture(resolved, ['config', 'file']);
  if (fileCap.stderr.trim()) {
    for (const line of fileCap.stderr.split(/\r?\n/)) {
      if (line.length) pushLog(logLines, emit, line, 'stderr');
    }
  }
  if (fileCap.stdout.trim()) {
    pushLog(
      logLines,
      emit,
      `[config-path] openclaw config file stdout:\n${fileCap.stdout.trimEnd()}`,
      'stdout',
    );
  }
  if (fileCap.code !== 0) {
    pushLog(
      logLines,
      emit,
      `[config-path] openclaw config file 退出码 ${fileCap.code}（仅输出记录，不因此中断初始化）`,
      'stdout',
    );
  }

  const rawPath =
    fileCap.stdout.trim().split(/\r?\n/)[0]?.trim().replace(/^["']|["']$/g, '') ?? '';
  let root: Record<string, unknown>;

  if (!rawPath) {
    pushLog(
      logLines,
      emit,
      '[config-path] 未解析到配置文件路径，跳过读盘（后续合并仅使用请求体）',
      'stdout',
    );
    root = {};
  } else {
    const configPath = expandUserPath(rawPath);
    pushLog(logLines, emit, `配置文件路径: ${configPath}`, 'stdout');
    if (!fs.existsSync(configPath)) {
      pushLog(
        logLines,
        emit,
        `[config-path] 文件不存在: ${configPath}，跳过读盘（后续合并仅使用请求体）`,
        'stdout',
      );
      root = {};
    } else {
      try {
        const text = fs.readFileSync(configPath, 'utf-8');
        const parsed = JSON.parse(text) as unknown;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('openclaw.json 根节点不是 JSON 对象');
        }
        root = parsed as Record<string, unknown>;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        emit?.({ type: 'phase', phase: 'error', message: msg });
        pushStep({ phase: 'error', ok: false, detail: msg });
        return { ok: false, error: msg };
      }
    }
  }

  const presentKeys = keys.filter(k => readOpenclawJsonSubtree(root, k) !== undefined);
  pushLog(
    logLines,
    emit,
    `[config-path] openclaw.json 中可解析到以下键（含嵌套 openclaw/config）: ${
      presentKeys.length ? presentKeys.join(', ') : '(无 channels/bindings/tools/session)'
    }`,
    'stdout',
  );

  pushStep({ phase: 'config-path', ok: true, detail: 'file-ok' });

  for (const key of keys) {
    const ph = CONFIG_SET_PHASE[key];
    const fromFile = readOpenclawJsonSubtree(root, key);
    const fromPayload = payloadRoot[key];
    const merged = mergeConfigSubtreeForSet(key, fromFile, fromPayload);

    emit?.({ type: 'phase', phase: ph, message: `openclaw config get ${key}` });
    logConfigValuePreview(logLines, emit, `[${ph}] 磁盘 openclaw.json.${key}`, fromFile);
    logConfigValuePreview(logLines, emit, `[${ph}] 请求体 openclawConfig.${key}`, fromPayload);
    logConfigValuePreview(logLines, emit, `[${ph}] 合并后待写入`, merged);

    pushLog(logLines, emit, `[${ph}]$ openclaw config get ${key}`, 'stdout');
    const getCap = await runOpenclawCapture(resolved, ['config', 'get', key]);
    if (getCap.stderr.trim()) {
      for (const line of getCap.stderr.split(/\r?\n/)) {
        if (line.length) pushLog(logLines, emit, line, 'stderr');
      }
    }

    if (merged === undefined) {
      if (getCap.code !== 0) {
        const msg = `openclaw config get ${key} 退出码 ${getCap.code}，且磁盘/请求体均无「${key}」可写入`;
        emit?.({ type: 'phase', phase: 'error', message: msg });
        pushStep({ phase: 'error', ok: false, detail: msg });
        return { ok: false, error: msg };
      }
      const cliHas = configGetIndicatesPresent(key, getCap.stdout, logLines, emit);
      const preview = getCap.stdout.trim();
      if (preview) {
        const short = preview.length > 240 ? `${preview.slice(0, 240)}…` : preview;
        pushLog(logLines, emit, `[${ph}] get stdout: ${short}`, 'stdout');
      }
      if (!cliHas) {
        pushLog(
          logLines,
          emit,
          `[${ph}] 磁盘与请求体均无「${key}」，且 CLI get 无有效值，跳过 config set`,
          'stdout',
        );
        pushStep({ phase: ph, ok: true, detail: 'skipped-no-value' });
        continue;
      }
      const msg = `openclaw config get ${key} 有输出，但磁盘与请求体均无「${key}」，无法与 openclaw.json 对齐写入`;
      emit?.({ type: 'phase', phase: 'error', message: msg });
      pushLog(logLines, emit, msg, 'stderr');
      pushStep({ phase: 'error', ok: false, detail: msg });
      return { ok: false, error: msg };
    }

    if (getCap.code !== 0) {
      pushLog(
        logLines,
        emit,
        `[${ph}] openclaw config get ${key} 退出码 ${getCap.code}（仍将按合并结果执行 config set）`,
        'stderr',
      );
    } else {
      const cliHas = configGetIndicatesPresent(key, getCap.stdout, logLines, emit);
      const preview = getCap.stdout.trim();
      if (preview) {
        const short = preview.length > 240 ? `${preview.slice(0, 240)}…` : preview;
        pushLog(logLines, emit, `[${ph}] get stdout: ${short}`, 'stdout');
      }
      pushLog(
        logLines,
        emit,
        `[${ph}] CLI 判定「${key}」${cliHas ? '有' : '无'}有效配置（不影响合并写入）`,
        'stdout',
      );
    }

    if (key === 'channels') {
      const fileAccounts = readFeishuAccountsFromChannelsSubtree(fromFile);
      const payloadAccounts = readFeishuAccountsFromChannelsSubtree(fromPayload);
      const mergedAcc = { ...fileAccounts, ...payloadAccounts };
      const keysFile = Object.keys(fileAccounts);
      const keysPayload = Object.keys(payloadAccounts);
      const keysMerged = Object.keys(mergedAcc);
      pushLog(
        logLines,
        emit,
        `[config-channels] accounts 合并（磁盘 openclaw.json + 请求体；不使用 openclaw config get，避免 __OPENCLAW_REDACTED__）：file keys [${keysFile.join(', ')}]；payload keys [${keysPayload.join(', ')}]；合并后 keys [${keysMerged.join(', ')}]`,
        'stdout',
      );
      const ch = merged as Record<string, unknown>;
      const feishuRaw = ch.feishu;
      const feishuBase =
        feishuRaw !== null && typeof feishuRaw === 'object' && !Array.isArray(feishuRaw)
          ? { ...(feishuRaw as Record<string, unknown>) }
          : {};
      const mergedFeishu = { ...feishuBase, accounts: mergedAcc };
      const feishuJson = JSON.stringify(mergedFeishu);
      const codeFeishu = await runOpenclaw(
        resolved,
        ['config', 'set', 'channels.feishu', feishuJson],
        logLines,
        emit,
        `[${ph}]`,
      );
      if (codeFeishu !== 0) {
        const msg = `openclaw config set channels.feishu 退出码 ${codeFeishu}`;
        emit?.({ type: 'phase', phase: 'error', message: msg });
        pushStep({ phase: 'error', ok: false, detail: msg });
        return { ok: false, error: msg };
      }
      pushStep({ phase: ph, ok: true, detail: 'set-feishu-accounts-merge' });
      continue;
    }

    const json = JSON.stringify(merged);
    const codeSet = await runOpenclaw(
      resolved,
      ['config', 'set', key, json],
      logLines,
      emit,
      `[${ph}]`,
    );
    if (codeSet !== 0) {
      const msg = `openclaw config set ${key} 退出码 ${codeSet}`;
      emit?.({ type: 'phase', phase: 'error', message: msg });
      pushStep({ phase: 'error', ok: false, detail: msg });
      return { ok: false, error: msg };
    }
    pushStep({ phase: ph, ok: true, detail: 'set-ok' });
  }

  emit?.({ type: 'phase', phase: 'config-validate', message: 'openclaw config validate' });
  const codeVal = await runOpenclaw(
    resolved,
    ['config', 'validate'],
    logLines,
    emit,
    '[validate]',
  );
  if (codeVal !== 0) {
    const msg = `openclaw config validate 退出码 ${codeVal}`;
    emit?.({ type: 'phase', phase: 'error', message: msg });
    pushStep({ phase: 'error', ok: false, detail: msg });
    return { ok: false, error: msg };
  }
  pushStep({ phase: 'config-validate', ok: true, detail: 'ok' });

  emit?.({ type: 'phase', phase: 'gateway-restart', message: 'openclaw gateway restart' });
  const codeGw = await runOpenclaw(
    resolved,
    ['gateway', 'restart'],
    logLines,
    emit,
    '[gateway]',
  );
  if (codeGw !== 0) {
    const msg = `openclaw gateway restart 退出码 ${codeGw}`;
    emit?.({ type: 'phase', phase: 'error', message: msg });
    pushStep({ phase: 'error', ok: false, detail: msg });
    return { ok: false, error: msg };
  }
  pushStep({ phase: 'gateway-restart', ok: true, detail: 'ok' });

  return { ok: true };
}

export async function handleTeamTeardownSse(
  response: ServerResponse,
  selectedIds: string[],
  feishuAccountKeysToRemove: string[] | undefined,
  onCleanupSuccess: () => boolean,
): Promise<void> {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  const result = await runTeamDeleteCleanup(
    { selectedIds, feishuAccountKeysToRemove },
    {
      emit: e => {
        sseWrite(response, e);
      },
    },
  );

  let dbDeleted = false;
  if (result.ok) {
    dbDeleted = onCleanupSuccess();
  }

  sseWrite(response, {
    type: 'result',
    ok: result.ok,
    error: result.error,
    logLines: result.logLines,
    dbDeleted,
  });
  response.end();
}

export async function runLocalOpenclawInit(
  body: unknown,
  options: {
    emit?: (e: LocalInitEvent) => void;
  } = {},
): Promise<LocalInitResult> {
  const { emit } = options;
  const logLines: string[] = [];
  const steps: LocalInitStepRecord[] = [];

  const pushStep = (rec: LocalInitStepRecord) => {
    steps.push(rec);
  };

  try {
    const payload = validatePayload(body);
    const resolved = resolveOpenclawCli();
    const list = payload.openclawConfig.agents.list;

    emit?.({ type: 'phase', phase: 'create-roles', message: `openclaw CLI（${list.length} 个 Agent）` });

    pushLog(logLines, emit, '[list]$ openclaw agents list --json', 'stdout');
    const listOut = await runOpenclawCapture(resolved, ['agents', 'list', '--json']);
    if (listOut.stderr.trim()) {
      for (const line of listOut.stderr.split(/\r?\n/)) {
        if (line.length) pushLog(logLines, emit, line, 'stderr');
      }
    }
    if (listOut.code !== 0) {
      const msg = `openclaw agents list --json 退出码 ${listOut.code}`;
      emit?.({ type: 'phase', phase: 'error', message: msg });
      pushStep({ phase: 'error', ok: false, detail: msg });
      return { ok: false, steps, logLines, error: msg };
    }

    let existingIds: Set<string>;
    try {
      const ids = parseAgentsListJson(listOut.stdout);
      existingIds = new Set(ids);
      pushLog(
        logLines,
        emit,
        `当前已存在智能体 id（共 ${existingIds.size} 个）: ${[...existingIds].join(', ') || '(无)'}`,
        'stdout',
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      emit?.({ type: 'phase', phase: 'error', message: msg });
      pushStep({ phase: 'error', ok: false, detail: msg });
      if (listOut.stdout.trim()) {
        pushLog(logLines, emit, `原始输出前 500 字符: ${listOut.stdout.slice(0, 500)}`, 'stderr');
      }
      return { ok: false, steps, logLines, error: msg };
    }

    for (let i = 0; i < list.length; i++) {
      const agent = list[i]!;
      const agentId = agent.id;
      const wsExpanded = expandUserPath(agent.workspace);

      pushLog(logLines, emit, `[${agentId}] Agent ${i + 1}/${list.length}`, 'stdout');

      if (existingIds.has(agentId)) {
        const codeDel = await runOpenclaw(
          resolved,
          ['agents', 'delete', '--force', agentId],
          logLines,
          emit,
          `[${agentId}]`,
        );
        if (codeDel !== 0) {
          const msg = `openclaw agents delete 退出码 ${codeDel}`;
          emit?.({ type: 'phase', phase: 'error', agentId, message: msg });
          pushStep({ phase: 'error', ok: false, detail: msg, agentId, agentIndex: i });
          return { ok: false, steps, logLines, error: msg };
        }
        existingIds.delete(agentId);
        if (!removeWorkspaceDirPhysicalForInit(wsExpanded, agentId, logLines, emit)) {
          const msg = `物理删除工作区失败: ${agentId}`;
          pushStep({ phase: 'error', ok: false, detail: msg, agentId, agentIndex: i });
          return { ok: false, steps, logLines, error: msg };
        }
      } else {
        pushLog(
          logLines,
          emit,
          `[${agentId}] 本地未找到该智能体，跳过 delete 与目录清理（新角色将直接 add）`,
          'stdout',
        );
      }

      const codeAdd = await runOpenclaw(
        resolved,
        ['agents', 'add', '--non-interactive', '--workspace', wsExpanded, agentId],
        logLines,
        emit,
        `[${agentId}]`,
      );
      if (codeAdd !== 0) {
        const msg = `openclaw agents add 退出码 ${codeAdd}`;
        emit?.({ type: 'phase', phase: 'error', agentId, message: msg });
        pushStep({ phase: 'error', ok: false, detail: msg, agentId, agentIndex: i });
        return { ok: false, steps, logLines, error: msg };
      }
    }

    pushStep({ phase: 'create-roles', ok: true, detail: 'cli-finished' });

    emit?.({
      type: 'phase',
      phase: 'write-workspace',
      message: '写入 SOUL.md / AGENTS.md / USER.md',
    });

    for (let i = 0; i < list.length; i++) {
      const agent = list[i]!;
      const agentId = agent.id;
      const wsExpanded = expandUserPath(agent.workspace);
      const soulKey = `workspace-${agentId}`;
      const bundle = payload.soulFiles[soulKey];
      if (!bundle) {
        const msg = `soulFiles 缺少键 ${soulKey}`;
        emit?.({ type: 'phase', phase: 'error', agentId, message: msg });
        pushStep({ phase: 'error', ok: false, detail: msg, agentId });
        return { ok: false, steps, logLines, error: msg };
      }

      fs.mkdirSync(wsExpanded, { recursive: true });
      for (const fileName of ['SOUL.md', 'AGENTS.md', 'USER.md'] as const) {
        const content = bundle[fileName];
        if (typeof content !== 'string') {
          const msg = `${soulKey} 缺少 ${fileName}`;
          emit?.({ type: 'phase', phase: 'error', agentId, message: msg });
          pushStep({ phase: 'error', ok: false, detail: msg, agentId });
          return { ok: false, steps, logLines, error: msg };
        }
        const dest = path.join(wsExpanded, fileName);
        fs.writeFileSync(dest, content, 'utf-8');
        pushLog(logLines, emit, `已写入 ${dest}`, 'stdout');
      }
    }

    pushStep({ phase: 'write-workspace', ok: true, detail: 'workspace-md' });

    const cfgCli = await runLocalInitOpenclawConfigCli(resolved, logLines, emit, pushStep, payload);
    if (!cfgCli.ok) {
      return { ok: false, steps, logLines, error: cfgCli.error };
    }

    emit?.({ type: 'phase', phase: 'done' });
    pushStep({ phase: 'done', ok: true });
    return { ok: true, steps, logLines };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    emit?.({ type: 'phase', phase: 'error', message: msg });
    pushStep({ phase: 'error', ok: false, detail: msg });
    logLines.push(msg);
    return { ok: false, steps, logLines, error: msg };
  }
}

/** Run init and stream SSE events to response; ends the response. */
export async function handleLocalInitSse(body: unknown, response: ServerResponse): Promise<void> {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*',
  });

  const result = await runLocalOpenclawInit(body, {
    emit: e => {
      sseWrite(response, e);
    },
  });

  sseWrite(response, {
    type: 'result',
    ok: result.ok,
    steps: result.steps,
    error: result.error,
    logLines: result.logLines,
  });
  response.end();
}
