import { useState, useEffect } from 'react'
import api from '../../api/client'
import toast from 'react-hot-toast'
import LoadingSpinner from '../ui/LoadingSpinner'

const phases = [
  { num: 1, name: 'Awareness', icon: '📢', color: 'blue', desc: 'Alcance máximo, público frio', days: '60-30 dias antes' },
  { num: 2, name: 'Consideração', icon: '🤔', color: 'purple', desc: 'Engajamento, quem já viu', days: '30-15 dias antes' },
  { num: 3, name: 'Conversão', icon: '🎯', color: 'orange', desc: 'Tráfego pro link de ingresso', days: '15-7 dias antes' },
  { num: 4, name: 'Urgência', icon: '🔥', color: 'red', desc: 'Últimos ingressos, escassez', days: '7-0 dias antes' },
]
const colorMap = { blue: 'from-blue-500 to-blue-600', purple: 'from-blue-500 to-blue-600', orange: 'from-orange-500 to-orange-600', red: 'from-red-500 to-red-600' }
const bgMap = { blue: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30', purple: 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/30', orange: 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/30', red: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30' }
const textMap = { blue: 'text-blue-600 dark:text-blue-400', purple: 'text-blue-600 dark:text-blue-400', orange: 'text-orange-600 dark:text-orange-400', red: 'text-red-600 dark:text-red-400' }

