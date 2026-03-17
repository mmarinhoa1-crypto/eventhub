import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Calendar, TrendingUp, TrendingDown, ChevronRight, Search, MapPin, Image, ArrowUpRight } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'

function fmt(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function fmtK(v) { return v >= 1000000 ? 'R$ ' + (v / 1000000).toFixed(2) + 'M' : v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1) + 'K' : fmt(v) }

const statusStyle = {
  pendente:    { dot: 'bg-yellow-400', label: 'Pendente',  pill: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  rascunho:    { dot: 'bg-yellow-400', label: 'Rascunho',  pill: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  em_producao: { dot: 'bg-blue-400',   label: 'Produção',  pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  producao:    { dot: 'bg-blue-400',   label: 'Produção',  pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  aprovado:    { dot: 'bg-green-400',  label: 'Aprovado',  pill: 'bg-green-50 text-green-700 border-green-200' },
  pronto:      { dot: 'bg-green-400',  label: 'Pronto',    pill: 'bg-green-50 text-green-700 border-green-200' },
  publicado:   { dot: 'bg-purple-400', label: 'Publicado', pill: 'bg-purple-50 text-purple-700 border-purple-200' },
}

const COLORS_REC  = ['#2563eb', '#10b981', '#f59e0b', '#ef4444']
const COLORS_DESP = ['#ef4444', '#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-gray-100 dark:border-white/10 px-3 py-2">
      <p className="text-xs font-bold text-gray-800 dark:text-white/90">{payload[0].name}</p>
      <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">{fmtK(payload[0].value)}</p>
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, sub, color, onClick }) {
  const colors = {
    blue:   { icon: 'bg-blue-50 text-blue-500',   value: 'text-blue-600',   border: 'border-blue-100 hover:border-blue-200' },
    green:  { icon: 'bg-green-50 text-green-500',  value: 'text-green-600',  border: 'border-green-100 hover:border-green-200' },
    red:    { icon: 'bg-red-50 text-red-500',      value: 'text-red-500',    border: 'border-red-100 hover:border-red-200' },
    yellow: { icon: 'bg-yellow-50 text-yellow-500',value: 'text-yellow-600', border: 'border-yellow-100 hover:border-yellow-200' },
  }
  const c = colors[color]
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl p-5 border ${c.border} transition-all duration-200 ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.icon}`}>
          <Icon size={17} />
        </div>
        {onClick && <ArrowUpRight size={15} className="text-gray-300" />}
      </div>
      <p className={`text-2xl font-extrabold ${c.value}`}>{value}</p>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-1">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function DonutChart({ title, data, colors }) {
  const total = data.reduce((s, x) => s + x.total, 0)
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">{title}</p>
      {data.length === 0 ? (
        <div className="flex-1 flex items-center justify-center py-10 text-xs text-gray-300">Sem dados</div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0" style={{ width: 110, height: 110 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.map(r => ({ name: r.centro, value: r.total }))}
                  cx="50%" cy="50%"
                  innerRadius={30} outerRadius={48}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((_item, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 min-w-0">
            {data.slice(0, 5).map((r, i) => {
              const pct = total > 0 ? ((r.total / total) * 100).toFixed(0) : 0
              return (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="text-xs text-gray-600 truncate flex-1 min-w-0">{r.centro}</span>
                  <span className="text-xs font-bold text-gray-400 flex-shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData]         = useState(null)
  const [chamados, setChamados] = useState([])
  const [demandas, setDemandas] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [showTodos, setShowTodos]   = useState(false)
  const [busca, setBusca]           = useState('')
  const [selectedPost, setSelectedPost]   = useState(null)
  const [postArquivos, setPostArquivos]   = useState([])
  const [loadingArqs, setLoadingArqs]     = useState(false)
  const navigate  = useNavigate()
  const { usuario } = useAuth()
  const isAdmin = usuario?.funcao === 'admin' || usuario?.funcao === 'diretor'

  useEffect(() => {
    const p = [api.get('/dashboard'), api.get('/chamados')]
    if (isAdmin) p.push(api.get('/minhas-demandas'))
    Promise.all(p)
      .then(([d, c, dem]) => {
        setData(d.data)
        setChamados(Array.isArray(c.data) ? c.data : [])
        if (dem) setDemandas(dem.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-32"><LoadingSpinner size="lg" /></div>
  if (!data)   return <div className="text-center py-32 text-gray-400">Erro ao carregar dashboard</div>

  const percentPago      = data.total_despesas > 0 ? (data.despesas_pagas / data.total_despesas) * 100 : 0
  const percentRecebido  = data.total_receitas > 0 ? (data.receitas_recebidas / data.total_receitas) * 100 : 0
  const proximo          = data.eventos?.[0] || null
  const outrosEventos    = data.eventos ? data.eventos.slice(1) : []
  const eventosFiltrados = outrosEventos.filter(ev =>
    ev.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    ev.cidade?.toLowerCase().includes(busca.toLowerCase())
  )

  const postsHoje = (demandas?.posts || []).filter(p => {
    const hj = new Date().toISOString().split('T')[0]
    return p.data_publicacao === hj
  })

  const recCentro  = data.receitas_por_centro  || []
  const despCentro = data.despesas_por_centro  || []

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const nomeFirst = usuario?.nome?.split(' ')[0] || 'você'

  function selectPost(post) {
    if (selectedPost?.id === post.id) { setSelectedPost(null); setPostArquivos([]); return }
    setSelectedPost(post)
    setPostArquivos([])
    setLoadingArqs(true)
    api.get('/cronograma/' + post.id + '/arquivos')
      .then(r => setPostArquivos(Array.isArray(r.data) ? r.data : []))
      .catch(() => setPostArquivos([]))
      .finally(() => setLoadingArqs(false))
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Saudação ─────────────────────────────── */}
      <div className="flex items-end justify-between pt-2">
        <div>
          <p className="text-sm font-medium text-gray-400">{saudacao},</p>
          <h1 className="text-2xl font-extrabold text-gray-900">{nomeFirst} 👋</h1>
        </div>
        <p className="text-xs text-gray-400 hidden sm:block">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* ── Hero — Saldo Geral ───────────────────── */}
      <div
        className="rounded-2xl p-6 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 60%, #3b82f6 100%)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -bottom-8 left-16 w-28 h-28 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />

        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest text-white/50 mb-1">Resultado Geral</p>
          <div className="flex items-center gap-3 mb-6">
            <p className="text-4xl font-extrabold">{fmt(data.saldo)}</p>
            <span className={`px-3 py-1 rounded-full text-xs font-extrabold ${data.saldo >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
              {data.saldo >= 0 ? '▲ Positivo' : '▼ Negativo'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Receitas */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.09)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Receitas</p>
              <p className="text-xl font-extrabold">{fmtK(data.total_receitas)}</p>
              <div className="mt-3 mb-1 h-1.5 rounded-full overflow-hidden bg-white/15">
                <div className="h-full rounded-full bg-green-400 transition-all" style={{ width: percentRecebido + '%' }} />
              </div>
              <p className="text-[10px] text-white/40">{percentRecebido.toFixed(0)}% recebido</p>
            </div>

            {/* Despesas */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.09)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Despesas</p>
              <p className="text-xl font-extrabold">{fmtK(data.total_despesas)}</p>
              <div className="mt-3 mb-1 h-1.5 rounded-full overflow-hidden bg-white/15">
                <div className="h-full rounded-full bg-yellow-400 transition-all" style={{ width: percentPago + '%' }} />
              </div>
              <p className="text-[10px] text-white/40">{percentPago.toFixed(0)}% pago</p>
            </div>

            {/* Pago */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.18)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Pago</p>
              <p className="text-xl font-extrabold">{fmtK(data.despesas_pagas)}</p>
              <p className="text-[10px] text-white/30 mt-3">{data.qtd_despesas} despesas</p>
            </div>

            {/* Pendente */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.15)' }}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">A Pagar</p>
              <p className="text-xl font-extrabold">{fmtK(data.despesas_pendentes)}</p>
              <p className="text-[10px] text-white/30 mt-3">pendente</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPIs ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Calendar}     label="Eventos"    value={data.total_eventos}          sub="cadastrados"           color="blue"   onClick={() => navigate('/eventos')} />
        <KpiCard icon={TrendingUp}   label="Recebido"   value={fmtK(data.receitas_recebidas)} sub={`de ${fmtK(data.total_receitas)}`} color="green" />
        <KpiCard icon={TrendingDown} label="A Pagar"    value={fmtK(data.despesas_pendentes)} sub="pendente"             color="red" />
        <KpiCard icon={MessageSquare} label="Chamados"  value={data.chamados_total}          sub={`${data.chamados_novos} novos`} color="yellow" onClick={() => navigate('/chamados')} />
      </div>

      {/* ── Gráficos + Posts Hoje ─────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Posts hoje */}
        <div className="bg-white rounded-2xl border-2 border-blue-100 overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-blue-50 flex items-center justify-between bg-blue-50/60">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Hoje</p>
              <p className="text-base font-extrabold text-blue-700">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            {postsHoje.length > 0 && (
              <span className="text-xs font-extrabold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full">
                {postsHoje.length} post{postsHoje.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex-1 p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 220 }}>
            {postsHoje.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-8 text-center">
                <Calendar size={24} className="text-gray-200 mb-2" />
                <p className="text-xs text-gray-400">Nenhum post hoje</p>
              </div>
            ) : postsHoje.map(post => {
              const st = statusStyle[post.status] || statusStyle.pendente
              const isSel = selectedPost?.id === post.id
              return (
                <div
                  key={post.id}
                  onClick={() => selectPost(post)}
                  className={`rounded-xl p-3 cursor-pointer border transition-all ${
                    isSel ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' : 'bg-gray-50 border-gray-100 hover:border-gray-200 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`} />
                    <span className="text-xs font-bold text-gray-800 truncate">{post.titulo || 'Post'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {post.hora_publicacao && <span className="text-[10px] text-gray-400">{post.hora_publicacao}</span>}
                    {post.plataforma && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{post.plataforma}</span>}
                  </div>
                  {post.evento_nome && <p className="text-[10px] text-blue-500 font-semibold mt-1 truncate">{post.evento_nome}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Donut Receitas */}
        <DonutChart title="Receitas por Origem" data={recCentro} colors={COLORS_REC} />

        {/* Donut Despesas */}
        <DonutChart title="Despesas por Centro" data={despCentro} colors={COLORS_DESP} />
      </div>

      {/* Detail panel do post selecionado */}
      {selectedPost && (
        <div className="bg-white rounded-2xl border border-blue-100 shadow-lg overflow-hidden animate-fadeIn">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${(statusStyle[selectedPost.status] || statusStyle.pendente).dot}`} />
              <h3 className="text-sm font-extrabold text-gray-900">{selectedPost.titulo || 'Sem título'}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${(statusStyle[selectedPost.status] || statusStyle.pendente).pill}`}>
                {(statusStyle[selectedPost.status] || statusStyle.pendente).label}
              </span>
            </div>
            <button
              onClick={() => { setSelectedPost(null); setPostArquivos([]) }}
              className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold transition"
            >×</button>
          </div>
          <div className="p-5 flex gap-5">
            {/* Mídia */}
            <div className="flex-shrink-0 w-40">
              {loadingArqs && <div className="w-full h-36 bg-gray-50 rounded-xl flex items-center justify-center"><span className="text-xs text-gray-400">Carregando...</span></div>}
              {!loadingArqs && postArquivos.length === 0 && (
                <div className="w-full h-36 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-1">
                  <Image size={22} className="text-gray-300" />
                  <span className="text-xs text-gray-400">Sem mídia</span>
                </div>
              )}
              {!loadingArqs && postArquivos.map(arq => {
                const isImg = arq.tipo?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(arq.nome_original || '')
                const isVideo = arq.tipo?.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(arq.nome_original || '')
                const fileUrl = arq.url?.startsWith('http') ? arq.url : '/api' + (arq.url?.startsWith('/') ? arq.url : '/uploads/' + (arq.nome_arquivo || arq.url))
                return (
                  <div key={arq.id} className="rounded-xl overflow-hidden border border-gray-100 mb-2">
                    {isImg && <img src={fileUrl} alt={arq.nome_original} className="w-full object-cover cursor-pointer hover:opacity-90" style={{ maxHeight: 150 }} />}
                    {isVideo && <video src={fileUrl} controls className="w-full" style={{ maxHeight: 150 }} />}
                    {!isImg && !isVideo && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 text-xs font-semibold text-gray-700">📎 {arq.nome_original || 'Arquivo'}</a>}
                  </div>
                )
              })}
            </div>

            {/* Detalhes */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { l: 'Evento',    v: selectedPost.evento_nome },
                  { l: 'Plataforma', v: selectedPost.plataforma || '-' },
                  { l: 'Formato',   v: selectedPost.formato || '-' },
                  { l: 'Horário',   v: selectedPost.hora_publicacao || '-' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">{item.l}</p>
                    <p className="text-xs font-semibold text-gray-800 truncate">{item.v}</p>
                  </div>
                ))}
              </div>
              {selectedPost.conteudo && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Legenda</p>
                  <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-4">{selectedPost.conteudo}</p>
                </div>
              )}
              {selectedPost.hashtags && (
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Hashtags</p>
                  <p className="text-xs text-blue-500">{selectedPost.hashtags}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Próximo Evento ───────────────────────── */}
      {proximo && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Próximo Evento</p>
          <div
            onClick={() => navigate('/eventos/' + proximo.id)}
            className="bg-white rounded-2xl border border-gray-100 hover:shadow-lg hover:border-blue-100 transition-all duration-200 cursor-pointer overflow-hidden"
          >
            <div className="flex items-stretch">
              <div className="w-1.5 flex-shrink-0" style={{ background: 'linear-gradient(180deg, #2563eb, #60a5fa)' }} />
              <div className="flex-1 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-900">{proximo.nome}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                      {proximo.data_evento && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar size={12} /> {proximo.data_evento}
                        </span>
                      )}
                      {proximo.cidade && (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400">
                          <MapPin size={12} /> {proximo.cidade}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(() => {
                      const s = (proximo.receitas || 0) - (proximo.despesas || 0)
                      return (
                        <span className={`px-4 py-1.5 rounded-full text-sm font-extrabold border ${s >= 0 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                          {s >= 0 ? '+' : ''}{fmtK(s)}
                        </span>
                      )
                    })()}
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1">Despesas</p>
                    <p className="text-base font-extrabold text-blue-700">{fmtK(proximo.despesas || 0)}</p>
                  </div>
                  <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-400 mb-1">Receitas</p>
                    <p className="text-base font-extrabold text-green-700">{fmtK(proximo.receitas || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Orçamento</p>
                    <p className="text-base font-extrabold text-gray-700">{proximo.orcamento > 0 ? fmtK(proximo.orcamento) : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Todos os Eventos + Chamados ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Todos os eventos */}
        {outrosEventos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <button onClick={() => setShowTodos(!showTodos)} className="flex items-center gap-2.5">
                <h3 className="text-sm font-extrabold text-gray-900">Todos os Eventos</h3>
                <span className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{outrosEventos.length}</span>
                <ChevronRight size={15} className={`text-gray-400 transition-transform duration-200 ${showTodos ? 'rotate-90' : ''}`} />
              </button>
              {showTodos && (
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100">
                  <Search size={13} className="text-gray-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    placeholder="Buscar..."
                    className="bg-transparent text-xs text-gray-600 outline-none w-28 placeholder-gray-400"
                  />
                </div>
              )}
            </div>
            {showTodos && (
              <div className="divide-y divide-gray-50">
                {eventosFiltrados.length === 0
                  ? <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhum evento encontrado</div>
                  : eventosFiltrados.map(ev => {
                    const saldo = (ev.receitas || 0) - (ev.despesas || 0)
                    return (
                      <div key={ev.id} onClick={() => navigate('/eventos/' + ev.id)} className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Calendar size={16} className="text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-800 truncate">{ev.nome}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {ev.data_evento && <span className="text-xs text-gray-400">{ev.data_evento}</span>}
                              {ev.cidade && <span className="text-xs text-gray-400">{ev.cidade}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                          <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${saldo >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                            {saldo >= 0 ? '+' : ''}{fmtK(saldo)}
                          </span>
                          <ChevronRight size={14} className="text-gray-300" />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        {/* Chamados recentes */}
        {chamados.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-gray-900">Chamados Recentes</h3>
              <button onClick={() => navigate('/chamados')} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition">
                Ver todos →
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {chamados.slice(0, 5).map(c => (
                <div key={c.id} onClick={() => navigate('/chamados/' + c.id)} className="px-5 py-3.5 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === 'novo' ? 'bg-red-500' : c.status === 'em_andamento' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{c.nome_cliente || 'Chamado #' + c.id}</p>
                      <p className="text-xs text-gray-400 truncate">{c.topico || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.prioridade === 'alta' ? 'bg-red-50 text-red-500' :
                      c.prioridade === 'media' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-100 text-gray-500'
                    }`}>{c.prioridade || '—'}</span>
                    <ChevronRight size={14} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
