import { useState, useEffect } from 'react'
import { DollarSign, ChevronDown } from 'lucide-react'
import api from '../api/client'
import toast from 'react-hot-toast'
import FinanceiroTab from '../components/eventos/FinanceiroTab'

const subTabs = [
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
          setEventoId(data[0].id)
          setEventoNome(data[0].nome)
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
          <div className="p-2 bg-blue-100 rounded-xl">
            <DollarSign size={24} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
            <p className="text-sm text-gray-500">Gestão financeira dos eventos</p>
          </div>
        </div>
        {/* Event selector */}
        <div className="relative">
          <select
            value={eventoId || ''}
            onChange={e => selecionarEvento(Number(e.target.value))}
            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer min-w-[250px]"
          >
            {eventos.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nome}</option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
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
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

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
                        <div className="bg-green-50 rounded-xl px-3 py-2">
                          <span className="text-[10px] text-green-600 font-semibold uppercase">Entradas</span>
                          <p className="text-lg font-bold text-green-600">R$ {totalRec.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                        </div>
                        <div className="bg-red-50 rounded-xl px-3 py-2">
                          <span className="text-[10px] text-red-600 font-semibold uppercase">Saídas</span>
                          <p className="text-lg font-bold text-red-600">R$ {totalDesp.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
                        </div>
                        <div className={(saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50') + ' rounded-xl px-3 py-2'}>
                          <span className={'text-[10px] font-semibold uppercase ' + (saldo >= 0 ? 'text-blue-600' : 'text-orange-600')}>Saldo</span>
                          <p className={'text-lg font-bold ' + (saldo >= 0 ? 'text-blue-600' : 'text-orange-600')}>R$ {saldo.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
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
                                  <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + (it._tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                                    {it._tipo === 'receita' ? '↑ Entrada' : '↓ Saída'}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-gray-900">{it.descricao || it.fornecedor || it.conta || '-'}</td>
                                <td className={'px-4 py-2 text-right font-medium ' + (it._tipo === 'receita' ? 'text-green-600' : 'text-red-600')}>
                                  {it._tipo === 'receita' ? '+' : '-'} R$ {Number(it.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {it.comprovante_url ? (
                                    <button onClick={() => setPreviewComprovante(it)} className="text-blue-500 hover:text-blue-700 text-sm">📎</button>
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
                      <div><span className="text-gray-400 text-xs uppercase font-semibold">Valor</span><p className="font-medium text-red-600">R$ {Number(previewComprovante.valor||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</p></div>
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
