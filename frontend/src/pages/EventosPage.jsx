import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, X, CalendarDays } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
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

export default function EventosPage() {
  const [eventos, setEventos]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [busca, setBusca]         = useState('')
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

  const eventosFiltrados = useMemo(() => {
    if (!busca.trim()) return eventos
    const q = busca.toLowerCase()
    return eventos.filter(ev =>
      ev.nome?.toLowerCase().includes(q) ||
      ev.atracoes?.toLowerCase().includes(q) ||
      ev.cidade?.toLowerCase().includes(q)
    )
  }, [eventos, busca])

  // Agrupamento por mês, ordenado cronologicamente
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
      return a.localeCompare(b)
    })

    return entries
  }, [eventosFiltrados])

  if (loading) {
    return <div className="flex justify-center py-32"><LoadingSpinner size="lg" /></div>
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">EVENTOS</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Total de eventos cadastrados:{' '}
            <span className="font-bold text-gray-600">{eventos.length}</span>
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Novo Evento
        </Button>
      </div>

      {/* ── Busca ───────────────────────────────── */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por evento ou artista..."
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Resultado vazio ─────────────────────── */}
      {grupos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <CalendarDays size={40} className="text-gray-200" />
          <p className="text-gray-500 font-semibold">
            {busca ? 'Nenhum evento encontrado para esta busca.' : 'Nenhum evento cadastrado ainda.'}
          </p>
          {!busca && (
            <Button size="sm" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Criar primeiro evento
            </Button>
          )}
        </div>
      )}

      {/* ── Seções por mês ──────────────────────── */}
      {grupos.map(([key, evs]) => (
        <section key={key}>
          {/* Label do mês */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-blue-500" />
              <h2 className="text-base font-extrabold text-gray-800">
                {key === '__sem_data__' ? 'Sem data definida' : getMonthLabel(key)}
              </h2>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
              {evs.length} evento{evs.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Scroll horizontal dos cards */}
          <div
            className="flex gap-4 overflow-x-auto pb-4"
            style={{ scrollbarWidth: 'thin' }}
          >
            {evs.map(ev => (
              <EventoCard
                key={ev.id}
                evento={ev}
                onClick={() => navigate(`/eventos/${ev.id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      ))}

      <NovoEventoModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={carregarEventos}
      />
    </div>
  )
}
