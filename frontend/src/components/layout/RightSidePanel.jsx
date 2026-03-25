import { useState, useEffect, useRef } from 'react'
import { Bell, Sun, Moon, LogOut, Camera, AlertCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTema } from '../../contexts/ThemeContext'
import api from '../../api/client'
import toast from 'react-hot-toast'
import NotificationPanel from './NotificationPanel'

const funcaoLabels = {
  admin: 'Administrador',
  diretor: 'Diretor',
  designer: 'Designer',
  social_media: 'Social Media',
  gestor_trafego: 'Gestor de Tráfego',
  agent: 'Agente',
  viewer: 'Visualizador',
}

export default function RightSidePanel() {
  const { usuario, sair } = useAuth()
  const { tema, alternarTema } = useTema()
  const navigate = useNavigate()
  const isDark = tema === 'dark'
  const funcao = usuario?.funcao || 'viewer'

  const [fotoUrl, setFotoUrl] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [stats, setStats] = useState({ pendentes: 0, atrasadas: 0 })
  const fileRef = useRef(null)

  // Carregar foto e stats
  useEffect(() => {
    api.get('/equipe/me').then(r => {
      if (r.data.foto_url) setFotoUrl(r.data.foto_url)
    }).catch(() => {})

    api.get('/minhas-demandas').then(r => {
      const hoje = new Date().toISOString().split('T')[0]
      const all = [...(r.data.briefings || []), ...(r.data.posts || [])]
      const pendentes = all.filter(d => d.status === 'pendente' || d.status === 'em_andamento').length
      const atrasadas = all.filter(d => {
        const data = d.data_vencimento || d.data_publicacao
        return data && data.slice(0, 10) < hoje && !['concluido', 'aprovado', 'publicado', 'cancelado'].includes(d.status)
      }).length
      setStats({ pendentes, atrasadas })
    }).catch(() => {})
  }, [])

  async function handleFotoUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Apenas PNG e JPEG são aceitos')
      return
    }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('foto', file)
      const { data } = await api.post('/equipe/foto', fd, { timeout: 30000 })
      setFotoUrl(data.foto_url)
      toast.success('Foto atualizada!')
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar foto')
    } finally { setUploading(false); e.target.value = '' }
  }

  function handleSair() {
    sair()
    navigate('/entrar')
  }

  const inicial = usuario?.nome?.[0]?.toUpperCase() || 'U'

  return (
    <aside className="hidden xl:flex fixed right-5 top-24 bottom-6 w-[220px] z-40 flex-col">
      <div
        className="flex-1 rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: isDark
            ? 'rgba(20, 20, 30, 0.55)'
            : 'rgba(255, 255, 255, 0.60)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: isDark
            ? '1px solid rgba(255, 255, 255, 0.08)'
            : '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        {/* Perfil */}
        <div className="px-5 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="relative group mb-3">
            <div
              className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
              style={{
                background: fotoUrl ? 'transparent' : 'linear-gradient(135deg, #f80d52, #ff6b9d)',
                border: isDark ? '2px solid rgba(255,255,255,0.12)' : '2px solid rgba(0,0,0,0.06)',
              }}
            >
              {fotoUrl ? (
                <img src={'/api' + fotoUrl} alt="Perfil" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-white">{inicial}</span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera size={16} className="text-white" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={handleFotoUpload}
            />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              </div>
            )}
          </div>
          <p className="text-sm font-bold text-gray-900 dark:text-white/90 truncate w-full">
            {usuario?.nome?.split(' ')[0] || 'Usuário'}
          </p>
          <p className="text-[10px] font-medium text-gray-400 dark:text-white/40 mt-0.5">
            {funcaoLabels[funcao] || funcao}
          </p>
        </div>

        <div className="mx-4 h-px bg-gray-200/60 dark:bg-white/[0.06]" />

        {/* Demandas */}
        <div className="px-4 py-4 space-y-2.5">
          <p className="text-[9px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-widest mb-1">Demandas</p>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-amber-500/8 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/15">
            <Clock size={13} className="text-amber-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-white/50 font-medium">Pendentes</p>
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats.pendentes}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-500/8 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/15">
            <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-gray-500 dark:text-white/50 font-medium">Atrasadas</p>
              <p className="text-sm font-bold text-red-600 dark:text-red-400">{stats.atrasadas}</p>
            </div>
          </div>
        </div>

        <div className="mx-4 h-px bg-gray-200/60 dark:bg-white/[0.06]" />

        {/* Ações */}
        <div className="px-4 py-4 space-y-1.5">
          {/* Notificações */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition">
            <span className="text-xs font-medium text-gray-600 dark:text-white/60">Notificações</span>
            <NotificationPanel />
          </div>

          {/* Theme toggle */}
          <button
            onClick={alternarTema}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition"
          >
            <span className="text-xs font-medium text-gray-600 dark:text-white/60">
              {isDark ? 'Modo claro' : 'Modo escuro'}
            </span>
            <div className="p-1 rounded-lg text-gray-400 dark:text-white/50">
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </div>
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sair */}
        <div className="px-4 pb-5 pt-2">
          <button
            onClick={handleSair}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-500 hover:bg-red-50/80 dark:hover:bg-red-500/10 transition"
          >
            <LogOut size={13} />
            Sair
          </button>
        </div>
      </div>
    </aside>
  )
}
