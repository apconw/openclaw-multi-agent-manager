import { useCallback, useEffect, useMemo, useState } from 'react';
import { ROLE_LIBRARY } from '@shared/role-library';
import { listRoles, saveRole as apiSaveRole, deleteRole as apiDeleteRole } from '../utils/roleLibraryApi';
import type { RoleCategory, RoleLibraryItem } from '../types';

export function useRoleLibrary() {
  const [dbRoles, setDbRoles] = useState<RoleLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await listRoles();
      setDbRoles(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载角色库失败');
      setDbRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const presetRoleIds = useMemo(() => {
    const ids = new Set<string>();
    (ROLE_LIBRARY ?? []).forEach(cat => cat.items.forEach(item => ids.add(item.id)));
    return ids;
  }, []);

  const dbRolesById = useMemo(() => {
    const map = new Map<string, RoleLibraryItem>();
    dbRoles.forEach(r => map.set(r.id, r));
    return map;
  }, [dbRoles]);

  const mergedLibrary: RoleCategory[] = useMemo(() => {
    const presetCategoryMap = new Map<string, { id: string; label: string }>();
    (ROLE_LIBRARY ?? []).forEach(cat => {
      presetCategoryMap.set(cat.id, { id: cat.id, label: cat.label });
      presetCategoryMap.set(cat.label, { id: cat.id, label: cat.label });
    });

    const itemsWithCategory: Array<{ item: RoleLibraryItem; categoryLabel: string; categoryId: string; createdAt: number }> = [];

    for (const cat of ROLE_LIBRARY ?? []) {
      for (const item of cat.items) {
        const dbItem = dbRolesById.get(item.id) ?? item;
        const createdAt = dbItem.createdAt ?? 0;
        itemsWithCategory.push({
          item: dbItem,
          categoryLabel: cat.label,
          categoryId: cat.id,
          createdAt,
        });
      }
    }

    for (const dbItem of dbRoles) {
      if (presetRoleIds.has(dbItem.id)) continue;
      const catLabel = dbItem.category?.trim() || '其他';
      const preset = presetCategoryMap.get(catLabel);
      const categoryId = preset?.id ?? catLabel;
      const categoryLabel = preset?.label ?? catLabel;
      itemsWithCategory.push({
        item: dbItem,
        categoryLabel,
        categoryId,
        createdAt: dbItem.createdAt ?? 0,
      });
    }

    const byCategory = new Map<string, Array<{ item: RoleLibraryItem; createdAt: number }>>();
    for (const { item, categoryLabel, categoryId, createdAt } of itemsWithCategory) {
      const key = `${categoryId}\0${categoryLabel}`;
      if (!byCategory.has(key)) byCategory.set(key, []);
      byCategory.get(key)!.push({ item, createdAt });
    }

    const categories: Array<RoleCategory & { _maxCreatedAt?: number }> = [];
    for (const [key, entries] of byCategory) {
      const [, label] = key.split('\0');
      entries.sort((a, b) => b.createdAt - a.createdAt);
      const maxCreatedAt = Math.max(...entries.map(e => e.createdAt));
      categories.push({
        id: key.split('\0')[0],
        label,
        items: entries.map(e => e.item),
        _maxCreatedAt: maxCreatedAt,
      });
    }

    categories.sort((a, b) => (b._maxCreatedAt ?? 0) - (a._maxCreatedAt ?? 0));
    return categories.map(({ _maxCreatedAt, ...cat }) => cat);
  }, [dbRoles, dbRolesById, presetRoleIds]);

  const saveRole = useCallback(
    async (item: RoleLibraryItem) => {
      await apiSaveRole(item);
      await refresh();
    },
    [refresh]
  );

  const deleteRole = useCallback(
    async (id: string) => {
      await apiDeleteRole(id);
      await refresh();
    },
    [refresh]
  );

  const isDeletable = useCallback(
    (id: string) => dbRolesById.has(id),
    [dbRolesById]
  );

  return {
    mergedLibrary,
    loading,
    error,
    refresh,
    saveRole,
    deleteRole,
    isDeletable,
  };
}
