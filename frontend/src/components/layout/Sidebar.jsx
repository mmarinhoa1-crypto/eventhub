import { NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { LayoutDashboard, MessageSquare, Calendar, Users, DollarSign, Megaphone, Sparkles, BarChart3, Wine, LogOut, ClipboardList, ChevronDown } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const mainLinks = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin','agent','diretor'] },
  { to: '/eventos', icon: Calendar, label: 'Eventos', roles: ['admin','diretor'] },
]

const financeiroLinks = [
  { to: '/vendas', icon: BarChart3, label: 'Vendas' },
  { to: '/consumo', icon: Wine, label: 'Consumo' },
  { to: '/previsao', icon: Sparkles, label: 'Previsao IA' },
]

const roleLabels = {
  admin: 'Administrador',
  agent: 'Atendente',
  designer: 'Designer',
  social_media: 'Social Media',
  diretor: 'Diretor',
  viewer: 'Visualizador',
}

export default function Sidebar() {
  const { usuario, sair } = useAuth()
  const funcao = usuario?.funcao || 'viewer'
  const location = useLocation()
  const links = mainLinks.filter(l => l.roles.includes(funcao))
  const showMarketing = ['admin','social_media','designer','diretor'].includes(funcao)
  const isMarketingActive = ['/marketing','/demandas','/anuncios'].some(p => location.pathname.startsWith(p))
  const [marketingOpen, setMarketingOpen] = useState(isMarketingActive)
  const showFinanceiro = funcao === 'admin' || funcao === 'diretor'
  const isFinanceiroActive = ['/financeiro','/vendas','/consumo','/previsao'].some(p => location.pathname.startsWith(p))
  const [financeiroOpen, setFinanceiroOpen] = useState(isFinanceiroActive)

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 logo-gradient rounded-xl flex items-center justify-center text-white font-bold text-xs font-extrabold">314</div>
          <div>
            <h1 className="font-bold text-base text-gray-900">314 Producoes</h1>
            <span className="text-[11px] text-gray-400">Gestao de Eventos</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-gray-500 border border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {showMarketing && (
          <>
            <button
              onClick={() => setMarketingOpen(!marketingOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isMarketingActive ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-gray-500 border border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Megaphone size={18} />
                Marketing
              </div>
              <ChevronDown size={14} className={`transition-transform ${marketingOpen ? 'rotate-180' : ''}`} />
            </button>
            {marketingOpen && (
              <div className="ml-4 pl-3 border-l-2 border-blue-100 space-y-0.5">
                {funcao !== 'designer' && (
                <NavLink
                  to="/marketing"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <Megaphone size={15} />
                  Cronograma
                </NavLink>
                )}
                <NavLink
                  to="/demandas"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <ClipboardList size={15} />
                  Minhas Demandas
                </NavLink>
                {(funcao === 'admin' || funcao === 'diretor') && (
                  <NavLink
                    to="/anuncios"
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <BarChart3 size={15} />
                    Anuncios
                  </NavLink>
                )}
              </div>
            )}
          </>
        )}

        {showFinanceiro && (
          <>
            <button
              onClick={() => setFinanceiroOpen(!financeiroOpen)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isFinanceiroActive ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-gray-500 border border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <DollarSign size={18} />
                Financeiro
              </div>
              <ChevronDown size={14} className={`transition-transform ${financeiroOpen ? 'rotate-180' : ''}`} />
            </button>
            {financeiroOpen && (
              <div className="ml-4 pl-3 border-l-2 border-blue-100 space-y-0.5">
                <NavLink
                  to="/financeiro"
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                      isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                    }`
                  }
                >
                  <DollarSign size={15} />
                  Planilha
                </NavLink>
                {financeiroLinks.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all ${
                        isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                      }`
                    }
                  >
                    <Icon size={15} />
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </>
        )}

        {(funcao === 'admin' || funcao === 'diretor') && (
          <NavLink
            to="/equipe"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'text-gray-500 border border-transparent hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            <Users size={18} />
            Equipe
          </NavLink>
        )}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 logo-gradient rounded-full flex items-center justify-center text-white text-xs font-bold">
              {usuario?.nome?.[0] || 'U'}
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">{usuario?.nome || 'Usuario'}</p>
              <p className="text-[10px] text-gray-400">{roleLabels[funcao] || funcao}</p>
            </div>
          </div>
          <button onClick={sair} className="text-gray-400 hover:text-red-500 transition">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
