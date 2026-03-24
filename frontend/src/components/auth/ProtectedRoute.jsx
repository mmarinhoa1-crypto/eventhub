import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import LoadingSpinner from '../ui/LoadingSpinner'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { usuario, carregando } = useAuth()

  if (carregando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/entrar" replace />
  }

  if (adminOnly && usuario.funcao !== 'admin' && usuario.funcao !== 'diretor' && usuario.funcao !== 'gestor_trafego') {
    return <Navigate to="/" replace />
  }

  return children
}
