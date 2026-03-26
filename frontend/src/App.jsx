import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import DashboardLayout from './components/layout/DashboardLayout'
import LoginPage from './pages/LoginPage'
import RegistrarPage from './pages/RegistrarPage'
import DashboardPage from './pages/DashboardPage'
import HomePage from './pages/HomePage'
import ChamadosPage from './pages/ChamadosPage'
import ChamadoDetalhePage from './pages/ChamadoDetalhePage'
import EventosPage from './pages/EventosPage'
import EventoDetalhePage from './pages/EventoDetalhePage'
import EquipePage from './pages/EquipePage'
import NotFoundPage from './pages/NotFoundPage'
import FinanceiroPage from './pages/FinanceiroPage'
import MinhasDemandas from './pages/MinhasDemandas'
import PrevisaoPage from './pages/PrevisaoPage'
import VendasPage from './pages/VendasPage'
import ConsumoPage from './pages/ConsumoPage'
import AnunciosPage from './pages/AnunciosPage'
import IAPage from './pages/IAPage'
import TrafegoPage from './pages/TrafegoPage'
import InstagramCallbackPage from './pages/InstagramCallbackPage'

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<LoginPage />} />
      <Route path="/registrar" element={<RegistrarPage />} />
      <Route path="/instagram-callback" element={<InstagramCallbackPage />} />
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="chamados" element={<ChamadosPage />} />
        <Route path="chamados/:id" element={<ChamadoDetalhePage />} />
        <Route path="eventos" element={<EventosPage />} />
        <Route path="eventos/:id" element={<EventoDetalhePage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="demandas" element={<MinhasDemandas />} />
        <Route path="marketing" element={<Navigate to="/demandas" replace />} />
        <Route path="previsao" element={<PrevisaoPage />} />
        <Route path="vendas" element={<VendasPage />} />
        <Route path="consumo" element={<ConsumoPage />} />
        <Route path="anuncios" element={<AnunciosPage />} />
        <Route path="trafego" element={<TrafegoPage />} />
        <Route path="ia" element={<IAPage />} />
        <Route
          path="equipe"
          element={
            <ProtectedRoute adminOnly>
              <EquipePage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
