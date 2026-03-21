import { CalendarClock, Download, Eye, Layers3, Network, PencilLine, ShieldCheck, Trash2, Users } from 'lucide-react'
import type { SavedTeamSummary } from '../types'

interface SavedTeamCardProps {
    team: SavedTeamSummary
    onLoad: (teamId: string) => void
    onPreview?: (teamId: string) => void
    onDownload?: (teamId: string) => void
    onDelete?: (teamId: string) => void
    onViewTopology?: (teamId: string) => void
    active?: boolean
}

function formatUpdatedAt(value: string) {
    return new Date(value).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

export function SavedTeamCard({ team, onLoad, onPreview, onDownload, onDelete, onViewTopology, active = false }: SavedTeamCardProps) {
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (window.confirm(`确定要删除团队「${team.name}」吗？此操作不可恢复。`)) {
            onDelete?.(team.id)
        }
    }

    return (
        <div
            className={`
        rounded-2xl border p-5 bg-white transition-all
        ${active ? 'border-brand-400 shadow-lg shadow-brand-500/10 bg-brand-50/30' : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
      `}>
            {/* 团队名称 - 独占一行确保完整显示 */}
            <div className="mb-2">
                <h3 className="text-base font-semibold text-gray-900 break-words">{team.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-400 font-mono">{team.id}</p>
                    {active && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-700">当前编辑</span>}
                </div>
            </div>

            {/* 操作按钮 - 单独一行 */}
            <div className="flex flex-wrap gap-2 mt-3">
                <button onClick={() => onLoad(team.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-brand-600 bg-brand-50/80 hover:bg-brand-100 hover:text-brand-700 transition-colors border border-brand-200/40 hover:border-brand-300/60">
                    <PencilLine className="w-3.5 h-3.5" />
                    编辑
                </button>
                {onPreview && (
                    <button onClick={() => onPreview(team.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors" title="预览配置">
                        <Eye className="w-3.5 h-3.5" />
                        预览
                    </button>
                )}
                {onViewTopology && (
                    <button onClick={() => onViewTopology(team.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors" title="查看协作关系拓扑图">
                        <Network className="w-3.5 h-3.5" />
                        拓扑
                    </button>
                )}
                {onDownload && (
                    <button onClick={() => onDownload(team.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors" title="直接下载配置包">
                        <Download className="w-3.5 h-3.5" />
                        下载
                    </button>
                )}
                {onDelete && (
                    <button onClick={handleDelete} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors" title="删除团队">
                        <Trash2 className="w-3.5 h-3.5" />
                        删除
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <MetricChip icon={Users} label={`${team.agentCount} 个 Agent`} />
                <MetricChip icon={ShieldCheck} label={`默认 ${team.defaultAgentId}`} />
                <MetricChip icon={Layers3} label={`自定义 ${team.customRoleCount}`} />
                <MetricChip icon={CalendarClock} label={`更新 ${formatUpdatedAt(team.updatedAt)}`} />
            </div>
        </div>
    )
}

function MetricChip({ icon: Icon, label }: { icon: typeof Users; label: string }) {
    return (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 text-gray-600">
            <Icon className="w-3.5 h-3.5 text-gray-400" />
            <span>{label}</span>
        </div>
    )
}
