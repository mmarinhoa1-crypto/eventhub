import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, DollarSign, TrendingUp, TrendingDown, ChevronDown, ChevronRight, Download, RefreshCw, Link2, Unlink, Search } from 'lucide-react'
import api from '../../api/client'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import toast from 'react-hot-toast'

const catIcons = { 'Artistico': '🎵', 'Logistica/Camarim': '📦', 'Estrutura do Evento': '🏗️', 'Divulgacao e Midia': '📢', 'Documentacao e Taxas': '📄', 'Operacional': '⚙️', 'Bar': '🍸', 'Open Bar': '🍹', 'Alimentacao': '🍽️', 'Outros': '📋' }
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
    centro_custo: 'Outros', fonte_pagamento: '', situacao: 'pendente', data: '', fornecedor: ''
  })
  const [recForm, setRecForm] = useState({
    descricao: '', centro_custo: 'Outro', valor: '', situacao: 'pendente', conta: '', data_pagamento: ''
  })

  useEffect(() => { carregar() }, [eventoId])
  useEffect(() => {
    const init = {}
    categorias.forEach(c => init[c] = true)
    setCatAberta(init)
  }, [])
  useEffect(() => { if (showQuickAdd && quickRef.current) quickRef.current.focus() }, [showQuickAdd])

  async function carregar() {
    try {
      const [ev, d, r, c] = await Promise.all([
        api.get('/eventos/' + eventoId),
        api.get('/eventos/' + eventoId + '/despesas'),
        api.get('/eventos/' + eventoId + '/receitas'),
        api.get('/eventos/' + eventoId + '/contas')
      ])
      setEvento(ev.data)
      setDespesas(d.data)
      setReceitas(r.data)
      setContas(c.data)
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
      setForm({ descricao: '', quantidade: 1, valor_unitario: 0, valor: 0, centro_custo: 'Outros', fonte_pagamento: '', situacao: 'pendente', data: '', fornecedor: '' })
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
      setRecForm({ descricao: '', centro_custo: 'Outro', valor: '', situacao: 'pendente', conta: '', data_pagamento: '' })
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
      situacao: d.situacao || 'pendente', data: d.data || '', fornecedor: d.fornecedor || ''
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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {baladappPreview.foto && <img src={baladappPreview.foto} className="w-16 h-16 rounded-lg object-cover" />}
              <div>
                <h3 className="font-bold text-blue-800 text-lg">{baladappPreview.titulo}</h3>
                <p className="text-sm text-blue-600">{baladappPreview.local} • {new Date(baladappPreview.data).toLocaleDateString('pt-BR')}</p>
                <p className="text-sm text-blue-700 font-medium mt-1">
                  {baladappPreview.total_pedidos} pedidos • {fmt(baladappPreview.valor_total)} • {baladappPreview.total_ingressos} ingressos
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={vincularBaladapp} disabled={vinculando} className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
                <Link2 size={14} /> {vinculando ? 'Vinculando...' : 'Vincular e Sincronizar'}
              </button>
              <button onClick={() => setBaladappPreview(null)} className="px-3 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* === CARDS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl p-5 text-white relative overflow-hidden" style={{ background: 'var(--gradient-info)' }}>
          <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
          <div className="absolute -bottom-5 right-10 w-16 h-16 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">Despesas</p>
          <p className="text-2xl font-extrabold">{fmt(totalDespesas)}</p>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: percentPago + '%' }} />
          </div>
          <p className="text-xs opacity-70 mt-1.5">{percentPago.toFixed(0)}% pago • {despesas.length} itens</p>
        </div>

        <div className="bg-white dark:bg-white/[0.05] rounded-2xl p-5 border border-green-200 dark:border-green-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: 'linear-gradient(90deg, #10b981, #34d399)' }} />
          <p className="text-xs font-bold uppercase tracking-wider text-green-600 dark:text-green-400 mb-2">Receitas</p>
          <p className="text-2xl font-extrabold text-green-700 dark:text-green-400">{fmt(totalReceitas)}</p>
          <p className="text-xs text-green-400 dark:text-green-500 mt-3 font-semibold">{receitas.length} itens</p>
        </div>

        <div className={'bg-white dark:bg-white/[0.05] rounded-2xl p-5 border relative overflow-hidden ' + (saldo >= 0 ? 'border-blue-200 dark:border-blue-500/20' : 'border-red-200 dark:border-red-500/20')}>
          <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: saldo >= 0 ? 'var(--gradient-info)' : 'linear-gradient(90deg, var(--color-danger), #f87171)' }} />
          <p className={'text-xs font-bold uppercase tracking-wider mb-2 ' + (saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400')}>Saldo</p>
          <p className={'text-2xl font-extrabold ' + (saldo >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-600 dark:text-red-400')}>{fmt(saldo)}</p>
          <p className="text-xs text-gray-400 dark:text-white/40 mt-3 font-semibold">receitas - despesas</p>
        </div>

        <div className="bg-white dark:bg-white/[0.05] rounded-2xl p-5 border border-yellow-200 dark:border-yellow-500/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />
          <p className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2">Recebido</p>
          <p className="text-2xl font-extrabold text-yellow-700 dark:text-yellow-400">{fmt(recebidas)}</p>
          <p className="text-xs text-yellow-400 dark:text-yellow-500 mt-3 font-semibold">de {fmt(totalReceitas)}</p>
        </div>
      </div>

      {/* === TAB SWITCH === */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setView('despesas')} className={'px-4 py-2 rounded-xl text-sm font-bold transition-all ' + (view === 'despesas' ? 'text-white shadow-lg' : 'bg-white dark:bg-white/[0.05] text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10')} style={view === 'despesas' ? { background: 'var(--gradient-info)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' } : {}}>
            Pagamentos ({despesas.length})
          </button>
          <button onClick={() => setView('receitas')} className={'px-4 py-2 rounded-xl text-sm font-bold transition-all ' + (view === 'receitas' ? 'text-white shadow-lg' : 'bg-white dark:bg-white/[0.05] text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10')} style={view === 'receitas' ? { background: 'var(--gradient-info)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' } : {}}>
            Recebimentos ({receitas.length})
          </button>
          <button onClick={() => setView('contas')} className={'px-4 py-2 rounded-xl text-sm font-bold transition-all ' + (view === 'contas' ? 'text-white shadow-lg' : 'bg-white dark:bg-white/[0.05] text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 hover:bg-blue-50 dark:hover:bg-blue-500/10')} style={view === 'contas' ? { background: 'var(--gradient-info)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' } : {}}>
            Contas ({contas.length})
          </button>
        </div>
        <div className="flex gap-2">
          {view === 'despesas' && (
            <>
              <button onClick={exportarPagamentos} className="px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 transition-all">📥 Exportar</button>
              <button onClick={carregarEncontro} className="px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 transition-all">🤝 Encontro de Contas</button>
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
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" />
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar despesa ou fornecedor..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 border-blue-100 bg-white text-sm font-medium text-gray-800 outline-none focus:border-blue-400 transition-colors" />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="py-2.5 px-3 rounded-xl border-2 border-blue-100 bg-white text-xs font-bold text-blue-600 outline-none cursor-pointer">
              <option value="all">Todos status</option>
              <option value="pago">✓ Pagos</option>
              <option value="pendente">⏳ Pendentes</option>
            </select>

            {evento?.baladapp_id ? (
              <>
                <button onClick={syncBaladapp} disabled={syncing} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Sync...' : 'Sync BaladaAPP'}
                </button>
                <button onClick={desvincularBaladapp} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-red-200 bg-white text-red-500 hover:bg-red-50">
                  <Unlink size={13} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1">
                <input type="text" value={baladappIdInput} onChange={e => setBaladappIdInput(e.target.value)} placeholder="ID BaladaAPP"
                  className="border-2 border-blue-100 rounded-xl px-3 py-2 text-xs w-28 outline-none focus:border-blue-400" onKeyDown={e => { if (e.key === 'Enter') buscarEventoBaladapp() }} />
                <button onClick={buscarEventoBaladapp} disabled={buscandoBaladapp} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 disabled:opacity-50">
                  <Search size={13} /> {buscandoBaladapp ? '...' : 'Buscar'}
                </button>
              </div>
            )}

            <button onClick={() => setShowQuickAdd(!showQuickAdd)}
              className={'px-5 py-2.5 rounded-xl text-sm font-extrabold border-none cursor-pointer transition-all ' + (showQuickAdd ? 'bg-red-50 text-red-500' : 'text-white')}
              style={!showQuickAdd ? { background: 'var(--gradient-info)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' } : {}}>
              {showQuickAdd ? '✕ Fechar' : '+ Adicionar'}
            </button>
          </div>

          {/* Quick Add */}
          {showQuickAdd && (
            <div className="bg-white rounded-2xl p-5 border-2 border-blue-100 shadow-sm" style={{ animation: 'slideDown .2s ease' }}>
              <div className="grid grid-cols-5 gap-2.5">
                <input ref={quickRef} value={quickForm.descricao} onChange={e => setQuickForm(p => ({ ...p, descricao: e.target.value }))}
                  placeholder="Descrição da despesa *" onKeyDown={e => e.key === 'Enter' && addQuickDespesa()}
                  className="col-span-2 px-3 py-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 text-sm font-medium text-gray-800 outline-none focus:border-blue-400" />
                <select value={quickForm.centro_custo} onChange={e => setQuickForm(p => ({ ...p, centro_custo: e.target.value }))}
                  className="px-3 py-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 text-xs font-semibold text-gray-600 outline-none">
                  {categorias.map(c => <option key={c} value={c}>{catIcons[c]} {c}</option>)}
                </select>
                <input type="number" value={quickForm.quantidade} onChange={e => setQuickForm(p => ({ ...p, quantidade: e.target.value }))} placeholder="Qtd"
                  className="px-3 py-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 text-sm text-gray-800 outline-none text-center" />
                <input type="number" value={quickForm.valor_unitario || ''} onChange={e => setQuickForm(p => ({ ...p, valor_unitario: e.target.value }))} placeholder="Valor unit. (R$)"
                  className="px-3 py-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 text-sm text-gray-800 outline-none text-right" />
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="flex gap-2.5 items-center">
                  <select value={quickForm.fonte_pagamento} onChange={e => setQuickForm(p => ({ ...p, fonte_pagamento: e.target.value }))}
                    className="px-3 py-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 text-xs font-semibold text-gray-600 outline-none">
                    {contas.length > 0 && contas.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    {fontePagamentoBase.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <input value={quickForm.fornecedor} onChange={e => setQuickForm(p => ({ ...p, fornecedor: e.target.value }))}
                    placeholder="Fornecedor (opcional)" onKeyDown={e => e.key === 'Enter' && addQuickDespesa()}
                    className="px-3 py-2.5 rounded-xl border-2 border-blue-100 bg-blue-50 text-sm text-gray-800 outline-none w-48" />
                </div>
                <div className="flex items-center gap-3">
                  {parseFloat(quickForm.valor_unitario) > 0 && (
                    <span className="text-sm font-extrabold text-blue-600">Total: {fmt((parseFloat(quickForm.quantidade) || 1) * (parseFloat(quickForm.valor_unitario) || 0))}</span>
                  )}
                  <button onClick={addQuickDespesa}
                    className={'px-6 py-2.5 rounded-xl text-sm font-extrabold border-none cursor-pointer transition-all ' + (quickForm.descricao ? 'text-white' : 'bg-gray-200 text-gray-400')}
                    style={quickForm.descricao ? { background: 'var(--gradient-info)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' } : {}}>
                    Salvar ↵
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Expand/Collapse */}
          <div className="flex gap-1.5">
            <button onClick={expandAll} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">▼ Expandir tudo</button>
            <button onClick={collapseAll} className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white text-gray-500 hover:bg-gray-50">▲ Recolher tudo</button>
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
                <div key={cat} className="bg-white rounded-2xl overflow-hidden border border-blue-200 shadow-sm">
                  {/* Header */}
                  <div onClick={() => toggleCat(cat)} className="flex items-center justify-between px-5 py-3.5 cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors select-none"
                    style={{ borderBottom: isOpen ? '1px solid #bfdbfe' : 'none' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-lg">
                        {catIcons[cat] || '📋'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-blue-700">{cat}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">{items.length}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-20 h-0.5 rounded-full bg-blue-100 overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: pctPago + '%' }} />
                          </div>
                          <span className="text-xs font-bold text-blue-500">{pctPago.toFixed(0)}% pago</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-extrabold text-blue-700">{fmt(totalCat)}</span>
                      <ChevronDown size={18} className={'text-blue-400 transition-transform duration-200 ' + (isOpen ? 'rotate-180' : '')} />
                    </div>
                  </div>

                  {/* Items */}
                  {isOpen && (
                    <div style={{ animation: 'fadeIn .2s ease' }}>
                      {/* Col headers */}
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-5 py-2 text-left" style={{ fontSize: 9, letterSpacing: '0.08em', width: '30%' }}><span className="text-blue-300 font-extrabold uppercase tracking-wider">Descrição</span></th>
                            <th className="px-3 py-2 text-center" style={{ fontSize: 9, letterSpacing: '0.08em', width: '8%' }}><span className="text-blue-300 font-extrabold uppercase tracking-wider">Qtd</span></th>
                            <th className="px-3 py-2 text-right" style={{ fontSize: 9, letterSpacing: '0.08em', width: '14%' }}><span className="text-blue-300 font-extrabold uppercase tracking-wider">Valor Unit.</span></th>
                            <th className="px-3 py-2 text-right" style={{ fontSize: 9, letterSpacing: '0.08em', width: '14%' }}><span className="text-blue-300 font-extrabold uppercase tracking-wider">Valor Total</span></th>
                            <th className="px-3 py-2 text-left" style={{ fontSize: 9, letterSpacing: '0.08em', width: '12%' }}><span className="text-blue-300 font-extrabold uppercase tracking-wider">Fonte</span></th>
                            <th className="px-3 py-2 text-center" style={{ fontSize: 9, letterSpacing: '0.08em', width: '12%' }}><span className="text-blue-300 font-extrabold uppercase tracking-wider">Status</span></th>
                            <th className="px-3 py-2 text-center" style={{ fontSize: 9, letterSpacing: '0.08em', width: '10%' }}></th>
                          </tr>
                        </thead>
                      </table>

                      <table className="w-full">
                        <tbody>
                          {items.map((d, i) => (
                            <tr key={d.id} onClick={() => setSelectedId(selectedId === d.id ? null : d.id)}
                              className={'cursor-pointer transition-all hover:bg-blue-50 ' + (selectedId === d.id ? 'bg-blue-50' : '')}
                              style={{ borderBottom: i < items.length - 1 ? '1px solid #f8f7fc' : 'none', borderLeft: selectedId === d.id ? '3px solid #3b82f6' : '3px solid transparent' }}>
                              <td className="px-5 py-3" style={{ width: '30%' }}>
                                <p className="text-sm font-bold text-gray-800 m-0">{d.descricao || d.fornecedor || 'Sem nome'}</p>
                                {d.fornecedor && d.descricao && <p className="text-xs text-gray-400 m-0 mt-0.5">{d.fornecedor}</p>}
                              </td>
                              <td className="px-3 py-3 text-center" style={{ width: '8%' }}><span className="text-xs font-semibold text-blue-400">{d.quantidade || 1}</span></td>
                              <td className="px-3 py-3 text-right" style={{ width: '14%' }}><span className="text-xs text-blue-400">{fmt(d.valor_unitario || d.valor || 0)}</span></td>
                              <td className="px-3 py-3 text-right" style={{ width: '14%' }}><span className="text-sm font-extrabold text-gray-800">{fmt(d.valor || 0)}</span></td>
                              <td className="px-3 py-3" style={{ width: '12%' }}><span className="text-xs text-gray-400 font-medium">{d.fonte_pagamento || '-'}</span></td>
                              <td className="px-3 py-3 text-center" style={{ width: '12%' }}>
                                <button onClick={e => { e.stopPropagation(); toggleDespesaStatus(d.id) }}
                                  className={'px-2.5 py-1 rounded-full text-xs font-extrabold border-none cursor-pointer transition-all ' + (d.situacao === 'pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                                  {d.situacao === 'pago' ? '✓ Pago' : 'Pendente'}
                                </button>
                              </td>
                              <td className="px-3 py-3 text-center" style={{ width: '10%' }}>
                                <div className="flex justify-center gap-1">
                                  <button onClick={e => { e.stopPropagation(); editarDespesa(d) }} className="text-blue-300 hover:text-blue-600 text-xs">✏️</button>
                                  <button onClick={e => { e.stopPropagation(); deletarDespesa(d.id) }} className="text-red-300 hover:text-red-500 text-xs">🗑</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-blue-50 border-t border-blue-200">
                            <td className="px-5 py-2.5"><span className="text-xs font-extrabold text-blue-600">Subtotal {cat}</span></td>
                            <td></td><td></td>
                            <td className="px-3 py-2.5 text-right"><span className="text-sm font-extrabold text-blue-700">{fmt(totalCat)}</span></td>
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
            <div className="bg-white rounded-2xl p-8 text-center border border-blue-100">
              <p className="text-gray-400">Nenhuma despesa. Envie comprovantes no grupo financeiro do WhatsApp ou adicione manualmente.</p>
            </div>
          )}

          {/* Detail Panel */}
          {selectedDespesa && (
            <div className="bg-white rounded-2xl p-5 border-2 border-blue-200 shadow-sm" style={{ animation: 'slideDown .2s ease' }}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-xl">
                    {catIcons[selectedDespesa.centro_custo] || '📋'}
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-gray-800 m-0">{selectedDespesa.descricao}</h3>
                    <p className="text-xs text-gray-400 m-0 mt-0.5">
                      {selectedDespesa.fornecedor && selectedDespesa.fornecedor + ' • '}{selectedDespesa.data ? new Date(selectedDespesa.data).toLocaleDateString('pt-BR') : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-blue-700 m-0">{fmt(selectedDespesa.valor)}</p>
                  <span className={'px-3 py-1 rounded-full text-xs font-extrabold ' + (selectedDespesa.situacao === 'pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>
                    {selectedDespesa.situacao === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { l: 'Quantidade', v: selectedDespesa.quantidade || 1 },
                  { l: 'Valor Unitário', v: fmt(selectedDespesa.valor_unitario || selectedDespesa.valor || 0) },
                  { l: 'Fonte Pagamento', v: selectedDespesa.fonte_pagamento || '-' },
                  { l: 'Data', v: selectedDespesa.data ? new Date(selectedDespesa.data).toLocaleDateString('pt-BR') : '-' },
                ].map((f, i) => (
                  <div key={i} className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-blue-300 m-0 mb-1" style={{ fontSize: 9 }}>{f.l}</p>
                    <p className="text-sm font-bold text-gray-800 m-0">{f.v}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => editarDespesa(selectedDespesa)} className="flex-1 py-2.5 rounded-xl text-xs font-extrabold text-white border-none cursor-pointer"
                  style={{ background: 'var(--gradient-info)', boxShadow: '0 4px 16px rgba(124,58,237,0.2)' }}>✏️ Editar</button>
                <button onClick={() => toggleDespesaStatus(selectedDespesa.id)} className="py-2.5 px-5 rounded-xl text-xs font-extrabold border border-green-200 bg-green-50 text-green-700 cursor-pointer">
                  {selectedDespesa.situacao === 'pago' ? '↩ Marcar Pendente' : '✓ Marcar como Pago'}
                </button>
                <button onClick={() => { deletarDespesa(selectedDespesa.id); setSelectedId(null) }} className="py-2.5 px-5 rounded-xl text-xs font-extrabold border border-red-200 bg-red-50 text-red-600 cursor-pointer">🗑 Excluir</button>
              </div>
            </div>
          )}

          {/* Total Bar */}
          <div className="rounded-2xl px-6 py-4 flex justify-between items-center text-white"
            style={{ background: 'var(--gradient-info)' }}>
            <span className="text-sm font-extrabold opacity-80">TOTAL GERAL • {despesas.length} itens</span>
            <span className="text-xl font-extrabold">{fmt(totalDespesas)}</span>
          </div>
        </div>
      )}

      {/* =================== RECEITAS VIEW =================== */}
      {view === 'receitas' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl overflow-hidden border border-blue-200 shadow-sm">
            <div className="p-4 border-b border-blue-100 flex items-center justify-between bg-blue-50">
              <h3 className="font-extrabold text-blue-700">Recebimentos</h3>
              <button onClick={() => setShowRecForm(true)} className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
                style={{ background: 'var(--gradient-info)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
                <Plus size={14} /> Adicionar
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50"><tr>
                  {['Descrição', 'Centro', 'Valor', 'Situação', 'Conta', 'Data', ''].map((h, i) => (
                    <th key={i} className={'px-4 py-2.5 text-blue-300 uppercase font-extrabold tracking-wider ' + (i === 2 ? 'text-right' : i === 3 ? 'text-center' : 'text-left')}
                      style={{ fontSize: 9 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {receitas.map(r => (
                    <tr key={r.id} className="border-t border-gray-50 hover:bg-blue-50 transition-colors">
                      <td className="px-4 py-2.5 text-sm font-bold text-gray-800">{r.descricao}</td>
                      <td className="px-4 py-2.5"><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{r.centro_custo}</span></td>
                      <td className="px-4 py-2.5 text-sm text-right font-extrabold text-green-600">{fmt(r.valor)}</td>
                      <td className="px-4 py-2.5 text-center"><span className={'text-xs px-2.5 py-1 rounded-full font-bold ' + (r.situacao === 'RECEBIDO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700')}>{r.situacao}</span></td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{r.conta || '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{r.data_pagamento ? new Date(r.data_pagamento).toLocaleDateString('pt-BR') : '-'}</td>
                      <td className="px-4 py-2.5 text-center"><button onClick={() => delReceita(r.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
                  {receitas.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Nenhum recebimento</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-3 bg-blue-50 border-t border-blue-200 flex justify-between items-center">
              <span className="font-extrabold text-blue-600 uppercase text-xs">Total Recebimentos</span>
              <span className="font-extrabold text-lg text-green-600">{fmt(totalReceitas)}</span>
            </div>
          </div>
        </div>
      )}

      {/* =================== CONTAS VIEW =================== */}
      {view === 'contas' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl overflow-hidden border border-blue-200 shadow-sm">
            <div className="p-4 border-b border-blue-100 flex items-center justify-between bg-blue-50">
              <h3 className="font-extrabold text-blue-700">Contas / Fontes de Pagamento</h3>
              <button onClick={() => setShowContaForm(!showContaForm)} className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
                style={{ background: 'var(--gradient-info)', boxShadow: '0 4px 16px rgba(37,99,235,0.25)' }}>
                <Plus size={14} /> Adicionar Conta
              </button>
            </div>
            {showContaForm && (
              <form onSubmit={addConta} className="p-4 bg-blue-50 border-b border-blue-100 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input placeholder="Nome da conta *" value={novaConta.nome} onChange={e => setNovaConta({ ...novaConta, nome: e.target.value })} required className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                  <select value={novaConta.tipo} onChange={e => setNovaConta({ ...novaConta, tipo: e.target.value })} className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm bg-white outline-none">
                    <option value="banco">Conta Bancária</option><option value="socio">Sócio</option><option value="empresa">Empresa</option><option value="caixa">Caixa</option><option value="outro">Outro</option>
                  </select>
                  <input placeholder="Titular / Responsável" value={novaConta.titular} onChange={e => setNovaConta({ ...novaConta, titular: e.target.value })} className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-blue-400 mb-1 font-bold">Percentual (%)</label>
                    <input type="number" step="0.01" min="0" max="100" placeholder="Ex: 50" value={novaConta.percentual} onChange={e => setNovaConta({ ...novaConta, percentual: e.target.value })} className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm bg-white outline-none focus:border-blue-400" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="px-4 py-2 rounded-xl text-sm font-bold text-white border-none cursor-pointer" style={{ background: 'var(--gradient-info)' }}>Salvar</button>
                  <button type="button" onClick={() => setShowContaForm(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-bold cursor-pointer border-none">Cancelar</button>
                </div>
              </form>
            )}
            <div className="divide-y divide-blue-50">
              {contas.map(c => {
                const despConta = despesas.filter(d => d.fonte_pagamento === c.nome)
                const totalPg = despConta.reduce((s, d) => s + Number(d.valor || 0), 0)
                const qtdComprovantes = despConta.filter(d => d.comprovante_url).length
                return (
                  <div key={c.id} className="px-5 py-4 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-lg">
                          {c.tipo === 'banco' ? '🏦' : c.tipo === 'socio' ? '👤' : c.tipo === 'empresa' ? '🏢' : c.tipo === 'caixa' ? '💵' : '📋'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-800">{c.nome}</p>
                          <div className="flex gap-2 mt-0.5">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">{c.tipo}</span>
                            {c.titular && <span className="text-xs text-gray-400">{c.titular}</span>}
                            {c.percentual > 0 && <span className="text-xs font-extrabold text-blue-600">{c.percentual}%</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 items-center">
                        <button onClick={() => setEditConta({ id: c.id, nome: c.nome, tipo: c.tipo, titular: c.titular, percentual: c.percentual || 0 })} className="text-blue-400 hover:text-blue-600 text-xs font-bold">Editar</button>
                        <button onClick={() => delConta(c.id)} className="text-red-300 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                )
              })}
              {contas.length === 0 && <div className="px-4 py-8 text-center text-gray-400">Nenhuma conta cadastrada.</div>}
            </div>
          </div>
        </div>
      )}

      {/* =================== MODALS =================== */}
      {editConta && (
        <Modal open={!!editConta} onClose={() => setEditConta(null)} title="Editar Conta">
          <div className="space-y-3">
            <input placeholder="Nome *" value={editConta.nome} onChange={e => setEditConta({ ...editConta, nome: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <div className="grid grid-cols-2 gap-3">
              <select value={editConta.tipo} onChange={e => setEditConta({ ...editConta, tipo: e.target.value })} className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="banco">Conta Bancária</option><option value="socio">Sócio</option><option value="empresa">Empresa</option><option value="caixa">Caixa</option><option value="outro">Outro</option>
              </select>
              <input placeholder="Titular" value={editConta.titular} onChange={e => setEditConta({ ...editConta, titular: e.target.value })} className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-blue-400 mb-1 font-bold">Percentual (%)</label>
              <input type="number" step="0.01" min="0" max="100" value={editConta.percentual} onChange={e => setEditConta({ ...editConta, percentual: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
            <button onClick={salvarEditConta} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer" style={{ background: 'var(--gradient-info)' }}>Salvar</button>
          </div>
        </Modal>
      )}

      {showEncontro && encontro && (
        <Modal open={showEncontro} onClose={() => setShowEncontro(false)} title="Encontro de Contas">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
                <p className="text-xs text-green-600 font-bold">Receitas</p>
                <p className="text-lg font-extrabold text-green-700">{fmt(encontro.total_receitas)}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center border border-red-200">
                <p className="text-xs text-red-600 font-bold">Despesas</p>
                <p className="text-lg font-extrabold text-red-700">{fmt(encontro.total_despesas)}</p>
              </div>
              <div className={'rounded-xl p-3 text-center border ' + (encontro.lucro >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200')}>
                <p className={'text-xs font-bold ' + (encontro.lucro >= 0 ? 'text-blue-600' : 'text-red-600')}>{encontro.lucro >= 0 ? 'Lucro' : 'Prejuízo'}</p>
                <p className={'text-lg font-extrabold ' + (encontro.lucro >= 0 ? 'text-blue-700' : 'text-red-700')}>{fmt(Math.abs(encontro.lucro))}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b">
                  {['Conta', '%', 'Pagou', 'Recebeu', 'Parte Lucro', 'Saldo Final'].map((h, i) => (
                    <th key={i} className={'px-3 py-2 text-blue-300 uppercase font-extrabold ' + (i >= 2 ? 'text-right' : i === 1 ? 'text-center' : 'text-left')} style={{ fontSize: 9 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {encontro.contas.map(c => (
                    <tr key={c.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-sm"><span className="font-bold text-gray-800">{c.nome}</span>{c.titular && <span className="text-xs text-gray-400 ml-1">({c.titular})</span>}</td>
                      <td className="px-3 py-2 text-sm text-center font-extrabold text-blue-600">{c.percentual}%</td>
                      <td className="px-3 py-2 text-sm text-right text-red-600 font-bold">{fmt(c.pagou)}</td>
                      <td className="px-3 py-2 text-sm text-right text-green-600 font-bold">{fmt(c.recebeu)}</td>
                      <td className="px-3 py-2 text-sm text-right text-blue-600 font-bold">{fmt(c.lucro_parte)}</td>
                      <td className={'px-3 py-2 text-sm text-right font-extrabold ' + (c.saldo >= 0 ? 'text-green-700' : 'text-red-700')}>{fmt(c.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={exportarEncontro} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer"
              style={{ background: 'var(--gradient-info)' }}>
              <Download size={14} /> Exportar Encontro de Contas
            </button>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-xs text-blue-600"><strong>Como funciona:</strong> Parte do Lucro/Prejuízo = Resultado x % da conta. Saldo = Parte do Lucro + O que Pagou - O que Recebeu. Saldo positivo = tem a receber do evento. Saldo negativo = deve pagar ao evento.</p>
            </div>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null) }} title={editId ? 'Editar Despesa' : 'Nova Despesa'}>
          <form onSubmit={salvarDespesa} className="space-y-3">
            <input placeholder="Descrição *" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} required className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Quantidade</label>
                <input type="number" step="0.01" value={form.quantidade} onChange={e => { const q = e.target.value; setForm(prev => ({ ...prev, quantidade: q, valor: (parseFloat(q) || 1) * (parseFloat(prev.valor_unitario) || 0) })) }} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Valor unitário</label>
                <input type="number" step="0.01" value={form.valor_unitario} onChange={e => { const v = e.target.value; setForm(prev => ({ ...prev, valor_unitario: v, valor: (parseFloat(prev.quantidade) || 1) * (parseFloat(v) || 0) })) }} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Valor total</label>
                <input type="number" step="0.01" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm bg-blue-50 font-extrabold outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Categoria</label>
                <select value={form.centro_custo} onChange={e => setForm({ ...form, centro_custo: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none">
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Conta / Fonte pagamento</label>
                <select value={form.fonte_pagamento} onChange={e => setForm({ ...form, fonte_pagamento: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none">
                  <option value="">Selecione</option>
                  {contas.length > 0 && <optgroup label="Contas do evento">{contas.map(c => <option key={c.id} value={c.nome}>{c.nome}{c.titular ? ' (' + c.titular + ')' : ''}</option>)}</optgroup>}
                  <optgroup label="Outros">{fontePagamentoBase.map(f => <option key={f} value={f}>{f}</option>)}</optgroup>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Status</label>
                <select value={form.situacao} onChange={e => setForm({ ...form, situacao: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none">
                  <option value="pendente">Pendente</option><option value="pago">Pago</option><option value="parcial">Parcial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Data</label>
                <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
            </div>
            <input placeholder="Fornecedor" value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer" style={{ background: 'var(--gradient-info)' }}>{editId ? 'Atualizar' : 'Adicionar'}</button>
          </form>
        </Modal>
      )}

      {showRecForm && (
        <Modal open={showRecForm} onClose={() => setShowRecForm(false)} title="Nova Receita">
          <form onSubmit={salvarReceita} className="space-y-3">
            <input placeholder="Descrição *" value={recForm.descricao} onChange={e => setRecForm({ ...recForm, descricao: e.target.value })} required className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Conta</label>
                <select value={recForm.centro_custo} onChange={e => setRecForm({ ...recForm, centro_custo: e.target.value })} className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none">
                  <option value="Outro">Selecione a conta</option>
                  {contas.map(c => <option key={c.id} value={c.nome}>{c.nome}{c.titular ? ' (' + c.titular + ')' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-blue-400 mb-1 font-bold">Valor *</label>
                <input type="number" step="0.01" value={recForm.valor} onChange={e => setRecForm({ ...recForm, valor: e.target.value })} required className="w-full border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <select value={recForm.situacao} onChange={e => setRecForm({ ...recForm, situacao: e.target.value })} className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="pendente">Pendente</option><option value="RECEBIDO">Recebido</option>
              </select>
              <select value={recForm.conta} onChange={e => setRecForm({ ...recForm, conta: e.target.value })} className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none">
                <option value="">Conta</option>
                {['SICREDI', 'YAWPAY', 'PIX', 'DINHEIRO', 'CARTAO'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" value={recForm.data_pagamento} onChange={e => setRecForm({ ...recForm, data_pagamento: e.target.value })} className="border-2 border-blue-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl text-sm font-bold text-white border-none cursor-pointer" style={{ background: 'var(--gradient-info)' }}>Adicionar Receita</button>
          </form>
        </Modal>
      )}
    </div>
  )
}
