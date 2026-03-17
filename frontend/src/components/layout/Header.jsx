import { Search, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTema } from '../../contexts/ThemeContext'
import NotificationPanel from './NotificationPanel'

export default function Header() {
  const { usuario, organizacao } = useAuth()
  const { tema, alternarTema } = useTema()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-40 transition-colors duration-300">
      <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 w-80">
        <Search size={16} className="text-gray-400" />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder-gray-400"
        />
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={alternarTema}
          className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
          title={tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
        >
          {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <NotificationPanel />

        <div className="w-px h-7 bg-gray-200" />

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-900">{usuario?.nome}</p>
            <p className="text-[11px] text-gray-400">{organizacao?.nome}</p>
          </div>
          <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
            <span className="text-blue-600 font-bold text-sm">{usuario?.nome?.[0] || 'U'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
