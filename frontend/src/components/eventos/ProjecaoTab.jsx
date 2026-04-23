import { Fragment, useState, useEffect, useRef } from 'react'
import { Trash2, History, MoreHorizontal, Upload, Download, Check } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const CENTROS_DESPESA = [
  'Artistico', 'Logistica/Camarim', 'Estrutura do Evento',
  'Divulgacao e Midia', 'Documentacao e Taxas', 'Operacional',
  'Bar', 'Open Bar', 'Alimentacao', 'Outros'
]
const CENTROS_RECEITA = [
  'Ingressos', 'BaladaAPP', 'Bar', 'Patrocinio', 'Camarote', '314', 'Outro'
]

function fmt(v) { return 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
function parseMoney(s) {
  if (typeof s === 'number') return s
  if (!s) return 0
  const n = String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
  return parseFloat(n) || 0
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

  async function criarItem(tipo, dados) {
    try {
      const payload = {
        tipo,
        centro_custo: dados.centro_custo || (tipo === 'despesa' ? 'Outros' : 'Outro'),
        descricao: dados.descricao || '',
        fornecedor_previsto: dados.fornecedor_previsto || '',
        valor_projetado: dados.valor_projetado || 0
      }
      const { data } = await api.post('/eventos/' + eventoId + '/projecoes', payload)
      setItens(prev => [...prev, { ...data, valor_realizado: 0, valor_a_pagar: 0 }])
      carregar()
      return data
    } catch { toast.error('Erro ao adicionar'); return null }
  }

  async function atualizarCampo(id, campo, valor) {
    const item = itens.find(i => i.id === id)
    if (!item) return
    const antes = item[campo]
    if (antes === valor) return
    setItens(prev => prev.map(i => i.id === id ? { ...i, [campo]: valor } : i))
    try {
      await api.patch('/projecoes/' + id, { [campo]: valor })
      if (campo === 'valor_projetado') carregar()
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
      carregar()
    } catch { toast.error('Erro ao remover') }
  }

  async function verHistorico(item) {
    try {
      const { data } = await api.get('/projecoes/' + item.id + '/historico')
      setHistorico({ item, revisoes: data })
    } catch { toast.error('Erro ao carregar histórico') }
  }

  function exportarCSV() {
    const header = 'tipo,centro_custo,descricao,fornecedor_previsto,valor_projetado,observacoes\n'
    const rows = itens.map(i => [
      i.tipo,
      (i.centro_custo || '').replace(/,/g, ';'),
      (i.descricao || '').replace(/,/g, ';'),
      (i.fornecedor_previsto || '').replace(/,/g, ';'),
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
              <button onClick={() => { setMenuOpen(false); exportarCSV() }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 text-left">
                <Download size={14} /> Exportar CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Despesas */}
      <Planilha
        titulo="Despesas"
        tipo="despesa"
        itens={despesas}
        centros={CENTROS_DESPESA}
        foraProjecao={resumo.despesa.fora_projecao}
        onCreate={(dados) => criarItem('despesa', dados)}
        onUpdate={atualizarCampo}
        onRemove={removerItem}
        onHistorico={verHistorico}
      />

      {/* Receitas */}
      <Planilha
        titulo="Receitas"
        tipo="receita"
        itens={receitas}
        centros={CENTROS_RECEITA}
        foraProjecao={resumo.receita.fora_projecao}
        onCreate={(dados) => criarItem('receita', dados)}
        onUpdate={atualizarCampo}
        onRemove={removerItem}
        onHistorico={verHistorico}
      />

      {/* Modal colar CSV */}
      {showImport && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-xl max-w-2xl w-full p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-base mb-2 text-gray-900">Colar CSV</h3>
            <p className="text-xs text-gray-500 mb-3">Colunas: <code className="bg-gray-100 px-1 rounded">tipo,centro_custo,descricao,fornecedor_previsto,valor_projetado,observacoes</code>. Tipo: <code className="bg-gray-100 px-1 rounded">despesa</code> ou <code className="bg-gray-100 px-1 rounded">receita</code>. Valor: <code className="bg-gray-100 px-1 rounded">1500</code> ou <code className="bg-gray-100 px-1 rounded">1500,00</code>.</p>
            <textarea
              value={csvText} onChange={e => setCsvText(e.target.value)}
              placeholder="tipo,centro_custo,descricao,fornecedor_previsto,valor_projetado,observacoes&#10;despesa,Estrutura do Evento,Som,Fulano Audio,8000,&#10;despesa,Artistico,DJ X,,12000,&#10;receita,BaladaAPP,Ingressos,,80000,"
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

function Planilha({ titulo, tipo, itens, centros, foraProjecao, onCreate, onUpdate, onRemove, onHistorico }) {
  const totalProjetado = itens.reduce((s, i) => s + Number(i.valor_projetado || 0), 0)
  const totalRealizado = itens.reduce((s, i) => s + Number(i.valor_realizado || 0), 0)
  const totalAPagar = itens.reduce((s, i) => s + Number(i.valor_a_pagar || 0), 0)
  const variacao = totalRealizado - totalProjetado
  const ehDespesa = tipo === 'despesa'

  // Agrupa por centro, ordem = dos centros conhecidos (mostra só os com itens) + órfãos no fim
  const centrosSet = new Set(centros)
  const centrosComItem = centros.filter(c => itens.some(i => (i.centro_custo || '') === c))
  const orfaos = itens.filter(i => !centrosSet.has(i.centro_custo || ''))

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h3 className="font-semibold text-gray-900">{titulo}</h3>
          <span className="text-xs text-gray-400">{itens.length} {itens.length === 1 ? 'item' : 'itens'} · {fmt(totalProjetado)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[28%]">Descrição</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[18%]">Centro de custo</th>
              <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[18%]">Fornecedor</th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[12%]">Projetado</th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[10%]">Realizado</th>
              <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wide text-gray-500 font-medium w-[10%]">Variação</th>
              <th className="px-2 py-2 w-[4%]"></th>
            </tr>
          </thead>
          <tbody>
            {centrosComItem.map(centro => {
              const itensCentro = itens.filter(i => (i.centro_custo || '') === centro)
              return (
                <Fragment key={centro}>
                  {itensCentro.map(i => (
                    <LinhaItem key={i.id} item={i} centros={centros} ehDespesa={ehDespesa} onUpdate={onUpdate} onRemove={onRemove} onHistorico={onHistorico} />
                  ))}
                </Fragment>
              )
            })}
            {orfaos.length > 0 && orfaos.map(i => (
              <LinhaItem key={i.id} item={i} centros={centros} ehDespesa={ehDespesa} onUpdate={onUpdate} onRemove={onRemove} onHistorico={onHistorico} />
            ))}
            <LinhaNova centros={centros} onCreate={onCreate} />
            {itens.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-gray-400 italic">Digite na linha abaixo para começar a projeção.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 bg-gray-50">
              <td className="px-3 py-2 text-sm text-gray-600 font-medium" colSpan={3}>Total</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-900">{fmt(totalProjetado)}</td>
              <td className="px-3 py-2 text-right font-medium text-gray-700">{fmt(totalRealizado)}</td>
              <td className={'px-3 py-2 text-right font-semibold ' + (variacao === 0 ? 'text-gray-400' : (ehDespesa ? (variacao > 0 ? 'text-red-600' : 'text-green-600') : (variacao > 0 ? 'text-green-600' : 'text-red-600')))}>
                {variacao === 0 ? '—' : (variacao > 0 ? '+' : '') + fmt(variacao)}
              </td>
              <td></td>
            </tr>
            {foraProjecao > 0 && (
              <tr className="bg-amber-50 border-t border-amber-100">
                <td className="px-3 py-1.5 text-xs text-amber-800 italic" colSpan={4}>Realizado fora da projeção (sem vínculo)</td>
                <td className="px-3 py-1.5 text-right text-xs font-medium text-amber-800">{fmt(foraProjecao)}</td>
                <td colSpan={2}></td>
              </tr>
            )}
            {totalAPagar > 0 && (
              <tr className="bg-gray-50 border-t border-gray-100">
                <td className="px-3 py-1.5 text-xs text-gray-600" colSpan={5}>A pagar</td>
                <td className="px-3 py-1.5 text-right text-xs font-medium text-gray-700">{fmt(totalAPagar)}</td>
                <td></td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function LinhaItem({ item, centros, ehDespesa, onUpdate, onRemove, onHistorico }) {
  const proj = Number(item.valor_projetado || 0)
  const real = Number(item.valor_realizado || 0)
  const vari = real - proj
  const centrosSet = new Set(centros)
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/60">
      <td className="px-3 py-1.5"><CellText value={item.descricao || ''} onSave={v => onUpdate(item.id, 'descricao', v)} /></td>
      <td className="px-3 py-1.5">
        <select value={item.centro_custo || ''} onChange={e => onUpdate(item.id, 'centro_custo', e.target.value)}
          className="w-full bg-transparent text-sm px-1 py-0.5 rounded border-0 hover:bg-white focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none">
          {centros.map(c => <option key={c} value={c}>{c}</option>)}
          {!centrosSet.has(item.centro_custo || '') && <option value={item.centro_custo || ''}>{item.centro_custo || '—'}</option>}
        </select>
      </td>
      <td className="px-3 py-1.5"><CellText value={item.fornecedor_previsto || ''} onSave={v => onUpdate(item.id, 'fornecedor_previsto', v)} placeholder="—" /></td>
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

function LinhaNova({ centros, onCreate }) {
  const [draft, setDraft] = useState({ descricao: '', centro_custo: centros[0] || '', fornecedor_previsto: '', valor_projetado: '' })
  const [saving, setSaving] = useState(false)
  const descRef = useRef(null)

  async function salvar(focusDesc = true) {
    if (!draft.descricao.trim()) return
    setSaving(true)
    const ok = await onCreate({
      descricao: draft.descricao.trim(),
      centro_custo: draft.centro_custo,
      fornecedor_previsto: draft.fornecedor_previsto.trim(),
      valor_projetado: parseMoney(draft.valor_projetado)
    })
    setSaving(false)
    if (ok) {
      setDraft({ descricao: '', centro_custo: draft.centro_custo, fornecedor_previsto: '', valor_projetado: '' })
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
        <select value={draft.centro_custo} onChange={e => setDraft(d => ({ ...d, centro_custo: e.target.value }))}
          className="w-full bg-transparent text-sm px-1 py-0.5 rounded border-0 hover:bg-white focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none">
          {centros.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </td>
      <td className="px-3 py-1.5">
        <input value={draft.fornecedor_previsto} onChange={e => setDraft(d => ({ ...d, fornecedor_previsto: e.target.value }))} onKeyDown={onKey}
          placeholder="—"
          className="w-full bg-transparent text-sm px-1 py-0.5 rounded border-0 placeholder:text-gray-300 focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none" />
      </td>
      <td className="px-3 py-1.5 text-right">
        <input value={draft.valor_projetado} onChange={e => setDraft(d => ({ ...d, valor_projetado: e.target.value }))} onKeyDown={onKey}
          placeholder="0,00"
          className="w-full bg-transparent text-sm text-right px-1 py-0.5 rounded border-0 placeholder:text-gray-300 focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none" />
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

function CellMoney({ value, onSave }) {
  const [v, setV] = useState(value.toString().replace('.', ','))
  useEffect(() => { setV(Number(value || 0).toString().replace('.', ',')) }, [value])
  return (
    <input
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => {
        const parsed = parseMoney(v)
        if (parsed !== Number(value)) onSave(parsed)
      }}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
      className="w-full bg-transparent text-right px-1 py-0.5 rounded border-0 hover:bg-white focus:bg-white focus:ring-1 focus:ring-gray-300 outline-none text-sm"
    />
  )
}
