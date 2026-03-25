import { useAuth } from '../../hooks/useAuth'
import { useTema } from '../../contexts/ThemeContext'

export default function TickerBar() {
  const { usuario } = useAuth()
  const { tema } = useTema()
  const funcao = usuario?.funcao || 'viewer'
  const isDark = tema === 'dark'

  // Somente para social_media e designer
  if (funcao !== 'social_media' && funcao !== 'designer') return null

  const textColor = isDark ? '#ffffff' : '#000000'

  const msg = (
    <>
      <span style={{ color: '#f80d52', fontWeight: 800 }}>EXTREMAMENTE IMPORTANTE</span>
      <span style={{ color: textColor }}> ATUALIZAREM AS TAGS NAS SUAS DEMANDAS.</span>
    </>
  )

  const separator = <span style={{ color: '#f80d52', margin: '0 2rem' }}>●</span>

  // Repetir bastante para cobrir a largura durante a animação
  const items = []
  for (let i = 0; i < 12; i++) {
    items.push(<span key={i} className="flex items-center whitespace-nowrap">{msg}{separator}</span>)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden"
      style={{
        height: 32,
        background: isDark ? 'rgba(20, 20, 30, 0.70)' : 'rgba(255, 255, 255, 0.70)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
      }}
    >
      <div
        className="flex items-center h-full"
        style={{
          animation: 'ticker-scroll 30s linear infinite',
          width: 'max-content',
        }}
      >
        <div className="flex items-center text-[11px] font-semibold tracking-wide uppercase" style={{ gap: 0 }}>
          {items}
        </div>
        <div className="flex items-center text-[11px] font-semibold tracking-wide uppercase" style={{ gap: 0 }}>
          {items}
        </div>
      </div>

      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}
