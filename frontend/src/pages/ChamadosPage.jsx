import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import Card from '../components/ui/Card'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import ChamadoFiltros from '../components/chamados/ChamadoFiltros'
import ChamadosList from '../components/chamados/ChamadosList'

export default function ChamadosPage() {
  const [chamados, setChamados] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtros, setFiltros] = useState({ busca: '', status: '', prioridade: '' })
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/chamados')
      .then(({ data }) => setChamados(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtrados = chamados.filter((c) => {
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase()
      if (
        !c.nome_cliente?.toLowerCase().includes(busca) &&
        !c.topico?.toLowerCase().includes(busca)
      )
        return false
    }
    if (filtros.status && c.status !== filtros.status) return false
    if (filtros.prioridade && c.prioridade !== filtros.prioridade) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Chamados</h2>
      <ChamadoFiltros filtros={filtros} onChange={setFiltros} />
      <Card>
        <ChamadosList
          chamados={filtrados}
          onSelect={(c) => navigate(`/chamados/${c.id}`)}
        />
      </Card>
    </div>
  )
}
