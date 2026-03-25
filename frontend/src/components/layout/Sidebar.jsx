import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, ChevronDown, Menu, X } from 'lucide-react'
import NotificationPanel from './NotificationPanel'
import { useAuth } from '../../hooks/useAuth'
import { useTema } from '../../contexts/ThemeContext'

const mainLinks = [
  { to: '/', label: 'Dashboard', roles: ['admin', 'agent', 'diretor'] },
  { to: '/eventos', label: 'Eventos', roles: ['admin', 'diretor'] },
]

const marketingSubLinks = [
  { to: '/marketing', label: 'Cronograma', roles: ['admin', 'social_media', 'diretor'] },
  { to: '/demandas', label: 'Minhas Demandas', roles: ['admin', 'social_media', 'designer', 'diretor', 'gestor_trafego'] },
  { to: '/anuncios', label: 'Anúncios', roles: ['admin', 'diretor', 'gestor_trafego'] },
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const navRef = useRef(null)
  const mobileDrawerRef = useRef(null)

  const isDark = tema === 'dark'

  const showMarketing = ['admin', 'social_media', 'designer', 'diretor', 'gestor_trafego'].includes(funcao)
  const showFinanceiro = funcao === 'admin' || funcao === 'diretor'
  const showEquipe = funcao === 'admin' || funcao === 'diretor'

  const isMarketingActive = ['/marketing', '/demandas', '/anuncios'].some(p => location.pathname.startsWith(p))
  const isFinanceiroActive = ['/financeiro', '/vendas', '/consumo', '/previsao'].some(p => location.pathname.startsWith(p))

  useEffect(() => {
    function handleClickOutside(e) {
      // Ignorar cliques dentro do drawer mobile
      if (mobileDrawerRef.current && mobileDrawerRef.current.contains(e.target)) return
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fechar submenus desktop ao navegar
  useEffect(() => { setOpenMenu(null) }, [location.pathname])

  function toggleMenu(name) {
    setOpenMenu(prev => (prev === name ? null : name))
  }

  function handleSair() {
    sair()
    navigate('/entrar')
  }

  // Estilos da barra glass
  const barStyle = {
    background: 'var(--sidebar-bar-bg)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: '1px solid var(--sidebar-bar-border)',
  }
  const submenuStyle = {
    background: 'var(--sidebar-submenu-bg)',
    backdropFilter: 'blur(28px)',
    WebkitBackdropFilter: 'blur(28px)',
    border: '1px solid var(--sidebar-submenu-border)',
  }

  const linkBase = 'px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap'
  const linkActive = 'bg-black/8 text-gray-900 font-semibold dark:bg-white/20 dark:text-white'
  const linkInactive = 'text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'

  const subLinkBase = 'block px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap'
  const subLinkActive = 'bg-black/8 text-gray-900 font-semibold dark:bg-white/20 dark:text-white'
  const subLinkInactive = 'text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/15'

  const iconBtn = 'text-gray-400 hover:text-gray-700 hover:bg-black/[0.06] p-1.5 rounded-lg transition-all dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10'

  const divider = 'bg-black/10 dark:bg-white/15'
  const sairClass = `${linkBase} text-red-400 hover:text-red-600 hover:bg-red-50 dark:text-red-400/80 dark:hover:text-red-300 dark:hover:bg-red-500/10`

  // Mobile drawer link styles
  const mobileLinkBase = 'block px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200'
  const mobileLinkActive = 'bg-accent/10 text-accent'
  const mobileLinkInactive = 'text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
  const mobileSubLinkBase = 'block px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-150'

  return (
    <>
      {/* ===== DESKTOP NAVBAR ===== */}
      <nav
        ref={navRef}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 hidden md:block"
        style={{ maxWidth: 'calc(100vw - 0.5rem)' }}
      >
        {/* Submenus desktop */}
        {openMenu === 'marketing' && showMarketing && (
          <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]" style={submenuStyle}>
            <div className="px-2 py-2 space-y-0.5">
              {marketingSubLinks.filter(l => l.roles.includes(funcao)).map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === '/marketing'} className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}>{label}</NavLink>
              ))}
            </div>
          </div>
        )}
        {openMenu === 'financeiro' && showFinanceiro && (
          <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]" style={submenuStyle}>
            <div className="px-2 py-2 space-y-0.5">
              {financeiroSubLinks.map(({ to, label }) => (
                <NavLink key={to} to={to} end={to === '/financeiro'} className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}>{label}</NavLink>
              ))}
            </div>
          </div>
        )}

        {/* Barra principal desktop */}
        <div className="flex items-center gap-0.5 px-2.5 py-2.5 rounded-2xl shadow-2xl" style={barStyle}>
          <img src="/logo-rosa.png" alt="314 Produções" className="h-7 w-auto flex-shrink-0" />
          <div className={`w-px h-5 mx-0.5 ${divider}`} />
          {mainLinks.filter(l => l.roles.includes(funcao)).map(({ to, label }) => (
            <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>{label}</NavLink>
          ))}
          {showMarketing && (
            <button onClick={() => toggleMenu('marketing')} className={`${linkBase} flex items-center gap-1 ${isMarketingActive || openMenu === 'marketing' ? linkActive : linkInactive}`}>
              Marketing <ChevronDown size={12} className={'transition-transform duration-200 ' + (openMenu === 'marketing' ? 'rotate-180' : '')} />
            </button>
          )}
          {showFinanceiro && (
            <button onClick={() => toggleMenu('financeiro')} className={`${linkBase} flex items-center gap-1 ${isFinanceiroActive || openMenu === 'financeiro' ? linkActive : linkInactive}`}>
              Financeiro <ChevronDown size={12} className={'transition-transform duration-200 ' + (openMenu === 'financeiro' ? 'rotate-180' : '')} />
            </button>
          )}
          {showEquipe && (
            <NavLink to="/equipe" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Equipe</NavLink>
          )}
          <div className={`w-px h-5 mx-0.5 ${divider}`} />
          <NotificationPanel />
          <button onClick={alternarTema} className={iconBtn} title={isDark ? 'Modo claro' : 'Modo escuro'}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <div className={`w-px h-5 mx-0.5 ${divider}`} />
          <span className="text-xs font-medium px-1 text-gray-400 dark:text-white/40">{usuario?.nome?.split(' ')[0] || 'Usuário'}</span>
          <button onClick={handleSair} className={sairClass}>Sair</button>
        </div>
      </nav>

      {/* ===== MOBILE NAVBAR ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 md:hidden">
        <div className="flex items-center justify-between px-4 py-3" style={barStyle}>
          {/* Logo */}
          <img src="/logo-rosa.png" alt="314 Produções" className="h-6 w-auto flex-shrink-0" />

          {/* Notificação + Theme + Hamburguer */}
          <div className="flex items-center gap-1">
            <NotificationPanel />
            <button onClick={alternarTema} className={iconBtn} title={isDark ? 'Modo claro' : 'Modo escuro'}>
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className={iconBtn}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-[55]" onClick={() => setMobileOpen(false)} />
            <div ref={mobileDrawerRef} className="fixed top-0 right-0 w-72 h-full z-[56] overflow-y-auto shadow-2xl" style={{ ...submenuStyle, borderRadius: 0, borderLeft: '1px solid var(--sidebar-submenu-border)' }}>
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/[0.08]">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white/90">{usuario?.nome || 'Usuário'}</p>
                  <p className="text-[11px] text-gray-400 dark:text-white/40">{funcao === 'admin' ? 'Administrador' : funcao === 'diretor' ? 'Diretor' : funcao === 'designer' ? 'Designer' : funcao === 'social_media' ? 'Social Media' : funcao === 'gestor_trafego' ? 'Gestor de Tráfego' : funcao}</p>
                </div>
                <button onClick={() => setMobileOpen(false)} className={iconBtn}><X size={18} /></button>
              </div>

              {/* Links */}
              <div className="p-3 space-y-1">
                {mainLinks.filter(l => l.roles.includes(funcao)).map(({ to, label }) => (
                  <button key={to} onClick={() => { navigate(to); setMobileOpen(false) }}
                    className={`${mobileLinkBase} w-full text-left ${location.pathname === to ? mobileLinkActive : mobileLinkInactive}`}>{label}</button>
                ))}

                {showMarketing && (
                  <div>
                    <button onClick={() => setOpenMenu(openMenu === 'marketing' ? null : 'marketing')}
                      className={`${mobileLinkBase} w-full text-left flex items-center justify-between ${isMarketingActive ? mobileLinkActive : mobileLinkInactive}`}>
                      Marketing <ChevronDown size={14} className={'transition-transform duration-200 ' + (openMenu === 'marketing' ? 'rotate-180' : '')} />
                    </button>
                    {openMenu === 'marketing' && (
                      <div className="mt-1 space-y-0.5">
                        {marketingSubLinks.filter(l => l.roles.includes(funcao)).map(({ to, label }) => (
                          <button key={to} onClick={() => { navigate(to); setMobileOpen(false) }}
                            className={`${mobileSubLinkBase} w-full text-left ${location.pathname === to ? mobileLinkActive : mobileLinkInactive}`}>{label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showFinanceiro && (
                  <div>
                    <button onClick={() => setOpenMenu(openMenu === 'financeiro' ? null : 'financeiro')}
                      className={`${mobileLinkBase} w-full text-left flex items-center justify-between ${isFinanceiroActive ? mobileLinkActive : mobileLinkInactive}`}>
                      Financeiro <ChevronDown size={14} className={'transition-transform duration-200 ' + (openMenu === 'financeiro' ? 'rotate-180' : '')} />
                    </button>
                    {openMenu === 'financeiro' && (
                      <div className="mt-1 space-y-0.5">
                        {financeiroSubLinks.map(({ to, label }) => (
                          <button key={to} onClick={() => { navigate(to); setMobileOpen(false) }}
                            className={`${mobileSubLinkBase} w-full text-left ${location.pathname === to ? mobileLinkActive : mobileLinkInactive}`}>{label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {showEquipe && (
                  <button onClick={() => { navigate('/equipe'); setMobileOpen(false) }}
                    className={`${mobileLinkBase} w-full text-left ${location.pathname === '/equipe' ? mobileLinkActive : mobileLinkInactive}`}>Equipe</button>
                )}
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-white/[0.08]">
                <button onClick={handleSair} className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition">Sair</button>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  )
}
