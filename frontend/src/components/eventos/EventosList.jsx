import EventoCard from './EventoCard'
import EmptyState from '../ui/EmptyState'
import { Calendar } from 'lucide-react'

export default function EventosList({ eventos, onSelect }) {
  if (eventos.length === 0) {
    return <EmptyState icon={Calendar} title="Nenhum evento" description="Crie seu primeiro evento" />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {eventos.map((e) => (
        <EventoCard key={e.id} evento={e} onClick={onSelect} />
      ))}
    </div>
  )
}
