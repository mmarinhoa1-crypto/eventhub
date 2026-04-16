import { useState, useEffect, useRef } from 'react'
import { Calendar, Clock, CheckCircle, AlertCircle, FileText, Palette, Megaphone, ArrowRight, X as XIcon, Paperclip, ChevronLeft, ChevronRight, ChevronDown, Plus, FolderOpen, Download, Search } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useTema } from '../contexts/ThemeContext'

const statusColors = {
  pendente:     'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30',
  em_andamento: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  em_revisao:   'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30',
  concluido:    'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
  aprovado:     'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30',
  publicado:    'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
  postado:      'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30',
  cancelado:    'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/40 border-gray-200 dark:border-white/[0.08]',
}

const statusLabels = {
  pendente: 'Pendente',
  em_andamento: 'Em Producao',
  em_revisao: 'Em Revisao',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
}

const tipoConteudoConfig = {
  'GIF': { icon: '✨', color: 'bg-amber-100 text-amber-700' },
  'VIDEO': { icon: '🎬', color: 'bg-red-100 text-red-700' },
  'ESTATICA': { icon: '🖼️', color: 'bg-blue-100 text-blue-700' },
  'FOTO ORGÂNICA': { icon: '📸', color: 'bg-green-100 text-green-700' },
  'VÍDEO ORGÂNICO': { icon: '🎞️', color: 'bg-orange-100 text-orange-700' },
  'INTERAÇÃO': { icon: '💬', color: 'bg-blue-100 text-blue-700' },
}

const formatoConfig = {
  'FEED': { icon: '📱', color: 'bg-blue-100 text-blue-700' },
  'STORIES': { icon: '📲', color: 'bg-blue-100 text-blue-700' },
  'CARROSSEL': { icon: '🔄', color: 'bg-cyan-100 text-cyan-700' },
  'REELS': { icon: '🎥', color: 'bg-rose-100 text-rose-700' },
}

