import { useEffect, useRef } from 'react';
import { X, Terminal, Loader2, CheckCircle2, AlertCircle, Circle } from 'lucide-react';

export interface LocalInitStage {
  key: string;
  label: string;
}

export interface LogLine {
  text: string;
  stream: 'stdout' | 'stderr';
}

interface LocalInitModalProps {
  open: boolean;
  /** 对话框标题，默认「本地初始化」 */
  title?: string;
  /** 底部说明；不传则显示默认 openclaw / API 提示 */
  footerNote?: string;
  stages: LocalInitStage[];
  /** 0 .. stages.length-1 */
  activeStageIndex: number;
  /** indices that are fully done (green check) */
  completedIndices: Set<number>;
  failedStageIndex: number | null;
  logLines: LogLine[];
  running: boolean;
  error: string | null;
  totalAgents: number;
  onClose: () => void;
}

export function LocalInitModal({
  open,
  title = '本地初始化',
  footerNote: footerNoteProp,
  stages,
  activeStageIndex,
  completedIndices,
  failedStageIndex,
  logLines,
  running,
  error,
  totalAgents,
  onClose,
}: LocalInitModalProps) {
  const logRef = useRef<HTMLPreElement>(null);

  const defaultFooter = (
    <>
      需本机已安装 <code className="text-gray-700">openclaw</code> CLI，且团队配置 API 在本地运行（默认端口 3789）。
    </>
  );

  useEffect(() => {
    if (!open || !logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, logLines]);

  if (!open) return null;

  /** 三步：已完成阶段数 / 总阶段数（完成「完成」步时为 100%） */
  const pct =
    stages.length === 0
      ? 0
      : Math.min(100, Math.round((completedIndices.size / stages.length) * 100));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="local-init-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-900 to-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-emerald-400" aria-hidden />
            <h2 id="local-init-title" className="text-base font-semibold">
              {title}
            </h2>
            {running && <Loader2 className="w-4 h-4 animate-spin text-emerald-300" aria-label="进行中" />}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/90">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>进度</span>
            <span>
              {totalAgents > 0 ? `${totalAgents} 个 Agent` : ''}
              {running ? ' · 执行中' : error ? ' · 失败' : ' · 已结束'}
            </span>
          </div>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {stages.map((s, i) => {
              const done = completedIndices.has(i);
              const active = i === activeStageIndex && running && failedStageIndex === null;
              const failed = failedStageIndex === i;
              return (
                <div
                  key={s.key}
                  className={`
                    flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border
                    ${failed ? 'border-red-200 bg-red-50 text-red-800' : ''}
                    ${!failed && done ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : ''}
                    ${!failed && !done && active ? 'border-brand-300 bg-brand-50 text-brand-900 ring-1 ring-brand-200' : ''}
                    ${!failed && !done && !active ? 'border-gray-200 bg-white text-gray-500' : ''}
                  `}
                >
                  {failed ? (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  ) : done ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : active ? (
                    <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 shrink-0 opacity-40" />
                  )}
                  <span className="truncate max-w-[140px] sm:max-w-[200px]">{s.label}</span>
                </div>
              );
            })}
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <pre
          ref={logRef}
          className="flex-1 min-h-[200px] max-h-[45vh] overflow-auto p-4 text-xs font-mono leading-relaxed bg-gray-950 text-gray-100 m-0"
        >
          {logLines.length === 0 ? (
            <span className="text-gray-500">等待输出…</span>
          ) : (
            logLines.map((line, i) => (
              <span
                key={i}
                className={line.stream === 'stderr' ? 'text-red-300' : 'text-gray-100'}
              >
                {line.text}
                {'\n'}
              </span>
            ))
          )}
        </pre>

        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
          {footerNoteProp ?? defaultFooter}
        </div>
      </div>
    </div>
  );
}
