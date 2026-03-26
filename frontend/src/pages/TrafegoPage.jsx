import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Rocket, ChevronDown, BarChart3 } from 'lucide-react'
import api from '../api/client'
import { useTema } from '../contexts/ThemeContext'
import MarketingTab from '../components/eventos/MarketingTab'
import LoadingSpinner from '../components/ui/LoadingSpinner'

function parseData(str) {
  if (!str) return null
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str + 'T12:00:00')
  return null
}

export default function TrafegoPage() {
  const { tema } = useTema()
  const isDark = tema === 'dark'
  const [searchParams, setSearchParams] = useSearchParams()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [eventoId, setEventoId] = useState(null)

  // Carregar apenas próximos eventos
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

  function selectEvento(id) {
    setEventoId(id)
    const params = new URLSearchParams(searchParams)
    params.set('evento', id)
    params.set('subtab', 'trafego')
    setSearchParams(params, { replace: true })
  }

  if (loading) return <div className="flex justify-center py-32"><LoadingSpinner size="lg" /></div>

  if (eventos.length === 0) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-20 gap-3 text-center">
        <Rocket size={40} className="text-gray-200 dark:text-white/10" />
        <p className="text-gray-500 dark:text-white/40 font-semibold">Nenhum evento futuro cadastrado.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white/90 tracking-tight flex items-center gap-2">
            <Rocket size={22} className="text-accent" /> Funil de Tráfego
          </h1>
          <p className="text-sm text-gray-400 dark:text-white/40 mt-0.5">Gestão de campanhas e funil de anúncios por evento</p>
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

      {/* MarketingTab com subtab trafego forçada */}
      {eventoId && (
        <MarketingTab eventoId={eventoId} key={eventoId} />
      )}
    </div>
  )
}
