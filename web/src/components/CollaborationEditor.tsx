import { ArrowLeft, ArrowRight, Plus, Trash2, RotateCcw } from 'lucide-react';
import { TopologyGraph } from './TopologyGraph';
import { buildDefaultEdges } from '../data/templates';
import type { AgentTemplate, CollaborationEdge } from '../types';

interface CollaborationEditorProps {
  agents: AgentTemplate[];
  edges: CollaborationEdge[];
  onUpdateEdges: (edges: CollaborationEdge[]) => void;
  onNext: () => void;
  onBack: () => void;
}

export function CollaborationEditor({
  agents,
  edges,
  onUpdateEdges,
  onNext,
  onBack,
}: CollaborationEditorProps) {
  const agentIds = agents.map(a => a.id);

  const addEdge = (fromAgentId: string) => {
    const others = agentIds.filter(id => id !== fromAgentId);
    const target = others.find(
      id => !edges.some(e => e.fromAgentId === fromAgentId && e.toAgentId === id)
    ) || others[0];
    if (!target) return;
    onUpdateEdges([...edges, { fromAgentId, toAgentId: target, label: '' }]);
  };

  const removeEdge = (index: number) => {
    onUpdateEdges(edges.filter((_, i) => i !== index));
  };

  const updateEdge = (index: number, patch: Partial<CollaborationEdge>) => {
    onUpdateEdges(edges.map((e, i) => (i === index ? { ...e, ...patch } : e)));
  };

  const resetToDefaults = () => {
    onUpdateEdges(buildDefaultEdges(new Set(agentIds)));
  };

  const edgesByAgent = agents.map(agent => ({
    agent,
    agentEdges: edges
      .map((e, i) => ({ edge: e, index: i }))
      .filter(({ edge }) => edge.fromAgentId === agent.id),
  }));

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">协作关系配置</h2>
          <p className="text-sm text-gray-500 mt-1">
            配置 Agent 之间的协作规则，右侧拓扑图实时更新
          </p>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          恢复预设
        </button>
      </div>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left: Rule editor */}
        <div className="flex-1 min-w-0 space-y-4 max-h-[520px] overflow-y-auto pr-1">
          {edgesByAgent.map(({ agent, agentEdges }) => (
            <div key={agent.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${agent.color} flex items-center justify-center text-sm`}>
                  {agent.emoji}
                </div>
                <span className="text-sm font-semibold text-gray-800">{agent.name}</span>
                <span className="text-[10px] text-gray-400 font-mono">{agent.id}</span>
              </div>

              {agentEdges.length === 0 && (
                <p className="text-xs text-gray-400 italic mb-2">暂无协作规则</p>
              )}

              <div className="space-y-2">
                {agentEdges.map(({ edge, index }) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={edge.label}
                      onChange={e => updateEdge(index, { label: e.target.value })}
                      placeholder="场景描述"
                      className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-1 focus:ring-brand-100 outline-none transition-all"
                    />
                    <span className="text-[10px] text-gray-400 flex-shrink-0">→</span>
                    <select
                      value={edge.toAgentId}
                      onChange={e => updateEdge(index, { toAgentId: e.target.value })}
                      className="w-24 px-2 py-1.5 rounded-lg border border-gray-200 text-xs bg-gray-50 focus:bg-white focus:border-brand-400 outline-none transition-all"
                    >
                      {agents
                        .filter(a => a.id !== agent.id)
                        .map(a => (
                          <option key={a.id} value={a.id}>
                            {a.emoji} {a.name}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => removeEdge(index)}
                      className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => addEdge(agent.id)}
                className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 hover:text-brand-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                添加协作规则
              </button>
            </div>
          ))}
        </div>

        {/* Right: Live topology */}
        <div className="lg:w-[520px] flex-shrink-0 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center justify-center p-2">
          <TopologyGraph agents={agents} edges={edges} />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回配置凭证
        </button>
        <button
          onClick={onNext}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-all shadow-lg shadow-brand-600/20"
        >
          下一步：预览配置
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
