/**
 * Shared types used by both the OpenClaw Skill (src/) and the Web UI (web/).
 */

export interface AgentConfig {
    id: string
    name: string
    workspace: string
    agentDir?: string
    default?: boolean
}

export interface FeishuAccount {
    appId: string
    appSecret: string
}

export interface OpenClawConfig {
    agents: {
        defaults?: {
            compaction?: {
                mode: string
            }
        }
        list: AgentConfig[]
    }
    channels: {
        feishu: {
            enabled: boolean
            accounts: Record<string, FeishuAccount>
            streaming?: boolean
            blockStreaming?: boolean
        }
    }
    bindings: Array<{
        agentId: string
        match: {
            channel: string
            accountId: string
            peer?: {
                kind: 'direct' | 'group'
                id: string
            }
        }
    }>
    tools: {
        agentToAgent: {
            enabled: boolean
            allow: string[]
        }
        sessions?: {
            visibility: string
        }
    }
    session?: {
        dmScope: string
        agentToAgent: {
            maxPingPongTurns: number
        }
        maintenance: {
            mode: string
            pruneAfter: string
            maxEntries: number
        }
    }
}

export interface CollaborationRule {
    targetId: string
    trigger: string
}

export interface AgentTemplate {
    id: string
    name: string
    role: string
    soulTemplate: string
    collaborations: CollaborationRule[]
}

export interface RoleLibraryItem {
    id: string
    name: string
    nameEn: string
    emoji: string
    description: string
    descriptionEn: string
    coreMission: string
    criticalRules: string
    /** 分类（用户自定义角色用） */
    category?: string
    /** 创建时间戳（用户自定义角色用，用于排序） */
    createdAt?: number
}

export interface RoleCategory {
    id: string
    label: string
    items: RoleLibraryItem[]
}
