import { useState, useMemo } from 'react';
import { X, Search, ChevronDown, BookOpen, PenLine, Check } from 'lucide-react';
import type { AgentTemplate, RoleLibraryItem } from '../types';
import { CUSTOM_ROLE_COLORS } from '../data/templates';
import { useRoleLibrary } from '../hooks/useRoleLibrary';

interface CustomRoleModalProps {
  existingIds: Set<string>;
  onAdd: (template: AgentTemplate) => void;
  onAddMultiple?: (templates: AgentTemplate[]) => void;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🤖', '🛠️', '📊', '🎨', '🔍', '📧', '🏠', '🎓', '🌐'];

type Mode = 'choose' | 'library' | 'custom';

function roleLibraryItemToTemplate(item: RoleLibraryItem, colorIndex: number): AgentTemplate {
  const missionSection = item.coreMission
    ? `## 核心职责\n${item.coreMission}`
    : '## 核心职责\n1. [待完善]';
  const rulesSection = item.criticalRules
    ? `## 工作准则\n${item.criticalRules}`
    : '## 工作准则\n1. [待完善]';
  return {
    id: item.id,
    name: item.name,
    emoji: item.emoji || '🤖',
    role: item.description,
    color: CUSTOM_ROLE_COLORS[colorIndex],
    isPreset: false,
    soulTemplate: `# SOUL.md - ${item.name}\n\n你是用户的${item.name}，${item.description}。\n\n${missionSection}\n\n${rulesSection}\n\n## 协作方式\n- 需要协调 → 联系 steward`,
  };
}

export function CustomRoleModal({ existingIds, onAdd, onAddMultiple, onClose }: CustomRoleModalProps) {
  const [mode, setMode] = useState<Mode>('choose');
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [emoji, setEmoji] = useState('🤖');
  const [errors, setErrors] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<RoleLibraryItem | null>(null);
  const [selectedLibraryIds, setSelectedLibraryIds] = useState<Set<string>>(new Set());

  const { mergedLibrary } = useRoleLibrary();
  const colorIndex = existingIds.size % CUSTOM_ROLE_COLORS.length;

  const filteredLibrary = useMemo(() => {
    if (!searchQuery.trim()) return mergedLibrary;
    const q = searchQuery.toLowerCase();
    return mergedLibrary.map((cat: { id: string; label: string; items: RoleLibraryItem[] }) => ({
      ...cat,
      items: cat.items.filter(
        item =>
          item.name.toLowerCase().includes(q) ||
          item.nameEn.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.descriptionEn.toLowerCase().includes(q)
      ),
    })).filter((cat: { items: RoleLibraryItem[] }) => cat.items.length > 0);
  }, [searchQuery, mergedLibrary]);

  const totalResults = useMemo(
    () => filteredLibrary.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredLibrary]
  );

