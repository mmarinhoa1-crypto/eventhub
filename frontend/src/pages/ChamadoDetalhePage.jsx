import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import ChamadoDetalhe from '../components/chamados/ChamadoDetalhe'

export default function ChamadoDetalhePage() {
  const { id } = useParams()

  return (
    <div className="space-y-4">
      <Link to="/chamados" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} />
        Voltar aos chamados
      </Link>
      <ChamadoDetalhe chamadoId={id} />
    </div>
  )
}
