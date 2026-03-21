import { useMemo, useState } from 'react';
import { Search, BookOpen, Layers, ChevronDown, Plus } from 'lucide-react';
import { RoleLibraryCard } from './RoleLibraryCard';
import { RoleLibraryModal } from './RoleLibraryModal';
import { useRoleLibrary } from '../hooks/useRoleLibrary';
import type { RoleCategory, RoleLibraryItem } from '../types';

export function RoleLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{ mode: 'create' | 'edit'; item?: RoleLibraryItem } | null>(null);

  const {
    mergedLibrary,
    loading,
    error,
    saveRole,
    deleteRole,
    isDeletable,
  } = useRoleLibrary();

  const allRoleIds = useMemo(() => {
    const ids = new Set<string>();
    mergedLibrary.forEach(cat => cat.items.forEach(item => ids.add(item.id)));
    return ids;
  }, [mergedLibrary]);

  const filteredData = useMemo(() => {
    const library = mergedLibrary;
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return library;
    }
    return library.map(cat => ({
      ...cat,
      items: cat.items.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.nameEn.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.descriptionEn.toLowerCase().includes(q)
      ),
    })).filter(cat => cat.items.length > 0);
  }, [searchQuery, mergedLibrary]);

  const displayCategories = activeCategoryId
    ? filteredData.filter(cat => cat.id === activeCategoryId)
    : filteredData;

  const totalCount = filteredData.reduce((sum, cat) => sum + cat.items.length, 0);

  if (loading) {
    return (
      <div className="animate-fade-in flex items-center justify-center py-16">
        <p className="text-sm text-gray-500">加载角色库中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center py-16">
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-gray-400 mt-1">请确保 API 服务已启动（npm run team-config-api）</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-500" />
            角色库
          </h2>
          <p className="text-sm text-gray-500 mt-1.5">
            共 {totalCount} 个专业角色，{filteredData.length} 个分类
          </p>
        </div>
        <button
          onClick={() => setModalState({ mode: 'create' })}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20 w-fit"
        >
          <Plus className="w-4 h-4" />
          新建角色
        </button>
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索角色（支持中英文）..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white/80 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none backdrop-blur-sm"
          />
        </div>
        <div className="relative">
          <select
            value={activeCategoryId ?? ''}
            onChange={e => setActiveCategoryId(e.target.value || null)}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm bg-white/80 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none backdrop-blur-sm cursor-pointer min-w-[160px]"
          >
            <option value="">全部分类</option>
            {filteredData.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.label} ({cat.items.length})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Category sections */}
      {totalCount === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-16 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-4" />
          <p className="text-sm text-gray-500">未找到匹配的角色</p>
          <p className="text-xs text-gray-400 mt-1">尝试其他关键词</p>
        </div>
      ) : (
      <div className="space-y-10">
        {displayCategories.map((category: RoleCategory) => (
          <section key={category.id}>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{category.label}</h3>
              <span className="text-sm text-gray-400">
                {category.items.length} 个角色
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {category.items.map((item) => (
                <RoleLibraryCard
                  key={item.id}
                  item={item}
                  categoryLabel={category.label}
                  categoryId={category.id}
                  isDeletable={isDeletable(item.id)}
                  onEdit={() => setModalState({ mode: 'edit', item: { ...item, category: item.category ?? category.label } })}
                  onDelete={
                    isDeletable(item.id)
                      ? async () => {
                          if (window.confirm(`确定要删除角色「${item.name}」吗？`)) {
                            await deleteRole(item.id);
                          }
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>
      )}

      {modalState && (
        <RoleLibraryModal
          mode={modalState.mode}
          initialItem={modalState.item}
          existingIds={allRoleIds}
          onSave={async (item) => {
            await saveRole(item);
          }}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
