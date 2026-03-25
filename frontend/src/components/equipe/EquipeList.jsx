import { useState, useRef } from 'react'
import { Trash2, Pencil, Check, X, Camera } from 'lucide-react'
import Badge from '../ui/Badge'
import api from '../../api/client'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'

const funcaoColors = {
  admin: 'red',
  agent: 'blue',
  designer: 'purple',
  viewer: 'gray',
  social_media: 'pink',
  diretor: 'yellow',
}

const funcaoLabels = {
  admin: 'Admin',
  agent: 'Agente',
  designer: 'Designer',
  viewer: 'Visualizador',
  social_media: 'Social Media',
  diretor: 'Diretor',
  gestor_trafego: 'Gestor de Tráfego',
}

export default function EquipeList({ membros, onUpdate }) {
  const { usuario } = useAuth()
  const [editando, setEditando] = useState(null) // { id, nome, email }
  const [uploadingId, setUploadingId] = useState(null)

  async function alterarFuncao(id, funcao) {
    try {
      await api.patch(`/equipe/${id}`, { funcao })
      onUpdate()
      toast.success('Função atualizada')
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar')
    }
  }

  async function remover(id) {
    if (!confirm('Tem certeza que deseja remover este membro?')) return
    try {
      await api.delete(`/equipe/${id}`)
      onUpdate()
      toast.success('Membro removido')
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao remover')
    }
  }

  function iniciarEdicao(m) {
    setEditando({ id: m.id, nome: m.nome, email: m.email })
  }

  function cancelarEdicao() {
    setEditando(null)
  }

  async function salvarEdicao() {
    if (!editando.nome.trim() || !editando.email.trim()) {
      toast.error('Nome e email são obrigatórios')
      return
    }
    try {
      await api.patch(`/equipe/${editando.id}`, { nome: editando.nome, email: editando.email })
      onUpdate()
      setEditando(null)
      toast.success('Dados atualizados')
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao atualizar')
    }
  }

  async function handleFotoUpload(membroId, e) {
    const file = e.target.files[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast.error('Apenas PNG e JPEG são aceitos')
      return
    }
    setUploadingId(membroId)
    try {
      const fd = new FormData()
      fd.append('foto', file)
      await api.post(`/equipe/${membroId}/foto`, fd, { timeout: 30000 })
      toast.success('Foto atualizada!')
      onUpdate()
    } catch (err) {
      toast.error(err.response?.data?.erro || 'Erro ao enviar foto')
    } finally { setUploadingId(null); e.target.value = '' }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Foto</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Função</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Ações</th>
          </tr>
        </thead>
        <tbody>
          {membros.map((m) => {
            const emEdicao = editando?.id === m.id
            const inicial = m.nome?.[0]?.toUpperCase() || '?'
            return (
              <tr key={m.id} className="border-b border-gray-100">
                <td className="px-4 py-3">
                  <div className="relative group w-10 h-10">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ background: m.foto_url ? 'transparent' : 'linear-gradient(135deg, #f80d52, #ff6b9d)' }}
                    >
                      {m.foto_url ? (
                        <img src={'/api' + m.foto_url} alt={m.nome} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-white">{inicial}</span>
                      )}
                    </div>
                    <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                      {uploadingId === m.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      ) : (
                        <Camera size={14} className="text-white" />
                      )}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        className="hidden"
                        onChange={e => handleFotoUpload(m.id, e)}
                        disabled={uploadingId === m.id}
                      />
                    </label>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {emEdicao ? (
                    <input
                      className="border border-indigo-400 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={editando.nome}
                      onChange={(e) => setEditando((prev) => ({ ...prev, nome: e.target.value }))}
                    />
                  ) : (
                    m.nome
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {emEdicao ? (
                    <input
                      className="border border-indigo-400 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      value={editando.email}
                      onChange={(e) => setEditando((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  ) : (
                    m.email
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={m.funcao}
                    onChange={(e) => alterarFuncao(m.id, e.target.value)}
                    disabled={emEdicao || m.id === usuario?.id || (usuario?.funcao === 'diretor' && m.funcao === 'admin')}
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {usuario?.funcao === 'admin' && <option value="admin">Admin</option>}
                    <option value="agent">Agente</option>
                    <option value="designer">Designer</option>
                    <option value="social_media">Social Media</option>
                    <option value="diretor">Diretor</option>
                    <option value="gestor_trafego">Gestor de Tráfego</option>
                    <option value="viewer">Visualizador</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {emEdicao ? (
                      <>
                        <button onClick={salvarEdicao} className="text-green-600 hover:text-green-800 transition-colors" title="Salvar">
                          <Check size={16} />
                        </button>
                        <button onClick={cancelarEdicao} className="text-gray-400 hover:text-gray-600 transition-colors" title="Cancelar">
                          <X size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        {usuario?.funcao === 'admin' && (
                          <button onClick={() => iniciarEdicao(m)} className="text-indigo-500 hover:text-indigo-700 transition-colors" title="Editar nome/email">
                            <Pencil size={16} />
                          </button>
                        )}
                        {m.id !== usuario?.id && !(usuario?.funcao === 'diretor' && m.funcao === 'admin') && (
                          <button onClick={() => remover(m.id)} className="text-red-500 hover:text-red-700 transition-colors" title="Remover">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
