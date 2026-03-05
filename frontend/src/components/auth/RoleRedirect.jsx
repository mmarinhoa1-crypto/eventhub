import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const homeByRole = {
  admin: '/',
  agent: '/',
  designer: '/marketing',
  social_media: '/marketing',
  diretor: '/marketing',
  viewer: '/marketing',
}

export default function RoleRedirect() {
  const { usuario } = useAuth()
  const funcao = usuario?.funcao || 'viewer'
  const home = homeByRole[funcao] || '/marketing'
  
  if (home === '/') return null // admin/agent vê Dashboard normal
  return <Navigate to={home} replace />
}
