import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, ChevronDown, ChevronRight, ClipboardList, MapPin } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const TIPOS_SETOR = [
  { value: 'open', label: 'Open Bar', color: 'bg-green-100 text-green-700' },
  { value: 'vendido', label: 'Bar Vendido', color: 'bg-orange-100 text-orange-700' },
]

export default function RegistrosConsumo() {
  const [eventos, setEventos] = useState([])
  const [produtos, setProdutos] = useState([])
  const [eventoId, setEventoId] = useState('')
  const [setores, setSetores] = useState([])
  const [novoSetor, setNovoSetor] = useState({ nome: '', tipo: 'open', publico_real: '' })
  const [criandoSetor, setCriandoSetor] = useState(false)
  // itensSetor = { [id_setor]: { [id_produto]: quantidade } }
  const [itensSetor, setItensSetor] = useState({})
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [catAberta, setCatAberta] = useState({})
  const [setorAberto, setSetorAberto] = useState({})
  const [registros, setRegistros] = useState([])

  useEffect(() => {
    async function load() {
      try {
        const [evRes, prRes, regRes] = await Promise.all([
          api.get('/eventos'),
          api.get('/consumo/produtos'),
          api.get('/consumo/registros'),
        ])
        setEventos(evRes.data)
        setProdutos(prRes.data)
        setRegistros(regRes.data)
        const cats = {}
        prRes.data.forEach(p => { cats[p.categoria] = true })
        setCatAberta(cats)
      } catch {
        toast.error('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Carregar setores e registros quando selecionar evento
  useEffect(() => {
    if (!eventoId) { setSetores([]); setItensSetor({}); return }
    async function loadEvento() {
      try {
        const [setRes, regRes] = await Promise.all([
          api.get(`/consumo/setores/evento/${eventoId}`),
          api.get(`/consumo/registros/evento/${eventoId}`),
        ])
        setSetores(setRes.data)
        // Abrir todos os setores
        const abertos = {}
        setRes.data.forEach(s => { abertos[s.id] = true })
        setSetorAberto(abertos)
        // Mapear registros existentes por setor
        const map = {}
        regRes.data.forEach(r => {
          const sid = r.id_setor || 'sem_setor'
          if (!map[sid]) map[sid] = {}
          map[sid][r.id_produto] = parseFloat(r.quantidade_consumida) || ''
        })
        setItensSetor(map)
      } catch {
        setSetores([])
        setItensSetor({})
      }
    }
    loadEvento()
  }, [eventoId])

  async function adicionarSetor() {
    if (!novoSetor.nome.trim()) return toast.error('Nome do setor obrigatório')
    if (!novoSetor.publico_real || parseInt(novoSetor.publico_real) <= 0) return toast.error('Público do setor obrigatório')
    try {
      const { data } = await api.post('/consumo/setores', {
        id_evento: parseInt(eventoId),
        nome: novoSetor.nome,
        tipo: novoSetor.tipo,
        publico_real: parseInt(novoSetor.publico_real),
      })
      setSetores(prev => [...prev, data])
      setSetorAberto(prev => ({ ...prev, [data.id]: true }))
      setNovoSetor({ nome: '', tipo: 'open', publico_real: '' })
      setCriandoSetor(false)
      toast.success('Setor adicionado')
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao criar setor')
    }
  }

  async function removerSetor(id) {
    if (!confirm('Excluir setor e seus registros de consumo?')) return
    try {
      await api.delete(`/consumo/setores/${id}`)
      setSetores(prev => prev.filter(s => s.id !== id))
      setItensSetor(prev => { const n = { ...prev }; delete n[id]; return n })
      toast.success('Setor removido')
    } catch {
      toast.error('Erro ao remover setor')
    }
  }

  function setQtd(setorId, produtoId, valor) {
    setItensSetor(prev => ({
      ...prev,
      [setorId]: { ...(prev[setorId] || {}), [produtoId]: valor }
    }))
  }

  async function salvar() {
    if (!eventoId) return toast.error('Selecione um evento')
    if (setores.length === 0) return toast.error('Adicione pelo menos um setor')

    const setoresPayload = setores.map(s => ({
      id_setor: s.id,
      itens: Object.entries(itensSetor[s.id] || {})
        .filter(([, qtd]) => qtd && parseFloat(qtd) > 0)
        .map(([id_produto, quantidade_consumida]) => ({
          id_produto: parseInt(id_produto),
          quantidade_consumida: parseFloat(quantidade_consumida),
        }))
    })).filter(s => s.itens.length > 0)

    if (setoresPayload.length === 0) return toast.error('Preencha pelo menos um produto em algum setor')

    setSalvando(true)
    try {
      await api.post('/consumo/registros/lote', {
        id_evento: parseInt(eventoId),
        setores: setoresPayload,
      })
      toast.success('Consumo registrado com sucesso!')
      const { data } = await api.get('/consumo/registros')
      setRegistros(data)
    } catch (e) {
      toast.error(e.response?.data?.erro || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  // Agrupar produtos por categoria
  const porCategoria = {}
  produtos.forEach(p => {
    if (!porCategoria[p.categoria]) porCategoria[p.categoria] = []
    porCategoria[p.categoria].push(p)
  })

  // Agrupar registros por evento > setor
  const resumoPorEvento = {}
  registros.forEach(r => {
    const key = r.id_evento
    if (!resumoPorEvento[key]) {
      resumoPorEvento[key] = { evento_nome: r.evento_nome, data_evento: r.data_evento, setores: {} }
    }
    const setorKey = r.setor_nome || 'Sem setor'
    const setorTipo = r.setor_tipo || ''
    if (!resumoPorEvento[key].setores[setorKey]) {
      resumoPorEvento[key].setores[setorKey] = { tipo: setorTipo, itens: [] }
    }
    resumoPorEvento[key].setores[setorKey].itens.push(r)
  })

  const publicoTotal = setores.reduce((s, st) => s + (st.publico_real || 0), 0)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    )
  }

  if (produtos.length === 0) {
    return (
      <div className="text-center py-20">
        <ClipboardList size={48} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Cadastre produtos primeiro</h3>
        <p className="text-sm text-gray-400">Vá na aba "Produtos" para cadastrar as bebidas antes de registrar consumo.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Seleção de evento */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Registrar Consumo de Evento</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Evento</label>
            <select
              value={eventoId}
              onChange={e => { setEventoId(e.target.value); setItensSetor({}); setSetores([]) }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Selecione um evento...</option>
              {eventos.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.nome} {ev.data_evento ? `(${ev.data_evento})` : ''}</option>
              ))}
            </select>
          </div>
          {eventoId && (
            <div className="flex items-end gap-2">
              <div className="bg-gray-50 rounded-lg px-4 py-2 text-sm">
                <span className="text-gray-500">Público total:</span>
                <span className="font-bold text-gray-800 ml-2">{publicoTotal.toLocaleString('pt-BR')} pessoas</span>
                <span className="text-gray-400 ml-2">({setores.length} setor{setores.length !== 1 ? 'es' : ''})</span>
              </div>
            </div>
          )}
        </div>

        {/* Setores do evento */}
        {eventoId && (
          <div className="space-y-4">
            {/* Lista de setores existentes */}
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <MapPin size={14} /> Setores do Evento
              </h4>
              {!criandoSetor && (
                <button
                  onClick={() => setCriandoSetor(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition"
                >
                  <Plus size={14} /> Novo Setor
                </button>
              )}
            </div>

            {/* Form novo setor */}
            {criandoSetor && (
              <div className="bg-gray-50 rounded-lg p-3 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome do Setor</label>
                  <input
                    placeholder="Ex: Pista, Camarote, Área VIP"
                    value={novoSetor.nome}
                    onChange={e => setNovoSetor({ ...novoSetor, nome: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Tipo</label>
                  <select
                    value={novoSetor.tipo}
                    onChange={e => setNovoSetor({ ...novoSetor, tipo: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TIPOS_SETOR.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Público</label>
                  <input
                    type="number"
                    placeholder="Ex: 1000"
                    value={novoSetor.publico_real}
                    onChange={e => setNovoSetor({ ...novoSetor, publico_real: e.target.value })}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
                  />
                </div>
                <button onClick={adicionarSetor} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition">
                  Adicionar
                </button>
                <button onClick={() => setCriandoSetor(false)} className="px-3 py-1.5 bg-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-300 transition">
                  Cancelar
                </button>
              </div>
            )}

            {/* Cards dos setores com inputs de consumo */}
            {setores.map(setor => {
              const tipoInfo = TIPOS_SETOR.find(t => t.value === setor.tipo) || TIPOS_SETOR[0]
              const isAberto = setorAberto[setor.id]
              return (
                <div key={setor.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* Header do setor */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                    <button
                      onClick={() => setSetorAberto(prev => ({ ...prev, [setor.id]: !prev[setor.id] }))}
                      className="flex items-center gap-3 flex-1"
                    >
                      {isAberto ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
                      <span className="text-sm font-semibold text-gray-800">{setor.nome}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipoInfo.color}`}>{tipoInfo.label}</span>
                      <span className="text-xs text-gray-500">{setor.publico_real.toLocaleString('pt-BR')} pessoas</span>
                    </button>
                    <button onClick={() => removerSetor(setor.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Produtos por categoria dentro do setor */}
                  {isAberto && (
                    <div className="p-4 space-y-3">
                      {Object.entries(porCategoria).map(([cat, prods]) => (
                        <div key={cat}>
                          <button
                            onClick={() => setCatAberta(prev => ({ ...prev, [`${setor.id}_${cat}`]: !prev[`${setor.id}_${cat}`] }))}
                            className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2 hover:text-gray-700"
                          >
                            {catAberta[`${setor.id}_${cat}`] !== false ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            {cat} ({prods.length})
                          </button>
                          {catAberta[`${setor.id}_${cat}`] !== false && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-4">
                              {prods.map(p => (
                                <div key={p.id} className="flex items-center gap-2">
                                  <span className="text-sm text-gray-700 truncate flex-1">{p.nome}</span>
                                  <input
                                    type="number"
                                    placeholder="0"
                                    value={itensSetor[setor.id]?.[p.id] || ''}
                                    onChange={e => setQtd(setor.id, p.id, e.target.value)}
                                    className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                  <span className="text-xs text-gray-400 w-14">{p.unidade}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {/* Botão salvar */}
            {setores.length > 0 && (
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition disabled:opacity-50"
              >
                <Save size={16} /> {salvando ? 'Salvando...' : 'Salvar Consumo de Todos os Setores'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Registros existentes */}
      {Object.keys(resumoPorEvento).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Registros Existentes</h3>
          <div className="space-y-4">
            {Object.entries(resumoPorEvento).map(([evId, ev]) => (
              <div key={evId} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{ev.evento_nome}</span>
                    {ev.data_evento && <span className="text-xs text-gray-400 ml-2">{ev.data_evento}</span>}
                  </div>
                </div>
                {Object.entries(ev.setores).map(([setorNome, setorData]) => {
                  const tipoInfo = TIPOS_SETOR.find(t => t.value === setorData.tipo)
                  return (
                    <div key={setorNome} className="mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-600">{setorNome}</span>
                        {tipoInfo && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tipoInfo.color}`}>{tipoInfo.label}</span>}
                        <span className="text-[10px] text-gray-400">{setorData.itens[0]?.publico_real} pessoas</span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                        {setorData.itens.map(item => (
                          <div key={item.id} className="text-xs bg-gray-50 rounded px-2 py-1">
                            <span className="text-gray-500">{item.produto_nome}:</span>
                            <span className="font-semibold text-gray-800 ml-1">{parseFloat(item.quantidade_consumida).toLocaleString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
