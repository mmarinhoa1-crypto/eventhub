import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import DashboardPage from './DashboardPage'

export default function HomePage() {
  const { usuario } = useAuth()
  const funcao = usuario?.funcao || 'viewer'
  
  if (funcao === 'admin' || funcao === 'agent') return <DashboardPage />
  return <Navigate to="/marketing" replace />
}
