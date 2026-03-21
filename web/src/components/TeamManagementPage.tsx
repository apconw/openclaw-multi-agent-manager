import { useState } from 'react';
import { Plus, RefreshCw, Settings2, Users, X } from 'lucide-react';
import { SavedTeamCard } from './SavedTeamCard';
import { TopologyGraph } from './TopologyGraph';
import { getTeamConfig } from '../utils/teamConfigApi';
import type { AgentTemplate, CollaborationEdge, SavedTeamSummary } from '../types';

interface TeamManagementPageProps {
  savedTeams: SavedTeamSummary[];
  isLoading: boolean;
  activeTeamId?: string;
  onLoadTeam: (teamId: string) => void;
  onPreviewTeam?: (teamId: string) => void;
  onDownloadTeam?: (teamId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
  onRefresh: () => void;
  onCreateNew: () => void;
}

export function TeamManagementPage({
  savedTeams,
  isLoading,
  activeTeamId,
  onLoadTeam,
  onPreviewTeam,
  onDownloadTeam,
  onDeleteTeam,
  onRefresh,
  onCreateNew,
}: TeamManagementPageProps) {
  const [topologyTeamId, setTopologyTeamId] = useState<string | null>(null);
  const [topologyConfig, setTopologyConfig] = useState<{
    name: string;
    templates: AgentTemplate[];
    edges: CollaborationEdge[];
  } | null>(null);
  const [topologyLoading, setTopologyLoading] = useState(false);
  const [topologyError, setTopologyError] = useState<string | null>(null);

  const handleViewTopology = async (teamId: string) => {
    setTopologyTeamId(teamId);
    setTopologyConfig(null);
    setTopologyError(null);
    setTopologyLoading(true);
    try {
      const res = await getTeamConfig(teamId);
      const agents = res.config.templates.filter((t: AgentTemplate) =>
        res.config.selectedIds.includes(t.id)
      );
      setTopologyConfig({
        name: res.config.name,
        templates: agents,
        edges: res.config.edges,
      });
    } catch (err) {
      setTopologyError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setTopologyLoading(false);
    }
  };

  const closeTopologyModal = () => {
    setTopologyTeamId(null);
    setTopologyConfig(null);
    setTopologyError(null);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-brand-500" />
            团队管理
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            查看、加载或删除已保存的团队配置
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            onClick={onCreateNew}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            新建团队
          </button>
        </div>
      </div>

      {/* Team list */}
      {isLoading ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-16 text-center">
          <RefreshCw className="w-8 h-8 text-gray-300 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">正在加载团队配置...</p>
        </div>
      ) : savedTeams.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {savedTeams.map(team => (
            <SavedTeamCard
              key={team.id}
              team={team}
              active={team.id === activeTeamId}
              onLoad={onLoadTeam}
              onPreview={onPreviewTeam}
              onDownload={onDownloadTeam}
              onDelete={onDeleteTeam}
              onViewTopology={handleViewTopology}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Settings2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-2">暂无已保存团队</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            完成配置向导并初始化后，团队配置会自动保存。点击下方按钮开始创建第一个团队。
          </p>
          <button
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            新建团队
          </button>
        </div>
      )}

      {/* 拓扑图弹窗 */}
      {topologyTeamId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-bold text-gray-900">
                {topologyConfig ? topologyConfig.name : '团队拓扑图'}
              </h3>
              <button
                onClick={closeTopologyModal}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-auto flex-1 min-h-[400px] flex items-center justify-center">
              {topologyLoading ? (
                <div className="flex flex-col items-center gap-3 text-gray-500">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                  <p className="text-sm">加载中...</p>
                </div>
              ) : topologyError ? (
                <p className="text-sm text-red-600">{topologyError}</p>
              ) : topologyConfig ? (
                <TopologyGraph
                  agents={topologyConfig.templates}
                  edges={topologyConfig.edges}
                  width={560}
                  height={420}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
