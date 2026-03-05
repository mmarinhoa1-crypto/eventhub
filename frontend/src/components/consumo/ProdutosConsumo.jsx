import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, X, Check, Package } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const CATEGORIAS = ['Cerveja', 'Destilados', 'Energetico', 'Agua', 'Refrigerante', 'Vinho', 'Drinks', 'Outros']
const UNIDADES = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'litro', label: 'Litro' },
  { value: 'caixa', label: 'Caixa' },
  { value: 'fardo', label: 'Fardo' },
  { value: 'garrafa', label: 'Garrafa' },
]

const catColors = {
  'Cerveja': 'bg-amber-100 text-amber-700',
  'Destilados': 'bg-violet-100 text-violet-700',
  'Energetico': 'bg-green-100 text-green-700',
  'Agua': 'bg-blue-100 text-blue-700',
  'Refrigerante': 'bg-red-100 text-red-700',
  'Vinho': 'bg-rose-100 text-rose-700',
  'Drinks': 'bg-indigo-100 text-indigo-700',
  'Outros': 'bg-gray-100 text-gray-700',
}

const emptyForm = { nome: '', categoria: 'Cerveja', unidade: 'unidade', volume_ml: '' }

export default function ProdutosConsumo() {
  const [produtos, setProdutos] = useState([])
  const [loading, setLoading] = useState(true)
  const [criando, setCriando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({ ...emptyForm })

  useEffect(() => {
    loadProdutos()
  }, [])

  async function loadProdutos() {
    try {
      const { data } = await api.get('/consumo/produtos')
      setProdutos(data)
    } catch {
      toast.error('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  async function salvar() {
    if (!form.nome.trim()) return toast.error('Nome obrigatório')
    try {
      if (editandoId) {
        const { data } = await api.patch(`/consumo/produtos/${editandoId}`, form)
        setProdutos(prev => prev.map(p => p.id === editandoId ? data : p))
        toast.success('Produto atualizado')
      } else {
        const { data } = await api.post('/consumo/produtos', form)
        setProdutos(prev => [...prev, data])
        toast.success('Produto criado')
      }
      cancelar()
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao salvar')
    }
  }

  async function excluir(id) {
    if (!confirm('Excluir este produto?')) return
    try {
      await api.delete(`/consumo/produtos/${id}`)
      setProdutos(prev => prev.filter(p => p.id !== id))
      toast.success('Produto excluído')
    } catch {
      toast.error('Erro ao excluir. Pode haver registros de consumo vinculados.')
    }
  }

  function editar(p) {
    setEditandoId(p.id)
    setCriando(true)
    setForm({ nome: p.nome, categoria: p.categoria, unidade: p.unidade, volume_ml: p.volume_ml || '' })
  }

  function cancelar() {
    setCriando(false)
    setEditandoId(null)
    setForm({ ...emptyForm })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{produtos.length} produto(s) cadastrado(s)</p>
        {!criando && (
          <button onClick={() => setCriando(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition">
            <Plus size={16} /> Novo Produto
          </button>
        )}
      </div>

      {/* Form */}
      {criando && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">{editandoId ? 'Editar Produto' : 'Novo Produto'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              placeholder="Nome do produto"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={form.categoria}
              onChange={e => setForm({ ...form, categoria: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={form.unidade}
              onChange={e => setForm({ ...form, unidade: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {UNIDADES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
            </select>
            <input
              type="number"
              placeholder="Volume (ml)"
              value={form.volume_ml}
              onChange={e => setForm({ ...form, volume_ml: e.target.value })}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={salvar} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition">
              <Check size={14} /> Salvar
            </button>
            <button onClick={cancelar} className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition">
              <X size={14} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {produtos.length === 0 ? (
        <div className="text-center py-16">
          <Package size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">Nenhum produto cadastrado</p>
          <p className="text-xs text-gray-400 mt-1">Cadastre os produtos/bebidas dos seus eventos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Categoria</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Unidade</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Volume (ml)</th>
                <th className="text-right px-4 py-3 text-gray-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.nome}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${catColors[p.categoria] || catColors['Outros']}`}>
                      {p.categoria}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">{p.unidade}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{p.volume_ml || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => editar(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => excluir(p.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
