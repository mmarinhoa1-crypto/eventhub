import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Receipt, RefreshCw, ArrowUpRight, ArrowDownRight, Wallet, PiggyBank } from 'lucide-react'
import api from '../../api/client'
import toast from 'react-hot-toast'

const COLORS = ['#EC4899','#f59e0b','#10b981','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316','#06b6d4']
const fmt = v => 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2})
const fmtK = v => {
  if(v>=1000000) return 'R$ '+(v/1000000).toFixed(1)+'M'
  if(v>=1000) return 'R$ '+(v/1000).toFixed(1)+'K'
  return 'R$ '+Number(v||0).toFixed(0)
}

function KPICard({ icon, label, value, color, sub }) {
  const colors = {
    emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/25',
    red: 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/25',
    blue: 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/25',
    violet: 'bg-violet-50 dark:bg-violet-500/10 text-blue-600 dark:text-blue-400 border-violet-100 dark:border-violet-500/25',
  }
  const iconColors = {
    emerald: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    red: 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400',
    blue: 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400',
    violet: 'bg-violet-100 dark:bg-violet-500/20 text-blue-600 dark:text-blue-400',
  }
  return (
    <div className={`rounded-2xl p-4 border shadow-sm ${colors[color]||colors.blue}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${iconColors[color]||iconColors.blue}`}>{icon}</div>
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-lg font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

const CustomTooltip = ({active,payload,label}) => {
  if(!active||!payload) return null
  return <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs shadow-xl">
    <p className="font-medium mb-1">{label}</p>
    {payload.map((p,i) => <p key={i} style={{color:p.color}}>{p.name}: {fmt(p.value)}</p>)}
  </div>
}

export default function DashboardFinanceiro({ eventoId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { carregar() }, [eventoId])

  async function carregar() {
    try {
      const { data: d } = await api.get('/eventos/' + eventoId + '/dashboard-financeiro')
      setData(d)
    } catch { toast.error('Erro ao carregar dashboard') }
    finally { setLoading(false) }
  }

  async function syncBaladapp() {
    setSyncing(true)
    try {
      await api.post('/eventos/' + eventoId + '/baladapp/sync')
      toast.success('Sincronizado!')
      await carregar()
    } catch(e) { toast.error(e.response?.data?.erro || 'Erro ao sincronizar') }
    finally { setSyncing(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
  if (!data) return <div className="text-gray-400 text-center py-10">Sem dados</div>

  const lucroPositivo = data.lucro >= 0
  const despCatData = (data.despesas_por_categoria||[]).map((d,i) => ({...d, total: parseFloat(d.total), fill: COLORS[i%COLORS.length]}))
  const recCatData = (data.receitas_por_categoria||[]).map((d,i) => ({...d, total: parseFloat(d.total), fill: COLORS[i%COLORS.length]}))
  const despDiaData = (data.despesas_por_dia||[]).map(d => ({...d, total: parseFloat(d.total), dia: d.dia ? new Date(d.dia).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '?'}))
  const vendasDiaData = (data.vendas_por_dia||[]).map(d => ({...d, total: parseFloat(d.total), qtd: parseInt(d.qtd), dia: d.dia ? new Date(d.dia).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}) : '?'}))
  const despFonteData = (data.despesas_por_fonte||[]).map((d,i) => ({...d, total: parseFloat(d.total), fill: COLORS[i%COLORS.length]}))

  const diasMap = {}
  despDiaData.forEach(d => { if(!diasMap[d.dia]) diasMap[d.dia]={dia:d.dia,despesas:0,receitas:0}; diasMap[d.dia].despesas=d.total })
  vendasDiaData.forEach(d => { if(!diasMap[d.dia]) diasMap[d.dia]={dia:d.dia,despesas:0,receitas:0}; diasMap[d.dia].receitas=d.total })
  const fluxoCaixa = Object.values(diasMap).sort((a,b) => a.dia.localeCompare(b.dia))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Dashboard Financeiro</h2>
        {data.baladapp_id && (
          <button onClick={syncBaladapp} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-all shadow-lg shadow-accent/20">
            <RefreshCw size={14} className={syncing?'animate-spin':''}/> {syncing?'Sincronizando...':'Sync BaladaAPP'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KPICard icon={<TrendingUp size={20}/>} label="Receitas" value={fmt(data.total_receitas)} color="emerald" sub={data.total_pendente>0 ? fmt(data.total_pendente)+' pendente' : null} />
        <KPICard icon={<TrendingDown size={20}/>} label="Despesas" value={fmt(data.total_despesas)} color="red" />
        <KPICard icon={lucroPositivo?<ArrowUpRight size={20}/>:<ArrowDownRight size={20}/>} label={lucroPositivo?"Lucro":"Prejuizo"} value={fmt(Math.abs(data.lucro))} color={lucroPositivo?"blue":"red"} sub={'Margem: '+data.margem+'%'} />
        <KPICard icon={<Wallet size={20}/>} label="Recebido" value={fmt(data.total_recebido)} color="violet" />
        <KPICard icon={<PiggyBank size={20}/>} label="Saldo" value={fmt(data.total_recebido - data.total_despesas)} color={data.total_recebido-data.total_despesas>=0?"emerald":"red"} />
      </div>

      <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Despesas vs Receitas</span>
          <span className="font-medium text-gray-700">{data.total_receitas>0?((data.total_despesas/data.total_receitas)*100).toFixed(0):0}% comprometido</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{width: Math.min((data.total_despesas/Math.max(data.total_receitas,1))*100,100)+'%', background: data.total_despesas>data.total_receitas ? 'linear-gradient(90deg,#ef4444,#dc2626)' : 'linear-gradient(90deg,#EC4899,#9333EA)'}} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {vendasDiaData.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Receipt size={16} className="text-blue-500"/> Vendas por Dia (BaladaAPP)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={vendasDiaData}>
                <defs>
                  <linearGradient id="gradVendas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EC4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="dia" tick={{fontSize:11}} stroke="#9ca3af"/>
                <YAxis tickFormatter={fmtK} tick={{fontSize:11}} stroke="#9ca3af"/>
                <Tooltip content={<CustomTooltip/>}/>
                <Area type="monotone" dataKey="total" name="Vendas" stroke="#EC4899" fill="url(#gradVendas)" strokeWidth={2.5}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        
        {fluxoCaixa.length > 1 && (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign size={16} className="text-emerald-500"/> Fluxo de Caixa</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={fluxoCaixa}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="dia" tick={{fontSize:11}} stroke="#9ca3af"/>
                <YAxis tickFormatter={fmtK} tick={{fontSize:11}} stroke="#9ca3af"/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4,4,0,0]}/>
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><CreditCard size={16} className="text-red-500"/> Despesas por Categoria</h3>
          {despCatData.length > 0 ? (
            <div className="flex gap-4">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={despCatData} dataKey="total" nameKey="categoria" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {despCatData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                    </Pie>
                    <Tooltip formatter={v=>fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5 overflow-y-auto" style={{maxHeight:200}}>
                {despCatData.map((d,i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.fill}}/>
                      <span className="text-gray-600 truncate" style={{maxWidth:100}}>{d.categoria||'Outros'}</span>
                    </div>
                    <span className="font-medium text-gray-800">{fmt(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-gray-400 text-center py-8 text-sm">Sem despesas</p>}
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><DollarSign size={16} className="text-emerald-500"/> Receitas por Categoria</h3>
          {recCatData.length > 0 ? (
            <div className="flex gap-4">
              <div className="w-1/2">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={recCatData} dataKey="total" nameKey="categoria" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                      {recCatData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
                    </Pie>
                    <Tooltip formatter={v=>fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-1.5 overflow-y-auto" style={{maxHeight:200}}>
                {recCatData.map((d,i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.fill}}/>
                      <span className="text-gray-600 truncate" style={{maxWidth:100}}>{d.categoria||'Outros'}</span>
                    </div>
                    <span className="font-medium text-gray-800">{fmt(d.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-gray-400 text-center py-8 text-sm">Sem receitas</p>}
        </div>
      </div>

      {despFonteData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><Wallet size={16} className="text-blue-500"/> Pagamentos por Conta</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={despFonteData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis type="number" tickFormatter={fmtK} tick={{fontSize:11}} stroke="#9ca3af"/>
              <YAxis type="category" dataKey="fonte" tick={{fontSize:11}} width={100} stroke="#9ca3af"/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="total" name="Pago" radius={[0,6,6,0]}>
                {despFonteData.map((d,i) => <Cell key={i} fill={d.fill}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data.contas && data.contas.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><PiggyBank size={16} className="text-blue-500"/> Resumo por Conta</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-5 py-3 text-left">Conta</th>
                <th className="px-5 py-3 text-right">%</th>
                <th className="px-5 py-3 text-right">Parte Lucro</th>
              </tr>
            </thead>
            <tbody>
              {data.contas.map((c,i) => {
                const pct = parseFloat(c.percentual)||0
                const parte = (data.lucro * pct) / 100
                return (
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{c.nome} <span className="text-gray-400 text-xs ml-1">{c.titular}</span></td>
                    <td className="px-5 py-3 text-right text-gray-600">{pct}%</td>
                    <td className={'px-5 py-3 text-right font-bold ' + (parte>=0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400')}>{fmt(Math.abs(parte))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
