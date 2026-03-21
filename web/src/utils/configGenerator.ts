import JSZip from 'jszip';
import { validateFeishuCredentials } from '@shared/validation';
import type { SelectedAgent, CollaborationEdge, OpenClawConfig } from '../types';

const BASE_PATH = '~/.openclaw';

/** 顶层 session 默认（与 OpenClaw 会话 / 维护策略对齐） */
const DEFAULT_OPENCLAW_SESSION: OpenClawConfig['session'] = {
  dmScope: 'per-channel-peer',
  agentToAgent: {
    maxPingPongTurns: 5,
  },
  maintenance: {
    mode: 'enforce',
    pruneAfter: '7d',
    maxEntries: 7,
  },
};

export function generateOpenClawConfig(agents: SelectedAgent[], _edges?: CollaborationEdge[]): OpenClawConfig {
  return {
    agents: {
      list: agents.map(agent => ({
        id: agent.template.id,
        name: agent.template.name,
        workspace: `${BASE_PATH}/workspace-${agent.template.id}`,
        agentDir: `${BASE_PATH}/agents/${agent.template.id}/agent`,
        ...(agent.isDefault ? { default: true } : {}),
      })),
    },
    channels: {
      feishu: {
        enabled: true,
        streaming: true,
        blockStreaming: true,
        accounts: Object.fromEntries(
          agents.map(agent => [
            agent.template.id,
            {
              appId: agent.credential.appId,
              appSecret: agent.credential.appSecret,
            },
          ])
        ),
      },
    },
    bindings: agents.map(agent => ({
      agentId: agent.template.id,
      match: {
        channel: 'feishu',
        accountId: agent.template.id,
      },
    })),
    tools: {
      agentToAgent: {
        enabled: true,
        allow: agents.map(a => a.template.id),
      },
      sessions: {
        visibility: 'all',
      },
    },
    session: { ...DEFAULT_OPENCLAW_SESSION },
  };
}

export { validateFeishuCredentials as validateCredential };

function resolveDefaultAgentId(agents: SelectedAgent[]): string {
  const def = agents.find(a => a.isDefault);
  return def?.template.id ?? agents[0]?.template.id ?? 'steward';
}

function buildCollabSection(agentId: string, edges: CollaborationEdge[]): string {
  const outgoing = edges.filter(e => e.fromAgentId === agentId);
  if (outgoing.length === 0) return '';
  const lines = outgoing.map(e => `- ${e.label || '协作'} → 联系 ${e.toAgentId}`);
  return `\n\n## 协作方式\n${lines.join('\n')}`;
}

export function generateSoulFiles(
  agents: SelectedAgent[],
  edges: CollaborationEdge[] = [],
): Record<string, Record<string, string>> {
  const files: Record<string, Record<string, string>> = {};

  const defaultAgentId = resolveDefaultAgentId(agents);

  const agentsTable = agents
    .map(a => `| **${a.template.id}** | ${a.template.name} | ${a.template.role} | ${a.template.emoji} |`)
    .join('\n');

  const agentsMd = `## OP 团队成员

${agentsTable}

## 协作协议

1. 使用 \`sessions_send\` 工具进行跨 Agent 通信
2. 收到协作请求后 10 分钟内给出明确响应
3. 任务完成后主动向发起方反馈结果
4. 涉及用户决策的事项必须上报 ${defaultAgentId} 或用户本人
`;

  const userMd = `# USER.md - 关于你的用户

_学习并记录用户信息，提供更好的个性化服务。_

- **姓名:** [待填写]
- **称呼:** [待填写]
- **时区:** Asia/Shanghai
- **备注:** [记录用户偏好、习惯等]

---

随着与用户的互动，逐步完善这些信息。
`;

  for (const agent of agents) {
    const wsPath = `workspace-${agent.template.id}`;
    const soulBase = agent.template.soulTemplate.replace(/\n\n## 协作方式[\s\S]*$/, '');
    const collabSection = buildCollabSection(agent.template.id, edges);

    files[wsPath] = {
      'SOUL.md': soulBase + collabSection,
      'AGENTS.md': agentsMd,
      'USER.md': userMd,
    };
  }

  return files;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadConfig(config: OpenClawConfig, filename = 'openclaw.json') {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  triggerDownload(blob, filename);
}

export async function downloadAllAsZip(
  agents: SelectedAgent[],
  edges: CollaborationEdge[],
) {
  const zip = new JSZip();

  const config = generateOpenClawConfig(agents, edges);
  zip.file('openclaw.json', JSON.stringify(config, null, 2));

  const soulFiles = generateSoulFiles(agents, edges);
  for (const [wsDir, files] of Object.entries(soulFiles)) {
    for (const [fileName, content] of Object.entries(files)) {
      zip.file(`${wsDir}/${fileName}`, content);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, 'openclaw-config.zip');
}
