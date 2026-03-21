import { useState } from 'react';
import {
  ArrowLeft,
  Rocket,
  Copy,
  Check,
  FileJson,
  FolderTree,
  Network,
  Users,
} from 'lucide-react';
import type { SelectedAgent, CollaborationEdge } from '../types';
import { generateOpenClawConfig, generateSoulFiles } from '../utils/configGenerator';
import { TopologyGraph } from './TopologyGraph';

interface ConfigPreviewProps {
  agents: SelectedAgent[];
  edges: CollaborationEdge[];
  teamName: string;
  saveError: string | null;
  isSaving: boolean;
  onTeamNameChange: (value: string) => void;
  onBack: () => void;
  onInitialize: () => void;
  /** 从团队管理「预览」进入时仅展示返回团队管理按钮 */
  previewFromTeamManagement?: boolean;
  onBackToTeamManagement?: () => void;
}

type Tab = 'config' | 'workspace' | 'topology';

export function ConfigPreview({
  agents,
  edges,
  teamName,
  saveError,
  isSaving,
  onTeamNameChange,
  onBack,
  onInitialize,
  previewFromTeamManagement = false,
  onBackToTeamManagement,
}: ConfigPreviewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('topology');
  const [copied, setCopied] = useState(false);
  const [copiedFileKey, setCopiedFileKey] = useState<string | null>(null);

  const config = generateOpenClawConfig(agents, edges);
  const configJson = JSON.stringify(config, null, 2);
  const soulFiles = generateSoulFiles(agents, edges);

  const handleCopy = () => {
    navigator.clipboard.writeText(configJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFile = (key: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedFileKey(key);
    setTimeout(() => setCopiedFileKey(null), 2000);
  };

  const tabs: { key: Tab; label: string; icon: typeof FileJson }[] = [
    { key: 'topology', label: 'Agent 拓扑', icon: Network },
    { key: 'config', label: 'openclaw.json', icon: FileJson },
    { key: 'workspace', label: '工作区文件', icon: FolderTree },
  ];

  const agentTemplates = agents.map(a => a.template);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">预览与初始化</h2>
        <p className="text-sm text-gray-500 mt-1">
          {previewFromTeamManagement
            ? '查看当前团队的 OpenClaw 配置与拓扑，完成后可返回团队管理'
            : '确认以下配置无误后，点击初始化保存团队配置并生成所有文件'}
        </p>
      </div>

      <div className="mb-6 p-4 rounded-2xl border border-gray-200 bg-gray-50/80">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">团队名称</label>
        <input
          type="text"
          value={teamName}
          onChange={event => onTeamNameChange(event.target.value)}
          placeholder="例如：飞书运营团队"
          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none"
        />
        <p className="text-xs text-gray-400 mt-2">
          初始化时会将当前完整配置保存为项目内 JSON，后续可从首页或完成页卡片继续编辑。
        </p>
        {saveError && (
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600 whitespace-pre-line">
            {saveError}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl mb-4">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-1 justify-center
                ${activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {activeTab === 'topology' && (
          <div className="flex items-center justify-center p-6">
            <TopologyGraph agents={agentTemplates} edges={edges} width={600} height={460} />
          </div>
        )}

        {activeTab === 'config' && (
          <div className="relative">
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors z-10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '已复制' : '复制'}
            </button>
            <pre className="p-5 text-xs leading-relaxed text-gray-700 overflow-x-auto max-h-[480px] overflow-y-auto font-mono whitespace-pre">
              {configJson}
            </pre>
          </div>
        )}

        {activeTab === 'workspace' && (
          <div className="p-5 max-h-[480px] overflow-y-auto">
            {Object.entries(soulFiles).map(([wsPath, files]) => (
              <div key={wsPath} className="mb-6 last:mb-0">
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-brand-500" />
                  {wsPath}/
                </h4>
                <div className="space-y-2 ml-6">
                  {Object.entries(files).map(([fileName, content]) => {
                    const fileKey = `${wsPath}/${fileName}`;
                    const isCopied = copiedFileKey === fileKey;
                    return (
                      <details key={fileName} className="group" open>
                        <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-brand-600 py-1">
                          {fileName}
                          <span className="text-gray-400 ml-2">({content.length} 字符)</span>
                        </summary>
                        <div className="relative mt-1">
                          <button
                            onClick={() => handleCopyFile(fileKey, content)}
                            className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 bg-white/80 hover:bg-gray-100 rounded transition-colors z-10"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? '已复制' : '复制'}
                          </button>
                          <pre className="p-3 pr-16 bg-gray-50 rounded-lg text-xs text-gray-600 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap">
                            {content}
                          </pre>
                        </div>
                      </details>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className={`flex items-center pt-6 ${previewFromTeamManagement ? 'justify-center' : 'justify-between'}`}>
        {previewFromTeamManagement ? (
          <button
            type="button"
            onClick={onBackToTeamManagement}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
          >
            <Users className="w-4 h-4" />
            返回 团队管理
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回协作关系
            </button>
            <button
              type="button"
              onClick={onInitialize}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-purple-600 rounded-xl hover:from-brand-700 hover:to-purple-700 transition-all shadow-lg shadow-brand-600/20"
            >
              <Rocket className="w-4 h-4" />
              {isSaving ? '正在团队初始化...' : '团队初始化'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
