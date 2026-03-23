import { AGENT_TEMPLATES as SHARED_TEMPLATES, AGENT_EMOJIS } from '@shared/agent-templates';
import type { AgentTemplate, CollaborationEdge } from '../types';

const PRESET_COLORS: Record<string, string> = {
  steward: 'from-violet-500 to-purple-600',
  dev: 'from-blue-500 to-cyan-600',
  content: 'from-amber-500 to-orange-600',
  ops: 'from-emerald-500 to-green-600',
  law: 'from-slate-500 to-gray-600',
  finance: 'from-rose-500 to-pink-600',
};

export const AGENT_TEMPLATES: AgentTemplate[] = Object.values(SHARED_TEMPLATES).map(t => ({
  id: t.id,
  name: t.name,
  emoji: AGENT_EMOJIS[t.id] || '🤖',
  role: t.role,
  color: PRESET_COLORS[t.id] || 'from-gray-500 to-gray-600',
  soulTemplate: t.soulTemplate,
  isPreset: true,
}));

/**
 * Build default collaboration edges from the shared preset templates.
 * Only includes edges whose both endpoints are in the given set of selected agent IDs.
 */
export function buildDefaultEdges(selectedIds: Set<string>): CollaborationEdge[] {
  const edges: CollaborationEdge[] = [];
  for (const template of Object.values(SHARED_TEMPLATES)) {
    if (!selectedIds.has(template.id)) continue;
    for (const collab of template.collaborations) {
      if (selectedIds.has(collab.targetId)) {
        edges.push({
          fromAgentId: template.id,
          toAgentId: collab.targetId,
          label: collab.trigger,
        });
      }
    }
  }
  return edges;
}

/** 测试用默认凭证，方便本地调试（格式符合飞书校验规则） */
export const DEFAULT_TEST_APP_ID = 'cli_test1234567890';
export const DEFAULT_TEST_APP_SECRET = 'test1234567890123456789012345678';

export const CUSTOM_ROLE_COLORS = [
  'from-teal-500 to-cyan-600',
  'from-indigo-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
  'from-lime-500 to-green-600',
  'from-red-500 to-rose-600',
  'from-yellow-500 to-amber-600',
];
