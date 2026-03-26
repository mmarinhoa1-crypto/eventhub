import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, BarChart3, ChevronDown, Trash2, Clock, Brain, TrendingUp, MapPin, Lightbulb, Target, FileText, Megaphone, ChevronUp } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useTema } from '../contexts/ThemeContext'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'

function parseData(str) {
  if (!str) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str + 'T12:00:00')
  return null
}

export default function IAPage() {
  const { usuario } = useAuth()
  const { tema } = useTema()
  const isDark = tema === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [eventoId, setEventoId] = useState(null)

  // Campanhas state
  const [campanhas, setCampanhas] = useState([])
  const [gerandoCampanha, setGerandoCampanha] = useState(false)
  const [showCampanhaModal, setShowCampanhaModal] = useState(false)
  const [campForm, setCampForm] = useState({ objetivo: 'engajamento', orcamento: '500', duracao: '7', plataforma: 'Instagram + Facebook', direcionamento: '' })
  const [loadingCamp, setLoadingCamp] = useState(false)

  // Análise state
  const [analises, setAnalises] = useState([])
  const [analiseAtual, setAnaliseAtual] = useState(null)
  const [gerandoAnalise, setGerandoAnalise] = useState(false)
  const [loadingAnalise, setLoadingAnalise] = useState(false)

  const subtab = searchParams.get('subtab') || 'campanhas'

  // Carregar eventos (apenas próximos)
  useEffect(() => {
    api.get('/eventos').then(r => {
      const hoje = new Date()
      hoje.setHours(12, 0, 0, 0)
      const evs = (Array.isArray(r.data) ? r.data : []).filter(ev => {
        const d = parseData(ev.data_evento)
        return !d || d >= hoje
      }).sort((a, b) => {
        const da = parseData(a.data_evento)
        const db = parseData(b.data_evento)
        if (!da) return 1
        if (!db) return -1
        return da - db
      })
      setEventos(evs)
      const urlEvento = searchParams.get('evento')
      if (urlEvento && evs.find(e => e.id === Number(urlEvento))) {
        setEventoId(Number(urlEvento))
      } else if (evs.length > 0) {
        setEventoId(evs[0].id)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  // Carregar dados quando muda evento ou aba
  useEffect(() => {
    if (!eventoId) return
    if (subtab === 'campanhas') {
      setLoadingCamp(true)
      api.get(`/eventos/${eventoId}/campanhas`).then(r => setCampanhas(r.data)).catch(() => setCampanhas([])).finally(() => setLoadingCamp(false))
    } else {
      setLoadingAnalise(true)
      api.get(`/eventos/${eventoId}/analises`).then(r => { setAnalises(r.data); setAnaliseAtual(null) }).catch(() => setAnalises([])).finally(() => setLoadingAnalise(false))
    }
  }, [eventoId, subtab])

  function selectEvento(id) {
    setEventoId(id)
    const params = new URLSearchParams(searchParams)
    params.set('evento', id)
    setSearchParams(params, { replace: true })
  }

  function selectTab(tab) {
    const params = new URLSearchParams(searchParams)
    params.set('subtab', tab)
    setSearchParams(params, { replace: true })
  }

  async function gerarCampanha() {
    setGerandoCampanha(true)
    try {
      const { data } = await api.post(`/eventos/${eventoId}/ia/campanha`, campForm)
      setCampanhas(prev => [data, ...prev])
      setShowCampanhaModal(false)
      toast.success('Campanha gerada com sucesso!')
    } catch { toast.error('Erro ao gerar campanha') }
    finally { setGerandoCampanha(false) }
  }

  async function deletarCampanha(id) {
    if (!confirm('Remover esta campanha?')) return
    try {
      await api.delete('/campanhas/' + id)
      setCampanhas(prev => prev.filter(c => c.id !== id))
      toast.success('Campanha removida')
    } catch { toast.error('Erro ao remover') }
  }

  async function gerarAnalise() {
    setGerandoAnalise(true)
    try {
      const { data } = await api.post(`/eventos/${eventoId}/ia/analise-semanal`)
      setAnaliseAtual(data)
      setAnalises(prev => [data, ...prev])
      toast.success('Análise gerada com sucesso!')
    } catch { toast.error('Erro ao gerar análise') }
    finally { setGerandoAnalise(false) }
  }

  async function deletarAnalise(id) {
    if (!confirm('Remover esta análise?')) return
    try {
      await api.delete('/analises/' + id)
      setAnalises(prev => prev.filter(a => a.id !== id))
      if (analiseAtual?.id === id) setAnaliseAtual(null)
      toast.success('Análise removida')
    } catch { toast.error('Erro ao remover') }
  }

  if (loading) return <div className="flex justify-center py-32"><LoadingSpinner size="lg" /></div>

  if (eventos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Sparkles size={40} className="text-gray-200 dark:text-white/10" />
        <p className="text-gray-500 dark:text-white/40 font-semibold">Nenhum evento futuro cadastrado.</p>
      </div>
    )
  }

  const tabStyle = (active) => 'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ' + (active
    ? 'bg-white dark:bg-white/[0.10] text-gray-900 dark:text-white shadow-sm'
    : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60')

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight flex items-center gap-2">
            <Sparkles size={22} className="text-accent" /> Inteligência Artificial
          </h1>
          <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Campanhas e análises geradas por IA</p>
        </div>
        <div className="relative">
          <select
            value={eventoId || ''}
            onChange={e => selectEvento(Number(e.target.value))}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer min-w-[220px]"
          >
            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 pointer-events-none" />
        </div>
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-white/[0.04] p-1 rounded-xl w-fit">
        <button onClick={() => selectTab('campanhas')} className={tabStyle(subtab === 'campanhas')}>
          <Sparkles size={14} /> Campanhas IA
        </button>
        <button onClick={() => selectTab('analise')} className={tabStyle(subtab === 'analise')}>
          <BarChart3 size={14} /> Análise IA
        </button>
      </div>

      {/* ===== CAMPANHAS ===== */}
      {subtab === 'campanhas' && (
        loadingCamp ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
          <Card>
            <div className="p-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white/90">Campanhas ({campanhas.length})</h3>
              <Button onClick={() => setShowCampanhaModal(true)} size="sm">
                <Sparkles size={14} /> Gerar Campanha IA
              </Button>
            </div>
            {campanhas.length === 0 ? (
              <div className="p-8 text-center">
                <Megaphone size={32} className="text-gray-200 dark:text-white/10 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-white/40">Nenhuma campanha. Gere uma com IA!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                {campanhas.map(c => (
                  <div key={c.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white/90">{c.nome}</h4>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <Badge variant="blue">{c.objetivo}</Badge>
                          <Badge variant="gray">{c.plataforma}</Badge>
                          <Badge variant="green">R$ {Number(c.orcamento_total).toFixed(2)}</Badge>
                          <Badge variant="yellow">{c.duracao_dias} dias</Badge>
                        </div>
                      </div>
                      <button onClick={() => deletarCampanha(c.id)} className="text-red-400 hover:text-red-600 dark:text-red-400/60 dark:hover:text-red-400"><Trash2 size={16} /></button>
                    </div>
                    {c.publico_alvo && <div><span className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Público-alvo</span><p className="text-sm text-gray-700 dark:text-white/70">{c.publico_alvo}</p></div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {c.copy_principal && <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3"><span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">Copy principal</span><p className="text-sm text-gray-800 dark:text-white/80 mt-1">{c.copy_principal}</p></div>}
                      {c.headline && <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-3"><span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">Headline</span><p className="text-sm text-gray-800 dark:text-white/80 mt-1">{c.headline}</p></div>}
                    </div>
                    {c.copy_secundaria && <div><span className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Copy secundária</span><p className="text-sm text-gray-700 dark:text-white/70">{c.copy_secundaria}</p></div>}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {c.cta && <div><span className="text-xs font-medium text-gray-500 dark:text-white/40">CTA:</span> <span className="text-gray-700 dark:text-white/70">{c.cta}</span></div>}
                      {c.posicionamentos && <div><span className="text-xs font-medium text-gray-500 dark:text-white/40">Posicionamentos:</span> <span className="text-gray-700 dark:text-white/70">{c.posicionamentos}</span></div>}
                      {c.horarios_sugeridos && <div><span className="text-xs font-medium text-gray-500 dark:text-white/40">Horários:</span> <span className="text-gray-700 dark:text-white/70">{c.horarios_sugeridos}</span></div>}
                    </div>
                    {c.segmentacao && typeof c.segmentacao === 'string' && (() => { try { const s = JSON.parse(c.segmentacao); return (
                      <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-3"><span className="text-xs font-medium text-gray-500 dark:text-white/40 uppercase">Segmentação detalhada</span>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 text-sm">
                          {s.idade_min && <div><span className="text-gray-500 dark:text-white/40">Idade:</span> <span className="text-gray-700 dark:text-white/70">{s.idade_min}-{s.idade_max}</span></div>}
                          {s.genero && <div><span className="text-gray-500 dark:text-white/40">Gênero:</span> <span className="text-gray-700 dark:text-white/70">{s.genero}</span></div>}
                          {s.localizacao && <div><span className="text-gray-500 dark:text-white/40">Local:</span> <span className="text-gray-700 dark:text-white/70">{s.localizacao}</span></div>}
                          {s.interesses && <div className="col-span-2"><span className="text-gray-500 dark:text-white/40">Interesses:</span> <span className="text-gray-700 dark:text-white/70">{Array.isArray(s.interesses) ? s.interesses.join(', ') : s.interesses}</span></div>}
                        </div>
                      </div>
                    ); } catch { return null } })()}
                    {c.observacoes_ia && <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-3 border border-yellow-200 dark:border-yellow-500/20"><span className="text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase">Insights da IA</span><p className="text-sm text-gray-700 dark:text-white/70 mt-1">{c.observacoes_ia}</p></div>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )
      )}

      {/* Modal gerar campanha */}
      {showCampanhaModal && (
        <Modal open={showCampanhaModal} onClose={() => setShowCampanhaModal(false)} title="Gerar Campanha com IA">
          <div className="space-y-4">
            <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-3 border border-violet-200 dark:border-violet-500/20">
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">A IA vai analisar os dados do evento, criativos aprovados e gerar um plano de campanha completo.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Objetivo</label>
                <select value={campForm.objetivo} onChange={e => setCampForm({ ...campForm, objetivo: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.12] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80">
                  <option value="engajamento">Engajamento</option>
                  <option value="trafego">Tráfego</option>
                  <option value="conversao">Conversão/Vendas</option>
                  <option value="alcance">Alcance</option>
                  <option value="reconhecimento">Reconhecimento</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Plataforma</label>
                <select value={campForm.plataforma} onChange={e => setCampForm({ ...campForm, plataforma: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.12] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80">
                  <option value="Instagram + Facebook">Instagram + Facebook</option>
                  <option value="Instagram">Somente Instagram</option>
                  <option value="Facebook">Somente Facebook</option>
                  <option value="Instagram + Facebook + Google">Insta + FB + Google</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Orçamento total (R$)</label>
                <input type="number" value={campForm.orcamento} onChange={e => setCampForm({ ...campForm, orcamento: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.12] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Duração (dias)</label>
                <input type="number" value={campForm.duracao} onChange={e => setCampForm({ ...campForm, duracao: e.target.value })} className="w-full border border-gray-300 dark:border-white/[0.12] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white/70 mb-1">Direcionamento para a IA</label>
              <textarea value={campForm.direcionamento} onChange={e => setCampForm({ ...campForm, direcionamento: e.target.value })} placeholder="Ex: Focar em virada de lote, criar urgência, público universitário 18-25" rows={3} className="w-full border border-gray-300 dark:border-white/[0.12] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80" />
            </div>
            <Button onClick={gerarCampanha} loading={gerandoCampanha} className="w-full">
              <Sparkles size={16} /> {gerandoCampanha ? 'Gerando campanha...' : 'Gerar Campanha IA'}
            </Button>
          </div>
        </Modal>
      )}

      {/* ===== ANÁLISE ===== */}
      {subtab === 'analise' && (
        loadingAnalise ? <div className="flex justify-center py-16"><LoadingSpinner /></div> : (
          <div className="space-y-4">
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Brain size={20} className="text-blue-600 dark:text-blue-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white/90">Análise Semanal IA</h3>
                  </div>
                  <Button onClick={gerarAnalise} loading={gerandoAnalise} size="sm">
                    <Sparkles size={14} /> {gerandoAnalise ? 'Analisando...' : 'Gerar Análise'}
                  </Button>
                </div>
                <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-3 border border-violet-200 dark:border-violet-500/20">
                  <p className="text-xs text-violet-700 dark:text-violet-400">A IA vai cruzar dados de vendas com ações de marketing para identificar o que converteu e gerar recomendações.</p>
                </div>
                {gerandoAnalise && (
                  <div className="flex items-center gap-3 mt-3 text-sm text-gray-500 dark:text-white/40">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                    Analisando vendas, cronograma e cruzando dados... (pode levar ~15s)
                  </div>
                )}
              </div>
            </Card>

            {analiseAtual && <AnaliseCard analise={analiseAtual} onDelete={deletarAnalise} defaultOpen />}

            {analises.filter(a => !analiseAtual || a.id !== analiseAtual.id).length > 0 && (
              <Card>
                <div className="p-4 border-b border-gray-200 dark:border-white/[0.06]">
                  <h3 className="font-semibold text-gray-900 dark:text-white/90 flex items-center gap-2">
                    <Clock size={16} /> Histórico ({analises.filter(a => !analiseAtual || a.id !== analiseAtual.id).length})
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-white/[0.06]">
                  {analises.filter(a => !analiseAtual || a.id !== analiseAtual.id).map(a => (
                    <AnaliseCard key={a.id} analise={a} onDelete={deletarAnalise} compact />
                  ))}
                </div>
              </Card>
            )}

            {!analiseAtual && analises.length === 0 && !gerandoAnalise && (
              <div className="text-center py-12">
                <Brain size={32} className="text-gray-200 dark:text-white/10 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-white/40">Nenhuma análise. Gere uma para cruzar vendas com marketing.</p>
              </div>
            )}
          </div>
        )
      )}
    </div>
  )
}

// Componente AnaliseCard (independente do MarketingTab)
function AnaliseCard({ analise, onDelete, defaultOpen = false, compact = false }) {
  const [open, setOpen] = useState(defaultOpen)
  const a = analise

  function parseJson(val) {
    if (!val) return []
    if (Array.isArray(val)) return val
    if (typeof val === 'string') { try { return JSON.parse(val) } catch { return [] } }
    return []
  }

  const topAcoes = parseJson(a.top_acoes)
  const topCidades = parseJson(a.top_cidades)
  const insights = parseJson(a.insights)
  const recomendacoes = parseJson(a.recomendacoes)
  const dataFormatada = a.criado_em ? new Date(a.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

  if (compact && !open) {
    return (
      <div className="p-4 hover:bg-gray-50 dark:hover:bg-white/[0.02] cursor-pointer flex items-center justify-between" onClick={() => setOpen(true)}>
        <div className="flex items-center gap-3">
          <Brain size={16} className="text-blue-500" />
          <div>
            <span className="text-sm font-medium text-gray-900 dark:text-white/80">{a.resumo ? a.resumo.substring(0, 80) + '...' : 'Análise de ' + dataFormatada}</span>
            <span className="text-xs text-gray-500 dark:text-white/40 ml-2">{dataFormatada}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {a.total_vendas != null && <Badge variant="green">R$ {Number(a.total_vendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Badge>}
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white/90">Análise de {dataFormatada}</h3>
          {a.total_vendas != null && <Badge variant="green">R$ {Number(a.total_vendas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {compact && <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600"><ChevronUp size={16} /></button>}
          <button onClick={() => onDelete(a.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {a.resumo && (
          <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-4 border border-violet-200 dark:border-violet-500/20">
            <div className="flex items-center gap-2 mb-2"><BarChart3 size={16} className="text-blue-600 dark:text-blue-400" /><span className="text-sm font-semibold text-violet-800 dark:text-violet-300">Resumo da Semana</span></div>
            <p className="text-sm text-gray-800 dark:text-white/70">{a.resumo}</p>
            {a.comparativo && <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">{a.comparativo}</p>}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topAcoes.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-4 border border-blue-200 dark:border-blue-500/20">
              <div className="flex items-center gap-2 mb-3"><TrendingUp size={16} className="text-blue-600" /><span className="text-sm font-semibold text-violet-800 dark:text-blue-300">Top Ações que Converteram</span></div>
              <div className="space-y-2">{topAcoes.map((ac, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white/80">{ac.acao || ac.titulo || ac.descricao}</p>
                    <div className="flex gap-2 mt-0.5">
                      {ac.data && <span className="text-xs text-gray-500 dark:text-white/40">{ac.data}</span>}
                      {ac.vendas_geradas != null && <span className="text-xs text-green-600 font-medium">+{ac.vendas_geradas} vendas</span>}
                    </div>
                  </div>
                </div>
              ))}</div>
            </div>
          )}
          {topCidades.length > 0 && (
            <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-4 border border-green-200 dark:border-green-500/20">
              <div className="flex items-center gap-2 mb-3"><MapPin size={16} className="text-green-600" /><span className="text-sm font-semibold text-green-800 dark:text-green-300">Top Cidades</span></div>
              <div className="space-y-2">{topCidades.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span><span className="text-sm text-gray-900 dark:text-white/80">{c.cidade || c.nome}</span></div>
                  <div className="flex items-center gap-2">
                    {c.qtd != null && <span className="text-xs text-gray-500 dark:text-white/40">{c.qtd} ingressos</span>}
                    {c.crescimento && <span className="text-xs text-green-600 font-medium">{c.crescimento}</span>}
                  </div>
                </div>
              ))}</div>
            </div>
          )}
        </div>
        {insights.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-500/10 rounded-lg p-4 border border-yellow-200 dark:border-yellow-500/20">
            <div className="flex items-center gap-2 mb-3"><Lightbulb size={16} className="text-yellow-600" /><span className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Insights</span></div>
            <ul className="space-y-1.5">{insights.map((ins, i) => <li key={i} className="text-sm text-gray-800 dark:text-white/70 flex items-start gap-2"><span className="text-yellow-500 mt-0.5">•</span><span>{typeof ins === 'string' ? ins : ins.texto || ins.descricao || JSON.stringify(ins)}</span></li>)}</ul>
          </div>
        )}
        {recomendacoes.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-500/10 rounded-lg p-4 border border-orange-200 dark:border-orange-500/20">
            <div className="flex items-center gap-2 mb-3"><Target size={16} className="text-orange-600" /><span className="text-sm font-semibold text-orange-800 dark:text-orange-300">Recomendações</span></div>
            <div className="space-y-3">{recomendacoes.map((rec, i) => (
              <div key={i} className="bg-white dark:bg-white/[0.03] rounded-lg p-3 border border-orange-100 dark:border-orange-500/15">
                <p className="text-sm font-medium text-gray-900 dark:text-white/80">{rec.acao || rec.titulo || rec.descricao}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {rec.plataforma && <Badge variant="purple">{rec.plataforma}</Badge>}
                  {rec.quando && <Badge variant="blue">{rec.quando}</Badge>}
                </div>
                {rec.motivo && <p className="text-xs text-gray-500 dark:text-white/40 mt-1">{rec.motivo}</p>}
              </div>
            ))}</div>
          </div>
        )}
        {a.briefing_semana && (
          <div className="bg-gray-50 dark:bg-white/[0.03] rounded-lg p-4 border border-gray-200 dark:border-white/[0.06]">
            <div className="flex items-center gap-2 mb-2"><FileText size={16} className="text-gray-600 dark:text-white/50" /><span className="text-sm font-semibold text-gray-800 dark:text-white/80">Briefing para a Equipe</span></div>
            <p className="text-sm text-gray-700 dark:text-white/60 whitespace-pre-line">{a.briefing_semana}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
