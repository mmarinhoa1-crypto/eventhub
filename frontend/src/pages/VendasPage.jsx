import { useState, useEffect, useMemo } from 'react'
import { BarChart3, TrendingUp, Ticket, Trophy, CalendarDays, MapPin, Tag, Users } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts'
import api from '../api/client'
import toast from 'react-hot-toast'

const fmt = (v) => 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
const fmtK = (v) => v >= 1000 ? 'R$ ' + (v / 1000).toFixed(1) + 'K' : fmt(v)

const CORES_SETOR = ['#3B82F6','#3b82f6','#F59E0B','#10B981','#EC4899','#06B6D4','#EF4444','#F97316']

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-lg text-xs">
      <div className="font-semibold text-gray-900 mb-1">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex justify-between gap-4" style={{ color: p.color }}>
          <span>{p.name}</span>
          <span className="font-semibold">{p.name === 'Receita' || p.name === 'Acumulado' ? fmt(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function VendasPage() {
  const [eventos, setEventos] = useState([])
  const [eventoId, setEventoId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [vendas, setVendas] = useState([])
  const [porDia, setPorDia] = useState([])
  const [porSetor, setPorSetor] = useState([])
  const [porCidade, setPorCidade] = useState([])
  const [porTipo, setPorTipo] = useState([])
  const [view, setView] = useState('receita')
  const [subViewDir, setSubViewDir] = useState('cidade')
  const [ultimaSync, setUltimaSync] = useState(null)

  useEffect(() => {
    api.get('/eventos').then(r => {
      setEventos(r.data)
      const comBaladapp = r.data.find(e => e.baladapp_id)
      if (comBaladapp) setEventoId(comBaladapp.id)
      else if (r.data.length) setEventoId(r.data[0].id)
    }).catch(() => toast.error('Erro ao carregar eventos'))
    .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!eventoId) return
    setLoading(true)
    Promise.all([
      api.get('/eventos/' + eventoId + '/vendas-dia'),
      api.get('/eventos/' + eventoId + '/baladapp/vendas').catch(() => ({ data: { vendas: [], stats: [] } }))
    ]).then(([diaRes, vendasRes]) => {
      setPorDia(diaRes.data.por_dia || [])
      setPorSetor((diaRes.data.por_setor || []).map(s => ({...s, total: parseFloat(s.total) || 0})))
      setPorCidade((diaRes.data.por_cidade || []).map(c => ({...c, total: parseFloat(c.total) || 0})))
      setPorTipo((diaRes.data.por_tipo || []).map(t => ({...t, total: parseFloat(t.total) || 0})))
      setVendas(vendasRes.data.vendas || [])
      setUltimaSync(diaRes.data.ultima_sync)
    }).catch(() => toast.error('Erro ao carregar vendas'))
    .finally(() => setLoading(false))
  }, [eventoId])

  const totalVendas = porDia.reduce((s, d) => s + parseFloat(d.total || 0), 0)
  const totalPedidos = porDia.reduce((s, d) => s + parseInt(d.qtd || 0), 0)
  const totalIngressos = porDia.reduce((s, d) => s + parseInt(d.ingressos || 0), 0)
  const ticketMedio = totalIngressos > 0 ? totalVendas / totalIngressos : 0
  const melhorDia = porDia.length ? porDia.reduce((a, b) => parseFloat(b.total) > parseFloat(a.total) ? b : a) : null
  const totalSetores = porSetor.reduce((s, d) => s + parseFloat(d.total || 0), 0)
  const totalCidades = porCidade.reduce((s, d) => s + parseFloat(d.total || 0), 0)
  const totalTipos = porTipo.reduce((s, d) => s + parseFloat(d.total || 0), 0)

  const acumulado = useMemo(() => {
    let acc = 0
    return porDia.map(d => { acc += parseFloat(d.total || 0); return { ...d, acumulado: acc } })
  }, [porDia])

  const chartData = useMemo(() => {
    return porDia.map(d => ({
      ...d,
      total: parseFloat(d.total || 0),
      qtd: parseInt(d.qtd || 0),
      ingressos: parseInt(d.ingressos || 0),
      label: d.dia ? new Date(d.dia.substring(0,10) + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '',
    }))
  }, [porDia])

  const maxTotal = Math.max(...porDia.map(d => parseFloat(d.total || 0)), 1)

  if (loading && !porDia.length) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl"><BarChart3 size={24} className="text-blue-600 dark:text-blue-400" /></div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Vendas por Dia</h1>
            <p className="text-sm text-gray-500">Acompanhe as vendas do BaladaAPP</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { if(!eventoId)return; toast.loading('Sincronizando...'); api.post('/eventos/'+eventoId+'/baladapp/sync-vendas').then(r => { toast.dismiss(); toast.success('Sync: '+r.data.inseridos+' pedidos importados'); setTimeout(()=>window.location.reload(),1000) }).catch(e => { toast.dismiss(); toast.error(e.response?.data?.erro||'Erro no sync') }) }} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition">Sync Vendas</button>
          {ultimaSync && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-3 py-1.5 rounded-full border border-green-100 dark:border-green-500/20">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Sync ativo
            </span>
          )}
          <select value={eventoId || ''} onChange={e => setEventoId(Number(e.target.value))}
            className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-700 shadow-sm min-w-[250px]">
            {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}{ev.baladapp_id ? ' (BaladaAPP)' : ''}</option>)}
          </select>
        </div>
      </div>

      {porDia.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-4xl mb-3">🎫</div>
          <h3 className="font-bold text-gray-900 mb-1">Sem dados de vendas</h3>
          <p className="text-sm text-gray-400">Vincule um evento ao BaladaAPP para ver as vendas aqui.</p>
        </div>
      ) : (
        <>
          {/* Cards */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Receita Total', value: fmt(totalVendas), sub: porDia.length + ' dias', color: 'text-green-600 dark:text-green-400', icon: <TrendingUp size={18} className="text-green-500 dark:text-green-400" /> },
              { label: 'Pedidos', value: totalPedidos.toLocaleString('pt-BR'), sub: totalIngressos + ' ingressos', color: 'text-blue-600 dark:text-blue-400', icon: <Ticket size={18} className="text-blue-500 dark:text-blue-400" /> },
              { label: 'Ticket Medio', value: fmt(ticketMedio), sub: 'por ingresso', color: 'text-blue-600 dark:text-blue-400', icon: <BarChart3 size={18} className="text-blue-500 dark:text-blue-400" /> },
              { label: 'Melhor Dia', value: melhorDia ? fmt(parseFloat(melhorDia.total)) : '-', sub: melhorDia ? new Date(melhorDia.dia + 'T12:00:00').toLocaleDateString('pt-BR') : '', color: 'text-amber-600 dark:text-amber-400', icon: <Trophy size={18} className="text-amber-500 dark:text-amber-400" /> },
              { label: 'Media/Dia', value: fmt(totalVendas / porDia.length), sub: Math.round(totalPedidos / porDia.length) + ' pedidos/dia', color: 'text-cyan-600 dark:text-cyan-400', icon: <CalendarDays size={18} className="text-cyan-500 dark:text-cyan-400" /> },
            ].map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  {c.icon}
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{c.label}</span>
                </div>
                <p className={'text-xl font-bold ' + c.color}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm">Evolucao de Vendas</h3>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  {[{ key: 'receita', label: 'Receita' }, { key: 'pedidos', label: 'Pedidos' }, { key: 'acumulado', label: 'Acumulado' }].map(t => (
                    <button key={t.key} onClick={() => setView(t.key)}
                      className={'px-3 py-1 rounded-md text-xs font-semibold transition ' + (view === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  {view === 'acumulado' ? (
                    <AreaChart data={acumulado.map(d => ({ ...d, label: d.dia ? new Date(d.dia.substring(0,10)+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '', total: parseFloat(d.total||0) }))}>
                      <defs><linearGradient id="gradAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} interval={Math.max(0,Math.floor(chartData.length/10))} angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => fmtK(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#10B981" strokeWidth={2.5} fill="url(#gradAcc)" />
                    </AreaChart>
                  ) : view === 'pedidos' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} interval={Math.max(0,Math.floor(chartData.length/10))} angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="qtd" name="Pedidos" fill="#EC4899" radius={[4,4,0,0]} />
                      <Bar dataKey="ingressos" name="Ingressos" fill="#F9A8D4" radius={[4,4,0,0]} />
                    </BarChart>
                  ) : (
                    <BarChart data={chartData}>
                      <defs><linearGradient id="gradBar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#EC4899"/><stop offset="100%" stopColor="#9333EA"/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} interval={Math.max(0,Math.floor(chartData.length/10))} angle={-45} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={v => fmtK(v)} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="total" name="Receita" fill="url(#gradBar)" radius={[4,4,0,0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Setor + Cidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tipo de Ingresso */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Tag size={16} className="text-blue-500 dark:text-blue-400" />
                <h3 className="font-bold text-gray-900 text-sm">Vendas por Tipo de Ingresso</h3>
              </div>
              {porTipo.length > 0 ? (
                <>
                  <div style={{ height: 180 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={porTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="total" nameKey="tipo" paddingAngle={3}>
                          {porTipo.map((s, i) => <Cell key={i} fill={CORES_SETOR[i % CORES_SETOR.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-col gap-2 mt-2 max-h-64 overflow-y-auto">
                    {porTipo.map((t, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: CORES_SETOR[i % CORES_SETOR.length] }} />
                          <span className="text-xs text-gray-700 font-medium truncate">{t.tipo}</span>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-xs font-semibold text-gray-900">{fmt(t.total)}</span>
                          <span className="text-[10px] text-gray-400 ml-1.5">{totalTipos > 0 ? ((t.total / totalTipos) * 100).toFixed(0) : 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-400 text-sm">Sem dados por tipo. Sincronize as vendas.</div>
              )}
            </div>

            {/* Cidade + Comissarios */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {subViewDir === 'cidade' ? <MapPin size={16} className="text-rose-500 dark:text-rose-400" /> : <Users size={16} className="text-blue-500 dark:text-blue-400" />}
                  <h3 className="font-bold text-gray-900 text-sm">{subViewDir === 'cidade' ? 'Vendas por Cidade' : 'Vendas por Comissario'}</h3>
                </div>
                <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                  {[{key:'cidade',label:'Cidades'},{key:'comissario',label:'Comissarios'}].map(t => (
                    <button key={t.key} onClick={() => setSubViewDir(t.key)}
                      className={'px-3 py-1 rounded-md text-xs font-semibold transition ' + (subViewDir === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600')}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              {subViewDir === 'cidade' ? (
                porCidade.length > 0 ? (
                  <>
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={porCidade.slice(0, 8)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="total" nameKey="cidade" paddingAngle={3}>
                            {porCidade.slice(0, 8).map((s, i) => <Cell key={i} fill={CORES_SETOR[i % CORES_SETOR.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 mt-2 max-h-64 overflow-y-auto">
                      {porCidade.map((c, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: CORES_SETOR[i % CORES_SETOR.length] }} />
                            <span className="text-xs text-gray-700 font-medium truncate">{c.cidade}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-semibold text-gray-900">{fmt(parseFloat(c.total))}</span>
                            <span className="text-[10px] text-gray-400 ml-1.5">{totalCidades > 0 ? ((parseFloat(c.total) / totalCidades) * 100).toFixed(0) : 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">Sem dados por cidade. Sincronize as vendas.</div>
                )
              ) : (
                porSetor.length > 0 ? (
                  <>
                    <div style={{ height: 180 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={porSetor.slice(0, 8)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="total" nameKey="setor" paddingAngle={3}>
                            {porSetor.slice(0, 8).map((s, i) => <Cell key={i} fill={CORES_SETOR[i % CORES_SETOR.length]} />)}
                          </Pie>
                          <Tooltip formatter={(v) => fmt(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2 mt-2 max-h-64 overflow-y-auto">
                      {porSetor.map((s, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-3 h-3 rounded flex-shrink-0" style={{ background: CORES_SETOR[i % CORES_SETOR.length] }} />
                            <span className="text-xs text-gray-700 font-medium truncate">{s.setor}</span>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-semibold text-gray-900">{fmt(parseFloat(s.total))}</span>
                            <span className="text-[10px] text-gray-400 ml-1.5">{totalSetores > 0 ? ((parseFloat(s.total) / totalSetores) * 100).toFixed(0) : 0}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">Sem dados por comissario</div>
                )
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Detalhamento Diario</h3>
              <span className="text-xs text-gray-400">{porDia.length} dias de venda</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[11px] text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-5 py-3 text-left">Data</th>
                    <th className="px-5 py-3 text-center">Pedidos</th>
                    <th className="px-5 py-3 text-center">Ingressos</th>
                    <th className="px-5 py-3 text-right">Receita</th>
                    <th className="px-5 py-3 text-right">Ticket Medio</th>
                    <th className="px-5 py-3 text-left" style={{ width: '20%' }}>Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {[...porDia].reverse().map((d, i) => {
                    const val = parseFloat(d.total || 0)
                    const qtd = parseInt(d.qtd || 0)
                    const ing = parseInt(d.ingressos || 0)
                    const pct = maxTotal > 0 ? (val / maxTotal) * 100 : 0
                    const isTop = melhorDia && d.dia === melhorDia.dia
                    const tm = ing > 0 ? val / ing : 0
                    return (
                      <tr key={i} className={'border-t border-gray-50 transition-colors ' + (isTop ? 'bg-amber-50/40 dark:bg-amber-500/10' : 'hover:bg-gray-50')}>
                        <td className="px-5 py-2.5 text-sm">
                          <span className="font-medium text-gray-900">
                            {d.dia ? new Date(d.dia.substring(0,10) + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '-'}
                          </span>
                          {isTop && <span className="ml-2 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded font-semibold">MELHOR DIA</span>}
                        </td>
                        <td className="px-5 py-2.5 text-sm text-center text-gray-600 font-medium">{qtd}</td>
                        <td className="px-5 py-2.5 text-sm text-center text-gray-500">{ing}</td>
                        <td className="px-5 py-2.5 text-sm text-right font-semibold text-green-600 dark:text-green-400">{fmt(val)}</td>
                        <td className="px-5 py-2.5 text-sm text-right text-gray-500">{fmt(tm)}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all" style={{ width: pct + '%', background: pct > 80 ? '#10B981' : pct > 50 ? '#3B82F6' : pct > 25 ? '#F59E0B' : '#E2E8F0' }} />
                            </div>
                            <span className="text-[10px] text-gray-400 w-8 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200">
                    <td className="px-5 py-3 text-sm font-bold text-gray-600 uppercase tracking-wide">Total</td>
                    <td className="px-5 py-3 text-sm text-center font-bold text-gray-900">{totalPedidos.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-3 text-sm text-center font-bold text-gray-900">{totalIngressos.toLocaleString('pt-BR')}</td>
                    <td className="px-5 py-3 text-sm text-right font-bold text-green-600 dark:text-green-400 text-base">{fmt(totalVendas)}</td>
                    <td className="px-5 py-3 text-sm text-right font-bold text-gray-600">{fmt(ticketMedio)}</td>
                    <td className="px-5 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
