import { useState, useEffect } from 'react'
import api from '../api/client'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const STATUS_LABEL = {
  pendente: 'Pendentes',
  confirmado: 'Confirmados',
  ignorado: 'Ignorados',
  expirado: 'Expirados',
}

export default function PendentesPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('pendente')

  useEffect(() => {
    setLoading(true)
    api
      .get('/comprovantes-pendentes', { params: { status } })
      .then(({ data }) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [status])

  const fmt = (v) =>
    (parseFloat(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
  const dt = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '-')
  const horas = (d) => {
    if (!d) return '-'
    const h = (Date.now() - new Date(d).getTime()) / 3600000
    if (h < 1) return Math.floor(h * 60) + ' min'
    if (h < 24) return Math.floor(h) + ' h'
    return Math.floor(h / 24) + ' d'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Comprovantes</h2>
      </div>

      <div className="flex gap-2 flex-wrap">
        {Object.entries(STATUS_LABEL).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setStatus(k)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              status === k
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-10">
          <div className="text-gray-500 text-center">
            Nenhum comprovante {status}.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((it) => {
            const d = it.dados || {}
            const isPdf = it.comprovante_url?.endsWith('.pdf')
            return (
              <Card key={it.id} className="overflow-hidden p-4">
                <div className="flex gap-3">
                  {it.comprovante_url && !isPdf && (
                    <img
                      src={it.comprovante_url}
                      alt=""
                      className="w-24 h-24 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                    />
                  )}
                  {isPdf && (
                    <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center text-3xl flex-shrink-0">
                      📄
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">
                      {it.evento_nome} · {horas(it.criado_em)} atras
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      R$ {fmt(d.valor)}
                    </div>
                    <div className="text-sm text-gray-700 truncate">
                      {d.descricao || 'Sem descricao'}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {d.fornecedor} · {d.centro_custo || 'Outros'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{it.remetente}</div>
                  </div>
                </div>
                {status === 'pendente' && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                    <a
                      href={`/comprovante/${it.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center rounded-lg py-2 text-sm font-medium"
                    >
                      Abrir para confirmar
                    </a>
                  </div>
                )}
                {status === 'confirmado' && it.confirmed_ref_id && (
                  <div className="mt-2 text-xs text-gray-500">
                    Registrado em {dt(it.confirmed_at)} como {it.confirmed_ref_type} #
                    {it.confirmed_ref_id}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
