import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, ChevronDown, Menu, X, LogOut, User } from 'lucide-react'
import NotificationPanel from './NotificationPanel'
import { useAuth } from '../../hooks/useAuth'
import { useTema } from '../../contexts/ThemeContext'
import api from '../../api/client'

const mainLinks = [
  { to: '/', label: 'Dashboard' },
]

const marketingRoles = ['admin', 'social_media', 'designer', 'diretor', 'gestor_trafego']

const trafegoSubLinks = [
  { to: '/trafego', label: 'Funil de Tráfego' },
  { to: '/anuncios', label: 'Anúncios' },
]

const iaSubLinks = [
  { to: '/ia', label: 'Campanhas IA' },
  { to: '/ia?subtab=analise', label: 'Análise IA' },
]

const financeiroSubLinks = [
  { to: '/financeiro', label: 'Planilha' },
  { to: '/pendentes', label: 'Comprovantes' },
  { to: '/vendas', label: 'Vendas' },
  { to: '/consumo', label: 'Consumo' },
  { to: '/previsao', label: 'Previsão IA' },
]

const funcaoLabels = {
  admin: 'Administrador', diretor: 'Diretor', designer: 'Designer',
  social_media: 'Social Media', gestor_trafego: 'Gestor de Tráfego',
  agent: 'Agente', viewer: 'Visualizador', suporte: 'Suporte',
}

