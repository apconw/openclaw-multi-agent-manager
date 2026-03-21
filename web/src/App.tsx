import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from './components/Header'
import { StepIndicator } from './components/StepIndicator'
import { RoleSelector } from './components/RoleSelector'
import { CredentialForm } from './components/CredentialForm'
import { CollaborationEditor } from './components/CollaborationEditor'
import { ConfigPreview } from './components/ConfigPreview'
import { LocalInitModal, type LocalInitStage } from './components/LocalInitModal'
import { CustomRoleModal } from './components/CustomRoleModal'
import { DoneScreen } from './components/DoneScreen'
import { TeamManagementPage } from './components/TeamManagementPage'
import { RoleLibraryPage } from './components/RoleLibraryPage'
import { AGENT_TEMPLATES, DEFAULT_TEST_APP_ID, DEFAULT_TEST_APP_SECRET, buildDefaultEdges } from './data/templates'
import { downloadAllAsZip, generateOpenClawConfig, generateSoulFiles } from './utils/configGenerator'
import {
    LOCAL_INIT_PROGRESS_PHASES,
    postLocalInitJson,
    postLocalInitStream,
    type LocalInitProgressPhase,
} from './utils/localInitApi'
import {
    getTeamConfig,
    listTeamConfigs,
    postTeamTeardownStream,
    saveTeamConfig,
    TEAM_TEARDOWN_PROGRESS_PHASES,
    type TeamTeardownProgressPhase,
} from './utils/teamConfigApi'
import type { AgentCredential, AgentTemplate, CollaborationEdge, SavedTeamConfig, SavedTeamSummary, SelectedAgent, TeamConfigPayload, WizardStep } from './types'

type MainTab = 'create' | 'teams' | 'library'

function buildSuggestedTeamName(templates: AgentTemplate[]) {
    if (templates.length === 0) return '未命名团队'
    const names = templates.slice(0, 3).map(template => template.name)
    const suffix = templates.length > 3 ? '等团队' : '团队'
    return `${names.join('、')}${suffix}`
}

function buildLocalInitStages(): LocalInitStage[] {
    const labels: Record<LocalInitProgressPhase, string> = {
        'create-roles': '创建角色',
        'write-workspace': '写入工作区',
        'config-path': '配置文件路径',
        'config-channels': '设置 channels',
        'config-bindings': '设置 bindings',
        'config-tools': '设置 tools',
        'config-session': '设置 session',
        'config-validate': '校验配置',
        'gateway-restart': '重启网关',
        done: '完成',
    }
    return LOCAL_INIT_PROGRESS_PHASES.map(key => ({ key, label: labels[key] }))
}

const TEAM_DELETE_STAGE_LABELS: Record<
    Exclude<TeamTeardownProgressPhase, 'done'>,
    string
> = {
    list: '列出 CLI 智能体',
    'delete-agents': '删除 CLI 注册',
    'rm-workspaces': '删除工作区',
    'reset-config': '重置配置',
    'config-validate': '验证配置',
    'gateway-restart': '重启网关',
}

const TEAM_DELETE_STAGES: LocalInitStage[] = TEAM_TEARDOWN_PROGRESS_PHASES.filter(
    (p): p is Exclude<TeamTeardownProgressPhase, 'done'> => p !== 'done',
).map(key => ({ key, label: TEAM_DELETE_STAGE_LABELS[key] }))

