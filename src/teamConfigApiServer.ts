import * as http from 'http';
import { URL } from 'url';
import {
  listTeamConfigs,
  getTeamConfig,
  saveTeamConfig,
  deleteTeamConfig,
  buildSummary,
  type TeamConfigPayload,
  type SavedTeamConfig,
} from './teamConfigStore';
import {
  listRoles,
  saveRole,
  deleteRole,
  type RoleLibraryItem,
} from './roleLibraryStore';
import { listCategories, addCategory } from './roleCategoryStore';
import { getDb, getDbPath } from './db';
import { handleLocalInitSse, handleTeamTeardownSse, runLocalOpenclawInit } from './localOpenclawInit';

const PORT = Number(process.env.TEAM_CONFIG_API_PORT || 3789);

function json(response: http.ServerResponse, statusCode: number, data: unknown) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(JSON.stringify(data, null, 2));
}

function text(response: http.ServerResponse, statusCode: number, message: string) {
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(message);
}

function parseRequestBody(request: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on('data', chunk => chunks.push(Buffer.from(chunk)));
    request.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf-8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

function validateTeamPayload(payload: unknown): asserts payload is TeamConfigPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('无效的团队配置数据');
  }

  const config = payload as Partial<TeamConfigPayload>;
  if (!config.name || typeof config.name !== 'string') {
    throw new Error('团队名称不能为空');
  }
  if (!Array.isArray(config.templates)) {
    throw new Error('templates 必须是数组');
  }
  if (!Array.isArray(config.selectedIds)) {
    throw new Error('selectedIds 必须是数组');
  }
  if (!config.credentials || typeof config.credentials !== 'object') {
    throw new Error('credentials 必须是对象');
  }
  if (!config.defaultAgentId || typeof config.defaultAgentId !== 'string') {
    throw new Error('defaultAgentId 不能为空');
  }
  if (!Array.isArray(config.edges)) {
    throw new Error('edges 必须是数组');
  }
}

function validateRolePayload(payload: unknown): asserts payload is RoleLibraryItem {
  if (!payload || typeof payload !== 'object') {
    throw new Error('无效的角色数据');
  }
  const item = payload as Partial<RoleLibraryItem>;
  if (!item.id || typeof item.id !== 'string') {
    throw new Error('角色 id 不能为空');
  }
  if (!item.name || typeof item.name !== 'string') {
    throw new Error('角色 name 不能为空');
  }
}

