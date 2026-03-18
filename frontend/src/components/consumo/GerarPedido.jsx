import { useState, useEffect } from 'react'
import { ShoppingCart, Trash2, Eye, Calculator, FileText, Plus, X } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const TIPOS_SETOR = [
  { value: 'open', label: 'Open Bar' },
  { value: 'vendido', label: 'Bar Vendido' },
]

export default function GerarPedido() {
  const [eventos, setEventos] = useState([])
  const [eventoId, setEventoId] = useState('')
  const [setoresPedido, setSetoresPedido] = useState([{ tipo: 'open', publico: '' }])
  const [margem, setMargem] = useState(30)
  const [nome, setNome] = useState('')
  const [gerando, setGerando] = useState(false)
  const [pedidoGerado, setPedidoGerado] = useState(null)
  const [pedidos, setPedidos] = useState([])
  const [pedidoDetalhe, setPedidoDetalhe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analise, setAnalise] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [evRes, pedRes, analRes] = await Promise.all([
          api.get('/eventos'),
          api.get('/consumo/pedidos'),
          api.get('/consumo/analise'),
        ])
        setEventos(evRes.data)
        setPedidos(pedRes.data)
        setAnalise(analRes.data)
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function addSetor() {
    setSetoresPedido(prev => [...prev, { tipo: 'open', publico: '' }])
  }

  function removeSetor(index) {
    setSetoresPedido(prev => prev.filter((_, i) => i !== index))
  }

  function updateSetor(index, field, value) {
    setSetoresPedido(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const publicoTotal = setoresPedido.reduce((s, st) => s + (parseInt(st.publico) || 0), 0)

  async function gerar() {
    if (publicoTotal <= 0) return toast.error('Informe o público estimado de pelo menos um setor')
    if (!analise || analise.total_eventos === 0) return toast.error('Registre consumo de eventos anteriores primeiro')

    const setoresValidos = setoresPedido.filter(s => parseInt(s.publico) > 0)
    if (setoresValidos.length === 0) return toast.error('Informe o público de pelo menos um setor')

    setGerando(true)
    try {
      const { data } = await api.post('/consumo/pedidos/gerar', {
        id_evento: eventoId ? parseInt(eventoId) : null,
        setores_pedido: setoresValidos.map(s => ({ tipo: s.tipo, publico: parseInt(s.publico) })),
        margem_seguranca: 1 + (margem / 100),
        nome: nome || `Pedido ${new Date().toLocaleDateString('pt-BR')}`,
      })
      setPedidoGerado(data)
      toast.success('Pedido gerado com sucesso!')
      const { data: pedList } = await api.get('/consumo/pedidos')
      setPedidos(pedList)
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao gerar pedido')
    } finally {
      setGerando(false)
    }
  }

  async function verPedido(id) {
    try {
      const { data } = await api.get(`/consumo/pedidos/${id}`)
      setPedidoDetalhe(data)
    } catch {
      toast.error('Erro ao carregar pedido')
    }
  }

  async function excluirPedido(id) {
    if (!confirm('Excluir este pedido?')) return
    try {
      await api.delete(`/consumo/pedidos/${id}`)
      setPedidos(prev => prev.filter(p => p.id !== id))
      if (pedidoDetalhe?.id === id) setPedidoDetalhe(null)
      toast.success('Pedido excluído')
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  function agruparPorCategoria(itens) {
    const grupos = {}
    itens.forEach(item => {
      const cat = item.categoria || 'Outros'
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(item)
    })
    return grupos
  }

  function renderItens(itens) {
    const grupos = agruparPorCategoria(itens)
    return Object.entries(grupos).map(([cat, items]) => {
      const totalCat = items.reduce((s, i) => s + parseFloat(i.quantidade_manual || i.quantidade_final), 0)
      return (
        <div key={cat} className="mb-4">
          <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg mb-2">
            <span className="text-sm font-semibold text-gray-700">{cat}</span>
            <span className="text-xs text-gray-500">{Math.ceil(totalCat).toLocaleString('pt-BR')} itens</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-xs">
                <th className="text-left py-1 px-2">Produto</th>
                <th className="text-right py-1 px-2">Média/Pessoa</th>
                <th className="text-right py-1 px-2">Qtd Base</th>
                <th className="text-right py-1 px-2 font-semibold text-gray-600">Qtd Final (+margem)</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="py-1.5 px-2 text-gray-700">{item.produto_nome}</td>
                  <td className="py-1.5 px-2 text-right text-gray-500">{parseFloat(item.media_por_pessoa).toFixed(2)}</td>
                  <td className="py-1.5 px-2 text-right text-gray-500">{parseFloat(item.quantidade_base).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                  <td className="py-1.5 px-2 text-right font-semibold text-indigo-600 dark:text-indigo-400">
                    {Math.ceil(parseFloat(item.quantidade_manual || item.quantidade_final)).toLocaleString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Formulário de geração */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Gerar Pedido Automático</h3>

        {analise && analise.total_eventos > 0 && (
          <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 mb-4 text-xs text-blue-700 dark:text-blue-400">
            <Calculator size={14} className="inline mr-1" />
            Base de cálculo: <strong>{analise.total_eventos} evento(s)</strong> analisados.
            O sistema calcula a média de consumo por pessoa <strong>separadamente</strong> para setores Open Bar e Bar Vendido.
            Fórmula: <code className="bg-blue-100 dark:bg-blue-500/20 px-1 rounded">média/pessoa(tipo) × público(tipo) × margem</code>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome do Pedido</label>
            <input
              placeholder="Ex: Pedido Festival Junho"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Evento (opcional)</label>
            <select
              value={eventoId}
              onChange={e => setEventoId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Nenhum evento específico</option>
              {eventos.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Margem de Segurança: {margem}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={margem}
              onChange={e => setMargem(parseInt(e.target.value))}
              className="w-full accent-indigo-600 mt-1"
            />
          </div>
        </div>

        {/* Setores do pedido */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-medium text-gray-600">Setores do Novo Evento</label>
            <button
              onClick={addSetor}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
            >
              <Plus size={12} /> Adicionar Setor
            </button>
          </div>
          <div className="space-y-2">
            {setoresPedido.map((setor, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                <select
                  value={setor.tipo}
                  onChange={e => updateSetor(idx, 'tipo', e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {TIPOS_SETOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  type="number"
                  placeholder="Público estimado"
                  value={setor.publico}
                  onChange={e => updateSetor(idx, 'publico', e.target.value)}
                  className="w-40 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-xs text-gray-400">pessoas</span>
                {setoresPedido.length > 1 && (
                  <button onClick={() => removeSetor(idx)} className="p-1 text-gray-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          {publicoTotal > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Público total: <strong>{publicoTotal.toLocaleString('pt-BR')}</strong> pessoas
            </p>
          )}
        </div>

        <button
          onClick={gerar}
          disabled={gerando}
          className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition disabled:opacity-50"
        >
          <ShoppingCart size={16} /> {gerando ? 'Gerando...' : 'Gerar Pedido'}
        </button>
      </div>

      {/* Pedido gerado */}
      {pedidoGerado && (
        <div className="bg-white rounded-xl border border-green-200 dark:border-green-500/30 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-green-100 dark:bg-green-500/20 rounded-lg">
              <FileText size={16} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700">Pedido Gerado: {pedidoGerado.pedido.nome || 'Sem nome'}</h3>
              <p className="text-xs text-gray-400">
                Público: {pedidoGerado.pedido.publico_estimado?.toLocaleString('pt-BR')} |
                Margem: {((parseFloat(pedidoGerado.pedido.margem_seguranca) - 1) * 100).toFixed(0)}% |
                {pedidoGerado.itens.length} produtos
              </p>
            </div>
          </div>

          {/* Detalhes por tipo de setor */}
          {pedidoGerado.detalhes_setores && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              {Object.entries(pedidoGerado.detalhes_setores).map(([tipo, info]) => (
                <div key={tipo} className={`rounded-lg p-3 text-sm ${tipo === 'open' ? 'bg-green-50 dark:bg-green-500/10' : 'bg-orange-50 dark:bg-orange-500/10'}`}>
                  <span className={`font-semibold ${tipo === 'open' ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                    {tipo === 'open' ? 'Open Bar' : 'Bar Vendido'}
                  </span>
                  <span className="text-gray-500 ml-2">{info.publico_estimado.toLocaleString('pt-BR')} pessoas</span>
                  <span className="text-gray-400 ml-1 text-xs">(base histórica: {info.total_publico_historico.toLocaleString('pt-BR')})</span>
                </div>
              ))}
            </div>
          )}

          {renderItens(pedidoGerado.itens)}
        </div>
      )}

      {/* Detalhe do pedido selecionado */}
      {pedidoDetalhe && !pedidoGerado && (
        <div className="bg-white rounded-xl border border-blue-200 dark:border-blue-500/30 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-500/20 rounded-lg">
                <FileText size={16} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700">{pedidoDetalhe.nome || 'Pedido #' + pedidoDetalhe.id}</h3>
                <p className="text-xs text-gray-400">
                  Público: {pedidoDetalhe.publico_estimado?.toLocaleString('pt-BR')} | Margem: {((parseFloat(pedidoDetalhe.margem_seguranca) - 1) * 100).toFixed(0)}%
                  {pedidoDetalhe.evento_nome && ` | Evento: ${pedidoDetalhe.evento_nome}`}
                </p>
              </div>
            </div>
            <button onClick={() => setPedidoDetalhe(null)} className="text-xs text-gray-400 hover:text-gray-600">Fechar</button>
          </div>
          {pedidoDetalhe.itens && renderItens(pedidoDetalhe.itens)}
        </div>
      )}

      {/* Lista de pedidos anteriores */}
      {pedidos.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Pedidos Anteriores</h3>
          <div className="space-y-2">
            {pedidos.map(p => (
              <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 hover:bg-gray-50 transition">
                <div>
                  <span className="text-sm font-medium text-gray-800">{p.nome || `Pedido #${p.id}`}</span>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-400">Público: {p.publico_estimado?.toLocaleString('pt-BR')}</span>
                    <span className="text-xs text-gray-400">{p.total_itens} produtos</span>
                    {p.evento_nome && <span className="text-xs text-blue-500">{p.evento_nome}</span>}
                    <span className="text-xs text-gray-400">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => { setPedidoGerado(null); verPedido(p.id) }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => excluirPedido(p.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
