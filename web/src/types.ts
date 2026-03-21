export type {
  AgentConfig,
  FeishuAccount,
  OpenClawConfig as OpenClawConfigBase,
  AgentTemplate as AgentTemplateBase,
  CollaborationRule,
  RoleLibraryItem,
  RoleCategory,
} from '@shared/types';

export interface AgentTemplate {
  id: string;
  name: string;
  emoji: string;
  role: string;
  color: string;
  soulTemplate: string;
  isPreset: boolean;
}

export interface CollaborationEdge {
  fromAgentId: string;
  toAgentId: string;
  label: string;
}

export interface AgentCredential {
  agentId: string;
  appId: string;
  appSecret: string;
}

export interface SelectedAgent {
  template: AgentTemplate;
  credential: AgentCredential;
  isDefault: boolean;
}

export interface OpenClawConfig {
  agents: {
    list: Array<{
      id: string;
      name: string;
      workspace: string;
      agentDir: string;
      default?: boolean;
    }>;
  };
  channels: {
    feishu: {
      enabled: boolean;
      accounts: Record<string, { appId: string; appSecret: string }>;
      streaming?: boolean;
      blockStreaming?: boolean;
    };
  };
  bindings: Array<{
    agentId: string;
    match: {
      channel: string;
      accountId: string;
    };
  }>;
  tools: {
    agentToAgent: {
      enabled: boolean;
      allow: string[];
    };
    sessions?: {
      visibility: string;
    };
  };
  session: {
    dmScope: string;
    agentToAgent: {
      maxPingPongTurns: number;
    };
    maintenance: {
      mode: string;
      pruneAfter: string;
      maxEntries: number;
    };
  };
}

export interface TeamConfigPayload {
  id?: string;
  name: string;
  templates: AgentTemplate[];
  selectedIds: string[];
  credentials: Record<string, AgentCredential>;
  /** 兼容旧版 API；新配置可为空对象 */
  models?: Record<string, string>;
  defaultAgentId: string;
  edges: CollaborationEdge[];
}

export interface SavedTeamConfig extends TeamConfigPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavedTeamSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  agentCount: number;
  defaultAgentId: string;
  customRoleCount: number;
  selectedAgentIds: string[];
}

export interface TeamConfigListResponse {
  items: SavedTeamSummary[];
}

export interface TeamConfigItemResponse {
  item: SavedTeamSummary;
  config: SavedTeamConfig;
}

export type WizardStep = 'select' | 'credentials' | 'collaboration' | 'preview' | 'done';