async function handleRequest(request: http.IncomingMessage, response: http.ServerResponse) {
  if (!request.url || !request.method) {
    text(response, 400, '无效请求');
    return;
  }

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    });
    response.end();
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || `localhost:${PORT}`}`);
  let pathname = url.pathname.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
  if (pathname.startsWith('/team-configs') && !pathname.startsWith('/api/')) {
    pathname = '/api' + pathname;
  }
  if (pathname.startsWith('/role-library') && !pathname.startsWith('/api/')) {
    pathname = '/api' + pathname;
  }

  if ((pathname === '/api/health' || pathname === '/health') && request.method === 'GET') {
    json(response, 200, { ok: true, db: getDbPath() });
    return;
  }

  // --- Local OpenClaw init (CLI + workspace files) ---
  if (pathname === '/api/local-init' && request.method === 'POST') {
    try {
      const payload = await parseRequestBody(request);
      const accept = request.headers.accept || '';
      if (accept.includes('text/event-stream')) {
        await handleLocalInitSse(payload, response);
        return;
      }
      const result = await runLocalOpenclawInit(payload);
      json(response, result.ok ? 200 : 500, result);
    } catch (error) {
      text(response, 400, error instanceof Error ? error.message : '本地初始化失败');
    }
    return;
  }

  // --- Team configs ---
  if (pathname === '/api/team-configs' && request.method === 'GET') {
    const items = listTeamConfigs().map(buildSummary);
    json(response, 200, { items });
    return;
  }

  if (pathname === '/api/team-configs' && request.method === 'POST') {
    try {
      const payload = await parseRequestBody(request);
      validateTeamPayload(payload);
      const config = saveTeamConfig(payload);
      json(response, 200, { item: buildSummary(config), config });
    } catch (error) {
      text(response, 400, error instanceof Error ? error.message : '保存团队配置失败');
    }
    return;
  }

  const teamTeardownMatch = pathname.match(/^\/api\/team-configs\/(.+)\/teardown$/);
  if (teamTeardownMatch && request.method === 'POST') {
    const id = decodeURIComponent(teamTeardownMatch[1] ?? '').trim();
    if (!id) {
      text(response, 400, '团队 ID 不能为空');
      return;
    }
    const accept = request.headers.accept || '';
    if (!accept.includes('text/event-stream')) {
      text(response, 400, '需要 Accept: text/event-stream');
      return;
    }
    const config = getTeamConfig(id);
    if (!config) {
      text(response, 404, '未找到团队配置');
      return;
    }
    const selectedIds = Array.isArray(config.selectedIds) ? (config.selectedIds as string[]) : [];
    const credentialKeys =
      config.credentials && typeof config.credentials === 'object' && !Array.isArray(config.credentials)
        ? Object.keys(config.credentials as Record<string, unknown>)
        : selectedIds;
    await handleTeamTeardownSse(response, selectedIds, credentialKeys, () => deleteTeamConfig(id));
    return;
  }

  const teamIdMatch = pathname.match(/^\/api\/team-configs\/(.+)$/);
  if (teamIdMatch && request.method === 'GET') {
    const id = decodeURIComponent(teamIdMatch[1]).trim();
    if (!id) {
      text(response, 400, '团队 ID 不能为空');
      return;
    }
    const config = getTeamConfig(id);
    if (!config) {
      text(response, 404, '未找到团队配置');
      return;
    }
    json(response, 200, { item: buildSummary(config), config });
    return;
  }

  if (teamIdMatch && request.method === 'DELETE') {
    const id = decodeURIComponent(teamIdMatch[1]).trim();
    const deleted = deleteTeamConfig(id);
    if (!deleted) {
      text(response, 404, '未找到团队配置');
      return;
    }
    json(response, 200, { ok: true });
    return;
  }

  // --- Role library ---
  if (pathname === '/api/role-library' && request.method === 'GET') {
    const items = listRoles();
    json(response, 200, { items });
    return;
  }

  if (pathname === '/api/role-library' && request.method === 'POST') {
    try {
      const payload = await parseRequestBody(request);
      validateRolePayload(payload);
      const item = saveRole(payload);
      json(response, 200, { item });
    } catch (error) {
      text(response, 400, error instanceof Error ? error.message : '保存角色失败');
    }
    return;
  }

  // --- Role categories ---
  if (pathname === '/api/role-categories' && request.method === 'GET') {
    const items = listCategories();
    json(response, 200, { items });
    return;
  }

  if (pathname === '/api/role-categories' && request.method === 'POST') {
    try {
      const payload = await parseRequestBody(request);
      const body = payload as { label?: string };
      const label = typeof body?.label === 'string' ? body.label.trim() : '';
      if (!label) {
        text(response, 400, '分类名称不能为空');
        return;
      }
      const item = addCategory(label);
      json(response, 200, { item });
    } catch (error) {
      text(response, 400, error instanceof Error ? error.message : '创建分类失败');
    }
    return;
  }

  const roleIdMatch = pathname.match(/^\/api\/role-library\/(.+)$/);
  if (roleIdMatch && request.method === 'DELETE') {
    const id = decodeURIComponent(roleIdMatch[1]).trim();
    const deleted = deleteRole(id);
    if (!deleted) {
      text(response, 404, '未找到角色');
      return;
    }
    json(response, 200, { ok: true });
    return;
  }

  text(response, 404, '接口不存在');
}

export function startTeamConfigApiServer(port = PORT) {
  getDb();
  const server = http.createServer((request, response) => {
    void handleRequest(request, response);
  });

  server.listen(port, () => {
    console.log(`Team config API server listening on http://localhost:${port}`);
    console.log(`Using SQLite database`);
  });

  return server;
}

if (require.main === module) {
  startTeamConfigApiServer();
}
