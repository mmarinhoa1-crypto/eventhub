import { Trash2 } from 'lucide-react'
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
}

export default function EquipeList({ membros, onUpdate }) {
  const { usuario } = useAuth()

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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Nome</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Email</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Função</th>
            <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider text-xs">Ações</th>
          </tr>
        </thead>
        <tbody>
          {membros.map((m) => (
            <tr key={m.id} className="border-b border-gray-100">
              <td className="px-4 py-3 font-medium text-gray-900">{m.nome}</td>
              <td className="px-4 py-3 text-gray-600">{m.email}</td>
              <td className="px-4 py-3">
                <select
                  value={m.funcao}
                  onChange={(e) => alterarFuncao(m.id, e.target.value)}
                  disabled={m.id === usuario?.id || (usuario?.funcao === 'diretor' && m.funcao === 'admin')}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {usuario?.funcao === 'admin' && <option value="admin">Admin</option>}
                  <option value="agent">Agente</option>
                  <option value="designer">Designer</option>
                  <option value="social_media">Social Media</option>
                  <option value="diretor">Diretor</option>
                  <option value="viewer">Visualizador</option>
                </select>
              </td>
              <td className="px-4 py-3">
                {m.id !== usuario?.id && !(usuario?.funcao === 'diretor' && m.funcao === 'admin') && (
                  <button
                    onClick={() => remover(m.id)}
                    className="text-red-500 hover:text-red-700 transition-colors"
                    title="Remover"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
