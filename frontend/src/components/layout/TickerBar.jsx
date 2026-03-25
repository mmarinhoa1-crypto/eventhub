import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useTema } from '../../contexts/ThemeContext'
import api from '../../api/client'

export default function TickerBar() {
  const { usuario } = useAuth()
  const { tema } = useTema()
  const funcao = usuario?.funcao || 'viewer'
  const isDark = tema === 'dark'

  const isSocialDesigner = funcao === 'social_media' || funcao === 'designer'
  const isGestor = funcao === 'admin' || funcao === 'diretor'

  const [pendentes, setPendentes] = useState(0)

  // Carregar contagem de pendentes para admin/diretor
  useEffect(() => {
    if (!isGestor) return
    function carregar() {
      api.get('/minhas-demandas').then(r => {
        const all = [...(r.data.briefings || []), ...(r.data.posts || [])]
        setPendentes(all.filter(d => d.status === 'pendente' || d.status === 'em_andamento').length)
      }).catch(() => {})
    }
    carregar()
    const interval = setInterval(carregar, 30000)
    return () => clearInterval(interval)
  }, [isGestor])

  if (!isSocialDesigner && !isGestor) return null

  const textColor = isDark ? '#ffffff' : '#000000'

  // Mensagem diferente por perfil
  let msg
  if (isSocialDesigner) {
    msg = (
      <>
        <span style={{ color: '#f80d52', fontWeight: 800 }}>EXTREMAMENTE IMPORTANTE</span>
        <span style={{ color: textColor }}> ATUALIZAREM AS TAGS NAS SUAS DEMANDAS.</span>
      </>
    )
  } else {
    msg = (
      <>
        <span style={{ color: '#f80d52', fontWeight: 800 }}>TOTAL DE {pendentes} DEMANDAS PENDENTES</span>
      </>
    )
  }

  const separator = <span style={{ color: '#f80d52', margin: '0 2.5rem' }}>●</span>

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
          animation: 'ticker-scroll 90s linear infinite',
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
