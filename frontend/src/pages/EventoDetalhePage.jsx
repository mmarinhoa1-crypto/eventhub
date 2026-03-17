import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import EventoDetalhe from '../components/eventos/EventoDetalhe'

export default function EventoDetalhePage() {
  const { id } = useParams()

  return (
    <div className="space-y-4">
      <Link to="/eventos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} />
        Voltar aos eventos
      </Link>
      <EventoDetalhe eventoId={id} />
    </div>
  )
}
