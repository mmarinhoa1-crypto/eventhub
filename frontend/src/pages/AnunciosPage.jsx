import { useState, useEffect, useMemo } from 'react'
import { BarChart3, DollarSign, Eye, MousePointerClick, Users, TrendingUp, Target, Layers, ChevronDown, ChevronRight, RefreshCw, Image as ImageIcon, ShoppingCart, UserPlus, Percent, ArrowUpDown, X, Sparkles, Calendar } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'

const statusColors = {
  ACTIVE:      'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  PAUSED:      'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
  DELETED:     'bg-gray-100 text-gray-500',
  ARCHIVED:    'bg-gray-100 text-gray-500',
  WITH_ISSUES: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
  IN_PROCESS:  'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
}

const statusDot = {
  ACTIVE: 'bg-green-500',
  PAUSED: 'bg-yellow-500',
  DELETED: 'bg-gray-400',
  ARCHIVED: 'bg-gray-400',
  WITH_ISSUES: 'bg-red-500',
  IN_PROCESS: 'bg-blue-500',
}

function fmtMoney(v) {
  const n = parseFloat(v) || 0
  return 'R$ ' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtNum(v) {
  const n = parseInt(v) || 0
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString('pt-BR')
}

function fmtPct(v) {
  return (parseFloat(v) || 0).toFixed(2) + '%'
}

const periodos = [
  { key: '7', label: 'Ultimos 7 dias' },
  { key: '14', label: 'Ultimos 14 dias' },
  { key: '30', label: 'Ultimos 30 dias' },
  { key: '60', label: 'Ultimos 60 dias' },
  { key: '90', label: 'Ultimos 90 dias' },
  { key: '120', label: 'Ultimos 120 dias' },
  { key: '180', label: 'Ultimos 180 dias' },
]

function normalize(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function matchCampanhaEvento(campanha, eventos, funnelMap) {
  if (funnelMap[campanha.id]) return funnelMap[campanha.id]
  const campName = normalize(campanha.name)
  for (const ev of eventos) {
    const words = normalize(ev.nome).split(/\s+/).filter(w => w.length >= 3)
    if (words.length > 0 && words.every(w => campName.includes(w))) return ev.id
  }
  return null
}

export default function AnunciosPage() {
  const [contas, setContas] = useState([])
  const [contaSel, setContaSel] = useState('')
  const [periodo, setPeriodo] = useState('30')
  const [resumo, setResumo] = useState(null)
  const [campanhas, setCampanhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingCamp, setLoadingCamp] = useState(false)
  const [expandidos, setExpandidos] = useState({})
  const [adsets, setAdsets] = useState({})
  const [ads, setAds] = useState({})
  const [eventos, setEventos] = useState([])
  const [eventoSel, setEventoSel] = useState('')
  const [funnelMap, setFunnelMap] = useState({})
  const [criativos, setCriativos] = useState([])
  const [loadingCriativos, setLoadingCriativos] = useState(false)
  const [ordenarPor, setOrdenarPor] = useState('spend')
  const [previewImg, setPreviewImg] = useState(null)
  const [analiseIA, setAnaliseIA] = useState('')
  const [loadingIA, setLoadingIA] = useState(false)
  const [showAnalise, setShowAnalise] = useState(false)
  const [campanhaCriativoSel, setCampanhaCriativoSel] = useState('')
  const [filtroStatusCamp, setFiltroStatusCamp] = useState('ACTIVE')
  const [dadosDiarios, setDadosDiarios] = useState([])
  const [loadingDiario, setLoadingDiario] = useState(false)
  const [diarioEvento, setDiarioEvento] = useState('')
  const [diarioPeriodo, setDiarioPeriodo] = useState('30')

  function getDateRange() {
    const ate = new Date().toISOString().split('T')[0]
    const d = new Date()
    d.setDate(d.getDate() - parseInt(periodo))
    const desde = d.toISOString().split('T')[0]
    return { desde, ate }
  }

  useEffect(() => {
    api.get('/anuncios/contas').then(r => setContas(r.data)).catch(() => {})
    api.get('/anuncios/eventos-map').then(r => {
      setEventos(r.data.eventos || [])
      setFunnelMap(r.data.funnelMap || {})
    }).catch(() => {})
  }, [])

  useEffect(() => {
    carregarDados()
  }, [contaSel, periodo])

  async function carregarDados() {
    setLoading(true)
    setLoadingCamp(true)
    setLoadingCriativos(true)
    setLoadingDiario(true)
    const { desde, ate } = getDateRange()
    const params = new URLSearchParams({ desde, ate })
    if (contaSel) params.set('conta', contaSel)
    const qs = '?' + params.toString()
    try {
      const [r, c, cr, dr] = await Promise.all([
        api.get('/anuncios/resumo' + qs),
        api.get('/anuncios/campanhas' + qs),
        api.get('/anuncios/criativos' + qs),
        api.get('/anuncios/diario' + qs),
      ])
      setResumo(r.data)
      setCampanhas(c.data)
      setCriativos(cr.data || [])
      setDadosDiarios(dr.data || [])
    } catch (e) {
      const msg = e.response?.data?.erro || 'Erro ao carregar anuncios'
      toast.error(msg, { duration: 6000 })
    } finally {
      setLoading(false)
      setLoadingCamp(false)
      setLoadingCriativos(false)
      setLoadingDiario(false)
    }
  }

  async function toggleCampanha(campId) {
    const novo = { ...expandidos }
    if (novo[campId]) {
      delete novo[campId]
      setExpandidos(novo)
      return
    }
    novo[campId] = true
    setExpandidos(novo)
    if (!adsets[campId]) {
      const { desde, ate } = getDateRange()
      try {
        const r = await api.get('/anuncios/campanhas/' + campId + '/adsets?desde=' + desde + '&ate=' + ate)
        setAdsets(prev => ({ ...prev, [campId]: r.data }))
      } catch { toast.error('Erro ao carregar conjuntos') }
    }
  }

  async function toggleAdset(adsetId) {
    const novo = { ...expandidos }
    const key = 'as-' + adsetId
    if (novo[key]) {
      delete novo[key]
      setExpandidos(novo)
      return
    }
    novo[key] = true
    setExpandidos(novo)
    if (!ads[adsetId]) {
      const { desde, ate } = getDateRange()
      try {
        const r = await api.get('/anuncios/adsets/' + adsetId + '/ads?desde=' + desde + '&ate=' + ate)
        setAds(prev => ({ ...prev, [adsetId]: r.data }))
      } catch { toast.error('Erro ao carregar anuncios') }
    }
  }

  const campanhasFiltradas = useMemo(() => {
    if (!eventoSel) return campanhas
    return campanhas.filter(c => matchCampanhaEvento(c, eventos, funnelMap) === parseInt(eventoSel))
  }, [eventoSel, campanhas, eventos, funnelMap])

  const resumoExibido = useMemo(() => {
    if (!eventoSel || !resumo) return resumo
    let spend = 0, impressions = 0, reach = 0, clicks = 0
    let conversions = 0, purchases = 0, leads = 0, registrations = 0, conversionValue = 0
    let frequencySum = 0, freqCount = 0

    for (const c of campanhasFiltradas) {
      const ins = c.insights || {}
      spend += parseFloat(ins.spend || 0)
      impressions += parseInt(ins.impressions || 0)
      reach += parseInt(ins.reach || 0)
      clicks += parseInt(ins.clicks || 0)
      if (parseFloat(ins.frequency || 0) > 0) {
        frequencySum += parseFloat(ins.frequency || 0)
        freqCount++
      }
      conversions += (c.conversions || 0)
      purchases += (c.purchases || 0)
      leads += (c.leads || 0)
      registrations += (c.registrations || 0)
      conversionValue += (c.conversion_value || 0)
    }

    return {
      spend, impressions, reach, clicks,
      ctr: impressions > 0 ? (clicks / impressions * 100).toFixed(2) : '0.00',
      cpc: clicks > 0 ? (spend / clicks).toFixed(2) : '0.00',
      cpm: impressions > 0 ? (spend / impressions * 1000).toFixed(2) : '0.00',
      frequency: freqCount > 0 ? (frequencySum / freqCount).toFixed(2) : '0.00',
      conversions, purchases, leads, registrations,
      conversion_value: conversionValue,
      roas: spend > 0 ? (conversionValue / spend).toFixed(2) : '0.00',
      cpa: conversions > 0 ? (spend / conversions).toFixed(2) : '0.00',
      conversion_rate: clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00'
    }
  }, [eventoSel, resumo, campanhasFiltradas])

  async function analisarCriativos() {
    if (criativosFiltrados.length === 0) return toast.error('Nenhum criativo para analisar')
    setLoadingIA(true)
    setShowAnalise(true)
    setAnaliseIA('')
    try {
      const campanhaName = campanhaCriativoSel ? (campanhasUnicas.find(([id]) => id === campanhaCriativoSel)?.[1] || '') : ''
      const r = await api.post('/anuncios/analise-ia', { criativos: criativosFiltrados, campanha: campanhaName })
      setAnaliseIA(r.data.analise)
    } catch (e) {
      const msg = e.response?.data?.erro || 'Erro na analise IA'
      toast.error(msg)
      setAnaliseIA('Erro ao gerar analise: ' + msg)
    } finally {
      setLoadingIA(false)
    }
  }

  const criativosFiltrados = useMemo(() => {
    let list = criativos
    if (eventoSel) {
      list = list.filter(cr => {
        const campName = normalize(cr.campaign_name)
        for (const ev of eventos) {
          if (ev.id === parseInt(eventoSel)) {
            const words = normalize(ev.nome).split(/\s+/).filter(w => w.length >= 3)
            if (words.length > 0 && words.every(w => campName.includes(w))) return true
          }
        }
        return false
      })
    }
    if (campanhaCriativoSel) {
      list = list.filter(cr => cr.campaign_id === campanhaCriativoSel)
    }
    return [...list].sort((a, b) => {
      const va = parseFloat(a[ordenarPor]) || 0
      const vb = parseFloat(b[ordenarPor]) || 0
      return vb - va
    })
  }, [criativos, eventoSel, eventos, ordenarPor, campanhaCriativoSel])

  const campanhasUnicas = useMemo(() => {
    const map = new Map()
    for (const cr of criativos) {
      if (cr.campaign_id && cr.campaign_name && !map.has(cr.campaign_id)) {
        map.set(cr.campaign_id, cr.campaign_name)
      }
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [criativos])

  const resumoDiario = useMemo(() => {
    let campsFiltro = campanhas
    if (diarioEvento) {
      campsFiltro = campanhas.filter(c => matchCampanhaEvento(c, eventos, funnelMap) === parseInt(diarioEvento))
    }
    const total = campsFiltro.reduce((s, c) => s + parseFloat(c.insights?.spend || 0), 0)
    const dias = parseInt(diarioPeriodo)
    const impressions = campsFiltro.reduce((s, c) => s + parseInt(c.insights?.impressions || 0), 0)
    const clicks = campsFiltro.reduce((s, c) => s + parseInt(c.insights?.clicks || 0), 0)
    const reach = campsFiltro.reduce((s, c) => s + parseInt(c.insights?.reach || 0), 0)
    return { total, media: dias > 0 ? total / dias : 0, dias, campanhas: campsFiltro.filter(c => parseFloat(c.insights?.spend || 0) > 0).length, impressions, clicks, reach }
  }, [campanhas, diarioEvento, diarioPeriodo, eventos, funnelMap])

  const campanhasFiltradas2 = useMemo(() => {
    if (!filtroStatusCamp) return campanhasFiltradas
    return campanhasFiltradas.filter(c => {
      const st = (c.effective_status || c.status || '').toUpperCase()
      return st === filtroStatusCamp
    })
  }, [campanhasFiltradas, filtroStatusCamp])

  const cardsGerais = resumoExibido ? [
    { label: 'Investido', value: fmtMoney(resumoExibido.spend), icon: DollarSign, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
    { label: 'Impressoes', value: fmtNum(resumoExibido.impressions), icon: Eye, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Alcance', value: fmtNum(resumoExibido.reach), icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Cliques', value: fmtNum(resumoExibido.clicks), icon: MousePointerClick, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'CTR', value: fmtPct(resumoExibido.ctr), icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'CPC', value: fmtMoney(resumoExibido.cpc), icon: Target, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'CPM', value: fmtMoney(resumoExibido.cpm), icon: Layers, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Frequencia', value: resumoExibido.frequency, icon: RefreshCw, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  ] : []

  const cardsConversao = resumoExibido ? [
    { label: 'Conversoes', value: fmtNum(resumoExibido.conversions), icon: Target, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
    { label: 'Valor Conv.', value: fmtMoney(resumoExibido.conversion_value || 0), icon: DollarSign, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
    { label: 'Compras', value: fmtNum(resumoExibido.purchases || 0), icon: ShoppingCart, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { label: 'Leads', value: fmtNum(resumoExibido.leads || 0), icon: UserPlus, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { label: 'ROAS', value: parseFloat(resumoExibido.roas || 0).toFixed(2) + 'x', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'CPA', value: fmtMoney(resumoExibido.cpa || 0), icon: DollarSign, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
    { label: 'Taxa Conv.', value: fmtPct(resumoExibido.conversion_rate || 0), icon: Percent, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  ] : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/20">
            <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">Anuncios</h1>
            <p className="text-sm text-gray-400">Meta Ads - Todas as contas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {contas.length > 1 && (
            <select value={contaSel} onChange={e => setContaSel(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none">
              <option value="">Todas as contas</option>
              {contas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {eventos.length > 0 && (
            <select value={eventoSel} onChange={e => setEventoSel(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none">
              <option value="">Todos os eventos</option>
              {eventos.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.nome}{ev.data_evento ? ` (${new Date(ev.data_evento).toLocaleDateString('pt-BR')})` : ''}
                </option>
              ))}
            </select>
          )}
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 outline-none">
            {periodos.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <button onClick={carregarDados} className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition" title="Atualizar">
            <RefreshCw size={16} className={'text-gray-500 ' + (loading ? 'animate-spin' : '')} />
          </button>
        </div>
      </div>

      {/* Cards */}
      {loading && !resumo ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : resumoExibido && (
        <div className="space-y-3">
          {/* Metricas Gerais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {cardsGerais.map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-gray-400 font-semibold uppercase">{c.label}</span>
                  <div className={'p-1 rounded-lg ' + c.bg}>
                    <c.icon size={12} className={c.color} />
                  </div>
                </div>
                <p className={'text-lg font-bold ' + c.color}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Metricas de Conversao */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2 ml-1">Conversoes</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {cardsConversao.map((c, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-gray-400 font-semibold uppercase">{c.label}</span>
                    <div className={'p-1 rounded-lg ' + c.bg}>
                      <c.icon size={12} className={c.color} />
                    </div>
                  </div>
                  <p className={'text-lg font-bold ' + c.color}>{c.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Valor Diario */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-green-600" />
            <h2 className="font-bold text-gray-900">Valor Diario</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {eventos.length > 0 && (
              <select value={diarioEvento} onChange={e => setDiarioEvento(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none max-w-[200px]">
                <option value="">Todos os eventos</option>
                {eventos.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.nome}{ev.data_evento ? ` (${new Date(ev.data_evento).toLocaleDateString('pt-BR')})` : ''}
                  </option>
                ))}
              </select>
            )}
            <select value={diarioPeriodo} onChange={e => setDiarioPeriodo(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none">
              {periodos.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Total Investido</p>
              <p className="text-2xl font-bold text-green-600">{fmtMoney(resumoDiario.total)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{resumoDiario.campanhas} campanhas em {resumoDiario.dias} dias</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Media por Dia</p>
              <p className="text-2xl font-bold text-blue-600">{fmtMoney(resumoDiario.media)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">investimento diario</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Impressoes</p>
              <p className="text-2xl font-bold text-blue-500">{fmtNum(resumoDiario.impressions)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{fmtNum(Math.round(resumoDiario.impressions / resumoDiario.dias))}/dia</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">Cliques</p>
              <p className="text-2xl font-bold text-blue-500">{fmtNum(resumoDiario.clicks)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{fmtNum(Math.round(resumoDiario.clicks / resumoDiario.dias))}/dia</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campanhas */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Campanhas</h2>
            <span className="text-xs text-gray-400">
              {campanhasFiltradas2.length} campanhas
              {filtroStatusCamp && ` ${filtroStatusCamp === 'ACTIVE' ? 'ativas' : 'pausadas'}`}
              {campanhasFiltradas.length !== campanhasFiltradas2.length && ` (de ${campanhasFiltradas.length} total)`}
            </span>
          </div>
          <select value={filtroStatusCamp} onChange={e => setFiltroStatusCamp(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none">
            <option value="">Todas</option>
            <option value="ACTIVE">Ativas</option>
            <option value="PAUSED">Pausadas</option>
          </select>
        </div>

        {loadingCamp ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : campanhasFiltradas2.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              {eventoSel ? 'Nenhuma campanha encontrada para este evento' : 'Nenhuma campanha encontrada'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {campanhasFiltradas2.map(camp => {
              const isOpen = expandidos[camp.id]
              const st = camp.effective_status || camp.status || 'PAUSED'
              const ins = camp.insights || {}
              return (
                <div key={camp.id}>
                  {/* Campanha row */}
                  <div onClick={() => toggleCampanha(camp.id)} className="px-5 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition">
                    <div className="flex-shrink-0">
                      {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={'w-2 h-2 rounded-full flex-shrink-0 ' + (statusDot[st] || 'bg-gray-400')} />
                        <p className="text-sm font-bold text-gray-900 truncate">{camp.name}</p>
                        <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (statusColors[st] || 'bg-gray-100 text-gray-500')}>{st}</span>
                      </div>
                      {camp.objective && <p className="text-[10px] text-gray-400 ml-4">{camp.objective}</p>}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                      {ins.spend && <span className="font-bold text-green-600">{fmtMoney(ins.spend)}</span>}
                      {ins.impressions && <span>{fmtNum(ins.impressions)} imp</span>}
                      {ins.clicks && <span>{fmtNum(ins.clicks)} cliques</span>}
                      {ins.ctr && <span>{fmtPct(ins.ctr)} CTR</span>}
                      {camp.conversions > 0 && <span className="font-semibold text-purple-600">{camp.conversions} conv</span>}
                      {parseFloat(camp.roas) > 0 && <span className="font-semibold text-emerald-600">{camp.roas}x ROAS</span>}
                      {parseFloat(camp.cpa) > 0 && <span className="text-red-500">{fmtMoney(camp.cpa)} CPA</span>}
                    </div>
                  </div>

                  {/* AdSets */}
                  {isOpen && (
                    <div className="bg-gray-50/50">
                      {!adsets[camp.id] ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        </div>
                      ) : adsets[camp.id].length === 0 ? (
                        <p className="text-xs text-gray-400 px-12 py-3">Nenhum conjunto de anuncios</p>
                      ) : adsets[camp.id].map(as => {
                        const asOpen = expandidos['as-' + as.id]
                        const asSt = as.effective_status || as.status || 'PAUSED'
                        const asIns = as.insights || {}
                        return (
                          <div key={as.id}>
                            <div onClick={() => toggleAdset(as.id)} className="px-5 pl-12 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-gray-100/50 transition border-t border-gray-100">
                              <div className="flex-shrink-0">
                                {asOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + (statusDot[asSt] || 'bg-gray-400')} />
                                  <p className="text-xs font-bold text-gray-700 truncate">{as.name}</p>
                                  <span className={'text-[9px] font-bold px-1.5 py-0.5 rounded-full ' + (statusColors[asSt] || 'bg-gray-100 text-gray-500')}>{asSt}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-gray-500 flex-shrink-0">
                                {asIns.spend && <span className="font-bold text-green-600">{fmtMoney(asIns.spend)}</span>}
                                {asIns.impressions && <span>{fmtNum(asIns.impressions)} imp</span>}
                                {asIns.clicks && <span>{fmtNum(asIns.clicks)} cliq</span>}
                                {asIns.ctr && <span>{fmtPct(asIns.ctr)}</span>}
                              </div>
                            </div>

                            {/* Ads */}
                            {asOpen && (
                              <div className="bg-white/50">
                                {!ads[as.id] ? (
                                  <div className="flex items-center justify-center py-3">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                                  </div>
                                ) : ads[as.id].length === 0 ? (
                                  <p className="text-[11px] text-gray-400 px-20 py-2">Nenhum anuncio</p>
                                ) : ads[as.id].map(ad => {
                                  const adSt = ad.effective_status || ad.status || 'PAUSED'
                                  const adIns = ad.insights || {}
                                  const thumb = ad.creative?.thumbnail_url
                                  return (
                                    <div key={ad.id} className="px-5 pl-20 py-2 flex items-center gap-3 border-t border-gray-50 hover:bg-blue-50/30 transition">
                                      {thumb ? (
                                        <img src={thumb} className="w-10 h-10 rounded-lg object-cover border border-gray-200 flex-shrink-0" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                                          <ImageIcon size={14} className="text-gray-300" />
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span className={'w-1.5 h-1.5 rounded-full flex-shrink-0 ' + (statusDot[adSt] || 'bg-gray-400')} />
                                          <p className="text-[11px] font-bold text-gray-600 truncate">{ad.name}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-shrink-0">
                                        {adIns.spend && <span className="font-bold text-green-600">{fmtMoney(adIns.spend)}</span>}
                                        {adIns.impressions && <span>{fmtNum(adIns.impressions)} imp</span>}
                                        {adIns.clicks && <span>{fmtNum(adIns.clicks)} cliq</span>}
                                        {adIns.ctr && <span>{fmtPct(adIns.ctr)}</span>}
                                        {adIns.cpc && <span>{fmtMoney(adIns.cpc)}</span>}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* Analise de Criativos */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="font-bold text-gray-900">Analise de Criativos</h2>
            <span className="text-xs text-gray-400">
              {criativosFiltrados.length} anuncios
              {campanhaCriativoSel && campanhasUnicas.find(([id]) => id === campanhaCriativoSel) && ` - ${campanhasUnicas.find(([id]) => id === campanhaCriativoSel)[1]}`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={campanhaCriativoSel} onChange={e => setCampanhaCriativoSel(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none max-w-[220px]">
              <option value="">Todas as campanhas</option>
              {campanhasUnicas.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
            <button onClick={analisarCriativos} disabled={loadingIA || criativosFiltrados.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition disabled:opacity-50 shadow-sm">
              <Sparkles size={14} className={loadingIA ? 'animate-spin' : ''} />
              {loadingIA ? 'Analisando...' : 'Analise IA'}
            </button>
            <ArrowUpDown size={14} className="text-gray-400" />
            <select value={ordenarPor} onChange={e => setOrdenarPor(e.target.value)} className="px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 outline-none">
              <option value="spend">Maior gasto</option>
              <option value="ctr">Maior CTR</option>
              <option value="cpc">Maior CPC</option>
              <option value="impressions">Mais impressoes</option>
              <option value="clicks">Mais cliques</option>
              <option value="conversions">Mais conversoes</option>
              <option value="roas">Maior ROAS</option>
            </select>
          </div>
        </div>

        {/* Painel Analise IA */}
        {showAnalise && (
          <div className="border-b border-gray-100">
            <div className="px-5 py-3 flex items-center justify-between bg-blue-50/50 dark:bg-blue-500/10">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-bold text-blue-900 dark:text-blue-300">Analise IA dos Criativos</span>
              </div>
              <button onClick={() => setShowAnalise(false)} className="p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/10 transition">
                <X size={14} className="text-blue-400" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-[500px] overflow-y-auto">
              {loadingIA ? (
                <div className="flex items-center gap-3 py-8 justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-sm text-gray-500">Analisando {criativosFiltrados.length} criativos...</span>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: analiseIA
                    .replace(/## (.*)/g, '<h3 class="text-base font-bold text-gray-900 mt-4 mb-2">$1</h3>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900">$1</strong>')
                    .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
                    .replace(/^(\d+)\. (.*)/gm, '<li class="ml-4 list-decimal"><strong>$1.</strong> $2</li>')
                  }}
                />
              )}
            </div>
          </div>
        )}

        {loadingCriativos ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : criativosFiltrados.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Nenhum criativo encontrado</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {criativosFiltrados.map(cr => {
              const st = cr.effective_status || cr.status || 'PAUSED'
              const thumb = cr.creative?.thumbnail_url
              return (
                <div key={cr.id} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                  {/* Thumbnail */}
                  <div className="relative bg-gray-50 h-44 flex items-center justify-center cursor-pointer" onClick={() => thumb && setPreviewImg(thumb)}>
                    {thumb ? (
                      <img src={thumb} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={40} className="text-gray-200" />
                    )}
                    <span className={'absolute top-2 right-2 text-[9px] font-bold px-2 py-0.5 rounded-full ' + (statusColors[st] || 'bg-gray-100 text-gray-500')}>{st}</span>
                  </div>

                  {/* Info */}
                  <div className="p-3">
                    <p className="text-xs font-bold text-gray-900 truncate mb-0.5" title={cr.name}>{cr.name}</p>
                    <p className="text-[10px] text-gray-400 truncate mb-3" title={cr.campaign_name}>{cr.campaign_name}</p>

                    {/* Metricas grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">Gasto</p>
                        <p className="text-xs font-bold text-green-600">{fmtMoney(cr.spend)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">Imp</p>
                        <p className="text-xs font-bold text-blue-600">{fmtNum(cr.impressions)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">Cliques</p>
                        <p className="text-xs font-bold text-blue-600">{fmtNum(cr.clicks)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">CTR</p>
                        <p className="text-xs font-bold text-blue-600">{fmtPct(cr.ctr)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">CPC</p>
                        <p className="text-xs font-bold text-amber-600">{fmtMoney(cr.cpc)}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 uppercase">CPM</p>
                        <p className="text-xs font-bold text-amber-600">{fmtMoney(cr.cpm)}</p>
                      </div>
                      {cr.conversions > 0 && (
                        <>
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase">Conv</p>
                            <p className="text-xs font-bold text-purple-600">{cr.conversions}</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase">ROAS</p>
                            <p className="text-xs font-bold text-emerald-600">{cr.roas}x</p>
                          </div>
                          <div>
                            <p className="text-[9px] text-gray-400 uppercase">CPA</p>
                            <p className="text-xs font-bold text-red-500">{fmtMoney(cr.cpa)}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Preview de imagem */}
      {previewImg && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)} className="absolute top-4 right-4 p-2 bg-white/20 rounded-full hover:bg-white/40 transition">
            <X size={20} className="text-white" />
          </button>
          <img src={previewImg} className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  )
}
