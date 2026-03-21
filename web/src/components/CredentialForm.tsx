import { useState } from 'react'
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, KeyRound, ExternalLink, Copy, Check } from 'lucide-react'
import type { AgentTemplate, AgentCredential } from '../types'
import { validateCredential } from '../utils/configGenerator'
import { DEFAULT_TEST_APP_ID, DEFAULT_TEST_APP_SECRET } from '../data/templates'
import feishuScopesPreset from '../data/feishuScopesPreset.json'

interface CredentialFormProps {
    agents: AgentTemplate[]
    credentials: Record<string, AgentCredential>
    defaultAgentId: string
    onUpdateCredential: (agentId: string, credential: AgentCredential) => void
    onSetDefault: (agentId: string) => void
    onNext: () => void
    onBack: () => void
}

export function CredentialForm({ agents, credentials, defaultAgentId, onUpdateCredential, onSetDefault, onNext, onBack }: CredentialFormProps) {
    const [expandedId, setExpandedId] = useState<string>(agents[0]?.id || '')
    const [scopesCopied, setScopesCopied] = useState(false)

    const copyScopesJson = async () => {
        const text = JSON.stringify(feishuScopesPreset, null, 2)
        try {
            await navigator.clipboard.writeText(text)
            setScopesCopied(true)
            window.setTimeout(() => setScopesCopied(false), 2000)
        } catch {
            window.alert('复制失败，请检查浏览器权限')
        }
    }

    const allValid = agents.every(agent => {
        const cred = credentials[agent.id]
        if (!cred) return false
        return validateCredential(cred.appId, cred.appSecret).valid
    })

    const getStatus = (agentId: string) => {
        const cred = credentials[agentId]
        if (!cred || (!cred.appId && !cred.appSecret)) return 'empty'
        const validation = validateCredential(cred.appId, cred.appSecret)
        return validation.valid ? 'valid' : 'invalid'
    }

    return (
        <div className="animate-fade-in">
            <div className="mb-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h2 className="text-xl font-bold text-gray-900">配置飞书凭证</h2>
                        <p className="text-sm text-gray-500 mt-1">
                            为每个 Agent 配置对应的飞书应用凭证。
                            <a href="https://open.feishu.cn/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 ml-1">
                                前往飞书开放平台
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => void copyScopesJson()}
                        title="复制飞书应用权限 scopes JSON（tenant + user 全量）"
                        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm">
                        {scopesCopied ? (
                            <>
                                <Check className="w-4 h-4 text-green-600" />
                                已复制
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4 text-gray-500" />
                                复制飞书权限
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 mb-6 p-3 bg-gray-50 rounded-xl">
                {agents.map(agent => {
                    const status = getStatus(agent.id)
                    return (
                        <button
                            key={agent.id}
                            onClick={() => setExpandedId(agent.id)}
                            className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${expandedId === agent.id ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}
              `}>
                            {status === 'valid' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : status === 'invalid' ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <KeyRound className="w-3.5 h-3.5 text-gray-400" />}
                            <span>{agent.emoji}</span>
                            <span>{agent.name}</span>
                        </button>
                    )
                })}
            </div>

            {/* Expanded form */}
            {agents.map(agent => {
                if (agent.id !== expandedId) return null
                const cred = credentials[agent.id] || { agentId: agent.id, appId: DEFAULT_TEST_APP_ID, appSecret: DEFAULT_TEST_APP_SECRET }
                const validation = cred.appId || cred.appSecret ? validateCredential(cred.appId, cred.appSecret) : { valid: false, errors: [] }

                return (
                    <div key={agent.id} className="animate-fade-in bg-white rounded-2xl border border-gray-200 p-6">
                        {/* Agent info header */}
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-xl`}>{agent.emoji}</div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                                <p className="text-xs text-gray-400">{agent.role}</p>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="defaultAgent" checked={defaultAgentId === agent.id} onChange={() => onSetDefault(agent.id)} className="w-4 h-4 text-brand-600 focus:ring-brand-500" />
                                <span className="text-xs text-gray-500">默认 Agent</span>
                            </label>
                        </div>

                        {/* Credential fields */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">App ID</label>
                                <input
                                    type="text"
                                    placeholder="cli_xxxxxxxxxxxxxxx"
                                    value={cred.appId}
                                    onChange={e => onUpdateCredential(agent.id, { ...cred, appId: e.target.value.trim() })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">App Secret</label>
                                <input
                                    type="password"
                                    placeholder="32 位字符串"
                                    value={cred.appSecret}
                                    onChange={e => onUpdateCredential(agent.id, { ...cred, appSecret: e.target.value.trim() })}
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono bg-gray-50 focus:bg-white focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all outline-none"
                                />
                            </div>
                        </div>

                        {/* Validation feedback */}
                        {validation.errors.length > 0 && (
                            <div className="mt-4 p-3 bg-red-50 rounded-xl border border-red-100">
                                {validation.errors.map((err, i) => (
                                    <p key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                        {err}
                                    </p>
                                ))}
                            </div>
                        )}
                        {validation.valid && (
                            <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-100">
                                <p className="text-xs text-green-600 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    凭证格式验证通过
                                </p>
                            </div>
                        )}

                        {/* Tutorial hint */}
                        <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                            <p className="text-xs text-blue-700 font-medium mb-2">创建飞书应用指引：</p>
                            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                                <li>访问 open.feishu.cn 创建企业自建应用</li>
                                <li>在「凭证与基础信息」中获取 App ID 和 App Secret</li>
                                <li>开启「机器人」能力</li>
                                <li>配置事件订阅（长连接模式），勾选 im.message.receive_v1</li>
                                <li>申请 im:message 和 im:chat 权限</li>
                                <li>创建版本并发布</li>
                            </ol>
                        </div>
                    </div>
                )
            })}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-6">
                <button onClick={onBack} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    返回选择角色
                </button>
                <button onClick={onNext} disabled={!allValid} className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-brand-600/20">
                    下一步：协作关系
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
