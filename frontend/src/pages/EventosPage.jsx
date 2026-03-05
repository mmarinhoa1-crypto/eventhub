import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import api from '../api/client'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EventosList from '../components/eventos/EventosList'
import NovoEventoModal from '../components/eventos/NovoEventoModal'

export default function EventosPage() {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const navigate = useNavigate()

  function carregarEventos() {
    api.get('/eventos')
      .then(({ data }) => setEventos(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    carregarEventos()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900">Eventos</h2>
          <p className="text-sm text-gray-400 mt-0.5">{eventos.length} evento{eventos.length !== 1 ? 's' : ''} cadastrado{eventos.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={18} />
          Novo Evento
        </Button>
      </div>
      <EventosList eventos={eventos} onSelect={(e) => navigate(`/eventos/${e.id}`)} />
      <NovoEventoModal open={showModal} onClose={() => setShowModal(false)} onCreated={carregarEventos} />
    </div>
  )
}
