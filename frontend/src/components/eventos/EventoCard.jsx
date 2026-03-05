import { Calendar, MapPin, TrendingUp, ArrowRight } from 'lucide-react'

export default function EventoCard({ evento, onClick }) {
  const orcamento = Number(evento.orcamento) || 0
  const gasto = Number(evento.total) || 0
  const receita = Number(evento.baladapp_receita) || 0
  const pct = orcamento > 0 ? Math.min((gasto / orcamento) * 100, 100) : 0
  const saldo = receita - gasto

  const barColor = pct > 90
    ? 'bg-rose-500'
    : pct > 70
    ? 'bg-amber-500'
    : 'bg-blue-500'

  return (
    <div
      className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:shadow-blue-100/50 hover:border-blue-200 transition-all duration-300 cursor-pointer"
      onClick={() => onClick(evento)}
    >
      {/* Top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-blue-500 to-blue-500" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-gray-900 text-base truncate group-hover:text-blue-700 transition-colors">
              {evento.nome}
            </h4>
            <div className="flex items-center gap-3 mt-1.5">
              {evento.data_evento && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar size={12} />
                  {evento.data_evento}
                </span>
              )}
              {evento.cidade && (
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <MapPin size={12} />
                  {evento.cidade}
                </span>
              )}
            </div>
          </div>
          <div className="ml-3 p-2 rounded-xl bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <ArrowRight size={16} />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-xl px-3 py-2.5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Gasto</p>
            <p className="text-sm font-bold text-gray-800 mt-0.5">
              R$ {gasto > 1000 ? (gasto / 1000).toFixed(1) + 'K' : gasto.toLocaleString('pt-BR')}
            </p>
          </div>
          {receita > 0 ? (
            <div className="bg-emerald-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-wider">Receita</p>
              <p className="text-sm font-bold text-emerald-700 mt-0.5">
                R$ {receita > 1000 ? (receita / 1000).toFixed(1) + 'K' : receita.toLocaleString('pt-BR')}
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-xl px-3 py-2.5">
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Orçamento</p>
              <p className="text-sm font-bold text-blue-700 mt-0.5">
                {orcamento > 0
                  ? 'R$ ' + (orcamento > 1000 ? (orcamento / 1000).toFixed(1) + 'K' : orcamento.toLocaleString('pt-BR'))
                  : '-'}
              </p>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {orcamento > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-gray-400">
                {gasto.toLocaleString('pt-BR', { minimumFractionDigits: 0 })} / {orcamento.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
              </span>
              <span className={`text-[10px] font-bold ${pct > 90 ? 'text-rose-600' : pct > 70 ? 'text-amber-600' : 'text-blue-600'}`}>
                {pct.toFixed(0)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* Saldo badge */}
        {receita > 0 && (
          <div className="mt-3 flex justify-end">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
              saldo >= 0
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}>
              <TrendingUp size={10} />
              {saldo >= 0 ? '+' : ''}R$ {Math.abs(saldo) > 1000 ? (Math.abs(saldo) / 1000).toFixed(1) + 'K' : Math.abs(saldo).toLocaleString('pt-BR')}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
