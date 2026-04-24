import { useState, useEffect, useRef } from 'react'
import { Trash2, History, MoreHorizontal, Upload, Download, Check, FileSpreadsheet } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const CENTROS_DESPESA = [
  'Artistico', 'Estrutura do Evento',
  'Divulgacao e Midia', 'Documentacao e Taxas', 'Operacional',
  'Bar', 'Open Bar', 'Alimentacao', 'Outros'
]

function fmt(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function parseMoney(s) {
  if (typeof s === 'number') return s
  if (!s) return 0
  const n = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(n) || 0
}
function parseNum(s) {
  if (s == null || s === '') return null
  if (typeof s === 'number') return s
  const n = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  const f = parseFloat(n)
  return isNaN(f) ? null : f
}

export default function ProjecaoTab({ eventoId }) {
  const [itens, setItens] = useState([])
  const [resumo, setResumo] = useState({ despesa: { projetado: 0, realizado: 0, fora_projecao: 0 }, receita: { projetado: 0, realizado: 0, fora_projecao: 0 } })
  const [loading, setLoading] = useState(true)
  const [showImport, setShowImport] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [historico, setHistorico] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const fileRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => { carregar() }, [eventoId])

  useEffect(() => {
    function onDocClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    if (menuOpen) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [menuOpen])

  async function carregar() {
    setLoading(true)
    try {
      const [a, b] = await Promise.all([
        api.get('/eventos/' + eventoId + '/projecoes'),
        api.get('/eventos/' + eventoId + '/projecoes/resumo')
      ])
      setItens(a.data)
      setResumo(b.data)
    } catch { toast.error('Erro ao carregar projeção') }
    finally { setLoading(false) }
  }

  async function recarregarResumo() {
    try {
      const { data } = await api.get('/eventos/' + eventoId + '/projecoes/resumo')
      setResumo(data)
    } catch { /* silencioso — resumo atualiza no próximo carregar */ }
  }

  async function criarItem(tipo, dados) {
    try {
      const payload = {
        tipo,
        centro_custo: dados.centro_custo || (tipo === 'despesa' ? 'Outros' : 'Outro'),
        descricao: dados.descricao || '',
        fornecedor_previsto: dados.fornecedor_previsto || '',
        valor_projetado: dados.valor_projetado || 0,
        quantidade: dados.quantidade ?? null,
        valor_unitario: dados.valor_unitario ?? null
      }
      const { data } = await api.post('/eventos/' + eventoId + '/projecoes', payload)
      setItens(prev => [...prev, { ...data, valor_realizado: 0, valor_a_pagar: 0 }])
      recarregarResumo()
      return data
    } catch { toast.error('Erro ao adicionar'); return null }
  }

  async function atualizarCampo(id, campo, valor) {
    const item = itens.find(i => i.id === id)
    if (!item) return
    const antes = item[campo]
    if (antes === valor) return
    setItens(prev => prev.map(i => {
      if (i.id !== id) return i
      const upd = { ...i, [campo]: valor }
      if (campo === 'quantidade' || campo === 'valor_unitario') {
        const q = upd.quantidade
        const vu = upd.valor_unitario
        if (q != null && q !== '' && vu != null && vu !== '') {
          upd.valor_projetado = Number(q) * Number(vu)
        }
      }
      return upd
    }))
    try {
      const { data } = await api.patch('/projecoes/' + id, { [campo]: valor })
      setItens(prev => prev.map(i => i.id === id ? { ...i, ...data, valor_realizado: i.valor_realizado, valor_a_pagar: i.valor_a_pagar } : i))
      if (campo === 'valor_projetado' || campo === 'quantidade' || campo === 'valor_unitario') recarregarResumo()
    } catch {
      toast.error('Erro ao salvar')
      setItens(prev => prev.map(i => i.id === id ? { ...i, [campo]: antes } : i))
    }
  }

  async function removerItem(id) {
    if (!confirm('Remover este item da projeção? Despesas/receitas já lançadas perdem o vínculo mas não são deletadas.')) return
    try {
      await api.delete('/projecoes/' + id)
      setItens(prev => prev.filter(i => i.id !== id))
      recarregarResumo()
    } catch { toast.error('Erro ao remover') }
  }

  async function verHistorico(item) {
    try {
      const { data } = await api.get('/projecoes/' + item.id + '/historico')
      setHistorico({ item, revisoes: data })
    } catch { toast.error('Erro ao carregar histórico') }
  }

  async function exportarExcel() {
    try {
      const token = localStorage.getItem('token')
      const resp = await fetch('/api/eventos/' + eventoId + '/projecoes/exportar', { headers: { 'Authorization': 'Bearer ' + token } })
      if (!resp.ok) throw new Error('Erro')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'projecao_evento_' + eventoId + '.xlsx'; a.click()
      URL.revokeObjectURL(url)
      toast.success('Planilha exportada!')
    } catch { toast.error('Erro ao exportar Excel') }
  }

  function exportarCSV() {
    const header = 'tipo,centro_custo,descricao,fornecedor_previsto,quantidade,valor_unitario,valor_projetado,observacoes\n'
    const rows = itens.map(i => [
      i.tipo,
      (i.centro_custo || '').replace(/,/g, ';'),
      (i.descricao || '').replace(/,/g, ';'),
      (i.fornecedor_previsto || '').replace(/,/g, ';'),
      i.quantidade != null ? Number(i.quantidade).toString() : '',
      i.valor_unitario != null ? Number(i.valor_unitario).toFixed(2) : '',
      Number(i.valor_projetado || 0).toFixed(2),
      (i.observacoes || '').replace(/,/g, ';')
    ].join(',')).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'projecao_evento_' + eventoId + '.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  async function importarCSV(text) {
    const linhas = text.split(/\r?\n/).filter(l => l.trim())
    if (!linhas.length) { toast.error('CSV vazio'); return }
    const header = linhas[0].toLowerCase().split(',').map(s => s.trim())
    const idx = {
      tipo: header.indexOf('tipo'),
      centro_custo: header.indexOf('centro_custo'),
      descricao: header.indexOf('descricao'),
      fornecedor_previsto: header.indexOf('fornecedor_previsto'),
      quantidade: header.indexOf('quantidade'),
      valor_unitario: header.indexOf('valor_unitario'),
      valor_projetado: header.indexOf('valor_projetado'),
      observacoes: header.indexOf('observacoes')
    }
    if (idx.tipo < 0 || idx.descricao < 0 || idx.valor_projetado < 0) {
      toast.error('CSV precisa ter colunas: tipo, descricao, valor_projetado (mínimo)')
      return
    }
    const itens = linhas.slice(1).map(l => {
      const c = l.split(',')
      return {
        tipo: (c[idx.tipo] || '').trim().toLowerCase(),
        centro_custo: idx.centro_custo >= 0 ? (c[idx.centro_custo] || '').trim() : '',
        descricao: (c[idx.descricao] || '').trim(),
        fornecedor_previsto: idx.fornecedor_previsto >= 0 ? (c[idx.fornecedor_previsto] || '').trim() : '',
        quantidade: idx.quantidade >= 0 ? parseNum(c[idx.quantidade]) : null,
        valor_unitario: idx.valor_unitario >= 0 ? parseMoney(c[idx.valor_unitario] || 0) || null : null,
        valor_projetado: parseMoney(c[idx.valor_projetado] || 0),
        observacoes: idx.observacoes >= 0 ? (c[idx.observacoes] || '').trim() : ''
      }
    }).filter(i => i.descricao && (i.tipo === 'despesa' || i.tipo === 'receita'))
    if (!itens.length) { toast.error('Nenhuma linha válida'); return }
    try {
      const { data } = await api.post('/eventos/' + eventoId + '/projecoes/bulk', { itens })
      toast.success(data.inseridos + ' itens importados')
      setShowImport(false); setCsvText('')
      carregar()
    } catch { toast.error('Erro ao importar') }
  }

  function onFileUpload(e) {
    const f = e.target.files[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => importarCSV(String(reader.result))
    reader.readAsText(f, 'utf-8')
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div></div>

  const despesas = itens.filter(i => i.tipo === 'despesa')
  const receitas = itens.filter(i => i.tipo === 'receita')

  const despesaSet = new Set(CENTROS_DESPESA)
  const despesasOrfas = despesas.filter(i => !despesaSet.has(i.centro_custo || ''))

  const lucroProjetado = resumo.receita.projetado - resumo.despesa.projetado
  const lucroRealizado = (resumo.receita.realizado + resumo.receita.fora_projecao) - (resumo.despesa.realizado + resumo.despesa.fora_projecao)

  return (
    <div className="space-y-4">
      {/* Resumo compacto + menu */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 flex-wrap">
          <ResumoItem label="Receita projetada" value={fmt(resumo.receita.projetado)} sub={'realiz. ' + fmt(resumo.receita.realizado + resumo.receita.fora_projecao)} />
          <ResumoItem label="Despesa projetada" value={fmt(resumo.despesa.projetado)} sub={'realiz. ' + fmt(resumo.despesa.realizado + resumo.despesa.fora_projecao)} />
          <ResumoItem label="Lucro projetado" value={fmt(lucroProjetado)} danger={lucroProjetado < 0} />
          <ResumoItem label="Lucro atual" value={fmt(lucroRealizado)} sub={lucroProjetado !== 0 ? (((lucroRealizado - lucroProjetado) / Math.abs(lucroProjetado)) * 100).toFixed(0) + '% vs projetado' : null} danger={lucroRealizado < 0} />
        </div>
        <div className="relative" ref={menuRef}>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFileUpload} />
          <button onClick={() => setMenuOpen(o => !o)} className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50" title="Mais ações">
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10 overflow-hidden">
              <button onClick={() => { setMenuOpen(false); fileRef.current?.click() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <Upload size={14} /> Importar CSV
              </button>
              <button onClick={() => { setMenuOpen(false); setShowImport(true) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <Upload size={14} /> Colar CSV
              </button>
              <button onClick={() => { setMenuOpen(false); exportarExcel() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <FileSpreadsheet size={14} /> Exportar Excel
              </button>
              <button onClick={() => { setMenuOpen(false); exportarCSV() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <Download size={14} /> Exportar CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Despesas — um bloco por centro de custo */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Despesas</h2>
          <span className="text-[11px] text-gray-400">Projetado {fmt(resumo.despesa.projetado)} · Realizado {fmt(resumo.despesa.realizado + resumo.despesa.fora_projecao)}</span>
        </div>
        {CENTROS_DESPESA.map(centro => (
          <BlocoCentro
            key={'d-' + centro}
            tipo="despesa"
            centro={centro}
            itens={despesas.filter(i => (i.centro_custo || '') === centro)}
            onCreate={(dados) => criarItem('despesa', { ...dados, centro_custo: centro })}
            onUpdate={atualizarCampo}
            onRemove={removerItem}
            onHistorico={verHistorico}
          />
        ))}
        {despesasOrfas.length > 0 && (
          <BlocoCentro
            tipo="despesa"
            centro=""
            titulo="Sem categoria"
            itens={despesasOrfas}
            onUpdate={atualizarCampo}
            onRemove={removerItem}
            onHistorico={verHistorico}
          />
        )}
        {resumo.despesa.fora_projecao > 0 && (
          <p className="px-2 text-[11px] text-amber-700 italic">Realizado fora da projeção (sem vínculo): {fmt(resumo.despesa.fora_projecao)}</p>
        )}
      </section>

      {/* Receitas — bloco único */}
      <section className="space-y-2">
        <BlocoCentro
          tipo="receita"
          centro=""
          titulo="Receitas"
          itens={receitas}
          onCreate={(dados) => criarItem('receita', { ...dados, centro_custo: '' })}
          onUpdate={atualizarCampo}
          onRemove={removerItem}
          onHistorico={verHistorico}
        />
        {resumo.receita.fora_projecao > 0 && (
          <p className="px-2 text-[11px] text-amber-700 italic">Realizado fora da projeção (sem vínculo): {fmt(resumo.receita.fora_projecao)}</p>
        )}
      </section>

      {/* Modal colar CSV */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-base mb-2 text-gray-900">Colar CSV</h3>
            <p className="text-xs text-gray-500 mb-3">Colunas: <code className="bg-gray-100 px-1 rounded">tipo,centro_custo,descricao,fornecedor_previsto,quantidade,valor_unitario,valor_projetado,observacoes</code>. Se qtd e valor_unit estiverem preenchidos, total = qtd × valor_unit.</p>
            <textarea
              value={csvText} onChange={e => setCsvText(e.target.value)}
              placeholder="tipo,centro_custo,descricao,fornecedor_previsto,quantidade,valor_unitario,valor_projetado,observacoes&#10;despesa,Bar,Cerveja lata,Ambev,500,12,6000,&#10;despesa,Artistico,DJ X,,1,12000,12000,&#10;receita,,Ingressos,,500,160,80000,"
              className="w-full h-48 border border-gray-200 rounded-lg p-2 text-xs font-mono outline-none focus:border-gray-400"
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setShowImport(false)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">Cancelar</button>
              <button onClick={() => importarCSV(csvText)} className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800">Importar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal histórico */}
      {historico && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setHistorico(null)}>
          <div className="bg-white rounded-xl max-w-xl w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-base text-gray-900">Histórico — {historico.item.descricao}</h3>
            <p className="text-xs text-gray-500 mb-4">Valor atual: {fmt(historico.item.valor_projetado)}</p>
            {historico.revisoes.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nenhuma revisão registrada ainda.</p>
            ) : (
              <table className="w-full text-sm">
                <thead><tr className="text-[10px] uppercase tracking-wide text-gray-500 font-medium border-b border-gray-100"><th className="text-left py-1.5">Quando</th><th className="text-right py-1.5">Antes</th><th className="text-right py-1.5">Depois</th><th className="text-left py-1.5 pl-3">Motivo</th></tr></thead>
                <tbody>
                  {historico.revisoes.map(h => (
                    <tr key={h.id} className="border-b border-gray-100 last:border-0">
                      <td className="py-1.5 text-gray-600">{new Date(h.alterado_em).toLocaleString('pt-BR')}</td>
                      <td className="py-1.5 text-right text-gray-500">{fmt(h.valor_antes)}</td>
                      <td className="py-1.5 text-right font-medium text-gray-900">{fmt(h.valor_depois)}</td>
                      <td className="py-1.5 pl-3 text-gray-700">{h.motivo || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="flex justify-end mt-4">
              <button onClick={() => setHistorico(null)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResumoItem({ label, value, sub, danger }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={'text-base font-semibold ' + (danger ? 'text-red-600' : 'text-gray-900')}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  )
}

function BlocoCentro({ titulo, tipo, centro, itens, onCreate, onUpdate, onRemove, onHistorico }) {
  const totalProjetado = itens.reduce((s, i) => s + Number(i.valor_projetado || 0), 0)
  const totalRealizado = itens.reduce((s, i) => s + Number(i.valor_realizado || 0), 0)
  const totalAPagar = itens.reduce((s, i) => s + Number(i.valor_a_pagar || 0), 0)
  const variacao = totalRealizado - totalProjetado
  const ehDespesa = tipo === 'despesa'
  const nome = titulo || centro
  const temItens = itens.length > 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="font-semibold text-gray-900 text-sm">{nome}</h3>
          <span className="text-[11px] text-gray-400">
            {temItens ? itens.length + ' ' + (itens.length === 1 ? 'item' : 'itens') + ' · ' + fmt(totalProjetado) : 'vazio'}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[32%]">Descrição</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[18%]">Fornecedor</th>
              <th className="px-2 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[8%]">Qtd</th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[10%]">Valor Unit</th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[11%]">Projetado</th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[8%]">Realizado</th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[8%]">Variação</th>
              <th className="px-2 py-2 w-[5%]"></th>
            </tr>
          </thead>
          <tbody>
            {itens.map(i => (
              <LinhaItem key={i.id} item={i} ehDespesa={ehDespesa} onUpdate={onUpdate} onRemove={onRemove} onHistorico={onHistorico} />
            ))}
            {onCreate && <LinhaNova centro={centro} onCreate={onCreate} />}
          </tbody>
          {temItens && (
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-3 py-2 text-xs text-gray-500 font-medium" colSpan={4}>Subtotal</td>
                <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(totalProjetado)}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-700">{fmt(totalRealizado)}</td>
                <td className={'px-3 py-2 text-right font-semibold ' + (variacao === 0 ? 'text-gray-400' : (ehDespesa ? (variacao > 0 ? 'text-red-600' : 'text-green-600') : (variacao > 0 ? 'text-green-600' : 'text-red-600')))}>
                  {variacao === 0 ? '—' : (variacao > 0 ? '+' : '') + fmt(variacao)}
                </td>
                <td></td>
              </tr>
              {totalAPagar > 0 && (
                <tr className="bg-gray-50 border-t border-gray-100">
                  <td className="px-3 py-1.5 text-[11px] text-gray-600" colSpan={6}>A pagar</td>
                  <td className="px-3 py-1.5 text-right text-[11px] font-medium text-gray-700">{fmt(totalAPagar)}</td>
                  <td></td>
                </tr>
              )}
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

function LinhaItem({ item, ehDespesa, onUpdate, onRemove, onHistorico }) {
  const proj = Number(item.valor_projetado || 0)
  const real = Number(item.valor_realizado || 0)
  const vari = real - proj
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/60">
      <td className="px-3 py-1.5"><CellText value={item.descricao || ''} onSave={v => onUpdate(item.id, 'descricao', v)} /></td>
      <td className="px-3 py-1.5"><CellText value={item.fornecedor_previsto || ''} onSave={v => onUpdate(item.id, 'fornecedor_previsto', v)} placeholder="—" /></td>
      <td className="px-2 py-1.5 text-right"><CellNumber value={item.quantidade} onSave={v => onUpdate(item.id, 'quantidade', v)} /></td>
      <td className="px-3 py-1.5 text-right"><CellMoney value={item.valor_unitario} onSave={v => onUpdate(item.id, 'valor_unitario', v)} nullable /></td>
      <td className="px-3 py-1.5 text-right"><CellMoney value={proj} onSave={v => onUpdate(item.id, 'valor_projetado', v)} /></td>
      <td className="px-3 py-1.5 text-right text-sm text-gray-600">{fmt(real)}</td>
      <td className={'px-3 py-1.5 text-right text-sm font-medium ' + (vari === 0 ? 'text-gray-400' : (ehDespesa ? (vari > 0 ? 'text-red-600' : 'text-green-600') : (vari > 0 ? 'text-green-600' : 'text-red-600')))}>
        {vari === 0 ? '—' : (vari > 0 ? '+' : '') + fmt(vari)}
      </td>
      <td className="px-2 py-1.5 text-right">
        <div className="inline-flex gap-0.5">
          <button onClick={() => onHistorico(item)} title="Histórico" className="p-1 text-gray-300 hover:text-gray-700 rounded"><History size={13} /></button>
          <button onClick={() => onRemove(item.id)} title="Remover" className="p-1 text-gray-300 hover:text-red-600 rounded"><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  )
}

function LinhaNova({ centro, onCreate }) {
  const [draft, setDraft] = useState({ descricao: '', fornecedor_previsto: '', quantidade: '', valor_unitario: '', valor_projetado: '' })
  const [saving, setSaving] = useState(false)
  const descRef = useRef(null)

  const qtdNum = parseNum(draft.quantidade)
  const vuNum = parseNum(draft.valor_unitario)
  const totalCalc = (qtdNum != null && vuNum != null) ? qtdNum * vuNum : null
  const totalFinal = totalCalc != null ? totalCalc : parseMoney(draft.valor_projetado)

  async function salvar(focusDesc = true) {
    if (!draft.descricao.trim()) return
    setSaving(true)
    const ok = await onCreate({
      descricao: draft.descricao.trim(),
      centro_custo: centro,
      fornecedor_previsto: draft.fornecedor_previsto.trim(),
      quantidade: qtdNum,
      valor_unitario: vuNum,
      valor_projetado: totalFinal
    })
    setSaving(false)
    if (ok) {
      setDraft({ descricao: '', fornecedor_previsto: '', quantidade: '', valor_unitario: '', valor_projetado: '' })
      if (focusDesc) setTimeout(() => descRef.current?.focus(), 50)
    }
  }

  function onKey(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      salvar(true)
    }
  }

  const pronto = draft.descricao.trim().length > 0

  return (
    <tr className="border-b border-gray-100 bg-gray-50/40">
      <td className="px-3 py-1.5">
        <input ref={descRef} value={draft.descricao} onChange={e => setDraft(d => ({ ...d, descricao: e.target.value }))} onKeyDown={onKey}
          placeholder="+ Nova linha — descrição..."
          className="w-full bg-transparent text-sm px-1 py-0.5 rounded border-0 placeholder:text-gray-400 placeholder:italic focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none" />
      </td>
      <td className="px-3 py-1.5">
        <input value={draft.fornecedor_previsto} onChange={e => setDraft(d => ({ ...d, fornecedor_previsto: e.target.value }))} onKeyDown={onKey}
          placeholder="—"
          className="w-full bg-transparent text-sm px-1 py-0.5 rounded border-0 placeholder:text-gray-300 focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none" />
      </td>
      <td className="px-2 py-1.5 text-right">
        <input value={draft.quantidade} onChange={e => setDraft(d => ({ ...d, quantidade: e.target.value }))} onKeyDown={onKey}
          placeholder="—"
          className="w-full bg-transparent text-sm text-right px-1 py-0.5 rounded border-0 placeholder:text-gray-300 focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none" />
      </td>
      <td className="px-3 py-1.5 text-right">
        <input value={draft.valor_unitario} onChange={e => setDraft(d => ({ ...d, valor_unitario: e.target.value }))} onKeyDown={onKey}
          placeholder="—"
          className="w-full bg-transparent text-sm text-right px-1 py-0.5 rounded border-0 placeholder:text-gray-300 focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none" />
      </td>
      <td className="px-3 py-1.5 text-right">
        {totalCalc != null ? (
          <span className="text-sm text-gray-500 italic" title="Calculado (Qtd × Valor Unit)">{fmt(totalCalc)}</span>
        ) : (
          <input value={draft.valor_projetado} onChange={e => setDraft(d => ({ ...d, valor_projetado: e.target.value }))} onKeyDown={onKey}
            placeholder="0,00"
            className="w-full bg-transparent text-sm text-right px-1 py-0.5 rounded border-0 placeholder:text-gray-300 focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none" />
        )}
      </td>
      <td></td>
      <td></td>
      <td className="px-2 py-1.5 text-right">
        <button onClick={() => salvar(true)} disabled={!pronto || saving} title="Adicionar (Enter)"
          className={'p-1 rounded ' + (pronto && !saving ? 'text-gray-700 hover:bg-white' : 'text-gray-300 cursor-not-allowed')}>
          <Check size={13} />
        </button>
      </td>
    </tr>
  )
}

function CellText({ value, onSave, placeholder = '' }) {
  const [v, setV] = useState(value)
  useEffect(() => { setV(value) }, [value])
  return (
    <input
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      placeholder={placeholder}
      className="w-full bg-transparent px-1 py-0.5 rounded border-0 placeholder:text-gray-300 hover:bg-white focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none text-sm"
    />
  )
}

function CellMoney({ value, onSave, nullable = false }) {
  const toStr = (x) => (x == null || x === '') ? '' : Number(x).toString().replace('.', ',')
  const [v, setV] = useState(toStr(value))
  useEffect(() => { setV(toStr(value)) }, [value])
  return (
    <input
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => {
        if (nullable && !v.trim()) {
          if (value != null && value !== '') onSave(null)
          return
        }
        const parsed = parseMoney(v)
        if (parsed !== Number(value || 0)) onSave(parsed)
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      placeholder={nullable ? '—' : '0,00'}
      className="w-full bg-transparent text-right px-1 py-0.5 rounded border-0 placeholder:text-gray-300 hover:bg-white focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none text-sm"
    />
  )
}

function CellNumber({ value, onSave }) {
  const toStr = (x) => (x == null || x === '') ? '' : Number(x).toString().replace('.', ',')
  const [v, setV] = useState(toStr(value))
  useEffect(() => { setV(toStr(value)) }, [value])
  return (
    <input
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => {
        if (!v.trim()) {
          if (value != null && value !== '') onSave(null)
          return
        }
        const parsed = parseNum(v)
        if (parsed !== (value == null ? null : Number(value))) onSave(parsed)
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      placeholder="—"
      className="w-full bg-transparent text-right px-1 py-0.5 rounded border-0 placeholder:text-gray-300 hover:bg-white focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none text-sm"
    />
  )
}

