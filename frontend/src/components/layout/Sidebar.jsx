import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Bell, Sun, Moon } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTema } from '../../contexts/ThemeContext'

const mainLinks = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'agent', 'diretor'] },
  { to: '/eventos', label: 'Eventos', roles: ['admin', 'diretor'] },
]

const marketingSubLinks = [
  { to: '/marketing', label: 'Cronograma', roles: ['admin', 'social_media', 'diretor'] },
  { to: '/demandas', label: 'Minhas Demandas', roles: ['admin', 'social_media', 'designer', 'diretor'] },
  { to: '/anuncios', label: 'Anúncios', roles: ['admin', 'diretor'] },
]

const financeiroSubLinks = [
  { to: '/financeiro', label: 'Planilha' },
  { to: '/vendas', label: 'Vendas' },
  { to: '/consumo', label: 'Consumo' },
  { to: '/previsao', label: 'Previsão IA' },
]

export default function Sidebar() {
  const { usuario, sair } = useAuth()
  const { tema, alternarTema } = useTema()
  const funcao = usuario?.funcao || 'viewer'
  const location = useLocation()
  const navigate = useNavigate()

  const [openMenu, setOpenMenu] = useState(null)
  const navRef = useRef(null)

  const isDark = tema === 'dark'

  const showMarketing = ['admin', 'social_media', 'designer', 'diretor'].includes(funcao)
  const showFinanceiro = funcao === 'admin' || funcao === 'diretor'
  const showEquipe = funcao === 'admin' || funcao === 'diretor'

  const isMarketingActive = ['/marketing', '/demandas', '/anuncios'].some(p => location.pathname.startsWith(p))
  const isFinanceiroActive = ['/financeiro', '/vendas', '/consumo', '/previsao'].some(p => location.pathname.startsWith(p))

  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { setOpenMenu(null) }, [location.pathname])

  function toggleMenu(name) {
    setOpenMenu(prev => (prev === name ? null : name))
  }

  function handleSair() {
    sair()
    navigate('/entrar')
  }

  // Estilos adaptativos por tema
  const barBg = isDark
    ? 'rgba(20, 20, 30, 0.70)'
    : 'rgba(255, 255, 255, 0.80)'
  const barBorder = isDark
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(0,0,0,0.08)'
  const submenuBg = isDark
    ? 'rgba(20, 20, 30, 0.82)'
    : 'rgba(255, 255, 255, 0.92)'
  const submenuBorder = isDark
    ? 'rgba(255,255,255,0.10)'
    : 'rgba(0,0,0,0.08)'

  const linkBase = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap'
  const linkActive = isDark
    ? 'bg-white/20 text-white'
    : 'bg-black/8 text-gray-900 font-semibold'
  const linkInactive = isDark
    ? 'text-white/60 hover:text-white hover:bg-white/10'
    : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'

  const subLinkBase = 'block px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap'
  const subLinkActive = isDark
    ? 'bg-white/20 text-white'
    : 'bg-black/8 text-gray-900 font-semibold'
  const subLinkInactive = isDark
    ? 'text-white/70 hover:text-white hover:bg-white/15'
    : 'text-gray-500 hover:text-gray-900 hover:bg-black/5'

  const iconBtn = isDark
    ? 'text-white/50 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all'
    : 'text-gray-400 hover:text-gray-700 hover:bg-black/6 p-1.5 rounded-lg transition-all'

  const divider = isDark ? 'bg-white/15' : 'bg-black/10'
  const sairClass = isDark
    ? `${linkBase} text-red-400/80 hover:text-red-300 hover:bg-red-500/10`
    : `${linkBase} text-red-400 hover:text-red-600 hover:bg-red-50`

  return (
    <nav
      ref={navRef}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      style={{ maxWidth: 'calc(100vw - 2rem)' }}
    >
      {/* Submenus — sobem acima da barra */}
      {openMenu === 'marketing' && showMarketing && (
        <div
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]"
          style={{ background: submenuBg, backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: `1px solid ${submenuBorder}` }}
        >
          <div className="px-2 py-2 space-y-0.5">
            {marketingSubLinks
              .filter(l => l.roles.includes(funcao))
              .map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === '/marketing'}
                  className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}
                >
                  {label}
                </NavLink>
              ))}
          </div>
        </div>
      )}

      {openMenu === 'financeiro' && showFinanceiro && (
        <div
          className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]"
          style={{ background: submenuBg, backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)', border: `1px solid ${submenuBorder}` }}
        >
          <div className="px-2 py-2 space-y-0.5">
            {financeiroSubLinks.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/financeiro'}
                className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      )}

      {/* Barra principal */}
      <div
        className="flex items-center gap-1 px-3 py-2.5 rounded-2xl shadow-2xl"
        style={{
          background: barBg,
          backdropFilter: 'blur(32px)',
          WebkitBackdropFilter: 'blur(32px)',
          border: `1px solid ${barBorder}`,
        }}
      >
        {/* Links de navegação */}
        {mainLinks
          .filter(l => l.roles.includes(funcao))
          .map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
            >
              {label}
            </NavLink>
          ))}

        {showMarketing && (
          <button
            onClick={() => toggleMenu('marketing')}
            className={`${linkBase} ${isMarketingActive || openMenu === 'marketing' ? linkActive : linkInactive}`}
          >
            Marketing
          </button>
        )}

        {showFinanceiro && (
          <button
            onClick={() => toggleMenu('financeiro')}
            className={`${linkBase} ${isFinanceiroActive || openMenu === 'financeiro' ? linkActive : linkInactive}`}
          >
            Financeiro
          </button>
        )}

        {showEquipe && (
          <NavLink to="/equipe"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            Equipe
          </NavLink>
        )}

        <div className={`w-px h-5 mx-1 ${divider}`} />

        {/* Notificação */}
        <button className={`${iconBtn} relative`} title="Notificações">
          <Bell size={16} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full" />
        </button>

        {/* Toggle tema */}
        <button onClick={alternarTema} className={iconBtn} title={isDark ? 'Modo claro' : 'Modo escuro'}>
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <div className={`w-px h-5 mx-1 ${divider}`} />

        <span className={`text-xs font-medium px-1 hidden sm:block ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          {usuario?.nome?.split(' ')[0] || 'Usuário'}
        </span>

        <button onClick={handleSair} className={sairClass}>
          Sair
        </button>
      </div>
    </nav>
  )
}
