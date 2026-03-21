import { ArrowLeft, CheckCircle2, RotateCcw, Terminal } from 'lucide-react';
import { SavedTeamCard } from './SavedTeamCard';
import type { SavedTeamSummary, SelectedAgent } from '../types';

interface DoneScreenProps {
  agents: SelectedAgent[];
  currentTeamId?: string;
  savedTeams: SavedTeamSummary[];
  onEditTeam: (teamId: string) => void;
  onDeleteTeam?: (teamId: string) => void;
  onGoHome: () => void;
  onReset: () => void;
}

export function DoneScreen({
  agents,
  currentTeamId,
  savedTeams,
  onEditTeam,
  onDeleteTeam,
  onGoHome,
  onReset,
}: DoneScreenProps) {
  const currentTeam = savedTeams.find(team => team.id === currentTeamId);

  return (
    <div className="animate-fade-in text-center">
      {/* Success icon */}
      <div className="flex justify-center mb-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">配置初始化完成！</h2>
      <p className="text-gray-500 mb-8">
        已成功配置 {agents.length} 个 Agent，请按以下步骤完成部署
      </p>

      {currentTeam && (
        <div className="max-w-3xl mx-auto text-left mb-8">
          <h3 className="text-sm font-bold text-gray-900 mb-3">已保存团队配置</h3>
          <SavedTeamCard team={currentTeam} active onLoad={onEditTeam} onDelete={onDeleteTeam} />
        </div>
      )}

      {/* Agent list */}
      <div className="flex justify-center gap-3 mb-8 flex-wrap">
        {agents.map(agent => (
          <div
            key={agent.template.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border bg-white ${
              agent.isDefault ? 'border-brand-300 bg-brand-50/50' : 'border-gray-200'
            }`}
          >
            <span className="text-lg">{agent.template.emoji}</span>
            <span className="text-sm font-medium text-gray-800">{agent.template.name}</span>
            {agent.isDefault && (
              <span className="text-[10px] px-1.5 py-0.5 bg-brand-500 text-white rounded-full">默认</span>
            )}
          </div>
        ))}
      </div>

      {/* Steps */}
      <div className="max-w-md mx-auto text-left bg-gray-50 rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          部署步骤
        </h3>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">1</span>
            <div>
              <p className="font-medium text-gray-800">重启 OpenClaw</p>
              <code className="text-xs px-2 py-1 bg-white rounded-lg text-gray-700 border border-gray-200 block mt-1">
                openclaw restart
              </code>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">2</span>
            <div>
              <p className="font-medium text-gray-800">在飞书中测试</p>
              <p className="text-xs text-gray-400 mt-0.5">搜索 Bot 名称，发送消息验证</p>
            </div>
          </li>
        </ol>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={onGoHome}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/20"
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重新配置
        </button>
      </div>
    </div>
  );
}
