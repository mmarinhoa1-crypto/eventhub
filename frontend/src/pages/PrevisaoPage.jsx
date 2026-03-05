import { useState, useEffect } from 'react'
import { Calculator, Users, Music, Megaphone, FileText, Beer, Truck, Shield, DollarSign, Sparkles, AlertTriangle, Database } from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../hooks/useAuth'

const CORES = { 'Artistico': '#3b82f6', 'Bar': '#F59E0B', 'Operacional': '#3B82F6', 'Marketing': '#10B981', 'Logistica/Camarim': '#2563eb', 'Outros': '#94A3B8' }
const ICONS = { 'Artistico': Music, 'Bar': Beer, 'Operacional': Shield, 'Marketing': Megaphone, 'Logistica/Camarim': Truck, 'Outros': FileText }
const ITENS = {
  'Artistico': ['Cachê principal', 'Abertura/DJ', 'Hospedagem', 'Alimentação camarim', 'Transporte'],
  'Bar': ['Bebidas', 'Mão de obra bar', 'Gelo', 'Copos', 'Máquinas cartão', 'Taxa cartão'],
  'Operacional': ['Segurança', 'Brigadista', 'Portaria', 'Limpeza', 'Estrutura (som/luz/palco/banheiro)'],
  'Marketing': ['Ads', 'Designer', 'Social media', 'Gráfica', 'Outdoor', 'Rádio', 'Fotógrafo'],
  'Logistica/Camarim': ['Hotel artista', 'Hotel produção', 'Vans', 'Alimentação', 'Montagem camarim'],
  'Outros': ['ECAD', 'Alvará/ISS', 'ART', 'Seguro', 'Tarifa bancária', 'BaladaAPP'],
}

function fmt(v) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }) }

