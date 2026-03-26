import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sparkles, BarChart3, ChevronDown } from 'lucide-react'
import api from '../api/client'
import { useAuth } from '../hooks/useAuth'
import { useTema } from '../contexts/ThemeContext'
import MarketingTab from '../components/eventos/MarketingTab'
import LoadingSpinner from '../components/ui/LoadingSpinner'

export default function IAPage() {
  const { usuario } = useAuth()
  const { tema } = useTema()
  const isDark = tema === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [eventoId, setEventoId] = useState(null)

  const subtab = searchParams.get('subtab') || 'campanhas'

  useEffect(() => {
    api.get('/eventos').then(r => {
      const evs = Array.isArray(r.data) ? r.data : []
      setEventos(evs)
      // Selecionar evento da URL ou o primeiro
      const urlEvento = searchParams.get('evento')
      if (urlEvento && evs.find(e => e.id === Number(urlEvento))) {
        setEventoId(Number(urlEvento))
      } else if (evs.length > 0) {
        setEventoId(evs[0].id)
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

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

  if (loading) {
    return <div className="flex justify-center py-32"><LoadingSpinner size="lg" /></div>
  }

  if (eventos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Sparkles size={40} className="text-gray-200 dark:text-white/10" />
        <p className="text-gray-500 dark:text-white/40 font-semibold">Nenhum evento cadastrado.</p>
      </div>
    )
  }

  const eventoAtual = eventos.find(e => e.id === eventoId)

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

        {/* Seletor de evento */}
        <div className="relative">
          <select
            value={eventoId || ''}
            onChange={e => selectEvento(Number(e.target.value))}
            className="appearance-none pl-4 pr-10 py-2.5 rounded-xl text-sm font-semibold bg-white dark:bg-white/[0.06] border border-gray-200 dark:border-white/[0.08] text-gray-800 dark:text-white/80 focus:outline-none focus:ring-2 focus:ring-accent/40 cursor-pointer min-w-[220px]"
          >
            {eventos.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nome}</option>
            ))}
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

      {/* Conteúdo: MarketingTab filtrado para campanhas/analise */}
      {eventoId && (
        <MarketingTab eventoId={eventoId} key={eventoId} />
      )}
    </div>
  )
}
