import { useState } from 'react';
import { Check, X, ChevronDown, BookOpen, Shield } from 'lucide-react';
import type { AgentTemplate } from '../types';
import { parseSoulSections } from '../utils/soulTemplate';

interface RoleCardProps {
  template: AgentTemplate;
  selected: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}

export function RoleCard({ template, selected, onToggle, onRemove }: RoleCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { coreMission, criticalRules } = parseSoulSections(template.soulTemplate);
  const hasExpandContent = coreMission || criticalRules;

  return (
    <div
      onClick={onToggle}
      className={`
        relative group cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200
        ${selected
          ? 'border-brand-500 bg-brand-50/50 shadow-lg shadow-brand-500/10'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
        }
        ${expanded ? 'ring-2 ring-brand-200/40' : ''}
      `}
    >
      {/* Remove button for custom roles */}
      {!template.isPreset && onRemove && (
        <button
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute top-3 left-3 w-6 h-6 rounded-full bg-red-100 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Top-right: Expand + Selection（隔开不重叠） */}
      <div className="absolute top-3 right-3 flex items-center gap-1" onClick={e => e.stopPropagation()}>
        {hasExpandContent && (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              setExpanded(prev => !prev);
            }}
            className="p-1 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            e.preventDefault();
            onToggle();
          }}
          className={`
            w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer
            ${selected
              ? 'bg-brand-500 text-white scale-100'
              : 'bg-gray-100 text-transparent scale-90 group-hover:scale-100'
            }
          `}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji + Name */}
      <div className="flex items-start gap-3 mb-3 pr-10">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${template.color} flex items-center justify-center text-2xl shadow-sm flex-shrink-0`}
        >
          {template.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-base">{template.name}</h3>
          <span className="text-xs text-gray-400 font-mono">{template.id}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-2">
        {template.role}
      </p>

      {/* Tags */}
      <div className="mt-3 flex items-center gap-2">
        {template.isPreset ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
            预设角色
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            自定义
          </span>
        )}
      </div>

      {/* Expanded content - 与角色库展示一致 */}
      {expanded && hasExpandContent && (
        <div
          onClick={e => e.stopPropagation()}
          className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in"
        >
          {coreMission && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                核心职责
              </div>
              <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto pr-2 [&>*]:mb-1">
                {coreMission}
              </div>
            </div>
          )}
          {criticalRules && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">
                <Shield className="w-3.5 h-3.5" />
                工作准则
              </div>
              <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto pr-2">
                {criticalRules}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