const ETIQUETAS_PADRAO = [
  { key: 'urgente',   label: 'Urgente',    color: '#dc2626', bg: '#fef2f2', border: '#fecaca',   darkColor: '#f87171', darkBg: 'rgba(220,38,38,0.18)',   darkBorder: 'rgba(220,38,38,0.35)' },
  { key: 'pausa',     label: 'Pausa',      color: '#d97706', bg: '#fffbeb', border: '#fde68a',   darkColor: '#fbbf24', darkBg: 'rgba(217,119,6,0.18)',   darkBorder: 'rgba(217,119,6,0.35)' },
  { key: 'em_foco',   label: 'Em Foco',    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',   darkColor: '#a78bfa', darkBg: 'rgba(124,58,237,0.18)',  darkBorder: 'rgba(124,58,237,0.35)' },
  { key: 'organico',  label: 'Orgânico',   color: '#10b981', bg: '#ecfdf5', border: '#a7f3d0',   darkColor: '#34d399', darkBg: 'rgba(16,185,129,0.18)',  darkBorder: 'rgba(16,185,129,0.35)' },
  { key: 'impresso',  label: 'Impresso',   color: '#ea580c', bg: '#fff7ed', border: '#fdba74',   darkColor: '#fb923c', darkBg: 'rgba(234,88,12,0.18)',  darkBorder: 'rgba(234,88,12,0.35)' },
]

const TAGS_STATUS = [
  { key: 'atrasado',      label: 'Atrasado',      color: '#BE0000' },
  { key: 'nao_entregue',  label: 'Não Entregue',  color: '#7f1d1d' },
  { key: 'pendente',      label: 'Pendente',      color: '#FFA447' },
  { key: 'em_andamento',  label: 'Em Andamento',  color: '#FFDE42' },
  { key: 'recebido',      label: 'Recebido',      color: '#5459AC' },
  { key: 'alteracao',     label: 'Alteração',     color: '#dc0f72' },
  { key: 'aprovado',      label: 'Aprovado',      color: '#e49bcb' },
  { key: 'publicado',     label: 'Publicado',     color: '#6FAF4F' },
]

// Mapeamento automático: status da API → tag key
const STATUS_TO_TAG = {
  pendente: 'pendente',
  em_andamento: 'em_andamento',
  em_producao: 'em_andamento',
  em_revisao: 'recebido',
  aprovado: 'aprovado',
  publicado: 'publicado',
  concluido: 'publicado',
}

export default function MinhasDemandas() {
  const { usuario } = useAuth()
  const { tema } = useTema()
  const isDark = tema === 'dark'
  const funcao = usuario?.funcao || 'viewer'
  const isDesigner = funcao === 'designer'
  const isSocialMedia = funcao === 'social_media'
  const isAdmin = funcao === 'admin'
  const isDiretor = funcao === 'diretor'
  const isGestorTrafego = funcao === 'gestor_trafego'
  const isReadOnly = isGestorTrafego
  const isDateReadOnly = isGestorTrafego || isDesigner
  const isGestor = isAdmin || isDiretor || isGestorTrafego

  const [data, setData] = useState({ briefings: [], posts: [], eventos: [] })
  const [equipe, setEquipe] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todas')
  const [filtroEvento, setFiltroEvento] = useState('todos')
  const [filtroMembro, setFiltroMembro] = useState('todos')
  const [filtroFuncao, setFiltroFuncao] = useState('todos')
  const [filtroStatusAdmin, setFiltroStatusAdmin] = useState('todos')
  const [evDropOpen, setEvDropOpen] = useState(false)
  const [evSearch, setEvSearch] = useState('')
  const [filtroBusca, setFiltroBusca] = useState('')
  const [view, setView] = useState('calendario')
  const [detalhe, setDetalhe] = useState(null)
  const [arquivos, setArquivos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [adminDetalhe, setAdminDetalhe] = useState(null)
  const [adminArquivos, setAdminArquivos] = useState([])
  const [adminLoadArqs, setAdminLoadArqs] = useState(false)
  const [adminEditMode, setAdminEditMode] = useState(false)
  const [adminEditForm, setAdminEditForm] = useState({})
  const [adminMonthDate, setAdminMonthDate] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1) })
  const calendarScrollRef = useRef(null)
  const [calendarDate, setCalendarDate] = useState(new Date())
  // eslint-disable-next-line no-unused-vars
  const [_calendarFilter, setCalendarFilter] = useState('todos')
  const [cardArquivos, setCardArquivos] = useState({})
  const [previewArquivo, setPreviewArquivo] = useState(null)
  const [previewArquivoList, setPreviewArquivoList] = useState([])
  const [previewArquivoIndex, setPreviewArquivoIndex] = useState(0)
  const [adminRefArquivos, setAdminRefArquivos] = useState([])
  const [refArquivos, setRefArquivos] = useState([])
  const [boostingId, setBoostingId] = useState(null)
  const [showBoostConfig, setShowBoostConfig] = useState(null)
  const [boostForm, setBoostForm] = useState({ budget: 2000, duration: 3, age_min: 18, age_max: 45, cities: '' })
  const [showNovoPost, setShowNovoPost] = useState(false)
  const [comentarios, setComentarios] = useState([])
  const [novoComentario, setNovoComentario] = useState('')
  const [adminComentarios, setAdminComentarios] = useState([])
  const [adminNovoComentario, setAdminNovoComentario] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)
  const [dragOverDay, setDragOverDay] = useState(null)
  const [cardOrder, setCardOrder] = useState({})
  const [dragOverCard, setDragOverCard] = useState(null)
  const [etiquetasStore, setEtiquetasStore] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eventhub_etiquetas') || '{}') } catch { return {} }
  })
  const [tagsStore, setTagsStore] = useState({})
  const [novoPostForm, setNovoPostForm] = useState({ titulo: '', plataforma: 'Instagram', data_publicacao: '', hora_publicacao: '', conteudo: '', tipo_conteudo: '', formato: '', descricao: '', referencia: '', musica: '', destino: 'social', status: 'pendente', collaborators: '', id_evento: '' })
  const [novoPostArquivos, setNovoPostArquivos] = useState([])
  const [criandoPost, setCriandoPost] = useState(false)
  const [designerTab, setDesignerTab] = useState('briefings')
  const [statsExpanded, setStatsExpanded] = useState(false)
  const [expandedMembros, setExpandedMembros] = useState({})
  const [materiaisArquivos, setMateriaisArquivos] = useState({})
  const [loadingMateriais, setLoadingMateriais] = useState(false)
  const [alertTick, setAlertTick] = useState(0)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const categoriasMateriaisOptions = ['Presskit', 'Vídeos YouTube', 'Logo Realização', 'Fotos e Vídeos Artistas', 'Artes Referência', 'Logo Patrocinadores', 'Outros']

  // Timer para atualizar alerta visual de horário próximo (a cada 30s)
  useEffect(() => {
    const t = setInterval(() => setAlertTick(v => v + 1), 30000)
    return () => clearInterval(t)
  }, [])

  // Verifica se o horário de postagem está a 30min ou menos
  function isAlertaHorario(dateStr, timeStr, tagKey) {
    if (!dateStr || !timeStr || tagKey === 'publicado') return false
    const target = new Date(dateStr.slice(0,10) + 'T' + timeStr)
    if (isNaN(target)) return false
    const diff = target.getTime() - Date.now()
    return diff >= -5 * 60 * 1000 && diff <= 30 * 60 * 1000
  }

  useEffect(() => {
    carregar()
    if (isGestor) {
      Promise.all([
        api.get('/equipe/por-funcao/designer').catch(() => ({data:[]})),
        api.get('/equipe/por-funcao/social_media').catch(() => ({data:[]})),
      ]).then(([d,s]) => setEquipe([...d.data.map(u=>({...u,funcao:'designer'})),...s.data.map(u=>({...u,funcao:'social_media'}))]))
    }
    api.get('/tags-demandas').then(r => setTagsStore(r.data)).catch(() => {})
    api.get('/ordem-cards').then(r => setCardOrder(r.data)).catch(() => {})
    // Atualizar dados e tags a cada 30s para sincronizar entre usuários
    const interval = setInterval(() => {
      carregar()
      api.get('/tags-demandas').then(r => setTagsStore(r.data)).catch(() => {})
      api.get('/ordem-cards').then(r => setCardOrder(r.data)).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (data.posts.length) {
      data.posts.forEach(p => carregarCardArquivos('post', p.id))
    }
  }, [data.posts.length])

  useEffect(() => {
    if (designerTab === 'materiais' && data.eventos.length > 0 && Object.keys(materiaisArquivos).length === 0) {
      carregarMateriais()
    }
  }, [designerTab, data.eventos.length])

  useEffect(() => {
    if (!calendarScrollRef.current) return
    const todayStr = new Date().toISOString().split('T')[0]
    const todayEl = calendarScrollRef.current.querySelector(`[data-day="${todayStr}"]`)
    if (todayEl) {
      setTimeout(() => todayEl.scrollIntoView({ behavior: 'instant', block: 'nearest', inline: 'start' }), 80)
    } else {
      calendarScrollRef.current.scrollLeft = 0
    }
  }, [adminMonthDate, loading, view])

  // Abrir demanda específica via query params (ex: /demandas?tipo=briefing&id=123)
  useEffect(() => {
    if (loading) return
    const tipo = searchParams.get('tipo')
    const id = searchParams.get('id')
    if (!tipo || !id) return
    const numId = Number(id)
    let item = null
    const p = data.posts.find(x => x.id === numId)
    if (p) item = { ...p, _tipo: 'post', _data: p.data_publicacao }
    if (item) {
      if (isGestor) {
        setAdminDetalhe(item)
        carregarAdminArqs(item)
        carregarComentarios(item._tipo, item.id, true)
      } else {
        setDetalhe(item)
        carregarArquivosDetalhe(item._tipo, item.id)
        carregarComentarios(item._tipo, item.id, false)
      }
      setSearchParams({}, { replace: true })
    }
  }, [loading, data.posts.length])

  async function carregarArquivos(briefingId) {
    try {
      const { data } = await api.get('/briefings/' + briefingId + '/arquivos')
      setArquivos(data)
    } catch { setArquivos([]) }
  }

  async function carregarArquivosDetalhe(tipo, id) {
    try {
      const endpoint = '/cronograma/' + id + '/arquivos'
      const { data } = await api.get(endpoint)
      setArquivos(data.filter(a => !a.is_referencia))
      setRefArquivos(data.filter(a => a.is_referencia))
    } catch { setArquivos([]); setRefArquivos([]) }
  }

  async function carregarAdminArqs(item) {
    setAdminLoadArqs(true)
    try {
      const endpoint = '/cronograma/' + item.id + '/arquivos'
      const { data } = await api.get(endpoint)
      setAdminArquivos(data.filter(a => !a.is_referencia))
      setAdminRefArquivos(data.filter(a => a.is_referencia))
    } catch { setAdminArquivos([]); setAdminRefArquivos([]) }
    finally { setAdminLoadArqs(false) }
  }

  async function uploadArquivo(tipo, id, file) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      const endpoint = '/cronograma/' + id + '/arquivos'
      await api.post(endpoint, formData, { timeout: 600000 })
      toast.success('Arquivo enviado!')
      carregarArquivosDetalhe(tipo, id)
    } catch { toast.error('Erro ao enviar arquivo') }
    finally { setUploading(false) }
  }

  async function deletarArquivo(arquivoId, tipo, id) {
    try {
      await api.delete('/arquivos/' + arquivoId)
      toast.success('Arquivo removido')
      carregarArquivosDetalhe(tipo, id)
    } catch { toast.error('Erro ao remover') }
  }

  async function uploadRefArquivo(tipo, id, file) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append('is_referencia', 'true')
      const endpoint = '/cronograma/' + id + '/arquivos'
      await api.post(endpoint, formData, { timeout: 600000 })
      toast.success('Referência enviada!')
      carregarArquivosDetalhe(tipo, id)
    } catch { toast.error('Erro ao enviar referência') }
    finally { setUploading(false) }
  }

  function openPreviewWithNav(arq, lista) {
    const idx = lista.findIndex(a => a.id === arq.id)
    setPreviewArquivoList(lista)
    setPreviewArquivoIndex(idx >= 0 ? idx : 0)
    setPreviewArquivo(arq)
  }

  function previewNavegar(dir) {
    const newIdx = previewArquivoIndex + dir
    if (newIdx >= 0 && newIdx < previewArquivoList.length) {
      setPreviewArquivoIndex(newIdx)
      setPreviewArquivo(previewArquivoList[newIdx])
    }
  }

  async function salvarEdicao() {
    if (editForm.hora_publicacao !== undefined && !editForm.hora_publicacao?.toString().trim()) {
      toast.error('Horário de publicação é obrigatório')
      return
    }
    try {
      await api.patch('/cronograma/' + detalhe.id, editForm)
      toast.success('Atualizado!')
      setDetalhe({...detalhe, ...editForm})
      setEditMode(false)
      carregar()
    } catch { toast.error('Erro ao salvar') }
  }

  async function excluirDemanda(id, fecharModal) {
    if (!confirm('Tem certeza que deseja excluir esta demanda?')) return
    try {
      await api.delete('/cronograma/' + id)
      toast.success('Demanda excluída!')
      fecharModal()
      carregar()
    } catch { toast.error('Erro ao excluir demanda') }
  }

  async function adminSalvarEdicao() {
    if (adminEditForm.hora_publicacao !== undefined && !adminEditForm.hora_publicacao?.toString().trim()) {
      toast.error('Horário de publicação é obrigatório')
      return
    }
    try {
      await api.patch('/cronograma/' + adminDetalhe.id, adminEditForm)
      toast.success('Atualizado!')
      setAdminDetalhe({...adminDetalhe, ...adminEditForm})
      setAdminEditMode(false)
      carregar()
    } catch { toast.error('Erro ao salvar') }
  }

  async function atualizarStatus(tipo, id, novoStatus) {
    try {
      await api.patch('/cronograma/' + id, { status: novoStatus })
      toast.success('Status atualizado!')
      carregar()
    } catch { toast.error('Erro ao atualizar') }
  }

  async function carregarCardArquivos(tipo, id) {
    try {
      const endpoint = '/cronograma/' + id + '/arquivos'
      const { data } = await api.get(endpoint)
      setCardArquivos(prev => ({...prev, [tipo + '-' + id]: data}))
    } catch {}
  }

  async function uploadCardArquivo(tipo, id, file) {
    const toastId = toast.loading('Enviando ' + file.name + '...')
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      const endpoint = '/cronograma/' + id + '/arquivos'
      await api.post(endpoint, formData, { timeout: 600000 })
      toast.success('Arquivo enviado!', { id: toastId })
      carregarCardArquivos(tipo, id)
    } catch (err) {
      toast.error('Erro: ' + (err.response?.data?.erro || err.message), { id: toastId })
    }
  }

  async function publicarInstagram(postId) {
    try {
      toast.loading('Publicando no Instagram...', { id: 'ig-pub' })
      await api.post('/cronograma/' + postId + '/publicar-instagram')
      toast.success('Publicado no Instagram!', { id: 'ig-pub' })
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao publicar no Instagram', { id: 'ig-pub' })
    }
  }

  async function toggleAutoPublish(postId, current) {
    try {
      await api.patch('/cronograma/' + postId, { auto_publish: !current })
      toast.success(!current ? 'Publicação agendada!' : 'Agendamento removido')
      carregar()
    } catch { toast.error('Erro ao alterar agendamento') }
  }

  async function impulsionarPost(postId) {
    setBoostingId(postId)
    try {
      await api.post('/cronograma/' + postId + '/boost', boostForm)
      toast.success('Campanha criada!')
      setShowBoostConfig(null)
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao impulsionar')
    } finally { setBoostingId(null) }
  }

  async function pararBoost(postId) {
    try {
      await api.post('/cronograma/' + postId + '/boost-stop')
      toast.success('Campanha pausada')
      carregar()
    } catch { toast.error('Erro ao pausar') }
  }

  async function toggleBoostEnabled(postId, current) {
    try {
      await api.patch('/cronograma/' + postId, { boost_enabled: !current, ...(!current ? boostForm : {}) })
      carregar()
      toast.success(!current ? 'Impulsionamento ativado' : 'Impulsionamento desativado')
    } catch { toast.error('Erro') }
  }

  async function carregar() {
    try {
      const r = await api.get('/minhas-demandas')
      setData(r.data)
    } catch { toast.error('Erro ao carregar demandas') }
    finally { setLoading(false) }
  }

  async function atualizarData(tipo, id, novaData) {
    try {
      await api.patch('/cronograma/' + id, { data_publicacao: novaData })
      toast.success('Data atualizada!')
      carregar()
    } catch { toast.error('Erro ao atualizar data') }
  }

  function getEtiquetas(tipo, id) {
    return etiquetasStore[(tipo || 'item') + '-' + id] || []
  }

  function saveEtiquetas(tipo, id, novas) {
    const key = (tipo || 'item') + '-' + id
    const novo = { ...etiquetasStore, [key]: novas }
    setEtiquetasStore(novo)
    try { localStorage.setItem('eventhub_etiquetas', JSON.stringify(novo)) } catch {}
  }

  function toggleEtiqueta(tipo, id, etiqueta) {
    const atual = getEtiquetas(tipo, id)
    saveEtiquetas(tipo, id, atual.includes(etiqueta) ? atual.filter(e => e !== etiqueta) : [...atual, etiqueta])
  }

  function addEtiquetaCustom(tipo, id, texto) {
    const t = texto.trim()
    if (!t) return
    const atual = getEtiquetas(tipo, id)
    if (!atual.includes(t)) saveEtiquetas(tipo, id, [...atual, t])
  }

  function removeEtiqueta(tipo, id, etiqueta) {
    saveEtiquetas(tipo, id, getEtiquetas(tipo, id).filter(e => e !== etiqueta))
  }

  function getTag(tipo, id) {
    return tagsStore[(tipo || 'item') + '-' + id] || null
  }

  // Mapeamento tag → status real do backend
  const TAG_TO_STATUS = {
    pendente: 'pendente',
    em_andamento: 'em_andamento',
    recebido: 'em_revisao',
    aprovado: 'aprovado',
    publicado: 'publicado',
  }

  function setTagStatus(tipo, id, tagKey) {
    const key = (tipo || 'item') + '-' + id
    const current = tagsStore[key]
    const newTag = current === tagKey ? null : tagKey
    setTagsStore(prev => ({ ...prev, [key]: newTag }))
    api.put('/tags-demandas/' + tipo + '/' + id, { tag_key: newTag }).catch(() => {})
    // Sincronizar status real quando a tag corresponde a um status do backend
    if (newTag && TAG_TO_STATUS[newTag]) {
      const novoStatus = TAG_TO_STATUS[newTag]
      const endpoint = '/cronograma/' + id
      api.patch(endpoint, { status: novoStatus }).then(() => carregar()).catch(() => {})
    }
  }

  async function carregarComentarios(tipo, id, isAdmin = false) {
    try {
      const { data } = await api.get('/demandas/' + tipo + '/' + id + '/comentarios')
      isAdmin ? setAdminComentarios(data) : setComentarios(data)
    } catch { isAdmin ? setAdminComentarios([]) : setComentarios([]) }
  }

  async function enviarComentario(tipo, id, isAdmin = false) {
    const texto = isAdmin ? adminNovoComentario : novoComentario
    if (!texto.trim()) return
    try {
      const { data: result } = await api.post('/demandas/' + tipo + '/' + id + '/comentarios', { texto })
      toast.success('Comentário enviado!')
      if (result.auto_tag) {
        const key = (tipo || 'item') + '-' + id
        setTagsStore(prev => ({ ...prev, [key]: result.auto_tag }))
      }
      isAdmin ? setAdminNovoComentario('') : setNovoComentario('')
      carregarComentarios(tipo, id, isAdmin)
    } catch { toast.error('Erro ao enviar comentário') }
  }

  function sortDayItems(items, dayStr) {
    const orderKey = dayStr
    const order = cardOrder[orderKey]
    const orderMap = {}
    if (order && order.length) order.forEach((id, idx) => { orderMap[id] = idx })
    return [...items].sort((a, b) => {
      // "Publicado" sempre vai para o final
      const pa = (getTag(a._tipo, a.id) === 'publicado' || a.status === 'publicado') ? 1 : 0
      const pb = (getTag(b._tipo, b.id) === 'publicado' || b.status === 'publicado') ? 1 : 0
      if (pa !== pb) return pa - pb
      // Entre itens não publicados, usa ordem manual (drag)
      const idA = a._tipo + '-' + a.id
      const idB = b._tipo + '-' + b.id
      const oA = orderMap[idA] !== undefined ? orderMap[idA] : 9999
      const oB = orderMap[idB] !== undefined ? orderMap[idB] : 9999
      return oA - oB
    })
  }

  function handleCardDragOver(e, itemId) {
    e.preventDefault()
    e.stopPropagation()
    if (dragOverCard !== itemId) setDragOverCard(itemId)
  }

  function handleCardDrop(e, targetItem, dayStr, dayItems) {
    e.preventDefault()
    e.stopPropagation()
    if (!draggedItem) return
    const dragId = draggedItem._tipo + '-' + draggedItem.id
    const targetId = targetItem._tipo + '-' + targetItem.id
    if (dragId === targetId) return
    // Se o card veio de outro dia, mover para o novo dia (alterar data)
    if (draggedItem._data?.slice(0,10) !== dayStr) {
      atualizarData(draggedItem._tipo, draggedItem.id, dayStr)
      setDraggedItem(null)
      setDragOverDay(null)
      setDragOverCard(null)
      return
    }
    // Mesmo dia: reordenar cards
    const currentOrder = dayItems.map(d => d._tipo + '-' + d.id)
    const fromIdx = currentOrder.indexOf(dragId)
    const toIdx = currentOrder.indexOf(targetId)
    if (fromIdx < 0 || toIdx < 0) return
    currentOrder.splice(fromIdx, 1)
    currentOrder.splice(toIdx, 0, dragId)
    const novo = { ...cardOrder, [dayStr]: currentOrder }
    setCardOrder(novo)
    api.put('/ordem-cards/' + dayStr, { ordem: currentOrder }).catch(() => {})
    setDragOverCard(null)
  }

  async function criarNovoPost() {
    if (!novoPostForm.titulo.trim() || !novoPostForm.id_evento) {
      toast.error('Preencha o titulo e selecione um evento')
      return
    }
    // Horário obrigatório para todos ao criar nova demanda
    if (!novoPostForm.hora_publicacao?.trim()) {
      toast.error('Preencha o horário de publicação')
      return
    }
    setCriandoPost(true)
    try {
      const { id_evento, ...dados } = novoPostForm
      const { data: post } = await api.post('/eventos/' + id_evento + '/cronograma', dados)
      if (novoPostArquivos.length > 0) {
        for (let i = 0; i < novoPostArquivos.length; i++) {
          const file = novoPostArquivos[i].file
          const toastId = toast.loading('Enviando ' + file.name + ' (' + (i+1) + '/' + novoPostArquivos.length + ')...')
          try {
            const formData = new FormData()
            formData.append('arquivo', file)
            await api.post('/cronograma/' + post.id + '/arquivos', formData, { timeout: 600000 })
            toast.success(file.name + ' enviado!', { id: toastId })
          } catch (err) {
            toast.error('Erro: ' + (err.response?.data?.erro || err.message), { id: toastId })
          }
        }
      }
      toast.success('Post criado!')
      setShowNovoPost(false)
      setNovoPostForm({ titulo: '', plataforma: 'Instagram', data_publicacao: '', hora_publicacao: '', conteudo: '', tipo_conteudo: '', formato: '', descricao: '', referencia: '', musica: '', destino: 'social', status: 'pendente', collaborators: '', id_evento: '' })
      novoPostArquivos.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl) })
      setNovoPostArquivos([])
      carregar()
    } catch (err) {
      toast.error('Erro: ' + (err.response?.data?.erro || err.message))
    } finally { setCriandoPost(false) }
  }

  function toggleNovoPostMulti(field, val) {
    const arr = novoPostForm[field] ? novoPostForm[field].split(',').filter(Boolean) : []
    const idx = arr.indexOf(val)
    if (idx >= 0) arr.splice(idx, 1); else arr.push(val)
    setNovoPostForm({ ...novoPostForm, [field]: arr.join(',') })
  }

  async function carregarMateriais(eventos) {
    setLoadingMateriais(true)
    try {
      const results = {}
      await Promise.all((eventos || data.eventos).map(async ev => {
        try {
          const { data: arqs } = await api.get('/eventos/' + ev.id + '/materiais-arquivos')
          if (arqs.length > 0) results[ev.id] = arqs
        } catch {}
      }))
      setMateriaisArquivos(results)
    } catch {}
    finally { setLoadingMateriais(false) }
  }

  async function uploadMaterialArquivo(eventoId, categoria, file) {
    const toastId = toast.loading('Enviando ' + file.name + '...')
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append('categoria', categoria)
      await api.post('/eventos/' + eventoId + '/materiais-arquivos', formData, { timeout: 600000 })
      toast.success('Arquivo enviado!', { id: toastId })
      const { data: arqs } = await api.get('/eventos/' + eventoId + '/materiais-arquivos')
      setMateriaisArquivos(prev => ({ ...prev, [eventoId]: arqs }))
    } catch (err) {
      toast.error('Erro: ' + (err.response?.data?.erro || err.message), { id: toastId })
    }
  }

  async function deletarMaterialArquivo(arquivoId, eventoId) {
    try {
      await api.delete('/arquivos/' + arquivoId)
      setMateriaisArquivos(prev => ({ ...prev, [eventoId]: (prev[eventoId] || []).filter(a => a.id !== arquivoId) }))
      toast.success('Arquivo removido')
    } catch { toast.error('Erro ao remover arquivo') }
  }

  const hoje = new Date().toISOString().split('T')[0]
  const eventosAtivos = data.eventos.filter(ev => !ev.data_evento || ev.data_evento >= hoje)

  function isAtrasado(item, campoData, tipo) {
    if (tipo) {
      const te = tagEfetiva({ ...item, _tipo: tipo, _data: item[campoData] })
      return te === 'atrasado'
    }
    const d = item[campoData] || ''
    const dataISO = d.includes('/') ? d.split('/').reverse().join('-') : d.slice(0,10)
    return dataISO && dataISO < hoje && !['concluido','aprovado','publicado','cancelado'].includes(item.status)
  }

  function filtrarPorData(items, campoData, tipo) {
    if (filtro === 'todas') return items
    return items.filter(item => {
      const te = tipo ? tagEfetiva({ ...item, _tipo: tipo, _data: item[campoData] }) : null
      const d = item[campoData] || ''
      const dataISO = d.includes('/') ? d.split('/').reverse().join('-') : d.slice(0,10)
      if (filtro === 'hoje') return dataISO === hoje
      if (filtro === 'semana') {
        const dt = new Date(dataISO + 'T12:00:00')
        const now = new Date()
        const diff = (dt - now) / (1000 * 60 * 60 * 24)
        return diff >= -1 && diff <= 7
      }
      if (filtro === 'atrasadas') return te ? (te === 'atrasado' || te === 'nao_entregue') : (dataISO < hoje && !['concluido','aprovado','publicado','cancelado'].includes(item.status))
      if (filtro === 'pendentes') return te ? (te === 'pendente' || te === 'em_andamento') : ['pendente','em_andamento'].includes(item.status)
      if (filtro === 'aprovados') return te ? (te === 'aprovado' || te === 'publicado') : ['aprovado','publicado','concluido'].includes(item.status)
      return true
    })
  }

  function fmtData(d) {
    if (!d) return '-'
    const p = d.slice(0,10).split('-')
    const ms = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    return p[2] + ' ' + ms[parseInt(p[1])-1]
  }

  const demandasFiltradas = filtroEvento === 'todos' ? filtrarPorData(data.posts, 'data_publicacao', 'post') : filtrarPorData(data.posts, 'data_publicacao', 'post').filter(p => p.id_evento === Number(filtroEvento))

  // Lista unificada de todas as demandas (tudo é demanda, não existe mais briefing separado)
  const todasDemandas = data.posts.map(p => ({ ...p, _tipo: 'post', _data: p.data_publicacao }))
  const totalDemandas = todasDemandas.length

  // Tag efetiva: 1) tag manual, 2) status do banco, 3) cálculo por data
  function tagEfetiva(d) {
    const tag = getTag('post', d.id)
    if (tag) return tag
    // Se o status do banco já indica concluído/publicado, não é atrasado
    if (['concluido','aprovado','publicado','cancelado'].includes(d.status)) return STATUS_TO_TAG[d.status] || d.status
    const dt = d._data?.slice(0, 10)
    if (dt && dt < hoje) return 'atrasado'
    return STATUS_TO_TAG[d.status] || null
  }

  const pendentesDemandas = todasDemandas.filter(d => { const t = tagEfetiva(d); return t === 'pendente' || t === 'em_andamento' }).length
  const atrasadosDemandas = todasDemandas.filter(d => { const t = tagEfetiva(d); return t === 'atrasado' || t === 'nao_entregue' }).length

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={'p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/20'}>
            {isDesigner ? <Palette size={24} className="text-blue-600" /> : <Megaphone size={24} className="text-blue-600" />}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white/90">Minhas Demandas</h1>
            <p className="text-sm text-gray-500 dark:text-white/50">{isDesigner ? 'Demandas e artes para criar' : isSocialMedia ? 'Demandas e conteúdos para publicar' : 'Acompanhe as entregas da equipe'}</p>
          </div>
        </div>
      </div>

      {/* ===== ADMIN/DIRETOR VIEW ===== */}
      {isGestor && (() => {
        const equipeFiltrada = filtroFuncao === 'todos' ? equipe : equipe.filter(m => m.funcao === filtroFuncao)
        const allItems = data.posts.map(p => ({...p, _tipo:'post', _data: p.data_publicacao}))
        const eventosMap = {}
        data.eventos.forEach(ev => { eventosMap[ev.id] = ev })

        // Verifica se uma demanda pertence a um membro (social media ou designer)
        function pertenceAoMembro(item, membroId) {
          const ev = eventosMap[item.id_evento]
          if (!ev) return false
          if (ev.social_media_id === membroId) return true
          if (item.aparecer_designer && ev.designer_id === membroId) return true
          return false
        }

        function getResponsavel(item) {
          const ev = eventosMap[item.id_evento]
          if (!ev) return null
          return equipe.find(m => m.id === ev.social_media_id) || (item.aparecer_designer ? equipe.find(m => m.id === ev.designer_id) : null)
        }

        function getStats(membroId) {
          const items = allItems.filter(d => pertenceAoMembro(d, membroId))
          return {
            total: items.length,
            pendente: items.filter(x => { const t = tagEfetiva(x); return t === 'pendente' || t === 'em_andamento' }).length,
            producao: items.filter(x => { const t = tagEfetiva(x); return t === 'recebido' }).length,
            atrasado: items.filter(x => { const t = tagEfetiva(x); return t === 'atrasado' || t === 'nao_entregue' }).length,
          }
        }

        let filteredItems = allItems
        if (filtroMembro !== 'todos') filteredItems = filteredItems.filter(d => pertenceAoMembro(d, Number(filtroMembro)))
        else if (filtroFuncao !== 'todos') filteredItems = filteredItems.filter(d => {
          const ev = eventosMap[d.id_evento]
          if (!ev) return false
          if (filtroFuncao === 'social_media') return equipe.some(m => m.id === ev.social_media_id && m.funcao === 'social_media')
          if (filtroFuncao === 'designer') return d.aparecer_designer && equipe.some(m => m.id === ev.designer_id && m.funcao === 'designer')
          return false
        })
        if (filtroEvento !== 'todos') filteredItems = filteredItems.filter(d => d.id_evento === Number(filtroEvento))
        if (filtroStatusAdmin !== 'todos') {
          filteredItems = filteredItems.filter(d => {
            const tag = getTag(d._tipo, d.id)
            const autoTag = (d._data?.slice(0,10) < hoje && !['concluido','aprovado','publicado','cancelado'].includes(d.status)) ? 'atrasado' : (STATUS_TO_TAG[d.status] || null)
            return (tag || autoTag) === filtroStatusAdmin
          })
        }
        if (filtroBusca.trim()) { const q = filtroBusca.toLowerCase(); filteredItems = filteredItems.filter(d => (d.titulo||'').toLowerCase().includes(q) || (d.evento_nome||'').toLowerCase().includes(q)) }

        const stConfig = {
          pendente: {bg:'bg-yellow-50',text:'text-yellow-700',border:'border-yellow-200',dot:'bg-yellow-500',label:'Pendente'},
          em_andamento: {bg:'bg-blue-50',text:'text-blue-700',border:'border-blue-200',dot:'bg-blue-500',label:'Em Producao'},
          em_producao: {bg:'bg-blue-50',text:'text-blue-700',border:'border-blue-200',dot:'bg-blue-500',label:'Em Producao'},
          em_revisao: {bg:'bg-blue-50',text:'text-blue-700',border:'border-blue-200',dot:'bg-blue-500',label:'Em Revisao'},
          aprovado: {bg:'bg-green-50',text:'text-green-700',border:'border-green-200',dot:'bg-green-500',label:'Aprovado'},
          publicado: {bg:'bg-green-50',text:'text-green-700',border:'border-green-200',dot:'bg-green-500',label:'Publicado'},
          concluido: {bg:'bg-green-50',text:'text-green-700',border:'border-green-200',dot:'bg-green-500',label:'Concluido'},
        }

        return (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-2 items-center flex-wrap">
              <div className="flex gap-1 bg-white rounded-lg p-0.5 border border-gray-200">
                {[{id:'todos',l:'Todos'},{id:'designer',l:'Designers'},{id:'social_media',l:'Social Media'}].map(f => (
                  <button key={f.id} onClick={() => {setFiltroFuncao(f.id);setFiltroMembro('todos')}} className={'px-3 py-1.5 rounded-md text-xs font-bold transition-all ' + (filtroFuncao === f.id ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-700')}>{f.l}</button>
                ))}
              </div>
              <div className="relative" style={{width:240}}>
                <input
                  value={evDropOpen ? evSearch : (filtroEvento === 'todos' ? '' : (data.eventos.find(e=>e.id===Number(filtroEvento))?.nome || ''))}
                  onChange={e => { setEvSearch(e.target.value); if(!evDropOpen) setEvDropOpen(true) }}
                  onFocus={() => { setEvDropOpen(true); setEvSearch('') }}
                  onBlur={() => setTimeout(() => setEvDropOpen(false), 200)}
                  placeholder="Filtrar evento..."
                  className={'w-full px-3 py-2 rounded-lg border bg-white text-sm font-semibold outline-none transition ' + (filtroEvento !== 'todos' ? 'border-blue-300 text-blue-700' : 'border-gray-200 text-gray-600')}
                />
                {filtroEvento !== 'todos' && !evDropOpen && <button onClick={() => { setFiltroEvento('todos'); setEvSearch('') }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm font-bold">&times;</button>}
                {evDropOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg border border-gray-200 shadow-lg z-50 max-h-48 overflow-auto">
                    <div onMouseDown={e => { e.preventDefault(); setFiltroEvento('todos'); setEvSearch(''); setEvDropOpen(false) }} className={'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition ' + (filtroEvento === 'todos' ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-600')}>Todos os eventos</div>
                    {eventosAtivos.filter(ev => !evSearch || ev.nome.toLowerCase().includes(evSearch.toLowerCase())).map(ev => (
                      <div key={ev.id} onMouseDown={e => { e.preventDefault(); setFiltroEvento(String(ev.id)); setEvSearch(''); setEvDropOpen(false) }} className={'px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition ' + (filtroEvento === String(ev.id) ? 'text-blue-600 font-bold bg-blue-50' : 'text-gray-700')}>
                        {ev.nome}
                      </div>
                    ))}
                    {eventosAtivos.filter(ev => !evSearch || ev.nome.toLowerCase().includes(evSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-400">Nenhum evento encontrado</div>
                    )}
                  </div>
                )}
              </div>
              {/* Filtro tags — select no mobile, botões no desktop */}
              <select value={filtroStatusAdmin} onChange={e => setFiltroStatusAdmin(e.target.value)}
                className="md:hidden px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-xs font-bold text-gray-600 dark:text-white/70 outline-none cursor-pointer"
                style={filtroStatusAdmin !== 'todos' ? { borderColor: TAGS_STATUS.find(t => t.key === filtroStatusAdmin)?.color || '', color: TAGS_STATUS.find(t => t.key === filtroStatusAdmin)?.color || '' } : {}}>
                <option value="todos">Todas as tags</option>
                {TAGS_STATUS.map(tag => <option key={tag.key} value={tag.key}>{tag.label}</option>)}
              </select>
              <div className="hidden md:flex gap-1 flex-wrap">
                <button onClick={() => setFiltroStatusAdmin('todos')} className={'px-3 py-1.5 rounded-md text-xs font-bold transition-all ' + (filtroStatusAdmin === 'todos' ? 'bg-accent text-white' : 'text-gray-500 hover:text-gray-700')}>Todos</button>
                {TAGS_STATUS.map(tag => (
                  <button key={tag.key} onClick={() => setFiltroStatusAdmin(tag.key)}
                    className="px-3 py-1.5 rounded-md text-xs font-bold transition-all"
                    style={filtroStatusAdmin === tag.key ? { backgroundColor: tag.color, color: '#fff' } : { color: 'var(--text-muted)' }}>
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Busca */}
            <div className="relative" style={{width:240}}>
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
              <input
                value={filtroBusca}
                onChange={e => setFiltroBusca(e.target.value)}
                placeholder="Buscar demanda..."
                className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-sm text-gray-700 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/30 outline-none focus:ring-2 focus:ring-accent/40 transition"
              />
              {filtroBusca && (
                <button onClick={() => setFiltroBusca('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 text-sm font-bold">&times;</button>
              )}
            </div>

            {/* Cards equipe */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {equipeFiltrada.map(m => {
                const stats = getStats(m.id)
                const isActive = filtroMembro === String(m.id)
                const isExpanded = expandedMembros[m.id]
                return (
                  <div key={m.id} className={'rounded-xl cursor-pointer transition-all border ' + (isActive ? 'bg-accent/10 border-accent' : 'bg-white dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.08] hover:border-accent/40')}>
                    <div
                      onClick={() => setExpandedMembros(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                      className="flex items-center gap-2.5 px-3 py-2"
                    >
                      {m.foto_url ? (
                        <img src={'/api' + m.foto_url} alt={m.nome} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={'w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ' + (m.funcao === 'designer' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-pink-500 to-purple-600')}>
                          {(m.nome||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 dark:text-white/90 truncate">{m.nome}</p>
                        <p className="text-[10px] text-gray-400 dark:text-white/40">{m.funcao === 'designer' ? 'Designer' : 'Social Media'}</p>
                      </div>
                      <ChevronDown size={14} className={'text-gray-400 dark:text-white/40 transition-transform duration-200 flex-shrink-0 ' + (isExpanded ? 'rotate-180' : '')} />
                    </div>
                    <div className={'overflow-hidden transition-all duration-200 ' + (isExpanded ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0')}>
                      <div onClick={() => setFiltroMembro(isActive ? 'todos' : String(m.id))} className="grid grid-cols-4 gap-1.5 px-3 pb-2.5">
                        {[{n:stats.total,l:'Total',c:'text-gray-600 dark:text-white/60',bg:'bg-gray-100 dark:bg-white/[0.06]'},{n:stats.pendente,l:'Pend',c:'text-yellow-700 dark:text-yellow-400',bg:'bg-yellow-50 dark:bg-yellow-500/10'},{n:stats.producao,l:'Prod',c:'text-blue-700 dark:text-blue-400',bg:'bg-blue-50 dark:bg-blue-500/10'},{n:stats.atrasado,l:'Atras',c:'text-red-600 dark:text-red-400',bg:'bg-red-50 dark:bg-red-500/10'}].map((s,i) => (
                          <div key={i} className={'text-center rounded-lg py-1 ' + s.bg}>
                            <p className={'text-xs font-extrabold ' + s.c}>{s.n}</p>
                            <p className="text-gray-400 dark:text-white/30" style={{fontSize:8,textTransform:'uppercase',letterSpacing:0.5}}>{s.l}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Calendario mensal */}
            {(() => {
              const year = adminMonthDate.getFullYear()
              const month = adminMonthDate.getMonth()
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
              const diasNomes = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
              const todayStr = new Date().toISOString().split('T')[0]
              const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
              const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()

              return (
                <>
                <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.08] flex items-center justify-between bg-gray-50 dark:bg-white/[0.03]">
                    <button onClick={() => setAdminMonthDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"><ChevronLeft size={16} className="text-gray-500 dark:text-white/50" /></button>
                    <div className="text-center">
                      <h3 className="font-extrabold text-gray-900 dark:text-white/90 text-sm">
                        {mesesNomes[month]} {year}
                      </h3>
                      <span className="text-xs text-gray-400 dark:text-white/40">{filteredItems.length} demandas · {daysInMonth} dias</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isCurrentMonth && <button onClick={() => { const n = new Date(); setAdminMonthDate(new Date(n.getFullYear(), n.getMonth(), 1)) }} className="px-2 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Hoje</button>}
                      <button onClick={() => setAdminMonthDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"><ChevronRight size={16} className="text-gray-500 dark:text-white/50" /></button>
                    </div>
                  </div>
                  <div ref={calendarScrollRef} className="flex overflow-x-auto gap-4 p-4 bg-gray-50/60 dark:bg-transparent" style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}>
                    {monthDays.map((day) => {
                      const dayStr = day.toISOString().split('T')[0]
                      const isToday = dayStr === todayStr
                      const dayItems = sortDayItems(filteredItems.filter(d => d._data?.slice(0,10) === dayStr).sort((a, b) => { const pa = (getTag(a._tipo, a.id) || a.status) === 'publicado' ? 1 : 0; const pb = (getTag(b._tipo, b.id) || b.status) === 'publicado' ? 1 : 0; return pa - pb }), dayStr)
                      const plataformaColor = { 'Instagram': '#e1306c', 'Facebook': '#1877f2', 'TikTok': '#010101', 'YouTube': '#ff0000', 'Twitter': '#1da1f2', 'LinkedIn': '#0a66c2' }
const isDragTarget = dragOverDay === dayStr && draggedItem
                      return (
                        <div
                          key={dayStr}
                          data-day={dayStr}
                          onDragOver={e => { e.preventDefault(); setDragOverDay(dayStr) }}
                          onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDay(null) }}
                          onDrop={e => {
                            e.preventDefault()
                            if (draggedItem && draggedItem._data?.slice(0,10) !== dayStr) {
                              atualizarData(draggedItem._tipo, draggedItem.id, dayStr)
                            }
                            setDraggedItem(null)
                            setDragOverDay(null)
                          }}
                          className={'flex-shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-colors duration-150 ' + (isToday ? 'bg-blue-50/40 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/30' : 'bg-white dark:bg-white/[0.04] border-gray-100 dark:border-white/[0.08]') + (isDragTarget ? ' ring-2 ring-inset ring-blue-400' : '')}
                          style={{ minWidth: 285, height: 520, scrollSnapAlign: 'start' }}
                        >
                          {/* Day header */}
                          <div className={'flex items-center gap-2 px-4 py-3 border-b ' + (isToday ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' : 'border-gray-100 dark:border-white/[0.08] bg-white dark:bg-white/[0.03]')}>
                            <span className={'text-[10px] font-extrabold uppercase tracking-widest ' + (isToday ? 'text-blue-500' : 'text-gray-400 dark:text-white/40')}>{diasNomes[day.getDay()]}</span>
                            <span className={'text-sm font-extrabold flex items-center justify-center flex-shrink-0 ' + (isToday ? 'w-7 h-7 rounded-full bg-blue-600 text-white shadow-sm' : 'text-gray-800 dark:text-white/80')}>
                              {day.getDate()}
                            </span>
                            {dayItems.length > 0 && (
                              <span className={'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ' + (isToday ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50')}>
                                {dayItems.length}
                              </span>
                            )}
                          </div>

                          <div className="p-2 space-y-2 flex-1 flex flex-col min-h-0">
                            {/* Add button */}
                            {!isReadOnly && <div
                              onClick={() => { setNovoPostForm(f => ({...f, id_evento: filtroEvento !== 'todos' ? filtroEvento : (data.eventos.length === 1 ? String(data.eventos[0].id) : ''), data_publicacao: dayStr})); setShowNovoPost(true) }}
                              className="flex items-center justify-center py-1.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-white/[0.10] text-gray-300 dark:text-white/20 hover:border-blue-400 hover:text-blue-400 hover:bg-blue-50/50 transition cursor-pointer group"
                            >
                              <Plus size={13} className="group-hover:scale-110 transition-transform" />
                            </div>}

                            <div className="overflow-y-auto space-y-2 flex-1 min-h-0">
                            {dayItems.map(d => {
                              const atrasado = dayStr < todayStr && !['concluido','aprovado','publicado','cancelado'].includes(d.status)
                              const accentColor = atrasado ? '#ef4444' : (plataformaColor[d.plataforma] || '#6b7280')
                              const isDraggingThis = draggedItem && draggedItem.id === d.id && draggedItem._tipo === d._tipo
                              const isSelected = adminDetalhe && adminDetalhe.id === d.id && adminDetalhe._tipo === d._tipo

                              const cardTag = getTag(d._tipo, d.id)
                              const autoTagKey = atrasado ? 'atrasado' : (STATUS_TO_TAG[d.status] || null)
                              const activeTagKey = cardTag || autoTagKey
                              const tagConf = activeTagKey ? TAGS_STATUS.find(t => t.key === activeTagKey) : null
                              const borderColor = tagConf ? tagConf.color : accentColor
                              const alertaHora = isAlertaHorario(d._data, d.hora_publicacao, activeTagKey)

                              return (
                                <div
                                  key={d._tipo+'-'+d.id}
                                  draggable={!isReadOnly}
                                  onDragStart={e => { if (isReadOnly) return; e.stopPropagation(); setDraggedItem({...d}) }}
                                  onDragEnd={() => { setDraggedItem(null); setDragOverDay(null); setDragOverCard(null) }}
                                  onDragOver={e => !isReadOnly && handleCardDragOver(e, d._tipo+'-'+d.id)}
                                  onDrop={e => !isReadOnly && handleCardDrop(e, d, dayStr, dayItems)}
                                  onClick={e => { e.stopPropagation(); const next = isSelected ? null : d; setAdminDetalhe(next); if(next) { setAdminArquivos([]); carregarAdminArqs(next); carregarComentarios(next._tipo, next.id, true) } }}
                                  className={'rounded-xl bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-gray-600 cursor-grab select-none transition-all duration-150 hover:shadow-md shadow-sm '
                                    + (isDraggingThis ? 'opacity-40 scale-95 ' : '')
                                    + (dragOverCard === d._tipo+'-'+d.id && !isDraggingThis ? 'ring-2 ring-inset ring-blue-400 ' : '')
                                    + (alertaHora ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-500/10 ' : '')
                                    + (isSelected ? 'ring-2 ring-blue-500 shadow-md ' : '')}
                                >
                                  <div className="px-3 py-2.5 space-y-2">
                                    {/* Etiquetas + Status */}
                                    <div className="flex items-start justify-between gap-1">
                                      <div className="flex gap-1 flex-wrap flex-1 min-w-0">
                                        {getEtiquetas(d._tipo, d.id).map(etKey => {
                                          const et = ETIQUETAS_PADRAO.find(e => e.key === etKey)
                                          return et
                                            ? <span key={etKey} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: isDark ? et.darkBg : et.bg, color: isDark ? et.darkColor : et.color }}>{et.label}</span>
                                            : <span key={etKey} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50">🏷️ {etKey}</span>
                                        })}
                                      </div>
                                      {tagConf && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: tagConf.color + '20', color: tagConf.color }}>{tagConf.label}</span>
                                      )}
                                    </div>

                                    {alertaHora && <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500 text-white animate-pulse"><Clock size={10} /><span className="text-[10px] font-bold">HORÁRIO PRÓXIMO</span></div>}
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white/90 line-clamp-2 leading-snug">{d.titulo || 'Sem título'}</p>
                                    <p className="text-xs font-medium truncate" style={{ color: borderColor }}>{d.evento_nome}</p>

                                    {/* Formatos / Tipo de conteúdo */}
                                    {(d.formato || d.tipo_conteudo) && (
                                      <div className="flex gap-1 flex-wrap">
                                        {d.formato && d.formato.split(',').filter(Boolean).map(f => (
                                          <span key={f} className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">{f.trim()}</span>
                                        ))}
                                        {d.tipo_conteudo && d.tipo_conteudo.split(',').filter(Boolean).map(t => (
                                          <span key={t} className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">{t.trim()}</span>
                                        ))}
                                      </div>
                                    )}
                                    {/* Uploads */}
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-white/40">
                                      <div className="flex items-center gap-1">
                                        <Paperclip size={10} />
                                        <span className="font-semibold">Uploads: {(cardArquivos[d._tipo + '-' + d.id] || []).length}</span>
                                      </div>
                                      {d.hora_publicacao && <span className="flex items-center gap-0.5 font-bold text-gray-500 dark:text-white/50"><Clock size={9} />{d.hora_publicacao.slice(0,5)}</span>}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Modal detalhe admin */}
                {adminDetalhe && (() => {
                  const d = adminDetalhe
                  const todayCheck = new Date().toISOString().split('T')[0]
                  const adminTag = getTag(d._tipo, d.id)
                  const adminTagStatus = adminTag && TAGS_STATUS.find(t => t.key === adminTag)
                  const st = adminTagStatus ? { bg:'', text:'', border:'', dot:'bg-gray-500', label: adminTagStatus.label } : (stConfig[d.status] || stConfig.pendente)
                  const resp = getResponsavel(d)
                  const atrasado = adminTag === 'atrasado' || (!adminTag && d._data?.slice(0,10) < todayCheck && !['concluido','aprovado','publicado','cancelado'].includes(d.status))
                  const etqs = getEtiquetas(d._tipo, d.id)

                  function toggleMultiAdmin(field, val) {
                    const arr = (adminEditForm[field]||'').split(',').filter(Boolean)
                    const idx = arr.indexOf(val)
                    if (idx >= 0) arr.splice(idx, 1); else arr.push(val)
                    setAdminEditForm({...adminEditForm, [field]: arr.join(',')})
                  }

                  return (
                    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setAdminDetalhe(null)}>
                      <div className="bg-white dark:bg-[#1c1c24] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div className="sticky top-0 bg-white dark:bg-[#1c1c24] border-b border-gray-100 dark:border-white/[0.08] px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className={'w-2.5 h-2.5 rounded-full flex-shrink-0 ' + (atrasado ? 'bg-red-500' : st.dot)} />
                            <div className="min-w-0">
                              <h3 className="text-base font-extrabold text-gray-900 dark:text-white/90 truncate">{d.titulo || 'Sem título'}</h3>
                              <p className="text-xs text-blue-500 font-medium">{d.evento_nome}</p>
                            </div>
                            <span className={'text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ' + (atrasado ? 'bg-red-50 text-red-600 border-red-200' : st.bg + ' ' + st.text + ' ' + st.border)}>
                              {atrasado ? 'Atrasado' : st.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            {!isReadOnly && <button
                              onClick={() => {
                                if (adminEditMode) { setAdminEditMode(false); setAdminEditForm({}) }
                                else {
                                  setAdminEditMode(true)
                                  setAdminEditForm({
                                    titulo: d.titulo||'', descricao: d.descricao||'', conteudo: d.conteudo||'',
                                    referencia: d.referencia||'', musica: d.musica||'',
                                    data_vencimento: d.data_vencimento||'', data_publicacao: d.data_publicacao||'',
                                    hora_publicacao: d.hora_publicacao||'', collaborators: d.collaborators||'',
                                    tipo_conteudo: d.tipo_conteudo||'', formato: d.formato||'',
                                    plataforma: d.plataforma||'Instagram', status: d.status||'pendente',
                                    id_evento: d.id_evento||'',
                                    aparecer_designer: !!d.aparecer_designer
                                      ? true
                                      : !!d.aparecer_designer,
                                  })
                                }
                              }}
                              className={'text-xs px-3 py-1.5 rounded-lg font-bold transition ' + (adminEditMode ? 'bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.12]' : 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/25')}
                            >
                              {adminEditMode ? 'Cancelar' : '✏️ Editar'}
                            </button>}
                            <button onClick={() => { setAdminDetalhe(null); setAdminEditMode(false); setAdminEditForm({}) }}
                              className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center text-gray-400 dark:text-white/50 hover:text-gray-600 dark:hover:text-white/80 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition font-bold">✕</button>
                          </div>
                        </div>

                        <div className="p-5 space-y-5">
                          {/* Info grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            {[
                              { l: 'Tipo', v: '📲 Demanda' },
                              { l: 'Responsável', v: resp?.nome || '—' },
                              { l: 'Função', v: resp?.funcao === 'designer' ? 'Designer' : 'Social Media' },
                              { l: 'Data', v: fmtData(d._data) },
                            ].map((item, i) => (
                              <div key={i} className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2.5">
                                <p className="text-gray-400 dark:text-white/40 font-bold uppercase mb-0.5" style={{fontSize:9,letterSpacing:1}}>{item.l}</p>
                                <p className="text-sm font-semibold text-gray-800 dark:text-white/80">{item.v}</p>
                              </div>
                            ))}
                          </div>

                          {/* Etiquetas */}
                          <div className="space-y-2">
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Etiquetas</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ETIQUETAS_PADRAO.map(et => {
                                const ativa = etqs.includes(et.key)
                                return (
                                  <button key={et.key} onClick={() => !isReadOnly && toggleEtiqueta(d._tipo, d.id, et.key)} disabled={isReadOnly}
                                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border-2 transition-all disabled:cursor-not-allowed"
                                    style={ativa
                                      ? { backgroundColor: isDark ? et.darkBg : et.bg, color: isDark ? et.darkColor : et.color, borderColor: isDark ? et.darkBorder : et.border }
                                      : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                                    {et.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {/* Tags de Status */}
                          <div className="space-y-2">
                            <p className="text-[11px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-wide">Tags</p>
                            <div className="flex flex-wrap gap-1.5">
                              {TAGS_STATUS.map(tag => {
                                const ativa = getTag(d._tipo, d.id) === tag.key
                                return (
                                  <button key={tag.key} onClick={() => !isReadOnly && setTagStatus(d._tipo, d.id, tag.key)} disabled={isReadOnly}
                                    className="text-xs font-semibold px-2.5 py-1 rounded-full border-2 transition-all disabled:cursor-not-allowed"
                                    style={ativa
                                      ? { backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color }
                                      : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                                    {tag.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>

                          {adminEditMode ? (
                            <div className="space-y-4 border-t border-gray-100 pt-4">
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Editar Card</p>

                              <div className="grid grid-cols-1 gap-3">
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Título</label>
                                  <input value={adminEditForm.titulo||''} onChange={e => setAdminEditForm({...adminEditForm, titulo: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Evento</label>
                                  <select value={adminEditForm.id_evento||''} onChange={e => setAdminEditForm({...adminEditForm, id_evento: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                                    {data.eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
                                  <select value={adminEditForm.status||''} onChange={e => setAdminEditForm({...adminEditForm, status: e.target.value})}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                                    <option value="pendente">Pendente</option>
                                    <option value="em_andamento">Em Produção</option>
                                    <option value="em_revisao">Em Revisão</option>
                                    <option value="aprovado">Aprovado</option>
                                    <option value="publicado">Publicado</option>
                                  </select>
                                </div>

                                {/* Plataforma + Data + Hora + Collaborators — unificado para todos os tipos */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Plataforma</label>
                                    <select value={adminEditForm.plataforma||'Instagram'} onChange={e => setAdminEditForm({...adminEditForm, plataforma: e.target.value})}
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                                      {['Instagram','Facebook','TikTok','YouTube','Twitter','LinkedIn','WhatsApp'].map(p => <option key={p}>{p}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Data de Publicação</label>
                                    <input type="date"
                                      value={(d._tipo === 'post' ? adminEditForm.data_publicacao : adminEditForm.data_vencimento)?.slice(0,10)||''}
                                      onChange={e => d._tipo === 'post'
                                        ? setAdminEditForm({...adminEditForm, data_publicacao: e.target.value})
                                        : setAdminEditForm({...adminEditForm, data_vencimento: e.target.value})}
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Hora</label>
                                    <input type="time" value={adminEditForm.hora_publicacao||''} onChange={e => setAdminEditForm({...adminEditForm, hora_publicacao: e.target.value})}
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Collaborators</label>
                                    <input value={adminEditForm.collaborators||''} onChange={e => setAdminEditForm({...adminEditForm, collaborators: e.target.value})}
                                      placeholder="@usuario1, @usuario2"
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                  </div>
                                </div>

                                {/* Tipo de Conteúdo */}
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Tipo de Conteúdo</label>
                                  <div className="flex gap-2 flex-wrap">
                                    {['GIF','VIDEO','ESTATICA','FOTO ORGÂNICA','VÍDEO ORGÂNICO','INTERAÇÃO'].map(tc => {
                                      const ativo = (adminEditForm.tipo_conteudo||'').split(',').includes(tc)
                                      return (
                                        <button key={tc} type="button" onClick={() => toggleMultiAdmin('tipo_conteudo', tc)}
                                          className={'px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition ' + (ativo ? 'border-amber-500 bg-amber-500 text-white' : 'border-gray-200 text-gray-500 hover:border-amber-300')}>
                                          {tc}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Formato */}
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Formato</label>
                                  <div className="flex gap-2 flex-wrap">
                                    {['FEED','STORIES','CARROSSEL','REELS'].map(fm => {
                                      const ativo = (adminEditForm.formato||'').split(',').includes(fm)
                                      return (
                                        <button key={fm} type="button" onClick={() => toggleMultiAdmin('formato', fm)}
                                          className={'px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition ' + (ativo ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 text-gray-500 hover:border-blue-300')}>
                                          {fm === 'FEED' ? '📱' : fm === 'STORIES' ? '📲' : fm === 'CARROSSEL' ? '🔄' : '🎥'} {fm}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Briefing para o Designer */}
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Briefing para o Designer</label>
                                  <textarea value={adminEditForm.descricao||''} onChange={e => setAdminEditForm({...adminEditForm, descricao: e.target.value})}
                                    rows={3} placeholder="Descreva o que o designer precisa criar..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                </div>

                                {/* Legenda / Conteúdo — para todos os tipos */}
                                <div>
                                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Legenda / Conteúdo</label>
                                  <textarea
                                    value={d._tipo === 'post' ? adminEditForm.conteudo||'' : adminEditForm.legenda||''}
                                    onChange={e => d._tipo === 'post'
                                      ? setAdminEditForm({...adminEditForm, conteudo: e.target.value})
                                      : setAdminEditForm({...adminEditForm, legenda: e.target.value})}
                                    rows={3} placeholder="Legenda do post..."
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Referência (link)</label>
                                    <input value={adminEditForm.referencia||''} onChange={e => setAdminEditForm({...adminEditForm, referencia: e.target.value})}
                                      placeholder="Link ou descrição"
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Música</label>
                                    <input value={adminEditForm.musica||''} onChange={e => setAdminEditForm({...adminEditForm, musica: e.target.value})}
                                      placeholder="Nome ou link"
                                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                                  </div>
                                </div>

                                {/* Upload publicável (pode ir para Instagram) */}
                                <div>
                                  <label className="text-[11px] font-semibold uppercase tracking-wide mb-1 block" style={{color:'#16a34a'}}>📤 Upload Publicável <span className="text-[9px] font-normal normal-case text-gray-400">(pode ser publicado no Instagram)</span></label>
                                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-green-300 text-xs text-green-600 hover:border-green-500 hover:bg-green-50/50 transition cursor-pointer">
                                    <input type="file" accept="image/*,video/*,.pdf" multiple className="hidden"
                                      onChange={e => { Array.from(e.target.files).forEach(file => { const tipo = d._tipo; const id = d.id; const endpoint = '/cronograma/' + id + '/arquivos'; const fd = new FormData(); fd.append('arquivo', file); api.post(endpoint, fd, {timeout:600000}).then(() => { toast.success('Arquivo enviado!'); carregarAdminArqs(d) }).catch(() => toast.error('Erro ao enviar')) }); e.target.value='' }} />
                                    <Paperclip size={13} /> Clique para anexar arquivo publicável
                                  </label>
                                </div>

                                {/* Upload de referência (uso interno, NUNCA vai para Instagram) */}
                                <div>
                                  <label className="text-[11px] font-semibold uppercase tracking-wide mb-1 block" style={{color:'#d97706'}}>📎 Upload de Referência <span className="text-[9px] font-normal normal-case text-gray-400">(uso interno — NÃO publica no Instagram)</span></label>
                                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-amber-300 text-xs text-amber-600 hover:border-amber-500 hover:bg-amber-50/50 transition cursor-pointer">
                                    <input type="file" accept="image/*,video/*,.pdf,.psd,.ai,.zip" multiple className="hidden"
                                      onChange={e => { Array.from(e.target.files).forEach(file => { const tipo = d._tipo; const id = d.id; const endpoint = '/cronograma/' + id + '/arquivos'; const fd = new FormData(); fd.append('arquivo', file); fd.append('is_referencia', 'true'); api.post(endpoint, fd, {timeout:600000}).then(() => { toast.success('Referência enviada!'); carregarAdminArqs(d) }).catch(() => toast.error('Erro ao enviar referência')) }); e.target.value='' }} />
                                    <Paperclip size={13} /> Clique para anexar referência
                                  </label>
                                </div>

                                {/* Toggle: Aparecer para o Designer */}
                                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-gray-50 dark:bg-white/[0.04]">
                                  <div>
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white/80">🎨 Aparecer para o Designer?</p>
                                    <p className="text-[10px] text-gray-400 dark:text-white/40 mt-0.5">O designer do evento também visualiza essa demanda</p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setAdminEditForm(f => ({...f, aparecer_designer: !f.aparecer_designer}))}
                                    className={'relative w-11 h-6 rounded-full overflow-hidden transition-colors flex-shrink-0 ' + (adminEditForm.aparecer_designer ? 'bg-blue-600' : 'bg-gray-300')}
                                  >
                                    <span className={'absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ' + (adminEditForm.aparecer_designer ? 'translate-x-5' : 'translate-x-0')} />
                                  </button>
                                </div>
                              </div>

                              <button onClick={adminSalvarEdicao}
                                className="w-full px-4 py-2.5 bg-green-500 text-white rounded-xl text-sm font-bold hover:bg-green-600 transition">
                                Salvar Alterações
                              </button>
                              <button onClick={() => excluirDemanda(d.id, () => setAdminDetalhe(null))}
                                className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition border border-red-200">
                                Excluir Demanda
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-3 border-t border-gray-100 pt-4">
                              {/* View mode */}
                              {(d.tipo_conteudo || d.formato || d.plataforma) && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {d.plataforma && <span className="text-xs font-bold px-3 py-1 rounded-full bg-pink-50 text-pink-700 border border-pink-200">📲 {d.plataforma}</span>}
                                  {(d.tipo_conteudo||'').split(',').filter(Boolean).map(tc => <span key={tc} className="text-xs font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">{tc}</span>)}
                                  {(d.formato||'').split(',').filter(Boolean).map(fm => <span key={fm} className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{fm}</span>)}
                                </div>
                              )}
                              {/* Ações Instagram (todos os tipos) */}
                              {(() => {
                                const igPostId = d.id
                                if (!igPostId) return null
                                const linkedPost = d
                                const igStatus = linkedPost?.status || d.status
                                const igAutoPublish = linkedPost?.auto_publish || false
                                const igHora = linkedPost?.hora_publicacao || d.hora_publicacao
                                const igBoostStatus = linkedPost?.boost_status || null
                                return (
                                <div className="space-y-2">
                                  {igStatus !== 'publicado' && (
                                    <>
                                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.10]">
                                        <span className={'text-xs font-semibold ' + (igAutoPublish ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-white/40')}>
                                          {igAutoPublish ? `⏰ Agendado ${igHora ? igHora.slice(0,5) : ''}` : 'Agendar publicação'}
                                        </span>
                                        <button onClick={e => { e.stopPropagation(); toggleAutoPublish(igPostId, igAutoPublish) }}
                                          className={'relative w-10 h-5 rounded-full transition-colors ' + (igAutoPublish ? 'bg-green-500' : 'bg-gray-300')}>
                                          <span className={'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ' + (igAutoPublish ? 'translate-x-5' : 'translate-x-0.5')} />
                                        </button>
                                      </div>
                                      <button onClick={e => { e.stopPropagation(); publicarInstagram(igPostId) }}
                                        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 transition text-white text-xs font-bold shadow-sm">
                                        📸 Publicar no Instagram
                                      </button>
                                    </>
                                  )}
                                  {igStatus === 'publicado' && (
                                    <>
                                      <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                                        <span className="text-xs font-bold text-green-600 dark:text-green-400">✅ Publicado</span>
                                      </div>
                                      {showBoostConfig === igPostId ? (
                                        <div className="space-y-2 p-3 rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5">
                                          <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide">Configurar Impulsionamento</p>
                                          <div className="grid grid-cols-2 gap-2">
                                            <div>
                                              <label className="text-[10px] text-gray-500 font-semibold">Orçamento (centavos)</label>
                                              <input type="number" value={boostForm.budget} onChange={e => setBoostForm({...boostForm, budget: Number(e.target.value)})}
                                                className="w-full border border-gray-200 dark:border-white/[0.12] rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80" />
                                            </div>
                                            <div>
                                              <label className="text-[10px] text-gray-500 font-semibold">Duração (dias)</label>
                                              <input type="number" value={boostForm.duration} onChange={e => setBoostForm({...boostForm, duration: Number(e.target.value)})}
                                                className="w-full border border-gray-200 dark:border-white/[0.12] rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80" />
                                            </div>
                                            <div>
                                              <label className="text-[10px] text-gray-500 font-semibold">Idade mín.</label>
                                              <input type="number" value={boostForm.age_min} onChange={e => setBoostForm({...boostForm, age_min: Number(e.target.value)})}
                                                className="w-full border border-gray-200 dark:border-white/[0.12] rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80" />
                                            </div>
                                            <div>
                                              <label className="text-[10px] text-gray-500 font-semibold">Idade máx.</label>
                                              <input type="number" value={boostForm.age_max} onChange={e => setBoostForm({...boostForm, age_max: Number(e.target.value)})}
                                                className="w-full border border-gray-200 dark:border-white/[0.12] rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80" />
                                            </div>
                                          </div>
                                          <div>
                                            <label className="text-[10px] text-gray-500 font-semibold">Cidades (separadas por vírgula)</label>
                                            <input value={boostForm.cities} onChange={e => setBoostForm({...boostForm, cities: e.target.value})} placeholder="Ex: São Paulo, Rio de Janeiro"
                                              className="w-full border border-gray-200 dark:border-white/[0.12] rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80" />
                                          </div>
                                          <div className="flex gap-2">
                                            <button onClick={() => setShowBoostConfig(null)}
                                              className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition">Cancelar</button>
                                            <button onClick={() => impulsionarPost(igPostId)} disabled={boostingId === igPostId}
                                              className={'flex-1 py-1.5 rounded-lg text-xs font-bold text-white transition ' + (boostingId === igPostId ? 'bg-gray-400 animate-pulse' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600')}>
                                              {boostingId === igPostId ? 'Criando...' : '🚀 Confirmar'}
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          {igBoostStatus === 'active' ? (
                                            <button onClick={e => { e.stopPropagation(); pararBoost(igPostId) }}
                                              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition">
                                              ⏸️ Pausar Impulsionamento
                                            </button>
                                          ) : (
                                            <button onClick={e => { e.stopPropagation(); setShowBoostConfig(igPostId) }}
                                              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition text-white text-xs font-bold shadow-sm">
                                              🚀 Impulsionar
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </>
                                  )}
                                </div>
                                )
                              })()}
                              {d.descricao && (
                                <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-4 py-3">
                                  <p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wide mb-1.5">Briefing para o Designer</p>
                                  <p className="text-sm text-gray-700 dark:text-white/70 whitespace-pre-wrap leading-relaxed">{d.descricao}</p>
                                </div>
                              )}
                              {d.conteudo && (
                                <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-4 py-3">
                                  <p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wide mb-1.5">Legenda / Conteúdo</p>
                                  <p className="text-sm text-gray-700 dark:text-white/70 whitespace-pre-wrap leading-relaxed">{d.conteudo}</p>
                                </div>
                              )}
                              {(d.referencia || d.musica) && (
                                <div className="grid grid-cols-2 gap-3">
                                  {d.referencia && <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2.5"><p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wide mb-1">Referência (link)</p><p className="text-xs text-gray-700 dark:text-white/70 break-all">{d.referencia}</p></div>}
                                  {d.musica && <div className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2.5"><p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wide mb-1">Música</p><p className="text-xs text-gray-700 dark:text-white/70">{d.musica}</p></div>}
                                </div>
                              )}
                              {d.collaborators && (
                                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide mb-1">Collaborators</p>
                                  <p className="text-xs text-blue-600 font-medium">{d.collaborators}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Arquivos Publicáveis */}
                          <div className="rounded-xl px-4 py-3" style={{backgroundColor: 'rgba(22,163,106,0.06)', border: '1px solid rgba(22,163,106,0.15)'}}>
                            <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{color:'#16a34a'}}>📤 Arquivos Publicáveis <span className="text-[9px] font-normal normal-case text-gray-400">(Instagram)</span></p>
                            {adminLoadArqs ? (
                              <div className="flex items-center justify-center py-4"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div></div>
                            ) : adminArquivos.length === 0 ? (
                              <p className="text-xs text-gray-400 py-1">Nenhum arquivo publicável</p>
                            ) : (
                              <div className="grid grid-cols-3 gap-2">
                                {adminArquivos.map(arq => {
                                  const isImg = arq.tipo?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(arq.nome_original || arq.url || '')
                                  const isVideo = arq.tipo?.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(arq.nome_original || arq.url || '')
                                  const fileUrl = arq.url?.startsWith('http') ? arq.url : '/api' + (arq.url?.startsWith('/') ? arq.url : '/uploads/' + (arq.nome_arquivo || arq.url))
                                  return (
                                    <div key={arq.id} className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.04] hover:shadow-sm transition">
                                      {isImg && <img src={fileUrl} alt={arq.nome_original} className="w-full object-cover cursor-pointer hover:opacity-80" style={{height:80}} onClick={() => openPreviewWithNav(arq, adminArquivos)} />}
                                      {isVideo && <video src={fileUrl} controls className="w-full" style={{height:80}} />}
                                      {!isImg && !isVideo && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 text-xs font-semibold text-gray-600 dark:text-white/60 hover:text-blue-600">📎 {arq.nome_original || 'Arquivo'}</a>}
                                      <a href={fileUrl} download={arq.nome_original || 'arquivo'} onClick={e => e.stopPropagation()}
                                        className="absolute bottom-1 right-1 w-7 h-7 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10">
                                        <Download size={13} className="text-white" />
                                      </a>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Arquivos de Referência (uso interno) */}
                          <div className="rounded-xl px-4 py-3" style={{backgroundColor: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.15)'}}>
                            <p className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{color:'#d97706'}}>📎 Referências <span className="text-[9px] font-normal normal-case text-gray-400">(uso interno — não publica)</span></p>
                            {adminRefArquivos.length === 0 ? (
                              <p className="text-xs text-gray-400 py-1">Nenhuma referência</p>
                            ) : (
                              <div className="grid grid-cols-3 gap-2">
                                {adminRefArquivos.map(arq => {
                                  const isImg = arq.tipo?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(arq.nome_original || arq.url || '')
                                  const isVideo = arq.tipo?.startsWith('video/') || /\.(mp4|mov|webm)$/i.test(arq.nome_original || arq.url || '')
                                  const fileUrl = arq.url?.startsWith('http') ? arq.url : '/api' + (arq.url?.startsWith('/') ? arq.url : '/uploads/' + (arq.nome_arquivo || arq.url))
                                  return (
                                    <div key={arq.id} className="group relative rounded-xl overflow-hidden border border-amber-200 dark:border-amber-500/20 bg-white dark:bg-white/[0.04] hover:shadow-sm transition">
                                      {isImg && <img src={fileUrl} alt={arq.nome_original} className="w-full object-cover cursor-pointer hover:opacity-80" style={{height:80}} onClick={() => openPreviewWithNav(arq, adminRefArquivos)} />}
                                      {isVideo && <video src={fileUrl} controls className="w-full" style={{height:80}} />}
                                      {!isImg && !isVideo && <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 text-xs font-semibold text-gray-600 dark:text-white/60 hover:text-amber-600">📎 {arq.nome_original || 'Arquivo'}</a>}
                                      <a href={fileUrl} download={arq.nome_original || 'arquivo'} onClick={e => e.stopPropagation()}
                                        className="absolute bottom-1 right-1 w-7 h-7 bg-amber-500 hover:bg-amber-600 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10">
                                        <Download size={13} className="text-white" />
                                      </a>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </div>

                          {/* Comentários */}
                          <div className="border-t border-gray-100 dark:border-white/[0.08] pt-4 space-y-3">
                            <div className="flex items-center gap-2 flex-wrap"><p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wide">Comentários ({adminComentarios.length})</p><span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">OBS: após realizar a alteração, altere a tag para "recebido"</span></div>
                            {adminComentarios.length > 0 && (
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {adminComentarios.map(c => (
                                  <div key={c.id} className="bg-gray-50 dark:bg-white/[0.04] rounded-xl px-3 py-2">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs font-bold text-gray-700 dark:text-white/80">{c.usuario_nome}</span>
                                      <span className="text-[10px] text-gray-400 dark:text-white/40">{new Date(c.criado_em).toLocaleDateString('pt-BR')} {new Date(c.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-white/60 whitespace-pre-wrap">{c.texto}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <input value={adminNovoComentario} onChange={e => setAdminNovoComentario(e.target.value)}
                                placeholder="Escreva um comentário..."
                                className="flex-1 border border-gray-200 dark:border-white/[0.12] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-800 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-accent/40"
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentario(d._tipo, d.id, true) } }} />
                              <button onClick={() => enviarComentario(d._tipo, d.id, true)}
                                className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-bold hover:opacity-90 transition flex-shrink-0">Enviar</button>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>
                  )
                })()}
                </>
              )
            })()}
          </div>
        )
      })()}

      {/* ===== DESIGNER VIEW (KANBAN + MATERIAIS) ===== */}
      {isDesigner && (() => {
        const bListBase = filtroEvento === 'todos' ? data.posts.filter(p => p.aparecer_designer) : data.posts.filter(p => p.aparecer_designer && p.id_evento === Number(filtroEvento))
        const bList = filtrarPorData(bListBase, 'data_publicacao', 'post')
        const atrasados = bListBase.filter(b => isAtrasado(b, 'data_publicacao', 'post')).length
        return (
          <div className="space-y-4">
            {/* Tab toggle */}
            <div className="flex gap-1 bg-gray-100 dark:bg-white/[0.06] rounded-xl p-1">
              <button onClick={() => setDesignerTab('briefings')} className={'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 justify-center ' + (designerTab === 'briefings' ? 'bg-white dark:bg-white/[0.10] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70')}>
                <Palette size={16} /> Demandas
              </button>
              <button onClick={() => setDesignerTab('materiais')} className={'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all flex-1 justify-center ' + (designerTab === 'materiais' ? 'bg-white dark:bg-white/[0.10] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-white/50 hover:text-gray-700 dark:hover:text-white/70')}>
                <FolderOpen size={16} /> Material
              </button>
            </div>

            {/* Filtros (Designer) */}
            <div className="space-y-2">
              <div className="flex gap-2 items-center flex-wrap">
                <select value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-xs font-semibold text-gray-600 dark:text-white/70 outline-none cursor-pointer flex-shrink-0">
                  <option value="todos">Todos os eventos</option>
                  {eventosAtivos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                </select>
                <div className="relative" style={{width:240}}>
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
                  <input
                    value={filtroBusca}
                    onChange={e => setFiltroBusca(e.target.value)}
                    placeholder="Buscar demanda..."
                    className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-xs font-semibold text-gray-600 dark:text-white/70 placeholder-gray-400 dark:placeholder-white/30 outline-none focus:ring-2 focus:ring-accent/40 transition w-full"
                  />
                  {filtroBusca && (
                    <button onClick={() => setFiltroBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 text-xs font-bold">&times;</button>
                  )}
                </div>
              </div>
              {/* Tags de filtro */}
              <select value={filtro} onChange={e => setFiltro(e.target.value)}
                className="md:hidden px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-xs font-semibold text-gray-600 dark:text-white/70 outline-none cursor-pointer"
                style={filtro !== 'todas' ? { borderColor: TAGS_STATUS.find(t => t.key === filtro)?.color || '', color: TAGS_STATUS.find(t => t.key === filtro)?.color || '' } : {}}>
                <option value="todas">Todas as tags</option>
                {TAGS_STATUS.map(tag => <option key={tag.key} value={tag.key}>{tag.label}</option>)}
              </select>
              <div className="hidden md:flex gap-1 flex-wrap">
                <button onClick={() => setFiltro('todas')} className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 ' + (filtro === 'todas' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.10]')}>Todas</button>
                {TAGS_STATUS.map(tag => (
                  <button key={tag.key} onClick={() => setFiltro(tag.key)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0"
                    style={filtro === tag.key ? { backgroundColor: tag.color, color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {designerTab === 'briefings' && (() => {
              const year = adminMonthDate.getFullYear()
              const month = adminMonthDate.getMonth()
              const daysInMonth = new Date(year, month + 1, 0).getDate()
              const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
              const diasNomes = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
              const todayStr = new Date().toISOString().split('T')[0]
              const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
              const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()
              let allItems = bList.map(b => ({...b, _tipo:'post', _data: b.data_publicacao}))
              if (filtroBusca.trim()) { const q = filtroBusca.toLowerCase(); allItems = allItems.filter(d => (d.titulo||'').toLowerCase().includes(q) || (d.evento_nome||'').toLowerCase().includes(q)) }
              if (filtro !== 'todas') {
                const hoje2 = new Date().toISOString().split('T')[0]
                allItems = allItems.filter(d => {
                  const tag = getTag('post', d.id)
                  const autoTag = (d._data?.slice(0,10) < hoje2 && !['concluido','aprovado','publicado','cancelado'].includes(d.status)) ? 'atrasado' : (STATUS_TO_TAG[d.status] || null)
                  return (tag || autoTag) === filtro
                })
              }
              const dsStatusConf = {
                pendente:     { label: 'Pendente',    cls: 'bg-yellow-100 text-yellow-700' },
                em_andamento: { label: 'Em Produção', cls: 'bg-blue-100 text-blue-700' },
                em_revisao:   { label: 'Em Revisão',  cls: 'bg-violet-100 text-violet-700' },
                aprovado:     { label: 'Aprovado',    cls: 'bg-green-100 text-green-700' },
                publicado:    { label: 'Publicado',   cls: 'bg-emerald-100 text-emerald-700' },
                concluido:    { label: 'Concluído',   cls: 'bg-green-100 text-green-700' },
              }
              return (
                <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.08] flex items-center justify-between bg-gray-50 dark:bg-white/[0.03]">
                    <button onClick={() => setAdminMonthDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"><ChevronLeft size={16} className="text-gray-500 dark:text-white/50" /></button>
                    <div className="text-center">
                      <h3 className="font-extrabold text-gray-900 dark:text-white/90 text-sm">{mesesNomes[month]} {year}</h3>
                      <span className="text-xs text-gray-400 dark:text-white/40">{allItems.length} demandas · {daysInMonth} dias</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isCurrentMonth && <button onClick={() => { const n = new Date(); setAdminMonthDate(new Date(n.getFullYear(), n.getMonth(), 1)) }} className="px-2 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Hoje</button>}
                      <button onClick={() => setAdminMonthDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"><ChevronRight size={16} className="text-gray-500 dark:text-white/50" /></button>
                    </div>
                  </div>
                  <div ref={calendarScrollRef} className="flex overflow-x-auto gap-4 p-4 bg-gray-50/60 dark:bg-transparent" style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}>
                    {monthDays.map((day) => {
                      const dayStr = day.toISOString().split('T')[0]
                      const isToday = dayStr === todayStr
                      const dayItems = sortDayItems(allItems.filter(d => d._data?.slice(0,10) === dayStr).sort((a, b) => { const pa = (getTag(a._tipo, a.id) || a.status) === 'publicado' ? 1 : 0; const pb = (getTag(b._tipo, b.id) || b.status) === 'publicado' ? 1 : 0; return pa - pb }), dayStr)
                      return (
                        <div
                          key={dayStr}
                          data-day={dayStr}
                          className={'flex-shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-colors duration-150 ' + (isToday ? 'bg-blue-50/40 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/30' : 'bg-white dark:bg-white/[0.04] border-gray-100 dark:border-white/[0.08]')}
                          style={{ minWidth: 285, height: 520, scrollSnapAlign: 'start' }}
                        >
                          <div className={'flex items-center gap-2 px-4 py-3 border-b ' + (isToday ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' : 'border-gray-100 dark:border-white/[0.08] bg-white dark:bg-white/[0.03]')}>
                            <span className={'text-[10px] font-extrabold uppercase tracking-widest ' + (isToday ? 'text-blue-500' : 'text-gray-400 dark:text-white/40')}>{diasNomes[day.getDay()]}</span>
                            <span className={'text-sm font-extrabold flex items-center justify-center flex-shrink-0 ' + (isToday ? 'w-7 h-7 rounded-full bg-blue-600 text-white shadow-sm' : 'text-gray-800 dark:text-white/80')}>
                              {day.getDate()}
                            </span>
                            {dayItems.length > 0 && (
                              <span className={'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ' + (isToday ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50')}>
                                {dayItems.length}
                              </span>
                            )}
                          </div>
                          <div className="p-2 space-y-2 flex-1 flex flex-col min-h-0">
                            <div className="overflow-y-auto space-y-2 flex-1 min-h-0">
                              {dayItems.map(d => {
                                const atrasado = dayStr < todayStr && !['concluido','aprovado','publicado','cancelado'].includes(d.status)
                                const cardTag = getTag(d._tipo, d.id)
                                const autoTagKey = atrasado ? 'atrasado' : (STATUS_TO_TAG[d.status] || null)
                                const activeTagKey = cardTag || autoTagKey
                                const tagConf = activeTagKey ? TAGS_STATUS.find(t => t.key === activeTagKey) : null
                                const borderColor = tagConf ? tagConf.color : '#8b5cf6'
                                const alertaHora = isAlertaHorario(d._data, d.hora_publicacao, activeTagKey)
                                return (
                                  <div
                                    key={'briefing-'+d.id}
                                    onClick={() => { setDetalhe({...d}); carregarArquivosDetalhe(d._tipo, d.id); setEditMode(false); setEditForm({}); carregarComentarios(d._tipo, d.id, false) }}
                                    className={'rounded-xl bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-gray-600 cursor-pointer select-none transition-all duration-150 hover:shadow-md shadow-sm '
                                      + (alertaHora ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-500/10 ' : '')}
                                  >
                                    <div className="px-3 py-2.5 space-y-2">
                                      <div className="flex items-start justify-between gap-1">
                                        <div className="flex gap-1 flex-wrap flex-1 min-w-0">
                                          {getEtiquetas(d._tipo, d.id).map(etKey => {
                                            const et = ETIQUETAS_PADRAO.find(e => e.key === etKey)
                                            return et
                                              ? <span key={etKey} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: isDark ? et.darkBg : et.bg, color: isDark ? et.darkColor : et.color }}>{et.label}</span>
                                              : <span key={etKey} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50">🏷️ {etKey}</span>
                                          })}
                                        </div>
                                        {tagConf && (
                                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: tagConf.color + '20', color: tagConf.color }}>{tagConf.label}</span>
                                        )}
                                      </div>
                                      {alertaHora && <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500 text-white animate-pulse"><Clock size={10} /><span className="text-[10px] font-bold">HORÁRIO PRÓXIMO</span></div>}
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white/90 line-clamp-2 leading-snug">{d.titulo || 'Sem título'}</p>
                                      <p className="text-xs font-medium truncate" style={{ color: borderColor }}>{d.evento_nome}</p>
                                      {(d.formato || d.tipo_conteudo) && (
                                        <div className="flex gap-1 flex-wrap">
                                          {d.formato && d.formato.split(',').filter(Boolean).map(f => (
                                            <span key={f} className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">{f.trim()}</span>
                                          ))}
                                          {d.tipo_conteudo && d.tipo_conteudo.split(',').filter(Boolean).map(t => (
                                            <span key={t} className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">{t.trim()}</span>
                                          ))}
                                        </div>
                                      )}
                                      {/* Uploads */}
                                      <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-white/40">
                                        <div className="flex items-center gap-1">
                                          <Paperclip size={10} />
                                          <span className="font-semibold">Uploads: {(cardArquivos[d._tipo + '-' + d.id] || []).length}</span>
                                        </div>
                                        {d.hora_publicacao && <span className="flex items-center gap-0.5 font-bold text-gray-500 dark:text-white/50"><Clock size={9} />{d.hora_publicacao.slice(0,5)}</span>}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* ===== MATERIAIS TAB ===== */}
            {designerTab === 'materiais' && (
              <div className="space-y-4">
                {/* Filtro evento */}
                <div className="flex items-center gap-3">
                  <select value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-sm font-semibold text-gray-600 dark:text-white/70 outline-none">
                    <option value="todos">Todos os eventos</option>
                    {eventosAtivos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                  </select>
                  <button onClick={() => carregarMateriais()} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-white/[0.10] transition">Atualizar</button>
                </div>

                {loadingMateriais ? (
                  <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                ) : (
                  (filtroEvento === 'todos' ? data.eventos : data.eventos.filter(ev => ev.id === Number(filtroEvento))).map(ev => {
                    const evArqs = materiaisArquivos[ev.id] || []
                    return (
                      <div key={ev.id} className="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
                        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.03] flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center"><FolderOpen size={16} className="text-blue-600" /></div>
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white/90 text-sm">{ev.nome}</h3>
                            <span className="text-xs text-gray-400 dark:text-white/40">{evArqs.length} arquivo{evArqs.length !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className="p-4 space-y-4">
                          {categoriasMateriaisOptions.map(cat => {
                            const arquivosCat = evArqs.filter(a => a.categoria_material === cat)
                            const catIcon = cat === 'Presskit' ? '📦' : cat === 'Vídeos YouTube' ? '🎬' : cat === 'Logo Realização' ? '🎨' : cat === 'Fotos e Vídeos Artistas' ? '📸' : cat === 'Artes Referência' ? '✨' : cat === 'Logo Patrocinadores' ? '🤝' : '📁'
                            return (
                              <div key={cat}>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm">{catIcon}</span>
                                  <h4 className="font-semibold text-gray-800 text-sm">{cat}</h4>
                                  {arquivosCat.length > 0 && <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{arquivosCat.length}</span>}
                                </div>
                                {arquivosCat.length > 0 && (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-2">
                                    {arquivosCat.map(arq => (
                                      <div key={arq.id} className="relative group rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition bg-white">
                                        {arq.tipo && arq.tipo.startsWith('image') ? (
                                          <div className="cursor-pointer" onClick={() => setPreviewArquivo(arq)}>
                                            <img src={'/api' + arq.url} className="w-full h-28 object-cover" />
                                          </div>
                                        ) : arq.tipo && arq.tipo.startsWith('video') ? (
                                          <div className="cursor-pointer" onClick={() => setPreviewArquivo(arq)}>
                                            <div className="w-full h-28 bg-gray-900 flex items-center justify-center"><span className="text-3xl">🎬</span></div>
                                          </div>
                                        ) : (
                                          <a href={'/api' + arq.url} download className="block">
                                            <div className="w-full h-28 bg-gray-50 flex items-center justify-center"><FileText size={28} className="text-gray-300" /></div>
                                          </a>
                                        )}
                                        <div className="p-2">
                                          <p className="text-[10px] font-medium text-gray-700 truncate" title={arq.nome_original}>{arq.nome_original}</p>
                                          <div className="flex items-center justify-between mt-1">
                                            <span className="text-[9px] text-gray-400">{arq.enviado_nome || ''}{arq.tamanho ? ' · ' + (arq.tamanho > 1048576 ? (arq.tamanho / 1048576).toFixed(1) + ' MB' : (arq.tamanho / 1024).toFixed(0) + ' KB') : ''}</span>
                                            <a href={'/api' + arq.url} download className="text-[9px] text-blue-500 hover:text-blue-700 font-medium">Baixar</a>
                                          </div>
                                        </div>
                                        <button onClick={() => deletarMaterialArquivo(arq.id, ev.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs">
                                          <XIcon size={10} />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div
                                  onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400','bg-blue-50') }}
                                  onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50') }}
                                  onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50'); Array.from(e.dataTransfer.files).forEach(f => uploadMaterialArquivo(ev.id, cat, f)) }}
                                  className="relative flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-xs font-medium text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer">
                                  <input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={e => { Array.from(e.target.files).forEach(f => uploadMaterialArquivo(ev.id, cat, f)); e.target.value = '' }} />
                                  <Paperclip size={14} /> Arraste ou clique para adicionar
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* ===== SOCIAL MEDIA VIEW ===== */}
      {isSocialMedia && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Total Demandas', value: totalDemandas, sub: 'programadas', icon: <Megaphone size={13} className="text-blue-400" />, color: 'text-blue-600', hover: 'hover:border-blue-200 dark:hover:border-blue-500/30', onClick: () => { setFiltro('todas'); setCalendarFilter('todos') } },
            { label: 'Pendentes', value: pendentesDemandas, sub: 'demandas', icon: <Clock size={13} className="text-yellow-400" />, color: 'text-yellow-600', hover: 'hover:border-yellow-200 dark:hover:border-yellow-500/30', onClick: () => { setFiltro('pendentes'); setCalendarFilter('pendente') } },
            { label: 'Atrasados', value: atrasadosDemandas, sub: 'demandas', icon: <AlertCircle size={13} className="text-red-400" />, color: 'text-red-600', hover: 'hover:border-red-200 dark:hover:border-red-500/30', onClick: () => { setFiltro('atrasadas'); setCalendarFilter('atrasado') } },
          ].map((card, i) => (
            <div key={i} onClick={card.onClick} className={'bg-white dark:bg-white/[0.04] rounded-xl border border-gray-100 dark:border-white/[0.08] shadow-sm cursor-pointer transition ' + card.hover}>
              <div onClick={e => { e.stopPropagation(); setStatsExpanded(prev => !prev) }} className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-1.5">
                  {card.icon}
                  <span className="text-[11px] text-gray-500 dark:text-white/50 font-semibold uppercase">{card.label}</span>
                </div>
                <ChevronDown size={14} className={'text-gray-400 dark:text-white/40 transition-transform duration-200 ' + (statsExpanded ? 'rotate-180' : '')} />
              </div>
              <div className={'overflow-hidden transition-all duration-200 ' + (statsExpanded ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0')}>
                <div className="px-3 pb-2">
                  <p className={'text-xl font-bold ' + card.color}>{card.value}</p>
                  <span className="text-[10px] text-gray-400 dark:text-white/40">{card.sub}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== FILTERS & VIEWS (SocialMedia only) ===== */}
      {!isGestor && !isDesigner && (
        <>
        <div className="space-y-2">
          <div className="flex gap-2 items-center flex-wrap">
            <select value={filtroEvento} onChange={e => setFiltroEvento(e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-xs font-semibold text-gray-600 dark:text-white/70 outline-none cursor-pointer flex-shrink-0">
              <option value="todos">Todos os eventos</option>
              {eventosAtivos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
            </select>
            <div className="relative" style={{width:240}}>
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40" />
              <input
                value={filtroBusca}
                onChange={e => setFiltroBusca(e.target.value)}
                placeholder="Buscar demanda..."
                className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-xs font-semibold text-gray-600 dark:text-white/70 placeholder-gray-400 dark:placeholder-white/30 outline-none focus:ring-2 focus:ring-accent/40 transition w-full"
              />
              {filtroBusca && (
                <button onClick={() => setFiltroBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70 text-xs font-bold">&times;</button>
              )}
            </div>
          </div>
          {/* Filtro tags — select no mobile, botões no desktop */}
          <select value={filtro} onChange={e => setFiltro(e.target.value)}
            className="md:hidden px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.10] bg-white dark:bg-white/[0.06] text-xs font-semibold text-gray-600 dark:text-white/70 outline-none cursor-pointer"
            style={filtro !== 'todas' ? { borderColor: TAGS_STATUS.find(t => t.key === filtro)?.color || '', color: TAGS_STATUS.find(t => t.key === filtro)?.color || '' } : {}}>
            <option value="todas">Todas as tags</option>
            {TAGS_STATUS.map(tag => <option key={tag.key} value={tag.key}>{tag.label}</option>)}
          </select>
          <div className="hidden md:flex gap-1 flex-wrap">
            <button onClick={() => setFiltro('todas')} className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0 ' + (filtro === 'todas' ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-white/50 hover:bg-gray-200 dark:hover:bg-white/[0.10]')}>Todas</button>
            {TAGS_STATUS.map(tag => (
              <button key={tag.key} onClick={() => setFiltro(tag.key)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition flex-shrink-0"
                style={filtro === tag.key ? { backgroundColor: tag.color, color: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.15)' } : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                {tag.label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendario mensal (SocialMedia) */}
        {view === 'calendario' && (() => {
          const year = adminMonthDate.getFullYear()
          const month = adminMonthDate.getMonth()
          const daysInMonth = new Date(year, month + 1, 0).getDate()
          const mesesNomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
          const diasNomes = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
          const todayStr = new Date().toISOString().split('T')[0]
          const monthDays = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
          const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth()
          let allItems = demandasFiltradas.map(p => ({...p, _tipo:'post', _data: p.data_publicacao}))
          if (filtroBusca.trim()) { const q = filtroBusca.toLowerCase(); allItems = allItems.filter(d => (d.titulo||'').toLowerCase().includes(q) || (d.evento_nome||'').toLowerCase().includes(q)) }
          if (filtro !== 'todas') {
            const hoje2 = new Date().toISOString().split('T')[0]
            allItems = allItems.filter(d => {
              const tag = getTag(d._tipo, d.id)
              const autoTag = (d._data?.slice(0,10) < hoje2 && !['concluido','aprovado','publicado','cancelado'].includes(d.status)) ? 'atrasado' : (STATUS_TO_TAG[d.status] || null)
              return (tag || autoTag) === filtro
            })
          }
          const smStatusConf = {
            pendente:     { label: 'Pendente',    cls: 'bg-yellow-100 text-yellow-700' },
            em_andamento: { label: 'Em Produção', cls: 'bg-blue-100 text-blue-700' },
            em_revisao:   { label: 'Em Revisão',  cls: 'bg-violet-100 text-violet-700' },
            aprovado:     { label: 'Aprovado',    cls: 'bg-green-100 text-green-700' },
            publicado:    { label: 'Publicado',   cls: 'bg-emerald-100 text-emerald-700' },
            concluido:    { label: 'Concluído',   cls: 'bg-green-100 text-green-700' },
          }
          return (
            <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-gray-200 dark:border-white/[0.08] overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.08] flex items-center justify-between bg-gray-50 dark:bg-white/[0.03]">
                <button onClick={() => setAdminMonthDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"><ChevronLeft size={16} className="text-gray-500 dark:text-white/50" /></button>
                <div className="text-center">
                  <h3 className="font-extrabold text-gray-900 dark:text-white/90 text-sm">{mesesNomes[month]} {year}</h3>
                  <span className="text-xs text-gray-400 dark:text-white/40">{allItems.length} demandas · {daysInMonth} dias</span>
                </div>
                <div className="flex items-center gap-1">
                  {!isCurrentMonth && <button onClick={() => { const n = new Date(); setAdminMonthDate(new Date(n.getFullYear(), n.getMonth(), 1)) }} className="px-2 py-1 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition">Hoje</button>}
                  <button onClick={() => setAdminMonthDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition"><ChevronRight size={16} className="text-gray-500 dark:text-white/50" /></button>
                </div>
              </div>
              <div ref={calendarScrollRef} className="flex overflow-x-auto gap-4 p-4 bg-gray-50/60 dark:bg-transparent" style={{ scrollSnapType: 'x mandatory', scrollBehavior: 'smooth' }}>
                {monthDays.map((day) => {
                  const dayStr = day.toISOString().split('T')[0]
                  const isToday = dayStr === todayStr
                  const dayItems = sortDayItems(allItems.filter(d => d._data?.slice(0,10) === dayStr).sort((a, b) => { const pa = (getTag(a._tipo, a.id) || a.status) === 'publicado' ? 1 : 0; const pb = (getTag(b._tipo, b.id) || b.status) === 'publicado' ? 1 : 0; return pa - pb }), dayStr)
                  const plataformaColor = { 'Instagram': '#e1306c', 'Facebook': '#1877f2', 'TikTok': '#010101', 'YouTube': '#ff0000', 'Twitter': '#1da1f2', 'LinkedIn': '#0a66c2' }
                  const isDragTarget = dragOverDay === dayStr && draggedItem
                  return (
                    <div
                      key={dayStr}
                      data-day={dayStr}
                      onDragOver={e => { e.preventDefault(); setDragOverDay(dayStr) }}
                      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverDay(null) }}
                      onDrop={e => {
                        e.preventDefault()
                        if (draggedItem && draggedItem._data?.slice(0,10) !== dayStr) {
                          atualizarData(draggedItem._tipo, draggedItem.id, dayStr)
                        }
                        setDraggedItem(null)
                        setDragOverDay(null)
                      }}
                      className={'flex-shrink-0 flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-colors duration-150 ' + (isToday ? 'bg-blue-50/40 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/30' : 'bg-white dark:bg-white/[0.04] border-gray-100 dark:border-white/[0.08]') + (isDragTarget ? ' ring-2 ring-inset ring-blue-400' : '')}
                      style={{ minWidth: 285, height: 520, scrollSnapAlign: 'start' }}
                    >
                      <div className={'flex items-center gap-2 px-4 py-3 border-b ' + (isToday ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30' : 'border-gray-100 dark:border-white/[0.08] bg-white dark:bg-white/[0.03]')}>
                        <span className={'text-[10px] font-extrabold uppercase tracking-widest ' + (isToday ? 'text-blue-500' : 'text-gray-400 dark:text-white/40')}>{diasNomes[day.getDay()]}</span>
                        <span className={'text-sm font-extrabold flex items-center justify-center flex-shrink-0 ' + (isToday ? 'w-7 h-7 rounded-full bg-blue-600 text-white shadow-sm' : 'text-gray-800 dark:text-white/80')}>
                          {day.getDate()}
                        </span>
                        {dayItems.length > 0 && (
                          <span className={'ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ' + (isToday ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50')}>
                            {dayItems.length}
                          </span>
                        )}
                      </div>
                      <div className="p-2 space-y-2 flex-1 flex flex-col min-h-0">
                        {!isReadOnly && <div
                          onClick={() => { setNovoPostForm(f => ({...f, id_evento: filtroEvento !== 'todos' ? filtroEvento : (data.eventos.length === 1 ? String(data.eventos[0].id) : ''), data_publicacao: dayStr})); setShowNovoPost(true) }}
                          className="flex items-center justify-center py-1.5 rounded-lg border-2 border-dashed border-gray-200 dark:border-white/[0.10] text-gray-300 dark:text-white/20 hover:border-blue-400 hover:text-blue-400 hover:bg-blue-50/50 transition cursor-pointer group"
                        >
                          <Plus size={13} className="group-hover:scale-110 transition-transform" />
                        </div>}
                        <div className="overflow-y-auto space-y-2 flex-1 min-h-0">
                          {dayItems.map(d => {
                            const atrasado = dayStr < todayStr && !['concluido','aprovado','publicado','cancelado'].includes(d.status)
                            const accentColor = atrasado ? '#ef4444' : (plataformaColor[d.plataforma] || '#6b7280')
                            const isDraggingThis = draggedItem && draggedItem.id === d.id && draggedItem._tipo === d._tipo
                            const cardTag = getTag(d._tipo, d.id)
                            const autoTagKey = atrasado ? 'atrasado' : (STATUS_TO_TAG[d.status] || null)
                            const activeTagKey = cardTag || autoTagKey
                            const tagConf = activeTagKey ? TAGS_STATUS.find(t => t.key === activeTagKey) : null
                            const borderColor = tagConf ? tagConf.color : accentColor
                            const alertaHora = isAlertaHorario(d._data, d.hora_publicacao, activeTagKey)
                            return (
                              <div
                                key={d._tipo+'-'+d.id}
                                draggable
                                onDragStart={e => { e.stopPropagation(); setDraggedItem({...d}) }}
                                onDragEnd={() => { setDraggedItem(null); setDragOverDay(null); setDragOverCard(null) }}
                                onDragOver={e => handleCardDragOver(e, d._tipo+'-'+d.id)}
                                onDrop={e => handleCardDrop(e, d, dayStr, dayItems)}
                                onClick={() => { setDetalhe({...d}); carregarArquivosDetalhe(d._tipo, d.id); setEditMode(false); setEditForm({}); carregarComentarios(d._tipo, d.id, false) }}
                                className={'rounded-xl bg-white dark:bg-white/[0.06] border border-gray-300 dark:border-gray-600 cursor-grab select-none transition-all duration-150 hover:shadow-md shadow-sm '
                                  + (isDraggingThis ? 'opacity-40 scale-95 ' : '')
                                  + (dragOverCard === d._tipo+'-'+d.id && !isDraggingThis ? 'ring-2 ring-inset ring-blue-400 ' : '')
                                  + (alertaHora ? 'ring-2 ring-red-500 bg-red-50 dark:bg-red-500/10 ' : '')}
                              >
                                <div className="px-3 py-2.5 space-y-2">
                                  <div className="flex items-start justify-between gap-1">
                                    <div className="flex gap-1 flex-wrap flex-1 min-w-0">
                                      {getEtiquetas(d._tipo, d.id).map(etKey => {
                                        const et = ETIQUETAS_PADRAO.find(e => e.key === etKey)
                                        return et
                                          ? <span key={etKey} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: isDark ? et.darkBg : et.bg, color: isDark ? et.darkColor : et.color }}>{et.label}</span>
                                          : <span key={etKey} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.08] text-gray-500 dark:text-white/50">🏷️ {etKey}</span>
                                      })}
                                    </div>
                                    {tagConf && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: tagConf.color + '20', color: tagConf.color }}>{tagConf.label}</span>
                                    )}
                                  </div>
                                  {alertaHora && <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500 text-white animate-pulse"><Clock size={10} /><span className="text-[10px] font-bold">HORÁRIO PRÓXIMO</span></div>}
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white/90 line-clamp-2 leading-snug">{d.titulo || 'Sem título'}</p>
                                  <p className="text-xs font-medium truncate" style={{ color: borderColor }}>{d.evento_nome}</p>
                                  {(d.formato || d.tipo_conteudo) && (
                                    <div className="flex gap-1 flex-wrap">
                                      {d.formato && d.formato.split(',').filter(Boolean).map(f => (
                                        <span key={f} className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md">{f.trim()}</span>
                                      ))}
                                      {d.tipo_conteudo && d.tipo_conteudo.split(',').filter(Boolean).map(t => (
                                        <span key={t} className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">{t.trim()}</span>
                                      ))}
                                    </div>
                                  )}
                                  {/* Uploads */}
                                  <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-white/40">
                                    <div className="flex items-center gap-1">
                                      <Paperclip size={10} />
                                      <span className="font-semibold">Uploads: {(cardArquivos[d._tipo + '-' + d.id] || []).length}</span>
                                    </div>
                                    {d.hora_publicacao && <span className="flex items-center gap-0.5 font-bold text-gray-500 dark:text-white/50"><Clock size={9} />{d.hora_publicacao.slice(0,5)}</span>}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}


        {/* Briefings list */}
        </>
      )}

      {/* ===== NOVO POST MODAL ===== */}
      {showNovoPost && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowNovoPost(false)}>
          <div className="bg-white dark:bg-[#1c1c24] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white dark:bg-[#1c1c24] border-b border-gray-100 dark:border-white/[0.08] p-4 flex items-center justify-between rounded-t-2xl z-10">
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white/90">Novo Post</h3>
                <p className="text-xs text-gray-400 dark:text-white/40">Criar novo post no cronograma</p>
              </div>
              <button onClick={() => setShowNovoPost(false)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center text-gray-400 dark:text-white/50 hover:text-gray-600 dark:hover:text-white/80 text-lg font-bold">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Evento */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Evento *</label>
                <select value={novoPostForm.id_evento} onChange={e => setNovoPostForm({...novoPostForm, id_evento: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                  <option value="">Selecione um evento</option>
                  {eventosAtivos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                </select>
              </div>
              {/* Aparecer para o Designer */}
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-gray-50 dark:bg-white/[0.04]">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white/80">🎨 Aparecer para o Designer?</p>
                  <p className="text-[10px] text-gray-400 dark:text-white/40 mt-0.5">O designer do evento também recebe essa demanda</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNovoPostForm(f => ({...f, destino: f.destino === 'design' ? 'social' : 'design'}))}
                  className={'relative w-11 h-6 rounded-full overflow-hidden transition-colors flex-shrink-0 ' + (novoPostForm.destino === 'design' ? 'bg-accent' : 'bg-gray-300')}
                >
                  <span className={'absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ' + (novoPostForm.destino === 'design' ? 'translate-x-5' : 'translate-x-0')} />
                </button>
              </div>
              {/* Titulo, Plataforma, Data, Hora */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Titulo *</label>
                  <input placeholder="Titulo do post" value={novoPostForm.titulo} onChange={e => setNovoPostForm({...novoPostForm, titulo: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Plataforma</label>
                  <select value={novoPostForm.plataforma} onChange={e => setNovoPostForm({...novoPostForm, plataforma: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                    {['Instagram','Facebook','TikTok','YouTube','Twitter','LinkedIn','WhatsApp'].map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Data Publicacao</label>
                  <input type="date" value={novoPostForm.data_publicacao} onChange={e => setNovoPostForm({...novoPostForm, data_publicacao: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Hora {isSocialMedia && <span className="text-red-500">*</span>}</label>
                  <input type="time" value={novoPostForm.hora_publicacao} onChange={e => setNovoPostForm({...novoPostForm, hora_publicacao: e.target.value})}
                    className={'w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent ' + (isSocialMedia && !novoPostForm.hora_publicacao ? 'border-red-300' : 'border-gray-200')} />
                </div>
              </div>
              {/* Tipo de Conteudo */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Tipo de Conteudo</label>
                <div className="flex gap-2 flex-wrap">
                  {['GIF','VIDEO','ESTATICA','FOTO ORGÂNICA','VÍDEO ORGÂNICO','INTERAÇÃO'].map(tc => (
                    <button key={tc} type="button" onClick={() => toggleNovoPostMulti('tipo_conteudo', tc)}
                      className={'px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition ' + (novoPostForm.tipo_conteudo?.split(',').includes(tc) ? 'border-blue-500 bg-blue-500 text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300')}>
                      {tc === 'ESTATICA' ? '🖼️' : tc === 'VIDEO' ? '🎬' : '✨'} {tc}
                    </button>
                  ))}
                </div>
              </div>
              {/* Formato */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Formato</label>
                <div className="flex gap-2 flex-wrap">
                  {['FEED','STORIES','CARROSSEL','REELS'].map(fm => (
                    <button key={fm} type="button" onClick={() => toggleNovoPostMulti('formato', fm)}
                      className={'px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition ' + (novoPostForm.formato?.split(',').includes(fm) ? 'border-blue-500 bg-blue-500 text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-blue-300')}>
                      {fm === 'FEED' ? '📱' : fm === 'STORIES' ? '📲' : fm === 'CARROSSEL' ? '🔄' : '🎥'} {fm}
                    </button>
                  ))}
                </div>
              </div>
              {/* Conteudo */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Conteudo / Legenda</label>
                <textarea placeholder="Conteudo ou legenda do post" value={novoPostForm.conteudo} onChange={e => setNovoPostForm({...novoPostForm, conteudo: e.target.value})}
                  rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              {/* Briefing / Descricao */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Briefing</label>
                <textarea placeholder="Descreva o que o designer precisa criar..." value={novoPostForm.descricao} onChange={e => setNovoPostForm({...novoPostForm, descricao: e.target.value})}
                  rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              {/* Referencia e Musica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Referencia</label>
                  <input placeholder="Link ou descricao" value={novoPostForm.referencia} onChange={e => setNovoPostForm({...novoPostForm, referencia: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Musica</label>
                  <input placeholder="Nome ou link" value={novoPostForm.musica} onChange={e => setNovoPostForm({...novoPostForm, musica: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
              </div>
              {/* Collaborators */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Collaborators Instagram</label>
                <input placeholder="@usuario1, @usuario2 (até 5 contas)" value={novoPostForm.collaborators} onChange={e => setNovoPostForm({...novoPostForm, collaborators: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
                <p className="text-[10px] text-gray-400 mt-0.5">Convite de collab enviado ao publicar. Contas precisam ser públicas.</p>
              </div>
              {/* Arquivos */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Arquivos</label>
                {novoPostArquivos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {novoPostArquivos.map((item, idx) => (
                      <div key={idx} className="relative group">
                        {item.previewUrl ? (
                          <img src={item.previewUrl} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <FileText size={16} className="text-gray-400" />
                          </div>
                        )}
                        <button onClick={() => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); setNovoPostArquivos(prev => prev.filter((_, i) => i !== idx)) }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition">
                          <XIcon size={10} />
                        </button>
                        <p className="text-[9px] text-gray-400 mt-0.5 truncate w-16">{item.file.name}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400','bg-blue-50') }}
                  onDragLeave={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50') }}
                  onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50'); const novos = Array.from(e.dataTransfer.files).map(file => ({ file, previewUrl: file.type.startsWith('image') ? URL.createObjectURL(file) : null })); setNovoPostArquivos(prev => [...prev, ...novos]) }}
                  className="relative flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-200 text-xs font-medium text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer">
                  <input type="file" accept="image/*,video/*,.pdf" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={e => { const novos = Array.from(e.target.files).map(file => ({ file, previewUrl: file.type.startsWith('image') ? URL.createObjectURL(file) : null })); setNovoPostArquivos(prev => [...prev, ...novos]); e.target.value = '' }} />
                  <Paperclip size={14} /> Arraste ou clique para adicionar
                </div>
              </div>
              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowNovoPost(false)} className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/60 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-white/[0.12] transition">Cancelar</button>
                <button onClick={criarNovoPost} disabled={criandoPost}
                  className="flex-1 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent/90 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {criandoPost ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Criando...</> : <><Plus size={16} /> Criar Post</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETAIL MODAL (Designer/SocialMedia/Admin) ===== */}
      {detalhe && (() => {
        const d = detalhe
        const etqs = getEtiquetas(d._tipo, d.id)

        function toggleMultiEdit(field, val) {
          const arr = (editForm[field]||'').split(',').filter(Boolean)
          const idx = arr.indexOf(val)
          if (idx >= 0) arr.splice(idx, 1); else arr.push(val)
          setEditForm({...editForm, [field]: arr.join(',')})
        }

        /* -- shared input classes -- */
        const inputCls = 'w-full bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.10] rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white/90 placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/40 transition'
        const selectCls = inputCls
        const textareaCls = inputCls + ' resize-none'
        const sectionHdr = 'text-xs font-bold text-gray-500 dark:text-white/60 uppercase tracking-wider mb-3'
        const dateDisabledCls = isDateReadOnly ? ' opacity-60 cursor-not-allowed' : ''

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.85)' }} onClick={() => { setDetalhe(null); setEditMode(false); setEditForm({}) }}>
            <div className="rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border" style={{ backgroundColor: isDark ? '#1e1e2a' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>

              {/* ── Header ── */}
              <div className="sticky top-0 border-b px-6 py-4 flex items-center justify-between rounded-t-2xl z-10 flex-shrink-0" style={{ backgroundColor: isDark ? '#1e1e2a' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
                <div className="flex-1 min-w-0">
                  {editMode ? (
                    <h3 className="font-extrabold text-gray-900 dark:text-white/95 text-lg">Editar Demanda</h3>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {(() => {
                          const tag = getTag(d._tipo, d.id)
                          const tagObj = tag && TAGS_STATUS.find(t => t.key === tag)
                          if (tagObj) {
                            return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border" style={{ backgroundColor: tagObj.color + '18', color: tagObj.color, borderColor: tagObj.color + '35' }}>{tagObj.label}</span>
                          }
                          return <span className={'text-[11px] font-bold px-2.5 py-0.5 rounded-full border ' + (statusColors[d.status] || 'bg-gray-100 text-gray-600 border-gray-200')}>{statusLabels[d.status] || d.status}</span>
                        })()}
                        {d.plataforma && d._tipo === 'post' && <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pink-50 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/25">{d.plataforma}</span>}
                      </div>
                      <h3 className="font-extrabold text-gray-900 dark:text-white/95 text-lg leading-tight truncate">{d.titulo || 'Sem titulo'}</h3>
                    </>
                  )}
                  <p className="text-xs font-semibold text-pink-500 dark:text-pink-400 mt-0.5">{d.evento_nome}</p>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-white/50 mt-1">
                    {d.criado_em ? (
                      <>Demanda lançada às {new Date(d.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h')} do dia {new Date(d.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</>
                    ) : (
                      <span className="text-gray-400 dark:text-white/30">Data de lançamento não disponível</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                  {editMode ? (
                    <>
                      <button onClick={() => { setEditMode(false); setEditForm({}) }}
                        className="text-xs px-3.5 py-1.5 rounded-lg font-semibold bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition">
                        Cancelar
                      </button>
                      <button onClick={salvarEdicao}
                        className="text-xs px-4 py-1.5 rounded-lg font-bold bg-accent text-white hover:opacity-90 transition shadow-sm">
                        Salvar
                      </button>
                    </>
                  ) : (
                    <>
                      {!isReadOnly && !isDesigner && <button
                        onClick={() => {
                          setEditMode(true)
                          setEditForm({
                            titulo: d.titulo||'', descricao: d.descricao||'', conteudo: d.conteudo||'',
                            referencia: d.referencia||'', musica: d.musica||'',
                            data_vencimento: d.data_vencimento||'', data_publicacao: d.data_publicacao||'',
                            hora_publicacao: d.hora_publicacao||'', collaborators: d.collaborators||'',
                            tipo_conteudo: d.tipo_conteudo||'', formato: d.formato||'',
                            plataforma: d.plataforma||'Instagram', status: d.status||'pendente',
                            id_evento: d.id_evento||'',
                            aparecer_designer: !!d.aparecer_designer,
                          })
                        }}
                        className="text-xs px-3.5 py-1.5 rounded-lg font-semibold bg-accent/10 text-accent hover:bg-accent/20 transition">
                        Editar
                      </button>}
                      <button onClick={() => { setDetalhe(null); setEditMode(false); setEditForm({}) }}
                        className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-white/[0.08] flex items-center justify-center text-gray-400 dark:text-white/50 hover:text-gray-600 dark:hover:text-white/80 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition">
                        <XIcon size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

                {editMode ? (
                  /* ═══════════ EDIT MODE ═══════════ */
                  <>
                    {/* Informacoes principais */}
                    <div>
                      <p className={sectionHdr}>Informacoes principais</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Titulo</label>
                          <input value={editForm.titulo||''} onChange={e => setEditForm({...editForm, titulo: e.target.value})}
                            className={inputCls} placeholder="Nome da demanda" />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Evento</label>
                          <select value={editForm.id_evento||''} onChange={e => setEditForm({...editForm, id_evento: e.target.value})}
                            className={selectCls}>
                            {eventosAtivos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Status</label>
                          <select value={editForm.status||''} onChange={e => setEditForm({...editForm, status: e.target.value})}
                            className={selectCls}>
                            {TAGS_STATUS.map(tag => (
                              <option key={tag.key} value={tag.key}>{tag.label}</option>
                            ))}
                          </select>
                        </div>
                        {d._tipo === 'post' && (
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Plataforma</label>
                            <select value={editForm.plataforma||'Instagram'} onChange={e => setEditForm({...editForm, plataforma: e.target.value})}
                              className={selectCls}>
                              {['Instagram','Facebook','TikTok','YouTube','Twitter','LinkedIn','WhatsApp'].map(p => <option key={p}>{p}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Publicacao */}
                    {d._tipo === 'post' && (
                      <div>
                        <p className={sectionHdr}>Publicacao</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 flex items-center gap-1.5">
                              <Calendar size={12} /> Data de Publicacao
                            </label>
                            <input type="date" value={editForm.data_publicacao?.slice(0,10)||''} onChange={e => !isDateReadOnly && setEditForm({...editForm, data_publicacao: e.target.value})}
                              disabled={isDateReadOnly}
                              className={inputCls + dateDisabledCls} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 flex items-center gap-1.5">
                              <Clock size={12} /> Hora
                            </label>
                            <input type="time" value={editForm.hora_publicacao||''} onChange={e => !isDateReadOnly && setEditForm({...editForm, hora_publicacao: e.target.value})}
                              disabled={isDateReadOnly}
                              className={inputCls + dateDisabledCls} />
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Collaborators</label>
                          <input value={editForm.collaborators||''} onChange={e => setEditForm({...editForm, collaborators: e.target.value})}
                            placeholder="@usuario1, @usuario2"
                            className={inputCls} />
                        </div>
                      </div>
                    )}

                    {/* Configuracao de conteudo */}
                    <div>
                      <p className={sectionHdr}>Configuracao de conteudo</p>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-2 block">Tipo de Conteudo</label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              {val:'GIF', icon:'GIF'},
                              {val:'VIDEO', icon:'VID'},
                              {val:'ESTATICA', icon:'IMG'},
                              {val:'FOTO ORGANICA', icon:'ORG'},
                              {val:'VIDEO ORGANICO', icon:'REC'},
                              {val:'INTERACAO', icon:'INT'},
                            ].map(tc => {
                              const ativo = (editForm.tipo_conteudo||'').split(',').includes(tc.val)
                              return (
                                <button key={tc.val} type="button" onClick={() => toggleMultiEdit('tipo_conteudo', tc.val)}
                                  className={'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ' + (ativo
                                    ? 'border-amber-400 bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                                    : 'border-gray-200 dark:border-white/[0.10] text-gray-500 dark:text-white/50 hover:border-amber-300 dark:hover:border-amber-500/40 bg-white dark:bg-white/[0.04]')}>
                                  <span className="opacity-60 mr-1 text-[10px]">{tc.icon}</span> {tc.val}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-2 block">Formato</label>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              {val:'FEED', icon:'FEED'},
                              {val:'STORIES', icon:'STO'},
                              {val:'CARROSSEL', icon:'CAR'},
                              {val:'REELS', icon:'REEL'},
                            ].map(fm => {
                              const ativo = (editForm.formato||'').split(',').includes(fm.val)
                              return (
                                <button key={fm.val} type="button" onClick={() => toggleMultiEdit('formato', fm.val)}
                                  className={'px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ' + (ativo
                                    ? 'border-blue-400 bg-blue-500 text-white shadow-sm shadow-blue-500/25'
                                    : 'border-gray-200 dark:border-white/[0.10] text-gray-500 dark:text-white/50 hover:border-blue-300 dark:hover:border-blue-500/40 bg-white dark:bg-white/[0.04]')}>
                                  <span className="opacity-60 mr-1 text-[10px]">{fm.icon}</span> {fm.val}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Conteudo */}
                    <div>
                      <p className={sectionHdr}>Conteudo</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Briefing para o Designer</label>
                          <textarea value={editForm.descricao||''} onChange={e => setEditForm({...editForm, descricao: e.target.value})}
                            rows={4} placeholder="Descreva o que precisa ser criado..."
                            className={textareaCls} />
                        </div>
                        {d._tipo === 'post' && (
                          <div>
                            <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Legenda / Conteudo</label>
                            <textarea value={editForm.conteudo||''} onChange={e => setEditForm({...editForm, conteudo: e.target.value})}
                              rows={4} placeholder="Legenda do post..."
                              className={textareaCls} />
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Referencia (link)</label>
                          <input value={editForm.referencia||''} onChange={e => setEditForm({...editForm, referencia: e.target.value})}
                            placeholder="Link ou descricao"
                            className={inputCls} />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-500 dark:text-white/50 mb-1.5 block">Musica</label>
                          <input value={editForm.musica||''} onChange={e => setEditForm({...editForm, musica: e.target.value})}
                            placeholder="Nome ou link"
                            className={inputCls} />
                        </div>
                      </div>
                    </div>

                    {/* Uploads */}
                    <div>
                      <p className={sectionHdr}>Uploads</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="rounded-xl border-2 border-dashed border-green-300 dark:border-green-500/30 bg-green-50/40 dark:bg-green-500/[0.04] p-4">
                          <p className="text-xs font-bold text-green-600 dark:text-green-400 mb-1">Upload Publicavel</p>
                          <p className="text-[10px] text-gray-400 dark:text-white/30 mb-3">Pode ser publicado no Instagram</p>
                          <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 dark:bg-green-500/15 text-green-600 dark:text-green-400 text-xs font-semibold hover:bg-green-500/20 transition cursor-pointer">
                            <input type="file" accept="image/*,video/*,.pdf" multiple className="hidden"
                              onChange={e => { Array.from(e.target.files).forEach(file => uploadArquivo(d._tipo, d.id, file)); e.target.value='' }} />
                            <Plus size={14} /> Anexar arquivo
                          </label>
                        </div>
                        <div className="rounded-xl border-2 border-dashed border-amber-300 dark:border-amber-500/30 bg-amber-50/40 dark:bg-amber-500/[0.04] p-4">
                          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">Upload de Referencia</p>
                          <p className="text-[10px] text-gray-400 dark:text-white/30 mb-3">Uso interno - NAO publica no Instagram</p>
                          <label className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition cursor-pointer">
                            <input type="file" accept="image/*,video/*,.pdf,.psd,.ai,.zip" multiple className="hidden"
                              onChange={e => { Array.from(e.target.files).forEach(file => uploadRefArquivo(d._tipo, d.id, file)); e.target.value='' }} />
                            <Plus size={14} /> Anexar referencia
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Visibilidade */}
                    {!isDesigner && (
                      <div>
                        <p className={sectionHdr}>Visibilidade</p>
                        <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/[0.10] bg-gray-50/80 dark:bg-white/[0.03]">
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white/80">Aparecer para o Designer</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/40 mt-0.5">O designer do evento tambem visualiza essa demanda</p>
                          </div>
                          <button type="button"
                            onClick={() => setEditForm(f => ({...f, aparecer_designer: !f.aparecer_designer}))}
                            className={'relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ' + (editForm.aparecer_designer ? 'bg-accent' : 'bg-gray-300 dark:bg-white/20')}>
                            <span className={'absolute left-0.5 top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ' + (editForm.aparecer_designer ? 'translate-x-5' : 'translate-x-0')} />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit mode footer */}
                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-white/[0.08]">
                      {(isSocialMedia || isAdmin || isDiretor) ? (
                        <button onClick={() => excluirDemanda(d.id, () => setDetalhe(null))}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-red-500 dark:text-red-400 border border-red-200 dark:border-red-500/25 hover:bg-red-50 dark:hover:bg-red-500/10 transition">
                          Excluir Demanda
                        </button>
                      ) : <div />}
                      <div className="flex items-center gap-2">
                        {d._tipo === 'post' && d.status !== 'publicado' && (
                          <button onClick={() => publicarInstagram(d.id)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-white/70 bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] transition">
                            Publicar agora
                          </button>
                        )}
                        <button onClick={salvarEdicao}
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-accent text-white hover:opacity-90 transition shadow-sm">
                          Salvar Alteracoes
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* ═══════════ VIEW MODE ═══════════ */
                  <>
                    {/* Etiquetas */}
                    <div>
                      <p className={sectionHdr}>Etiquetas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ETIQUETAS_PADRAO.map(et => {
                          const ativa = etqs.includes(et.key)
                          return (
                            <button key={et.key} onClick={() => toggleEtiqueta(d._tipo, d.id, et.key)}
                              className="flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full border-2 transition-all"
                              style={ativa
                                ? { backgroundColor: isDark ? et.darkBg : et.bg, color: isDark ? et.darkColor : et.color, borderColor: isDark ? et.darkBorder : et.border }
                                : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                              {et.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Tags de Status */}
                    <div>
                      <p className={sectionHdr}>Tags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {TAGS_STATUS.map(tag => {
                          const ativa = getTag(d._tipo, d.id) === tag.key
                          const designerBloqueado = isDesigner && tag.key !== 'em_andamento' && tag.key !== 'recebido'
                          const naoEntregueApenas = tag.key === 'nao_entregue' && isDesigner
                          const bloqueado = designerBloqueado || naoEntregueApenas
                          return (
                            <button key={tag.key} onClick={() => !isReadOnly && !bloqueado && setTagStatus(d._tipo, d.id, tag.key)} disabled={isReadOnly || bloqueado}
                              className="text-xs font-semibold px-3 py-1 rounded-full border-2 transition-all disabled:cursor-not-allowed disabled:opacity-30"
                              style={ativa
                                ? { backgroundColor: tag.color + '18', color: tag.color, borderColor: tag.color }
                                : { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
                              {tag.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Metadata badges */}
                    {(d.tipo_conteudo || d.formato || d.plataforma || d.data_vencimento || d.data_publicacao) && (
                      <div className="space-y-3">
                        <p className={sectionHdr}>Detalhes</p>
                        {(d.tipo_conteudo || d.formato || d.plataforma) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {d.plataforma && d._tipo === 'post' && <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-pink-50 dark:bg-pink-500/15 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-500/25">{d.plataforma}</span>}
                            {(d.tipo_conteudo||'').split(',').filter(Boolean).map(tc => <span key={tc} className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/25">{tc}</span>)}
                            {(d.formato||'').split(',').filter(Boolean).map(fm => <span key={fm} className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/25">{fm}</span>)}
                          </div>
                        )}
                        {(d.data_vencimento || d.data_publicacao) && (
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-white/50">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-gray-400 dark:text-white/40" />
                              {fmtData(d.data_vencimento || d.data_publicacao)}
                            </span>
                            {d.hora_publicacao && (
                              <span className="flex items-center gap-1.5">
                                <Clock size={13} className="text-gray-400 dark:text-white/40" />
                                {d.hora_publicacao.slice(0,5)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content blocks */}
                    {(d.descricao || d.conteudo || d.referencia || d.musica || d.collaborators) && (
                      <div className="space-y-3">
                        <p className={sectionHdr}>Conteudo</p>
                        {d.descricao && (
                          <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl px-4 py-3 border border-gray-100 dark:border-white/[0.06]">
                            <p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wider mb-1.5">Briefing</p>
                            <p className="text-sm text-gray-700 dark:text-white/70 whitespace-pre-wrap leading-relaxed">{d.descricao}</p>
                          </div>
                        )}
                        {d.conteudo && (
                          <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl px-4 py-3 border border-gray-100 dark:border-white/[0.06]">
                            <p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wider mb-1.5">Legenda / Conteudo</p>
                            <p className="text-sm text-gray-700 dark:text-white/70 whitespace-pre-wrap leading-relaxed">{d.conteudo}</p>
                          </div>
                        )}
                        {(d.referencia || d.musica) && (
                          <div className="grid grid-cols-2 gap-3">
                            {d.referencia && (
                              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl px-4 py-3 border border-gray-100 dark:border-white/[0.06]">
                                <p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wider mb-1">Referencia</p>
                                <p className="text-xs text-gray-700 dark:text-white/70 break-all">{d.referencia}</p>
                              </div>
                            )}
                            {d.musica && (
                              <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl px-4 py-3 border border-gray-100 dark:border-white/[0.06]">
                                <p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wider mb-1">Musica</p>
                                <p className="text-xs text-gray-700 dark:text-white/70">{d.musica}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {d.collaborators && (
                          <div className="bg-gray-50 dark:bg-white/[0.03] rounded-xl px-4 py-3 border border-gray-100 dark:border-white/[0.06]">
                            <p className="text-[10px] text-gray-400 dark:text-white/40 font-bold uppercase tracking-wider mb-1">Collaborators</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">{d.collaborators}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Designer upload publicavel (view mode) */}
                    {isDesigner && (
                      <div>
                        <p className={sectionHdr}>Upload Publicavel</p>
                        <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-green-300 dark:border-green-500/30 text-xs font-semibold text-green-600 dark:text-green-400 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-500/[0.06] transition cursor-pointer">
                          <input type="file" accept="image/*,video/*,.pdf" multiple className="hidden"
                            onChange={e => { Array.from(e.target.files).forEach(file => uploadArquivo(d._tipo, d.id, file)); e.target.value='' }} />
                          <Plus size={14} /> Anexar arquivo publicavel
                        </label>
                      </div>
                    )}

                    {/* Instagram actions */}
                    {d._tipo === 'post' && (() => {
                      const igPostId = d.id
                      const igStatus = d.status
                      const igAutoPublish = d.auto_publish || false
                      const igHora = d.hora_publicacao
                      const igBoostStatus = d.boost_status || null
                      return (
                        <div className="space-y-3">
                          <p className={sectionHdr}>Instagram</p>
                          {igStatus !== 'publicado' && (
                            <>
                              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.08]">
                                <span className={'text-xs font-semibold ' + (igAutoPublish ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-white/40')}>
                                  {igAutoPublish ? ('Agendado ' + (igHora ? igHora.slice(0,5) : '')) : 'Agendar publicacao'}
                                </span>
                                <button onClick={e => { e.stopPropagation(); toggleAutoPublish(igPostId, igAutoPublish) }}
                                  className={'relative w-10 h-5 rounded-full transition-colors ' + (igAutoPublish ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/20')}>
                                  <span className={'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ' + (igAutoPublish ? 'translate-x-5' : 'translate-x-0.5')} />
                                </button>
                              </div>
                              <button onClick={e => { e.stopPropagation(); publicarInstagram(igPostId) }}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:from-purple-600 hover:via-pink-600 hover:to-orange-500 transition text-white text-xs font-bold shadow-sm">
                                Publicar no Instagram
                              </button>
                            </>
                          )}
                          {igStatus === 'publicado' && (
                            <>
                              <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20">
                                <CheckCircle size={14} className="text-green-600 dark:text-green-400" />
                                <span className="text-xs font-bold text-green-600 dark:text-green-400">Publicado</span>
                              </div>
                              {showBoostConfig === igPostId ? (
                                <div className="space-y-3 p-4 rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/[0.04]">
                                  <p className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Configurar Impulsionamento</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="text-[10px] text-gray-500 dark:text-white/50 font-semibold mb-1 block">Orcamento (centavos)</label>
                                      <input type="number" value={boostForm.budget} onChange={e => setBoostForm({...boostForm, budget: Number(e.target.value)})}
                                        className={inputCls} />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-500 dark:text-white/50 font-semibold mb-1 block">Duracao (dias)</label>
                                      <input type="number" value={boostForm.duration} onChange={e => setBoostForm({...boostForm, duration: Number(e.target.value)})}
                                        className={inputCls} />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-500 dark:text-white/50 font-semibold mb-1 block">Idade min.</label>
                                      <input type="number" value={boostForm.age_min} onChange={e => setBoostForm({...boostForm, age_min: Number(e.target.value)})}
                                        className={inputCls} />
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-500 dark:text-white/50 font-semibold mb-1 block">Idade max.</label>
                                      <input type="number" value={boostForm.age_max} onChange={e => setBoostForm({...boostForm, age_max: Number(e.target.value)})}
                                        className={inputCls} />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-gray-500 dark:text-white/50 font-semibold mb-1 block">Cidades (separadas por virgula)</label>
                                    <input value={boostForm.cities} onChange={e => setBoostForm({...boostForm, cities: e.target.value})} placeholder="Ex: Sao Paulo, Rio de Janeiro"
                                      className={inputCls} />
                                  </div>
                                  <div className="flex gap-2">
                                    <button onClick={() => setShowBoostConfig(null)}
                                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-white/[0.08] text-gray-600 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/[0.12] transition">Cancelar</button>
                                    <button onClick={() => impulsionarPost(igPostId)} disabled={boostingId === igPostId}
                                      className={'flex-1 py-2 rounded-xl text-xs font-bold text-white transition ' + (boostingId === igPostId ? 'bg-gray-400 animate-pulse' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600')}>
                                      {boostingId === igPostId ? 'Criando...' : 'Confirmar'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  {igBoostStatus === 'active' ? (
                                    <button onClick={e => { e.stopPropagation(); pararBoost(igPostId) }}
                                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition">
                                      Pausar Impulsionamento
                                    </button>
                                  ) : (
                                    <button onClick={e => { e.stopPropagation(); setShowBoostConfig(igPostId) }}
                                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition text-white text-xs font-bold shadow-sm">
                                      Impulsionar
                                    </button>
                                  )}
                                </>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })()}
                  </>
                )}

                {/* ── Arquivos enviados (preview) ── */}
                {(arquivos.length > 0 || refArquivos.length > 0) && (
                  <div className="border-t border-gray-100 dark:border-white/[0.08] pt-5 space-y-4">
                    {arquivos.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">Publicaveis ({arquivos.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                          {arquivos.map(a => {
                            const isImg = a.tipo?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(a.nome_original || '')
                            const fileUrl = '/api' + a.url
                            return (
                              <div key={a.id} className="group relative rounded-xl overflow-hidden border border-green-200 dark:border-green-500/20 bg-gray-50 dark:bg-white/[0.03] hover:shadow-md transition">
                                {isImg
                                  ? <img src={fileUrl} alt={a.nome_original} className="w-full h-20 object-cover cursor-pointer hover:opacity-80 transition" onClick={() => openPreviewWithNav(a, arquivos)} />
                                  : <a href={fileUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center h-20 gap-1 text-gray-400 hover:text-blue-600 transition"><FileText size={20} /><span className="text-[10px] font-medium px-2 truncate w-full text-center">{a.nome_original}</span></a>
                                }
                                <a href={fileUrl} download={a.nome_original || 'arquivo'} onClick={e => e.stopPropagation()}
                                  className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10">
                                  <Download size={13} className="text-white" />
                                </a>
                                <button onClick={e => { e.stopPropagation(); deletarArquivo(a.id, d._tipo, d.id) }}
                                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] font-bold">
                                  <XIcon size={10} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {refArquivos.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Referencias ({refArquivos.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                          {refArquivos.map(a => {
                            const isImg = a.tipo?.startsWith('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(a.nome_original || '')
                            const fileUrl = '/api' + a.url
                            return (
                              <div key={a.id} className="group relative rounded-xl overflow-hidden border border-amber-200 dark:border-amber-500/20 bg-gray-50 dark:bg-white/[0.03] hover:shadow-md transition">
                                {isImg
                                  ? <img src={fileUrl} alt={a.nome_original} className="w-full h-20 object-cover cursor-pointer hover:opacity-80 transition" onClick={() => openPreviewWithNav(a, refArquivos)} />
                                  : <a href={fileUrl} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center h-20 gap-1 text-gray-400 hover:text-amber-600 transition"><FileText size={20} /><span className="text-[10px] font-medium px-2 truncate w-full text-center">{a.nome_original}</span></a>
                                }
                                <a href={fileUrl} download={a.nome_original || 'arquivo'} onClick={e => e.stopPropagation()}
                                  className="absolute bottom-1.5 right-1.5 w-7 h-7 bg-amber-500 hover:bg-amber-600 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-10">
                                  <Download size={13} className="text-white" />
                                </a>
                                <button onClick={e => { e.stopPropagation(); deletarArquivo(a.id, d._tipo, d.id) }}
                                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-[10px] font-bold">
                                  <XIcon size={10} />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Comments ── */}
                <div className="border-t border-gray-100 dark:border-white/[0.08] pt-5 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-xs font-bold text-gray-500 dark:text-white/60 uppercase tracking-wider">Comentarios ({comentarios.length})</p>
                    <span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium">OBS: apos realizar a alteracao, altere a tag para "recebido"</span>
                  </div>
                  {comentarios.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {comentarios.map(c => (
                        <div key={c.id} className="bg-gray-50 dark:bg-white/[0.03] rounded-xl px-4 py-2.5 border border-gray-100 dark:border-white/[0.06]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-gray-700 dark:text-white/80">{c.usuario_nome}</span>
                            <span className="text-[10px] text-gray-400 dark:text-white/40">{new Date(c.criado_em).toLocaleDateString('pt-BR')} {new Date(c.criado_em).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-white/60 whitespace-pre-wrap">{c.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input value={novoComentario} onChange={e => setNovoComentario(e.target.value)}
                      placeholder="Escreva um comentario..."
                      className={'flex-1 ' + inputCls}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarComentario(d._tipo, d.id, false) } }} />
                    <button onClick={() => enviarComentario(d._tipo, d.id, false)}
                      className="px-4 py-2.5 bg-accent text-white rounded-xl text-xs font-bold hover:opacity-90 transition flex-shrink-0 shadow-sm">Enviar</button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )
      })()}
      {previewArquivo && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => { setPreviewArquivo(null); setPreviewArquivoList([]); setPreviewArquivoIndex(0) }}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <a href={'/api' + previewArquivo.url} download={previewArquivo.nome_original || previewArquivo.nome || 'arquivo'}
              className="absolute -top-3 -left-3 w-8 h-8 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg flex items-center justify-center transition z-10">
              <Download size={16} className="text-white" />
            </a>
            <button onClick={() => { setPreviewArquivo(null); setPreviewArquivoList([]); setPreviewArquivoIndex(0) }} className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition z-10">
              <XIcon size={16} className="text-gray-600" />
            </button>

            {/* Setas de navegação */}
            {previewArquivoList.length > 1 && (
              <>
                {previewArquivoIndex > 0 && (
                  <button onClick={() => previewNavegar(-1)}
                    className="absolute left-[-48px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition z-20">
                    <ChevronLeft size={22} className="text-gray-700" />
                  </button>
                )}
                {previewArquivoIndex < previewArquivoList.length - 1 && (
                  <button onClick={() => previewNavegar(1)}
                    className="absolute right-[-48px] top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition z-20">
                    <ChevronRight size={22} className="text-gray-700" />
                  </button>
                )}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {previewArquivoIndex + 1} / {previewArquivoList.length}
                </div>
              </>
            )}

            {previewArquivo.tipo && previewArquivo.tipo.startsWith('image') ? (
              <img src={'/api' + previewArquivo.url} className="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain" />
            ) : previewArquivo.tipo && previewArquivo.tipo.startsWith('video') ? (
              <video src={'/api' + previewArquivo.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg shadow-2xl" />
            ) : (
              <div className="bg-white dark:bg-[#1c1c24] rounded-lg p-8 text-center shadow-2xl">
                <FileText size={48} className="text-gray-400 mx-auto mb-3" />
                <p className="text-sm text-gray-600 dark:text-white/60 mb-3">{previewArquivo.nome_original || previewArquivo.nome || 'Arquivo'}</p>
                <a href={'/api' + previewArquivo.url} download={previewArquivo.nome_original || previewArquivo.nome || 'arquivo'}
                  className="text-sm text-blue-500 hover:underline font-medium">Baixar arquivo</a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