  const handleToggleLibraryItem = (item: RoleLibraryItem) => {
    setSelectedLibraryIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.add(item.id);
      return next;
    });
  };

  const handleAddSelected = () => {
    const itemsToAdd: RoleLibraryItem[] = [];
    for (const cat of mergedLibrary) {
      for (const item of cat.items) {
        if (selectedLibraryIds.has(item.id) && !existingIds.has(item.id)) {
          itemsToAdd.push(item);
        }
      }
    }
    if (itemsToAdd.length === 0) return;
    const templates = itemsToAdd.map((item, i) =>
      roleLibraryItemToTemplate(item, (existingIds.size + i) % CUSTOM_ROLE_COLORS.length)
    );
    if (onAddMultiple) {
      onAddMultiple(templates);
    } else {
      templates.forEach(t => onAdd(t));
    }
    setSelectedLibraryIds(new Set());
    onClose();
  };

  const handleSubmit = () => {
    const newErrors: string[] = [];
    const trimmedId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!trimmedId) newErrors.push('ID 不能为空（仅支持英文小写、数字、下划线、横线）');
    else if (existingIds.has(trimmedId)) newErrors.push('该 ID 已存在');
    if (!name.trim()) newErrors.push('名称不能为空');
    if (!role.trim()) newErrors.push('职责描述不能为空');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const missionSection = selectedLibraryItem?.coreMission
      ? `## 核心职责\n${selectedLibraryItem.coreMission}`
      : '## 核心职责\n1. [待完善]';
    const rulesSection = selectedLibraryItem?.criticalRules
      ? `## 工作准则\n${selectedLibraryItem.criticalRules}`
      : '## 工作准则\n1. [待完善]';

    onAdd({
      id: trimmedId,
      name: name.trim(),
      emoji,
      role: role.trim(),
      color: CUSTOM_ROLE_COLORS[colorIndex],
      isPreset: false,
      soulTemplate: `# SOUL.md - ${name.trim()}\n\n你是用户的${name.trim()}，${role.trim()}。\n\n${missionSection}\n\n${rulesSection}\n\n## 协作方式\n- 需要协调 → 联系 steward`,
    });
  };

  const handleBack = () => {
    if (mode === 'library' || mode === 'custom') {
      setMode('choose');
      setSelectedLibraryItem(null);
      setSelectedLibraryIds(new Set());
      setSearchQuery('');
      setExpandedCategory(null);
      setId('');
      setName('');
      setRole('');
      setEmoji('🤖');
      setErrors([]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            {mode !== 'choose' && (
              <button
                onClick={handleBack}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors mr-1"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
            )}
            <h3 className="text-lg font-bold text-gray-900">
              {mode === 'choose' && '添加自定义角色'}
              {mode === 'library' && '从角色库选择'}
              {mode === 'custom' && (selectedLibraryItem ? '确认角色信息' : '自定义角色')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode chooser */}
        {mode === 'choose' && (
          <div className="p-5 space-y-3">
            <p className="text-sm text-gray-500 mb-4">选择创建方式</p>
            <button
              onClick={() => setMode('library')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-100 flex items-center justify-center group-hover:bg-brand-200 transition-colors">
                <BookOpen className="w-6 h-6 text-brand-600" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">从角色库选择</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  浏览 {mergedLibrary.reduce((s, c) => s + c.items.length, 0)} 个角色，自动填充职责描述
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-300 -rotate-90 group-hover:text-brand-400 transition-colors" />
            </button>
            <button
              onClick={() => setMode('custom')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center group-hover:bg-brand-100 transition-colors">
                <PenLine className="w-6 h-6 text-gray-500 group-hover:text-brand-600 transition-colors" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">完全自定义</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  手动填写角色名称、ID 和职责描述
                </div>
              </div>
              <ChevronDown className="w-5 h-5 text-gray-300 -rotate-90 group-hover:text-brand-400 transition-colors" />
            </button>
          </div>
        )}

        {/* Library browser */}
        {mode === 'library' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="p-4 pb-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索角色（支持中英文）..."
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                共 {totalResults} 个角色
                {searchQuery && ` · 搜索 "${searchQuery}"`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {filteredLibrary.map(cat => (
                <div key={cat.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === cat.id ? null : cat.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-gray-700">
                      {cat.label}
                      <span className="ml-1.5 text-xs font-normal text-gray-400">
                        {cat.items.length}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        expandedCategory === cat.id ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {(expandedCategory === cat.id || searchQuery.trim()) && (
                    <div className="border-t border-gray-50">
                      {cat.items.map(item => {
                        const selected = selectedLibraryIds.has(item.id);
                        const disabled = existingIds.has(item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (disabled) return;
                              handleToggleLibraryItem(item);
                            }}
                            disabled={disabled}
                            className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors border-b border-gray-50 last:border-b-0 ${
                              disabled
                                ? 'opacity-50 cursor-not-allowed'
                                : selected
                                  ? 'bg-brand-50/80 hover:bg-brand-50'
                                  : 'hover:bg-brand-50/60'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border-2 ${
                                selected
                                  ? 'bg-brand-500 border-brand-500 text-white'
                                  : 'border-gray-300'
                              }`}
                            >
                              {selected && <Check className="w-3 h-3" />}
                            </span>
                            <span className="text-lg shrink-0 mt-0.5">{item.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900">
                                {item.name}
                                <span className="ml-1.5 text-xs text-gray-400 font-normal">
                                  {item.nameEn}
                                </span>
                                {disabled && (
                                  <span className="ml-1.5 text-xs text-amber-600">(已添加)</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                {item.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {filteredLibrary.length === 0 && (
                <div className="text-center py-8 text-sm text-gray-400">
                  未找到匹配的角色
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex items-center justify-between shrink-0">
              <span className="text-sm text-gray-500">
                已选 <span className="font-semibold text-brand-600">{selectedLibraryIds.size}</span> 个角色
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddSelected}
                  disabled={selectedLibraryIds.size === 0}
                  className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-lg shadow-brand-600/20"
                >
                  添加所选 ({selectedLibraryIds.size})
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom form (also used after library selection) */}
        {mode === 'custom' && (
          <>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              {selectedLibraryItem && (
                <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 rounded-xl text-xs text-brand-700">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    已从角色库选择：<strong>{selectedLibraryItem.name}</strong>
                    <span className="text-brand-500 ml-1">（{selectedLibraryItem.nameEn}）</span>
                    ，可自由修改以下字段
                  </span>
                </div>
              )}

              {/* Emoji selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">图标</label>
                <div className="flex flex-wrap gap-2">
                  {(selectedLibraryItem?.emoji && !EMOJI_OPTIONS.includes(selectedLibraryItem.emoji)
                    ? [selectedLibraryItem.emoji, ...EMOJI_OPTIONS]
                    : EMOJI_OPTIONS
                  ).map(e => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        emoji === e
                          ? 'bg-brand-100 ring-2 ring-brand-500 scale-110'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Agent ID <span className="text-gray-400 font-normal">（英文小写，如 customer-service）</span>
                </label>
                <input
                  type="text"
                  value={id}
                  onChange={e => setId(e.target.value)}
                  placeholder="my-agent"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  角色名称
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="如：客服助理"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  职责描述
                </label>
                <textarea
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="专注于用户咨询、问题解答和满意度提升"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none resize-none"
                />
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                  {errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">{err}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-5 py-2 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
              >
                添加角色
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
