import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, CalendarDays } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import { useTema } from '../contexts/ThemeContext'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EventoCard from '../components/eventos/EventoCard'
import NovoEventoModal from '../components/eventos/NovoEventoModal'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

function parseData(str) {
  if (!str) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str + 'T12:00:00')
  if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) {
    const [d, m, y] = str.split('/')
    return new Date(`${y}-${m}-${d}T12:00:00`)
  }
  return null
}

function getMonthKey(str) {
  const d = parseData(str)
  if (!d || isNaN(d)) return null
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthLabel(key) {
  const [ano, mes] = key.split('-')
  return `${MESES[Number(mes) - 1]} ${ano}`
}

function diasDiferenca(dataStr) {
  const d = parseData(dataStr)
  if (!d) return null
  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)
  return Math.round((d - hoje) / (1000 * 60 * 60 * 24))
}

export default function EventosPage() {
  const { usuario } = useAuth()
  const { tema } = useTema()
  const isDark = tema === 'dark'
  const funcao = usuario?.funcao || 'viewer'
  const canManage = funcao === 'admin' || funcao === 'diretor'
  const isReadOnly = !canManage

  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [busca, setBusca] = useState('')
  const [aba, setAba] = useState('proximos')
  const [showIGModal, setShowIGModal] = useState(null) // eventoId
  const [igAccounts, setIgAccounts] = useState([])
  const navigate = useNavigate()

  function carregarEventos() {
    api.get('/eventos')
      .then(({ data }) => setEventos(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregarEventos() }, [])

  async function handleDelete(id) {
    try {
      await api.delete('/eventos/' + id)
      setEventos(prev => prev.filter(e => e.id !== id))
      toast.success('Evento excluído')
    } catch {
      toast.error('Erro ao excluir evento')
    }
  }

  function handleConnectIG(eventoId) {
    api.get('/instagram/accounts').then(r => setIgAccounts(r.data || [])).catch(() => setIgAccounts([]))
    setShowIGModal(eventoId)
  }

  async function selecionarContaIG(accountId) {
    try {
      const { data } = await api.post('/eventos/' + showIGModal + '/instagram/connect', { account_id: accountId })
      toast.success('Instagram @' + data.username + ' conectado!')
      setShowIGModal(null)
      carregarEventos()
    } catch (err) { toast.error(err.response?.data?.erro || 'Erro ao conectar') }
  }

  function conectarNovoIG() {
    const eventoId = showIGModal
    api.get('/instagram/connect/' + eventoId).then(r => {
      localStorage.setItem('ig_connect_evento_id', eventoId)
      const popup = window.open(r.data.url, 'ig_connect', 'width=600,height=700')
      const timer = setInterval(() => {
        if (popup?.closed) { clearInterval(timer); setShowIGModal(null); carregarEventos() }
      }, 1000)
    }).catch(() => toast.error('Erro ao iniciar conexão'))
  }

  const hoje = new Date()
  hoje.setHours(12, 0, 0, 0)

  const showMeusEventos = funcao === 'designer' || funcao === 'social_media'

  const eventosFiltrados = useMemo(() => {
    let list = eventos
    if (busca.trim()) {
      const q = busca.toLowerCase()
      list = list.filter(ev =>
        ev.nome?.toLowerCase().includes(q) ||
        ev.atracoes?.toLowerCase().includes(q) ||
        ev.cidade?.toLowerCase().includes(q)
      )
    }
    // Separar por aba
    if (aba === 'meus') {
      list = list.filter(ev => ev.designer_id === usuario?.id || ev.social_media_id === usuario?.id)
    } else {
      list = list.filter(ev => {
        const d = parseData(ev.data_evento)
        if (!d) return aba === 'proximos'
        return aba === 'proximos' ? d >= hoje : d < hoje
      })
    }
    // Ordenar
    list.sort((a, b) => {
      const da = parseData(a.data_evento)
      const db = parseData(b.data_evento)
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      if (aba === 'passados') return db - da
      return da - db
    })
    return list
  }, [eventos, busca, aba, usuario?.id])

  // Agrupar por mês
  const grupos = useMemo(() => {
    const map = {}
    eventosFiltrados.forEach(ev => {
      const key = getMonthKey(ev.data_evento) || '__sem_data__'
      if (!map[key]) map[key] = []
      map[key].push(ev)
    })
    const entries = Object.entries(map)
    entries.sort(([a], [b]) => {
      if (a === '__sem_data__') return 1
      if (b === '__sem_data__') return -1
      return aba === 'passados' ? b.localeCompare(a) : a.localeCompare(b)
    })
    return entries
  }, [eventosFiltrados, aba])

  const totalProximos = eventos.filter(ev => { const d = parseData(ev.data_evento); return d ? d >= hoje : true }).length
  const totalPassados = eventos.filter(ev => { const d = parseData(ev.data_evento); return d ? d < hoje : false }).length
  const totalMeus = showMeusEventos ? eventos.filter(ev => ev.designer_id === usuario?.id || ev.social_media_id === usuario?.id).length : 0

  if (loading) {
    return <div className="flex justify-center py-32"><LoadingSpinner size="lg" /></div>
  }

  const containerStyle = {
    background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight">Eventos</h1>
          <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">
            {eventos.length} evento{eventos.length !== 1 ? 's' : ''} cadastrado{eventos.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Novo Evento
          </Button>
        )}
      </div>

      {/* Container principal */}
      <div className="rounded-2xl overflow-hidden" style={containerStyle}>

        {/* Toolbar: abas + busca */}
        <div className="px-5 pt-5 pb-4 space-y-4">
          {/* Abas */}
          <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-white/[0.04] p-1 rounded-xl w-fit">
            <button
              onClick={() => setAba('proximos')}
              className={'px-4 py-2 rounded-lg text-sm font-semibold transition-all ' + (aba === 'proximos'
                ? 'bg-white dark:bg-white/[0.10] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60')}
            >
              Próximos Eventos
              <span className="ml-1.5 text-xs font-bold text-accent">{totalProximos}</span>
            </button>
            <button
              onClick={() => setAba('passados')}
              className={'px-4 py-2 rounded-lg text-sm font-semibold transition-all ' + (aba === 'passados'
                ? 'bg-white dark:bg-white/[0.10] text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60')}
            >
              Eventos Passados
              <span className="ml-1.5 text-xs font-bold text-gray-400">{totalPassados}</span>
            </button>
            {showMeusEventos && (
              <button
                onClick={() => setAba('meus')}
                className={'px-4 py-2 rounded-lg text-sm font-semibold transition-all ' + (aba === 'meus'
                  ? 'bg-white dark:bg-white/[0.10] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60')}
              >
                Meus Eventos
                <span className="ml-1.5 text-xs font-bold text-accent">{totalMeus}</span>
              </button>
            )}
          </div>

          {/* Busca */}
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 pointer-events-none" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Encontrar evento..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-700 dark:text-white/80 placeholder-gray-400 dark:placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-accent/40 transition"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white/60 transition">
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Conteúdo: eventos agrupados por mês */}
        <div className="px-5 pb-6 max-h-[calc(100vh-320px)] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <CalendarDays size={40} className="text-gray-200 dark:text-white/10" />
              <p className="text-gray-500 dark:text-white/40 font-semibold">
                {busca ? 'Nenhum evento encontrado.' : aba === 'proximos' ? 'Nenhum evento futuro.' : 'Nenhum evento passado.'}
              </p>
              {!busca && canManage && aba === 'proximos' && (
                <Button size="sm" onClick={() => setShowModal(true)}>
                  <Plus size={14} /> Criar evento
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {grupos.map(([key, evs]) => (
                <section key={key}>
                  {/* Label do mês */}
                  <div className="flex items-center gap-3 mb-3 sticky top-0 py-2 z-10" style={{ background: isDark ? 'rgba(19,19,22,0.85)' : 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}>
                    <div className="w-1 h-4 rounded-full bg-accent flex-shrink-0" />
                    <h2 className="text-sm font-extrabold text-gray-800 dark:text-white/80">
                      {key === '__sem_data__' ? 'Sem data' : getMonthLabel(key)}
                    </h2>
                    <span className="text-[11px] font-bold text-accent bg-accent/8 px-2 py-0.5 rounded-full">
                      {evs.length}
                    </span>
                    <div className="flex-1 h-px bg-gray-100 dark:bg-white/[0.06]" />
                  </div>

                  {/* Grid de cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {evs.map(ev => (
                      <EventoCard
                        key={ev.id}
                        evento={ev}
                        diasDiff={diasDiferenca(ev.data_evento)}
                        abaAtual={aba}
                        clickable={true}
                        onClick={() => navigate(`/eventos/${ev.id}`)}
                        onDelete={canManage ? handleDelete : undefined}
                        showResponsaveis={aba === 'meus' || (canManage && aba === 'proximos')}
                        canManage={canManage}
                        onConnectIG={canManage ? handleConnectIG : undefined}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      <NovoEventoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={carregarEventos}
      />

      {/* Modal conectar Instagram */}
      {showIGModal && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={() => setShowIGModal(null)}>
          <div className="bg-white dark:bg-[#1c1c24] rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.08] flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white/90 text-sm">Conectar Instagram</h3>
              <button onClick={() => setShowIGModal(null)} className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-white/[0.06] flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-white/60 text-xs font-bold">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {igAccounts.length > 0 && (
                <>
                  <p className="text-xs text-gray-500 dark:text-white/40 font-medium">Contas salvas na organização:</p>
                  <div className="space-y-2">
                    {igAccounts.map(acc => (
                      <button key={acc.id} onClick={() => selecionarContaIG(acc.ig_account_id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] hover:border-pink-300 dark:hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/5 transition text-left">
                        {acc.profile_picture && <img src={acc.profile_picture} className="w-8 h-8 rounded-full" />}
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white/90">@{acc.ig_username}</p>
                          <p className="text-[10px] text-gray-400 dark:text-white/30">Clique para conectar</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3"><div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.06]" /><span className="text-[10px] text-gray-400 dark:text-white/30">ou</span><div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.06]" /></div>
                </>
              )}
              <button onClick={conectarNovoIG}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white text-sm font-bold hover:opacity-90 transition shadow-sm">
                Login com Instagram
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
