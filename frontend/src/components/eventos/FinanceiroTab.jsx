import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, ChevronDown, Download, RefreshCw, Link2, Unlink, Search, Pencil, Check, RotateCcw } from 'lucide-react'
import api from '../../api/client'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import toast from 'react-hot-toast'

const catCores = {
  'Artistico': '#8b5cf6', 'Logistica/Camarim': '#f59e0b', 'Estrutura do Evento': '#0ea5e9',
  'Divulgacao e Midia': '#ec4899', 'Documentacao e Taxas': '#64748b', 'Operacional': '#14b8a6',
  'Bar': '#f97316', 'Open Bar': '#ef4444', 'Alimentacao': '#84cc16', 'Outros': '#6b7280'
}
const categorias = [
  'Artistico', 'Logistica/Camarim', 'Estrutura do Evento',
  'Divulgacao e Midia', 'Documentacao e Taxas', 'Operacional',
  'Bar', 'Open Bar', 'Alimentacao', 'Outros'
]
const fontePagamentoBase = ['PIX', 'Dinheiro', 'Cartao', 'Transferencia', 'Outro']

function fmt(v) { return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

export default function FinanceiroTab({ eventoId }) {
  const [despesas, setDespesas] = useState([])
  const [receitas, setReceitas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showRecForm, setShowRecForm] = useState(false)
  const [view, setView] = useState('despesas')
  const [catAberta, setCatAberta] = useState({})
  const [editId, setEditId] = useState(null)
  const [contas, setContas] = useState([])
  const [showContaForm, setShowContaForm] = useState(false)
  const [encontro, setEncontro] = useState(null)
  const [showEncontro, setShowEncontro] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [baladappVendas, setBaladappVendas] = useState(null)
  const [evento, setEvento] = useState(null)
  const [baladappIdInput, setBaladappIdInput] = useState('')
  const [baladappPreview, setBaladappPreview] = useState(null)
  const [buscandoBaladapp, setBuscandoBaladapp] = useState(false)
  const [vinculando, setVinculando] = useState(false)
  const [novaConta, setNovaConta] = useState({ nome: '', tipo: 'banco', titular: '', percentual: '' })
  const [editConta, setEditConta] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedId, setSelectedId] = useState(null)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickForm, setQuickForm] = useState({ descricao: '', centro_custo: 'Outros', quantidade: 1, valor_unitario: 0, fonte_pagamento: 'PIX', fornecedor: '' })
  const quickRef = useRef(null)
  const [form, setForm] = useState({
    descricao: '', quantidade: 1, valor_unitario: 0, valor: 0,
    centro_custo: 'Outros', fonte_pagamento: '', situacao: 'pendente', data: '', fornecedor: '', id_projecao: ''
  })
  const [recForm, setRecForm] = useState({
    descricao: '', centro_custo: 'Outro', valor: '', situacao: 'pendente', conta: '', data_pagamento: '', id_projecao: ''
  })
  const [projecoes, setProjecoes] = useState([])

  useEffect(() => { carregar() }, [eventoId])
  useEffect(() => {
    const init = {}
    categorias.forEach(c => init[c] = true)
    setCatAberta(init)
  }, [])
  useEffect(() => { if (showQuickAdd && quickRef.current) quickRef.current.focus() }, [showQuickAdd])

  async function carregar() {
    try {
      const [ev, d, r, c, p] = await Promise.all([
        api.get('/eventos/' + eventoId),
        api.get('/eventos/' + eventoId + '/despesas'),
        api.get('/eventos/' + eventoId + '/receitas'),
        api.get('/eventos/' + eventoId + '/contas'),
        api.get('/eventos/' + eventoId + '/projecoes').catch(() => ({ data: [] }))
      ])
      setEvento(ev.data)
      setDespesas(d.data)
      setReceitas(r.data)
      setContas(c.data)
      setProjecoes(p.data)
    } catch { toast.error('Erro ao carregar financeiro') }
    finally { setLoading(false) }
  }

  async function salvarEditConta() {
    if (!editConta) return
    try {
      await api.patch('/contas/' + editConta.id, editConta)
      await carregar()
      setEditConta(null)
      toast.success('Conta atualizada!')
    } catch { toast.error('Erro ao atualizar') }
  }

  async function exportarPagamentos() {
    try {
      const token = localStorage.getItem('token')
      const resp = await fetch('/api/eventos/' + eventoId + '/exportar-pagamentos', { headers: { 'Authorization': 'Bearer ' + token } })
      if (!resp.ok) throw new Error('Erro')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'pagamentos.xlsx'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Planilha exportada!')
    } catch { toast.error('Erro ao exportar') }
  }

  async function exportarEncontro() {
    try {
      const token = localStorage.getItem('token')
      const resp = await fetch('/api/eventos/' + eventoId + '/exportar-encontro', { headers: { 'Authorization': 'Bearer ' + token } })
      if (!resp.ok) throw new Error('Erro')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'encontro_de_contas.xlsx'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Encontro de contas exportado!')
    } catch { toast.error('Erro ao exportar') }
  }

  async function syncBaladapp() {
    setSyncing(true)
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/baladapp/sync')
      if (data.erro) { toast.error(data.erro); return }
      toast.success('Sincronizado! ' + data.total_pedidos + ' pedidos, ' + fmt(data.total_aprovado) + ' aprovado')
      await carregar()
      const v = await api.get('/eventos/' + eventoId + '/baladapp/vendas')
      setBaladappVendas(v.data)
    } catch (e) { toast.error('Erro ao sincronizar: ' + (e.response?.data?.erro || 'Erro')) }
    finally { setSyncing(false) }
  }

  async function buscarEventoBaladapp() {
    if (!baladappIdInput.trim()) { toast.error('Digite o ID do evento'); return }
    setBuscandoBaladapp(true); setBaladappPreview(null)
    try { const { data } = await api.get('/baladapp/evento/' + baladappIdInput.trim()); setBaladappPreview(data) }
    catch (e) { toast.error(e.response?.data?.erro || 'Evento não encontrado') }
    finally { setBuscandoBaladapp(false) }
  }

  async function vincularBaladapp() {
    if (!baladappPreview) return
    setVinculando(true)
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/baladapp/vincular', { baladapp_id: baladappPreview.id })
      toast.success('Vinculado e sincronizado! ' + fmt(data.sync?.total_aprovado || 0))
      setBaladappPreview(null); setBaladappIdInput(''); await carregar()
    } catch (e) { toast.error(e.response?.data?.erro || 'Erro ao vincular') }
    finally { setVinculando(false) }
  }

  async function desvincularBaladapp() {
    if (!confirm('Desvincular BaladaAPP deste evento?')) return
    try { await api.delete('/eventos/' + eventoId + '/baladapp/vincular'); toast.success('Desvinculado!'); await carregar() }
    catch (e) { toast.error('Erro ao desvincular') }
  }

  async function carregarEncontro() {
    try { const { data } = await api.get('/eventos/' + eventoId + '/encontro-contas'); setEncontro(data); setShowEncontro(true) }
    catch { toast.error('Erro ao carregar encontro de contas') }
  }

  async function addConta(e) {
    e.preventDefault()
    if (!novaConta.nome) return
    try {
      await api.post('/eventos/' + eventoId + '/contas', novaConta)
      await carregar()
      setNovaConta({ nome: '', tipo: 'banco', titular: '', percentual: '' })
      setShowContaForm(false)
      toast.success('Conta adicionada!')
    } catch { toast.error('Erro ao adicionar') }
  }

  async function delConta(id) {
    try { await api.delete('/contas/' + id); await carregar(); toast.success('Removida') }
    catch { toast.error('Erro') }
  }

  function toggleCat(cat) { setCatAberta(prev => ({ ...prev, [cat]: !prev[cat] })) }
  function expandAll() { const o = {}; categorias.forEach(c => o[c] = true); setCatAberta(o) }
  function collapseAll() { const o = {}; categorias.forEach(c => o[c] = false); setCatAberta(o) }

  async function salvarDespesa(e) {
    e.preventDefault()
    if (!form.descricao) return
    try {
      if (editId) { await api.patch('/despesas/' + editId, form) }
      else { await api.post('/eventos/' + eventoId + '/despesas', form) }
      await carregar(); setShowForm(false); setEditId(null)
      setForm({ descricao: '', quantidade: 1, valor_unitario: 0, valor: 0, centro_custo: 'Outros', fonte_pagamento: '', situacao: 'pendente', data: '', fornecedor: '', id_projecao: '' })
      toast.success(editId ? 'Despesa atualizada!' : 'Despesa adicionada!')
    } catch { toast.error('Erro ao salvar') }
  }

  async function deletarDespesa(id) {
    try { await api.delete('/despesas/' + id); await carregar(); toast.success('Removido') }
    catch { toast.error('Erro') }
  }

  async function salvarReceita(e) {
    e.preventDefault()
    if (!recForm.descricao || !recForm.valor) return
    try {
      await api.post('/eventos/' + eventoId + '/receitas', recForm)
      await carregar(); setShowRecForm(false)
      setRecForm({ descricao: '', centro_custo: 'Outro', valor: '', situacao: 'pendente', conta: '', data_pagamento: '', id_projecao: '' })
      toast.success('Receita adicionada!')
    } catch { toast.error('Erro') }
  }

  async function delReceita(id) {
    try { await api.delete('/receitas/' + id); await carregar(); toast.success('Removido') }
    catch { toast.error('Erro') }
  }

  function editarDespesa(d) {
    setForm({
      descricao: d.descricao || '', quantidade: d.quantidade || 1, valor_unitario: d.valor_unitario || 0,
      valor: d.valor || 0, centro_custo: d.centro_custo || 'Outros', fonte_pagamento: d.fonte_pagamento || '',
      situacao: d.situacao || 'pendente', data: d.data || '', fornecedor: d.fornecedor || '', id_projecao: d.id_projecao || ''
    })
    setEditId(d.id); setShowForm(true)
  }

  async function toggleDespesaStatus(id) {
    const d = despesas.find(x => x.id === id)
    if (!d) return
    const novoStatus = d.situacao === 'pago' ? 'pendente' : 'pago'
    try {
      await api.patch('/despesas/' + id, { situacao: novoStatus })
      setDespesas(prev => prev.map(x => x.id === id ? { ...x, situacao: novoStatus } : x))
      toast.success(novoStatus === 'pago' ? 'Marcado como pago!' : 'Marcado como pendente')
    } catch { toast.error('Erro ao atualizar status') }
  }

  async function addQuickDespesa() {
    if (!quickForm.descricao) return
    const total = (parseFloat(quickForm.quantidade) || 1) * (parseFloat(quickForm.valor_unitario) || 0)
    try {
      await api.post('/eventos/' + eventoId + '/despesas', {
        descricao: quickForm.descricao, quantidade: quickForm.quantidade, valor_unitario: quickForm.valor_unitario,
        valor: total, centro_custo: quickForm.centro_custo, fonte_pagamento: quickForm.fonte_pagamento,
        situacao: 'pendente', fornecedor: quickForm.fornecedor, data: new Date().toISOString().slice(0, 10)
      })
      await carregar()
      setQuickForm({ descricao: '', centro_custo: quickForm.centro_custo, quantidade: 1, valor_unitario: 0, fonte_pagamento: 'PIX', fornecedor: '' })
      quickRef.current?.focus()
      toast.success('Despesa adicionada!')
    } catch { toast.error('Erro ao adicionar') }
  }

  // Filter despesas
  const despesasFiltradas = despesas.filter(d => {
    if (searchTerm && !(d.descricao || '').toLowerCase().includes(searchTerm.toLowerCase()) && !(d.fornecedor || '').toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (filterStatus !== 'all' && d.situacao !== filterStatus) return false
    return true
  })

  const porCategoria = {}
  categorias.forEach(c => { porCategoria[c] = [] })
  despesasFiltradas.forEach(d => {
    const cat = d.centro_custo || 'Outros'
    if (!porCategoria[cat]) porCategoria[cat] = []
    porCategoria[cat].push(d)
  })

  const totalDespesas = despesas.reduce((s, d) => s + parseFloat(d.valor || 0), 0)
  const totalReceitas = receitas.reduce((s, r) => s + parseFloat(r.valor || 0), 0)
  const recebidas = receitas.filter(r => r.situacao === 'RECEBIDO').reduce((s, r) => s + parseFloat(r.valor || 0), 0)
  const totalPago = despesas.filter(d => d.situacao === 'pago').reduce((s, d) => s + parseFloat(d.valor || 0), 0)
  const totalPendente = despesas.filter(d => d.situacao === 'pendente').reduce((s, d) => s + parseFloat(d.valor || 0), 0)
  const percentPago = totalDespesas > 0 ? (totalPago / totalDespesas) * 100 : 0
  const saldo = totalReceitas - totalDespesas

  if (loading) return <div className="text-center py-8 text-gray-400">Carregando...</div>

  const selectedDespesa = despesas.find(d => d.id === selectedId)

  return (
    <div className="space-y-4">
      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateY(-6px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
      `}</style>

      {/* Baladapp Preview */}
      {baladappPreview && !evento?.baladapp_id && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {baladappPreview.foto && <img src={baladappPreview.foto} className="w-16 h-16 rounded-lg object-cover" />}
              <div>
                <h3 className="font-semibold text-gray-900 text-base">{baladappPreview.titulo}</h3>
                <p className="text-sm text-gray-600">{baladappPreview.local} · {new Date(baladappPreview.data).toLocaleDateString('pt-BR')}</p>
                <p className="text-sm text-gray-700 mt-0.5">
                  {baladappPreview.total_pedidos} pedidos · {fmt(baladappPreview.valor_total)} · {baladappPreview.total_ingressos} ingressos
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={vincularBaladapp} disabled={vinculando} className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                <Link2 size={14} /> {vinculando ? 'Vinculando...' : 'Vincular e sincronizar'}
              </button>
              <button onClick={() => setBaladappPreview(null)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* === CARDS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Despesas</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalDespesas)}</p>
          <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: percentPago + '%' }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{percentPago.toFixed(0)}% pago · {despesas.length} itens</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Receitas</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(totalReceitas)}</p>
          <p className="text-xs text-gray-400 mt-3">{receitas.length} itens</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Saldo</p>
          <p className={'text-xl font-semibold ' + (saldo >= 0 ? 'text-gray-900' : 'text-red-600')}>{fmt(saldo)}</p>
          <p className="text-xs text-gray-400 mt-3">receitas − despesas</p>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">Recebido</p>
          <p className="text-xl font-semibold text-gray-900">{fmt(recebidas)}</p>
          <p className="text-xs text-gray-400 mt-3">de {fmt(totalReceitas)}</p>
        </div>
      </div>

      {/* === TAB SWITCH === */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 p-1 bg-gray-100 rounded-lg">
          {[
            { k: 'despesas', label: 'Pagamentos', n: despesas.length },
            { k: 'receitas', label: 'Recebimentos', n: receitas.length },
            { k: 'contas', label: 'Contas', n: contas.length }
          ].map(t => (
            <button key={t.k} onClick={() => setView(t.k)}
              className={'px-3 py-1.5 rounded-md text-sm font-medium transition-colors ' +
                (view === t.k ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900')}>
              {t.label} <span className="text-gray-400">({t.n})</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {view === 'despesas' && (
            <>
              <button onClick={exportarPagamentos} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">Exportar</button>
              <button onClick={carregarEncontro} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">Encontro de contas</button>
            </>
          )}
        </div>
      </div>

      {/* =================== DESPESAS VIEW =================== */}
      {view === 'despesas' && (
        <div className="space-y-3">
          {/* Search + Filter + BaladaAPP + Add */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar despesa ou fornecedor..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none focus:border-gray-400" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="py-2 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none cursor-pointer">
              <option value="all">Todos status</option>
              <option value="pago">Pagos</option>
              <option value="pendente">Pendentes</option>
            </select>

            {evento?.baladapp_id ? (
              <>
                <button onClick={syncBaladapp} disabled={syncing} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sync...' : 'Sync BaladaAPP'}
                </button>
                <button onClick={desvincularBaladapp} title="Desvincular BaladaAPP" className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">
                  <Unlink size={13} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <input type="text" value={baladappIdInput} onChange={e => setBaladappIdInput(e.target.value)} placeholder="ID BaladaAPP"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-xs w-28 outline-none focus:border-gray-400" onKeyDown={e => { if (e.key === 'Enter') buscarEventoBaladapp() }} />
                <button onClick={buscarEventoBaladapp} disabled={buscandoBaladapp} className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <Search size={13} /> {buscandoBaladapp ? '...' : 'Buscar'}
                </button>
              </div>
            )}

            <button onClick={() => setShowQuickAdd(!showQuickAdd)}
              className={'flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ' + (showQuickAdd ? 'border border-gray-200 bg-gray-50 text-gray-600' : 'bg-gray-900 text-white hover:bg-gray-800')}>
              {showQuickAdd ? 'Fechar' : <><Plus size={14} /> Adicionar</>}
            </button>
          </div>

          {/* Quick Add */}
          {showQuickAdd && (
            <div className="bg-white rounded-xl p-4 border border-gray-200" style={{ animation: 'slideDown .2s ease' }}>
              <div className="grid grid-cols-5 gap-2">
                <input ref={quickRef} value={quickForm.descricao} onChange={e => setQuickForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descrição *" onKeyDown={e => e.key === 'Enter' && addQuickDespesa()}
                  className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none focus:border-gray-400" />
                <select value={quickForm.centro_custo} onChange={e => setQuickForm(p => ({ ...p, centro_custo: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none">
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={quickForm.quantidade} onChange={e => setQuickForm(p => ({ ...p, quantidade: e.target.value }))} placeholder="Qtd"
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none text-center" />
                <input type="number" value={quickForm.valor_unitario || ''} onChange={e => setQuickForm(p => ({ ...p, valor_unitario: e.target.value }))} placeholder="Valor unit."
                  className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none text-right" />
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="flex gap-2 items-center">
                  <select value={quickForm.fonte_pagamento} onChange={e => setQuickForm(p => ({ ...p, fonte_pagamento: e.target.value }))}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none">
                    {contas.length > 0 && contas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    {fontePagamentoBase.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input value={quickForm.fornecedor} onChange={e => setQuickForm(p => ({ ...p, fornecedor: e.target.value }))}
                    placeholder="Fornecedor (opcional)" onKeyDown={e => e.key === 'Enter' && addQuickDespesa()}
                    className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none w-48" />
                </div>
                <div className="flex items-center gap-3">
                  {parseFloat(quickForm.valor_unitario) > 0 && (
                    <span className="text-sm font-semibold text-gray-700">Total: {fmt((parseFloat(quickForm.quantidade) || 1) * (parseFloat(quickForm.valor_unitario) || 0))}</span>
                  )}
                  <button onClick={addQuickDespesa}
                    className={'px-5 py-2 rounded-lg text-sm font-medium transition-colors ' + (quickForm.descricao ? 'bg-gray-900 text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed')}>
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Expand/Collapse */}
          <div className="flex gap-1.5 items-center flex-wrap">
            <button onClick={expandAll} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">Expandir tudo</button>
            <button onClick={collapseAll} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">Recolher tudo</button>
            {(() => {
              const semProj = despesas.filter(d => !d.id_projecao).length
              return semProj > 0 ? (
                <span title="Despesas sem vínculo com linha da projeção"
                  className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  {semProj} sem projeção
                </span>
              ) : null
            })()}
            {(searchTerm || filterStatus !== 'all') && <span className="text-xs text-gray-400 self-center ml-2">{despesasFiltradas.length} de {despesas.length} itens</span>}
          </div>

          {/* === CATEGORY SECTIONS === */}
          <div className="space-y-3">
            {categorias.map(cat => {
              const items = porCategoria[cat] || []
              if (items.length === 0) return null
              const totalCat = items.reduce((s, d) => s + parseFloat(d.valor || 0), 0)
              const pagosCat = items.filter(d => d.situacao === 'pago').reduce((s, d) => s + parseFloat(d.valor || 0), 0)
              const pctPago = totalCat > 0 ? (pagosCat / totalCat) * 100 : 0
              const isOpen = catAberta[cat] !== false

              return (
                <div key={cat} className="bg-white rounded-xl overflow-hidden border border-gray-200">
                  {/* Header */}
                  <div onClick={() => toggleCat(cat)} className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                    style={{ borderBottom: isOpen ? '1px solid #f3f4f6' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <span className="w-1 h-8 rounded-full shrink-0" style={{ background: catCores[cat] || '#6b7280' }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">{cat}</span>
                          <span className="text-xs text-gray-400">({items.length})</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="w-20 h-0.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-gray-400 transition-all duration-500" style={{ width: pctPago + '%' }} />
                          </div>
                          <span className="text-xs text-gray-500">{pctPago.toFixed(0)}% pago</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-semibold text-gray-900">{fmt(totalCat)}</span>
                      <ChevronDown size={16} className={'text-gray-400 transition-transform duration-200 ' + (isOpen ? 'rotate-180' : '')} />
                    </div>
                  </div>

                  {/* Items */}
                  {isOpen && (
                    <div style={{ animation: 'fadeIn .2s ease' }}>
                      {/* Col headers */}
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-4 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-medium" style={{ width: '30%' }}>Descrição</th>
                            <th className="px-3 py-2 text-center text-[10px] uppercase tracking-wide text-gray-500 font-medium" style={{ width: '8%' }}>Qtd</th>
                            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium" style={{ width: '14%' }}>Valor unit.</th>
                            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium" style={{ width: '14%' }}>Valor total</th>
                            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-medium" style={{ width: '12%' }}>Fonte</th>
                            <th className="px-3 py-2 text-center text-[10px] uppercase tracking-wide text-gray-500 font-medium" style={{ width: '12%' }}>Status</th>
                            <th className="px-3 py-2 text-center" style={{ width: '10%' }}></th>
                          </tr>
                        </thead>
                      </table>

                      <table className="w-full">
                        <tbody>
                          {items.map((d, i) => (
                            <tr key={d.id} onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
                              className={'cursor-pointer transition-colors hover:bg-gray-50 ' + (selectedId === d.id ? 'bg-gray-50' : '')}
                              style={{ borderBottom: i < items.length - 1 ? '1px solid #f3f4f6' : 'none', borderLeft: selectedId === d.id ? '3px solid #111827' : '3px solid transparent' }}>
                              <td className="px-4 py-2.5" style={{ width: '30%' }}>
                                <div className="flex items-start gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 m-0">{d.descricao || d.fornecedor || 'Sem nome'}</p>
                                    {d.fornecedor && d.descricao && <p className="text-xs text-gray-400 m-0 mt-0.5">{d.fornecedor}</p>}
                                  </div>
                                  {!d.id_projecao && (
                                    <span title="Esta despesa não está vinculada a nenhuma linha da projeção."
                                      className="shrink-0 inline-flex items-center bg-amber-50 text-amber-700 text-[10px] font-medium px-2 py-0.5 rounded-md border border-amber-200">
                                      sem projeção
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-center" style={{ width: '8%' }}><span className="text-xs text-gray-500">{d.quantidade || 1}</span></td>
                              <td className="px-3 py-2.5 text-right" style={{ width: '14%' }}><span className="text-xs text-gray-500">{fmt(d.valor_unitario || d.valor || 0)}</span></td>
                              <td className="px-3 py-2.5 text-right" style={{ width: '14%' }}><span className="text-sm font-semibold text-gray-900">{fmt(d.valor || 0)}</span></td>
                              <td className="px-3 py-2.5" style={{ width: '12%' }}><span className="text-xs text-gray-500">{d.fonte_pagamento || '—'}</span></td>
                              <td className="px-3 py-2.5 text-center" style={{ width: '12%' }}>
                                <button onClick={e => { e.stopPropagation(); toggleDespesaStatus(d.id) }}
                                  className={'px-2 py-0.5 rounded-md text-xs font-medium border cursor-pointer transition-colors ' + (d.situacao === 'pago' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                                  {d.situacao === 'pago' ? 'Pago' : 'Pendente'}
                                </button>
                              </td>
                              <td className="px-3 py-2.5 text-center" style={{ width: '10%' }}>
                                <div className="flex justify-center gap-1">
                                  <button onClick={e => { e.stopPropagation(); editarDespesa(d) }} title="Editar" className="p-1 text-gray-400 hover:text-gray-900 rounded"><Pencil size={13} /></button>
                                  <button onClick={e => { e.stopPropagation(); deletarDespesa(d.id) }} title="Excluir" className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-gray-50 border-t border-gray-100">
                            <td className="px-4 py-2"><span className="text-xs font-medium text-gray-600">Subtotal {cat}</span></td>
                            <td></td><td></td>
                            <td className="px-3 py-2 text-right"><span className="text-sm font-semibold text-gray-900">{fmt(totalCat)}</span></td>
                            <td></td><td></td><td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {despesas.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <p className="text-gray-400 text-sm">Nenhuma despesa. Envie comprovantes no grupo financeiro do WhatsApp ou adicione manualmente.</p>
            </div>
          )}

          {/* Detail Panel */}
          {selectedDespesa && (
            <div className="bg-white rounded-xl p-5 border border-gray-200" style={{ animation: 'slideDown .2s ease' }}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <span className="w-1 h-10 rounded-full shrink-0" style={{ background: catCores[selectedDespesa.centro_custo] || '#6b7280' }} />
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 m-0">{selectedDespesa.descricao}</h3>
                    <p className="text-xs text-gray-400 m-0 mt-0.5">
                      {selectedDespesa.centro_custo}{selectedDespesa.fornecedor ? ' · ' + selectedDespesa.fornecedor : ''}{selectedDespesa.data ? ' · ' + new Date(selectedDespesa.data).toLocaleDateString('pt-BR') : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-gray-900 m-0">{fmt(selectedDespesa.valor)}</p>
                  <span className={'inline-block mt-1 px-2 py-0.5 rounded-md text-xs font-medium border ' + (selectedDespesa.situacao === 'pago' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                    {selectedDespesa.situacao === 'pago' ? 'Pago' : 'Pendente'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { l: 'Quantidade', v: selectedDespesa.quantidade || 1 },
                  { l: 'Valor unitário', v: fmt(selectedDespesa.valor_unitario || selectedDespesa.valor || 0) },
                  { l: 'Fonte pagamento', v: selectedDespesa.fonte_pagamento || '—' },
                  { l: 'Data', v: selectedDespesa.data ? new Date(selectedDespesa.data).toLocaleDateString('pt-BR') : '—' },
                ].map((f, i) => (
                  <div key={i} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                    <p className="text-[10px] uppercase tracking-wide text-gray-500 font-medium m-0 mb-1">{f.l}</p>
                    <p className="text-sm font-medium text-gray-900 m-0">{f.v}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => editarDespesa(selectedDespesa)} className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                  <Pencil size={13} /> Editar
                </button>
                <button onClick={() => toggleDespesaStatus(selectedDespesa.id)} className="flex items-center gap-1 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">
                  {selectedDespesa.situacao === 'pago' ? <><RotateCcw size={13} /> Marcar pendente</> : <><Check size={13} /> Marcar como pago</>}
                </button>
                <button onClick={() => { deletarDespesa(selectedDespesa.id); setSelectedId(null) }} className="flex items-center gap-1 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-red-600 hover:bg-red-50">
                  <Trash2 size={13} /> Excluir
                </button>
              </div>
            </div>
          )}

          {/* Total Bar */}
          <div className="rounded-xl px-5 py-3 flex justify-between items-center bg-gray-50 border border-gray-200">
            <span className="text-sm font-medium text-gray-600">Total geral · {despesas.length} itens</span>
            <span className="text-lg font-semibold text-gray-900">{fmt(totalDespesas)}</span>
          </div>
        </div>
      )}

      {/* =================== RECEITAS VIEW =================== */}
      {view === 'receitas' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recebimentos</h3>
              <button onClick={() => setShowRecForm(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  {['Descrição', 'Centro', 'Valor', 'Situação', 'Conta', 'Data', ''].map((h, i) => (
                    <th key={i} className={'px-4 py-2 text-[10px] uppercase tracking-wide text-gray-500 font-medium ' + (i === 2 ? 'text-right' : i === 3 ? 'text-center' : 'text-left')}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {receitas.map(r => (
                    <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{r.descricao}</span>
                          {!r.id_projecao && (
                            <span title="Sem vínculo com linha da projeção."
                              className="inline-flex items-center bg-amber-50 text-amber-700 text-[10px] font-medium px-2 py-0.5 rounded-md border border-amber-200">
                              sem projeção
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5"><span className="text-xs text-gray-600">{r.centro_custo}</span></td>
                      <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900">{fmt(r.valor)}</td>
                      <td className="px-4 py-2.5 text-center"><span className={'text-xs px-2 py-0.5 rounded-md font-medium border ' + (r.situacao === 'RECEBIDO' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>{r.situacao}</span></td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.conta || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{r.data_pagamento ? new Date(r.data_pagamento).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-4 py-2.5 text-center"><button onClick={() => delReceita(r.id)} title="Excluir" className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                  {receitas.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum recebimento</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs font-medium text-gray-600">Total recebimentos</span>
              <span className="text-base font-semibold text-gray-900">{fmt(totalReceitas)}</span>
            </div>
          </div>
        </div>
      )}

      {/* =================== CONTAS VIEW =================== */}
      {view === 'contas' && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Contas / Fontes de pagamento</h3>
              <button onClick={() => setShowContaForm(!showContaForm)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                <Plus size={14} /> Adicionar conta
              </button>
            </div>
            {showContaForm && (
              <form onSubmit={addConta} className="p-4 bg-gray-50 border-b border-gray-100 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input placeholder="Nome da conta *" value={novaConta.nome} onChange={e => setNovaConta({ ...novaConta, nome: e.target.value })} required className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-gray-400" />
                  <select value={novaConta.tipo} onChange={e => setNovaConta({ ...novaConta, tipo: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none">
                    <option value="banco">Conta bancária</option><option value="socio">Sócio</option><option value="empresa">Empresa</option><option value="caixa">Caixa</option><option value="outro">Outro</option>
                  </select>
                  <input placeholder="Titular / Responsável" value={novaConta.titular} onChange={e => setNovaConta({ ...novaConta, titular: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-gray-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1 font-medium">Percentual (%)</label>
                    <input type="number" step="0.01" min="0" max="100" placeholder="Ex: 50" value={novaConta.percentual} onChange={e => setNovaConta({ ...novaConta, percentual: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-gray-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800">Salvar</button>
                  <button type="button" onClick={() => setShowContaForm(false)} className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
                </div>
              </form>
            )}
            <div className="divide-y divide-gray-100">
              {contas.map(c => (
                <div key={c.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                        <div className="flex gap-2 mt-0.5 items-center">
                          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border border-gray-200 text-gray-600">{c.tipo}</span>
                          {c.titular && <span className="text-xs text-gray-500">{c.titular}</span>}
                          {c.percentual > 0 && <span className="text-xs font-semibold text-gray-900">{c.percentual}%</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 items-center">
                      <button onClick={() => setEditConta({ id: c.id, nome: c.nome, tipo: c.tipo, titular: c.titular, percentual: c.percentual || 0 })} className="text-xs text-gray-600 hover:text-gray-900 font-medium">Editar</button>
                      <button onClick={() => delConta(c.id)} title="Remover" className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              ))}
              {contas.length === 0 && <div className="px-4 py-8 text-center text-sm text-gray-400">Nenhuma conta cadastrada.</div>}
            </div>
          </div>
        </div>
      )}

      {/* =================== MODALS =================== */}
      {editConta && (
        <Modal open={!!editConta} onClose={() => setEditConta(null)} title="Editar Conta">
          <div className="space-y-3">
            <input placeholder="Nome *" value={editConta.nome} onChange={e => setEditConta({ ...editConta, nome: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
            <div className="grid grid-cols-2 gap-3">
              <select value={editConta.tipo} onChange={e => setEditConta({ ...editConta, tipo: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="banco">Conta Bancária</option><option value="socio">Sócio</option><option value="empresa">Empresa</option><option value="caixa">Caixa</option><option value="outro">Outro</option>
              </select>
              <input placeholder="Titular" value={editConta.titular} onChange={e => setEditConta({ ...editConta, titular: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Percentual (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={editConta.percentual} onChange={e => setEditConta({ ...editConta, percentual: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
            </div>
            <button onClick={salvarEditConta} className="w-full px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors">Salvar</button>
          </div>
        </Modal>
      )}

      {showEncontro && encontro && (
        <Modal open={showEncontro} onClose={() => setShowEncontro(false)} title="Encontro de contas">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                <p className="text-xs text-gray-500 font-medium">Receitas</p>
                <p className="text-lg font-semibold text-gray-900">{fmt(encontro.total_receitas)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
                <p className="text-xs text-gray-500 font-medium">Despesas</p>
                <p className="text-lg font-semibold text-gray-900">{fmt(encontro.total_despesas)}</p>
              </div>
              <div className="rounded-lg p-3 text-center border bg-gray-50 border-gray-200">
                <p className="text-xs text-gray-500 font-medium">{encontro.lucro >= 0 ? 'Lucro' : 'Prejuízo'}</p>
                <p className={'text-lg font-semibold ' + (encontro.lucro >= 0 ? 'text-gray-900' : 'text-red-600')}>{fmt(Math.abs(encontro.lucro))}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {['Conta', '%', 'Pagou', 'Recebeu', 'Parte lucro', 'Saldo final'].map((h, i) => (
                    <th key={i} className={'px-3 py-2 text-[10px] uppercase tracking-wide text-gray-500 font-medium ' + (i >= 2 ? 'text-right' : i === 1 ? 'text-center' : 'text-left')}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {encontro.contas.map(c => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-sm"><span className="font-medium text-gray-900">{c.nome}</span>{c.titular && <span className="text-xs text-gray-400 ml-1">({c.titular})</span>}</td>
                      <td className="px-3 py-2 text-sm text-center font-medium text-gray-700">{c.percentual}%</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{fmt(c.pagou)}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{fmt(c.recebeu)}</td>
                      <td className="px-3 py-2 text-sm text-right text-gray-700">{fmt(c.lucro_parte)}</td>
                      <td className={'px-3 py-2 text-sm text-right font-semibold ' + (c.saldo >= 0 ? 'text-gray-900' : 'text-red-600')}>{fmt(c.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={exportarEncontro} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors">
              <Download size={14} /> Exportar encontro de contas
            </button>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-600"><strong className="text-gray-800">Como funciona:</strong> Parte do lucro/prejuízo = resultado × % da conta. Saldo = parte do lucro + o que pagou − o que recebeu. Saldo positivo = tem a receber do evento. Saldo negativo = deve pagar ao evento.</p>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null) }} title={editId ? 'Editar Despesa' : 'Nova Despesa'}>
          <form onSubmit={salvarDespesa} className="space-y-3">
            <input placeholder="Descrição *" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Quantidade</label>
                <input type="number" step="0.01" value={form.quantidade} onChange={e => { const q = e.target.value; setForm(prev => ({ ...prev, quantidade: q, valor: (parseFloat(q) || 1) * (parseFloat(prev.valor_unitario) || 0) })) }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Valor unitário</label>
                <input type="number" step="0.01" value={form.valor_unitario} onChange={e => { const v = e.target.value; setForm(prev => ({ ...prev, valor_unitario: v, valor: (parseFloat(prev.quantidade) || 1) * (parseFloat(v) || 0) })) }} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Valor total</label>
                <input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 font-semibold outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Categoria</label>
                <select value={form.centro_custo} onChange={e => setForm({ ...form, centro_custo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Conta / Fonte pagamento</label>
                <select value={form.fonte_pagamento} onChange={e => setForm({ ...form, fonte_pagamento: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">Selecione</option>
                  {contas.length > 0 && <optgroup label="Contas do evento">{contas.map(c => <option key={c.id} value={c.nome}>{c.nome}{c.titular ? ' (' + c.titular + ')' : ''}</option>)}</optgroup>}
                  <optgroup label="Outros">{fontePagamentoBase.map(f => <option key={f} value={f}>{f}</option>)}</optgroup>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Status</label>
                <select value={form.situacao} onChange={e => setForm({ ...form, situacao: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="pendente">Pendente</option><option value="pago">Pago</option><option value="parcial">Parcial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Data</label>
                <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
            </div>
            <input placeholder="Fornecedor" value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Vincular à projeção (opcional)</label>
              <select value={form.id_projecao || ''} onChange={e => setForm({ ...form, id_projecao: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="">— sem vínculo —</option>
                {projecoes.filter(p => p.tipo === 'despesa').map(p => (
                  <option key={p.id} value={p.id}>{p.descricao} {p.centro_custo ? '(' + p.centro_custo + ')' : ''} — R$ {Number(p.valor_projetado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors">{editId ? 'Atualizar' : 'Adicionar'}</button>
          </form>
        </Modal>
      )}

      {showRecForm && (
        <Modal open={showRecForm} onClose={() => setShowRecForm(false)} title="Nova Receita">
          <form onSubmit={salvarReceita} className="space-y-3">
            <input placeholder="Descrição *" value={recForm.descricao} onChange={e => setRecForm({ ...recForm, descricao: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Conta</label>
                <select value={recForm.centro_custo} onChange={e => setRecForm({ ...recForm, centro_custo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="Outro">Selecione a conta</option>
                  {contas.map(c => <option key={c.id} value={c.nome}>{c.nome}{c.titular ? ' (' + c.titular + ')' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1 font-medium">Valor *</label>
                <input type="number" step="0.01" value={recForm.valor} onChange={e => setRecForm({ ...recForm, valor: e.target.value })} required className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select value={recForm.situacao} onChange={e => setRecForm({ ...recForm, situacao: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="pendente">Pendente</option><option value="RECEBIDO">Recebido</option>
              </select>
              <select value={recForm.conta} onChange={e => setRecForm({ ...recForm, conta: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="">Conta</option>
                {['SICREDI', 'YAWPAY', 'PIX', 'DINHEIRO', 'CARTAO'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" value={recForm.data_pagamento} onChange={e => setRecForm({ ...recForm, data_pagamento: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Vincular à projeção (opcional)</label>
              <select value={recForm.id_projecao || ''} onChange={e => setRecForm({ ...recForm, id_projecao: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none">
                <option value="">— sem vínculo —</option>
                {projecoes.filter(p => p.tipo === 'receita').map(p => (
                  <option key={p.id} value={p.id}>{p.descricao} {p.centro_custo ? '(' + p.centro_custo + ')' : ''} — R$ {Number(p.valor_projetado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="w-full py-2 rounded-lg text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 transition-colors">Adicionar Receita</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
