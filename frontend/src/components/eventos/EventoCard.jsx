import { useState } from 'react'
import { MapPin, ArrowRight, Trash2, AlertTriangle, Clock } from 'lucide-react'
import { useTema } from '../../contexts/ThemeContext'

const MESES_CURTO = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function parseData(str) {
  if (!str) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str + 'T12:00:00')
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const [d, m, y] = str.split('/')
    return new Date(`${y}-${m}-${d}T12:00:00`)
  }
  return null
}

export default function EventoCard({ evento, diasDiff, abaAtual, clickable = true, onClick, onDelete }) {
  const [confirmando, setConfirmando] = useState(false)
  const { tema } = useTema()
  const isDark = tema === 'dark'

  const orcamento = Number(evento.orcamento) || 0
  const gasto = Number(evento.total) || 0

  function fmtV(v) {
    return v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1) + 'K' : 'R$ ' + v.toLocaleString('pt-BR')
  }

  function handleDeleteClick(e) {
    e.stopPropagation()
    setConfirmando(true)
  }
  function handleConfirm(e) {
    e.stopPropagation()
    setConfirmando(false)
    onDelete?.(evento.id)
  }
  function handleCancel(e) {
    e.stopPropagation()
    setConfirmando(false)
  }

  const dt = parseData(evento.data_evento)
  const dia = dt ? dt.getDate() : null
  const mes = dt ? MESES_CURTO[dt.getMonth()] : null

  // Label de tempo
  let tempoLabel = null
  if (diasDiff !== null && diasDiff !== undefined) {
    if (diasDiff === 0) tempoLabel = 'Hoje'
    else if (diasDiff === 1) tempoLabel = 'Amanhã'
    else if (diasDiff > 0) tempoLabel = `Faltam ${diasDiff} dias`
    else if (diasDiff === -1) tempoLabel = 'Ontem'
    else tempoLabel = `Há ${Math.abs(diasDiff)} dias`
  }

  const cardStyle = {
    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.80)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.05)',
    cursor: clickable ? 'pointer' : 'default',
  }

  return (
    <div
      className={'group relative rounded-xl overflow-hidden transition-all duration-200 ' + (clickable ? 'hover:shadow-lg' : '')}
      style={cardStyle}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.borderColor = '#f80d52' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}
      onClick={() => clickable && !confirmando && onClick?.(evento)}
    >
      <div className="p-4 flex gap-3.5">
        {/* Badge data */}
        {dia && (
          <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 bg-accent/8 dark:bg-accent/15">
            <span className="text-base font-extrabold text-accent leading-none">{dia}</span>
            <span className="text-[9px] font-bold text-accent/70 uppercase mt-0.5">{mes}</span>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={'text-sm font-bold leading-snug truncate ' + (clickable ? 'text-gray-900 dark:text-white/90 group-hover:text-accent transition-colors' : 'text-gray-700 dark:text-white/70')}>
              {evento.nome}
            </h4>
            {clickable && (
              <div className="p-1 rounded-lg flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity bg-accent/10 text-accent">
                <ArrowRight size={12} />
              </div>
            )}
          </div>

          {evento.cidade && (
            <p className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-white/35 mt-1">
              <MapPin size={10} className="flex-shrink-0" />
              <span className="truncate">{evento.cidade}</span>
            </p>
          )}

          {/* Tempo */}
          {tempoLabel && (
            <p className={'flex items-center gap-1 text-[10px] font-semibold mt-1.5 ' + (abaAtual === 'proximos' ? 'text-blue-500 dark:text-blue-400' : 'text-gray-400 dark:text-white/30')}>
              <Clock size={9} />
              {tempoLabel}
            </p>
          )}
        </div>
      </div>

      {/* Financeiro compacto */}
      <div className="px-4 pb-3.5 flex gap-2">
        <div className="flex-1 rounded-lg px-2.5 py-1.5 bg-gray-50 dark:bg-white/[0.03]">
          <p className="text-[8px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-wider">Gasto</p>
          <p className="text-xs font-bold text-gray-800 dark:text-white/80 mt-0.5">{fmtV(gasto)}</p>
        </div>
        <div className="flex-1 rounded-lg px-2.5 py-1.5 bg-accent/5 dark:bg-accent/8">
          <p className="text-[8px] font-bold text-accent/70 uppercase tracking-wider">Orçamento</p>
          <p className="text-xs font-bold text-accent mt-0.5">{orcamento > 0 ? fmtV(orcamento) : '—'}</p>
        </div>
      </div>

      {/* Excluir hover */}
      {!confirmando && onDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 dark:text-white/20 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200"
          title="Excluir evento"
        >
          <Trash2 size={12} />
        </button>
      )}

      {/* Confirmação exclusão */}
      {confirmando && (
        <div
          className="absolute inset-0 bg-white/95 dark:bg-[#131316]/95 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 rounded-xl z-10"
          onClick={e => e.stopPropagation()}
        >
          <AlertTriangle size={20} className="text-rose-400" />
          <p className="text-sm font-bold text-gray-800 dark:text-white/80">Excluir evento?</p>
          <p className="text-[11px] text-gray-400 dark:text-white/40 text-center px-4">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.10] transition">
              Cancelar
            </button>
            <button onClick={handleConfirm} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition">
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
