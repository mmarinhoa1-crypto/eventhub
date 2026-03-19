import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Download, Pencil, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, DollarSign, Wallet, PiggyBank, Megaphone, Users, Receipt, CreditCard, RefreshCw, Calendar, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import EditEventoModal from './EditEventoModal'
import api from '../../api/client'
import Card from '../ui/Card'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import DespesasList from './DespesasList'
import toast from 'react-hot-toast'

const COLORS = ['#2563eb', '#3b82f6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#84CC16']
const fmt = v => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtK = v => {
  if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M'
  if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(1) + 'K'
  return 'R$ ' + Number(v || 0).toFixed(0)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null
  return (
    <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>)}
    </div>
  )
}

export default function EventoDetalhe({ eventoId }) {
  const navigate = useNavigate()
  const [evento, setEvento] = useState(null)
  const [despesas, setDespesas] = useState([])
  const [fornecedores, setFornecedores] = useState([])
  const [dashData, setDashData] = useState(null)
  const [briefings, setBriefings] = useState([])
  const [cronograma, setCronograma] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get(`/eventos/${eventoId}`),
      api.get(`/eventos/${eventoId}/despesas`),
      api.get(`/eventos/${eventoId}/fornecedores`),
      api.get(`/eventos/${eventoId}/dashboard-financeiro`),
      api.get(`/eventos/${eventoId}/briefings`).catch(() => ({ data: [] })),
      api.get(`/eventos/${eventoId}/cronograma`).catch(() => ({ data: [] })),
    ])
      .then(([evRes, despRes, fornRes, dashRes, briefRes, cronoRes]) => {
        setEvento(evRes.data)
        setDespesas(despRes.data)
        setFornecedores(fornRes.data)
        setDashData(dashRes.data)
        setBriefings(briefRes.data)
        setCronograma(cronoRes.data)
      })
      .catch(() => toast.error('Erro ao carregar evento'))
      .finally(() => setLoading(false))
  }, [eventoId])

  function atualizarCategoria(id, novaCat) {
    setDespesas(prev => prev.map(d => d.id === id ? { ...d, centro_custo: novaCat } : d))
  }

  async function reloadEvento() {
    const { data } = await api.get('/eventos/' + eventoId)
    setEvento(data)
  }

  async function exportarCSV() {
    try {
      const response = await api.get(`/eventos/${eventoId}/exportar`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `despesas-evento-${eventoId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao exportar')
    }
  }

  async function syncBaladapp() {
    setSyncing(true)
    try {
      await api.post('/eventos/' + eventoId + '/baladapp/sync')
      toast.success('Sincronizado!')
      const { data } = await api.get(`/eventos/${eventoId}/dashboard-financeiro`)
      setDashData(data)
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  async function atualizarFornecedor(id, dados) {
    try {
      await api.patch(`/fornecedores/${id}`, dados)
      const { data } = await api.get(`/eventos/${eventoId}/fornecedores`)
      setFornecedores(data)
      toast.success('Fornecedor atualizado')
    } catch {
      toast.error('Erro ao atualizar fornecedor')
    }
  }

  async function removerFornecedor(id) {
    try {
      await api.delete(`/fornecedores/${id}`)
      setFornecedores(prev => prev.filter(f => f.id !== id))
      toast.success('Fornecedor removido')
    } catch {
      toast.error('Erro ao remover fornecedor')
    }
  }

  async function adicionarFornecedor(dados) {
    try {
      await api.post(`/eventos/${eventoId}/fornecedores`, dados)
      const { data } = await api.get(`/eventos/${eventoId}/fornecedores`)
      setFornecedores(data)
      toast.success('Fornecedor adicionado')
    } catch {
      toast.error('Erro ao adicionar fornecedor')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!evento) {
    return <p className="text-gray-500">Evento não encontrado</p>
  }

  const orcamento = Number(evento.orcamento) || 0
  const gasto = Number(evento.total) || 0
  const pct = orcamento > 0 ? ((gasto / orcamento) * 100).toFixed(1) : '0.0'

  // Dados para gráficos
  const despCatData = dashData ? (dashData.despesas_por_categoria || []).map((d, i) => ({ ...d, total: parseFloat(d.total), fill: COLORS[i % COLORS.length] })) : []
  const recCatData = dashData ? (dashData.receitas_por_categoria || []).map((d, i) => ({ ...d, total: parseFloat(d.total), fill: COLORS[i % COLORS.length] })) : []
  const despDiaData = dashData ? (dashData.despesas_por_dia || []).map(d => ({ ...d, total: parseFloat(d.total), dia: d.dia ? new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '?' })) : []
  const vendasDiaData = dashData ? (dashData.vendas_por_dia || []).map(d => ({ ...d, total: parseFloat(d.total), qtd: parseInt(d.qtd), dia: d.dia ? new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '?' })) : []

  const diasMap = {}
  despDiaData.forEach(d => { if (!diasMap[d.dia]) diasMap[d.dia] = { dia: d.dia, despesas: 0, receitas: 0 }; diasMap[d.dia].despesas = d.total })
  vendasDiaData.forEach(d => { if (!diasMap[d.dia]) diasMap[d.dia] = { dia: d.dia, despesas: 0, receitas: 0 }; diasMap[d.dia].receitas = d.total })
  const fluxoCaixa = Object.values(diasMap).sort((a, b) => a.dia.localeCompare(b.dia))

  // Resumo fornecedores
  const fornTotal = fornecedores.reduce((s, f) => s + (Number(f.valor) || 0), 0)
  const fornPagos = fornecedores.filter(f => f.pago).length

  // Resumo marketing
  const briefingsPendentes = briefings.filter(b => b.status === 'pendente').length
  const briefingsAndamento = briefings.filter(b => b.status === 'em_andamento').length
  const briefingsAprovados = briefings.filter(b => b.status === 'aprovado' || b.status === 'publicado').length
  const proximosPosts = cronograma.filter(c => {
    if (!c.data_publicacao) return false
    return new Date(c.data_publicacao) >= new Date()
  }).sort((a, b) => new Date(a.data_publicacao) - new Date(b.data_publicacao)).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{evento.nome}</h2>
              <button onClick={() => setShowEdit(true)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors" title="Editar evento">
                <Pencil size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-6 mt-2 text-sm">
              <span className="text-gray-500">
                Orçamento: <span className="font-medium text-gray-900">R$ {orcamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="text-gray-500">
                Gasto: <span className={`font-medium ${Number(pct) > 90 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white/90'}`}>R$ {gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </span>
              <span className="text-gray-500">
                Utilizado: <span className="font-medium text-gray-900">{pct}%</span>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {dashData?.baladapp_id && (
              <button onClick={syncBaladapp} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-all shadow-lg shadow-accent/20">
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sincronizando...' : 'Sync BaladaAPP'}
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* KPIs Financeiros */}
      {dashData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard icon={<TrendingUp size={20} />} label="Receitas" value={fmt(dashData.total_receitas)} color="emerald" sub={dashData.total_pendente > 0 ? fmt(dashData.total_pendente) + ' pendente' : null} />
          <KPICard icon={<TrendingDown size={20} />} label="Despesas" value={fmt(dashData.total_despesas)} color="rose" />
          <KPICard
            icon={dashData.lucro >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
            label={dashData.lucro >= 0 ? 'Lucro' : 'Prejuizo'}
            value={fmt(Math.abs(dashData.lucro))}
            color={dashData.lucro >= 0 ? 'indigo' : 'rose'}
            sub={'Margem: ' + dashData.margem + '%'}
          />
          <KPICard icon={<Wallet size={20} />} label="Recebido" value={fmt(dashData.total_recebido)} color="violet" />
          <KPICard
            icon={<PiggyBank size={20} />}
            label="Saldo"
            value={fmt(dashData.total_recebido - dashData.total_despesas)}
            color={dashData.total_recebido - dashData.total_despesas >= 0 ? 'emerald' : 'rose'}
          />
        </div>
      )}

      {/* Barra de progresso orçamento */}
      {dashData && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">Despesas vs Receitas</span>
            <span className="font-medium text-gray-700">{dashData.total_receitas > 0 ? ((dashData.total_despesas / dashData.total_receitas) * 100).toFixed(0) : 0}% comprometido</span>
          </div>
          <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: Math.min((dashData.total_despesas / Math.max(dashData.total_receitas, 1)) * 100, 100) + '%', background: dashData.total_despesas > dashData.total_receitas ? 'linear-gradient(90deg,#EF4444,#DC2626)' : 'linear-gradient(90deg,#2563eb,#3b82f6)' }} />
          </div>
        </div>
      )}

      {/* Gráficos Financeiros */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vendasDiaData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Receipt size={16} className="text-blue-500" /> Vendas por Dia</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={vendasDiaData}>
                <defs>
                  <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" name="Vendas" stroke="#2563eb" fill="url(#gradVendas)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {fluxoCaixa.length > 1 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign size={16} className="text-emerald-500" /> Fluxo de Caixa</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={fluxoCaixa}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 11 }} stroke="#9ca3af" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {despCatData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-red-500" /> Despesas por Categoria</h3>
            <div className="flex gap-4">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={despCatData} dataKey="total" nameKey="categoria" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {despCatData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5 overflow-y-auto" style={{ maxHeight: 200 }}>
                {despCatData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-gray-600 truncate" style={{ maxWidth: 100 }}>{d.categoria || 'Outros'}</span>
                    </div>
                    <span className="font-medium text-gray-800">{fmt(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {recCatData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign size={16} className="text-emerald-500" /> Receitas por Categoria</h3>
            <div className="flex gap-4">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={recCatData} dataKey="total" nameKey="categoria" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {recCatData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                    </Pie>
                    <Tooltip formatter={v => fmt(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5 overflow-y-auto" style={{ maxHeight: 200 }}>
                {recCatData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span className="text-gray-600 truncate" style={{ maxWidth: 100 }}>{d.categoria || 'Outros'}</span>
                    </div>
                    <span className="font-medium text-gray-800">{fmt(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumo por Conta */}
      {dashData?.contas?.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><PiggyBank size={16} className="text-blue-500" /> Resumo por Conta</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-5 py-3 text-left">Conta</th>
                <th className="px-5 py-3 text-right">%</th>
                <th className="px-5 py-3 text-right">Parte Lucro</th>
              </tr>
            </thead>
            <tbody>
              {dashData.contas.map((c, i) => {
                const pctConta = parseFloat(c.percentual) || 0
                const parte = (dashData.lucro * pctConta) / 100
                return (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{c.nome} <span className="text-gray-400 text-xs ml-1">{c.titular}</span></td>
                    <td className="px-5 py-3 text-right text-gray-600">{pctConta}%</td>
                    <td className={'px-5 py-3 text-right font-bold ' + (parte >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>{fmt(Math.abs(parte))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cards Resumo: Fornecedores + Marketing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resumo Fornecedores */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Users size={16} className="text-blue-500" /> Fornecedores</h3>
            <span className="text-xs text-gray-500">{fornecedores.length} total</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-gray-50">
              <p className="text-lg font-bold text-gray-900">{fornecedores.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fornPagos}</p>
              <p className="text-xs text-gray-500">Pagos</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{fmt(fornTotal)}</p>
              <p className="text-xs text-gray-500">Valor Total</p>
            </div>
          </div>
          {fornecedores.length > 0 && (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {fornecedores.slice(0, 5).map(f => (
                <div key={f.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${f.pago ? 'bg-emerald-500' : 'bg-yellow-400'}`} />
                    <span className="text-gray-700 font-medium">{f.nome}</span>
                  </div>
                  <span className="text-gray-600">{f.valor ? fmt(f.valor) : '-'}</span>
                </div>
              ))}
              {fornecedores.length > 5 && (
                <p className="text-xs text-gray-400 text-center pt-1">+{fornecedores.length - 5} mais</p>
              )}
            </div>
          )}
        </div>

        {/* Resumo Marketing */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><Megaphone size={16} className="text-blue-500" /> Marketing</h3>
            <button
              onClick={() => navigate(`/marketing?evento=${eventoId}&tab=eventos`)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-violet-800 font-medium"
            >
              Ver completo <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center p-3 rounded-xl bg-yellow-50 dark:bg-yellow-500/10">
              <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400">{briefingsPendentes}</p>
              <p className="text-xs text-gray-500">Pendentes</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-500/10">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{briefingsAndamento}</p>
              <p className="text-xs text-gray-500">Em Produção</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{briefingsAprovados}</p>
              <p className="text-xs text-gray-500">Aprovados</p>
            </div>
          </div>
          {proximosPosts.length > 0 ? (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Próximos Posts</p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {proximosPosts.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                    <div className="flex items-center gap-2">
                      <Calendar size={12} className="text-gray-400" />
                      <span className="text-gray-700 font-medium truncate" style={{ maxWidth: 150 }}>{p.titulo}</span>
                    </div>
                    <span className="text-gray-500">{p.data_publicacao ? new Date(p.data_publicacao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-3">Nenhum post agendado</p>
          )}
        </div>
      </div>

      {/* Links Rápidos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/financeiro')}
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"><DollarSign size={20} /></div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 text-sm">Financeiro Completo</p>
              <p className="text-xs text-gray-500">Planilha, contas e encontro de contas</p>
            </div>
          </div>
          <ArrowUpRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
        </button>
        <button
          onClick={() => navigate(`/marketing?evento=${eventoId}&tab=eventos`)}
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-violet-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-50 dark:bg-violet-500/20 text-blue-600 dark:text-blue-400"><Megaphone size={20} /></div>
            <div className="text-left">
              <p className="font-semibold text-gray-900 text-sm">Marketing Completo</p>
              <p className="text-xs text-gray-500">Cronograma, briefings, tráfego e campanhas IA</p>
            </div>
          </div>
          <ArrowUpRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors" />
        </button>
      </div>

      {/* Despesas */}
      <Card>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Receipt size={18} className="text-gray-400" />
            Despesas ({despesas.length})
          </h3>
          <Button variant="secondary" size="sm" onClick={exportarCSV}>
            <Download size={16} />
            Exportar CSV
          </Button>
        </div>
        <DespesasList despesas={despesas} onUpdate={atualizarCategoria} />
      </Card>

      {/* Fornecedores */}
      <FornecedoresSection
        fornecedores={fornecedores}
        onAdd={adicionarFornecedor}
        onUpdate={atualizarFornecedor}
        onRemove={removerFornecedor}
      />

      {showEdit && (
        <EditEventoModal
          open={showEdit}
          onClose={() => setShowEdit(false)}
          evento={evento}
          onUpdated={reloadEvento}
        />
      )}
    </div>
  )
}

function KPICard({ icon, label, value, color, sub }) {
  const colors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/25',
    rose: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/25',
    indigo: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/25',
    violet: 'bg-violet-50 dark:bg-violet-500/10 text-blue-600 dark:text-blue-400 border-violet-100 dark:border-violet-500/25',
  }
  const iconColors = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    rose: 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400',
    indigo: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    violet: 'bg-violet-100 dark:bg-violet-500/20 text-blue-600 dark:text-blue-400',
  }
  return (
    <div className={`rounded-2xl p-4 border shadow-sm hover:shadow-md transition-all duration-300 ${colors[color] || colors.indigo}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${iconColors[color] || iconColors.indigo}`}>{icon}</div>
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-lg font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

function FornecedoresSection({ fornecedores, onAdd, onUpdate, onRemove }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', categoria: '', valor: '', status: 'pendente' })

  function handleSubmit(e) {
    e.preventDefault()
    onAdd({ ...form, valor: form.valor ? Number(form.valor) : null })
    setForm({ nome: '', categoria: '', valor: '', status: 'pendente' })
    setShowForm(false)
  }

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Users size={18} className="text-gray-400" />
          Fornecedores ({fornecedores.length})
        </h3>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Adicionar'}
        </Button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input placeholder="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            <input placeholder="Categoria" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            <input placeholder="Valor" type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
            <Button type="submit" size="sm">Salvar</Button>
          </div>
        </form>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Categoria</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Valor</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Status</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Pago</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Nenhum fornecedor</td></tr>
            ) : (
              fornecedores.map((f) => (
                <tr key={f.id} className="border-b border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">{f.nome}</td>
                  <td className="px-4 py-3 text-gray-600">{f.categoria || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{f.valor ? `R$ ${Number(f.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{f.status || '-'}</td>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={f.pago || false} onChange={() => onUpdate(f.id, { pago: !f.pago })} className="h-4 w-4 text-blue-600 rounded border-gray-300" />
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => onRemove(f.id)} className="text-red-500 hover:text-red-700 text-xs font-medium">Remover</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
