import { useState, useEffect } from 'react'
import { UserPlus } from 'lucide-react'
import api from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import EquipeList from '../components/equipe/EquipeList'
import ConvidarModal from '../components/equipe/ConvidarModal'

export default function EquipePage() {
  const [membros, setMembros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  function carregarMembros() {
    api.get('/equipe')
      .then(({ data }) => setMembros(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    carregarMembros()
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
        <h2 className="text-2xl font-bold text-gray-900">Equipe</h2>
        <Button onClick={() => setShowModal(true)}>
          <UserPlus size={18} />
          Convidar
        </Button>
      </div>
      <Card>
        <EquipeList membros={membros} onUpdate={carregarMembros} />
      </Card>
      <ConvidarModal open={showModal} onClose={() => setShowModal(false)} onCreated={carregarMembros} />
    </div>
  )
}