export default function App() {
    const [mainTab, setMainTab] = useState<MainTab>('library')
    const [step, setStep] = useState<WizardStep>('select')
    const [templates, setTemplates] = useState<AgentTemplate[]>([...AGENT_TEMPLATES])
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['steward']))
    const [credentials, setCredentials] = useState<Record<string, AgentCredential>>({})
    const [defaultAgentId, setDefaultAgentId] = useState('steward')
    const [showCustomModal, setShowCustomModal] = useState(false)
    const [edges, setEdges] = useState<CollaborationEdge[]>([])
    const [savedTeams, setSavedTeams] = useState<SavedTeamSummary[]>([])
    const [teamName, setTeamName] = useState('')
    const [currentTeamId, setCurrentTeamId] = useState<string>()
    const [isLoadingSavedTeams, setIsLoadingSavedTeams] = useState(true)
    const [isSavingTeam, setIsSavingTeam] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)
    /** 由团队管理「预览」进入预览页时为 true，向导进入为 false */
    const [previewFromTeamManagement, setPreviewFromTeamManagement] = useState(false)

    const [localInitOpen, setLocalInitOpen] = useState(false)
    const [localInitStages, setLocalInitStages] = useState<LocalInitStage[]>([])
    const [localInitActiveIndex, setLocalInitActiveIndex] = useState(0)
    const [localInitCompleted, setLocalInitCompleted] = useState<Set<number>>(() => new Set())
    const [localInitFailedIndex, setLocalInitFailedIndex] = useState<number | null>(null)
    const [localInitLogLines, setLocalInitLogLines] = useState<Array<{ text: string; stream: 'stdout' | 'stderr' }>>([])
    const [localInitRunning, setLocalInitRunning] = useState(false)
    const [localInitError, setLocalInitError] = useState<string | null>(null)
    const localInitActiveIdxRef = useRef(0)

    const [teamDeleteOpen, setTeamDeleteOpen] = useState(false)
    const [teamDeleteActiveIndex, setTeamDeleteActiveIndex] = useState(0)
    const [teamDeleteCompleted, setTeamDeleteCompleted] = useState<Set<number>>(() => new Set())
    const [teamDeleteFailedIndex, setTeamDeleteFailedIndex] = useState<number | null>(null)
    const [teamDeleteLogLines, setTeamDeleteLogLines] = useState<Array<{ text: string; stream: 'stdout' | 'stderr' }>>([])
    const [teamDeleteRunning, setTeamDeleteRunning] = useState(false)
    const [teamDeleteError, setTeamDeleteError] = useState<string | null>(null)
    const [teamDeleteAgentCount, setTeamDeleteAgentCount] = useState(0)
    const teamDeleteActiveIdxRef = useRef(0)

    const selectedTemplates = templates.filter(t => selectedIds.has(t.id))

    const selectedAgents: SelectedAgent[] = selectedTemplates.map(template => ({
        template,
        credential: credentials[template.id] || { agentId: template.id, appId: DEFAULT_TEST_APP_ID, appSecret: DEFAULT_TEST_APP_SECRET },
        isDefault: template.id === defaultAgentId
    }))

    const refreshSavedTeams = useCallback(async () => {
        setIsLoadingSavedTeams(true)
        try {
            const response = await listTeamConfigs()
            setSavedTeams(response.items)
        } catch (error) {
            console.error(error)
        } finally {
            setIsLoadingSavedTeams(false)
        }
    }, [])

    useEffect(() => {
        void refreshSavedTeams()
    }, [refreshSavedTeams])

    const hydrateTeamConfig = useCallback((config: SavedTeamConfig) => {
        setTemplates(config.templates)
        setSelectedIds(new Set(config.selectedIds))
        setCredentials(config.credentials)
        setDefaultAgentId(config.defaultAgentId)
        setEdges(config.edges)
        setCurrentTeamId(config.id)
        setTeamName(config.name)
        setSaveError(null)
        setStep('select')
    }, [])

    const handleLoadTeam = useCallback(
        async (teamId: string) => {
            try {
                setPreviewFromTeamManagement(false)
                const response = await getTeamConfig(teamId)
                hydrateTeamConfig(response.config)
                setMainTab('create')
            } catch (error) {
                const message = error instanceof Error ? error.message : '读取团队配置失败'
                window.alert(message)
            }
        },
        [hydrateTeamConfig]
    )

    const handlePreviewTeam = useCallback(
        async (teamId: string) => {
            try {
                const response = await getTeamConfig(teamId)
                hydrateTeamConfig(response.config)
                setPreviewFromTeamManagement(true)
                setMainTab('create')
                setStep('preview')
            } catch (error) {
                const message = error instanceof Error ? error.message : '读取团队配置失败'
                window.alert(message)
            }
        },
        [hydrateTeamConfig]
    )

    const handleDownloadTeam = useCallback(async (teamId: string) => {
        try {
            const response = await getTeamConfig(teamId)
            const { config } = response
            const agents: SelectedAgent[] = config.templates
                .filter(t => config.selectedIds.includes(t.id))
                .map(template => ({
                    template,
                    credential: config.credentials[template.id] ?? {
                        agentId: template.id,
                        appId: DEFAULT_TEST_APP_ID,
                        appSecret: DEFAULT_TEST_APP_SECRET
                    },
                    isDefault: template.id === config.defaultAgentId
                }))
            await downloadAllAsZip(agents, config.edges)
        } catch (error) {
            const message = error instanceof Error ? error.message : '下载配置失败'
            window.alert(message)
        }
    }, [])

    const handleDeleteTeam = useCallback(
        (teamId: string) => {
            const summary = savedTeams.find(t => t.id === teamId)
            setTeamDeleteAgentCount(summary?.agentCount ?? 0)
            setTeamDeleteLogLines([])
            setTeamDeleteCompleted(new Set())
            setTeamDeleteFailedIndex(null)
            setTeamDeleteError(null)
            setTeamDeleteRunning(true)
            setTeamDeleteActiveIndex(0)
            teamDeleteActiveIdxRef.current = 0
            setTeamDeleteOpen(true)

            requestAnimationFrame(() => {
                void (async () => {
                    try {
                        const result = await postTeamTeardownStream(teamId, ev => {
                            if (ev.type === 'log') {
                                setTeamDeleteLogLines(prev => [...prev, { text: ev.line, stream: ev.stream }])
                                return
                            }
                            if (ev.type === 'phase') {
                                const p = ev.phase
                                if (p === 'error') {
                                    setTeamDeleteError(ev.message ?? '未知错误')
                                    setTeamDeleteFailedIndex(teamDeleteActiveIdxRef.current)
                                    return
                                }
                                const idx = TEAM_TEARDOWN_PROGRESS_PHASES.indexOf(
                                    p as TeamTeardownProgressPhase,
                                )
                                const pillCount = TEAM_DELETE_STAGES.length
                                if (idx >= 0) {
                                    if (p === 'done') {
                                        setTeamDeleteCompleted(
                                            new Set(Array.from({ length: pillCount }, (_, i) => i)),
                                        )
                                        setTeamDeleteActiveIndex(pillCount - 1)
                                        teamDeleteActiveIdxRef.current = pillCount - 1
                                    } else {
                                        const completed = new Set<number>()
                                        for (let i = 0; i < idx; i++) completed.add(i)
                                        setTeamDeleteCompleted(completed)
                                        setTeamDeleteActiveIndex(idx)
                                        teamDeleteActiveIdxRef.current = idx
                                    }
                                }
                            }
                        })
                        if (!result.ok) {
                            setTeamDeleteError(prev => prev ?? result.error ?? '删除失败')
                            setTeamDeleteFailedIndex(teamDeleteActiveIdxRef.current)
                        } else if (result.ok && result.dbDeleted && currentTeamId === teamId) {
                            setCurrentTeamId(undefined)
                            setTeamName('')
                        }
                        await refreshSavedTeams()
                    } catch (error) {
                        const message = error instanceof Error ? error.message : '删除团队失败'
                        setTeamDeleteError(message)
                        setTeamDeleteFailedIndex(teamDeleteActiveIdxRef.current)
                    } finally {
                        setTeamDeleteRunning(false)
                    }
                })()
            })
        },
        [currentTeamId, refreshSavedTeams, savedTeams]
    )

    const handleToggle = useCallback(
        (id: string) => {
            setSelectedIds(prev => {
                const next = new Set(prev)
                if (next.has(id)) {
                    next.delete(id)
                    if (defaultAgentId === id && next.size > 0) {
                        setDefaultAgentId(Array.from(next)[0])
                    }
                } else {
                    next.add(id)
                }
                return next
            })
        },
        [defaultAgentId]
    )

    const handleSelectAll = useCallback(() => {
        if (selectedIds.size === templates.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(templates.map(t => t.id)))
        }
    }, [selectedIds.size, templates])

    const handleRemoveCustom = useCallback((id: string) => {
        setTemplates(prev => prev.filter(t => t.id !== id))
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
        })
        setCredentials(prev => {
            const next = { ...prev }
            delete next[id]
            return next
        })
        setEdges(prev => prev.filter(e => e.fromAgentId !== id && e.toAgentId !== id))
    }, [])

    const handleAddCustom = useCallback((template: AgentTemplate) => {
        setTemplates(prev => [...prev, template])
        setSelectedIds(prev => new Set([...prev, template.id]))
        setShowCustomModal(false)
    }, [])

    const handleAddMultiple = useCallback((templates: AgentTemplate[]) => {
        setTemplates(prev => [...prev, ...templates])
        setSelectedIds(prev => new Set([...prev, ...templates.map(t => t.id)]))
        setShowCustomModal(false)
    }, [])

    const handleUpdateCredential = useCallback((agentId: string, credential: AgentCredential) => {
        setCredentials(prev => ({ ...prev, [agentId]: { ...credential, agentId } }))
    }, [])

    const handleInitialize = useCallback(async () => {
        const resolvedTeamName = teamName.trim() || buildSuggestedTeamName(selectedTemplates)
        const payload: TeamConfigPayload = {
            id: currentTeamId,
            name: resolvedTeamName,
            templates,
            selectedIds: Array.from(selectedIds),
            credentials,
            models: {},
            defaultAgentId,
            edges
        }

        setIsSavingTeam(true)
        setSaveError(null)

        try {
            const response = await saveTeamConfig(payload)
            setCurrentTeamId(response.config.id)
            setTeamName(response.config.name)
            await refreshSavedTeams()
            setIsSavingTeam(false)

            const stages = buildLocalInitStages()

            setLocalInitStages(stages)
            setLocalInitLogLines([])
            setLocalInitCompleted(new Set())
            setLocalInitFailedIndex(null)
            setLocalInitError(null)
            setLocalInitRunning(true)
            setLocalInitActiveIndex(0)
            localInitActiveIdxRef.current = 0

            const config = generateOpenClawConfig(selectedAgents, edges)
            const soulFiles = generateSoulFiles(selectedAgents, edges)

            requestAnimationFrame(() => {
                setLocalInitOpen(true)
                void (async () => {
                    try {
                        const result = await postLocalInitStream({ openclawConfig: config, soulFiles }, ev => {
                            if (ev.type === 'log') {
                                setLocalInitLogLines(prev => [...prev, { text: ev.line, stream: ev.stream }])
                                return
                            }
                            if (ev.type === 'phase') {
                                const p = ev.phase
                                if (p === 'error') {
                                    setLocalInitError(ev.message ?? '未知错误')
                                    setLocalInitFailedIndex(localInitActiveIdxRef.current)
                                    return
                                }
                                const idx = LOCAL_INIT_PROGRESS_PHASES.indexOf(
                                    p as LocalInitProgressPhase,
                                )
                                if (idx >= 0) {
                                    const completed = new Set<number>()
                                    for (let i = 0; i < idx; i++) completed.add(i)
                                    setLocalInitCompleted(completed)
                                    setLocalInitActiveIndex(idx)
                                    localInitActiveIdxRef.current = idx
                                }
                            }
                        })
                        if (!result.ok) {
                            setLocalInitError(prev => prev ?? result.error ?? '初始化失败')
                            setLocalInitFailedIndex(localInitActiveIdxRef.current)
                        } else {
                            setLocalInitCompleted(
                                new Set(LOCAL_INIT_PROGRESS_PHASES.map((_, i) => i)),
                            )
                        }
                    } catch (err) {
                        const msg = err instanceof Error ? err.message : String(err)
                        setLocalInitError(msg)
                        setLocalInitFailedIndex(localInitActiveIdxRef.current)
                        try {
                            const r = await postLocalInitJson({ openclawConfig: config, soulFiles })
                            setLocalInitLogLines(r.logLines.map(line => ({ text: line, stream: 'stdout' as const })))
                            if (!r.ok) {
                                setLocalInitError(prev => prev ?? r.error ?? '初始化失败')
                            } else {
                                setLocalInitCompleted(
                                    new Set(LOCAL_INIT_PROGRESS_PHASES.map((_, i) => i)),
                                )
                            }
                        } catch {
                            /* 已展示 msg */
                        }
                    } finally {
                        setLocalInitRunning(false)
                        setStep('done')
                    }
                })()
            })
        } catch (error) {
            setSaveError(error instanceof Error ? error.message : '保存团队配置失败')
            setIsSavingTeam(false)
        }
    }, [currentTeamId, credentials, defaultAgentId, edges, refreshSavedTeams, selectedAgents, selectedIds, selectedTemplates, teamName, templates])

    const handleReset = useCallback(() => {
        setPreviewFromTeamManagement(false)
        setShowCustomModal(false)
        setIsSavingTeam(false)
        setStep('select')
        setTemplates([...AGENT_TEMPLATES])
        setSelectedIds(new Set(['steward']))
        setCredentials({})
        setDefaultAgentId('steward')
        setEdges([])
        setCurrentTeamId(undefined)
        setTeamName('')
        setSaveError(null)
    }, [])

    /** 从其它主 tab 进入「创建团队」时重置向导（编辑团队 handleLoadTeam 直接 setMainTab，不走此函数） */
    const switchToCreateTab = useCallback(() => {
        if (mainTab !== 'create') {
            handleReset()
        }
        setMainTab('create')
    }, [mainTab, handleReset])

    const goToCollaboration = useCallback(() => {
        if (edges.length === 0) {
            setEdges(buildDefaultEdges(selectedIds))
        } else {
            setEdges(prev => prev.filter(e => selectedIds.has(e.fromAgentId) && selectedIds.has(e.toAgentId)))
        }
        setStep('collaboration')
    }, [edges.length, selectedIds])

    const goToPreview = useCallback(() => {
        setPreviewFromTeamManagement(false)
        setTeamName(prev => prev.trim() || buildSuggestedTeamName(selectedTemplates))
        setStep('preview')
    }, [selectedTemplates])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/30">
            <Header />

            {/* Main tab switcher */}
            <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
                <div className="flex items-center gap-1 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/60 p-1 w-fit">
                    <button
                        onClick={() => setMainTab('library')}
                        className={`
              flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${mainTab === 'library' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
            `}>
                        角色库
                    </button>
                    <button
                        onClick={switchToCreateTab}
                        className={`
              flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${mainTab === 'create' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
            `}>
                        创建团队
                    </button>
                    <button
                        onClick={() => {
                            setMainTab('teams')
                            void refreshSavedTeams()
                        }}
                        className={`
              flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${mainTab === 'teams' ? 'bg-brand-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}
            `}>
                        团队管理
                    </button>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">
                {mainTab === 'create' && <StepIndicator currentStep={step} />}

                <div className="bg-white/70 backdrop-blur-sm rounded-3xl border border-gray-200/60 shadow-xl shadow-gray-200/40 p-6 sm:p-8">
                    {mainTab === 'teams' ? (
                        <TeamManagementPage
                            savedTeams={savedTeams}
                            isLoading={isLoadingSavedTeams}
                            activeTeamId={currentTeamId}
                            onLoadTeam={handleLoadTeam}
                            onPreviewTeam={handlePreviewTeam}
                            onDownloadTeam={handleDownloadTeam}
                            onDeleteTeam={handleDeleteTeam}
                            onRefresh={refreshSavedTeams}
                            onCreateNew={() => {
                                handleReset()
                                setMainTab('create')
                            }}
                        />
                    ) : mainTab === 'library' ? (
                        <RoleLibraryPage />
                    ) : (
                        <>
                            {step === 'select' && (
                                <RoleSelector
                                    templates={templates}
                                    selectedIds={selectedIds}
                                    onToggle={handleToggle}
                                    onRemoveCustom={handleRemoveCustom}
                                    onAddCustom={() => setShowCustomModal(true)}
                                    onNext={() => {
                                        selectedTemplates.forEach(t => {
                                            if (!credentials[t.id]) {
                                                setCredentials(prev => ({
                                                    ...prev,
                                                    [t.id]: { agentId: t.id, appId: DEFAULT_TEST_APP_ID, appSecret: DEFAULT_TEST_APP_SECRET }
                                                }))
                                            }
                                        })
                                        if (!selectedIds.has(defaultAgentId) && selectedIds.size > 0) {
                                            setDefaultAgentId(Array.from(selectedIds)[0])
                                        }
                                        setStep('credentials')
                                    }}
                                    onSelectAll={handleSelectAll}
                                />
                            )}

                            {step === 'credentials' && (
                                <CredentialForm
                                    agents={selectedTemplates}
                                    credentials={credentials}
                                    defaultAgentId={defaultAgentId}
                                    onUpdateCredential={handleUpdateCredential}
                                    onSetDefault={setDefaultAgentId}
                                    onNext={goToCollaboration}
                                    onBack={() => setStep('select')}
                                />
                            )}

                            {step === 'collaboration' && <CollaborationEditor agents={selectedTemplates} edges={edges} onUpdateEdges={setEdges} onNext={goToPreview} onBack={() => setStep('credentials')} />}

                            {step === 'preview' && (
                                <ConfigPreview
                                    agents={selectedAgents}
                                    edges={edges}
                                    teamName={teamName}
                                    saveError={saveError}
                                    isSaving={isSavingTeam}
                                    onTeamNameChange={setTeamName}
                                    onBack={() => setStep('collaboration')}
                                    onInitialize={handleInitialize}
                                    previewFromTeamManagement={previewFromTeamManagement}
                                    onBackToTeamManagement={() => {
                                        setMainTab('teams')
                                        setPreviewFromTeamManagement(false)
                                        void refreshSavedTeams()
                                    }}
                                />
                            )}

                            {step === 'done' && (
                                <DoneScreen
                                    agents={selectedAgents}
                                    currentTeamId={currentTeamId}
                                    savedTeams={savedTeams}
                                    onEditTeam={handleLoadTeam}
                                    onDeleteTeam={handleDeleteTeam}
                                    onGoHome={() => {
                                        setMainTab('teams')
                                        void refreshSavedTeams()
                                    }}
                                    onReset={handleReset}
                                />
                            )}
                        </>
                    )}
                </div>
            </main>

            {showCustomModal && <CustomRoleModal existingIds={new Set(templates.map(t => t.id))} onAdd={handleAddCustom} onAddMultiple={handleAddMultiple} onClose={() => setShowCustomModal(false)} />}

            <LocalInitModal
                open={localInitOpen}
                stages={localInitStages}
                activeStageIndex={localInitActiveIndex}
                completedIndices={localInitCompleted}
                failedStageIndex={localInitFailedIndex}
                logLines={localInitLogLines}
                running={localInitRunning}
                error={localInitError}
                totalAgents={selectedAgents.length}
                onClose={() => setLocalInitOpen(false)}
            />

            <LocalInitModal
                open={teamDeleteOpen}
                title="删除团队与本地 Agent"
                footerNote="将执行 openclaw agents list / delete，并删除 ~/.openclaw/workspace-* 目录；全部成功后才移除数据库中的团队记录。"
                stages={TEAM_DELETE_STAGES}
                activeStageIndex={teamDeleteActiveIndex}
                completedIndices={teamDeleteCompleted}
                failedStageIndex={teamDeleteFailedIndex}
                logLines={teamDeleteLogLines}
                running={teamDeleteRunning}
                error={teamDeleteError}
                totalAgents={teamDeleteAgentCount}
                onClose={() => setTeamDeleteOpen(false)}
            />
        </div>
    )
}
