import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, XCircle } from 'lucide-react';
import type { RoleLibraryItem } from '../types';
import { listCategories, type RoleCategory } from '../utils/roleLibraryApi';

const EMOJI_OPTIONS = ['🤖', '🛠️', '📊', '🎨', '🔍', '📧', '🏠', '🎓', '🌐'];

interface RoleLibraryModalProps {
  mode: 'create' | 'edit';
  initialItem?: RoleLibraryItem;
  existingIds: Set<string>;
  onSave: (item: RoleLibraryItem) => void | Promise<void>;
  onClose: () => void;
}

export function RoleLibraryModal({
  mode,
  initialItem,
  existingIds,
  onSave,
  onClose,
}: RoleLibraryModalProps) {
  const [id, setId] = useState(initialItem?.id ?? '');
  const [name, setName] = useState(initialItem?.name ?? '');
  const [nameEn, setNameEn] = useState(initialItem?.nameEn ?? '');
  const [emoji, setEmoji] = useState(initialItem?.emoji ?? '🤖');
  const [description, setDescription] = useState(initialItem?.description ?? '');
  const [descriptionEn, setDescriptionEn] = useState(initialItem?.descriptionEn ?? '');
  const [coreMission, setCoreMission] = useState(initialItem?.coreMission ?? '');
  const [criticalRules, setCriticalRules] = useState(initialItem?.criticalRules ?? '');
  const [categoryOptions, setCategoryOptions] = useState<RoleCategory[]>([]);
  const [category, setCategory] = useState(initialItem?.category?.trim() || '其他');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const coreMissionRef = useRef<HTMLTextAreaElement>(null);
  const criticalRulesRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 400)}px`;
  };

  useEffect(() => {
    listCategories().then(setCategoryOptions).catch(() => setCategoryOptions([]));
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      autoResize(coreMissionRef.current);
      autoResize(criticalRulesRef.current);
    });
  }, [coreMission, criticalRules]);

  useEffect(() => {
    if (initialItem) {
      setId(initialItem.id);
      setName(initialItem.name);
      setNameEn(initialItem.nameEn ?? '');
      setEmoji(initialItem.emoji ?? '🤖');
      setDescription(initialItem.description ?? '');
      setDescriptionEn(initialItem.descriptionEn ?? '');
      setCoreMission(initialItem.coreMission ?? '');
      setCriticalRules(initialItem.criticalRules ?? '');
      setCategory(initialItem.category?.trim() || '其他');
    } else {
      setId('');
      setName('');
      setNameEn('');
      setEmoji('🤖');
      setDescription('');
      setDescriptionEn('');
      setCoreMission('');
      setCriticalRules('');
      setCategory('其他');
    }
    setErrors([]);
  }, [initialItem, mode]);

  const handleSubmit = async () => {
    const newErrors: string[] = [];
    const trimmedId = id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');

    if (!trimmedId) newErrors.push('ID 不能为空（仅支持英文小写、数字、下划线、横线）');
    else if (mode === 'create' && existingIds.has(trimmedId)) newErrors.push('该 ID 已存在');
    else if (mode === 'edit' && initialItem?.id !== trimmedId && existingIds.has(trimmedId)) {
      newErrors.push('该 ID 已存在');
    }
    if (!name.trim()) newErrors.push('角色名称不能为空');
    if (!description.trim()) newErrors.push('职责描述不能为空');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSave({
      id: trimmedId,
      name: name.trim(),
      nameEn: nameEn.trim() || name.trim(),
      emoji,
      description: description.trim(),
      descriptionEn: descriptionEn.trim() || description.trim(),
      coreMission: coreMission.trim() || '1. [待完善]',
      criticalRules: criticalRules.trim() || '1. [待完善]',
      category: category?.trim() || '其他',
      createdAt: mode === 'edit' && initialItem?.createdAt ? initialItem.createdAt : Date.now(),
    });
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col min-h-[400px]">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <h3 className="text-lg font-bold text-gray-900">
            {mode === 'create' ? '新建角色' : '修改角色'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">图标</label>
            <div className="flex flex-wrap gap-2">
              {(emoji && !EMOJI_OPTIONS.includes(emoji) ? [emoji, ...EMOJI_OPTIONS] : EMOJI_OPTIONS).map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    emoji === e ? 'bg-brand-100 ring-2 ring-brand-500 scale-110' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ID <span className="text-gray-400 font-normal">（英文小写）</span>
            </label>
            <input
              type="text"
              value={id}
              onChange={e => setId(e.target.value)}
              placeholder="my-role"
              disabled={mode === 'edit'}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">角色名称</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="如：客服助理"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">英文名称</label>
            <input
              type="text"
              value={nameEn}
              onChange={e => setNameEn(e.target.value)}
              placeholder="Customer Service"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">分类</label>
            <div className="relative w-full min-w-0">
              <div className="relative">
                <input
                  ref={categoryInputRef}
                  type="text"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  onFocus={() => setCategoryDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setCategoryDropdownOpen(false), 150)}
                  placeholder="选择或输入分类，输入新名称将自动创建"
                  className="w-full min-w-0 px-4 py-2.5 pr-10 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none"
                />
                {category && (
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => {
                      setCategory('');
                      categoryInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="清空后自行输入"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">输入新分类名称将自动创建</p>
              {categoryDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-10 w-full py-1 rounded-xl border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                  {categoryOptions.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        setCategory(opt.label);
                        setCategoryDropdownOpen(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">职责描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="专注于用户咨询、问题解答..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">核心职责</label>
            <textarea
              ref={coreMissionRef}
              value={coreMission}
              onChange={e => setCoreMission(e.target.value)}
              placeholder="1. [待完善]"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none resize-none overflow-y-auto min-h-[80px] max-h-[400px] leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">工作准则</label>
            <textarea
              ref={criticalRulesRef}
              value={criticalRules}
              onChange={e => setCriticalRules(e.target.value)}
              placeholder="1. [待完善]"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none resize-none overflow-y-auto min-h-[80px] max-h-[400px] leading-relaxed"
            />
          </div>

          {errors.length > 0 && (
            <div className="p-3 bg-red-50 rounded-xl border border-red-100">
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-red-600">{err}</p>
              ))}
            </div>
          )}
        </div>

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
            {mode === 'create' ? '新建' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
