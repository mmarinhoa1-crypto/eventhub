import { useState, useEffect, useRef } from 'react'
import { DollarSign, ChevronDown, Search, X, Calendar } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import FinanceiroTab from '../components/eventos/FinanceiroTab'
import ProjecaoTab from '../components/eventos/ProjecaoTab'

const subTabs = [
  { key: 'projecao', label: 'Projeção' },
  { key: 'financeiro', label: 'Planilha' },
  { key: 'fluxo', label: 'Fluxo de Caixa' },
]

export default function FinanceiroPage() {
  const [eventos, setEventos] = useState([])
  const [eventoId, setEventoId] = useState(null)
  const [eventoNome, setEventoNome] = useState('')
  const [activeTab, setActiveTab] = useState('financeiro')
  const [loading, setLoading] = useState(true)
  const [despesas, setDespesas] = useState([])
  const [receitasFluxo, setReceitasFluxo] = useState([])
  const [previewComprovante, setPreviewComprovante] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/eventos')
        setEventos(data)
        if (data.length > 0) {
          const hoje = new Date().toISOString().split('T')[0]
          const futuros = data
            .filter(e => !e.data_evento || e.data_evento >= hoje)
            .sort((a, b) => (a.data_evento || '').localeCompare(b.data_evento || ''))
          const inicial = futuros[0] || data[0]
          setEventoId(inicial.id)
          setEventoNome(inicial.nome)
        }
      } catch { toast.error('Erro ao carregar eventos') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (eventoId && activeTab === 'fluxo') {
      api.get('/eventos/' + eventoId + '/despesas').then(r => setDespesas(r.data)).catch(() => {})
      api.get('/eventos/' + eventoId + '/receitas').then(r => setReceitasFluxo(r.data)).catch(() => {})
    }
  }, [eventoId, activeTab])

  async function atualizarCategoria(despesaId, centro) {
    try {
      await api.patch('/despesas/' + despesaId, { centro_custo: centro })
      const { data } = await api.get('/eventos/' + eventoId + '/despesas')
      setDespesas(data)
      toast.success('Categoria atualizada')
    } catch { toast.error('Erro ao atualizar') }
  }

  function selecionarEvento(id) {
    setEventoId(id)
    const ev = eventos.find(e => e.id === id)
    setEventoNome(ev ? ev.nome : '')
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
            <DollarSign size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-sm text-gray-500">Gestão financeira dos eventos</p>
          </div>
        </div>
        {/* Event selector */}
        <EventoSeletor
          eventos={eventos}
          eventoId={eventoId}
          eventoNome={eventoNome}
          onSelect={selecionarEvento}
        />
      </div>

      {/* Sub tabs */}
      {eventoId && (
        <>
          <div className="border-b border-gray-200">
            <div className="flex gap-6">
              {subTabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'projecao' && <ProjecaoTab eventoId={eventoId} />}
          {activeTab === 'financeiro' && <FinanceiroTab eventoId={eventoId} />}
          {activeTab === 'fluxo' && (
            <>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Fluxo de Caixa - {eventoNome}</h3>
                  <span className="text-xs text-gray-400">{[...despesas,...receitasFluxo].filter(d => d.comprovante_url).length} comprovantes anexados</span>
                </div>
                {(() => {
                  const items = [
                    ...despesas.map(d => ({...d, _tipo: 'despesa', _data: d.data || ''})),
                    ...receitasFluxo.map(r => ({...r, _tipo: 'receita', _data: r.data_pagamento || ''}))
                  ].sort((a,b) => {
                    const da = (a._data||'').includes('-') ? a._data : (a._data||'').split('/').reverse().join('-')
                    const db = (b._data||'').includes('-') ? b._data : (b._data||'').split('/').reverse().join('-')
                    return db.localeCompare(da)
                  })
                  const totalRec = receitasFluxo.reduce((s,r) => s + Number(r.valor||0), 0)
                  const totalDesp = despesas.reduce((s,d) => s + Number(d.valor||0), 0)
                  const saldo = totalRec - totalDesp
                  return (
                    <>
                      <div className="p-4 grid grid-cols-3 gap-3">
                        <div className="bg-green-50 dark:bg-green-500/10 rounded-xl px-3 py-2">
                          <span className="text-[10px] text-green-600 dark:text-green-400 font-semibold uppercase">Entradas</span>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">R$ {totalRec.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl px-3 py-2">
                          <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold uppercase">Saídas</span>
                          <p className="text-lg font-bold text-red-600 dark:text-red-400">R$ {totalDesp.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                        </div>
                        <div className={(saldo >= 0 ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-orange-50 dark:bg-orange-500/10') + ' rounded-xl px-3 py-2'}>
                          <span className={'text-[10px] font-semibold uppercase ' + (saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')}>Saldo</span>
                          <p className={'text-lg font-bold ' + (saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400')}>R$ {saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                            <th className="px-4 py-2 text-left">Data</th>
                            <th className="px-4 py-2 text-left">Tipo</th>
                            <th className="px-4 py-2 text-left">Descrição</th>
                            <th className="px-4 py-2 text-right">Valor</th>
                            <th className="px-4 py-2 text-center">Comprovante</th>
                          </tr></thead>
                          <tbody>
                            {items.map(it => (
                              <tr key={it._tipo+'-'+it.id} className="border-t border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-2 text-gray-600">{it._data || '-'}</td>
                                <td className="px-4 py-2">
                                  <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + (it._tipo === 'receita' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400')}>
                                    {it._tipo === 'receita' ? '↑ Entrada' : '↓ Saída'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-900">{it.descricao || it.fornecedor || it.conta || '-'}</td>
                                <td className={'px-4 py-2 text-right font-medium ' + (it._tipo === 'receita' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}>
                                  {it._tipo === 'receita' ? '+' : '-'} R$ {Number(it.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {it.comprovante_url ? (
                                    <button onClick={() => setPreviewComprovante(it)} className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm">📎</button>
                                  ) : <span className="text-gray-200">-</span>}
                                </td>
                              </tr>
                            ))}
                            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Nenhuma movimentação</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )
                })()}
              </div>

              {/* Modal Comprovante */}
              {previewComprovante && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewComprovante(null)}>
                  <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                    <div className="p-4 border-b flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-gray-900">Comprovante #{previewComprovante.id}</h3>
                        <p className="text-xs text-gray-500">{previewComprovante.fornecedor} • R$ {Number(previewComprovante.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                      </div>
                      <button onClick={() => setPreviewComprovante(null)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">×</button>
                    </div>
                    <div className="p-4">
                      {previewComprovante.comprovante_url.endsWith('.pdf') ? (
                        <iframe src={'/api' + previewComprovante.comprovante_url} className="w-full h-[60vh] rounded-lg border" />
                      ) : (
                        <img src={'/api' + previewComprovante.comprovante_url} className="w-full rounded-lg" alt="Comprovante" />
                      )}
                    </div>
                    <div className="p-4 border-t bg-gray-50 rounded-b-2xl grid grid-cols-2 gap-3 text-sm">
                      <div><span className="text-gray-400 text-xs uppercase font-semibold">Fornecedor</span><p className="font-medium text-gray-900">{previewComprovante.fornecedor || '-'}</p></div>
                      <div><span className="text-gray-400 text-xs uppercase font-semibold">Valor</span><p className="font-medium text-red-600 dark:text-red-400">R$ {Number(previewComprovante.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p></div>
                      <div><span className="text-gray-400 text-xs uppercase font-semibold">Centro de Custo</span><p className="font-medium text-gray-900">{previewComprovante.centro_custo || '-'}</p></div>
                      <div><span className="text-gray-400 text-xs uppercase font-semibold">Registrado por</span><p className="font-medium text-gray-900">{previewComprovante.registrado_por || '-'}</p></div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!eventoId && (
        <div className="text-center py-20 text-gray-400">
          <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
          <p>Nenhum evento encontrado. Crie um evento primeiro.</p>
        </div>
      )}
    </div>
  )
}

function EventoSeletor({ eventos, eventoId, eventoNome, onSelect }) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('futuros')
  const containerRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const hoje = new Date().toISOString().split('T')[0]
  const selecionado = eventos.find(e => e.id === eventoId)
  const dataSelecionado = selecionado?.data_evento || ''

  const filtrados = eventos
    .filter(ev => {
      if (busca && !(ev.nome || '').toLowerCase().includes(busca.toLowerCase())) return false
      const d = ev.data_evento || ''
      if (filtro === 'futuros') return !d || d >= hoje
      if (filtro === 'passados') return d && d < hoje
      return true
    })
    .sort((a, b) => {
      const da = a.data_evento || ''
      const db = b.data_evento || ''
      if (filtro === 'passados') return db.localeCompare(da)
      if (!da) return 1
      if (!db) return -1
      return da.localeCompare(db)
    })

  function fmtData(s) {
    if (!s) return ''
    const [y, m, d] = s.split('-')
    if (!y || !m || !d) return s
    return d + '/' + m + '/' + y.slice(2)
  }

  const contagens = {
    futuros: eventos.filter(e => !e.data_evento || e.data_evento >= hoje).length,
    passados: eventos.filter(e => e.data_evento && e.data_evento < hoje).length,
    todos: eventos.length
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent min-w-[280px]"
      >
        <Calendar size={14} className="text-gray-400 shrink-0" />
        <span className="flex-1 text-left truncate">{eventoNome || 'Selecione um evento'}</span>
        {dataSelecionado && <span className="text-xs text-gray-400 shrink-0">{fmtData(dataSelecionado)}</span>}
        <ChevronDown size={16} className={'text-gray-400 shrink-0 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[380px] bg-white border border-gray-200 rounded-2xl shadow-xl z-40 overflow-hidden">
          <div className="p-3 border-b border-gray-100 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar evento..."
                className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400"
              />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex gap-1">
              {[
                { k: 'futuros', label: 'Futuros' },
                { k: 'passados', label: 'Passados' },
                { k: 'todos', label: 'Todos' }
              ].map(t => (
                <button
                  key={t.k}
                  onClick={() => setFiltro(t.k)}
                  className={'flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors ' +
                    (filtro === t.k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                >
                  {t.label} <span className={'ml-1 ' + (filtro === t.k ? 'opacity-80' : 'text-gray-400')}>({contagens[t.k]})</span>
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[360px] overflow-y-auto">
            {filtrados.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400 italic">Nenhum evento encontrado</div>
            ) : (
              filtrados.map(ev => {
                const ativo = ev.id === eventoId
                const passado = ev.data_evento && ev.data_evento < hoje
                return (
                  <button
                    key={ev.id}
                    onClick={() => { onSelect(ev.id); setOpen(false); setBusca('') }}
                    className={'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ' +
                      (ativo ? 'bg-blue-50' : '')}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={'text-sm truncate ' + (ativo ? 'font-bold text-blue-700' : 'font-medium text-gray-800')}>{ev.nome}</p>
                      {ev.cidade && <p className="text-[11px] text-gray-400 truncate">{ev.cidade}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={'text-xs font-medium ' + (passado ? 'text-gray-400' : 'text-gray-600')}>{ev.data_evento ? fmtData(ev.data_evento) : '—'}</p>
                      {passado && <span className="text-[9px] text-gray-400 uppercase">passado</span>}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
