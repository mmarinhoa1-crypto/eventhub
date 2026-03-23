import { Search, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTema } from '../../contexts/ThemeContext'
import NotificationPanel from './NotificationPanel'

export default function Header() {
  const { usuario, organizacao } = useAuth()
  const { tema, alternarTema } = useTema()

  return (
    <header className="h-14 md:h-16 bg-white dark:bg-[rgba(19,19,22,0.85)] dark:backdrop-blur-xl border-b border-gray-200 dark:border-white/[0.08] flex items-center justify-between px-3 md:px-6 sticky top-0 z-40 transition-colors duration-300">
      <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-white/[0.05] rounded-xl px-3 md:px-4 py-2 border border-gray-100 dark:border-white/[0.06] w-40 md:w-80">
        <Search size={16} className="text-gray-400 dark:text-white/30" />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent text-sm text-gray-600 dark:text-white/80 outline-none w-full placeholder-gray-400 dark:placeholder-white/30"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={alternarTema}
          className="p-2 rounded-xl text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/80 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-all duration-200"
          title={tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationPanel />

        <div className="w-px h-7 bg-gray-200 dark:bg-white/15 hidden md:block" />

        <div className="flex items-center gap-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold text-gray-900 dark:text-white/90">{usuario?.nome}</p>
            <p className="text-[11px] text-gray-400 dark:text-white/40">{organizacao?.nome}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">{usuario?.nome?.[0] || 'U'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
