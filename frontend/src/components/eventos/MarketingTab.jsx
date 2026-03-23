import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, Plus, Trash2, Calendar, Clock, FileText, Megaphone, Brain, TrendingUp, MapPin, BarChart3, Lightbulb, Target, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Copy, ChevronLeft, ChevronRight, Paperclip, Pencil, X as XIcon, Send, Instagram } from 'lucide-react'
import api from '../../api/client'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Modal from '../ui/Modal'
import EmptyState from '../ui/EmptyState'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const subTabs = [
  { key: 'cronograma', label: 'Cronograma', icon: '📅', desc: 'Calendário de posts' },
  { key: 'briefings', label: 'Briefings', icon: '🎨', desc: 'Kanban de criação' },
  { key: 'trafego', label: 'Tráfego', icon: '🚀', desc: 'Funil de anúncios' },
  { key: 'materiais', label: 'Materiais', icon: '📁', desc: 'Arquivos e assets' },
  { key: 'aprovacoes', label: 'Aprovações', icon: '✅', desc: 'Revisar e aprovar' },
  { key: 'campanhas', label: 'Campanhas IA', icon: '🤖', desc: 'Gerador de campanhas' },
  { key: 'analise', label: 'Análise IA', icon: '📊', desc: 'Insights e métricas' },
]

const tiposBriefing = ['post', 'stories', 'reels', 'banner', 'flyer', 'video']

const statusColors = {
  pendente: 'yellow',

  em_andamento: 'blue',
  em_revisao: 'purple',
  aprovado: 'green',
  publicado: 'green',
  cancelado: 'red',
}

const plataformas = ['Instagram', 'Facebook', 'TikTok', 'YouTube', 'Twitter/X', 'LinkedIn', 'WhatsApp']

const kanbanColumns = [
  { key: 'pendente', label: 'Pendente', gradient: 'from-yellow-400 to-orange-500' },
  { key: 'em_andamento', label: 'Em Produção', gradient: 'from-blue-400 to-blue-600' },
  { key: 'em_revisao', label: 'Revisão', gradient: 'from-blue-400 to-blue-600' },
  { key: 'aprovado', label: 'Aprovado', gradient: 'from-green-400 to-emerald-600' },
  { key: 'publicado', label: 'Publicado', gradient: 'from-teal-400 to-cyan-600' },
]
const statusFlow = ['pendente', 'em_andamento', 'em_revisao', 'aprovado', 'publicado']

