import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, X, CheckCheck, Calendar, FileText, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/client'

function tempoAtras(dataStr) {
  const diff = Date.now() - new Date(dataStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d atrás`
  return new Date(dataStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

const TIPO_CONFIG = {
  novo_evento: { icon: Calendar, bg: 'bg-blue-100 dark:bg-blue-500/20', color: 'text-blue-600 dark:text-blue-400', label: 'Novo evento' },
  evento_atribuido: { icon: Calendar, bg: 'bg-pink-100 dark:bg-pink-500/20', color: 'text-pink-600 dark:text-pink-400', label: 'Evento atribuído' },
  demanda_aprovacao: { icon: FileText, bg: 'bg-amber-100 dark:bg-amber-500/20', color: 'text-amber-600 dark:text-amber-400', label: 'Aprovação' },
  demanda_recebida: { icon: FileText, bg: 'bg-green-100 dark:bg-green-500/20', color: 'text-green-600 dark:text-green-400', label: 'Demanda recebida' },
  demanda_atrasada: { icon: FileText, bg: 'bg-red-100 dark:bg-red-500/20', color: 'text-red-600 dark:text-red-400', label: 'Atrasada' },
  comentario_demanda: { icon: FileText, bg: 'bg-violet-100 dark:bg-violet-500/20', color: 'text-violet-600 dark:text-violet-400', label: 'Comentário' },
}

// Swipeable notification item
function NotificationItem({ notif, onDismiss, onRead, onClose }) {
  const [startX, setStartX] = useState(null)
  const [offsetX, setOffsetX] = useState(0)
  const [swiping, setSwiping] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()

  const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.novo_evento
  const Icon = cfg.icon

  function handlePointerDown(e) {
    setStartX(e.clientX)
    setSwiping(true)
    ref.current?.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e) {
    if (!swiping || startX === null) return
    const dx = e.clientX - startX
    setOffsetX(dx)
  }

  function handlePointerUp() {
    if (!swiping) return
    setSwiping(false)
    if (Math.abs(offsetX) > 100) {
      setDismissed(true)
      setTimeout(() => onDismiss(notif.id), 280)
    } else {
      setOffsetX(0)
    }
    setStartX(null)
  }

  function handleClick(e) {
    // Only navigate if not swiping
    if (Math.abs(offsetX) > 5) return
    e.stopPropagation()
    onRead(notif.id)
    if (notif.link) { onClose(); navigate(notif.link) }
  }

  const opacity = dismissed ? 0 : Math.max(0, 1 - Math.abs(offsetX) / 150)
  const scale = dismissed ? 0.9 : 1

  return (
    <div
      style={{
        transform: `translateX(${offsetX}px) scaleY(${scale})`,
        opacity,
        transition: swiping ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
        maxHeight: dismissed ? 0 : 200,
        overflow: 'hidden',
      }}
      className="mb-1 touch-pan-y"
    >
      <div
        ref={ref}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        className={`flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer select-none transition-colors
          ${notif.lida ? 'bg-gray-50 dark:bg-white/[0.03] hover:bg-gray-100 dark:hover:bg-white/[0.06]' : 'bg-white dark:bg-white/[0.04] hover:bg-blue-50 dark:hover:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 shadow-sm'}`}
      >
        {/* Icon */}
        <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center ${cfg.bg}`}>
          <Icon size={16} className={cfg.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold leading-tight ${notif.lida ? 'text-gray-500 dark:text-white/50' : 'text-gray-800 dark:text-white/90'}`}>
              {notif.titulo}
            </p>
            <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
              {tempoAtras(notif.criado_em)}
            </span>
          </div>
          <p className={`text-xs mt-0.5 leading-snug ${notif.lida ? 'text-gray-400 dark:text-white/30' : 'text-gray-600 dark:text-white/60'}`}>
            {notif.mensagem}
          </p>
          {!notif.lida && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span className="text-[10px] font-semibold text-blue-500">Não lida</span>
            </div>
          )}
        </div>

        {/* Arrow */}
        {notif.link && (
          <ChevronRight size={14} className="text-gray-300 flex-shrink-0 mt-1" />
        )}
      </div>
    </div>
  )
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState([])
  const panelRef = useRef(null)

  const naoLidas = notifs.filter(n => !n.lida).length

  const carregar = useCallback(async () => {
    try {
      const { data } = await api.get('/notificacoes')
      setNotifs(data)
    } catch { /* silencioso */ }
  }, [])

  // Carregar ao montar e a cada 30s
  useEffect(() => {
    carregar()
    const id = setInterval(carregar, 30000)
    return () => clearInterval(id)
  }, [carregar])

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function marcarLida(id) {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    try { await api.patch(`/notificacoes/${id}/lida`) } catch { /* silencioso */ }
  }

  async function remover(id) {
    setNotifs(prev => prev.filter(n => n.id !== id))
    try { await api.delete(`/notificacoes/${id}`) } catch { /* silencioso */ }
  }

  async function marcarTodasLidas() {
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
    try { await api.patch('/notificacoes/todas/lida') } catch { /* silencioso */ }
  }

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(v => !v); if (!open) carregar() }}
        className="relative p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
      >
        <Bell size={20} />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-[360px] max-h-[520px] bg-white dark:bg-[rgba(19,19,22,0.95)] dark:backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 dark:border-white/[0.08] z-50 flex flex-col overflow-hidden"
          style={{ animation: 'fadeSlideDown 0.18s ease' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-600 dark:text-white/60" />
              <span className="font-semibold text-gray-800 dark:text-white/90 text-sm">Notificações</span>
              {naoLidas > 0 && (
                <span className="text-xs font-bold bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                  {naoLidas} nova{naoLidas > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button onClick={marcarTodasLidas}
                  className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-500/10 transition">
                  <CheckCheck size={13} />
                  Marcar todas
                </button>
              )}
              <button onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.08] transition text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-2">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center mb-3">
                  <Bell size={20} className="text-gray-300 dark:text-white/30" />
                </div>
                <p className="text-sm font-semibold text-gray-400 dark:text-white/50">Sem notificações</p>
                <p className="text-xs text-gray-300 dark:text-white/30 mt-1">Você está em dia!</p>
              </div>
            ) : (
              <>
                {notifs.filter(n => !n.lida).length > 0 && (
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-1 pt-1">Novas</p>
                )}
                {notifs.filter(n => !n.lida).map(n => (
                  <NotificationItem key={n.id} notif={n} onDismiss={remover} onRead={marcarLida} onClose={() => setOpen(false)} />
                ))}
                {notifs.filter(n => n.lida).length > 0 && (
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-1 pt-2">Anteriores</p>
                )}
                {notifs.filter(n => n.lida).map(n => (
                  <NotificationItem key={n.id} notif={n} onDismiss={remover} onRead={marcarLida} onClose={() => setOpen(false)} />
                ))}
              </>
            )}
          </div>

          {/* Footer hint */}
          {notifs.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-50 dark:border-white/[0.06]">
              <p className="text-[10px] text-gray-300 dark:text-white/30 text-center">Arraste para o lado para remover</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