export default function FunilTrafego({ eventoId }) {
  const [funnel, setFunnel] = useState(null)
  const [funnelForm, setFunnelForm] = useState({})
  const [activatingFunnel, setActivatingFunnel] = useState(false)
  const [metrics, setMetrics] = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(false)
  const [aiLogs, setAiLogs] = useState([])
  const [abTests, setAbTests] = useState([])
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [loading, setLoading] = useState(true)

  function updateFunnelForm(key, val) { setFunnelForm(prev => ({ ...prev, [key]: val })) }

  function saveFunnelField(key) {
    const val = funnelForm[key]
    if (val !== undefined && val !== (funnel?.[key] || '')) salvarFunnel({ [key]: val })
  }

  async function carregarFunnel() {
    try {
      const { data } = await api.get('/eventos/' + eventoId + '/funnel')
      setFunnel(data)
      setFunnelForm({
        total_budget: data.total_budget ? (data.total_budget / 100).toFixed(0) : '500',
        target_city: data.target_city || '', target_radius: data.target_radius || 50,
        ticket_url: data.ticket_url || '', target_age_min: data.target_age_min || 18,
        target_age_max: data.target_age_max || 45, cta: data.cta || 'LEARN_MORE',
        target_interests: data.target_interests && data.target_interests !== '[]' ? data.target_interests : '',
      })
    } catch { setFunnel(null) }
    finally { setLoading(false) }
  }

  async function salvarFunnel(updates) {
    try { const { data } = await api.patch('/eventos/' + eventoId + '/funnel', updates); setFunnel(data); toast.success('Funil atualizado') }
    catch { toast.error('Erro ao salvar') }
  }

  async function ativarFunnel() {
    setActivatingFunnel(true)
    try { const { data } = await api.post('/eventos/' + eventoId + '/funnel/activate'); toast.success('Funil ativado! ' + Object.keys(data.phases).length + ' fases criadas'); carregarFunnel() }
    catch (err) { toast.error(err.response?.data?.erro || 'Erro ao ativar funil') }
    finally { setActivatingFunnel(false) }
  }

  async function pausarFunnel() {
    try { await api.post('/eventos/' + eventoId + '/funnel/pause'); toast.success('Funil pausado'); carregarFunnel() }
    catch { toast.error('Erro ao pausar') }
  }

  async function carregarMetrics() {
    setMetricsLoading(true)
    try { const { data } = await api.get('/eventos/' + eventoId + '/funnel/metrics'); setMetrics(data) }
    catch { setMetrics(null) }
    finally { setMetricsLoading(false) }
  }

  async function carregarAiLogs() {
    try {
      const [logsRes, abRes] = await Promise.all([api.get('/eventos/' + eventoId + '/ai-logs'), api.get('/eventos/' + eventoId + '/ab-tests')])
      setAiLogs(logsRes.data); setAbTests(abRes.data)
    } catch {}
  }

  async function forcarAnaliseAI() {
    setAiAnalyzing(true)
    try { const { data } = await api.post('/eventos/' + eventoId + '/ai-analyze'); setAiResult(data); toast.success('Análise concluída!'); carregarAiLogs() }
    catch (err) { const msg = err.response?.data?.erro || 'Erro na análise'; msg.includes('Sem dados') ? toast('Sem dados ainda — publique posts e aguarde', { icon: '📊' }) : toast.error(msg) }
    finally { setAiAnalyzing(false) }
  }

  useEffect(() => { carregarFunnel(); carregarAiLogs() }, [eventoId])
  useEffect(() => { if (funnel?.status === 'active') carregarMetrics() }, [funnel?.status])

  if (loading) return <div className="flex justify-center py-16"><LoadingSpinner /></div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-white/[0.04] rounded-xl border border-gray-200 dark:border-white/[0.06] p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white/90 text-base flex items-center gap-2">🚀 Funil de Tráfego Pago</h3>
            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">Campanhas automáticas por fase do evento</p>
          </div>
          <div className="flex items-center gap-2">
            {funnel?.status === 'active' ? (<>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Ativo — Fase {funnel.current_phase}</span>
              <button onClick={pausarFunnel} className="px-3 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-500/20 transition">Pausar</button>
            </>) : funnel?.status === 'paused' ? (<>
              <span className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-xs font-bold">⏸ Pausado</span>
              <button onClick={ativarFunnel} className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-bold shadow-sm">Reativar</button>
            </>) : (
              <button onClick={ativarFunnel} disabled={activatingFunnel} className={'px-4 py-2 rounded-lg text-sm font-bold text-white shadow-md transition ' + (activatingFunnel ? 'bg-gray-400 animate-pulse' : 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600')}>
                {activatingFunnel ? '⏳ Criando campanhas...' : '🚀 Ativar Funil'}
              </button>
            )}
          </div>
        </div>

        {/* Config geral */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div><label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase">Orçamento Total (R$)</label>
            <input type="number" value={funnelForm.total_budget ?? ''} onChange={e => updateFunnelForm('total_budget', e.target.value)} onBlur={() => salvarFunnel({ total_budget: parseInt(funnelForm.total_budget) * 100 || 50000 })} className="mt-1 w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm font-bold bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white/80 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase">Cidade alvo</label>
            <input value={funnelForm.target_city ?? ''} onChange={e => updateFunnelForm('target_city', e.target.value)} onBlur={() => saveFunnelField('target_city')} placeholder="Ex: Indaiatuba" className="mt-1 w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white/80 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase">Raio (km)</label>
            <input type="number" value={funnelForm.target_radius ?? ''} onChange={e => updateFunnelForm('target_radius', e.target.value)} onBlur={() => salvarFunnel({ target_radius: parseInt(funnelForm.target_radius) || 50 })} className="mt-1 w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white/80 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase">Link Ingresso</label>
            <input value={funnelForm.ticket_url ?? ''} onChange={e => updateFunnelForm('ticket_url', e.target.value)} onBlur={() => saveFunnelField('ticket_url')} placeholder="https://..." className="mt-1 w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white/80 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div><label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase">Idade min</label>
            <input type="number" value={funnelForm.target_age_min ?? ''} onChange={e => updateFunnelForm('target_age_min', e.target.value)} onBlur={() => salvarFunnel({ target_age_min: parseInt(funnelForm.target_age_min) || 18 })} className="mt-1 w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white/80 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase">Idade max</label>
            <input type="number" value={funnelForm.target_age_max ?? ''} onChange={e => updateFunnelForm('target_age_max', e.target.value)} onBlur={() => salvarFunnel({ target_age_max: parseInt(funnelForm.target_age_max) || 45 })} className="mt-1 w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white/80 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
          <div><label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase">CTA do Anúncio</label>
            <select value={funnelForm.cta ?? 'LEARN_MORE'} onChange={e => { updateFunnelForm('cta', e.target.value); salvarFunnel({ cta: e.target.value }) }} className="mt-1 w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white/80 focus:ring-2 focus:ring-orange-500 outline-none">
              <option value="LEARN_MORE">Saiba Mais</option><option value="BUY_TICKETS">Comprar Ingressos</option><option value="SHOP_NOW">Comprar Agora</option><option value="SIGN_UP">Cadastre-se</option><option value="GET_TICKETS">Obter Ingressos</option>
            </select></div>
          <div><label className="text-[10px] font-bold text-gray-400 dark:text-white/30 uppercase">Interesses</label>
            <input value={funnelForm.target_interests ?? ''} onChange={e => updateFunnelForm('target_interests', e.target.value)} onBlur={() => saveFunnelField('target_interests')} placeholder="Ex: Funk, Sertanejo" className="mt-1 w-full border border-gray-200 dark:border-white/[0.08] rounded-lg px-3 py-2 text-sm bg-white dark:bg-white/[0.04] text-gray-900 dark:text-white/80 focus:ring-2 focus:ring-orange-500 outline-none" /></div>
        </div>
      </div>

      {/* Fases */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {phases.map(phase => {
          const isActive = funnel?.current_phase === phase.num && funnel?.status === 'active'
          const hasCampaign = funnel?.['phase' + phase.num + '_campaign_id']
          const budgetPct = funnel?.['budget_phase' + phase.num] || 25
          const totalBudget = funnel?.total_budget || 50000
          const phaseBudget = Math.round(totalBudget * (budgetPct / 100))
          return (
            <div key={phase.num} className={'rounded-xl border-2 overflow-hidden transition-all ' + (isActive ? bgMap[phase.color] + ' shadow-lg ring-2 ring-offset-1' : 'bg-white dark:bg-white/[0.04] border-gray-200 dark:border-white/[0.06]')}>
              <div className={'bg-gradient-to-r ' + colorMap[phase.color] + ' px-4 py-3 flex items-center justify-between'}>
                <div><span className="text-white text-lg">{phase.icon}</span><p className="text-white font-bold text-sm">{phase.name}</p></div>
                {isActive && <span className="w-3 h-3 rounded-full bg-white animate-pulse" />}
                {hasCampaign && !isActive && <span className="text-white/60 text-xs">✓</span>}
              </div>
              <div className="p-3 space-y-2">
                <p className="text-[10px] text-gray-500 dark:text-white/40">{phase.desc}</p>
                <p className="text-[10px] text-gray-400 dark:text-white/30 font-medium">{phase.days}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-600 dark:text-white/60">Budget: {budgetPct}%</span>
                  <span className={'text-[10px] font-bold ' + textMap[phase.color]}>R$ {(phaseBudget / 100).toFixed(0)}</span>
                </div>
                <input type="range" min="5" max="50" value={budgetPct} onChange={e => salvarFunnel({ ['budget_phase' + phase.num]: parseInt(e.target.value) })} className="w-full h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-white/[0.08] accent-blue-500" />
                {isActive && <div className={'text-[10px] font-bold text-center py-1.5 rounded-lg ' + bgMap[phase.color] + ' ' + textMap[phase.color]}>▶ Fase Ativa</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Performance */}
      {funnel?.status === 'active' && (
        <div className="bg-white dark:bg-white/[0.04] rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2"><span className="text-base">📊</span><h3 className="font-bold text-gray-900 dark:text-white/90 text-sm">Performance dos Anúncios</h3></div>
            <button onClick={carregarMetrics} disabled={metricsLoading} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (metricsLoading ? 'bg-gray-200 dark:bg-white/[0.06] text-gray-400 dark:text-white/30 animate-pulse' : 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/30')}>
              {metricsLoading ? '⏳ Carregando...' : '🔄 Atualizar'}
            </button>
          </div>
          {metrics ? (
            <div className="p-4 space-y-4">
              {(() => {
                const totalSpend = metrics.phases.reduce((s, p) => s + parseFloat(p.insights?.spend || 0), 0)
                const totalClicks = metrics.phases.reduce((s, p) => s + parseInt(p.insights?.clicks || 0), 0)
                const totalImpressions = metrics.phases.reduce((s, p) => s + parseInt(p.insights?.impressions || 0), 0)
                const totalReach = metrics.phases.reduce((s, p) => s + parseInt(p.insights?.reach || 0), 0)
                const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0'
                const avgCpc = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0'
                const budgetUsed = metrics.total_budget ? ((totalSpend * 100 / metrics.total_budget) * 100).toFixed(0) : 0
                return (
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-500/25"><p className="text-lg font-bold text-blue-600 dark:text-blue-400">R$ {totalSpend.toFixed(2)}</p><p className="text-[9px] text-blue-400 font-semibold">Investido</p><div className="mt-1 w-full bg-blue-200 dark:bg-blue-500/30 rounded-full h-1"><div className="bg-blue-500 h-1 rounded-full" style={{ width: Math.min(100, budgetUsed) + '%' }} /></div><p className="text-[8px] text-blue-400 mt-0.5">{budgetUsed}% do orçamento</p></div>
                    <div className="bg-green-50 dark:bg-green-500/10 rounded-lg p-3 text-center border border-green-100 dark:border-green-500/25"><p className="text-lg font-bold text-green-600 dark:text-green-400">{totalClicks.toLocaleString()}</p><p className="text-[9px] text-green-400 font-semibold">Cliques</p></div>
                    <div className="bg-violet-50 dark:bg-violet-500/10 rounded-lg p-3 text-center border border-violet-100 dark:border-violet-500/25"><p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalImpressions.toLocaleString()}</p><p className="text-[9px] text-violet-400 font-semibold">Impressões</p></div>
                    <div className="bg-orange-50 dark:bg-orange-500/10 rounded-lg p-3 text-center border border-orange-100 dark:border-orange-500/25"><p className="text-lg font-bold text-orange-600 dark:text-orange-400">{totalReach.toLocaleString()}</p><p className="text-[9px] text-orange-400 font-semibold">Alcance</p></div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-500/25"><p className={'text-lg font-bold ' + (parseFloat(avgCtr) >= 2 ? 'text-green-600 dark:text-green-400' : parseFloat(avgCtr) >= 1 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')}>{avgCtr}%</p><p className="text-[9px] text-blue-400 font-semibold">CTR Médio</p></div>
                    <div className="bg-blue-50 dark:bg-blue-500/10 rounded-lg p-3 text-center border border-blue-100 dark:border-blue-500/25"><p className={'text-lg font-bold ' + (parseFloat(avgCpc) <= 0.5 ? 'text-green-600 dark:text-green-400' : parseFloat(avgCpc) <= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400')}>R$ {avgCpc}</p><p className="text-[9px] text-blue-400 font-semibold">CPC Médio</p></div>
                  </div>
                )
              })()}

              {/* Por fase */}
              {metrics.phases.filter(p => p.campaign_id).map(phase => {
                const isAct = metrics.current_phase === phase.phase
                const statusMap = { ACTIVE: '🟢 Ativo', PAUSED: '⏸ Pausado', ARCHIVED: '📦 Arquivado', WITH_ISSUES: '⚠️ Problemas' }
                return (
                  <div key={phase.phase} className={'rounded-xl border overflow-hidden ' + (isAct ? 'border-blue-300 dark:border-blue-500/30 ring-1 ring-blue-200 dark:ring-blue-500/20' : 'border-gray-200 dark:border-white/[0.06]')}>
                    <div className={'px-4 py-2.5 flex items-center justify-between ' + (isAct ? 'bg-blue-50 dark:bg-blue-500/10' : 'bg-gray-50 dark:bg-white/[0.03]')}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{['', '📢', '🤔', '🎯', '🔥'][phase.phase]}</span>
                        <span className="font-bold text-sm text-gray-900 dark:text-white/90">Fase {phase.phase}: {phase.name}</span>
                        {isAct && <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 rounded text-[9px] font-bold">ATIVA</span>}
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-white/40">{statusMap[phase.campaign_status] || phase.campaign_status}</span>
                    </div>
                    {phase.insights ? (
                      <div className="px-4 py-3">
                        <div className="grid grid-cols-6 gap-2 mb-3">
                          {[{ k: 'spend', l: 'Gasto', p: 'R$ ' }, { k: 'impressions', l: 'Impressões' }, { k: 'reach', l: 'Alcance' }, { k: 'clicks', l: 'Cliques' }, { k: 'ctr', l: 'CTR', s: '%' }, { k: 'cpc', l: 'CPC', p: 'R$ ' }].map(m => (
                            <div key={m.k} className="text-center"><p className="text-xs font-bold text-gray-900 dark:text-white/80">{m.p || ''}{m.k === 'ctr' || m.k === 'cpc' ? parseFloat(phase.insights[m.k] || 0).toFixed(2) : m.k === 'spend' ? parseFloat(phase.insights[m.k] || 0).toFixed(2) : parseInt(phase.insights[m.k] || 0).toLocaleString()}{m.s || ''}</p><p className="text-[8px] text-gray-400 dark:text-white/30">{m.l}</p></div>
                          ))}
                        </div>
                      </div>
                    ) : <div className="px-4 py-3 text-center"><p className="text-[10px] text-gray-400 dark:text-white/30">Sem dados ainda</p></div>}
                    {phase.ads?.length > 0 && (
                      <div className="px-4 pb-3 space-y-1.5">
                        <p className="text-[9px] font-bold text-gray-400 dark:text-white/30 uppercase">Anúncios ({phase.ads.length})</p>
                        {phase.ads.map(ad => (
                          <div key={ad.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/[0.06]">
                            {ad.creative?.thumbnail_url && <img src={ad.creative.thumbnail_url} className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-white/[0.06]" />}
                            <div className="flex-1 min-w-0"><p className="text-[10px] font-bold text-gray-900 dark:text-white/80 truncate">{ad.name}</p><div className="flex items-center gap-1.5 mt-0.5"><span className={'w-1.5 h-1.5 rounded-full ' + (ad.effective_status === 'ACTIVE' ? 'bg-green-500' : 'bg-gray-400')} /><span className="text-[9px] text-gray-500 dark:text-white/40">{ad.effective_status || ad.status}</span></div></div>
                            {ad.insights && <div className="flex gap-3 text-center">{[{ k: 'clicks', l: 'Cliques' }, { k: 'ctr', l: 'CTR', s: '%' }, { k: 'spend', l: 'Gasto', p: 'R$ ' }].map(m => <div key={m.k}><p className="text-[10px] font-bold text-gray-900 dark:text-white/80">{m.p || ''}{m.k === 'ctr' ? parseFloat(ad.insights[m.k] || 0).toFixed(2) : m.k === 'spend' ? parseFloat(ad.insights[m.k] || 0).toFixed(2) : parseInt(ad.insights[m.k] || 0)}{m.s || ''}</p><p className="text-[8px] text-gray-400 dark:text-white/30">{m.l}</p></div>)}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-6 text-center"><button onClick={carregarMetrics} className="px-4 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 rounded-lg text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition">📊 Carregar Métricas</button></div>
          )}
        </div>
      )}

      {/* AI Manager */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4 text-white">
        {(funnel?.ai_strategy || funnel?.ai_audience_profile) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {funnel.ai_audience_profile && <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"><p className="text-[10px] font-bold text-violet-400 uppercase mb-1.5">👥 Público Identificado</p><p className="text-xs text-gray-300 leading-relaxed">{funnel.ai_audience_profile}</p></div>}
            {funnel.ai_strategy && <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700"><p className="text-[10px] font-bold text-orange-400 uppercase mb-1.5">🎯 Estratégia Atual</p><p className="text-xs text-gray-300 leading-relaxed">{funnel.ai_strategy}</p></div>}
          </div>
        )}
        {funnel?.ai_optimizations_count > 0 && (
          <div className="flex gap-3 mb-4">
            <div className="flex-1 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center"><p className="text-lg font-bold text-violet-400">{funnel.ai_optimizations_count}</p><p className="text-[9px] text-gray-500">Otimizações</p></div>
            <div className="flex-1 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-center"><p className="text-lg font-bold text-green-400">{abTests.length}</p><p className="text-[9px] text-gray-500">Testes A/B</p></div>
            <div className="flex-1 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-center"><p className="text-lg font-bold text-blue-400">{aiLogs.filter(l => l.action === 'adjust_budget').length}</p><p className="text-[9px] text-gray-500">Ajustes Budget</p></div>
            <div className="flex-1 p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center"><p className="text-lg font-bold text-orange-400">{funnel.ai_last_analysis ? new Date(funnel.ai_last_analysis).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</p><p className="text-[9px] text-gray-500">Última Análise</p></div>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-lg">🤖</div><div><h3 className="font-bold text-sm">AI Ad Manager</h3><p className="text-[10px] text-gray-400">Otimização automática a cada 3h</p></div></div>
          <button onClick={forcarAnaliseAI} disabled={aiAnalyzing || funnel?.status !== 'active'} className={'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (aiAnalyzing ? 'bg-purple-900 text-violet-400 animate-pulse' : funnel?.status !== 'active' ? 'bg-gray-700 text-gray-500' : 'bg-accent text-white hover:bg-accent/90 shadow-md')}>
            {aiAnalyzing ? '⏳ Analisando...' : '🧠 Analisar Agora'}
          </button>
        </div>
        {aiResult && (
          <div className="mb-4 p-3 rounded-lg bg-gray-800/50 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <span className={'px-2 py-0.5 rounded text-[9px] font-bold ' + (aiResult.risk_level === 'low' ? 'bg-green-500/20 text-green-400' : aiResult.risk_level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')}>{aiResult.risk_level === 'low' ? '🟢 Risco Baixo' : aiResult.risk_level === 'medium' ? '🟡 Risco Médio' : '🔴 Risco Alto'}</span>
              <span className="text-[9px] text-gray-500">{aiResult.decisions?.length || 0} decisões</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">{aiResult.analysis_summary}</p>
            {aiResult.recommendation && <p className="text-[10px] text-violet-400 mt-2 font-medium">💡 {aiResult.recommendation}</p>}
            {aiResult.learnings && <p className="text-[10px] text-cyan-400 mt-1 font-medium">📚 {aiResult.learnings}</p>}
            {aiResult.decisions?.length > 0 && <div className="mt-3 space-y-1">{aiResult.decisions.map((d, i) => <div key={i} className="flex items-center gap-2 text-[10px]"><span>{d.type === 'adjust_budget' ? '💰' : d.type === 'pause_ad' ? '⏸' : d.type === 'create_ab_test' ? '🔬' : '▶️'}</span><span className="text-gray-400">{d.reason}</span></div>)}</div>}
          </div>
        )}
        {abTests.filter(t => t.status === 'running').length > 0 && (
          <div className="mb-4"><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">🔬 Testes A/B Ativos</p><div className="space-y-2">{abTests.filter(t => t.status === 'running').map(test => (<div key={test.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-800/50 border border-gray-700"><div className="flex-1"><p className="text-[10px] font-bold text-blue-400">A: {test.ad_a_name}</p><p className="text-[9px] text-gray-500">CTR: {test.metrics_a?.ctr ? parseFloat(test.metrics_a.ctr).toFixed(2) : '—'}%</p></div><span className="text-gray-600 text-xs font-bold">VS</span><div className="flex-1 text-right"><p className="text-[10px] font-bold text-violet-400">B: {test.ad_b_name}</p><p className="text-[9px] text-gray-500">CTR: {test.metrics_b?.ctr ? parseFloat(test.metrics_b.ctr).toFixed(2) : '—'}%</p></div></div>))}</div></div>
        )}
        {aiLogs.length > 0 && (
          <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">📋 Últimas Ações da IA</p><div className="space-y-1 max-h-48 overflow-y-auto pr-1">{aiLogs.slice(0, 15).map(log => {
            const icons = { ai_analysis: '🧠', adjust_budget: '💰', pause_ad: '⏸', activate_ad: '▶️', create_ab_test: '🔬', ab_test_winner: '🏆', auto_add_post: '🚀' }
            const colors = { ai_analysis: 'text-violet-400', adjust_budget: 'text-blue-400', pause_ad: 'text-red-400', activate_ad: 'text-green-400', create_ab_test: 'text-violet-400', ab_test_winner: 'text-yellow-400', auto_add_post: 'text-orange-400' }
            return <div key={log.id} className="flex items-start gap-2 text-[10px] py-1 border-b border-gray-800"><span>{icons[log.action] || '📌'}</span><div className="flex-1 min-w-0"><span className={colors[log.action] || 'text-gray-400'}>{log.details}</span><span className="text-gray-600 ml-2">{new Date(log.criado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span></div></div>
          })}</div></div>
        )}
        {aiLogs.length === 0 && !aiResult && <div className="text-center py-6"><p className="text-2xl mb-2">🤖</p><p className="text-xs text-gray-400">Ative o funil para a IA começar a otimizar</p><p className="text-[10px] text-gray-600 mt-1">A IA analisa a cada 3h, ajusta budgets, pausa anúncios ruins e cria testes A/B</p></div>}
      </div>

      {/* Explicação */}
      <div className="bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06] p-4">
        <p className="text-xs font-bold text-gray-400 dark:text-white/30 uppercase mb-2">Como funciona</p>
        <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-white/40 flex-wrap">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 rounded font-bold">📢 Awareness</span><span>→</span>
          <span className="px-2 py-1 bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 rounded font-bold">🤔 Consideração</span><span>→</span>
          <span className="px-2 py-1 bg-orange-100 dark:bg-orange-500/15 text-orange-700 dark:text-orange-400 rounded font-bold">🎯 Conversão</span><span>→</span>
          <span className="px-2 py-1 bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 rounded font-bold">🔥 Urgência</span><span>→</span>
          <span className="px-2 py-1 bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-400 rounded font-bold">🎉 Evento!</span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-white/30 mt-2">O sistema muda de fase automaticamente com base na data do evento. Posts publicados são adicionados como anúncios na fase atual.</p>
      </div>
    </div>
  )
}
