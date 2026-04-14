import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const homeByRole = {
  admin: '/',
  agent: '/',
  designer: '/demandas',
  social_media: '/demandas',
  diretor: '/demandas',
  viewer: '/demandas',
  gestor_trafego: '/demandas',
  suporte: '/eventos',
}

export default function RoleRedirect() {
  const { usuario } = useAuth()
  const funcao = usuario?.funcao || 'viewer'
  const home = homeByRole[funcao] || '/demandas'
  
  if (home === '/') return null // admin/agent vê Dashboard normal
  return <Navigate to={home} replace />
}
