import { ChevronDown, BookOpen, Shield, PencilLine, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { RoleLibraryItem } from '../types';

const CATEGORY_GRADIENTS: Record<string, string> = {
  academic: 'from-violet-500 to-purple-600',
  design: 'from-amber-500 to-orange-600',
  engineering: 'from-blue-500 to-cyan-600',
  'game-development': 'from-fuchsia-500 to-pink-600',
  marketing: 'from-emerald-500 to-teal-600',
  'paid-media': 'from-rose-500 to-pink-600',
  product: 'from-indigo-500 to-blue-600',
  'project-management': 'from-slate-500 to-gray-600',
  custom: 'from-teal-500 to-cyan-600',
  default: 'from-brand-500 to-brand-600',
};

function getCategoryGradient(categoryId: string): string {
  return CATEGORY_GRADIENTS[categoryId] ?? CATEGORY_GRADIENTS.default;
}

interface RoleLibraryCardProps {
  item: RoleLibraryItem;
  categoryLabel: string;
  categoryId?: string;
  isDeletable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function RoleLibraryCard({
  item,
  categoryLabel,
  categoryId = '',
  isDeletable = false,
  onEdit,
  onDelete,
}: RoleLibraryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div>
      <div
        onClick={() => setExpanded(!expanded)}
        className={`
          relative group cursor-pointer rounded-2xl p-5 transition-all duration-300 ease-out
          backdrop-blur-sm border-2 border-gray-200/80 bg-white/80
          hover:scale-[1.02] hover:-translate-y-0.5 hover:border-brand-300/60
          hover:shadow-xl hover:shadow-brand-500/10
          active:scale-[0.99]
          ${expanded ? 'border-brand-400 shadow-xl shadow-brand-500/15 ring-2 ring-brand-200/40' : ''}
        `}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`
              w-14 h-14 rounded-2xl flex items-center justify-center text-2xl
              flex-shrink-0 transition-transform duration-300 group-hover:scale-105 shadow-lg
              bg-gradient-to-br ${getCategoryGradient(categoryId)}
              ${expanded ? 'ring-2 ring-white/40' : ''}
            `}
          >
            {item.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-gray-900 text-base leading-tight">{item.name}</h3>
            <span className="text-xs text-gray-400 font-mono mt-0.5 inline-block">{item.nameEn}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={handleEdit}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-gray-500 hover:text-brand-600 hover:bg-brand-50/80 transition-colors border border-transparent hover:border-brand-200/60"
                title="修改"
              >
                <PencilLine className="w-3.5 h-3.5" />
                修改
              </button>
            )}
            {isDeletable && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium text-gray-500 hover:text-red-600 hover:bg-red-50/80 transition-colors border border-transparent hover:border-red-200/60"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
                删除
              </button>
            )}
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                setExpanded(prev => !prev);
              }}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ChevronDown
                className={`w-5 h-5 transition-transform duration-300 ${
                  expanded ? 'rotate-180 text-brand-500' : ''
                }`}
              />
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
          {item.description}
        </p>

        {/* Category tag */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100/80 text-gray-600 backdrop-blur-sm">
            {categoryLabel}
          </span>
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
            {item.coreMission && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
                  <BookOpen className="w-3.5 h-3.5" />
                  核心职责
                </div>
                <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto pr-2 [&>*]:mb-1">
                  {item.coreMission}
                </div>
              </div>
            )}
            {item.criticalRules && (
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                  <Shield className="w-3.5 h-3.5" />
                  工作准则
                </div>
                <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto pr-2">
                  {item.criticalRules}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
