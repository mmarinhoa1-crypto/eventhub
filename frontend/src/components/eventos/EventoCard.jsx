import { useState } from 'react'
import { Calendar, MapPin, TrendingUp, ArrowRight, Trash2, AlertTriangle } from 'lucide-react'

export default function EventoCard({ evento, onClick, onDelete }) {
  const [confirmando, setConfirmando] = useState(false)

  const orcamento = Number(evento.orcamento) || 0
  const gasto     = Number(evento.total) || 0
  const receita   = Number(evento.baladapp_receita) || 0
  const pct       = orcamento > 0 ? Math.min((gasto / orcamento) * 100, 100) : 0
  const saldo     = receita - gasto

  const barColor = pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-blue-500'

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

  return (
    <div
      className="group relative bg-white dark:bg-[rgba(19,19,22,0.98)] rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer flex-shrink-0"
      style={{ border: '1px solid #f80d52' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(248,13,82,0.15)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
      style={{ width: 280 }}
      onClick={() => !confirmando && onClick(evento)}
    >
      {/* Barra de cor superior */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, #f80d52, #ff3d7a)' }} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-bold text-gray-900 dark:text-white/90 text-sm leading-snug truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
              {evento.nome}
            </h4>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {evento.data_evento && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <Calendar size={11} />
                  {evento.data_evento}
                </span>
              )}
              {evento.cidade && (
                <span className="flex items-center gap-1 text-[11px] text-gray-400">
                  <MapPin size={11} />
                  {evento.cidade}
                </span>
              )}
            </div>
          </div>
          <div className="p-1.5 rounded-xl transition-all flex-shrink-0 group-hover:!bg-[#f80d52] group-hover:text-white" style={{ backgroundColor: 'rgba(248,13,82,0.08)', color: '#f80d52' }}>
            <ArrowRight size={14} />
          </div>
        </div>

        {/* Financeiro */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Gasto</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">{fmtV(gasto)}</p>
          </div>
          {receita > 0 ? (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-xl px-3 py-2">
              <p className="text-[9px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Receita</p>
              <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{fmtV(receita)}</p>
            </div>
          ) : (
            <div className="rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(248,13,82,0.08)' }}>
              <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: '#f80d52' }}>Orçamento</p>
              <p className="text-sm font-bold mt-0.5" style={{ color: '#f80d52' }}>
                {orcamento > 0 ? fmtV(orcamento) : '—'}
              </p>
            </div>
          )}
        </div>

        {/* Barra de progresso */}
        {orcamento > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-gray-400">Orçamento usado</span>
              <span className={`text-[10px] font-bold ${pct > 90 ? 'text-rose-500' : pct > 70 ? 'text-amber-500' : 'text-blue-500'}`}>
                {pct.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Saldo */}
        {receita > 0 && (
          <div className="flex justify-end">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              saldo >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              <TrendingUp size={9} />
              {saldo >= 0 ? '+' : ''}{fmtV(Math.abs(saldo))}
            </span>
          </div>
        )}
      </div>

      {/* Botão de excluir — aparece no hover */}
      {!confirmando && onDelete && (
        <button
          onClick={handleDeleteClick}
          className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200"
          title="Excluir evento"
        >
          <Trash2 size={13} />
        </button>
      )}

      {/* Confirmação de exclusão */}
      {confirmando && (
        <div
          className="absolute inset-0 bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 rounded-2xl z-10"
          onClick={e => e.stopPropagation()}
        >
          <AlertTriangle size={22} className="text-rose-400" />
          <p className="text-sm font-bold text-gray-800">Excluir evento?</p>
          <p className="text-xs text-gray-400 text-center px-4">Esta ação não pode ser desfeita.</p>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
              Cancelar
            </button>
            <button onClick={handleConfirm} className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-rose-500 text-white hover:bg-rose-600 transition">
              Excluir
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
