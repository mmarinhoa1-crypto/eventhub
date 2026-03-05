import { useState, useEffect } from 'react'
import { BarChart3, Users, Package, ShoppingCart, Wine, MapPin } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'

export default function DashboardConsumo() {
  const [stats, setStats] = useState(null)
  const [analise, setAnalise] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [dashRes, analiseRes] = await Promise.all([
          api.get('/consumo/dashboard'),
          api.get('/consumo/analise'),
        ])
        setStats(dashRes.data)
        setAnalise(analiseRes.data)
      } catch (e) {
        toast.error('Erro ao carregar dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function filtrar(tipo) {
    setFiltroTipo(tipo)
    try {
      const { data } = await api.get(`/consumo/analise${tipo ? `?tipo=${tipo}` : ''}`)
      setAnalise(data)
    } catch {
      toast.error('Erro ao filtrar')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (!stats || stats.total_eventos === 0) {
    return (
      <div className="text-center py-20">
        <Wine size={48} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Nenhum dado de consumo ainda</h3>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Comece cadastrando seus produtos na aba "Produtos", crie setores e registre o consumo na aba "Registros".
        </p>
      </div>
    )
  }

  const cards = [
    { label: 'Eventos Analisados', value: stats.total_eventos, icon: BarChart3, color: 'bg-blue-100 text-blue-600' },
    { label: 'Produtos Cadastrados', value: stats.total_produtos, icon: Package, color: 'bg-green-100 text-green-600' },
    { label: 'Pedidos Gerados', value: stats.total_pedidos, icon: ShoppingCart, color: 'bg-violet-100 text-violet-600' },
    { label: 'Público Total', value: analise?.total_publico?.toLocaleString('pt-BR') || 0, icon: Users, color: 'bg-indigo-100 text-indigo-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${c.color}`}>
                <c.icon size={18} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Consumo por Tipo de Setor */}
      {stats.por_tipo?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <MapPin size={14} /> Consumo por Tipo de Setor
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats.por_tipo.map((t, i) => (
              <div key={i} className={`rounded-xl p-4 ${t.tipo === 'open' ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${t.tipo === 'open' ? 'text-green-700' : 'text-orange-700'}`}>
                    {t.tipo === 'open' ? 'Open Bar' : 'Bar Vendido'}
                  </span>
                  <span className="text-xs text-gray-500">{parseInt(t.total_publico).toLocaleString('pt-BR')} pessoas</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{parseFloat(t.total_consumo).toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500">itens consumidos no total</p>
                {parseInt(t.total_publico) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Média geral: {(parseFloat(t.total_consumo) / parseInt(t.total_publico)).toFixed(2)} itens/pessoa
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtro por tipo + Top 10 Produtos */}
      {stats.top_produtos?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Top 10 Produtos Mais Consumidos</h3>
          </div>
          <div className="space-y-3">
            {stats.top_produtos.map((p, i) => {
              const max = parseFloat(stats.top_produtos[0]?.total) || 1
              const pct = (parseFloat(p.total) / max) * 100
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{p.nome}</span>
                      <span className="text-sm font-semibold text-gray-900">{parseFloat(p.total).toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{p.categoria}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Consumo por Categoria */}
      {stats.por_categoria?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Consumo por Categoria</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.por_categoria.map((c, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{parseFloat(c.total).toLocaleString('pt-BR')}</p>
                <p className="text-xs font-medium text-gray-600">{c.categoria}</p>
                <p className="text-[10px] text-gray-400">{c.eventos} evento(s)</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Média por Pessoa com filtro de tipo */}
      {analise?.produtos?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Média de Consumo por Pessoa</h3>
            <div className="flex gap-1">
              {[
                { value: '', label: 'Todos' },
                { value: 'open', label: 'Open Bar' },
                { value: 'vendido', label: 'Bar Vendido' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => filtrar(f.value)}
                  className={`px-3 py-1 text-xs rounded-lg transition ${filtroTipo === f.value ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            {filtroTipo ? `Filtro: ${filtroTipo === 'open' ? 'Open Bar' : 'Bar Vendido'}` : 'Mostrando todos os setores'} |
            Público base: {analise.total_publico.toLocaleString('pt-BR')} | Eventos: {analise.total_eventos}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">Produto</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Categoria</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Total Consumido</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Média/Pessoa</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Eventos</th>
                </tr>
              </thead>
              <tbody>
                {analise.produtos.map(p => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-800">{p.nome}</td>
                    <td className="py-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{p.categoria}</span>
                    </td>
                    <td className="py-2 text-right text-gray-700">{p.total_consumido.toLocaleString('pt-BR')} {p.unidade}</td>
                    <td className="py-2 text-right font-semibold text-indigo-600">{p.media_por_pessoa.toFixed(2)}</td>
                    <td className="py-2 text-right text-gray-500">{p.eventos_com_registro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumo por Evento */}
      {stats.por_evento?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumo por Evento</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-gray-500 font-medium">Evento</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Data</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Público Total</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Itens Consumidos</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Produtos</th>
                </tr>
              </thead>
              <tbody>
                {stats.por_evento.map((ev, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2 font-medium text-gray-800">{ev.evento_nome}</td>
                    <td className="py-2 text-gray-600">{ev.data_evento || '-'}</td>
                    <td className="py-2 text-right text-gray-700">{parseInt(ev.publico_total)?.toLocaleString('pt-BR') || '-'}</td>
                    <td className="py-2 text-right text-gray-700">{parseFloat(ev.total_itens).toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right text-gray-500">{ev.produtos_distintos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
