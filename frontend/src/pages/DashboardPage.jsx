import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Calendar, TrendingUp, TrendingDown, ChevronRight, Search, MapPin, Megaphone, Image, Clock, CheckCircle, Send } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../api/client'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { useAuth } from '../hooks/useAuth'

function fmt(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function fmtK(v) { return v >= 1000000 ? 'R$ ' + (v/1000000).toFixed(2) + 'M' : v >= 1000 ? 'R$ ' + (v/1000).toFixed(1) + 'K' : fmt(v) }

const DAYS = ['Seg','Ter','Qua','Qui','Sex','Sab','Dom']
const statusStyle = {
  pendente: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', label: 'Pendente' },
  rascunho: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500', label: 'Rascunho' },
  em_producao: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Producao' },
  producao: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', label: 'Producao' },
  aprovado: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', label: 'Aprovado' },
  pronto: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500', label: 'Pronto' },
  publicado: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500', label: 'Publicado' },
}
const evColors = ['#2563eb','#ef4444','#22c55e','#f59e0b','#8b5cf6','#ec4899','#06b6d4','#f97316']
const CHART_COLORS_REC = ['#2563eb','#10b981','#f59e0b','#ef4444']
const CHART_COLORS_DESP = ['#ef4444','#2563eb','#f59e0b','#10b981','#8b5cf6','#ec4899','#06b6d4','#f97316']

function getWeekDates(offset) {
  const today = new Date()
  const day = today.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + diff + offset * 7)
  return Array.from({length:7}, (_,i) => { const d = new Date(monday); d.setDate(monday.getDate()+i); return d })
}
function fmtDate(d) { return d.toISOString().split('T')[0] }
function fmtDay(d) { return d.getDate().toString().padStart(2,'0') + '/' + (d.getMonth()+1).toString().padStart(2,'0') }

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [chamados, setChamados] = useState([])
  const [demandas, setDemandas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTodos, setShowTodos] = useState(false)
  const [busca, setBusca] = useState('')
  const [dashTab, setDashTab] = useState('financeiro')
  const [weekOffset, setWeekOffset] = useState(0)
  const [statusFilter, setStatusFilter] = useState('todos')
  const [eventoFilter, setEventoFilter] = useState('todos')
  const [selectedPost, setSelectedPost] = useState(null)
  const [postArquivos, setPostArquivos] = useState([])
  const [loadingArqs, setLoadingArqs] = useState(false)
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const isAdmin = usuario?.funcao === 'admin' || usuario?.funcao === 'diretor'

  useEffect(() => {
    const p = [api.get('/dashboard'), api.get('/chamados')]
    if (isAdmin) p.push(api.get('/minhas-demandas'))
    Promise.all(p)
      .then(([d, c, dem]) => { setData(d.data); setChamados(Array.isArray(c.data) ? c.data : []); if(dem) setDemandas(dem.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>
  if (!data) return <div className="text-center py-20 text-gray-400">Erro ao carregar dashboard</div>

  const percentPago = data.total_despesas > 0 ? (data.despesas_pagas / data.total_despesas) * 100 : 0
  const percentRecebido = data.total_receitas > 0 ? (data.receitas_recebidas / data.total_receitas) * 100 : 0
  const proximo = data.eventos?.[0] || null
  const outrosEventos = data.eventos ? data.eventos.slice(1) : []
  const eventosFiltrados = outrosEventos.filter(ev => ev.nome?.toLowerCase().includes(busca.toLowerCase()) || ev.cidade?.toLowerCase().includes(busca.toLowerCase()))

  // Marketing
  const allPosts = demandas?.posts || []
  const mktEventos = demandas?.eventos || []
  let posts = eventoFilter !== 'todos' ? allPosts.filter(p => p.id_evento === Number(eventoFilter)) : allPosts
  const allForCount = posts
  const postsByStatus = { todos: allForCount, pendente: allForCount.filter(p => !p.status || p.status==='pendente' || p.status==='rascunho'), producao: allForCount.filter(p => p.status==='em_producao' || p.status==='producao'), aprovado: allForCount.filter(p => p.status==='aprovado' || p.status==='pronto'), publicado: allForCount.filter(p => p.status==='publicado') }
  if (statusFilter !== 'todos') {
    const map = { pendente: ['pendente','rascunho',''], producao: ['em_producao','producao'], aprovado: ['aprovado','pronto'], publicado: ['publicado'] }
    const vals = map[statusFilter] || []
    posts = posts.filter(p => vals.includes(p.status || 'pendente'))
  }

  const evColorMap = {}
  mktEventos.forEach((ev, i) => { evColorMap[ev.id] = evColors[i % evColors.length] })

  const isToday = (d) => fmtDate(d) === fmtDate(new Date())

  const selectPost = (post) => {
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-400">Visao geral dos seus eventos</p>
        </div>

      </div>

      <>
          <div className="rounded-2xl p-7 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <div className="absolute -bottom-10 left-20 w-32 h-32 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest opacity-50 mb-1">Resultado Geral</p>
                <p className="text-4xl font-extrabold">{fmt(data.saldo)}</p>
              </div>
              <div className={'px-4 py-2 rounded-full text-sm font-extrabold ' + (data.saldo >= 0 ? 'bg-green-500/20' : 'bg-red-500/20')}>{data.saldo >= 0 ? '\ud83d\udcc8 Positivo' : '\ud83d\udcc9 Negativo'}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 relative z-10">
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold opacity-50 uppercase tracking-wider mb-1">Receitas</p>
                <p className="text-xl font-extrabold">{fmtK(data.total_receitas)}</p>
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}><div className="h-full rounded-full bg-green-400" style={{ width: percentRecebido + '%' }} /></div>
                <p className="text-xs opacity-40 mt-1">{percentRecebido.toFixed(0)}% recebido</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <p className="text-xs font-bold opacity-50 uppercase tracking-wider mb-1">Despesas</p>
                <p className="text-xl font-extrabold">{fmtK(data.total_despesas)}</p>
                <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}><div className="h-full rounded-full bg-yellow-400" style={{ width: percentPago + '%' }} /></div>
                <p className="text-xs opacity-40 mt-1">{percentPago.toFixed(0)}% pago</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <p className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">Pago</p>
                <p className="text-xl font-extrabold">{fmtK(data.despesas_pagas)}</p>
                <p className="text-xs opacity-40 mt-3">{data.qtd_despesas} despesas</p>
              </div>
              <div className="rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.15)' }}>
                <p className="text-xs font-bold opacity-60 uppercase tracking-wider mb-1">Pendente</p>
                <p className="text-xl font-extrabold">{fmtK(data.despesas_pendentes)}</p>
                <p className="text-xs opacity-40 mt-3">a pagar</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-4 border border-blue-100 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/eventos')}>
              <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Calendar size={16} className="text-blue-600" /></div><span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Eventos</span></div>
              <p className="text-2xl font-extrabold text-blue-600">{data.total_eventos}</p><p className="text-xs text-gray-400 mt-1">cadastrados</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center"><TrendingUp size={16} className="text-green-600" /></div><span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Recebido</span></div>
              <p className="text-2xl font-extrabold text-green-700">{fmtK(data.receitas_recebidas)}</p><p className="text-xs text-gray-400 mt-1">de {fmtK(data.total_receitas)}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-red-100">
              <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><TrendingDown size={16} className="text-red-500" /></div><span className="text-xs font-bold text-gray-400 uppercase tracking-wide">A Pagar</span></div>
              <p className="text-2xl font-extrabold text-red-600">{fmtK(data.despesas_pendentes)}</p><p className="text-xs text-gray-400 mt-1">pendente</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-yellow-100 cursor-pointer hover:shadow-md transition" onClick={() => navigate('/chamados')}>
              <div className="flex items-center gap-2 mb-2"><div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center"><MessageSquare size={16} className="text-yellow-600" /></div><span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Chamados</span></div>
              <p className="text-2xl font-extrabold text-yellow-700">{data.chamados_total}</p><p className="text-xs text-gray-400 mt-1">{data.chamados_novos} novos</p>
            </div>
          </div>

          {/* Posts de Hoje + Graficos */}
          {(() => {
            const hj = fmtDate(new Date())
            const postsHoje = (demandas?.posts || []).filter(p => p.data_publicacao === hj)
            const hoje = new Date()
            const diasSemana = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']
            const recCentro = data.receitas_por_centro || []
            const despCentro = data.despesas_por_centro || []
            const CustomTooltip = ({active,payload}) => { if(active&&payload&&payload.length){return <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2"><p className="text-xs font-bold text-gray-800">{payload[0].name}</p><p className="text-xs text-gray-500">{fmtK(payload[0].value)}</p></div>} return null }
            const totalRecGeral = recCentro.reduce((s,x)=>s+x.total,0)
            const totalDespGeral = despCentro.reduce((s,x)=>s+x.total,0)
            return (
              <div className="space-y-3">
                <div className="grid gap-4" style={{gridTemplateColumns:'240px 1fr 1fr'}}>
                  {/* Mini card posts do dia */}
                  <div className="bg-white rounded-xl border-2 border-blue-500 overflow-hidden">
                    <div className="bg-blue-50 border-b border-blue-100 px-3 py-2 flex items-center justify-between">
                      <div><span className="text-xs font-bold text-blue-600 uppercase tracking-wider">{diasSemana[hoje.getDay()]}</span><span className="text-base font-extrabold text-blue-600 ml-2">{hoje.getDate()}</span></div>
                      {postsHoje.length > 0 && <span className="text-xs font-bold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">{postsHoje.length}</span>}
                    </div>
                    <div className="p-2 space-y-1" style={{maxHeight:220,overflowY:'auto'}}>
                      {postsHoje.length === 0 ? <div className="py-6 flex flex-col items-center justify-center"><Calendar size={20} className="text-gray-300 mb-1" /><span className="text-xs text-gray-400">Nenhum post hoje</span></div> : postsHoje.map(post => {
                        const st = statusStyle[post.status] || statusStyle.pendente
                        const isSel = selectedPost?.id === post.id
                        return (
                          <div key={post.id} onClick={() => selectPost(post)} className={'rounded-lg p-2 cursor-pointer border transition-all ' + (isSel ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-300' : st.bg + ' ' + st.border + ' hover:shadow-sm')}>
                            <div className="flex items-center gap-1.5"><span className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + st.dot} /><span className={'text-xs font-bold truncate ' + (isSel ? 'text-blue-700' : st.text)}>{post.titulo || 'Post'}</span></div>
                            <div className="flex items-center gap-1.5 mt-0.5">{post.hora_publicacao && <span className="text-gray-400" style={{fontSize:10}}>{post.hora_publicacao}</span>}{post.plataforma && <span className="text-gray-400 bg-gray-100 px-1 rounded" style={{fontSize:9}}>{post.plataforma}</span>}</div>
                            <div className="mt-1"><span className="text-blue-500 font-semibold truncate block" style={{fontSize:10}}>{post.evento_nome}</span></div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Grafico Receitas */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Receitas por Origem</p>
                    {recCentro.length > 0 ? (<>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={recCentro.map(r=>({name:r.centro,value:r.total}))} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} dataKey="value" label={({percent})=> (percent*100).toFixed(0)+'%'} labelLine={false}>
                            {recCentro.map((r,i) => <Cell key={i} fill={CHART_COLORS_REC[i%CHART_COLORS_REC.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {recCentro.map((r,i) => {
                          const pct = totalRecGeral > 0 ? ((r.total/totalRecGeral)*100).toFixed(1) : 0
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{background:CHART_COLORS_REC[i%CHART_COLORS_REC.length]}} /><span className="text-gray-700 font-medium" style={{fontSize:11}}>{r.centro}</span></div>
                              <div className="flex items-center gap-2"><span className="text-gray-500" style={{fontSize:10}}>{pct}%</span><span className="text-gray-800 font-bold" style={{fontSize:11}}>{fmtK(r.total)}</span></div>
                            </div>
                          )
                        })}
                      </div>
                    </>) : <div className="py-8 text-center text-xs text-gray-400">Sem dados</div>}
                  </div>

                  {/* Grafico Despesas */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Despesas por Centro</p>
                    {despCentro.length > 0 ? (<>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie data={despCentro.map(r=>({name:r.centro,value:r.total}))} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" label={({percent})=> (percent*100).toFixed(0)+'%'} labelLine={false}>
                            {despCentro.map((r,i) => <Cell key={i} fill={CHART_COLORS_DESP[i%CHART_COLORS_DESP.length]} />)}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-1.5 mt-2">
                        {despCentro.map((r,i) => {
                          const pct = totalDespGeral > 0 ? ((r.total/totalDespGeral)*100).toFixed(1) : 0
                          return (
                            <div key={i} className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{background:CHART_COLORS_DESP[i%CHART_COLORS_DESP.length]}} /><span className="text-gray-700 font-medium truncate" style={{fontSize:11,maxWidth:110}}>{r.centro}</span></div>
                              <div className="flex items-center gap-2"><span className="text-gray-500" style={{fontSize:10}}>{pct}%</span><span className="text-gray-800 font-bold" style={{fontSize:11}}>{fmtK(r.total)}</span></div>
                            </div>
                          )
                        })}
                      </div>
                    </>) : <div className="py-8 text-center text-xs text-gray-400">Sem dados</div>}
                  </div>
                </div>

                {/* Detail panel */}
                {selectedPost && (
                  <div className="bg-white rounded-xl border-2 border-blue-200 p-4 shadow-lg" style={{animation:'fadeIn .2s ease'}}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={'w-2.5 h-2.5 rounded-full ' + (statusStyle[selectedPost.status]||statusStyle.pendente).dot} />
                        <h3 className="text-sm font-extrabold text-gray-900">{selectedPost.titulo || 'Sem titulo'}</h3>
                        <span className={'text-xs font-bold px-2 py-0.5 rounded-full border ' + (statusStyle[selectedPost.status]||statusStyle.pendente).bg + ' ' + (statusStyle[selectedPost.status]||statusStyle.pendente).text + ' ' + (statusStyle[selectedPost.status]||statusStyle.pendente).border}>{(statusStyle[selectedPost.status]||statusStyle.pendente).label}</span>
                      </div>
                      <button onClick={() => {setSelectedPost(null);setPostArquivos([])}} className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs font-bold">&times;</button>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex-shrink-0" style={{width: postArquivos.length > 0 || loadingArqs ? 180 : 0}}>
                        {loadingArqs && <div className="w-full h-36 bg-gray-50 rounded-lg flex items-center justify-center"><span className="text-xs text-gray-400">Carregando...</span></div>}
                        {!loadingArqs && postArquivos.length > 0 && postArquivos.map(arq => {
                          const isImg = arq.tipo?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(arq.nome_original || arq.url || '')
                          const isVideo = arq.tipo?.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(arq.nome_original || arq.url || '')
                          const fileUrl = arq.url?.startsWith('http') ? arq.url : '/api' + (arq.url?.startsWith('/') ? arq.url : '/uploads/' + (arq.nome_arquivo || arq.url))
                          return (
                            <div key={arq.id} className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50 mb-1">
                              {isImg && <img src={fileUrl} alt={arq.nome_original} className="w-full object-cover cursor-pointer hover:opacity-90" style={{maxHeight:160}} onClick={() => { const o=document.createElement('div'); o.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer'; o.onclick=()=>o.remove(); const im=document.createElement('img'); im.src=fileUrl; im.style.cssText='max-width:90vw;max-height:90vh;border-radius:12px;object-fit:contain'; o.appendChild(im); document.body.appendChild(o) }} />}
                              {isVideo && <video src={fileUrl} controls className="w-full" style={{maxHeight:160}} />}
                              {!isImg && !isVideo && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 text-xs font-semibold text-gray-700">&#128206; {arq.nome_original || 'Arquivo'}</a>}
                            </div>
                          )
                        })}
                        {!loadingArqs && postArquivos.length === 0 && (
                          <div className="w-full h-24 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col items-center justify-center">
                            <Image size={20} className="text-gray-300 mb-1" />
                            <span className="text-xs text-gray-400">Sem midia</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          {[{l:'Evento',v:selectedPost.evento_nome},{l:'Plataforma',v:selectedPost.plataforma||'-'},{l:'Formato',v:selectedPost.formato||'-'},{l:'Horario',v:selectedPost.hora_publicacao||'-'}].map((item,i) => (
                            <div key={i} className="bg-gray-50 rounded-lg px-3 py-2">
                              <p className="text-gray-400 font-bold uppercase mb-0.5" style={{fontSize:8,letterSpacing:1}}>{item.l}</p>
                              <p className="text-xs font-bold text-gray-800 truncate">{item.v}</p>
                            </div>
                          ))}
                        </div>
                        {selectedPost.conteudo && <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-gray-400 font-bold uppercase mb-0.5" style={{fontSize:8,letterSpacing:1}}>Legenda</p><p className="text-xs text-gray-700 whitespace-pre-wrap" style={{maxHeight:80,overflow:'auto'}}>{selectedPost.conteudo}</p></div>}
                        {selectedPost.hashtags && <div className="bg-gray-50 rounded-lg px-3 py-2"><p className="text-gray-400 font-bold uppercase mb-0.5" style={{fontSize:8,letterSpacing:1}}>Hashtags</p><p className="text-xs text-blue-600">{selectedPost.hashtags}</p></div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {proximo && (
            <div>
              <h3 className="font-extrabold text-gray-900 mb-3">Proximo Evento</h3>
              <div onClick={() => navigate('/eventos/' + proximo.id)} className="bg-white rounded-2xl border border-blue-100 overflow-hidden hover:shadow-lg transition cursor-pointer">
                <div className="flex items-stretch">
                  <div className="w-2 self-stretch" style={{ background: 'linear-gradient(180deg, #2563eb, #3b82f6)' }} />
                  <div className="flex-1 p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-extrabold text-gray-900 text-lg">{proximo.nome}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          {proximo.data_evento && <span className="flex items-center gap-1 text-sm text-gray-400"><Calendar size={14} /> {proximo.data_evento}</span>}
                          {proximo.cidade && <span className="flex items-center gap-1 text-sm text-gray-400"><MapPin size={14} /> {proximo.cidade}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {(() => { const s = (proximo.receitas||0)-(proximo.despesas||0); return <div className={'px-4 py-1.5 rounded-full text-sm font-extrabold ' + (s >= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200')}>{s >= 0 ? '+' : ''}{fmtK(s)}</div> })()}
                        <ChevronRight size={20} className="text-gray-300" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-100"><p className="text-blue-400 font-bold uppercase text-xs mb-1">Despesas</p><p className="text-lg font-extrabold text-blue-700">{fmtK(proximo.despesas||0)}</p></div>
                      <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-100"><p className="text-green-400 font-bold uppercase text-xs mb-1">Receitas</p><p className="text-lg font-extrabold text-green-700">{fmtK(proximo.receitas||0)}</p></div>
                      <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-100"><p className="text-gray-400 font-bold uppercase text-xs mb-1">Orcamento</p><p className="text-lg font-extrabold text-gray-700">{proximo.orcamento > 0 ? fmtK(proximo.orcamento) : '-'}</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {outrosEventos.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => setShowTodos(!showTodos)} className="flex items-center gap-2">
                  <h3 className="font-extrabold text-gray-900 text-sm">Todos os Eventos</h3>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{outrosEventos.length}</span>
                  <ChevronRight size={16} className={'text-gray-400 transition-transform ' + (showTodos ? 'rotate-90' : '')} />
                </button>
                {showTodos && <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-1.5 border border-gray-100 w-64"><Search size={14} className="text-gray-400" /><input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar evento..." className="bg-transparent text-sm text-gray-600 outline-none w-full placeholder-gray-400" /></div>}
              </div>
              {showTodos && <div className="divide-y divide-gray-50">{eventosFiltrados.length === 0 ? <div className="px-5 py-8 text-center text-sm text-gray-400">Nenhum evento encontrado</div> : eventosFiltrados.map(ev => { const saldo = (ev.receitas||0)-(ev.despesas||0); return (
                <div key={ev.id} onClick={() => navigate('/eventos/'+ev.id)} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-50/50 transition">
                  <div className="flex items-center gap-4"><div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Calendar size={18} className="text-blue-500" /></div><div><p className="text-sm font-bold text-gray-800">{ev.nome}</p><div className="flex items-center gap-3 mt-0.5">{ev.data_evento && <span className="text-xs text-gray-400">{ev.data_evento}</span>}{ev.cidade && <span className="text-xs text-gray-400">{ev.cidade}</span>}</div></div></div>
                  <div className="flex items-center gap-4"><div className="text-right"><p className="text-xs text-gray-400">Despesas</p><p className="text-sm font-bold text-gray-700">{fmtK(ev.despesas||0)}</p></div><div className="text-right"><p className="text-xs text-gray-400">Receitas</p><p className="text-sm font-bold text-green-600">{fmtK(ev.receitas||0)}</p></div><div className={'px-3 py-1 rounded-full text-xs font-extrabold ' + (saldo >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>{saldo >= 0 ? '+' : ''}{fmtK(saldo)}</div><ChevronRight size={16} className="text-gray-300" /></div>
                </div>) })}</div>}
            </div>
          )}

          {chamados.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <h3 className="font-extrabold text-gray-900 text-sm">Chamados Recentes</h3>
                <button onClick={() => navigate('/chamados')} className="text-xs font-bold text-blue-600 hover:text-blue-800">Ver todos &rarr;</button>
              </div>
              <div className="divide-y divide-gray-50">{chamados.slice(0,5).map(c => (
                <div key={c.id} onClick={() => navigate('/chamados/'+c.id)} className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition">
                  <div className="flex items-center gap-3"><span className={'w-2 h-2 rounded-full ' + (c.status==='novo' ? 'bg-red-500' : c.status==='em_andamento' ? 'bg-yellow-500' : 'bg-green-500')} /><div><p className="text-sm font-bold text-gray-800">{c.nome_cliente || 'Chamado #'+c.id}</p><p className="text-xs text-gray-400">{c.topico || '-'}</p></div></div>
                  <div className="flex items-center gap-2"><span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + (c.prioridade==='alta' ? 'bg-red-50 text-red-600' : c.prioridade==='media' ? 'bg-yellow-50 text-yellow-600' : 'bg-gray-100 text-gray-500')}>{c.prioridade || '-'}</span><ChevronRight size={14} className="text-gray-300" /></div>
                </div>))}</div>
            </div>
          )}
        </>
    </div>
  )
}
