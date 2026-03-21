import { Plus, ArrowRight, Sparkles } from 'lucide-react';
import { RoleCard } from './RoleCard';
import type { AgentTemplate } from '../types';

interface RoleSelectorProps {
  templates: AgentTemplate[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onRemoveCustom: (id: string) => void;
  onAddCustom: () => void;
  onNext: () => void;
  onSelectAll: () => void;
}

export function RoleSelector({
  templates,
  selectedIds,
  onToggle,
  onRemoveCustom,
  onAddCustom,
  onNext,
  onSelectAll,
}: RoleSelectorProps) {
  const presets = templates.filter(t => t.isPreset);
  const customs = templates.filter(t => !t.isPreset);

  return (
    <div className="animate-fade-in">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">选择 Agent 角色</h2>
          <p className="text-sm text-gray-500 mt-1">
            已选择 <span className="font-semibold text-brand-600">{selectedIds.size}</span> 个角色，点击卡片切换选择
          </p>
        </div>
        <button
          onClick={onSelectAll}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          {selectedIds.size === templates.length ? '取消全选' : '全选'}
        </button>
      </div>

      {/* Preset roles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {presets.map(template => (
          <RoleCard
            key={template.id}
            template={template}
            selected={selectedIds.has(template.id)}
            onToggle={() => onToggle(template.id)}
          />
        ))}
      </div>

      {/* Custom roles */}
      {customs.length > 0 && (
        <>
          <div className="border-t border-gray-200 pt-6 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">自定义角色</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {customs.map(template => (
              <RoleCard
                key={template.id}
                template={template}
                selected={selectedIds.has(template.id)}
                onToggle={() => onToggle(template.id)}
                onRemove={() => onRemoveCustom(template.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* Add custom + Next */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <button
          onClick={onAddCustom}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-dashed border-gray-300 rounded-xl hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/50 transition-all"
        >
          <Plus className="w-4 h-4" />
          添加自定义角色
        </button>

        <button
          onClick={onNext}
          disabled={selectedIds.size === 0}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30"
        >
          下一步：配置凭证
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
