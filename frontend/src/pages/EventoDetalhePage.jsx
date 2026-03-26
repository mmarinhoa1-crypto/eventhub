import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useTema } from '../contexts/ThemeContext'
import EventoDetalhe from '../components/eventos/EventoDetalhe'
import MateriaisEvento from '../components/eventos/MateriaisEvento'
import api from '../api/client'

export default function EventoDetalhePage() {
  const { id } = useParams()
  const { usuario } = useAuth()
  const { tema } = useTema()
  const isDark = tema === 'dark'
  const funcao = usuario?.funcao || 'viewer'
  const canDashboard = funcao === 'admin' || funcao === 'diretor'
  const [aba, setAba] = useState(canDashboard ? 'dashboard' : 'materiais')
  const [eventoNome, setEventoNome] = useState('')

  useEffect(() => {
    api.get(`/eventos/${id}`).then(r => setEventoNome(r.data.nome || '')).catch(() => {})
  }, [id])

  const tabStyle = (active) => 'px-4 py-2 rounded-lg text-sm font-semibold transition-all ' + (active
    ? 'bg-white dark:bg-white/[0.10] text-gray-900 dark:text-white shadow-sm'
    : 'text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60')

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to="/eventos" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/60 transition">
          <ArrowLeft size={16} />
          Voltar aos eventos
        </Link>
        {eventoNome && <p className="text-sm font-bold text-gray-400 dark:text-white/30">{eventoNome}</p>}
      </div>

      {/* Abas */}
      <div className="flex items-center gap-1 bg-gray-100/80 dark:bg-white/[0.04] p-1 rounded-xl w-fit">
        {canDashboard && (
          <button onClick={() => setAba('dashboard')} className={tabStyle(aba === 'dashboard')}>
            Dashboard do Evento
          </button>
        )}
        <button onClick={() => setAba('materiais')} className={tabStyle(aba === 'materiais')}>
          Materiais de Marketing
        </button>
      </div>

      {/* Conteúdo */}
      {aba === 'dashboard' && canDashboard && (
        <EventoDetalhe eventoId={id} />
      )}
      {aba === 'materiais' && (
        <MateriaisEvento eventoId={id} eventoNome={eventoNome} />
      )}
    </div>
  )
}
