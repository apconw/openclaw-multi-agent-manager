import type { RoleLibraryItem } from '../types';

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

export async function listRoles(): Promise<RoleLibraryItem[]> {
  const res = await requestJson<{ items: RoleLibraryItem[] }>('/role-library');
  return res.items;
}

export async function saveRole(item: RoleLibraryItem): Promise<RoleLibraryItem> {
  const res = await requestJson<{ item: RoleLibraryItem }>('/role-library', {
    method: 'POST',
    body: JSON.stringify(item),
  });
  return res.item;
}

export async function deleteRole(id: string): Promise<void> {
  await requestJson<{ ok: boolean }>(`/role-library/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export interface RoleCategory {
  id: string;
  label: string;
}

export async function listCategories(): Promise<RoleCategory[]> {
  const res = await requestJson<{ items: RoleCategory[] }>('/role-categories');
  return res.items;
}

export async function addCategory(label: string): Promise<RoleCategory> {
  const res = await requestJson<{ item: RoleCategory }>('/role-categories', {
    method: 'POST',
    body: JSON.stringify({ label: label.trim() }),
  });
  return res.item;
}