export default function Sidebar() {
  const { usuario, sair } = useAuth()
  const { tema, alternarTema } = useTema()
  const funcao = usuario?.funcao || 'viewer'
  const location = useLocation()
  const navigate = useNavigate()

  const [openMenu, setOpenMenu] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userDropdown, setUserDropdown] = useState(false)
  const [fotoUrl, setFotoUrl] = useState(null)
  const navRef = useRef(null)
  const userRef = useRef(null)
  const mobileDrawerRef = useRef(null)

  const isDark = tema === 'dark'

  const showMarketing = marketingRoles.includes(funcao)
  const canFinanceiro = funcao === 'admin' || funcao === 'diretor'
  const canEquipe = funcao === 'admin' || funcao === 'diretor'
  const canTrafego = funcao === 'admin' || funcao === 'diretor' || funcao === 'gestor_trafego'
  const canIA = funcao === 'admin' || funcao === 'diretor'
  const canDashboard = funcao === 'admin' || funcao === 'agent' || funcao === 'diretor'

  const isMarketingActive = location.pathname.startsWith('/demandas')
  const isTrafegoActive = ['/trafego', '/anuncios'].some(p => location.pathname.startsWith(p))
  const isIAActive = location.pathname.startsWith('/ia')
  const isFinanceiroActive = ['/financeiro', '/pendentes', '/vendas', '/consumo', '/previsao'].some(p => location.pathname.startsWith(p))

  // Carregar foto de perfil
  useEffect(() => {
    api.get('/equipe/me').then(r => {
      if (r.data.foto_url) setFotoUrl(r.data.foto_url)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e) {
      if (mobileDrawerRef.current && mobileDrawerRef.current.contains(e.target)) return
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null)
      if (userRef.current && !userRef.current.contains(e.target)) setUserDropdown(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => { setOpenMenu(null); setUserDropdown(false) }, [location.pathname])

  function toggleMenu(name) {
    setOpenMenu(prev => (prev === name ? null : name))
  }

  function handleSair() {
    sair()
    navigate('/entrar')
  }

  const inicial = usuario?.nome?.[0]?.toUpperCase() || 'U'

  // Estilos glass
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
  const circleStyle = {
    background: isDark ? 'rgba(20, 20, 30, 0.60)' : 'rgba(255, 255, 255, 0.70)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    border: isDark ? '1px solid rgba(255, 255, 255, 0.10)' : '1px solid rgba(0, 0, 0, 0.06)',
    boxShadow: isDark
      ? '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.05)'
      : '0 4px 20px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)',
  }

  const linkBase = 'px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap'
  const linkActive = 'bg-black/8 text-gray-900 font-semibold dark:bg-white/20 dark:text-white'
  const linkInactive = 'text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10'

  const subLinkBase = 'block px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-150 whitespace-nowrap'
  const subLinkActive = 'bg-black/8 text-gray-900 font-semibold dark:bg-white/20 dark:text-white'
  const subLinkInactive = 'text-gray-500 hover:text-gray-900 hover:bg-black/5 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/15'

  const iconBtn = 'text-gray-400 hover:text-gray-700 hover:bg-black/[0.06] p-1.5 rounded-lg transition-all dark:text-white/50 dark:hover:text-white dark:hover:bg-white/10'

  const divider = 'bg-black/10 dark:bg-white/15'

  // Mobile styles
  const mobileLinkBase = 'block px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200'
  const mobileLinkActive = 'bg-accent/10 text-accent'
  const mobileLinkInactive = 'text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/[0.06]'
  const mobileSubLinkBase = 'block px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-150'

  return (
    <>
      {/* ===== DESKTOP: 3-COLUMN TOP BAR ===== */}
      <div className="fixed top-0 left-0 right-0 z-50 hidden md:block pointer-events-none" style={{ height: 72 }}>
        <div className="max-w-[1600px] mx-auto px-5 h-full flex items-center justify-between">

          {/* ESQUERDA: Avatar do usuário */}
          <div ref={userRef} className="relative pointer-events-auto">
            <button
              onClick={() => setUserDropdown(!userDropdown)}
              className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
              style={circleStyle}
            >
              {fotoUrl ? (
                <img src={'/api' + fotoUrl} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <User size={18} className="text-gray-500 dark:text-white/60" />
              )}
            </button>

            {/* User dropdown */}
            {userDropdown && (
              <div
                className="absolute top-full mt-3 left-0 rounded-2xl overflow-hidden shadow-2xl min-w-[220px] p-4 space-y-3"
                style={submenuStyle}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ background: fotoUrl ? 'transparent' : 'linear-gradient(135deg, #f80d52, #ff6b9d)' }}
                  >
                    {fotoUrl ? (
                      <img src={'/api' + fotoUrl} alt="Perfil" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-white">{inicial}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white/90 truncate">{usuario?.nome || 'Usuário'}</p>
                    <p className="text-[11px] text-gray-400 dark:text-white/40">{funcaoLabels[funcao] || funcao}</p>
                    <p className="text-[10px] text-gray-400 dark:text-white/30 truncate mt-0.5">{usuario?.email || ''}</p>
                  </div>
                </div>
                <div className="h-px bg-gray-200/60 dark:bg-white/[0.06]" />
                <button
                  onClick={handleSair}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </div>
            )}
          </div>

          {/* CENTRO: Menu principal */}
          <nav ref={navRef} className="relative pointer-events-auto">
            {/* Submenus */}
            {openMenu === 'trafego' && canTrafego && (
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]" style={submenuStyle}>
                <div className="px-2 py-2 space-y-0.5">
                  {trafegoSubLinks.map(({ to, label }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}>{label}</NavLink>
                  ))}
                </div>
              </div>
            )}
            {openMenu === 'ia' && canIA && (
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]" style={submenuStyle}>
                <div className="px-2 py-2 space-y-0.5">
                  {iaSubLinks.map(({ to, label }) => (
                    <a key={label} href={to} onClick={e => { e.preventDefault(); navigate(to); setOpenMenu(null) }} className={`${subLinkBase} ${location.pathname === '/ia' && ((label.includes('Campanhas') && !location.search.includes('analise')) || (label.includes('Análise') && location.search.includes('analise'))) ? subLinkActive : subLinkInactive}`}>{label}</a>
                  ))}
                </div>
              </div>
            )}
            {openMenu === 'financeiro' && canFinanceiro && (
              <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 rounded-2xl overflow-hidden shadow-2xl min-w-[180px]" style={submenuStyle}>
                <div className="px-2 py-2 space-y-0.5">
                  {financeiroSubLinks.map(({ to, label }) => (
                    <NavLink key={to} to={to} end={to === '/financeiro'} className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}>{label}</NavLink>
                  ))}
                </div>
              </div>
            )}

            {/* Barra central glass */}
            <div className="flex items-center gap-1 px-5 py-2.5 rounded-2xl shadow-2xl" style={barStyle}>
              <img src="/logo-rosa.png" alt="314 Produções" className="h-7 w-auto flex-shrink-0" />
              <div className={`w-px h-5 mx-0.5 ${divider}`} />
              {mainLinks.map(({ to, label }) => {
                const allowed = canDashboard || to === '/eventos'
                return allowed ? (
                  <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>{label}</NavLink>
                ) : (
                  <span key={to} className={`${linkBase} text-gray-300 dark:text-white/20 cursor-default select-none`}>{label}</span>
                )
              })}
              <NavLink to="/eventos" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Eventos</NavLink>
              {showMarketing ? (
                <NavLink to="/demandas" className={({ isActive }) => `${linkBase} ${isActive || isMarketingActive ? linkActive : linkInactive}`}>Marketing</NavLink>
              ) : (
                <span className={`${linkBase} text-gray-300 dark:text-white/20 cursor-default select-none`}>Marketing</span>
              )}
              {canTrafego ? (
                <button onClick={() => toggleMenu('trafego')} className={`${linkBase} flex items-center gap-1 ${isTrafegoActive || openMenu === 'trafego' ? linkActive : linkInactive}`}>
                  Tráfego <ChevronDown size={12} className={'transition-transform duration-200 ' + (openMenu === 'trafego' ? 'rotate-180' : '')} />
                </button>
              ) : (
                <span className={`${linkBase} flex items-center gap-1 text-gray-300 dark:text-white/20 cursor-default select-none`}>
                  Tráfego <ChevronDown size={12} />
                </span>
              )}
              {canIA ? (
                <button onClick={() => toggleMenu('ia')} className={`${linkBase} flex items-center gap-1 ${isIAActive || openMenu === 'ia' ? linkActive : linkInactive}`}>
                  IA <ChevronDown size={12} className={'transition-transform duration-200 ' + (openMenu === 'ia' ? 'rotate-180' : '')} />
                </button>
              ) : (
                <span className={`${linkBase} flex items-center gap-1 text-gray-300 dark:text-white/20 cursor-default select-none`}>
                  IA <ChevronDown size={12} />
                </span>
              )}
              {canFinanceiro ? (
                <button onClick={() => toggleMenu('financeiro')} className={`${linkBase} flex items-center gap-1 ${isFinanceiroActive || openMenu === 'financeiro' ? linkActive : linkInactive}`}>
                  Financeiro <ChevronDown size={12} className={'transition-transform duration-200 ' + (openMenu === 'financeiro' ? 'rotate-180' : '')} />
                </button>
              ) : (
                <span className={`${linkBase} flex items-center gap-1 text-gray-300 dark:text-white/20 cursor-default select-none`}>
                  Financeiro <ChevronDown size={12} />
                </span>
              )}
              {canEquipe ? (
                <NavLink to="/equipe" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Equipe</NavLink>
              ) : (
                <span className={`${linkBase} text-gray-300 dark:text-white/20 cursor-default select-none`}>Equipe</span>
              )}
            </div>
          </nav>

          {/* DIREITA: Notificações + Theme */}
          <div className="flex items-center gap-2.5 pointer-events-auto">
            {/* Notificações */}
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105"
              style={circleStyle}
            >
              <NotificationPanel />
            </div>

            {/* Light/Dark toggle */}
            <button
              onClick={alternarTema}
              className="w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105 active:scale-95"
              style={circleStyle}
              title={isDark ? 'Modo claro' : 'Modo escuro'}
            >
              {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} className="text-gray-500" />}
            </button>
          </div>
        </div>
      </div>

      {/* ===== MOBILE NAVBAR (inalterado) ===== */}
      <nav className="fixed top-0 left-0 right-0 z-50 md:hidden">
        <div className="flex items-center justify-between px-4 py-3" style={barStyle}>
          <img src="/logo-rosa.png" alt="314 Produções" className="h-6 w-auto flex-shrink-0" />
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

        {mobileOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-[55]" onClick={() => setMobileOpen(false)} />
            <div ref={mobileDrawerRef} className="fixed top-0 right-0 w-72 h-full z-[56] overflow-y-auto shadow-2xl" style={{ ...submenuStyle, borderRadius: 0, borderLeft: '1px solid var(--sidebar-submenu-border)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/[0.08]">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white/90">{usuario?.nome || 'Usuário'}</p>
                  <p className="text-[11px] text-gray-400 dark:text-white/40">{funcaoLabels[funcao] || funcao}</p>
                </div>
                <button onClick={() => setMobileOpen(false)} className={iconBtn}><X size={18} /></button>
              </div>
              <div className="p-3 space-y-1">
                {/* Dashboard */}
                {canDashboard ? (
                  <button onClick={() => { navigate('/'); setMobileOpen(false) }}
                    className={`${mobileLinkBase} w-full text-left ${location.pathname === '/' ? mobileLinkActive : mobileLinkInactive}`}>Dashboard</button>
                ) : (
                  <span className={`${mobileLinkBase} block text-gray-300 dark:text-white/20`}>Dashboard</span>
                )}
                {/* Eventos */}
                <button onClick={() => { navigate('/eventos'); setMobileOpen(false) }}
                  className={`${mobileLinkBase} w-full text-left ${location.pathname === '/eventos' ? mobileLinkActive : mobileLinkInactive}`}>Eventos</button>
                {/* Marketing */}
                {showMarketing ? (
                  <button onClick={() => { navigate('/demandas'); setMobileOpen(false) }}
                    className={`${mobileLinkBase} w-full text-left ${isMarketingActive ? mobileLinkActive : mobileLinkInactive}`}>Marketing</button>
                ) : (
                  <span className={`${mobileLinkBase} block text-gray-300 dark:text-white/20`}>Marketing</span>
                )}
                {/* Tráfego */}
                {canTrafego ? (
                  <div>
                    <button onClick={() => setOpenMenu(openMenu === 'trafego' ? null : 'trafego')}
                      className={`${mobileLinkBase} w-full text-left flex items-center justify-between ${isTrafegoActive ? mobileLinkActive : mobileLinkInactive}`}>
                      Tráfego <ChevronDown size={14} className={'transition-transform duration-200 ' + (openMenu === 'trafego' ? 'rotate-180' : '')} />
                    </button>
                    {openMenu === 'trafego' && (
                      <div className="mt-1 space-y-0.5">
                        {trafegoSubLinks.map(({ to, label }) => (
                          <button key={to} onClick={() => { navigate(to); setMobileOpen(false) }}
                            className={`${mobileSubLinkBase} w-full text-left ${location.pathname === to ? mobileLinkActive : mobileLinkInactive}`}>{label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={`${mobileLinkBase} block text-gray-300 dark:text-white/20`}>Tráfego</span>
                )}
                {/* IA */}
                {canIA ? (
                  <div>
                    <button onClick={() => setOpenMenu(openMenu === 'ia' ? null : 'ia')}
                      className={`${mobileLinkBase} w-full text-left flex items-center justify-between ${isIAActive ? mobileLinkActive : mobileLinkInactive}`}>
                      IA <ChevronDown size={14} className={'transition-transform duration-200 ' + (openMenu === 'ia' ? 'rotate-180' : '')} />
                    </button>
                    {openMenu === 'ia' && (
                      <div className="mt-1 space-y-0.5">
                        {iaSubLinks.map(({ to, label }) => (
                          <button key={label} onClick={() => { navigate(to); setMobileOpen(false) }}
                            className={`${mobileSubLinkBase} w-full text-left ${mobileLinkInactive}`}>{label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className={`${mobileLinkBase} block text-gray-300 dark:text-white/20`}>IA</span>
                )}
                {/* Financeiro */}
                {canFinanceiro ? (
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
                ) : (
                  <span className={`${mobileLinkBase} block text-gray-300 dark:text-white/20`}>Financeiro</span>
                )}
                {/* Equipe */}
                {canEquipe ? (
                  <button onClick={() => { navigate('/equipe'); setMobileOpen(false) }}
                    className={`${mobileLinkBase} w-full text-left ${location.pathname === '/equipe' ? mobileLinkActive : mobileLinkInactive}`}>Equipe</button>
                ) : (
                  <span className={`${mobileLinkBase} block text-gray-300 dark:text-white/20`}>Equipe</span>
                )}
              </div>
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