export default function PrevisaoPage() {
  const { token } = useAuth()
  const [tipo, setTipo] = useState('fechado')
  const [publico, setPublico] = useState('')
  const [cache, setCache] = useState('')
  const [tipoBar, setTipoBar] = useState('bar_vendido')
  const [ticketMedio, setTicketMedio] = useState('')
  const [nomeEvento, setNomeEvento] = useState('')
  const [resultado, setResultado] = useState(null)
  const [apiData, setApiData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/previsao/coeficientes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setApiData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  const temDados = apiData && apiData.eventos && apiData.eventos.length > 0
  const coeficientes = apiData?.coeficientes || {}
  const tiposDisponiveis = Object.keys(coeficientes)

  const calcular = () => {
    const pub = parseInt(publico) || 0
    const cac = parseFloat(cache) || 0
    if (!pub) return
    const coef = coeficientes[tipo] || coeficientes[tiposDisponiveis[0]]
    if (!coef) return
    let ajusteBar = tipoBar === 'open_bar' ? 1.6 : tipoBar === 'misto' ? 1.3 : 1
    const custoSemArt = pub * coef.custoBasePP * ajusteBar
    const categorias = {}
    let totalSemArt = 0
    Object.entries(coef.categorias).forEach(([cat, vals]) => {
      if (cat === 'Artistico') return
      const valor = custoSemArt * vals.pct
      categorias[cat] = { valor: Math.round(valor), min: Math.round(custoSemArt * vals.min), max: Math.round(custoSemArt * vals.max) }
      totalSemArt += valor
    })
    categorias['Artistico'] = { valor: Math.round(cac), min: Math.round(cac * 0.9), max: Math.round(cac * 1.1) }
    const totalGeral = totalSemArt + cac
    const totalMin = Object.values(categorias).reduce((s, c) => s + c.min, 0)
    const totalMax = Object.values(categorias).reduce((s, c) => s + c.max, 0)
    const tm = parseFloat(ticketMedio) || 0
    const receitaIngressos = tm * pub
    const receitaBarPP = coef.avgRecPP ? Math.max(coef.avgRecPP - tm, 0) * 0.6 : (tipo === 'aberto' ? 95 : 65)
    const receitaBar = tipoBar === 'open_bar' ? 0 : pub * receitaBarPP * (tipoBar === 'misto' ? 0.7 : 1)
    const receitaTotal = receitaIngressos + receitaBar
    const lucroEstimado = receitaTotal - totalGeral
    const custoPP = pub > 0 ? totalGeral / pub : 0
    const ticketMinimo = pub > 0 ? (totalGeral - receitaBar) / pub : 0
    setResultado({ categorias, totalGeral: Math.round(totalGeral), totalMin: Math.round(totalMin), totalMax: Math.round(totalMax), custoPP: Math.round(custoPP), receitaIngressos: Math.round(receitaIngressos), receitaBar: Math.round(receitaBar), receitaTotal: Math.round(receitaTotal), lucroEstimado: Math.round(lucroEstimado), ticketMinimo: Math.round(ticketMinimo), refEventos: coef.refEventos || [], baseEventos: coef.qtdEventos || 0 })
  }

  const pieData = resultado ? Object.entries(resultado.categorias).filter(([, v]) => v.valor > 0).map(([cat, v]) => ({ name: cat, value: v.valor, color: CORES[cat] || '#94A3B8' })) : []

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center"><Sparkles className="text-white" size={20} /></div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Previsão de Custos</h1>
          <p className="text-sm text-gray-500">{temDados ? `Estimativa baseada em ${apiData.eventos.length} evento${apiData.eventos.length > 1 ? 's' : ''} finalizado${apiData.eventos.length > 1 ? 's' : ''}` : 'Finalize eventos para ativar previsões inteligentes'}</p>
        </div>
      </div>

      {!temDados ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6"><Database className="text-blue-600" size={36} /></div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">A IA precisa aprender com seus eventos</h2>
            <p className="text-gray-500 mb-6">Para gerar previsões precisas, o sistema analisa seus eventos finalizados. Quanto mais eventos registrados, mais precisa será a previsão.</p>
            <div className="bg-blue-50 rounded-xl p-5 text-left space-y-3 mb-6">
              <h3 className="font-semibold text-pink-900 text-sm">Como funciona:</h3>
              <div className="flex items-start gap-3"><span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span><p className="text-sm text-indigo-800">Registre suas despesas e receitas nos eventos</p></div>
              <div className="flex items-start gap-3"><span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span><p className="text-sm text-indigo-800">Marque o evento como <strong>"finalizado"</strong> e informe o público e tipo</p></div>
              <div className="flex items-start gap-3"><span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span><p className="text-sm text-indigo-800">A IA calcula custo por pessoa, % por categoria e gera previsões</p></div>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500"><AlertTriangle size={14} className="text-amber-500" /><span>Mínimo recomendado: 3 eventos finalizados</span></div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Calculator size={18} className="text-blue-600" />Parâmetros</h2>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nome do Evento</label><input type="text" value={nomeEvento} onChange={e => setNomeEvento(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: Show do Hungria" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Local</label>
                <select value={tipo} onChange={e => setTipo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  {tiposDisponiveis.length > 0 ? tiposDisponiveis.map(t => (<option key={t} value={t}>{coeficientes[t]?.label || t} ({coeficientes[t]?.qtdEventos} ev)</option>)) : (<><option value="fechado">Fechado</option><option value="fechado_mesas">Fechado com Mesas</option><option value="aberto">Aberto</option></>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Bar</label>
                <select value={tipoBar} onChange={e => setTipoBar(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"><option value="bar_vendido">Bar Vendido</option><option value="open_bar">Open Bar</option><option value="misto">Misto</option></select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Público Esperado</label><div className="relative"><Users size={16} className="absolute left-3 top-2.5 text-gray-400" /><input type="number" value={publico} onChange={e => setPublico(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: 2000" /></div></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cachê Artístico Total (R$)</label><div className="relative"><Music size={16} className="absolute left-3 top-2.5 text-gray-400" /><input type="number" value={cache} onChange={e => setCache(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: 120000" /></div></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Ticket Médio Ingresso (R$)</label><div className="relative"><DollarSign size={16} className="absolute left-3 top-2.5 text-gray-400" /><input type="number" value={ticketMedio} onChange={e => setTicketMedio(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Ex: 80" /></div></div>
              <button onClick={calcular} className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium text-sm hover:from-blue-600 hover:to-violet-700 transition-all flex items-center justify-center gap-2"><Sparkles size={16} />Gerar Previsão</button>
            </div>
            <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
              <h3 className="text-sm font-semibold text-pink-900 mb-2 flex items-center gap-2"><Database size={14} />Base de Dados ({apiData.eventos.length} eventos)</h3>
              {apiData.eventos.map((ev, i) => (<div key={i} className="flex items-center justify-between py-1 border-b border-blue-100 last:border-0"><span className="text-xs text-blue-700 truncate mr-2">{ev.nome}</span><span className="text-xs text-blue-500 whitespace-nowrap">{ev.publico}p • {fmt(ev.total_despesas)}</span></div>))}
            </div>
            {resultado && resultado.refEventos.length > 0 && (<div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4"><h3 className="text-sm font-semibold text-emerald-900 mb-2">Referência ({resultado.baseEventos} eventos)</h3>{resultado.refEventos.map((ref, i) => (<p key={i} className="text-xs text-emerald-700">{ref}</p>))}</div>)}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {!resultado ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center text-center"><div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-4"><Sparkles className="text-blue-600" size={28} /></div><h3 className="text-lg font-semibold text-gray-900 mb-2">Previsão baseada nos seus eventos</h3><p className="text-sm text-gray-500 max-w-md">Preencha os parâmetros e clique em "Gerar Previsão".</p></div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 mb-1">Custo Total</p><p className="text-lg font-bold text-gray-900">{fmt(resultado.totalGeral)}</p><p className="text-xs text-gray-400">{fmt(resultado.totalMin)} - {fmt(resultado.totalMax)}</p></div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 mb-1">Custo/Pessoa</p><p className="text-lg font-bold text-blue-700">{fmt(resultado.custoPP)}</p></div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-xs text-gray-500 mb-1">Receita Estimada</p><p className="text-lg font-bold text-emerald-600">{fmt(resultado.receitaTotal)}</p><p className="text-xs text-gray-400">ingressos + bar</p></div>
                  <div className={`rounded-xl border p-4 ${resultado.lucroEstimado >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}><p className="text-xs text-gray-500 mb-1">Lucro Estimado</p><p className={`text-lg font-bold ${resultado.lucroEstimado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(resultado.lucroEstimado)}</p><p className="text-xs text-gray-400">Ticket mín: {fmt(resultado.ticketMinimo)}</p></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4"><h3 className="text-sm font-semibold text-gray-900 mb-3">Distribuição de Custos</h3><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>{pieData.map((e, i) => (<Cell key={i} fill={e.color} />))}</Pie><Tooltip formatter={(v) => fmt(v)} /></PieChart></ResponsiveContainer><div className="flex flex-wrap gap-2 mt-2 justify-center">{pieData.map((e, i) => (<div key={i} className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.color }} /><span className="text-xs text-gray-600">{e.name}</span></div>))}</div></div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4"><h3 className="text-sm font-semibold text-gray-900 mb-3">Receita vs Despesa</h3><ResponsiveContainer width="100%" height={220}><BarChart data={[{ name: 'Receita', Ingressos: resultado.receitaIngressos, Bar: resultado.receitaBar }, { name: 'Despesa', Total: resultado.totalGeral }]} barGap={8}><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} /><Tooltip formatter={(v) => fmt(v)} /><Bar dataKey="Ingressos" stackId="a" fill="#10B981" /><Bar dataKey="Bar" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} /><Bar dataKey="Total" fill="#EF4444" radius={[4, 4, 4, 4]} /><Legend /></BarChart></ResponsiveContainer></div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5"><h3 className="text-sm font-semibold text-gray-900 mb-4">Detalhamento por Categoria</h3><div className="space-y-3">{Object.entries(resultado.categorias).sort((a, b) => b[1].valor - a[1].valor).filter(([, v]) => v.valor > 0).map(([cat, vals]) => { const Icon = ICONS[cat] || FileText; const cor = CORES[cat] || '#94A3B8'; const pct = resultado.totalGeral > 0 ? (vals.valor / resultado.totalGeral * 100) : 0; return (<div key={cat} className="border border-gray-100 rounded-lg p-3"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cor + '20' }}><Icon size={16} style={{ color: cor }} /></div><div><p className="text-sm font-semibold text-gray-900">{cat}</p><p className="text-xs text-gray-400">{pct.toFixed(1)}%</p></div></div><div className="text-right"><p className="text-sm font-bold text-gray-900">{fmt(vals.valor)}</p><p className="text-xs text-gray-400">{fmt(vals.min)} - {fmt(vals.max)}</p></div></div><div className="w-full bg-gray-100 rounded-full h-1.5 mb-2"><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: cor }} /></div>{ITENS[cat] && (<div className="flex flex-wrap gap-1 mt-1">{ITENS[cat].map((item, i) => (<span key={i} className="text-xs bg-gray-50 text-gray-500 px-2 py-0.5 rounded-full">{item}</span>))}</div>)}</div>) })}</div></div>
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-5 text-white"><div className="flex items-start justify-between"><div><h3 className="font-semibold text-lg">{nomeEvento || 'Resumo'}</h3><p className="text-blue-200 text-sm mt-1">{coeficientes[tipo]?.label || tipo} • {tipoBar === 'bar_vendido' ? 'Bar Vendido' : tipoBar === 'open_bar' ? 'Open Bar' : 'Misto'} • {parseInt(publico || 0).toLocaleString()} pessoas</p></div><div className="text-right"><p className="text-sm text-blue-200">Investimento</p><p className="text-2xl font-bold">{fmt(resultado.totalGeral)}</p></div></div><div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-blue-500"><div><p className="text-xs text-blue-200">Custo/pessoa</p><p className="font-bold">{fmt(resultado.custoPP)}</p></div><div><p className="text-xs text-blue-200">Ticket mínimo</p><p className="font-bold">{fmt(resultado.ticketMinimo)}</p></div><div><p className="text-xs text-blue-200">Margem</p><p className="font-bold">{resultado.receitaTotal > 0 ? ((resultado.lucroEstimado / resultado.receitaTotal) * 100).toFixed(1) + '%' : '-'}</p></div></div><p className="text-xs text-blue-300 mt-3">Baseado em {resultado.baseEventos} evento{resultado.baseEventos > 1 ? 's' : ''} similares</p></div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
