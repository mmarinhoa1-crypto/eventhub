import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Megaphone, Calendar, MapPin, Instagram, Palette, Users, Edit3, Save, X, Plus, ArrowLeft, Shield, Trash2, Pencil, Clock, CheckCircle, ArrowRight, FileText, RotateCcw, ChevronRight, ChevronLeft, Filter, ClipboardList, AlertCircle, Paperclip, Send } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import MarketingTab from '../components/eventos/MarketingTab'

const kanbanColumns = [
  { key: 'pendente', label: 'Pendente', gradient: 'from-yellow-400 to-orange-500' },
  { key: 'em_andamento', label: 'Em Produção', gradient: 'from-blue-400 to-blue-600' },
  { key: 'em_revisao', label: 'Revisão', gradient: 'from-blue-400 to-blue-600' },
  { key: 'aprovado', label: 'Aprovado', gradient: 'from-green-400 to-emerald-600' },
  { key: 'publicado', label: 'Publicado', gradient: 'from-teal-400 to-cyan-600' },
]

export default function MarketingPage() {
  const [eventos, setEventos] = useState([])
  const { usuario } = useAuth()
  const funcao = usuario?.funcao || 'viewer'
  const isDesigner = funcao === 'designer'
  const isSocialMedia = funcao === 'social_media'
  const isAdmin = funcao === 'admin'
  const isDiretor = funcao === 'diretor'
  const canCreateEvent = !isDesigner && !isSocialMedia
  const canEditName = isAdmin || isDiretor
  const canDelete = isAdmin || isDiretor
  const [loading, setLoading] = useState(true)
  const [filtroMkt, setFiltroMkt] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const [eventoAberto, setEventoAberto] = useState(null)
  const [activePageTab, setActivePageTab] = useState('eventos')
  const [allPlanejamentos, setAllPlanejamentos] = useState([])
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [showPast, setShowPast] = useState(false)
  const [allBriefings, setAllBriefings] = useState([])
  const [loadingBriefings, setLoadingBriefings] = useState(false)
  const [filtroBriefingEvento, setFiltroBriefingEvento] = useState('')
  const [buscaBriefing, setBuscaBriefing] = useState('')
  const [demandas, setDemandas] = useState({ briefings: [], posts: [], eventos: [] })
  const [loadingDemandas, setLoadingDemandas] = useState(false)
  const [demandaEvento, setDemandaEvento] = useState('')
  const [demandaStatus, setDemandaStatus] = useState('todas')
  const [demandaWeekOffset, setDemandaWeekOffset] = useState(0)
  const [demandaDetalhe, setDemandaDetalhe] = useState(null)
  const [demandaArquivos, setDemandaArquivos] = useState([])
  const [demandaCardArqs, setDemandaCardArqs] = useState({})

  function abrirEvento(id, tab) {
    setEventoAberto(id)
    const params = new URLSearchParams(searchParams)
    if (id) { params.set('evento', id) } else { params.delete('evento') }
    if (tab) { params.set('tab', tab); setActivePageTab(tab) } else { const t = params.get('tab'); if (!id && !t) params.delete('tab') }
    setSearchParams(params, { replace: true })
  }

  function mudarTab(tab) {
    setActivePageTab(tab)
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    params.delete('evento')
    setSearchParams(params, { replace: true })
  }

  useEffect(() => {
    const evId = searchParams.get('evento')
    const tab = searchParams.get('tab')
    if (evId) setEventoAberto(Number(evId))
    if (tab) setActivePageTab(tab)
  }, [])

  useEffect(() => {
    if (eventos.length > 0) carregarIgConnections()
  }, [eventos])
  const [editando, setEditando] = useState(null)
  const [editandoNome, setEditandoNome] = useState(null)
  const [nomeEdit, setNomeEdit] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [igConnectEvento, setIgConnectEvento] = useState(null)
  const [igTokenInput, setIgTokenInput] = useState('')
  const [savingIG, setSavingIG] = useState(false)
  const [igConnections, setIgConnections] = useState({})
  const [igAccounts, setIgAccounts] = useState([])

  async function carregarIgConnections() {
    try {
      const { data } = await api.get('/instagram/accounts')
      setIgAccounts(data)
    } catch {}
    for (const ev of eventos) {
      try {
        const { data } = await api.get('/eventos/' + ev.id + '/instagram')
        if (data) setIgConnections(prev => ({...prev, [ev.id]: data}))
      } catch {}
    }
  }

  async function conectarIGToken() {
    if (!igTokenInput.trim()) return toast.error('Cole o token')
    setSavingIG(true)
    try {
      // 1. Adicionar conta
      const { data: acc } = await api.post('/instagram/accounts', { access_token: igTokenInput.trim() })
      // 2. Buscar contas pra pegar o ID
      const { data: contas } = await api.get('/instagram/accounts')
      const conta = contas.find(c => c.ig_username === acc.username)
      if (conta) {
        // 3. Vincular ao evento
        await api.post('/eventos/' + igConnectEvento + '/instagram/connect', { account_id: conta.id })
      }
      toast.success('Instagram conectado: @' + acc.username)
      setIgConnections(prev => ({...prev, [igConnectEvento]: { ig_username: acc.username }}))
      setIgAccounts(contas)
      setIgConnectEvento(null)
      setIgTokenInput('')
    } catch(err) {
      toast.error(err.response?.data?.erro || 'Token inválido')
    } finally { setSavingIG(false) }
  }

  async function desconectarInstagram(eventoId) {
    if (!confirm('Desconectar Instagram deste evento?')) return
    try {
      await api.delete('/eventos/' + eventoId + '/instagram')
      setIgConnections(prev => { const n = {...prev}; delete n[eventoId]; return n })
      toast.success('Instagram desconectado')
    } catch { toast.error('Erro ao desconectar') }
  }

  async function conectarIGConta(eventoId, accountId) {
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/instagram/connect', { account_id: accountId })
      toast.success('Conectado: @' + data.username)
      setIgConnections(prev => ({...prev, [eventoId]: { ig_username: data.username }}))
      setIgConnectEvento(null)
    } catch(err) {
      toast.error(err.response?.data?.erro || 'Erro ao conectar')
    }
  }
  const [criando, setCriando] = useState(false)
  const [novo, setNovo] = useState({nome:'',data_evento:'',cidade:'',instagram:'',designer_id:'',social_media_id:'',diretor_id:''})
  const [form, setForm] = useState({})
  const [designers, setDesigners] = useState([])
  const [socialMedias, setSocialMedias] = useState([])
  const [diretores, setDiretores] = useState([])

  useEffect(() => {
    loadEventos()
    if (isAdmin || isDiretor) {
      api.get('/eventos').then(r => {
        Promise.all(r.data.map(ev => api.get('/eventos/' + ev.id + '/planejamentos').then(res => res.data.map(p => ({...p, evento_nome: ev.nome, evento_id: ev.id}))).catch(() => []))).then(results => setAllPlanejamentos(results.flat()))
      }).catch(() => {})
    }
    api.get('/equipe/por-funcao/designer').then(r => setDesigners(r.data)).catch(() => {})
    Promise.all([
      api.get('/equipe/por-funcao/social_media').catch(() => ({ data: [] })),
      api.get('/equipe/por-funcao/diretor').catch(() => ({ data: [] })),
    ]).then(([sm, dir]) => {
      setSocialMedias([...sm.data, ...dir.data])
      setDiretores(dir.data)
    })
  }, [])

  async function loadEventos() {
    try {
      const { data } = await api.get('/eventos')
      setEventos(data)
    } catch { toast.error('Erro ao carregar eventos') }
    finally { setLoading(false) }
  }

  async function loadAllPlanejamentos() {
    if (eventos.length === 0) return
    setLoadingPlan(true)
    try {
      const results = await Promise.all(eventos.map(ev => api.get('/eventos/' + ev.id + '/planejamentos').then(r => r.data.map(p => ({...p, evento_nome: ev.nome, evento_id: ev.id}))).catch(() => [])))
      setAllPlanejamentos(results.flat())
    } catch { console.error('Erro ao carregar planejamentos') }
    finally { setLoadingPlan(false) }
  }

  useEffect(() => {
    if (activePageTab === 'aprovacoes' && eventos.length > 0) loadAllPlanejamentos()
  }, [activePageTab, eventos])

  async function loadAllBriefings() {
    setLoadingBriefings(true)
    try {
      const { data } = await api.get('/briefings/todos')
      setAllBriefings(data)
    } catch { console.error('Erro ao carregar briefings') }
    finally { setLoadingBriefings(false) }
  }

  async function loadDemandas() {
    setLoadingDemandas(true)
    try {
      const { data } = await api.get('/minhas-demandas')
      setDemandas(data)
      // carregar arquivos dos cards
      data.briefings.forEach(b => loadDemandaCardArq('briefing', b.id))
      data.posts.forEach(p => loadDemandaCardArq('post', p.id))
    } catch { console.error('Erro ao carregar demandas') }
    finally { setLoadingDemandas(false) }
  }

  async function loadDemandaCardArq(tipo, id) {
    try {
      const endpoint = tipo === 'briefing' ? '/briefings/' + id + '/arquivos' : '/cronograma/' + id + '/arquivos'
      const { data } = await api.get(endpoint)
      setDemandaCardArqs(prev => ({...prev, [tipo + '-' + id]: data}))
    } catch {}
  }

  async function uploadDemandaArq(tipo, id, file) {
    const tid = toast.loading('Enviando ' + file.name + '...')
    try {
      const fd = new FormData()
      fd.append('arquivo', file)
      const endpoint = tipo === 'briefing' ? '/briefings/' + id + '/arquivos' : '/cronograma/' + id + '/arquivos'
      await api.post(endpoint, fd, { timeout: 600000 })
      toast.success('Arquivo enviado!', { id: tid })
      loadDemandaCardArq(tipo, id)
    } catch(err) { toast.error('Erro: ' + (err.response?.data?.erro || err.message), { id: tid }) }
  }

  async function atualizarDemandaStatus(tipo, id, novoStatus) {
    try {
      if (tipo === 'briefing') await api.patch('/briefings/' + id, { status: novoStatus })
      else await api.patch('/cronograma/' + id, { status: novoStatus })
      toast.success('Status atualizado!')
      loadDemandas()
    } catch { toast.error('Erro ao atualizar') }
  }

  async function loadDemandaDetalheArqs(item) {
    try {
      const endpoint = item._tipo === 'briefing' ? '/briefings/' + item.id + '/arquivos' : '/cronograma/' + item.id + '/arquivos'
      const { data } = await api.get(endpoint)
      setDemandaArquivos(data)
    } catch { setDemandaArquivos([]) }
  }

  const demandasFiltradas = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0]
    const linkedPostIds = new Set(demandas.briefings.filter(b => b.cronograma_id).map(b => b.cronograma_id))
    let items = [
      ...demandas.briefings.map(b => ({...b, _tipo: 'briefing', _data: b.data_vencimento})),
      ...demandas.posts.filter(p => !linkedPostIds.has(p.id)).map(p => ({...p, _tipo: 'post', _data: p.data_publicacao}))
    ]
    if (demandaEvento) items = items.filter(d => d.id_evento === parseInt(demandaEvento))
    if (demandaStatus === 'pendentes') items = items.filter(d => ['pendente','em_andamento'].includes(d.status))
    else if (demandaStatus === 'atrasadas') items = items.filter(d => { const dt = d._data?.slice(0,10); return dt && dt < hoje && !['concluido','aprovado','publicado','cancelado'].includes(d.status) })
    else if (demandaStatus === 'aprovados') items = items.filter(d => ['aprovado','publicado','concluido'].includes(d.status))
    return items
  }, [demandas, demandaEvento, demandaStatus])

  const demandaStats = useMemo(() => {
    const hoje = new Date().toISOString().split('T')[0]
    const linkedPostIds = new Set(demandas.briefings.filter(b => b.cronograma_id).map(b => b.cronograma_id))
    const all = [
      ...demandas.briefings.map(b => ({...b, _tipo:'briefing', _data: b.data_vencimento})),
      ...demandas.posts.filter(p => !linkedPostIds.has(p.id)).map(p => ({...p, _tipo:'post', _data: p.data_publicacao}))
    ]
    return {
      total: all.length,
      pendentes: all.filter(d => ['pendente','em_andamento'].includes(d.status)).length,
      atrasados: all.filter(d => { const dt = d._data?.slice(0,10); return dt && dt < hoje && !['concluido','aprovado','publicado','cancelado'].includes(d.status) }).length,
      aprovados: all.filter(d => ['aprovado','publicado','concluido'].includes(d.status)).length,
    }
  }, [demandas])

  const briefingsFiltrados = useMemo(() => {
    let list = allBriefings
    if (filtroBriefingEvento) list = list.filter(b => b.id_evento === parseInt(filtroBriefingEvento))
    if (buscaBriefing.trim()) list = list.filter(b => b.titulo?.toLowerCase().includes(buscaBriefing.toLowerCase()) || b.descricao?.toLowerCase().includes(buscaBriefing.toLowerCase()) || b.evento_nome?.toLowerCase().includes(buscaBriefing.toLowerCase()))
    return list
  }, [allBriefings, filtroBriefingEvento, buscaBriefing])

  async function criarEvento() {
    if(!novo.nome) return toast.error('Nome do evento obrigatório')
    try {
      await api.post('/eventos', novo)
      toast.success('Evento criado!')
      setCriando(false)
      setNovo({nome:'',data_evento:'',cidade:'',instagram:'',designer_id:'',social_media_id:'',diretor_id:''})
      loadEventos()
    } catch { toast.error('Erro ao criar evento') }
  }

  function startEdit(ev, e) {
    e.stopPropagation()
    setEditando(ev.id)
    setForm({ nome: ev.nome || '', data_evento: ev.data_evento || '', cidade: ev.cidade || '', instagram: ev.instagram || '', designer_id: ev.designer_id || '', social_media_id: ev.social_media_id || '', diretor_id: ev.diretor_id || '' })
  }

  async function salvarEdit(id, e) {
    e.stopPropagation()
    try {
      const payload = {
        instagram: form.instagram,
        data_evento: form.data_evento,
        cidade: form.cidade,
        designer_id: form.designer_id ? Number(form.designer_id) : null,
        social_media_id: form.social_media_id ? Number(form.social_media_id) : null,
        diretor_id: form.diretor_id ? Number(form.diretor_id) : null,
      }
      if (canEditName && form.nome) payload.nome = form.nome
      await api.patch('/eventos/' + id, payload)
      toast.success('Salvo!')
      setEditando(null)
      loadEventos()
    } catch { toast.error('Erro ao salvar') }
  }

  async function salvarNome(id, e) {
    e.stopPropagation()
    if (!nomeEdit.trim()) return toast.error('Nome não pode ser vazio')
    try {
      await api.patch('/eventos/' + id, { nome: nomeEdit.trim() })
      toast.success('Nome atualizado!')
      setEditandoNome(null)
      loadEventos()
    } catch { toast.error('Erro ao atualizar nome') }
  }

  async function excluirEvento(id, e) {
    e.stopPropagation()
    try {
      await api.delete('/eventos/' + id)
      toast.success('Evento excluído!')
      setConfirmDelete(null)
      loadEventos()
    } catch(err) { toast.error(err.response?.data?.erro || 'Erro ao excluir evento') }
  }

  function getNome(id, lista) {
    const u = lista.find(u => u.id === id)
    return u ? u.nome : null
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  if (eventoAberto) {
    const ev = eventos.find(e => e.id === eventoAberto)
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button onClick={() => setEventoAberto(null)} className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 transition">
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 logo-gradient rounded-xl">
              <Megaphone size={20} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <select value={eventoAberto} onChange={e => abrirEvento(Number(e.target.value))} className="text-xl font-bold text-gray-900 bg-white border border-gray-200 rounded-xl outline-none cursor-pointer pl-3 pr-10 py-1.5 hover:border-blue-300 focus:ring-2 focus:ring-accent focus:border-accent transition">
                  {eventos.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {ev?.data_evento && <span className="flex items-center gap-1"><Calendar size={11} /> {ev.data_evento}</span>}
                {ev?.cidade && <span className="flex items-center gap-1"><MapPin size={11} /> {ev.cidade}</span>}
                {ev?.instagram && <span className="flex items-center gap-1"><Instagram size={11} /> {ev.instagram}</span>}
              </div>
            </div>
          </div>
        </div>
        <MarketingTab eventoId={eventoAberto} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
            <Megaphone size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
            <p className="text-sm text-gray-500">{activePageTab === 'eventos' ? 'Selecione um evento para gerenciar briefings' : 'Aprovações de planejamentos de todos os eventos'}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button onClick={() => mudarTab('eventos')} className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition ' + (activePageTab === 'eventos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <Megaphone size={16} /> Eventos
        </button>
        {(isAdmin || isDiretor) && (
          <button onClick={() => mudarTab('aprovacoes')} className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition relative ' + (activePageTab === 'aprovacoes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
            <CheckCircle size={16} /> Aprovações
            {allPlanejamentos.filter(p => p.status === 'enviado').length > 0 && activePageTab !== 'aprovacoes' && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{allPlanejamentos.filter(p => p.status === 'enviado').length}</span>
            )}
          </button>
        )}
      </div>

      {activePageTab === 'aprovacoes' && (isAdmin || isDiretor) ? (
        <div className="space-y-4">
          {loadingPlan ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
          ) : (
            <>
              {/* Pendentes */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-orange-50 to-yellow-50">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-orange-500 dark:text-orange-400" />
                    <h3 className="font-bold text-gray-900 dark:text-white/90">Aguardando Aprovação</h3>
                  </div>
                  <span className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 text-xs font-bold px-3 py-1 rounded-full">{allPlanejamentos.filter(p => p.status === 'enviado').length}</span>
                </div>
                {allPlanejamentos.filter(p => p.status === 'enviado').length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle size={24} className="text-green-500 dark:text-green-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600">Tudo aprovado!</p>
                    <p className="text-xs text-gray-400 mt-1">Nenhum planejamento pendente de aprovação</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {allPlanejamentos.filter(p => p.status === 'enviado').map(p => (
                      <div key={p.id} onClick={() => setEventoAberto(p.evento_id)} className="p-4 hover:bg-orange-50/50 dark:hover:bg-orange-500/10 cursor-pointer transition group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-blue-500 flex items-center justify-center shadow-sm">
                              <Calendar size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{p.evento_nome}</p>
                              <p className="text-xs text-gray-500">{new Date(p.semana_inicio + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a {new Date(p.semana_fim + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {p.criado_por_nome && <span className="text-xs text-gray-400">por {p.criado_por_nome}</span>}
                            <span className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 text-[11px] font-bold px-2.5 py-1 rounded-full">Aguardando</span>
                            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition" />
                          </div>
                        </div>
                        {p.estrategia && <p className="text-xs text-gray-400 mt-2 ml-14 line-clamp-1">{p.estrategia}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Em Revisão */}
              {allPlanejamentos.filter(p => p.status === 'revisao').length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-violet-50 to-violet-50">
                    <div className="flex items-center gap-2">
                      <RotateCcw size={18} className="text-blue-500" />
                      <h3 className="font-bold text-gray-900">Em Revisão</h3>
                    </div>
                    <span className="bg-violet-100 text-violet-700 text-xs font-bold px-3 py-1 rounded-full">{allPlanejamentos.filter(p => p.status === 'revisao').length}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {allPlanejamentos.filter(p => p.status === 'revisao').map(p => (
                      <div key={p.id} onClick={() => setEventoAberto(p.evento_id)} className="p-4 hover:bg-violet-50/50 cursor-pointer transition group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-sm">
                              <RotateCcw size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{p.evento_nome}</p>
                              <p className="text-xs text-gray-500">{new Date(p.semana_inicio + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a {new Date(p.semana_fim + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-violet-100 text-violet-700 text-[11px] font-bold px-2.5 py-1 rounded-full">Em Revisão</span>
                            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aprovados recentes */}
              {allPlanejamentos.filter(p => p.status === 'aprovado').length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-500 dark:text-green-400" />
                      <h3 className="font-bold text-gray-900 dark:text-white/90">Aprovados</h3>
                    </div>
                    <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-xs font-bold px-3 py-1 rounded-full">{allPlanejamentos.filter(p => p.status === 'aprovado').length}</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {allPlanejamentos.filter(p => p.status === 'aprovado').map(p => (
                      <div key={p.id} onClick={() => setEventoAberto(p.evento_id)} className="p-4 hover:bg-green-50/50 dark:hover:bg-green-500/10 cursor-pointer transition group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                              <CheckCircle size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{p.evento_nome}</p>
                              <p className="text-xs text-gray-500">{new Date(p.semana_inicio + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a {new Date(p.semana_fim + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 text-[11px] font-bold px-2.5 py-1 rounded-full">Aprovado</span>
                            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
      <>
      <div className="flex gap-2 items-center">
        <input value={filtroMkt} onChange={e => setFiltroMkt(e.target.value)} placeholder="Buscar evento..." className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
        {filtroMkt && <button onClick={() => setFiltroMkt('')} className="text-xs text-gray-400 hover:text-gray-600">Limpar</button>}
      </div>

      {(() => {
        const hoje = new Date().toISOString().split('T')[0]
        const filtrados = eventos.filter(ev => !filtroMkt || ev.nome.toLowerCase().includes(filtroMkt.toLowerCase()) || (ev.cidade||'').toLowerCase().includes(filtroMkt.toLowerCase()))
        const futuros = filtrados.filter(ev => !ev.data_evento || ev.data_evento >= hoje)
        const passados = filtrados.filter(ev => ev.data_evento && ev.data_evento < hoje)

        function fmtData(data) {
          if (!data) return ''
          const [y,m,d] = data.split('-')
          const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
          return d + ' ' + meses[parseInt(m)-1] + ', ' + y
        }

        function diasFaltam(data) {
          if (!data) return null
          const d = new Date(data + 'T12:00')
          const h = new Date()
          h.setHours(12,0,0,0)
          const diff = Math.ceil((d - h) / (1000*60*60*24))
          if (diff === 0) return 'Hoje'
          if (diff === 1) return 'Amanha'
          return diff + ' dias'
        }

        function renderEvento(ev, isPast) {
          const dias = diasFaltam(ev.data_evento)
          return (
            <div key={ev.id} className={'bg-white rounded-2xl border overflow-hidden transition-all ' + (isPast ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:shadow-md hover:border-blue-200')}>
              {confirmDelete === ev.id && (
                <div className="bg-red-50 dark:bg-red-500/10 border-b border-red-200 dark:border-red-500/30 px-4 py-2.5 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-red-700 dark:text-red-400 font-medium">Excluir evento e todos os dados?</span>
                  <div className="flex gap-2">
                    <button onClick={(e) => excluirEvento(ev.id, e)} className="px-2.5 py-1 bg-red-500 text-white rounded-lg text-[10px] font-semibold hover:bg-red-600 transition">Confirmar</button>
                    <button onClick={(e) => {e.stopPropagation(); setConfirmDelete(null)}} className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-semibold hover:bg-gray-200 transition">Cancelar</button>
                  </div>
                </div>
              )}
              {editando === ev.id ? (
                <div className="p-4 space-y-2.5" onClick={e => e.stopPropagation()}>
                  {canEditName && <input value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} placeholder="Nome do evento" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-accent outline-none" />}
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={form.data_evento} onChange={e => setForm({...form, data_evento: e.target.value})} className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none" />
                    <input value={form.cidade} onChange={e => setForm({...form, cidade: e.target.value})} placeholder="Cidade" className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none" />
                  </div>
                  <input value={form.instagram} onChange={e => setForm({...form, instagram: e.target.value})} placeholder="@instagram" className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none" />
                  <div className="grid grid-cols-3 gap-2">
                    <select value={form.designer_id} onChange={e => setForm({...form, designer_id: e.target.value})} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none"><option value="">Designer</option>{designers.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
                    <select value={form.social_media_id} onChange={e => setForm({...form, social_media_id: e.target.value})} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none"><option value="">Social Media</option>{socialMedias.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select>
                    <select value={form.diretor_id} onChange={e => setForm({...form, diretor_id: e.target.value})} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:ring-2 focus:ring-accent outline-none"><option value="">Diretor</option>{diretores.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}</select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={(e) => salvarEdit(ev.id, e)} className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition"><Save size={12} /> Salvar</button>
                    <button onClick={(e) => {e.stopPropagation(); setEditando(null)}} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200 transition"><X size={12} /> Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="cursor-pointer flex items-center" onClick={() => abrirEvento(ev.id)}>
                  <div className={'w-1.5 self-stretch rounded-l-2xl flex-shrink-0 ' + (isPast ? 'bg-gray-300' : '')} style={isPast ? {} : {background:'linear-gradient(180deg, #2563eb, #3b82f6)'}} />
                  <div className="flex-1 px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="min-w-0">
                        <h4 className={'font-bold text-base truncate ' + (isPast ? 'text-gray-500' : 'text-gray-900')}>{ev.nome}</h4>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {ev.data_evento && <span className="flex items-center gap-1 text-xs text-gray-400"><Calendar size={12} /> {fmtData(ev.data_evento)}</span>}
                          {ev.cidade && <span className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={12} /> {ev.cidade}</span>}
                          {igConnections[ev.id] && <span className="flex items-center gap-1 text-xs text-pink-500 font-semibold"><Instagram size={12} /> @{igConnections[ev.id].ig_username}<button onClick={(e) => { e.stopPropagation(); desconectarInstagram(ev.id) }} className="ml-1 p-0.5 rounded-full text-pink-300 hover:text-red-500 hover:bg-red-50 transition" title="Desconectar Instagram"><X size={10} /></button></span>}
                          {getNome(ev.designer_id, designers) && <span className="flex items-center gap-1 text-xs text-gray-400"><Palette size={12} className="text-violet-400" /> {getNome(ev.designer_id, designers)}</span>}
                          {getNome(ev.social_media_id, socialMedias) && <span className="flex items-center gap-1 text-xs text-gray-400"><Users size={12} className="text-blue-400" /> {getNome(ev.social_media_id, socialMedias)}</span>}
                          {!isPast && dias && (
                            <span className={'text-xs font-bold px-2.5 py-0.5 rounded-full ' + (dias === 'Hoje' ? 'bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30' : dias === 'Amanha' ? 'bg-orange-50 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30' : 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-500/30')}>
                              {dias === 'Hoje' || dias === 'Amanha' ? dias : 'Faltam ' + dias}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {!isPast && !igConnections[ev.id] && (
                        <button onClick={(e) => { e.stopPropagation(); setIgConnectEvento(ev.id) }} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/30 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition" title="Conectar Instagram">
                          <Instagram size={12} className="text-purple-500 dark:text-purple-400" />
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hidden lg:inline">Conectar</span>
                        </button>
                      )}
                      {canCreateEvent && (
                        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                          <button onClick={(e) => startEdit(ev, e)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition"><Edit3 size={13} /></button>
                          {canDelete && <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(ev.id) }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 size={13} /></button>}
                        </div>
                      )}
                      <ChevronRight size={18} className={'transition ' + (isPast ? 'text-gray-300' : 'text-gray-300 group-hover:text-blue-500')} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        }

        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {passados.length > 0 && (
                <button onClick={() => setShowPast(true)} className={'px-4 py-2 rounded-xl text-sm font-bold transition-all ' + (showPast ? 'bg-gray-600 text-white shadow' : 'bg-white text-gray-400 border border-gray-200 hover:text-gray-600')}>
                  Passados <span className={'ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ' + (showPast ? 'bg-white/20' : 'bg-gray-100 text-gray-500')}>{passados.length}</span>
                </button>
              )}
              <button onClick={() => setShowPast(false)} className={'px-4 py-2 rounded-xl text-sm font-bold transition-all ' + (!showPast ? 'bg-accent text-white shadow' : 'bg-white dark:bg-white/[0.05] text-gray-500 dark:text-white/50 border border-gray-200 dark:border-white/[0.08] hover:text-gray-700 dark:hover:text-white/80')}>
                Proximos Eventos <span className={'ml-1 text-xs font-bold px-1.5 py-0.5 rounded-full ' + (!showPast ? 'bg-white/20' : 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400')}>{futuros.length}</span>
              </button>
            </div>
            {!showPast ? (
              futuros.length > 0 ? (
                <div className="space-y-2">{futuros.map(ev => renderEvento(ev, false))}</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16"><Calendar size={32} className="text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">Nenhum evento futuro</p></div>
              )
            ) : (
              passados.length > 0 ? (
                <div className="space-y-2">{passados.map(ev => renderEvento(ev, true))}</div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 text-center py-16"><Calendar size={32} className="text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">Nenhum evento passado</p></div>
              )
            )}
          </div>
        )
      })()}



    {/* Modal Conectar Instagram */}
    {igConnectEvento && (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { setIgConnectEvento(null); setIgTokenInput('') }}>
        <div className="bg-white dark:bg-[rgba(19,19,22,0.98)] rounded-2xl max-w-sm w-full max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b dark:border-white/[0.08] bg-gradient-to-r from-violet-50 to-violet-50 dark:from-violet-500/10 dark:to-violet-500/10 flex items-center justify-between rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Instagram size={18} className="text-blue-500 dark:text-blue-400" />
              <h3 className="font-bold text-gray-900 dark:text-white/90 text-sm">Conectar Instagram</h3>
            </div>
            <button onClick={() => { setIgConnectEvento(null); setIgTokenInput('') }} className="w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </div>
          <div className="p-4 space-y-3">
            {/* Contas já cadastradas */}
            {igAccounts.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase mb-2">Contas cadastradas</p>
                <div className="space-y-1.5">
                  {igAccounts.map(acc => (
                    <div key={acc.id} onClick={() => conectarIGConta(igConnectEvento, acc.id)} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-violet-50/50 transition cursor-pointer group">
                      <div className="flex items-center gap-2">
                        {acc.profile_picture ? (
                          <img src={acc.profile_picture} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">{(acc.ig_username||'?')[0].toUpperCase()}</div>
                        )}
                        <span className="text-xs font-bold text-gray-900">@{acc.ig_username}</span>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-blue-500 transition" />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 border-t border-gray-200" />
                  <span className="text-[9px] text-gray-400 font-semibold uppercase">ou nova conta</span>
                  <div className="flex-1 border-t border-gray-200" />
                </div>
              </div>
            )}

            {/* Token manual */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-[10px] text-gray-500 leading-relaxed mb-2">
                <strong>Gerar token:</strong> developers.facebook.com → App → Instagram → Gerar Token
              </p>
              <textarea
                value={igTokenInput}
                onChange={e => setIgTokenInput(e.target.value)}
                placeholder="Cole o token aqui..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono focus:ring-2 focus:ring-accent outline-none resize-none bg-white"
              />
              <button onClick={conectarIGToken} disabled={savingIG || !igTokenInput.trim()} className={'w-full mt-2 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ' + (savingIG ? 'bg-gray-300 text-gray-500' : !igTokenInput.trim() ? 'bg-gray-200 text-gray-400' : 'bg-accent text-white hover:bg-accent/90 shadow-sm')}>
                <Instagram size={12} /> {savingIG ? 'Verificando...' : 'Conectar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    </>
    )}
    </div>
  )
}
