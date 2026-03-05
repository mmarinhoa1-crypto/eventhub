import { LogOut, User, Bell, Search } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

export default function Header() {
  const { usuario, organizacao, sair } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-4 py-2 border border-gray-100 w-80">
        <Search size={16} className="text-gray-400" />
        <input type="text" placeholder="Buscar..." className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder-gray-400" />
      </div>
      <div className="flex items-center gap-4">
        <button className="relative text-gray-400 hover:text-gray-600 transition">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
        </button>
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