const plataformaColors = {
  'Instagram': 'bg-gradient-to-r from-blue-500 to-blue-500',
  'Facebook': 'bg-blue-600',
  'TikTok': 'bg-gray-900',
  'YouTube': 'bg-red-600',
  'Twitter/X': 'bg-sky-500',
  'LinkedIn': 'bg-blue-800',
  'WhatsApp': 'bg-green-600',
}
const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const dayNames = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export default function MarketingTab({ eventoId }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeSubTab, setActiveSubTabState] = useState(() => searchParams.get('subtab') || 'cronograma')
  function setActiveSubTab(tab) {
    setActiveSubTabState(tab)
    const params = new URLSearchParams(searchParams)
    params.set('subtab', tab)
    setSearchParams(params, { replace: true })
  }
  const { usuario } = useAuth()
  const funcao = usuario?.funcao || 'viewer'
  const isDesigner = funcao === 'designer'
  const isSocialMedia = funcao === 'social_media'
  const isDiretor = funcao === 'diretor'
  const isAdmin = funcao === 'admin'
  const canCreatePlan = isSocialMedia || isAdmin || isDiretor
  const canApprovePlan = isDiretor || isAdmin
  const [briefings, setBriefings] = useState([])
  const [cronograma, setCronograma] = useState([])
  const [loading, setLoading] = useState(true)
  const [gerandoIA, setGerandoIA] = useState(false)
  const [showBriefingForm, setShowBriefingForm] = useState(false)
  const [showCronogramaForm, setShowCronogramaForm] = useState(false)
  const [cronogramaFormDate, setCronogramaFormDate] = useState(null)
  const [editandoPost, setEditandoPost] = useState(null)
  const [showIAModal, setShowIAModal] = useState(false)
  const [buscaBriefing, setBuscaBriefing] = useState('')
  const [arquivos, setArquivos] = useState({})
  const [uploading, setUploading] = useState(null)
  const [briefingDetalhe, setBriefingDetalhe] = useState(null)
  const [editBriefingMode, setEditBriefingMode] = useState(false)
  const [editBriefingForm, setEditBriefingForm] = useState({})
  const [previewArquivo, setPreviewArquivo] = useState(null)
  const [diaSelecionado, setDiaSelecionado] = useState(null)
  const [planejamentos, setPlanejamentos] = useState([])
  const [showPlanejamentoModal, setShowPlanejamentoModal] = useState(false)
  const [showPlanejamentoDetalhe, setShowPlanejamentoDetalhe] = useState(null)
  const [estrategiaText, setEstrategiaText] = useState('')
  const [feedbacksPosts, setFeedbacksPosts] = useState({})
  const [feedbackGeral, setFeedbackGeral] = useState('')

  async function carregarArquivos(briefingId) {
    try {
      const { data } = await api.get('/briefings/' + briefingId + '/arquivos')
      setArquivos(prev => ({...prev, [briefingId]: data}))
    } catch {}
  }

  async function uploadArquivo(briefingId, file) {
    setUploading(briefingId)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      await api.post('/briefings/' + briefingId + '/arquivos', formData)
      toast.success('Arquivo enviado!')
      carregarArquivos(briefingId)
      carregarDados()
    carregarIgConnection()
    carregarFunnel()
    } catch(err) { toast.error('Erro: ' + (err.response?.data?.erro || err.message)) }
    finally { setUploading(null) }
  }

  async function deletarArquivo(arquivoId, briefingId) {
    try {
      await api.delete('/arquivos/' + arquivoId)
      toast.success('Arquivo removido')
      carregarArquivos(briefingId)
      carregarDados()
    } catch { toast.error('Erro ao remover') }
  }

  const [tipoIA, setTipoIA] = useState('post')
  const [direcionamentoIA, setDirecionamentoIA] = useState('')
  const [briefingGerado, setBriefingGerado] = useState(null)
  const [campanhas, setCampanhas] = useState([])
  const [gerandoCampanha, setGerandoCampanha] = useState(false)
  const [showCampanhaModal, setShowCampanhaModal] = useState(false)
  const [campForm, setCampForm] = useState({objetivo:'engajamento',orcamento:'500',duracao:'7',plataforma:'Instagram + Facebook',direcionamento:''})
  const [analises, setAnalises] = useState([])
  const [gerandoAnalise, setGerandoAnalise] = useState(false)
  const [analiseAtual, setAnaliseAtual] = useState(null)
  const [analiseExpandida, setAnaliseExpandida] = useState(null)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [calendarView, setCalendarView] = useState('week')

  useEffect(() => {
    carregarDados()
    carregarIgConnection()
  }, [eventoId])

  async function carregarDados() {
    try {
      const [bRes, cRes, campRes, anRes, planRes, matArqRes, cronArqRes] = await Promise.all([
        api.get(`/eventos/${eventoId}/briefings`),
        api.get(`/eventos/${eventoId}/cronograma`),
        api.get(`/eventos/${eventoId}/campanhas`),
        api.get(`/eventos/${eventoId}/analises`),
        api.get(`/eventos/${eventoId}/planejamentos`),
        api.get(`/eventos/${eventoId}/materiais-arquivos`),
        api.get(`/eventos/${eventoId}/cronograma-arquivos`),
      ])
      setBriefings(bRes.data)
      setCronograma(cRes.data)
      // Agrupar arquivos do cronograma por cronograma_id (1 request em vez de N)
      const arqMap = {}
      cronArqRes.data.forEach(a => { if (!arqMap[a.cronograma_id]) arqMap[a.cronograma_id] = []; arqMap[a.cronograma_id].push(a) })
      setCronogramaArquivos(arqMap)
      setCampanhas(campRes.data)
      setAnalises(anRes.data)
      setPlanejamentos(planRes.data)
      setMateriaisArquivos(matArqRes.data)
      // Carregar arquivos de todos os briefings
      bRes.data.forEach(b => carregarArquivos(b.id))
    } catch {
      toast.error('Erro ao carregar dados de marketing')
    } finally {
      setLoading(false)
    }
  }

  async function gerarCampanha() {
    setGerandoCampanha(true)
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/ia/campanha', campForm)
      setCampanhas(prev => [data, ...prev])
      setShowCampanhaModal(false)
      toast.success('Campanha gerada com sucesso!')
    } catch {
      toast.error('Erro ao gerar campanha')
    } finally {
      setGerandoCampanha(false)
    }
  }

  async function deletarCampanha(id) {
    if (!confirm('Tem certeza que deseja remover esta campanha?')) return
    try {
      await api.delete('/campanhas/' + id)
      setCampanhas(prev => prev.filter(c => c.id !== id))
      toast.success('Campanha removida')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  async function gerarAnalise() {
    setGerandoAnalise(true)
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/ia/analise-semanal')
      setAnaliseAtual(data)
      setAnalises(prev => [data, ...prev])
      toast.success('Análise gerada com sucesso!')
    } catch {
      toast.error('Erro ao gerar análise semanal')
    } finally {
      setGerandoAnalise(false)
    }
  }

  async function deletarAnalise(id) {
    if (!confirm('Tem certeza que deseja remover esta análise?')) return
    try {
      await api.delete('/analises/' + id)
      setAnalises(prev => prev.filter(a => a.id !== id))
      if (analiseAtual && analiseAtual.id === id) setAnaliseAtual(null)
      toast.success('Análise removida')
    } catch {
      toast.error('Erro ao remover análise')
    }
  }

  async function gerarBriefingIA() {
    setGerandoIA(true)
    try {
      const { data } = await api.post(`/eventos/${eventoId}/ia/briefing`, { tipo: tipoIA, contexto_extra: direcionamentoIA })
      setBriefingGerado(data)
    } catch {
      toast.error('Erro ao gerar briefing com IA')
    } finally {
      setGerandoIA(false)
    }
  }

  async function salvarBriefingGerado() {
    if (!briefingGerado) return
    try {
      await api.post(`/eventos/${eventoId}/briefings`, {
        titulo: briefingGerado.titulo,
        tipo: briefingGerado.tipo,
        descricao: briefingGerado.descricao,
        publico_alvo: briefingGerado.publico_alvo,
        mensagem_chave: briefingGerado.mensagem_chave,
        referencias_visuais: briefingGerado.referencias_visuais,
        dimensoes: briefingGerado.dimensoes,
        status: 'pendente',
      })
      setBriefingGerado(null)
      setShowIAModal(false)
      await carregarDados()
      toast.success('Briefing salvo!')
    } catch {
      toast.error('Erro ao salvar briefing')
    }
  }

  async function adicionarBriefing(dados) {
    try {
      // Sempre cria no cronograma (backend cria briefing automaticamente se destino=design)
      await api.post(`/eventos/${eventoId}/cronograma`, {
        titulo: dados.titulo,
        plataforma: dados.plataforma || 'Instagram',
        tipo_conteudo: dados.tipo_conteudo,
        formato: dados.formato,
        conteudo: dados.legenda || '',
        descricao: dados.descricao,
        data_publicacao: dados.data_vencimento,
        hora_publicacao: dados.hora_vencimento,
        referencia: dados.referencia,
        musica: dados.musica,
        destino: dados.destino,
        status: 'pendente',
      })
      toast.success(dados.destino === 'design' ? 'Briefing e post criados' : 'Post adicionado ao cronograma')
      await carregarDados()
      setShowBriefingForm(false)
    } catch {
      toast.error('Erro ao adicionar')
    }
  }

  async function removerBriefing(id) {
    if (!confirm('Tem certeza que deseja remover este briefing?')) return
    try {
      const res = await api.delete(`/briefings/${id}`)
      setBriefings((prev) => prev.filter((b) => b.id !== id))
      if (res.data?.cronograma_id) {
        setCronograma((prev) => prev.filter((c) => c.id !== res.data.cronograma_id))
      }
      toast.success('Briefing e post removidos')
    } catch {
      toast.error('Erro ao remover briefing')
    }
  }

  async function salvarEditBriefing() {
    try {
      await api.patch('/briefings/' + briefingDetalhe.id, editBriefingForm)
      toast.success('Briefing atualizado!')
      setBriefingDetalhe({...briefingDetalhe, ...editBriefingForm})
      setEditBriefingMode(false)
      carregarBriefings()
    } catch { toast.error('Erro ao salvar') }
  }

  async function atualizarBriefing(id, dados) {
    try {
      await api.patch(`/briefings/${id}`, dados)
      await carregarDados()
      toast.success('Briefing atualizado')
    } catch {
      toast.error('Erro ao atualizar briefing')
    }
  }

  async function duplicarBriefing(b) {
    try {
      await api.post(`/eventos/${eventoId}/briefings`, {
        titulo: b.titulo + ' (cópia)',
        tipo: b.tipo,
        descricao: b.descricao,
        publico_alvo: b.publico_alvo,
        mensagem_chave: b.mensagem_chave,
        referencias_visuais: b.referencias_visuais,
        dimensoes: b.dimensoes,
        tipo_conteudo: b.tipo_conteudo,
        formato: b.formato,
        referencia: b.referencia,
        musica: b.musica,
        data_vencimento: b.data_vencimento,
        status: 'pendente',
      })
      await carregarDados()
      toast.success('Briefing duplicado!')
    } catch {
      toast.error('Erro ao duplicar briefing')
    }
  }

  const [publicandoIG, setPublicandoIG] = useState(null)
  const [funnel, setFunnel] = useState(null)
  const [funnelForm, setFunnelForm] = useState({})

  function updateFunnelForm(key, val) {
    setFunnelForm(prev => ({...prev, [key]: val}))
  }

  function saveFunnelField(key) {
    const val = funnelForm[key]
    if(val !== undefined && val !== (funnel?.[key]||'')) {
      salvarFunnel({[key]: val})
    }
  }
  const [funnelLoading, setFunnelLoading] = useState(false)
  const [activatingFunnel, setActivatingFunnel] = useState(false)

  async function carregarFunnel() {
    try {
      const { data } = await api.get('/eventos/' + eventoId + '/funnel')
      setFunnel(data)
      setFunnelForm({
        total_budget: data.total_budget ? (data.total_budget/100).toFixed(0) : '500',
        target_city: data.target_city || '',
        target_radius: data.target_radius || 50,
        ticket_url: data.ticket_url || '',
        target_age_min: data.target_age_min || 18,
        target_age_max: data.target_age_max || 45,
        cta: data.cta || 'LEARN_MORE',
        target_interests: data.target_interests && data.target_interests !== '[]' ? data.target_interests : '',
      })
    } catch { setFunnel(null) }
  }

  async function salvarFunnel(updates) {
    try {
      const { data } = await api.patch('/eventos/' + eventoId + '/funnel', updates)
      setFunnel(data)
      toast.success('Funil atualizado')
    } catch { toast.error('Erro ao salvar') }
  }

  async function ativarFunnel() {
    setActivatingFunnel(true)
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/funnel/activate')
      toast.success('Funil ativado! ' + Object.keys(data.phases).length + ' fases criadas')
      carregarFunnel()
    } catch(err) {
      toast.error(err.response?.data?.erro || 'Erro ao ativar funil')
    } finally { setActivatingFunnel(false) }
  }

  async function pausarFunnel() {
    try {
      await api.post('/eventos/' + eventoId + '/funnel/pause')
      toast.success('Funil pausado')
      carregarFunnel()
    } catch { toast.error('Erro ao pausar') }
  }

  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [aiLogs, setAiLogs] = useState([])
  const [abTests, setAbTests] = useState([])
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState(null)

  async function carregarMetrics() {
    setMetricsLoading(true)
    try {
      const { data } = await api.get('/eventos/' + eventoId + '/funnel/metrics')
      setMetrics(data)
    } catch { setMetrics(null) }
    finally { setMetricsLoading(false) }
  }

  useEffect(() => {
    if(activeSubTab === 'trafego' && funnel?.status === 'active') carregarMetrics()
  }, [activeSubTab, funnel?.status])

  async function carregarAiLogs() {
    try {
      const [logsRes, abRes] = await Promise.all([
        api.get('/eventos/' + eventoId + '/ai-logs'),
        api.get('/eventos/' + eventoId + '/ab-tests')
      ])
      setAiLogs(logsRes.data)
      setAbTests(abRes.data)
    } catch {}
  }

  async function forcarAnaliseAI() {
    setAiAnalyzing(true)
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/ai-analyze')
      setAiResult(data)
      toast.success('Análise concluída!')
      carregarAiLogs()
    } catch(err) {
      const msg = err.response?.data?.erro || err.response?.data?.message || 'Erro na análise'
      if(msg.includes('Sem dados')) {
        toast('Sem dados ainda — publique posts e aguarde os anúncios rodarem', { icon: '📊' })
      } else {
        toast.error(msg)
      }
    } finally { setAiAnalyzing(false) }
  }

  useEffect(() => {
    if(activeSubTab === 'trafego') carregarAiLogs()
  }, [activeSubTab])

  const [boostingId, setBoostingId] = useState(null)
  const [showBoostConfig, setShowBoostConfig] = useState(null)
  const [boostForm, setBoostForm] = useState({ budget: 2000, duration: 3, age_min: 18, age_max: 45, cities: '' })

  async function impulsionarPost(postId) {
    setBoostingId(postId)
    try {
      const { data } = await api.post('/cronograma/' + postId + '/boost', boostForm)
      toast.success('Campanha criada!')
      setShowBoostConfig(null)
      await carregarDados()
    } catch(err) {
      toast.error(err.response?.data?.erro || 'Erro ao impulsionar')
    } finally { setBoostingId(null) }
  }

  async function pararBoost(postId) {
    try {
      await api.post('/cronograma/' + postId + '/boost-stop')
      toast.success('Campanha pausada')
      await carregarDados()
    } catch { toast.error('Erro ao pausar') }
  }

  async function toggleBoostEnabled(postId, current) {
    try {
      await api.patch('/cronograma/' + postId, { boost_enabled: !current, ...(!current ? boostForm : {}) })
      await carregarDados()
      toast.success(!current ? 'Impulsionamento ativado - será impulsionado ao publicar' : 'Impulsionamento desativado')
    } catch { toast.error('Erro') }
  }

  async function toggleAutoPublish(postId, currentValue) {
    try {
      await api.patch('/cronograma/' + postId, { auto_publish: !currentValue })
      await carregarDados()
      toast.success(!currentValue ? 'Publicação automática ativada' : 'Publicação automática desativada')
    } catch { toast.error('Erro ao atualizar') }
  }
  const [igConnection, setIgConnection] = useState(null)
  const [loadingIG, setLoadingIG] = useState(false)
  const [showIGModal, setShowIGModal] = useState(false)
  const [igAccounts, setIgAccounts] = useState([])
  const [igTokenInput, setIgTokenInput] = useState('')
  const [savingIGToken, setSavingIGToken] = useState(false)
  const [showAddToken, setShowAddToken] = useState(false)

  async function carregarIgAccounts() {
    try {
      const { data } = await api.get('/instagram/accounts')
      setIgAccounts(data)
    } catch { setIgAccounts([]) }
  }

  async function adicionarContaIG() {
    if (!igTokenInput.trim()) return toast.error('Cole o token')
    setSavingIGToken(true)
    try {
      const { data } = await api.post('/instagram/accounts', { access_token: igTokenInput.trim() })
      toast.success('@' + data.username + ' adicionado!')
      setIgTokenInput('')
      setShowAddToken(false)
      carregarIgAccounts()
    } catch(err) {
      toast.error(err.response?.data?.erro || 'Token inválido')
    } finally { setSavingIGToken(false) }
  }

  async function selecionarContaIG(accountId) {
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/instagram/connect', { account_id: accountId })
      toast.success('Conectado: @' + data.username)
      setShowIGModal(false)
      carregarIgConnection()
    carregarFunnel()
    } catch(err) {
      toast.error(err.response?.data?.erro || 'Erro ao conectar')
    }
  }

  async function removerContaIG(id) {
    if (!confirm('Remover esta conta do sistema?')) return
    try {
      await api.delete('/instagram/accounts/' + id)
      toast.success('Conta removida')
      carregarIgAccounts()
    } catch { toast.error('Erro ao remover') }
  }

  async function carregarIgConnection() {
    carregarFunnel()
    carregarAiLogs()
    try {
      const { data } = await api.get('/eventos/' + eventoId + '/instagram')
      setIgConnection(data)
    } catch { setIgConnection(null) }
  }

  async function conectarInstagram() {
    setLoadingIG(true)
    try {
      const { data } = await api.get('/instagram/connect/' + eventoId)
      const popup = window.open(data.url, 'instagram_connect', 'width=600,height=700,scrollbars=yes')
      const check = setInterval(() => {
        if (popup && popup.closed) {
          clearInterval(check)
          setLoadingIG(false)
          carregarIgConnection()
    carregarFunnel()
        }
      }, 1000)
    } catch(err) { toast.error('Erro ao conectar'); setLoadingIG(false) }
  }

  async function desconectarInstagram() {
    if (!confirm('Desconectar Instagram deste evento?')) return
    try {
      await api.delete('/eventos/' + eventoId + '/instagram')
      setIgConnection(null)
      toast.success('Instagram desconectado')
    } catch { toast.error('Erro ao desconectar') }
  }
  async function publicarNoInstagram(postId) {
    if (!confirm('Publicar este post no Instagram agora?')) return
    setPublicandoIG(postId)
    try {
      const { data } = await api.post('/cronograma/' + postId + '/publicar-instagram')
      toast.success('Publicado no Instagram!')
      await carregarDados()
    } catch(err) {
      toast.error(err.response?.data?.erro || 'Erro ao publicar no Instagram')
    } finally { setPublicandoIG(null) }
  }

  async function adicionarCronograma(dados, arquivosSelecionados) {
    try {
      const { data: post } = await api.post(`/eventos/${eventoId}/cronograma`, dados)
      setShowCronogramaForm(false)
      toast.success('Post criado!')
      if (arquivosSelecionados && arquivosSelecionados.length > 0) {
        for (let i = 0; i < arquivosSelecionados.length; i++) {
          const file = arquivosSelecionados[i]
          const toastId = toast.loading(`Enviando ${file.name} (${i+1}/${arquivosSelecionados.length})...`)
          try {
            const formData = new FormData()
            formData.append('arquivo', file)
            await api.post(`/cronograma/${post.id}/arquivos`, formData, { timeout: 600000 })
            toast.success(`${file.name} enviado!`, { id: toastId })
          } catch (uploadErr) {
            toast.error('Erro: ' + (uploadErr.response?.data?.erro || uploadErr.message), { id: toastId })
          }
        }
      }
      await carregarDados()
    } catch (err) {
      toast.error('Erro: ' + (err.response?.data?.erro || err.message))
    }
  }

  async function removerCronograma(id) {
    if (!confirm('Tem certeza que deseja remover este post?')) return
    try {
      await api.delete(`/cronograma/${id}`)
      setCronograma((prev) => prev.filter((c) => c.id !== id))
      toast.success('Post removido')
    } catch {
      toast.error('Erro ao remover post')
    }
  }

  async function atualizarCronograma(id, dados) {
    try {
      await api.patch(`/cronograma/${id}`, dados)
      await carregarDados()
    } catch {
      toast.error('Erro ao atualizar post')
    }
  }

  async function salvarEdicaoPost(dados) {
    try {
      await api.patch(`/cronograma/${editandoPost.id}`, dados)
      setEditandoPost(null)
      await carregarDados()
      toast.success('Post atualizado!')
    } catch {
      toast.error('Erro ao atualizar post')
    }
  }

  // === PLANEJAMENTO SEMANAL ===
  function getWeekBounds(date) {
    const d = new Date(date)
    const day = d.getDay()
    const start = new Date(d)
    start.setDate(d.getDate() - day)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    function ds(dt) { return dt.getFullYear() + '-' + String(dt.getMonth()+1).padStart(2,'0') + '-' + String(dt.getDate()).padStart(2,'0') }
    return { inicio: ds(start), fim: ds(end), startDate: start, endDate: end }
  }

  function getPlanForWeek(weekStartStr) {
    return planejamentos.find(p => p.semana_inicio === weekStartStr)
  }

  async function criarPlanejamento(dados) {
    try {
      const { data } = await api.post(`/eventos/${eventoId}/planejamentos`, dados)
      setPlanejamentos(prev => [data, ...prev])
      setShowPlanejamentoModal(false)
      setEstrategiaText('')
      toast.success('Planejamento semanal criado!')
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao criar planejamento')
    }
  }

  async function atualizarPlanejamento(id, dados) {
    try {
      const { data } = await api.patch(`/planejamentos/${id}`, dados)
      setPlanejamentos(prev => prev.map(p => p.id === id ? {...p, ...data} : p))
      if (dados.status === 'enviado') toast.success('Planejamento enviado para aprovação!')
      if (dados.status === 'aprovado') toast.success('Planejamento aprovado!')
      if (dados.status === 'revisao') toast.success('Planejamento enviado para revisão')
      return data
    } catch {
      toast.error('Erro ao atualizar planejamento')
    }
  }

  async function deletarPlanejamento(id) {
    if (!confirm('Tem certeza que deseja remover este planejamento?')) return
    try {
      await api.delete(`/planejamentos/${id}`)
      setPlanejamentos(prev => prev.filter(p => p.id !== id))
      toast.success('Planejamento removido')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  async function carregarPlanejamentoDetalhe(id) {
    try {
      const { data } = await api.get(`/planejamentos/${id}`)
      setShowPlanejamentoDetalhe(data)
      setFeedbacksPosts({})
      setFeedbackGeral('')
      // Carregar arquivos dos posts da semana
      if (data.posts) data.posts.forEach(c => carregarCronogramaArquivos(c.id))
    } catch {
      toast.error('Erro ao carregar planejamento')
    }
  }

  // === ARQUIVOS CRONOGRAMA ===
  const [cronogramaArquivos, setCronogramaArquivos] = useState({})

  async function carregarCronogramaArquivos(cronogramaId) {
    try {
      const { data } = await api.get(`/cronograma/${cronogramaId}/arquivos`)
      setCronogramaArquivos(prev => ({...prev, [cronogramaId]: data}))
    } catch {}
  }

  async function uploadCronogramaArquivo(cronogramaId, file) {
    const toastId = toast.loading(`Enviando ${file.name}...`)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      await api.post(`/cronograma/${cronogramaId}/arquivos`, formData, { timeout: 600000 })
      toast.success('Arquivo enviado!', { id: toastId })
      carregarCronogramaArquivos(cronogramaId)
    } catch (err) {
      toast.error('Erro: ' + (err.response?.data?.erro || err.message), { id: toastId })
    }
  }

  async function deletarCronogramaArquivo(arquivoId, cronogramaId) {
    try {
      await api.delete(`/arquivos/${arquivoId}`)
      setCronogramaArquivos(prev => ({...prev, [cronogramaId]: (prev[cronogramaId] || []).filter(a => a.id !== arquivoId)}))
      toast.success('Arquivo removido')
    } catch {
      toast.error('Erro ao remover arquivo')
    }
  }

  // === MATERIAIS ARQUIVOS ===
  const [materiaisArquivos, setMateriaisArquivos] = useState([])
  const categoriasMateriaisOptions = ['Presskit', 'Vídeos YouTube', 'Logo Realização', 'Fotos e Vídeos Artistas', 'Artes Referência', 'Logo Patrocinadores', 'Outros']

  async function carregarMateriaisArquivos() {
    try {
      const { data } = await api.get(`/eventos/${eventoId}/materiais-arquivos`)
      setMateriaisArquivos(data)
    } catch {}
  }

  async function uploadMaterialArquivo(categoria, file) {
    const toastId = toast.loading(`Enviando ${file.name}...`)
    try {
      const formData = new FormData()
      formData.append('arquivo', file)
      formData.append('categoria', categoria)
      await api.post(`/eventos/${eventoId}/materiais-arquivos`, formData, { timeout: 600000 })
      toast.success('Arquivo enviado!', { id: toastId })
      carregarMateriaisArquivos()
    } catch (err) {
      toast.error('Erro: ' + (err.response?.data?.erro || err.message), { id: toastId })
    }
  }

  async function deletarMaterialArquivo(arquivoId) {
    try {
      await api.delete(`/arquivos/${arquivoId}`)
      setMateriaisArquivos(prev => prev.filter(a => a.id !== arquivoId))
      toast.success('Arquivo removido')
    } catch {
      toast.error('Erro ao remover arquivo')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Sub-tabs */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-1.5">
        <div className="flex gap-1 overflow-x-auto">
          {subTabs.filter(tab => !(isSocialMedia || isDesigner) || (tab.key !== 'campanhas' && tab.key !== 'analise' && tab.key !== 'aprovacoes' && tab.key !== 'trafego')).map((tab) => {
            const isActive = activeSubTab === tab.key
            const counts = {
              briefings: briefings.length,
              materiais: materiaisArquivos ? materiaisArquivos.length : 0,
              aprovacoes: planejamentos.filter(p => p.status === 'enviado').length,
            }
            const count = counts[tab.key]
            return (
              <button
                key={tab.key}
                onClick={() => setActiveSubTab(tab.key)}
                className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-accent text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                    isActive ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Briefings - Kanban Board */}
      {activeSubTab === 'briefings' && (() => {
        const briefingsFiltrados = buscaBriefing.trim() ? briefings.filter(b => b.titulo?.toLowerCase().includes(buscaBriefing.toLowerCase()) || b.descricao?.toLowerCase().includes(buscaBriefing.toLowerCase())) : briefings
        return (
        <div className="space-y-4">
          {/* Header */}
          <Card>
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-semibold text-gray-900">Briefings</h3>
                <input value={buscaBriefing} onChange={e => setBuscaBriefing(e.target.value)} placeholder="Buscar..." className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs focus:ring-2 focus:ring-accent outline-none w-36" />
                <div className="flex gap-2">
                  <span className="bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {briefingsFiltrados.filter(b => b.status !== 'cancelado').length} total
                  </span>
                  {briefingsFiltrados.filter(b => b.status === 'pendente').length > 0 && (
                    <span className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2.5 py-0.5 rounded-full text-xs font-bold">
                      {briefingsFiltrados.filter(b => b.status === 'pendente').length} pendentes
                    </span>
                  )}
                  {briefingsFiltrados.filter(b => b.data_vencimento && new Date(b.data_vencimento + 'T23:59:59') < new Date() && !['aprovado','publicado','cancelado'].includes(b.status)).length > 0 && (
                    <span className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-bold animate-pulse">
                      {briefingsFiltrados.filter(b => b.data_vencimento && new Date(b.data_vencimento + 'T23:59:59') < new Date() && !['aprovado','publicado','cancelado'].includes(b.status)).length} atrasados
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!isDesigner && <Button size="sm" variant="secondary" onClick={() => { setShowIAModal(true); setBriefingGerado(null) }}>
                  <Sparkles size={16} />
                  Gerar com IA
                </Button>}
                {!isDesigner && <Button size="sm" onClick={() => setShowBriefingForm(!showBriefingForm)}>
                  <Plus size={16} />
                  {showBriefingForm ? 'Cancelar' : 'Novo Briefing'}
                </Button>}
              </div>
            </div>
          </Card>

          {showBriefingForm && (
            <Card>
              <BriefingForm onSubmit={adicionarBriefing} onCancel={() => setShowBriefingForm(false)} />
            </Card>
          )}

          {/* Kanban Board */}
          {briefingsFiltrados.filter(b => b.status !== 'cancelado').length === 0 ? (
            <Card>
              <EmptyState icon={FileText} title="Nenhum briefing" description="Crie briefings manualmente ou gere com IA" />
            </Card>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-4">
              {kanbanColumns.map((col, colIdx) => {
                const items = briefingsFiltrados.filter(b => b.status === col.key)
                return (
                  <div key={col.key} className="flex-shrink-0 w-72">
                    {/* Column Header */}
                    <div className={`bg-gradient-to-r ${col.gradient} rounded-t-xl px-4 py-2.5 flex items-center justify-between`}>
                      <span className="text-white font-bold text-sm">{col.label}</span>
                      <span className="bg-white/25 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{items.length}</span>
                    </div>
                    {/* Column Body */}
                    <div className="bg-gray-50/80 rounded-b-xl p-2.5 space-y-2.5 border border-t-0 border-gray-200" style={{ minHeight: 420 }}>
                      {[...items].sort((a,b) => (a.data_vencimento||'9999') < (b.data_vencimento||'9999') ? -1 : 1).map(b => {
                        const isAtrasado = b.data_vencimento && new Date(b.data_vencimento + 'T23:59:59') < new Date() && !['aprovado','publicado','cancelado'].includes(b.status)
                        return (
                          <div key={b.id} className={`bg-white rounded-xl border ${isAtrasado ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'} hover:shadow-md transition-all`}>
                            <div className="p-3 space-y-2">
                              <div className="flex items-start justify-between gap-1">
                                <h4 onClick={() => { carregarArquivos(b.id); setBriefingDetalhe(b) }} className="font-bold text-gray-900 text-xs leading-tight flex-1 cursor-pointer hover:text-blue-600 transition">{b.titulo}</h4>
                                {isAtrasado && <span className="text-[9px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">ATRASADO</span>}
                              </div>
                              {b.data_vencimento && (
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                  <Calendar size={10} className={isAtrasado ? 'text-red-400 dark:text-red-400' : 'text-blue-400'} />
                                  <span className={isAtrasado ? 'text-red-600 dark:text-red-400 font-semibold' : 'font-medium'}>{new Date(b.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}{b.hora_vencimento ? ' ' + b.hora_vencimento.slice(0,5) : ''}</span>
                                </div>
                              )}
                              {b.tipo_conteudo && (
                                <div className="flex flex-wrap gap-1">{b.tipo_conteudo.split(',').filter(Boolean).map(tc => (
                                  <span key={tc} className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold">{tc === 'ESTATICA' ? '🖼️' : tc === 'VIDEO' ? '🎬' : '✨'} {tc}</span>
                                ))}</div>
                              )}
                              {b.formato && (
                                <div className="flex flex-wrap gap-1">{b.formato.split(',').filter(Boolean).map(fm => (
                                  <span key={fm} className="px-1.5 py-0.5 bg-violet-50 dark:bg-violet-500/10 text-blue-600 dark:text-blue-400 rounded text-[10px] font-bold">{fm === 'FEED' ? '📱' : fm === 'STORIES' ? '📲' : fm === 'CARROSSEL' ? '🔄' : '🎥'} {fm}</span>
                                ))}</div>
                              )}
                              {b.descricao && <p className="text-[11px] text-gray-500 line-clamp-2">{b.descricao}</p>}
                              {b.musica && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px]">🎵</span>
                                  <span className="text-[10px] text-gray-500 truncate">{b.musica}</span>
                                </div>
                              )}
                              {/* Arquivos */}
                              {(arquivos[b.id] || []).length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {(arquivos[b.id] || []).map(arq => (
                                    <div key={arq.id} className="relative group">
                                      {arq.tipo && arq.tipo.startsWith('image') ? (
                                        <div onClick={(e) => { e.stopPropagation(); setPreviewArquivo(arq) }} className="cursor-pointer">
                                          <img src={'/api' + arq.url} className="w-16 h-16 rounded-lg object-cover border border-gray-200 hover:shadow-md transition" />
                                        </div>
                                      ) : arq.tipo && arq.tipo.startsWith('video') ? (
                                        <div onClick={(e) => { e.stopPropagation(); setPreviewArquivo(arq) }} className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center cursor-pointer hover:shadow-md transition">
                                          <span className="text-lg">🎬</span>
                                        </div>
                                      ) : (
                                        <a href={'/api' + arq.url} download onClick={(e) => { e.stopPropagation() }} className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-md transition">
                                          <FileText size={14} className="text-gray-400" />
                                        </a>
                                      )}
                                      <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); deletarArquivo(arq.id, b.id) }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                        <XIcon size={8} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div
                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400','bg-blue-50') }}
                                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50') }}
                                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50'); const file = e.dataTransfer.files[0]; if(file) uploadArquivo(b.id, file) }}
                                className={`relative w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-[10px] font-semibold text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer ${uploading === b.id ? 'opacity-50 pointer-events-none' : ''}`}>
                                <input type="file" accept="image/*,video/*,.pdf"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  onChange={(e) => { const file = e.target.files[0]; if(file) uploadArquivo(b.id, file); e.target.value='' }} />
                                {uploading === b.id ? <span className="animate-spin">⏳</span> : <><Paperclip size={10} /> Upload arte</>}
                              </div>
                              {/* Card Actions */}
                              <div className="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                <div className="flex gap-0.5">
                                  {colIdx > 0 && (
                                    <button onClick={() => atualizarBriefing(b.id, { status: statusFlow[colIdx - 1] })} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title={`Mover para ${kanbanColumns[colIdx - 1].label}`}>
                                      <ArrowLeft size={13} />
                                    </button>
                                  )}
                                  {colIdx < kanbanColumns.length - 1 && (
                                    <button onClick={() => atualizarBriefing(b.id, { status: statusFlow[colIdx + 1] })} className="p-1 rounded hover:bg-blue-100 text-blue-400 hover:text-blue-600 transition" title={`Mover para ${kanbanColumns[colIdx + 1].label}`}>
                                      <ArrowRight size={13} />
                                    </button>
                                  )}
                                </div>
                                <div className="flex gap-0.5">
                                  {!isDesigner && <button onClick={() => duplicarBriefing(b)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition" title="Duplicar briefing">
                                    <Copy size={13} />
                                  </button>}
                                  {!isDesigner && <button onClick={() => removerBriefing(b.id)} className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition" title="Remover">
                                    <Trash2 size={13} />
                                  </button>}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {items.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-300">
                          <FileText size={24} />
                          <span className="text-xs mt-1.5">Nenhum item</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Cancelados */}
          {briefingsFiltrados.filter(b => b.status === 'cancelado').length > 0 && (
            <Card>
              <div className="p-3">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cancelados</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {briefingsFiltrados.filter(b => b.status === 'cancelado').map(b => (
                    <div key={b.id} className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg">
                      <span className="text-xs text-red-600 dark:text-red-400 line-through">{b.titulo}</span>
                      <button onClick={() => atualizarBriefing(b.id, { status: 'pendente' })} className="text-[10px] text-blue-500 dark:text-blue-400 hover:text-blue-700 font-medium">Restaurar</button>
                      <button onClick={() => removerBriefing(b.id)} className="text-red-300 hover:text-red-500"><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
        )
      })()}

      {/* Cronograma - Calendário Visual */}
      {activeSubTab === 'cronograma' && (() => {
        const year = calendarDate.getFullYear()
        const month = calendarDate.getMonth()
        const today = new Date()
        today.setHours(0,0,0,0)

        // Build month grid
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const startPad = firstDay.getDay()
        const totalDays = lastDay.getDate()
        const days = []
        const prevMonthLast = new Date(year, month, 0).getDate()
        for (let i = startPad - 1; i >= 0; i--) days.push({ date: new Date(year, month - 1, prevMonthLast - i), current: false })
        for (let d = 1; d <= totalDays; d++) days.push({ date: new Date(year, month, d), current: true })
        const remaining = 7 - (days.length % 7)
        if (remaining < 7) for (let i = 1; i <= remaining; i++) days.push({ date: new Date(year, month + 1, i), current: false })

        // Build week days
        const weekStart = new Date(calendarDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekDays = []
        for (let i = 0; i < 7; i++) { const d = new Date(weekStart); d.setDate(d.getDate() + i); weekDays.push(d) }

        function dateStr(d) { return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') }
        function postsForDate(date) {
          const ds = dateStr(date)
          return cronograma.filter(c => {
            if (!c.data_publicacao) return false
            const cpd = typeof c.data_publicacao === 'string' ? c.data_publicacao.slice(0,10) : new Date(c.data_publicacao).toISOString().slice(0,10)
            return cpd === ds
          })
        }

        function prevPeriod() {
          if (calendarView === 'month') setCalendarDate(new Date(year, month - 1, 1))
          else { const d = new Date(calendarDate); d.setDate(d.getDate() - 7); setCalendarDate(d) }
        }
        function nextPeriod() {
          if (calendarView === 'month') setCalendarDate(new Date(year, month + 1, 1))
          else { const d = new Date(calendarDate); d.setDate(d.getDate() + 7); setCalendarDate(d) }
        }

        const statusDot = { pendente: 'bg-yellow-400 dark:bg-yellow-500', em_andamento: 'bg-blue-500', publicado: 'bg-green-500', cancelado: 'bg-red-400' }

        return (
          <div className="space-y-4">
            {/* Calendar Header */}
            <Card>
              <div className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button onClick={prevPeriod} className="p-1.5 rounded-lg hover:bg-gray-100 transition"><ChevronLeft size={18} className="text-gray-600" /></button>
                    <h3 className="font-bold text-gray-900 text-lg min-w-[200px] text-center">{monthNames[month]} {year}</h3>
                    <button onClick={nextPeriod} className="p-1.5 rounded-lg hover:bg-gray-100 transition"><ChevronRight size={18} className="text-gray-600" /></button>
                  </div>
                  <button onClick={() => setCalendarDate(new Date())} className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-indigo-800 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-500/20 px-3 py-1.5 rounded-lg transition">Hoje</button>
                  <div className="flex bg-gray-100 rounded-lg p-0.5">
                    <button onClick={() => setCalendarView('month')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${calendarView === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Mês</button>
                    <button onClick={() => setCalendarView('week')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${calendarView === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Semana</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">{cronograma.length} posts</span>
                  {igConnection && (
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-pink-50 dark:bg-pink-500/10 border border-pink-200 dark:border-pink-500/30 text-xs font-bold text-pink-600 dark:text-pink-400">
                        <Instagram size={12} /> @{igConnection.ig_username}
                      </span>
                      <button onClick={desconectarInstagram} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition" title="Desconectar Instagram">
                        <XIcon size={14} />
                      </button>
                    </div>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => {
                    const week = getWeekBounds(calendarDate)
                    const existing = getPlanForWeek(week.inicio)
                    if (existing) { carregarPlanejamentoDetalhe(existing.id) }
                    else { setEstrategiaText(''); setShowPlanejamentoModal(true) }
                  }}>
                    <Calendar size={16} />
                    Planejamento Semanal
                  </Button>
                  <Button size="sm" onClick={() => { if (showCronogramaForm) setCronogramaFormDate(null); setShowCronogramaForm(!showCronogramaForm) }}>
                    <Plus size={16} />
                    {showCronogramaForm ? 'Cancelar' : 'Novo Post'}
                  </Button>
                </div>
              </div>
            </Card>

            {showCronogramaForm && (
              <Card>
                <CronogramaForm onSubmit={(form, files) => { setCronogramaFormDate(null); adicionarCronograma(form, files) }} onCancel={() => { setShowCronogramaForm(false); setCronogramaFormDate(null) }} initialDate={cronogramaFormDate} />
              </Card>
            )}

            {/* Calendar Grid */}
            <Card>
              {/* Day name headers */}
              <div className="grid grid-cols-7 border-b border-gray-200 overflow-x-auto" style={{ minWidth: 700 }}>
                {dayNames.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">{d}</div>
                ))}
              </div>

              {calendarView === 'month' ? (
                /* ===== MONTH VIEW ===== */
                <div className="grid grid-cols-7 overflow-x-auto" style={{ minWidth: 700 }}>
                  {days.map((dayObj, idx) => {
                    const posts = postsForDate(dayObj.date)
                    const isToday = dayObj.date.toDateString() === today.toDateString()
                    return (
                      <div key={idx} onClick={() => { if (dayObj.current) { if (posts.length > 0) { setDiaSelecionado({ date: dayObj.date, posts }) } else { const d = dayObj.date; const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); setCronogramaFormDate(dateStr); setShowCronogramaForm(true) } } }} className={`min-h-[110px] border-b border-r border-gray-100 p-1.5 transition-colors ${!dayObj.current ? 'bg-gray-50/60' : 'hover:bg-gray-50/40 cursor-pointer'} ${isToday ? 'bg-blue-50/60 dark:bg-blue-500/10' : ''} ${dayObj.current ? 'hover:ring-1 hover:ring-blue-300 dark:hover:ring-blue-500/30 hover:ring-inset' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : dayObj.current ? 'text-gray-700 dark:text-white/70' : 'text-gray-300 dark:text-white/20'}`}>
                            {dayObj.date.getDate()}
                          </span>
                          {posts.length > 0 && <span className="text-[9px] font-bold text-gray-400">{posts.length}</span>}
                        </div>
                        <div className="space-y-0.5">
                          {posts.slice(0, 3).map(c => (
                            <div key={c.id} className={`${plataformaColors[c.plataforma] || 'bg-gray-500'} text-white text-[10px] font-medium px-1.5 py-0.5 rounded truncate cursor-default`} title={`${c.hora_publicacao ? c.hora_publicacao.slice(0,5)+' - ' : ''}${c.titulo} (${c.plataforma})${c.formato ? ' | '+c.formato : ''} [${c.status}]`}>
                              <span className="flex items-center gap-1">
                                {c.status === 'publicado' && <span className="opacity-75">✓</span>}
                                {c.hora_publicacao && <span className="opacity-75">{c.hora_publicacao.slice(0,5)}</span>}
                                <span className="truncate">{c.titulo}</span>
                              </span>
                            </div>
                          ))}
                          {posts.length > 3 && <span className="text-[9px] text-gray-400 font-medium pl-1">+{posts.length - 3} mais</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* ===== WEEK VIEW ===== */
                <div className="grid grid-cols-7 divide-x divide-gray-100 overflow-x-auto" style={{ minWidth: 700 }}>
                  {weekDays.map((day, idx) => {
                    const posts = postsForDate(day)
                    const isToday = day.toDateString() === today.toDateString()
                    return (
                      <div key={idx} className={`p-2 ${isToday ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''}`} style={{ minHeight: 380 }}>
                        <div className="text-center mb-3">
                          <span className={`text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full mx-auto ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700 dark:text-white/70'}`}>
                            {day.getDate()}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {posts.map(c => (
                            <div key={c.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                              <div className={`${plataformaColors[c.plataforma] || 'bg-gray-500'} px-2 py-1 flex items-center justify-between`}>
                                <span className="text-white text-[10px] font-bold">{c.plataforma}</span>
                                <span className={`w-2 h-2 rounded-full ${statusDot[c.status] || 'bg-gray-300'}`} title={c.status} />
                              </div>
                              <div className="p-2 space-y-1">
                                <p className="text-xs font-semibold text-gray-900 line-clamp-2">{c.titulo}</p>
                                {c.hora_publicacao && (
                                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <Clock size={9} /> {c.hora_publicacao.slice(0,5)}
                                  </div>
                                )}
                                {c.conteudo && <p className="text-[10px] text-gray-400 line-clamp-2">{c.conteudo}</p>}
                                {c.formato && <span className="inline-block text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded">{c.formato}</span>}
                                {(cronogramaArquivos[c.id] || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {(cronogramaArquivos[c.id] || []).map(arq => (
                                      <div key={arq.id} className="relative group" onClick={(e) => { e.stopPropagation(); setPreviewArquivo(arq) }}>
                                        {arq.tipo && arq.tipo.startsWith('image') ? (
                                          <img src={'/api' + arq.url} className="w-10 h-10 rounded object-cover border border-gray-200 cursor-pointer hover:shadow-md transition" />
                                        ) : arq.tipo && arq.tipo.startsWith('video') ? (
                                          <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center cursor-pointer hover:shadow-md transition"><span className="text-xs">🎬</span></div>
                                        ) : (
                                          <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center cursor-pointer hover:shadow-md transition"><FileText size={10} className="text-gray-400" /></div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                                  <select value={c.status} onChange={e => atualizarCronograma(c.id, { status: e.target.value })} className="text-[10px] border border-gray-200 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-accent">
                                    <option value="pendente">Pendente</option>
                                    <option value="em_andamento">Não feito</option>
                                    <option value="publicado">Publicado</option>
                                    <option value="cancelado">Cancelado</option>
                                  </select>
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => setEditandoPost(c)} className="text-gray-300 hover:text-blue-500 transition"><Pencil size={11} /></button>
                                    <div className="relative">
                                      <input type="file" accept="image/*,video/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { const file = e.target.files[0]; if(file) uploadCronogramaArquivo(c.id, file); e.target.value='' }} />
                                      <Paperclip size={11} className="text-gray-300 hover:text-blue-500 transition cursor-pointer" />
                                    </div>
                                    <button onClick={() => removerCronograma(c.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={11} /></button>
                                  </div>
                                </div>
                                {c.status !== 'publicado' && (
                                  <div className="mt-1.5 space-y-1">
                                    {/* Toggle Agendamento */}
                                    <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-gray-50 border border-gray-100">
                                      <div className="flex items-center gap-1.5">
                                        <Clock size={10} className={c.auto_publish ? 'text-green-500' : 'text-gray-400'} />
                                        <span className={'text-[10px] font-semibold ' + (c.auto_publish ? 'text-green-600' : 'text-gray-400')}>
                                          {c.auto_publish ? 'Agendado' : 'Agendar'}
                                          {c.auto_publish && c.hora_publicacao ? ' ' + c.hora_publicacao.slice(0,5) : ''}
                                        </span>
                                      </div>
                                      <button onClick={() => toggleAutoPublish(c.id, c.auto_publish)}
                                        className={'relative w-8 h-4 rounded-full transition-colors ' + (c.auto_publish ? 'bg-green-500' : 'bg-gray-300')}>
                                        <span className={'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ' + (c.auto_publish ? 'translate-x-4' : 'translate-x-0.5')} />
                                      </button>
                                    </div>
                                    {/* Botão publicar agora */}
                                    <button onClick={(e) => { e.stopPropagation(); publicarNoInstagram(c.id) }} disabled={publicandoIG===c.id}
                                      className={'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold transition ' + (publicandoIG===c.id ? 'bg-blue-100 text-blue-400 animate-pulse' : 'bg-accent text-white hover:bg-accent/90 shadow-sm')}>
                                      <Instagram size={10} /> {publicandoIG===c.id ? 'Publicando...' : 'Publicar agora'}
                                    </button>
                                  </div>
                                )}
                                {c.status === 'publicado' && (
                                  <div className="mt-1.5 space-y-1">
                                    <div className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400">
                                      ✅ Publicado
                                    </div>
                                    {/* Boost / Tráfego Pago */}
                                    {c.boost_status === 'active' ? (
                                      <div className="flex items-center justify-between px-2 py-1.5 rounded-md bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30">
                                        <span className="text-[9px] font-bold text-orange-600 dark:text-orange-400">🚀 Impulsionado</span>
                                        <button onClick={(e) => { e.stopPropagation(); pararBoost(c.id) }} className="text-[9px] font-bold text-red-500 hover:text-red-700">Pausar</button>
                                      </div>
                                    ) : showBoostConfig === c.id ? (
                                      <div onClick={(e) => e.stopPropagation()} className="p-2 rounded-md bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 space-y-1.5">
                                        <p className="text-[10px] font-bold text-gray-700">🚀 Configurar Impulsionamento</p>
                                        <div className="grid grid-cols-2 gap-1">
                                          <div>
                                            <label className="text-[8px] text-gray-400 font-bold">R$/dia (centavos)</label>
                                            <input type="number" value={boostForm.budget} onChange={e => setBoostForm({...boostForm, budget: parseInt(e.target.value)||2000})} className="w-full border border-gray-200 rounded px-1.5 py-1 text-[10px] outline-none focus:ring-1 focus:ring-orange-400" />
                                          </div>
                                          <div>
                                            <label className="text-[8px] text-gray-400 font-bold">Dias</label>
                                            <input type="number" value={boostForm.duration} onChange={e => setBoostForm({...boostForm, duration: parseInt(e.target.value)||3})} className="w-full border border-gray-200 rounded px-1.5 py-1 text-[10px] outline-none focus:ring-1 focus:ring-orange-400" />
                                          </div>
                                          <div>
                                            <label className="text-[8px] text-gray-400 font-bold">Idade min</label>
                                            <input type="number" value={boostForm.age_min} onChange={e => setBoostForm({...boostForm, age_min: parseInt(e.target.value)||18})} className="w-full border border-gray-200 rounded px-1.5 py-1 text-[10px] outline-none focus:ring-1 focus:ring-orange-400" />
                                          </div>
                                          <div>
                                            <label className="text-[8px] text-gray-400 font-bold">Idade max</label>
                                            <input type="number" value={boostForm.age_max} onChange={e => setBoostForm({...boostForm, age_max: parseInt(e.target.value)||45})} className="w-full border border-gray-200 rounded px-1.5 py-1 text-[10px] outline-none focus:ring-1 focus:ring-orange-400" />
                                          </div>
                                        </div>
                                        <div className="flex gap-1">
                                          <button onClick={() => impulsionarPost(c.id)} disabled={boostingId===c.id} className={'flex-1 py-1.5 rounded text-[9px] font-bold text-white transition ' + (boostingId===c.id ? 'bg-gray-400 animate-pulse' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600')}>
                                            {boostingId===c.id ? 'Criando...' : '🚀 Impulsionar'}
                                          </button>
                                          <button onClick={() => setShowBoostConfig(null)} className="px-2 py-1.5 rounded text-[9px] font-bold text-gray-500 bg-gray-100 hover:bg-gray-200">✕</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <button onClick={(e) => { e.stopPropagation(); setShowBoostConfig(c.id) }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md text-[10px] font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition">
                                        🚀 Impulsionar
                                      </button>
                                    )}
                                  </div>
                                )}

                                {/* Pre-agendar boost para quando publicar */}
                                {c.status !== 'publicado' && c.auto_publish && (
                                  <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-between px-2 py-1 rounded-md bg-orange-50/50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-500/20 mt-1">
                                    <span className={'text-[9px] font-semibold ' + (c.boost_enabled ? 'text-orange-600' : 'text-gray-400')}>
                                      {c.boost_enabled ? '🚀 Boost ao publicar' : '🚀 Impulsionar auto'}
                                    </span>
                                    <button onClick={() => toggleBoostEnabled(c.id, c.boost_enabled)}
                                      className={'relative w-7 h-3.5 rounded-full transition-colors ' + (c.boost_enabled ? 'bg-orange-500' : 'bg-gray-300')}>
                                      <span className={'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow transition-transform ' + (c.boost_enabled ? 'translate-x-3.5' : 'translate-x-0.5')} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {posts.length === 0 && (
                            <div onClick={() => { const d = day; const dateStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); setCronogramaFormDate(dateStr); setShowCronogramaForm(true) }} className="flex flex-col items-center justify-center py-6 text-gray-300 hover:text-blue-400 cursor-pointer transition group">
                              <Plus size={20} className="group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition">Novo post</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Platform legend */}
            <div className="flex flex-wrap gap-2 px-1">
              {plataformas.filter(p => cronograma.some(c => c.plataforma === p)).map(p => (
                <div key={p} className="flex items-center gap-1.5">
                  <span className={`w-3 h-3 rounded ${plataformaColors[p] || 'bg-gray-500'}`} />
                  <span className="text-[11px] text-gray-500">{p}</span>
                </div>
              ))}
            </div>

            {/* Planejamentos Semanais */}
            {planejamentos.length > 0 && (
              <Card>
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar size={16} className="text-blue-500" />
                    Planejamentos Semanais
                  </h3>
                  {canApprovePlan && planejamentos.filter(p => p.status === 'enviado').length > 0 && (
                    <Badge variant="yellow">{planejamentos.filter(p => p.status === 'enviado').length} aguardando aprovação</Badge>
                  )}
                </div>
                <div className="divide-y divide-gray-100">
                  {planejamentos.map(p => (
                    <div key={p.id} onClick={() => carregarPlanejamentoDetalhe(p.id)} className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          Semana {new Date(p.semana_inicio + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}
                          {' - '}
                          {new Date(p.semana_fim + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}
                        </span>
                        {p.criado_por_nome && <span className="text-xs text-gray-400">por {p.criado_por_nome}</span>}
                      </div>
                      <Badge variant={p.status === 'rascunho' ? 'yellow' : p.status === 'enviado' ? 'yellow' : p.status === 'aprovado' ? 'green' : 'purple'}>
                        {p.status === 'rascunho' ? 'Pendente' : p.status === 'enviado' ? 'Aguardando Aprovação' : p.status === 'aprovado' ? 'Aprovado' : 'Em Revisão'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Posts without date */}
            {cronograma.filter(c => !c.data_publicacao).length > 0 && (
              <Card>
                <div className="p-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Sem data definida</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-2">
                    {cronograma.filter(c => !c.data_publicacao).map(c => (
                      <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`${plataformaColors[c.plataforma] || 'bg-gray-500'} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>{c.plataforma}</span>
                          <span className="text-xs text-gray-700 truncate">{c.titulo}</span>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button onClick={() => setEditandoPost(c)} className="text-gray-300 hover:text-blue-500 transition"><Pencil size={12} /></button>
                          <button onClick={() => removerCronograma(c.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )
      })()}

      {/* Modal Criar Planejamento Semanal */}
      {showPlanejamentoModal && (() => {
        const week = getWeekBounds(calendarDate)
        const postsInWeek = cronograma.filter(c => {
          if (!c.data_publicacao) return false
          const cpd = typeof c.data_publicacao === 'string' ? c.data_publicacao.slice(0,10) : ''
          return cpd >= week.inicio && cpd <= week.fim
        }).sort((a,b) => (a.data_publicacao + (a.hora_publicacao||'')).localeCompare(b.data_publicacao + (b.hora_publicacao||'')))
        return (
          <Modal open={true} onClose={() => setShowPlanejamentoModal(false)} title="Novo Planejamento Semanal" size="lg">
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                  {new Date(week.inicio + 'T12:00').toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}
                  {' até '}
                  {new Date(week.fim + 'T12:00').toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}
                </span>
                <span className="block text-xs text-blue-500 dark:text-blue-400 mt-1">{postsInWeek.length} posts programados</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {[0,1,2,3,4,5,6].map(offset => {
                  const d = new Date(week.startDate)
                  d.setDate(d.getDate() + offset)
                  const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
                  const dayPosts = postsInWeek.filter(c => (typeof c.data_publicacao === 'string' ? c.data_publicacao.slice(0,10) : '') === ds)
                  return (
                    <div key={offset} className="bg-gray-50 rounded-lg p-2">
                      <span className="text-xs font-bold text-gray-700">{dayNames[d.getDay()]} {d.getDate()}/{d.getMonth()+1}</span>
                      {dayPosts.length === 0 ? (
                        <span className="text-xs text-gray-400 ml-2">Nenhum post</span>
                      ) : (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dayPosts.map(c => (
                            <span key={c.id} className={`${plataformaColors[c.plataforma] || 'bg-gray-500'} text-white text-[10px] px-2 py-0.5 rounded font-medium`}>
                              {c.hora_publicacao ? c.hora_publicacao.slice(0,5) + ' ' : ''}{c.titulo}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estratégia da Semana</label>
                <textarea value={estrategiaText} onChange={e => setEstrategiaText(e.target.value)} placeholder="Descreva a estratégia, objetivos e foco da semana..." rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => criarPlanejamento({ semana_inicio: week.inicio, semana_fim: week.fim, estrategia: estrategiaText })} className="flex-1">Criar Planejamento</Button>
                <Button variant="secondary" onClick={() => setShowPlanejamentoModal(false)}>Cancelar</Button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* Modal Detalhe Planejamento Semanal */}
      {showPlanejamentoDetalhe && (() => {
        const plan = showPlanejamentoDetalhe
        const statusLabel = { rascunho: 'Pendente', enviado: 'Aguardando Aprovação', aprovado: 'Aprovado', revisao: 'Em Revisão' }
        const statusVariant = { rascunho: 'gray', enviado: 'yellow', aprovado: 'green', revisao: 'purple' }
        return (
          <Modal open={true} onClose={() => { setShowPlanejamentoDetalhe(null); setFeedbacksPosts({}) }} title={`Planejamento - ${new Date(plan.semana_inicio + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a ${new Date(plan.semana_fim + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}`} size="lg">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant={statusVariant[plan.status] || 'gray'}>{statusLabel[plan.status] || plan.status}</Badge>
                {plan.criado_por_nome && <span className="text-xs text-gray-500">Criado por {plan.criado_por_nome}</span>}
              </div>
              {plan.estrategia && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Estratégia da Semana</span>
                  <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{plan.estrategia}</p>
                </div>
              )}
              {plan.feedback && plan.status === 'revisao' && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-lg p-3">
                  <span className="text-[10px] font-semibold text-red-500 dark:text-red-400 uppercase">Feedback Geral</span>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1 whitespace-pre-wrap">{plan.feedback}</p>
                </div>
              )}
              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {[0,1,2,3,4,5,6].map(offset => {
                  const d = new Date(plan.semana_inicio + 'T12:00')
                  d.setDate(d.getDate() + offset)
                  const ds = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
                  const dayPosts = (plan.posts || []).filter(c => (typeof c.data_publicacao === 'string' ? c.data_publicacao.slice(0,10) : '') === ds).sort((a,b) => (a.hora_publicacao||'99').localeCompare(b.hora_publicacao||'99'))
                  return (
                    <div key={offset}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-gray-900">{dayNames[d.getDay()]} {d.getDate()}/{d.getMonth()+1}</span>
                        <span className="text-[10px] text-gray-400">{dayPosts.length} post(s)</span>
                      </div>
                      {dayPosts.length === 0 ? (
                        <div className="bg-gray-50 rounded-lg p-3 text-center text-xs text-gray-300">Sem posts programados</div>
                      ) : (
                        <div className="space-y-1.5">
                          {dayPosts.map(c => (
                            <div key={c.id} className={`bg-white rounded-lg border overflow-hidden ${c.feedback ? 'border-orange-300' : 'border-gray-200'}`}>
                              <div className={`${plataformaColors[c.plataforma] || 'bg-gray-500'} px-3 py-1 flex items-center justify-between`}>
                                <span className="text-white text-xs font-bold">{c.plataforma}</span>
                                <span className="text-white/80 text-[10px]">{c.hora_publicacao ? c.hora_publicacao.slice(0,5) : 'Sem horário'}</span>
                              </div>
                              <div className="p-2 space-y-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-gray-900 flex-1">{c.titulo}</p>
                                  <button onClick={() => { setShowPlanejamentoDetalhe(null); setEditandoPost(c) }} className="text-gray-300 hover:text-blue-500 transition p-0.5"><Pencil size={11} /></button>
                                </div>
                                {c.conteudo && <p className="text-[10px] text-gray-500 line-clamp-3 whitespace-pre-wrap">{c.conteudo}</p>}
                                {c.formato && <span className="inline-block text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-violet-50 dark:bg-violet-500/10 px-1.5 py-0.5 rounded">{c.formato}</span>}
                                {(cronogramaArquivos[c.id] || []).length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {(cronogramaArquivos[c.id] || []).map(arq => (
                                      <div key={arq.id} className="cursor-pointer" onClick={() => setPreviewArquivo(arq)}>
                                        {arq.tipo && arq.tipo.startsWith('image') ? (
                                          <img src={'/api' + arq.url} className="w-14 h-14 rounded object-cover border border-gray-200 hover:shadow-md transition" />
                                        ) : arq.tipo && arq.tipo.startsWith('video') ? (
                                          <div className="w-14 h-14 rounded bg-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-md transition"><span className="text-sm">🎬</span></div>
                                        ) : (
                                          <div className="w-14 h-14 rounded bg-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-md transition"><FileText size={12} className="text-gray-400" /></div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {/* Feedback existente do diretor */}
                                {c.feedback && !canApprovePlan && (
                                  <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded p-2 mt-1">
                                    <span className="text-[9px] font-semibold text-orange-500 dark:text-orange-400 uppercase">Feedback</span>
                                    <p className="text-[11px] text-orange-700 dark:text-orange-400 whitespace-pre-wrap">{c.feedback}</p>
                                  </div>
                                )}
                                {/* Input de feedback para diretor */}
                                {canApprovePlan && ['enviado','rascunho'].includes(plan.status) && (
                                  <textarea
                                    placeholder="Escreva seu feedback para este post..."
                                    value={feedbacksPosts[c.id] !== undefined ? feedbacksPosts[c.id] : (c.feedback || '')}
                                    onChange={e => setFeedbacksPosts(prev => ({...prev, [c.id]: e.target.value}))}
                                    rows={2}
                                    className="w-full mt-1 text-[11px] border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                                  />
                                )}
                                {/* Feedback visível para diretor quando já revisado */}
                                {canApprovePlan && plan.status !== 'enviado' && c.feedback && (
                                  <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded p-2 mt-1">
                                    <span className="text-[9px] font-semibold text-orange-500 dark:text-orange-400 uppercase">Seu feedback</span>
                                    <p className="text-[11px] text-orange-700 dark:text-orange-400 whitespace-pre-wrap">{c.feedback}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {/* Feedback geral para revisão */}
              {canApprovePlan && ['enviado','rascunho'].includes(plan.status) && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Feedback geral (opcional)</label>
                  <textarea
                    value={feedbackGeral}
                    onChange={e => setFeedbackGeral(e.target.value)}
                    placeholder="Comentário geral sobre o planejamento..."
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                {canCreatePlan && ['rascunho', 'revisao'].includes(plan.status) && (
                  <Button onClick={async () => { const updated = await atualizarPlanejamento(plan.id, { status: 'enviado' }); if (updated) setShowPlanejamentoDetalhe(prev => ({...prev, ...updated})) }} className="flex-1">
                    Enviar para Aprovação
                  </Button>
                )}
                {canApprovePlan && ['enviado','rascunho'].includes(plan.status) && (
                  <Button onClick={async () => {
                    // Salvar feedbacks individuais se houver
                    for (const [postId, fb] of Object.entries(feedbacksPosts)) {
                      if (fb !== undefined) await api.patch(`/cronograma/${postId}`, { feedback: fb })
                    }
                    const updated = await atualizarPlanejamento(plan.id, { status: 'aprovado', feedback: feedbackGeral || '' })
                    if (updated) { setShowPlanejamentoDetalhe(prev => ({...prev, ...updated})); setFeedbacksPosts({}); setFeedbackGeral('') }
                  }} className="flex-1">
                    Aprovar
                  </Button>
                )}
                {canApprovePlan && ['enviado','rascunho'].includes(plan.status) && (
                  <Button variant="danger" onClick={async () => {
                    // Salvar feedbacks individuais
                    for (const [postId, fb] of Object.entries(feedbacksPosts)) {
                      if (fb !== undefined) await api.patch(`/cronograma/${postId}`, { feedback: fb })
                    }
                    const updated = await atualizarPlanejamento(plan.id, { status: 'revisao', feedback: feedbackGeral || '' })
                    if (updated) { setShowPlanejamentoDetalhe(prev => ({...prev, ...updated})); setFeedbacksPosts({}); setFeedbackGeral('') }
                  }}>
                    Solicitar Revisão
                  </Button>
                )}
                {canCreatePlan && plan.status === 'rascunho' && (
                  <Button variant="ghost" onClick={() => { deletarPlanejamento(plan.id); setShowPlanejamentoDetalhe(null) }}>
                    <Trash2 size={14} /> Remover
                  </Button>
                )}
                {canCreatePlan && plan.status === 'enviado' && (
                  <Button variant="secondary" onClick={async () => {
                    const updated = await atualizarPlanejamento(plan.id, { status: 'rascunho' })
                    if (updated) setShowPlanejamentoDetalhe(prev => ({...prev, ...updated}))
                  }}>
                    Editar
                  </Button>
                )}
                {canCreatePlan && plan.status === 'enviado' && (
                  <Button variant="ghost" onClick={() => { deletarPlanejamento(plan.id); setShowPlanejamentoDetalhe(null) }}>
                    <Trash2 size={14} /> Apagar
                  </Button>
                )}
                {canCreatePlan && plan.status === 'aprovado' && (
                  <Button variant="secondary" onClick={async () => {
                    const updated = await atualizarPlanejamento(plan.id, { status: 'rascunho' })
                    if (updated) setShowPlanejamentoDetalhe(prev => ({...prev, ...updated}))
                  }}>
                    Editar
                  </Button>
                )}
                {canCreatePlan && plan.status === 'aprovado' && (
                  <Button variant="ghost" onClick={() => { deletarPlanejamento(plan.id); setShowPlanejamentoDetalhe(null) }}>
                    <Trash2 size={14} /> Apagar
                  </Button>
                )}
              </div>
            </div>
          </Modal>
        )
      })()}

      {/* Modal Detalhe do Dia */}
      {diaSelecionado && (
        <Modal open={true} onClose={() => setDiaSelecionado(null)} title={diaSelecionado.date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} size="lg">
          <div className="space-y-3">
            {diaSelecionado.posts.sort((a, b) => (a.hora_publicacao || '99:99').localeCompare(b.hora_publicacao || '99:99')).map(c => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className={`${plataformaColors[c.plataforma] || 'bg-gray-500'} px-4 py-2 flex items-center justify-between`}>
                  <span className="text-white text-sm font-bold">{c.plataforma}</span>
                  {c.hora_publicacao && <span className="text-white/80 text-xs font-medium">{c.hora_publicacao.slice(0,5)}</span>}
                </div>
                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-gray-900">{c.titulo}</h4>
                  {c.conteudo && <p className="text-sm text-gray-600 whitespace-pre-wrap">{c.conteudo}</p>}
                  {c.formato && <span className="inline-block text-xs font-medium text-blue-600 dark:text-blue-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded">{c.formato}</span>}
                  {(cronogramaArquivos[c.id] || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {(cronogramaArquivos[c.id] || []).map(arq => (
                        <div key={arq.id} className="relative group cursor-pointer" onClick={() => setPreviewArquivo(arq)}>
                          {arq.tipo && arq.tipo.startsWith('image') ? (
                            <img src={'/api' + arq.url} className="w-20 h-20 rounded-lg object-cover border border-gray-200 hover:shadow-md transition" />
                          ) : arq.tipo && arq.tipo.startsWith('video') ? (
                            <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-md transition"><span className="text-xl">🎬</span></div>
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center hover:shadow-md transition"><FileText size={16} className="text-gray-400" /></div>
                          )}
                          <button onClick={(e) => { e.stopPropagation(); deletarCronogramaArquivo(arq.id, c.id) }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><XIcon size={8} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <select value={c.status} onChange={e => { atualizarCronograma(c.id, { status: e.target.value }); setDiaSelecionado(prev => ({...prev, posts: prev.posts.map(p => p.id === c.id ? {...p, status: e.target.value} : p)})) }} className="text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-accent">
                      <option value="pendente">Pendente</option>
                      <option value="em_andamento">Não feito</option>
                      <option value="publicado">Publicado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setDiaSelecionado(null); setEditandoPost(c) }} className="text-gray-400 hover:text-blue-500 transition"><Pencil size={14} /></button>
                      <div className="relative">
                        <input type="file" accept="image/*,video/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={(e) => { const file = e.target.files[0]; if(file) uploadCronogramaArquivo(c.id, file); e.target.value='' }} />
                        <Paperclip size={14} className="text-gray-400 hover:text-blue-500 transition cursor-pointer" />
                      </div>
                      <button onClick={() => { removerCronograma(c.id); setDiaSelecionado(prev => { const posts = prev.posts.filter(p => p.id !== c.id); return posts.length > 0 ? {...prev, posts} : null }) }} className="text-gray-400 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Materiais - Hub de Arquivos */}
      {activeSubTab === 'aprovacoes' && (
        <div className="space-y-4">
          <Card>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={16} className="text-orange-500" />
                Planejamentos Aguardando Aprovação
              </h3>
              <Badge variant="yellow">{planejamentos.filter(p => p.status === 'enviado').length} pendente(s)</Badge>
            </div>
            {planejamentos.filter(p => p.status === 'enviado').length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-500 dark:text-green-400 text-xl">✓</span>
                </div>
                <p className="text-sm font-medium text-gray-500">Nenhum planejamento pendente de aprovação</p>
                <p className="text-xs text-gray-400 mt-1">Quando o social media enviar um planejamento, ele aparecerá aqui</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {planejamentos.filter(p => p.status === 'enviado').map(p => (
                  <div key={p.id} onClick={async () => { const detail = await carregarPlanejamentoDetalhe(p.id); if (detail) setShowPlanejamentoDetalhe(detail) }} className="p-4 hover:bg-orange-50/50 cursor-pointer transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                          <Calendar size={18} className="text-orange-500 dark:text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{new Date(p.semana_inicio + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a {new Date(p.semana_fim + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}</p>
                          <p className="text-xs text-gray-500">{p.criado_por_nome ? 'Enviado por ' + p.criado_por_nome : 'Aguardando aprovação'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="yellow">Aguardando</Badge>
                        <ArrowRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                    {p.estrategia && <p className="text-xs text-gray-500 mt-2 line-clamp-2 ml-13">{p.estrategia}</p>}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Histórico de aprovações */}
          {planejamentos.filter(p => ['aprovado', 'revisao'].includes(p.status)).length > 0 && (
            <Card>
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" />
                  Histórico
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {planejamentos.filter(p => ['aprovado', 'revisao'].includes(p.status)).map(p => (
                  <div key={p.id} onClick={async () => { const detail = await carregarPlanejamentoDetalhe(p.id); if (detail) setShowPlanejamentoDetalhe(detail) }} className="p-4 hover:bg-gray-50 cursor-pointer transition">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={'w-10 h-10 rounded-full flex items-center justify-center ' + (p.status === 'aprovado' ? 'bg-green-100 dark:bg-green-500/20' : 'bg-violet-100 dark:bg-violet-500/20')}>
                          {p.status === 'aprovado' ? <span className="text-green-500 dark:text-green-400">✓</span> : <span className="text-blue-500 dark:text-blue-400">↺</span>}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{new Date(p.semana_inicio + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})} a {new Date(p.semana_fim + 'T12:00').toLocaleDateString('pt-BR', {day:'numeric', month:'short'})}</p>
                          <p className="text-xs text-gray-500">{p.criado_por_nome || ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={p.status === 'aprovado' ? 'green' : 'purple'}>{p.status === 'aprovado' ? 'Aprovado' : 'Em Revisão'}</Badge>
                        <ArrowRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeSubTab === 'trafego' && (() => {
        const phases = [
          { num: 1, name: 'Awareness', icon: '📢', color: 'blue', desc: 'Alcance máximo, público frio', days: '60-30 dias antes' },
          { num: 2, name: 'Consideração', icon: '🤔', color: 'purple', desc: 'Engajamento, quem já viu', days: '30-15 dias antes' },
          { num: 3, name: 'Conversão', icon: '🎯', color: 'orange', desc: 'Tráfego pro link de ingresso', days: '15-7 dias antes' },
          { num: 4, name: 'Urgência', icon: '🔥', color: 'red', desc: 'Últimos ingressos, escassez', days: '7-0 dias antes' },
        ]
        const colorMap = { blue: 'from-blue-500 to-blue-600', purple: 'from-blue-500 to-blue-600', orange: 'from-orange-500 to-orange-600', red: 'from-red-500 to-red-600' }
        const bgMap = { blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30', purple: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30', orange: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30', red: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' }
        const textMap = { blue: 'text-blue-600 dark:text-blue-400', purple: 'text-blue-600 dark:text-blue-400', orange: 'text-orange-600 dark:text-orange-400', red: 'text-red-600 dark:text-red-400' }

        return (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">🚀 Funil de Tráfego Pago</h3>
                <p className="text-xs text-gray-400 mt-0.5">Campanhas automáticas por fase do evento</p>
              </div>
              <div className="flex items-center gap-2">
                {funnel?.status === 'active' ? (
                  <>
                    <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Ativo — Fase {funnel.current_phase}</span>
                    <button onClick={pausarFunnel} className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition">Pausar</button>
                  </>
                ) : funnel?.status === 'paused' ? (
                  <>
                    <span className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-bold">⏸ Pausado</span>
                    <button onClick={ativarFunnel} className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-bold shadow-sm">Reativar</button>
                  </>
                ) : (
                  <button onClick={ativarFunnel} disabled={activatingFunnel} className={'px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md transition ' + (activatingFunnel ? 'bg-gray-400 animate-pulse' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600')}>
                    {activatingFunnel ? '⏳ Criando campanhas...' : '🚀 Ativar Funil'}
                  </button>
                )}
              </div>
            </div>

            {/* Config geral */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Orçamento Total (R$)</label>
                <input type="number" value={funnelForm.total_budget ?? ''} onChange={e => updateFunnelForm('total_budget', e.target.value)} onBlur={() => salvarFunnel({total_budget: parseInt(funnelForm.total_budget)*100||50000})}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Cidade alvo</label>
                <input value={funnelForm.target_city ?? ''} onChange={e => updateFunnelForm('target_city', e.target.value)} onBlur={() => saveFunnelField('target_city')} placeholder="Ex: Indaiatuba"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Raio (km)</label>
                <input type="number" value={funnelForm.target_radius ?? ''} onChange={e => updateFunnelForm('target_radius', e.target.value)} onBlur={() => salvarFunnel({target_radius: parseInt(funnelForm.target_radius)||50})}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Link Ingresso</label>
                <input value={funnelForm.ticket_url ?? ''} onChange={e => updateFunnelForm('ticket_url', e.target.value)} onBlur={() => saveFunnelField('ticket_url')} placeholder="https://..."
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Idade min</label>
                <input type="number" value={funnelForm.target_age_min ?? ''} onChange={e => updateFunnelForm('target_age_min', e.target.value)} onBlur={() => salvarFunnel({target_age_min: parseInt(funnelForm.target_age_min)||18})}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Idade max</label>
                <input type="number" value={funnelForm.target_age_max ?? ''} onChange={e => updateFunnelForm('target_age_max', e.target.value)} onBlur={() => salvarFunnel({target_age_max: parseInt(funnelForm.target_age_max)||45})}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">CTA do Anúncio</label>
                <select value={funnelForm.cta ?? 'LEARN_MORE'} onChange={e => { updateFunnelForm('cta', e.target.value); salvarFunnel({cta: e.target.value}) }}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none">
                  <option value="LEARN_MORE">Saiba Mais</option>
                  <option value="BUY_TICKETS">Comprar Ingressos</option>
                  <option value="SHOP_NOW">Comprar Agora</option>
                  <option value="SIGN_UP">Cadastre-se</option>
                  <option value="GET_TICKETS">Obter Ingressos</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase">Interesses</label>
                <input value={funnelForm.target_interests ?? ''} onChange={e => updateFunnelForm('target_interests', e.target.value)} onBlur={() => saveFunnelField('target_interests')} placeholder="Ex: Funk, Sertanejo"
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
            </div>
          </div>

          {/* Fases do Funil */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {phases.map(phase => {
              const isActive = funnel?.current_phase === phase.num && funnel?.status === 'active'
              const hasCampaign = funnel?.['phase'+phase.num+'_campaign_id']
              const budgetPct = funnel?.['budget_phase'+phase.num] || 25
              const totalBudget = funnel?.total_budget || 50000
              const phaseBudget = Math.round(totalBudget * (budgetPct/100))
              
              return (
                <div key={phase.num} className={'rounded-xl border-2 overflow-hidden transition-all ' + (isActive ? bgMap[phase.color]+' shadow-lg ring-2 ring-offset-1' : 'bg-white border-gray-200')}>
                  <div className={'bg-gradient-to-r '+colorMap[phase.color]+' px-4 py-3 flex items-center justify-between'}>
                    <div>
                      <span className="text-white text-lg">{phase.icon}</span>
                      <p className="text-white font-bold text-sm">{phase.name}</p>
                    </div>
                    {isActive && <span className="w-3 h-3 rounded-full bg-white animate-pulse" />}
                    {hasCampaign && !isActive && <span className="text-white/60 text-xs">✓</span>}
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="text-[10px] text-gray-500">{phase.desc}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{phase.days}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-gray-600">Budget: {budgetPct}%</span>
                      <span className={'text-[10px] font-bold ' + textMap[phase.color]}>R$ {(phaseBudget/100).toFixed(0)}</span>
                    </div>
                    
                    <input type="range" min="5" max="50" value={budgetPct} onChange={e => salvarFunnel({['budget_phase'+phase.num]: parseInt(e.target.value)})}
                      className="w-full h-1.5 rounded-full appearance-none bg-gray-200 accent-blue-500" />
                    
                    {isActive && (
                      <div className={'text-[10px] font-bold text-center py-1.5 rounded-lg ' + bgMap[phase.color] + ' ' + textMap[phase.color]}>
                        ▶ Fase Ativa
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Dashboard de Performance */}
          {funnel?.status === 'active' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">📊</span>
                  <h3 className="font-bold text-gray-900 text-sm">Performance dos Anúncios</h3>
                </div>
                <button onClick={carregarMetrics} disabled={metricsLoading} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (metricsLoading ? 'bg-gray-200 text-gray-400 animate-pulse' : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200')}>
                  {metricsLoading ? '⏳ Carregando...' : '🔄 Atualizar'}
                </button>
              </div>

              {metrics ? (
                <div className="p-4 space-y-4">
                  {/* Resumo geral */}
                  {(() => {
                    const totalSpend = metrics.phases.reduce((s, p) => s + parseFloat(p.insights?.spend || 0), 0)
                    const totalClicks = metrics.phases.reduce((s, p) => s + parseInt(p.insights?.clicks || 0), 0)
                    const totalImpressions = metrics.phases.reduce((s, p) => s + parseInt(p.insights?.impressions || 0), 0)
                    const totalReach = metrics.phases.reduce((s, p) => s + parseInt(p.insights?.reach || 0), 0)
                    const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0'
                    const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0'
                    const budgetUsed = metrics.total_budget ? ((totalSpend * 100 / metrics.total_budget) * 100).toFixed(0) : 0
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-500/25">
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">R$ {totalSpend.toFixed(2)}</p>
                          <p className="text-[9px] text-blue-400 font-semibold">Investido</p>
                          <div className="mt-1 w-full bg-blue-200 dark:bg-blue-500/30 rounded-full h-1"><div className="bg-blue-500 h-1 rounded-full" style={{width: Math.min(100, budgetUsed)+'%'}} /></div>
                          <p className="text-[8px] text-blue-400 mt-0.5">{budgetUsed}% do orçamento</p>
                        </div>
                        <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-3 text-center border border-green-100 dark:border-green-500/25">
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{totalClicks.toLocaleString()}</p>
                          <p className="text-[9px] text-green-400 font-semibold">Cliques</p>
                        </div>
                        <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-3 text-center border border-violet-100 dark:border-violet-500/25">
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalImpressions.toLocaleString()}</p>
                          <p className="text-[9px] text-violet-400 dark:text-violet-400 font-semibold">Impressões</p>
                        </div>
                        <div className="bg-orange-50 dark:bg-orange-500/10 rounded-lg p-3 text-center border border-orange-100 dark:border-orange-500/25">
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{totalReach.toLocaleString()}</p>
                          <p className="text-[9px] text-orange-400 font-semibold">Alcance</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-500/25">
                          <p className={'text-lg font-bold ' + (parseFloat(avgCtr) >= 2 ? 'text-green-600 dark:text-green-400' : parseFloat(avgCtr) >= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')}>{avgCtr}%</p>
                          <p className="text-[9px] text-blue-400 font-semibold">CTR Médio</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-500/25">
                          <p className={'text-lg font-bold ' + (parseFloat(avgCpc) <= 0.5 ? 'text-green-600 dark:text-green-400' : parseFloat(avgCpc) <= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')}>R$ {avgCpc}</p>
                          <p className="text-[9px] text-blue-400 font-semibold">CPC Médio</p>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Performance por fase */}
                  {metrics.phases.filter(p => p.campaign_id).map(phase => {
                    const phaseColors = { 1: 'blue', 2: 'purple', 3: 'orange', 4: 'red' }
                    const color = phaseColors[phase.phase] || 'gray'
                    const isActive = metrics.current_phase === phase.phase
                    const statusMap = { ACTIVE: '🟢 Ativo', PAUSED: '⏸ Pausado', ARCHIVED: '📦 Arquivado', WITH_ISSUES: '⚠️ Problemas' }
                    return (
                      <div key={phase.phase} className={'rounded-xl border overflow-hidden ' + (isActive ? 'border-blue-300 ring-1 ring-blue-200' : 'border-gray-200')}>
                        <div className={'px-4 py-2.5 flex items-center justify-between ' + (isActive ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-gray-50 dark:bg-white/[0.03]')}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{['','📢','🤔','🎯','🔥'][phase.phase]}</span>
                            <span className="font-bold text-sm text-gray-900 dark:text-white/90">Fase {phase.phase}: {phase.name}</span>
                            {isActive && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded text-[9px] font-bold">ATIVA</span>}
                          </div>
                          <span className="text-[10px] text-gray-500">{statusMap[phase.campaign_status] || phase.campaign_status}</span>
                        </div>

                        {/* Métricas da fase */}
                        {phase.insights ? (
                          <div className="px-4 py-3">
                            <div className="grid grid-cols-6 gap-2 mb-3">
                              <div className="text-center">
                                <p className="text-xs font-bold text-gray-900">R$ {parseFloat(phase.insights.spend||0).toFixed(2)}</p>
                                <p className="text-[8px] text-gray-400">Gasto</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-bold text-gray-900">{parseInt(phase.insights.impressions||0).toLocaleString()}</p>
                                <p className="text-[8px] text-gray-400">Impressões</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-bold text-gray-900">{parseInt(phase.insights.reach||0).toLocaleString()}</p>
                                <p className="text-[8px] text-gray-400">Alcance</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-bold text-gray-900">{parseInt(phase.insights.clicks||0).toLocaleString()}</p>
                                <p className="text-[8px] text-gray-400">Cliques</p>
                              </div>
                              <div className="text-center">
                                <p className={'text-xs font-bold ' + (parseFloat(phase.insights.ctr||0) >= 2 ? 'text-green-600' : parseFloat(phase.insights.ctr||0) >= 1 ? 'text-yellow-600' : 'text-red-600')}>{parseFloat(phase.insights.ctr||0).toFixed(2)}%</p>
                                <p className="text-[8px] text-gray-400">CTR</p>
                              </div>
                              <div className="text-center">
                                <p className={'text-xs font-bold ' + (parseFloat(phase.insights.cpc||0) <= 0.5 ? 'text-green-600' : parseFloat(phase.insights.cpc||0) <= 2 ? 'text-yellow-600' : 'text-red-600')}>R$ {parseFloat(phase.insights.cpc||0).toFixed(2)}</p>
                                <p className="text-[8px] text-gray-400">CPC</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="px-4 py-3 text-center">
                            <p className="text-[10px] text-gray-400">Sem dados ainda</p>
                          </div>
                        )}

                        {/* Anúncios individuais */}
                        {phase.ads && phase.ads.length > 0 && (
                          <div className="px-4 pb-3 space-y-1.5">
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Anúncios ({phase.ads.length})</p>
                            {phase.ads.map(ad => {
                              const adStatus = ad.effective_status || ad.status
                              const statusDot = adStatus === 'ACTIVE' ? 'bg-green-500' : adStatus === 'PAUSED' ? 'bg-yellow-500' : 'bg-gray-400'
                              return (
                                <div key={ad.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-100">
                                  {ad.creative?.thumbnail_url && (
                                    <img src={ad.creative.thumbnail_url} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-bold text-gray-900 truncate">{ad.name}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span className={'w-1.5 h-1.5 rounded-full '+statusDot} />
                                      <span className="text-[9px] text-gray-500">{adStatus}</span>
                                    </div>
                                  </div>
                                  {ad.insights && (
                                    <div className="flex gap-3 text-center">
                                      <div>
                                        <p className="text-[10px] font-bold text-gray-900">{parseInt(ad.insights.clicks||0)}</p>
                                        <p className="text-[8px] text-gray-400">Cliques</p>
                                      </div>
                                      <div>
                                        <p className={'text-[10px] font-bold ' + (parseFloat(ad.insights.ctr||0) >= 2 ? 'text-green-600' : 'text-gray-900')}>{parseFloat(ad.insights.ctr||0).toFixed(2)}%</p>
                                        <p className="text-[8px] text-gray-400">CTR</p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] font-bold text-gray-900">R$ {parseFloat(ad.insights.spend||0).toFixed(2)}</p>
                                        <p className="text-[8px] text-gray-400">Gasto</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {phase.ads && phase.ads.length === 0 && (
                          <div className="px-4 pb-3">
                            <div className="flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-200">
                              <span className="text-gray-400 text-[10px]">Nenhum anúncio — publique um post pra ele entrar aqui automaticamente</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <button onClick={carregarMetrics} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold hover:bg-blue-100 transition">
                    📊 Carregar Métricas
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Manager Panel */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4 text-white">
            {/* Estratégia + Público aprendido */}
            {(funnel?.ai_strategy || funnel?.ai_audience_profile) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {funnel.ai_audience_profile && (
                  <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                    <p className="text-[10px] font-bold text-violet-400 uppercase mb-1.5">👥 Público Identificado pela IA</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{funnel.ai_audience_profile}</p>
                  </div>
                )}
                {funnel.ai_strategy && (
                  <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                    <p className="text-[10px] font-bold text-orange-400 uppercase mb-1.5">🎯 Estratégia Atual</p>
                    <p className="text-xs text-gray-300 leading-relaxed">{funnel.ai_strategy}</p>
                  </div>
                )}
              </div>
            )}

            {funnel?.ai_optimizations_count > 0 && (
              <div className="flex gap-3 mb-4">
                <div className="flex-1 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-lg font-bold text-violet-400">{funnel.ai_optimizations_count}</p>
                  <p className="text-[9px] text-gray-500">Otimizações</p>
                </div>
                <div className="flex-1 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-lg font-bold text-green-400">{abTests.length}</p>
                  <p className="text-[9px] text-gray-500">Testes A/B</p>
                </div>
                <div className="flex-1 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center">
                  <p className="text-lg font-bold text-blue-400">{aiLogs.filter(l => l.action === 'adjust_budget').length}</p>
                  <p className="text-[9px] text-gray-500">Ajustes Budget</p>
                </div>
                <div className="flex-1 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
                  <p className="text-lg font-bold text-orange-400">{funnel.ai_last_analysis ? new Date(funnel.ai_last_analysis).toLocaleString('pt-BR', {hour:'2-digit',minute:'2-digit'}) : '—'}</p>
                  <p className="text-[9px] text-gray-500">Última Análise</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-lg">🤖</div>
                <div>
                  <h3 className="font-bold text-sm">AI Ad Manager</h3>
                  <p className="text-[10px] text-gray-400">Otimização automática a cada 3h</p>
                </div>
              </div>
              <button onClick={forcarAnaliseAI} disabled={aiAnalyzing || funnel?.status !== 'active'}
                className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (aiAnalyzing ? 'bg-purple-900 text-violet-400 animate-pulse' : funnel?.status !== 'active' ? 'bg-gray-700 text-gray-500' : 'bg-accent text-white hover:bg-accent/90 shadow-md')}>
                {aiAnalyzing ? '⏳ Analisando...' : '🧠 Analisar Agora'}
              </button>
            </div>

            {aiResult && (
              <div className="mb-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <span className={'px-2 py-0.5 rounded text-[9px] font-bold ' + (aiResult.risk_level === 'low' ? 'bg-green-500/20 text-green-400' : aiResult.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')}>
                    {aiResult.risk_level === 'low' ? '🟢 Risco Baixo' : aiResult.risk_level === 'medium' ? '🟡 Risco Médio' : '🔴 Risco Alto'}
                  </span>
                  <span className="text-[9px] text-gray-500">{aiResult.decisions?.length || 0} decisões tomadas</span>
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">{aiResult.analysis_summary}</p>
                {aiResult.recommendation && <p className="text-[10px] text-violet-400 mt-2 font-medium">💡 {aiResult.recommendation}</p>}
                {aiResult.learnings && <p className="text-[10px] text-cyan-400 mt-1 font-medium">📚 {aiResult.learnings}</p>}
                {aiResult.budget_health && (
                  <span className={'inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold ' + (aiResult.budget_health === 'on_track' ? 'bg-green-500/20 text-green-400' : aiResult.budget_health === 'underspending' ? 'bg-blue-500/20 text-blue-400' : aiResult.budget_health === 'overspending' ? 'bg-orange-500/20 text-orange-400' : 'bg-red-500/20 text-red-400')}>
                    {aiResult.budget_health === 'on_track' ? '✅ Orçamento no ritmo' : aiResult.budget_health === 'underspending' ? '📉 Gastando pouco' : aiResult.budget_health === 'overspending' ? '📈 Gastando muito' : '🚨 Orçamento crítico'}
                  </span>
                )}
                {aiResult.suggested_interests?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[9px] text-gray-500 mb-1">Interesses sugeridos:</p>
                    <div className="flex flex-wrap gap-1">
                      {aiResult.suggested_interests.map((int, i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-[9px]">{int}</span>
                      ))}
                    </div>
                  </div>
                )}
                {aiResult.decisions?.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {aiResult.decisions.map((d, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px]">
                        <span>{d.type === 'adjust_budget' ? '💰' : d.type === 'pause_ad' ? '⏸' : d.type === 'create_ab_test' ? '🔬' : '▶️'}</span>
                        <span className="text-gray-400">{d.reason}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {abTests.filter(t => t.status === 'running').length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">🔬 Testes A/B Ativos</p>
                <div className="space-y-2">
                  {abTests.filter(t => t.status === 'running').map(test => {
                    const ctrA = test.metrics_a?.ctr ? parseFloat(test.metrics_a.ctr).toFixed(2) : '—'
                    const ctrB = test.metrics_b?.ctr ? parseFloat(test.metrics_b.ctr).toFixed(2) : '—'
                    return (
                      <div key={test.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700">
                        <div className="flex-1"><p className="text-[10px] font-bold text-blue-400">A: {test.ad_a_name}</p><p className="text-[9px] text-gray-500">CTR: {ctrA}%</p></div>
                        <span className="text-gray-600 text-xs font-bold">VS</span>
                        <div className="flex-1 text-right"><p className="text-[10px] font-bold text-violet-400">B: {test.ad_b_name}</p><p className="text-[9px] text-gray-500">CTR: {ctrB}%</p></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {aiLogs.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">📋 Últimas Ações da IA</p>
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {aiLogs.slice(0, 15).map(log => {
                    const icons = { ai_analysis: '🧠', adjust_budget: '💰', pause_ad: '⏸', activate_ad: '▶️', create_ab_test: '🔬', ab_test_winner: '🏆', auto_add_post: '🚀' }
                    const colors = { ai_analysis: 'text-violet-400', adjust_budget: 'text-blue-400', pause_ad: 'text-red-400', activate_ad: 'text-green-400', create_ab_test: 'text-violet-400', ab_test_winner: 'text-yellow-400', auto_add_post: 'text-orange-400' }
                    return (
                      <div key={log.id} className="flex items-start gap-2 text-[10px] py-1 border-b border-gray-800">
                        <span>{icons[log.action] || '📌'}</span>
                        <div className="flex-1 min-w-0">
                          <span className={colors[log.action] || 'text-gray-400'}>{log.details}</span>
                          <span className="text-gray-600 ml-2">{new Date(log.criado_em).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {aiLogs.length === 0 && !aiResult && (
              <div className="text-center py-6">
                <p className="text-2xl mb-2">🤖</p>
                <p className="text-xs text-gray-400">Ative o funil para a IA começar a otimizar</p>
                <p className="text-[10px] text-gray-600 mt-1">A IA analisa a cada 3h, ajusta budgets, pausa anúncios ruins e cria testes A/B</p>
              </div>
            )}
          </div>

          {/* Explicação */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-bold text-gray-400 uppercase mb-2">Como funciona</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-500 flex-wrap">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-bold">📢 Awareness</span>
              <span>→</span>
              <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded font-bold">🤔 Consideração</span>
              <span>→</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded font-bold">🎯 Conversão</span>
              <span>→</span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-bold">🔥 Urgência</span>
              <span>→</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-bold">🎉 Evento!</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">O sistema muda de fase automaticamente com base na data do evento. Posts publicados são adicionados como anúncios na fase atual.</p>
          </div>
        </div>
        )
      })()}

      {activeSubTab === 'materiais' && (
        <div className="space-y-4">
          <Card>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-blue-500" />
                Materiais do Evento
              </h3>
              <p className="text-xs text-gray-500 mt-1">Upload de presskit, vídeos, logos e referências para a equipe</p>
            </div>
          </Card>

          {categoriasMateriaisOptions.map(cat => {
            const arquivosCat = materiaisArquivos.filter(a => a.categoria_material === cat)
            return (
              <Card key={cat}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      {cat === 'Presskit' ? '📦' : cat === 'Vídeos YouTube' ? '🎬' : cat === 'Logo Realização' ? '🎨' : cat === 'Fotos e Vídeos Artistas' ? '📸' : cat === 'Artes Referência' ? '✨' : cat === 'Logo Patrocinadores' ? '🤝' : '📁'} {cat}
                      {arquivosCat.length > 0 && <Badge variant="gray">{arquivosCat.length}</Badge>}
                    </h4>
                  </div>

                  {/* Arquivos existentes */}
                  {arquivosCat.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-3">
                      {arquivosCat.map(arq => (
                        <div key={arq.id} className="relative group rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition bg-white">
                          {arq.tipo && arq.tipo.startsWith('image') ? (
                            <div className="cursor-pointer" onClick={() => setPreviewArquivo(arq)}>
                              <img src={'/api' + arq.url} className="w-full h-28 object-cover" />
                            </div>
                          ) : arq.tipo && arq.tipo.startsWith('video') ? (
                            <div className="cursor-pointer" onClick={() => setPreviewArquivo(arq)}>
                              <div className="w-full h-28 bg-gray-900 flex items-center justify-center">
                                <span className="text-3xl">🎬</span>
                              </div>
                            </div>
                          ) : (
                            <a href={'/api' + arq.url} download className="block">
                              <div className="w-full h-28 bg-gray-50 flex items-center justify-center">
                                <FileText size={28} className="text-gray-300" />
                              </div>
                            </a>
                          )}
                          <div className="p-2">
                            <p className="text-[10px] font-medium text-gray-700 truncate" title={arq.nome_original}>{arq.nome_original}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-[9px] text-gray-400">{arq.enviado_nome || ''}{arq.tamanho ? ` · ${arq.tamanho > 1048576 ? (arq.tamanho / 1048576).toFixed(1) + ' MB' : (arq.tamanho / 1024).toFixed(0) + ' KB'}` : ''}</span>
                              <a href={'/api' + arq.url} download className="text-[9px] text-blue-500 hover:text-blue-700 font-medium">Baixar</a>
                            </div>
                          </div>
                          <button onClick={() => deletarMaterialArquivo(arq.id)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs">
                            <XIcon size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload area */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400','bg-blue-50') }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50') }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50'); Array.from(e.dataTransfer.files).forEach(f => uploadMaterialArquivo(cat, f)) }}
                    className="relative flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-200 text-xs font-medium text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer">
                    <input type="file" accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      onChange={(e) => { Array.from(e.target.files).forEach(f => uploadMaterialArquivo(cat, f)); e.target.value = '' }} />
                    <Paperclip size={14} /> Arraste ou clique para adicionar {cat.toLowerCase()}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Detalhe Briefing */}
      {briefingDetalhe && (
        <Modal open={!!briefingDetalhe} onClose={() => { setBriefingDetalhe(null); setEditBriefingMode(false) }} title={editBriefingMode ? 'Editando: ' + briefingDetalhe.titulo : briefingDetalhe.titulo} size="lg">
          <div className="flex justify-end px-4 -mt-2 mb-2">
            <button onClick={() => { if(editBriefingMode){setEditBriefingMode(false)}else{setEditBriefingMode(true);setEditBriefingForm({titulo:briefingDetalhe.titulo||'',descricao:briefingDetalhe.descricao||'',publico_alvo:briefingDetalhe.publico_alvo||'',mensagem_chave:briefingDetalhe.mensagem_chave||'',referencias_visuais:briefingDetalhe.referencias_visuais||'',referencia:briefingDetalhe.referencia||'',musica:briefingDetalhe.musica||'',dimensoes:briefingDetalhe.dimensoes||'',data_vencimento:briefingDetalhe.data_vencimento||'',tipo_conteudo:briefingDetalhe.tipo_conteudo||'',formato:briefingDetalhe.formato||''})} }} className={'text-xs px-3 py-1.5 rounded-lg font-medium ' + (editBriefingMode ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200')}>
              {editBriefingMode ? 'Cancelar' : '✏️ Editar'}
            </button>
          </div>
          <div className="space-y-4">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3">
              {briefingDetalhe.data_vencimento && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Vencimento</span>
                  <p className="text-sm font-medium text-gray-900">{new Date(briefingDetalhe.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}{briefingDetalhe.hora_vencimento ? ' às ' + briefingDetalhe.hora_vencimento.slice(0,5) : ''}</p>
                </div>
              )}
              {briefingDetalhe.tipo_conteudo && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Tipo</span>
                  <div className="flex flex-wrap gap-1 mt-1">{briefingDetalhe.tipo_conteudo.split(',').filter(Boolean).map(tc => (
                    <span key={tc} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-bold">{tc}</span>
                  ))}</div>
                </div>
              )}
              {briefingDetalhe.formato && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Formato</span>
                  <div className="flex flex-wrap gap-1 mt-1">{briefingDetalhe.formato.split(',').filter(Boolean).map(fm => (
                    <span key={fm} className="px-2 py-0.5 bg-violet-50 text-blue-600 rounded text-xs font-bold">{fm}</span>
                  ))}</div>
                </div>
              )}
              {briefingDetalhe.musica && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase">Música</span>
                  <p className="text-sm font-medium text-gray-900">🎵 {briefingDetalhe.musica}</p>
                </div>
              )}
            </div>
            {editBriefingMode ? (
              <div className="space-y-3 px-1">
                <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Título</span><input value={editBriefingForm.titulo||''} onChange={e => setEditBriefingForm({...editBriefingForm, titulo: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Descrição</span><textarea value={editBriefingForm.descricao||''} onChange={e => setEditBriefingForm({...editBriefingForm, descricao: e.target.value})} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Público Alvo</span><input value={editBriefingForm.publico_alvo||''} onChange={e => setEditBriefingForm({...editBriefingForm, publico_alvo: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Mensagem Chave</span><input value={editBriefingForm.mensagem_chave||''} onChange={e => setEditBriefingForm({...editBriefingForm, mensagem_chave: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Referências Visuais</span><textarea value={editBriefingForm.referencias_visuais||''} onChange={e => setEditBriefingForm({...editBriefingForm, referencias_visuais: e.target.value})} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Referência</span><input value={editBriefingForm.referencia||''} onChange={e => setEditBriefingForm({...editBriefingForm, referencia: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Música</span><input value={editBriefingForm.musica||''} onChange={e => setEditBriefingForm({...editBriefingForm, musica: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Dimensões</span><input value={editBriefingForm.dimensoes||''} onChange={e => setEditBriefingForm({...editBriefingForm, dimensoes: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Data Vencimento</span><input type="date" value={editBriefingForm.data_vencimento||''} onChange={e => setEditBriefingForm({...editBriefingForm, data_vencimento: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                  <div><span className="text-[10px] font-semibold text-gray-400 uppercase">Horário</span><input type="time" value={editBriefingForm.hora_vencimento||''} onChange={e => setEditBriefingForm({...editBriefingForm, hora_vencimento: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1" /></div>
                </div>
                <button onClick={salvarEditBriefing} className="w-full px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition">💾 Salvar</button>
              </div>
            ) : (<>
            {briefingDetalhe.descricao && (
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Descrição</span>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{briefingDetalhe.descricao}</p>
              </div>
            )}
            {briefingDetalhe.referencia && (
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Referência</span>
                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{briefingDetalhe.referencia}</p>
              </div>
            )}
            </>)}

            {/* Arquivos */}
            <div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase">Arquivos ({(arquivos[briefingDetalhe.id] || []).length})</span>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {(arquivos[briefingDetalhe.id] || []).map(arq => (
                  <div key={arq.id} className="relative group">
                    {arq.tipo && arq.tipo.startsWith('image') ? (
                      <div onClick={() => setPreviewArquivo(arq)} className="cursor-pointer">
                        <img src={'/api' + arq.url} className="w-full h-32 rounded-lg object-cover border border-gray-200 hover:shadow-md transition" />
                      </div>
                    ) : arq.tipo && arq.tipo.startsWith('video') ? (
                      <div onClick={() => setPreviewArquivo(arq)} className="w-full h-32 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center hover:shadow-md transition cursor-pointer">
                        <span className="text-2xl">🎬</span>
                        <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[80%]">{arq.nome_original}</span>
                      </div>
                    ) : (
                      <a href={'/api' + arq.url} download className="w-full h-32 rounded-lg bg-gray-100 border border-gray-200 flex flex-col items-center justify-center hover:shadow-md transition">
                        <FileText size={24} className="text-gray-400" />
                        <span className="text-[10px] text-gray-500 mt-1 truncate max-w-[80%]">{arq.nome_original}</span>
                      </a>
                    )}
                    <button onClick={(e) => { e.preventDefault(); deletarArquivo(arq.id, briefingDetalhe.id) }} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                      <XIcon size={10} />
                    </button>
                    <span className="text-[9px] text-gray-400 mt-0.5 block truncate">{arq.enviado_nome || 'Anônimo'}</span>
                  </div>
                ))}
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400','bg-blue-50') }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50') }}
                onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50'); const file = e.dataTransfer.files[0]; if(file) uploadArquivo(briefingDetalhe.id, file) }}
                className={`relative mt-3 w-full flex items-center justify-center gap-2 py-4 rounded-lg border-2 border-dashed text-xs font-semibold transition cursor-pointer border-gray-300 text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 ${uploading === briefingDetalhe.id ? 'opacity-50 pointer-events-none' : ''}`}>
                <input type="file" accept="image/*,video/*,.pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  onChange={(e) => { const file = e.target.files[0]; if(file) uploadArquivo(briefingDetalhe.id, file); e.target.value='' }} />
                <Paperclip size={12} /> {uploading === briefingDetalhe.id ? <span className="animate-spin">⏳</span> : 'Arraste ou clique para upload'}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Editar Post Cronograma */}
      {editandoPost && (
        <Modal open={true} onClose={() => setEditandoPost(null)} title="Editar Post" size="md">
          <EditPostForm post={editandoPost} onSave={salvarEdicaoPost} onCancel={() => setEditandoPost(null)} />
        </Modal>
      )}

      {/* Modal Conectar Instagram */}
      {showIGModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4" onClick={() => { setShowIGModal(false); setShowAddToken(false) }}>
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b bg-gradient-to-r from-violet-50 to-violet-50 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Instagram size={20} className="text-blue-500" />
                <h3 className="font-bold text-gray-900">Conectar Instagram</h3>
              </div>
              <button onClick={() => { setShowIGModal(false); setShowAddToken(false) }} className="w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-gray-400 hover:text-gray-600"><XIcon size={16} /></button>
            </div>
            <div className="p-4 space-y-4">
              {igAccounts.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2">Selecione uma conta</p>
                  <div className="space-y-2">
                    {igAccounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between p-3 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-violet-50/50 transition cursor-pointer group" onClick={() => selecionarContaIG(acc.id)}>
                        <div className="flex items-center gap-3">
                          {acc.profile_picture ? (
                            <img src={acc.profile_picture} className="w-10 h-10 rounded-full object-cover border-2 border-gray-200 group-hover:border-blue-400" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">{(acc.ig_username||'?')[0].toUpperCase()}</div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-gray-900">@{acc.ig_username}</p>
                            <p className="text-[10px] text-gray-400">Clique para vincular a este evento</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={(e) => { e.stopPropagation(); removerContaIG(acc.id) }} className="text-gray-300 hover:text-red-500 transition p-1"><Trash2 size={12} /></button>
                          <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {igAccounts.length === 0 && !showAddToken && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3"><Instagram size={28} className="text-gray-300" /></div>
                  <p className="text-sm font-bold text-gray-700">Nenhuma conta cadastrada</p>
                  <p className="text-xs text-gray-400 mt-1">Adicione contas de Instagram para vincular aos eventos</p>
                </div>
              )}

              {!showAddToken ? (
                <div className="space-y-2">
                  <button onClick={() => { setShowIGModal(false); conectarInstagram() }} disabled={loadingIG} className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-blue-500 via-blue-500 to-orange-500 text-white font-bold text-sm hover:from-blue-600 hover:via-blue-600 hover:to-orange-600 transition shadow-md">
                    <Instagram size={16} /> {loadingIG ? 'Conectando...' : 'Login com Instagram'}
                  </button>
                  <button onClick={() => setShowAddToken(true)} className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition text-xs">
                    <Plus size={14} /> Ou colar token manualmente
                  </button>
                </div>
              ) : (
                <div className="space-y-3 bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-gray-900">Adicionar Conta</p>
                    <button onClick={() => setShowAddToken(false)} className="text-gray-400 hover:text-gray-600"><XIcon size={14} /></button>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-gray-100">
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      <strong>Como gerar o token:</strong><br/>
                      1. Acesse <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-blue-500 underline">developers.facebook.com</a><br/>
                      2. Abra o app &rarr; <strong>Instagram</strong> &rarr; Adicione a conta<br/>
                      3. Clique em <strong>Gerar Token</strong><br/>
                      4. Copie e cole abaixo
                    </p>
                  </div>
                  <textarea
                    value={igTokenInput}
                    onChange={e => setIgTokenInput(e.target.value)}
                    placeholder="Cole o token do Instagram aqui..."
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-xs font-mono focus:ring-2 focus:ring-accent focus:border-accent outline-none resize-none bg-white"
                  />
                  <button onClick={adicionarContaIG} disabled={savingIGToken || !igTokenInput.trim()} className={'w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ' + (savingIGToken ? 'bg-gray-300 text-gray-500' : !igTokenInput.trim() ? 'bg-gray-200 text-gray-400' : 'bg-accent text-white hover:bg-accent/90 shadow-md')}>
                    <Instagram size={14} /> {savingIGToken ? 'Verificando...' : 'Adicionar Conta'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview de Arquivo */}
      {previewArquivo && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" onClick={() => setPreviewArquivo(null)}>
          <div className="fixed inset-0 bg-black/80" />
          <div className="relative z-10 max-w-4xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setPreviewArquivo(null)} className="absolute -top-10 right-0 text-white hover:text-gray-300 transition text-sm font-semibold flex items-center gap-1">
              <XIcon size={16} /> Fechar
            </button>
            <a href={'/api' + previewArquivo.url} download className="absolute -top-10 left-0 text-white hover:text-gray-300 transition text-sm font-semibold">
              ⬇ Baixar
            </a>
            {previewArquivo.tipo && previewArquivo.tipo.startsWith('image') ? (
              <img src={'/api' + previewArquivo.url} className="max-w-full max-h-[85vh] rounded-lg object-contain" />
            ) : previewArquivo.tipo && previewArquivo.tipo.startsWith('video') ? (
              <video src={'/api' + previewArquivo.url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
            ) : null}
            <p className="text-white text-center text-sm mt-2">{previewArquivo.nome_original}</p>
          </div>
        </div>
      )}

      {/* Modal Gerar com IA */}
      <Modal open={showIAModal} onClose={() => setShowIAModal(false)} title="Gerar Briefing com IA" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de material</label>
            <select
              value={tipoIA}
              onChange={(e) => setTipoIA(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {tiposBriefing.map((t) => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Direcionamento para a IA</label>
            <textarea
              value={direcionamentoIA}
              onChange={(e) => setDirecionamentoIA(e.target.value)}
              placeholder="Ex: Preciso de um briefing de 7 dias com acoes de virada de lote nos dias 20 e 21. Foco em urgencia e escassez. Tom jovem e energetico."
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent mb-3"
            />
          </div>

          <Button onClick={gerarBriefingIA} loading={gerandoIA} className="w-full">
            <Sparkles size={16} />
            {gerandoIA ? 'Gerando...' : 'Gerar Briefing'}
          </Button>

          {briefingGerado && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
              <h4 className="font-semibold text-gray-900">{briefingGerado.titulo}</h4>
              <div className="flex gap-2">
                <Badge variant="blue">{briefingGerado.tipo}</Badge>
                <Badge variant="gray">{briefingGerado.dimensoes}</Badge>
              </div>
              {briefingGerado.descricao && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Descricao</span>
                  <p className="text-sm text-gray-700">{briefingGerado.descricao}</p>
                </div>
              )}
              {briefingGerado.publico_alvo && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Publico-alvo</span>
                  <p className="text-sm text-gray-700">{briefingGerado.publico_alvo}</p>
                </div>
              )}
              {briefingGerado.mensagem_chave && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Mensagem-chave</span>
                  <p className="text-sm text-gray-700">{briefingGerado.mensagem_chave}</p>
                </div>
              )}
              {briefingGerado.referencias_visuais && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Referencias visuais</span>
                  <p className="text-sm text-gray-700">{briefingGerado.referencias_visuais}</p>
                </div>
              )}
              {briefingGerado.copy_complementar && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Copy complementar</span>
                  <p className="text-sm text-gray-700">{briefingGerado.copy_complementar}</p>
                </div>
              )}
              {briefingGerado.paleta_cores && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Paleta de cores</span>
                  <div className="flex gap-2 mt-1">{(Array.isArray(briefingGerado.paleta_cores)?briefingGerado.paleta_cores:[]).map((c,i)=><div key={i} className="flex items-center gap-1"><div style={{background:c,width:24,height:24,borderRadius:6,border:'1px solid #ddd'}}/><span className="text-xs text-gray-600">{c}</span></div>)}</div>
                </div>
              )}
              {briefingGerado.hashtags && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Hashtags</span>
                  <p className="text-sm text-blue-600">{briefingGerado.hashtags}</p>
                </div>
              )}
              {briefingGerado.dicas_designer && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Dicas para o designer</span>
                  <p className="text-sm text-gray-700">{briefingGerado.dicas_designer}</p>
                </div>
              )}
              {briefingGerado.tom_comunicacao && (
                <div>
                  <span className="text-xs font-medium text-gray-500 uppercase">Tom de comunicacao</span>
                  <p className="text-sm text-gray-700">{briefingGerado.tom_comunicacao}</p>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button onClick={salvarBriefingGerado} className="flex-1">Salvar Briefing</Button>
                <Button variant="secondary" onClick={() => setBriefingGerado(null)}>Descartar</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {activeSubTab === 'campanhas' && (
        <Card>
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Campanhas ({campanhas.length})</h3>
            <Button onClick={() => setShowCampanhaModal(true)} size="sm">
              <Sparkles size={14} />
              Gerar Campanha IA
            </Button>
          </div>
          {campanhas.length === 0 ? (
            <EmptyState icon={Megaphone} message="Nenhuma campanha. Gere uma com IA!" />
          ) : (
            <div className="divide-y divide-gray-100">
              {campanhas.map((c) => (
                <div key={c.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-gray-900">{c.nome}</h4>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="blue">{c.objetivo}</Badge>
                        <Badge variant="gray">{c.plataforma}</Badge>
                        <Badge variant="green">R$ {Number(c.orcamento_total).toFixed(2)}</Badge>
                        <Badge variant="yellow">{c.duracao_dias} dias</Badge>
                      </div>
                    </div>
                    <button onClick={() => deletarCampanha(c.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
                  </div>
                  {c.publico_alvo && <div><span className="text-xs font-medium text-gray-500 uppercase">Publico-alvo</span><p className="text-sm text-gray-700">{c.publico_alvo}</p></div>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {c.copy_principal && <div className="bg-blue-50 rounded-lg p-3"><span className="text-xs font-medium text-blue-600 uppercase">Copy principal</span><p className="text-sm text-gray-800 mt-1">{c.copy_principal}</p></div>}
                    {c.headline && <div className="bg-violet-50 rounded-lg p-3"><span className="text-xs font-medium text-blue-600 uppercase">Headline</span><p className="text-sm text-gray-800 mt-1">{c.headline}</p></div>}
                  </div>
                  {c.copy_secundaria && <div><span className="text-xs font-medium text-gray-500 uppercase">Copy secundaria</span><p className="text-sm text-gray-700">{c.copy_secundaria}</p></div>}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {c.cta && <div><span className="text-xs font-medium text-gray-500">CTA:</span> <span className="text-gray-700">{c.cta}</span></div>}
                    {c.posicionamentos && <div><span className="text-xs font-medium text-gray-500">Posicionamentos:</span> <span className="text-gray-700">{c.posicionamentos}</span></div>}
                    {c.horarios_sugeridos && <div><span className="text-xs font-medium text-gray-500">Horarios:</span> <span className="text-gray-700">{c.horarios_sugeridos}</span></div>}
                  </div>
                  {c.segmentacao && typeof c.segmentacao === 'string' && (() => { try { const s=JSON.parse(c.segmentacao); return (
                    <div className="bg-gray-50 rounded-lg p-3"><span className="text-xs font-medium text-gray-500 uppercase">Segmentacao detalhada</span>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1 text-sm">
                      {s.idade_min && <div><span className="text-gray-500">Idade:</span> {s.idade_min}-{s.idade_max}</div>}
                      {s.genero && <div><span className="text-gray-500">Genero:</span> {s.genero}</div>}
                      {s.localizacao && <div><span className="text-gray-500">Local:</span> {s.localizacao}</div>}
                      {s.interesses && <div className="col-span-2"><span className="text-gray-500">Interesses:</span> {Array.isArray(s.interesses)?s.interesses.join(', '):s.interesses}</div>}
                    </div></div>
                  ); } catch(e) { return null; } })()}
                  {c.observacoes_ia && <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200"><span className="text-xs font-medium text-yellow-700 uppercase">Insights da IA</span><p className="text-sm text-gray-700 mt-1">{c.observacoes_ia}</p></div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {showCampanhaModal && (
        <Modal open={showCampanhaModal} onClose={() => setShowCampanhaModal(false)} title="Gerar Campanha com IA">
          <div className="space-y-4">
            <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
              <p className="text-xs text-blue-600 font-medium">A IA vai analisar os dados do evento, criativos aprovados e gerar um plano de campanha completo.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Objetivo</label>
                <select value={campForm.objetivo} onChange={(e) => setCampForm({...campForm, objetivo: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="engajamento">Engajamento</option>
                  <option value="trafego">Trafego</option>
                  <option value="conversao">Conversao/Vendas</option>
                  <option value="alcance">Alcance</option>
                  <option value="reconhecimento">Reconhecimento</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plataforma</label>
                <select value={campForm.plataforma} onChange={(e) => setCampForm({...campForm, plataforma: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="Instagram + Facebook">Instagram + Facebook</option>
                  <option value="Instagram">Somente Instagram</option>
                  <option value="Facebook">Somente Facebook</option>
                  <option value="Instagram + Facebook + Google">Insta + FB + Google</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Orcamento total (R$)</label>
                <input type="number" value={campForm.orcamento} onChange={(e) => setCampForm({...campForm, orcamento: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duracao (dias)</label>
                <input type="number" value={campForm.duracao} onChange={(e) => setCampForm({...campForm, duracao: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Direcionamento para a IA</label>
              <textarea value={campForm.direcionamento} onChange={(e) => setCampForm({...campForm, direcionamento: e.target.value})} placeholder="Ex: Focar em virada de lote, criar urgencia, publico universitario 18-25 na regiao de Lavras-MG" rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <Button onClick={gerarCampanha} loading={gerandoCampanha} className="w-full">
              <Sparkles size={16} />
              {gerandoCampanha ? 'Gerando campanha...' : 'Gerar Campanha IA'}
            </Button>
          </div>
        </Modal>
      )}

      {/* Análise IA */}
      {activeSubTab === 'analise' && (
        <div className="space-y-4">
          {/* Botão gerar */}
          <Card>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Brain size={20} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Análise Semanal IA</h3>
                </div>
                <Button onClick={gerarAnalise} loading={gerandoAnalise} size="sm">
                  <Sparkles size={14} />
                  {gerandoAnalise ? 'Analisando dados...' : 'Gerar Análise'}
                </Button>
              </div>
              <div className="bg-violet-50 rounded-lg p-3 border border-violet-200">
                <p className="text-xs text-violet-700">A IA vai cruzar os dados de vendas (por dia, cidade e tipo) com as ações de marketing do cronograma para identificar quais ações converteram em vendas e gerar recomendações.</p>
              </div>
              {gerandoAnalise && (
                <div className="flex items-center gap-3 mt-3 text-sm text-gray-500">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                  Analisando vendas, cronograma e cruzando dados... (pode levar ~15s)
                </div>
              )}
            </div>
          </Card>

          {/* Resultado atual */}
          {analiseAtual && (
            <AnaliseCard analise={analiseAtual} onDelete={deletarAnalise} defaultOpen={true} />
          )}

          {/* Histórico */}
          {analises.filter(a => !analiseAtual || a.id !== analiseAtual.id).length > 0 && (
            <Card>
              <div className="p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock size={16} />
                  Histórico de Análises ({analises.filter(a => !analiseAtual || a.id !== analiseAtual.id).length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {analises.filter(a => !analiseAtual || a.id !== analiseAtual.id).map(a => (
                  <AnaliseCard key={a.id} analise={a} onDelete={deletarAnalise} defaultOpen={false} compact />
                ))}
              </div>
            </Card>
          )}

          {!analiseAtual && analises.length === 0 && !gerandoAnalise && (
            <EmptyState icon={Brain} title="Nenhuma análise" description="Gere uma análise semanal para cruzar vendas com ações de marketing" />
          )}
        </div>
      )}

    </div>
  )
}

function BriefingForm({ onSubmit, onCancel }) {
  const [form, setForm] = useState({
    titulo: '', plataforma: 'Instagram', data_vencimento: '', hora_vencimento: '', tipo_conteudo: '', formato: '', descricao: '', referencia: '', musica: '', status: 'pendente', destino: 'design',
  })
  const tiposConteudo = ['GIF', 'VIDEO', 'ESTATICA', 'FOTO ORGÂNICA', 'VÍDEO ORGÂNICO', 'INTERAÇÃO']
  const formatos = ['FEED', 'STORIES', 'CARROSSEL', 'REELS']
  function toggleMulti(field, val) {
    const arr = form[field] ? form[field].split(',').filter(Boolean) : []
    const idx = arr.indexOf(val)
    if (idx >= 0) arr.splice(idx, 1); else arr.push(val)
    setForm({ ...form, [field]: arr.join(',') })
  }
  function isSelected(field, val) { return form[field] ? form[field].split(',').includes(val) : false }
  function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    onSubmit(form)
  }
  return (
    <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-violet-50/50 space-y-4">
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Destino</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setForm({...form, destino: 'design'})} className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border-2 transition ' + (form.destino === 'design' ? 'border-accent bg-accent text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-accent/50')}>
            🎨 Design
          </button>
          <button type="button" onClick={() => setForm({...form, destino: 'social'})} className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border-2 transition ' + (form.destino === 'social' ? 'border-accent bg-accent text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-accent/50')}>
            📲 Social Media
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{form.destino === 'design' ? 'Vai para o Kanban de Briefings (designer)' : 'Vai para o Cronograma (social media)'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Titulo *</label>
          <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} placeholder="Ex: Post abertura de vendas" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Plataforma</label>
          <select value={form.plataforma} onChange={e => setForm({...form, plataforma: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none">
            {['Instagram','Facebook','TikTok','YouTube','Twitter/X','LinkedIn','WhatsApp'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Data de Entrega</label>
            <input type="date" value={form.data_vencimento} onChange={e => setForm({...form, data_vencimento: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Horário</label>
            <input type="time" value={form.hora_vencimento} onChange={e => setForm({...form, hora_vencimento: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
          </div>
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Tipo de Conteudo (selecione 1 ou mais)</label>
        <div className="flex gap-2">
          {tiposConteudo.map(tc => (
            <button key={tc} type="button" onClick={() => toggleMulti('tipo_conteudo', tc)} className={'px-4 py-2 rounded-lg text-xs font-bold border-2 transition ' + (isSelected('tipo_conteudo', tc) ? 'border-accent bg-accent text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-accent/50')}>
              {tc === 'ESTATICA' ? '🖼️' : tc === 'VIDEO' ? '🎬' : tc === 'GIF' ? '✨' : tc === 'FOTO ORGÂNICA' ? '📸' : tc === 'VÍDEO ORGÂNICO' ? '🎞️' : tc === 'INTERAÇÃO' ? '💬' : '✨'} {tc}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Formato (selecione 1 ou mais)</label>
        <div className="flex gap-2">
          {formatos.map(fm => (
            <button key={fm} type="button" onClick={() => toggleMulti('formato', fm)} className={'px-4 py-2 rounded-lg text-xs font-bold border-2 transition ' + (isSelected('formato', fm) ? 'border-accent bg-accent text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-accent/50')}>
              {fm === 'FEED' ? '📱' : fm === 'STORIES' ? '📲' : fm === 'CARROSSEL' ? '🔄' : '🎥'} {fm}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Briefing</label>
        <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descreva o que o designer precisa criar..." rows={3} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Legenda</label>
        <textarea value={form.legenda || ''} onChange={e => setForm({...form, legenda: e.target.value})} placeholder="Legenda do post..." rows={3} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Referencia</label>
          <input value={form.referencia} onChange={e => setForm({...form, referencia: e.target.value})} placeholder="Link ou descricao da referencia visual" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Musica</label>
          <input value={form.musica} onChange={e => setForm({...form, musica: e.target.value})} placeholder="Nome da musica ou link" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} className="flex items-center gap-1.5 px-5 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition shadow-md">{form.destino === 'social' ? 'Criar Post' : 'Criar Briefing'}</button>
        <button onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">Cancelar</button>
      </div>
    </div>
  )
}

function CronogramaForm({ onSubmit, onCancel, initialDate }) {
  const [form, setForm] = useState({
    titulo: '', plataforma: 'Instagram', data_publicacao: initialDate || '', hora_publicacao: '', conteudo: '', tipo_conteudo: '', formato: '', descricao: '', referencia: '', musica: '', destino: 'social', status: 'pendente', collaborators: '',
  })
  const [arquivosSelecionados, setArquivosSelecionados] = useState([])

  const tiposConteudo = ['GIF', 'VIDEO', 'ESTATICA', 'FOTO ORGÂNICA', 'VÍDEO ORGÂNICO', 'INTERAÇÃO']
  const formatos = ['FEED', 'STORIES', 'CARROSSEL', 'REELS']

  function toggleMulti(field, val) {
    const arr = form[field] ? form[field].split(',').filter(Boolean) : []
    const idx = arr.indexOf(val)
    if (idx >= 0) arr.splice(idx, 1); else arr.push(val)
    setForm({ ...form, [field]: arr.join(',') })
  }
  function isSelected(field, val) { return form[field] ? form[field].split(',').includes(val) : false }

  useEffect(() => {
    return () => { arquivosSelecionados.forEach(item => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl) }) }
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    onSubmit(form, arquivosSelecionados.map(item => item.file))
  }

  function handleFiles(files) {
    const novos = Array.from(files).map(file => ({ file, previewUrl: file.type.startsWith('image') ? URL.createObjectURL(file) : null }))
    setArquivosSelecionados(prev => [...prev, ...novos])
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50/50 to-violet-50/50 space-y-4">
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Destino</label>
        <div className="flex gap-2">
          <button type="button" onClick={() => setForm({...form, destino: 'social'})} className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border-2 transition ' + (form.destino === 'social' ? 'border-accent bg-accent text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-accent/50')}>
            📲 Social Media
          </button>
          <button type="button" onClick={() => setForm({...form, destino: 'design'})} className={'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold border-2 transition ' + (form.destino === 'design' ? 'border-accent bg-accent text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-accent/50')}>
            🎨 Design
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{form.destino === 'design' ? 'Vai para o Kanban de Briefings (designer)' : 'Vai para o Cronograma (social media)'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          placeholder="Titulo do post *"
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          required
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
        <select
          value={form.plataforma}
          onChange={(e) => setForm({ ...form, plataforma: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        >
          {plataformas.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.data_publicacao}
          onChange={(e) => setForm({ ...form, data_publicacao: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
        <input
          type="time"
          value={form.hora_publicacao}
          onChange={(e) => setForm({ ...form, hora_publicacao: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Tipo de Conteudo (selecione 1 ou mais)</label>
        <div className="flex gap-2">
          {tiposConteudo.map(tc => (
            <button key={tc} type="button" onClick={() => toggleMulti('tipo_conteudo', tc)} className={'px-4 py-2 rounded-lg text-xs font-bold border-2 transition ' + (isSelected('tipo_conteudo', tc) ? 'border-accent bg-accent text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-accent/50')}>
              {tc === 'ESTATICA' ? '🖼️' : tc === 'VIDEO' ? '🎬' : '✨'} {tc}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2 block">Formato (selecione 1 ou mais)</label>
        <div className="flex gap-2">
          {formatos.map(fm => (
            <button key={fm} type="button" onClick={() => toggleMulti('formato', fm)} className={'px-4 py-2 rounded-lg text-xs font-bold border-2 transition ' + (isSelected('formato', fm) ? 'border-accent bg-accent text-white shadow-md' : 'border-gray-200 bg-white text-gray-500 hover:border-accent/50')}>
              {fm === 'FEED' ? '📱' : fm === 'STORIES' ? '📲' : fm === 'CARROSSEL' ? '🔄' : '🎥'} {fm}
            </button>
          ))}
        </div>
      </div>
      <textarea
        placeholder="Conteudo / legenda do post"
        value={form.conteudo}
        onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
        rows={2}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
      />
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Briefing</label>
        <textarea value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} placeholder="Descreva o que o designer precisa criar..." rows={3} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Referencia</label>
          <input value={form.referencia} onChange={e => setForm({...form, referencia: e.target.value})} placeholder="Link ou descricao da referencia visual" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Musica</label>
          <input value={form.musica} onChange={e => setForm({...form, musica: e.target.value})} placeholder="Nome da musica ou link" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Collaborators Instagram</label>
        <input value={form.collaborators} onChange={e => setForm({...form, collaborators: e.target.value})} placeholder="@usuario1, @usuario2 (até 5 contas)" className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent focus:border-accent outline-none" />
        <p className="text-[10px] text-gray-400 mt-0.5">Convite de collab enviado ao publicar. Contas precisam ser públicas.</p>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1 block">Imagens / Videos do Post</label>
        <div
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-400','bg-blue-50') }}
          onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50') }}
          onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-400','bg-blue-50'); handleFiles(e.dataTransfer.files) }}
          className="relative flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed border-gray-300 text-xs font-medium text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition cursor-pointer">
          <input type="file" accept="image/*,video/*,.pdf" multiple className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }} />
          <Paperclip size={14} /> Arraste ou clique para adicionar arquivos
        </div>
        {arquivosSelecionados.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {arquivosSelecionados.map((item, idx) => (
              <div key={idx} className="relative group">
                {item.file.type.startsWith('image') ? (
                  <img src={item.previewUrl} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                ) : item.file.type.startsWith('video') ? (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <span className="text-lg">🎬</span>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <FileText size={14} className="text-gray-400" />
                  </div>
                )}
                <button type="button" onClick={() => { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); setArquivosSelecionados(prev => prev.filter((_,i) => i !== idx)) }} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <XIcon size={8} />
                </button>
                <span className="text-[8px] text-gray-400 block truncate w-16 text-center mt-0.5">{item.file.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex items-center gap-1.5 px-5 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition shadow-md">Salvar</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">Cancelar</button>
      </div>
    </form>
  )
}

function EditPostForm({ post, onSave, onCancel }) {
  const [form, setForm] = useState({
    titulo: post.titulo || '',
    plataforma: post.plataforma || 'Instagram',
    data_publicacao: post.data_publicacao ? (typeof post.data_publicacao === 'string' ? post.data_publicacao.slice(0, 10) : '') : '',
    hora_publicacao: post.hora_publicacao || '',
    conteudo: post.conteudo || '',
    formato: post.formato || '',
    status: post.status || 'pendente',
  })
  function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo.trim()) return
    onSave(form)
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase">Título</label>
        <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase">Plataforma</label>
          <select value={form.plataforma} onChange={e => setForm({...form, plataforma: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none">
            {plataformas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase">Status</label>
          <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none">
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Não feito</option>
            <option value="publicado">Publicado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase">Data</label>
          <input type="date" value={form.data_publicacao} onChange={e => setForm({...form, data_publicacao: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" />
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-400 uppercase">Horário</label>
          <input type="time" value={form.hora_publicacao} onChange={e => setForm({...form, hora_publicacao: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase">Conteúdo / Legenda</label>
        <textarea value={form.conteudo} onChange={e => setForm({...form, conteudo: e.target.value})} rows={3} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none" />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase">Formato</label>
        <select value={form.formato} onChange={e => setForm({...form, formato: e.target.value})} className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-accent outline-none">
          <option value="">Selecione o formato</option>
          {['Interação ST','Vídeo Orgânico ST','Foto ST','Foto Feed','Reels Orgânico','Reels','Carrossel','GIF'].map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      {/* Upload de arquivo */}
      <div>
        <label className="text-[11px] font-semibold text-gray-400 uppercase">Arquivo / Arte</label>
        <div className="mt-1">
          <input type="file" id="edit-post-upload" accept="image/*,video/*,.pdf" style={{display:'none'}}
            onChange={async (e) => {
              const file = e.target.files[0]
              if (!file) return
              const formData = new FormData()
              formData.append('arquivo', file)
              try {
                await api.post('/cronograma/' + post.id + '/arquivos', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
                toast.success('Arquivo enviado!')
              } catch { toast.error('Erro ao enviar') }
              e.target.value = ''
            }} />
          <button type="button" onClick={() => document.getElementById('edit-post-upload').click()}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-gray-300 text-xs font-semibold text-gray-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition">
            <Paperclip size={12} /> Upload arte / vídeo
          </button>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button type="submit" className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition shadow-md">Salvar</button>
        <button type="button" onClick={onCancel} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">Cancelar</button>
      </div>
    </form>
  )
}

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
      <div className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between" onClick={() => setOpen(true)}>
        <div className="flex items-center gap-3">
          <Brain size={16} className="text-blue-500" />
          <div>
            <span className="text-sm font-medium text-gray-900">{a.resumo ? a.resumo.substring(0, 80) + '...' : 'Análise de ' + dataFormatada}</span>
            <span className="text-xs text-gray-500 ml-2">{dataFormatada}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {a.total_vendas != null && <Badge variant="green">R$ {Number(a.total_vendas).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</Badge>}
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <Card>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Análise de {dataFormatada}</h3>
          {a.total_vendas != null && <Badge variant="green">R$ {Number(a.total_vendas).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {compact && <button onClick={(e) => { e.stopPropagation(); setOpen(false) }} className="text-gray-400 hover:text-gray-600"><ChevronUp size={16} /></button>}
          <button onClick={() => onDelete(a.id)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Resumo */}
        {a.resumo && (
          <div className="bg-violet-50 rounded-lg p-4 border border-violet-200">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-violet-800">Resumo da Semana</span>
            </div>
            <p className="text-sm text-gray-800">{a.resumo}</p>
            {a.comparativo && <p className="text-xs text-blue-600 mt-2 font-medium">{a.comparativo}</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top Ações */}
          {topAcoes.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-blue-600" />
                <span className="text-sm font-semibold text-violet-800">Top Ações que Converteram</span>
              </div>
              <div className="space-y-2">
                {topAcoes.map((ac, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{ac.acao || ac.titulo || ac.descricao}</p>
                      <div className="flex gap-2 mt-0.5">
                        {ac.data && <span className="text-xs text-gray-500">{ac.data}</span>}
                        {ac.vendas_geradas != null && <span className="text-xs text-green-600 font-medium">+{ac.vendas_geradas} vendas</span>}
                        {ac.impacto && <Badge variant={ac.impacto === 'alto' ? 'green' : ac.impacto === 'medio' ? 'yellow' : 'gray'}>{ac.impacto}</Badge>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Cidades */}
          {topCidades.length > 0 && (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-green-600" />
                <span className="text-sm font-semibold text-green-800">Top Cidades</span>
              </div>
              <div className="space-y-2">
                {topCidades.map((c, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">{i + 1}</span>
                      <span className="text-sm text-gray-900">{c.cidade || c.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.qtd != null && <span className="text-xs text-gray-500">{c.qtd} ingressos</span>}
                      {c.crescimento && <span className="text-xs text-green-600 font-medium">{c.crescimento}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={16} className="text-yellow-600" />
              <span className="text-sm font-semibold text-yellow-800">Insights</span>
            </div>
            <ul className="space-y-1.5">
              {insights.map((ins, i) => (
                <li key={i} className="text-sm text-gray-800 flex items-start gap-2">
                  <span className="text-yellow-500 mt-0.5">•</span>
                  <span>{typeof ins === 'string' ? ins : ins.texto || ins.descricao || JSON.stringify(ins)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recomendações */}
        {recomendacoes.length > 0 && (
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-3">
              <Target size={16} className="text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">Recomendações para Próxima Semana</span>
            </div>
            <div className="space-y-3">
              {recomendacoes.map((rec, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-orange-100">
                  <p className="text-sm font-medium text-gray-900">{rec.acao || rec.titulo || rec.descricao}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {rec.plataforma && <Badge variant="purple">{rec.plataforma}</Badge>}
                    {rec.quando && <Badge variant="blue">{rec.quando}</Badge>}
                  </div>
                  {rec.motivo && <p className="text-xs text-gray-500 mt-1">{rec.motivo}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Briefing completo da semana */}
        {a.briefing_semana && (
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={16} className="text-gray-600" />
              <span className="text-sm font-semibold text-gray-800">Briefing Completo para a Equipe</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-line">{a.briefing_semana}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
