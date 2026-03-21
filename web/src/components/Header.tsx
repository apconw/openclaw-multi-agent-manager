import { Bot, Github } from 'lucide-react'

export function Header() {
    return (
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/60 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-gray-900 leading-tight">Openclaw 数字人孵化平台-飞书</h1>
                        <p className="text-xs text-gray-400 leading-tight">Multi-Agent Configuration Manager</p>
                    </div>
                </div>
                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <Github className="w-5 h-5" />
                </a>
            </div>
        </header>
    )
}
