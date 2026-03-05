const express = require('express');
module.exports = function({ pool, auth, CLAUDE }) {
  const router = express.Router();

  const FB_TOKEN = process.env.META_FB_TOKEN;
  const GRAPH_URL = 'https://graph.facebook.com/v21.0';
  const INSIGHTS_FIELDS = 'impressions,reach,clicks,cpc,cpm,ctr,spend,frequency,actions,cost_per_action_type,action_values';

  function getAdAccounts() {
    const accounts = process.env.META_AD_ACCOUNTS || process.env.META_AD_ACCOUNT_ID || '';
    return accounts.split(',').map(a => a.trim()).filter(Boolean);
  }

  function extractConversions(insights) {
    let conversions = 0, purchases = 0, leads = 0, registrations = 0, conversionValue = 0;
    if (insights.actions) {
      for (const a of insights.actions) {
        if (a.action_type === 'purchase' || (a.action_type && a.action_type.includes('fb_pixel_purchase'))) purchases += parseInt(a.value || 0);
        if (a.action_type === 'lead') leads += parseInt(a.value || 0);
        if (a.action_type === 'complete_registration') registrations += parseInt(a.value || 0);
        if (['offsite_conversion', 'purchase', 'complete_registration', 'lead'].includes(a.action_type)) {
          conversions += parseInt(a.value || 0);
        }
      }
    }
    if (insights.action_values) {
      for (const av of insights.action_values) {
        if (av.action_type === 'purchase' || (av.action_type && av.action_type.includes('fb_pixel_purchase')) || av.action_type === 'offsite_conversion') {
          conversionValue += parseFloat(av.value || 0);
        }
      }
    }
    const spend = parseFloat(insights.spend || 0);
    const clicks = parseInt(insights.clicks || 0);
    return {
      conversions, purchases, leads, registrations,
      conversion_value: conversionValue,
      roas: spend > 0 ? (conversionValue / spend).toFixed(2) : '0.00',
      cpa: conversions > 0 ? (spend / conversions).toFixed(2) : '0.00',
      conversion_rate: clicks > 0 ? ((conversions / clicks) * 100).toFixed(2) : '0.00'
    };
  }

  // === LISTAR CONTAS ===
  router.get('/api/anuncios/contas', auth, async (req, res) => {
    try {
      const accounts = getAdAccounts();
      const result = [];
      for (const accId of accounts) {
        try {
          const r = await fetch(`${GRAPH_URL}/${accId}?fields=name,account_status,currency,amount_spent&access_token=${FB_TOKEN}`);
          const d = await r.json();
          if (d.error) { result.push({ id: accId, name: accId, status: 'erro', erro: d.error.message }); continue; }
          result.push({ id: accId, name: d.name || accId, status: d.account_status, currency: d.currency, amount_spent: d.amount_spent });
        } catch (e) {
          result.push({ id: accId, name: accId, status: 'erro', erro: e.message });
        }
      }
      res.json(result);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // === MAPEAMENTO EVENTOS-CAMPANHAS ===
  router.get('/api/anuncios/eventos-map', auth, async (req, res) => {
    try {
      const eventos = await pool.query('SELECT id, nome, data_evento FROM eventos WHERE org_id=$1 ORDER BY data_evento DESC', [req.user.org_id]);
      const funnels = await pool.query('SELECT evento_id, phase1_campaign_id, phase2_campaign_id, phase3_campaign_id, phase4_campaign_id FROM ad_funnels WHERE org_id=$1', [req.user.org_id]);
      const funnelMap = {};
      for (const f of funnels.rows) {
        for (let p = 1; p <= 4; p++) {
          const campId = f['phase' + p + '_campaign_id'];
          if (campId && campId !== '') funnelMap[campId] = f.evento_id;
        }
      }
      res.json({ eventos: eventos.rows, funnelMap });
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // === RESUMO GERAL ===
  router.get('/api/anuncios/resumo', auth, async (req, res) => {
    try {
      const { conta, desde, ate } = req.query;
      const accounts = conta ? [conta] : getAdAccounts();
      const hoje = new Date().toISOString().split('T')[0];
      const timeRange = JSON.stringify({ since: desde || new Date(Date.now() - 30*86400000).toISOString().split('T')[0], until: ate || hoje });

      let totalSpend = 0, totalImpressions = 0, totalReach = 0, totalClicks = 0, totalFrequency = 0;
      let totalConversions = 0, totalPurchases = 0, totalLeads = 0, totalRegistrations = 0, totalConversionValue = 0;
      let accountCount = 0;

      for (const accId of accounts) {
        try {
          const r = await fetch(`${GRAPH_URL}/${accId}/insights?fields=${INSIGHTS_FIELDS}&time_range=${encodeURIComponent(timeRange)}&access_token=${FB_TOKEN}`);
          const d = await r.json();
          if (d.data && d.data[0]) {
            const ins = d.data[0];
            totalSpend += parseFloat(ins.spend || 0);
            totalImpressions += parseInt(ins.impressions || 0);
            totalReach += parseInt(ins.reach || 0);
            totalClicks += parseInt(ins.clicks || 0);
            totalFrequency += parseFloat(ins.frequency || 0);
            accountCount++;
            const cv = extractConversions(ins);
            totalConversions += cv.conversions;
            totalPurchases += cv.purchases;
            totalLeads += cv.leads;
            totalRegistrations += cv.registrations;
            totalConversionValue += cv.conversion_value;
          }
        } catch {}
      }

      const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
      const cpc = totalClicks > 0 ? (totalSpend / totalClicks) : 0;
      const cpm = totalImpressions > 0 ? (totalSpend / totalImpressions * 1000) : 0;
      const freq = accountCount > 0 ? (totalFrequency / accountCount) : 0;

      res.json({
        spend: totalSpend, impressions: totalImpressions, reach: totalReach,
        clicks: totalClicks, ctr: ctr.toFixed(2), cpc: cpc.toFixed(2),
        cpm: cpm.toFixed(2), frequency: freq.toFixed(2),
        conversions: totalConversions, purchases: totalPurchases, leads: totalLeads,
        registrations: totalRegistrations, conversion_value: totalConversionValue,
        roas: totalSpend > 0 ? (totalConversionValue / totalSpend).toFixed(2) : '0.00',
        cpa: totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0.00',
        conversion_rate: totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00'
      });
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // === GASTO DIARIO ===
  router.get('/api/anuncios/diario', auth, async (req, res) => {
    try {
      const { conta, desde, ate } = req.query;
      const accounts = conta ? [conta] : getAdAccounts();
      const hoje = new Date().toISOString().split('T')[0];
      const timeRange = JSON.stringify({ since: desde || new Date(Date.now() - 30*86400000).toISOString().split('T')[0], until: ate || hoje });

      const diasMap = {};

      for (const accId of accounts) {
        try {
          const r = await fetch(`${GRAPH_URL}/${accId}/insights?fields=spend,impressions,clicks,actions,action_values&time_range=${encodeURIComponent(timeRange)}&time_increment=1&limit=200&access_token=${FB_TOKEN}`);
          const d = await r.json();
          if (d.data) {
            for (const row of d.data) {
              const dia = row.date_start;
              if (!diasMap[dia]) diasMap[dia] = { data: dia, spend: 0, impressions: 0, clicks: 0, conversions: 0, conversion_value: 0 };
              diasMap[dia].spend += parseFloat(row.spend || 0);
              diasMap[dia].impressions += parseInt(row.impressions || 0);
              diasMap[dia].clicks += parseInt(row.clicks || 0);
              const cv = extractConversions(row);
              diasMap[dia].conversions += cv.conversions;
              diasMap[dia].conversion_value += cv.conversion_value;
            }
          }
        } catch {}
      }

      const dias = Object.values(diasMap).sort((a, b) => a.data.localeCompare(b.data));
      res.json(dias);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // === CAMPANHAS COM MÉTRICAS ===
  router.get('/api/anuncios/campanhas', auth, async (req, res) => {
    try {
      const { conta, desde, ate } = req.query;
      const accounts = conta ? [conta] : getAdAccounts();
      const hoje = new Date().toISOString().split('T')[0];
      const since = desde || new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
      const until = ate || hoje;
      const timeRange = JSON.stringify({ since, until });

      const campanhas = [];

      for (const accId of accounts) {
        try {
          const r = await fetch(`${GRAPH_URL}/${accId}/campaigns?fields=name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=100&access_token=${FB_TOKEN}`);
          const d = await r.json();
          if (d.error) { return res.status(400).json({ erro: d.error.message }); }
          if (!d.data) continue;

          for (const camp of d.data) {
            let insights = {};
            try {
              const ir = await fetch(`${GRAPH_URL}/${camp.id}/insights?fields=${INSIGHTS_FIELDS}&time_range=${encodeURIComponent(timeRange)}&access_token=${FB_TOKEN}`);
              const id = await ir.json();
              if (id.data && id.data[0]) insights = id.data[0];
            } catch {}

            const cv = extractConversions(insights);

            campanhas.push({
              id: camp.id,
              name: camp.name,
              status: camp.status,
              effective_status: camp.effective_status,
              objective: camp.objective,
              daily_budget: camp.daily_budget,
              lifetime_budget: camp.lifetime_budget,
              start_time: camp.start_time,
              stop_time: camp.stop_time,
              account_id: accId,
              insights,
              ...cv
            });
          }
        } catch {}
      }

      res.json(campanhas);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // === ADSETS DE UMA CAMPANHA ===
  router.get('/api/anuncios/campanhas/:id/adsets', auth, async (req, res) => {
    try {
      const { desde, ate } = req.query;
      const hoje = new Date().toISOString().split('T')[0];
      const timeRange = JSON.stringify({ since: desde || new Date(Date.now() - 30*86400000).toISOString().split('T')[0], until: ate || hoje });

      const r = await fetch(`${GRAPH_URL}/${req.params.id}/adsets?fields=name,status,effective_status,daily_budget,targeting&limit=100&access_token=${FB_TOKEN}`);
      const d = await r.json();
      if (!d.data) return res.json([]);

      const adsets = [];
      for (const as of d.data) {
        let insights = {};
        try {
          const ir = await fetch(`${GRAPH_URL}/${as.id}/insights?fields=${INSIGHTS_FIELDS}&time_range=${encodeURIComponent(timeRange)}&access_token=${FB_TOKEN}`);
          const id = await ir.json();
          if (id.data && id.data[0]) insights = id.data[0];
        } catch {}
        adsets.push({ id: as.id, name: as.name, status: as.status, effective_status: as.effective_status, daily_budget: as.daily_budget, targeting: as.targeting, insights });
      }

      res.json(adsets);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // === CRIATIVOS (FLAT) ===
  router.get('/api/anuncios/criativos', auth, async (req, res) => {
    try {
      const { conta, desde, ate } = req.query;
      const accounts = conta ? [conta] : getAdAccounts();
      const hoje = new Date().toISOString().split('T')[0];
      const since = desde || new Date(Date.now() - 30*86400000).toISOString().split('T')[0];
      const until = ate || hoje;
      const timeRange = JSON.stringify({ since, until });

      const criativos = [];

      for (const accId of accounts) {
        try {
          const r = await fetch(`${GRAPH_URL}/${accId}/ads?fields=name,status,effective_status,campaign{name,id},creative{thumbnail_url,title,body}&limit=200&access_token=${FB_TOKEN}`);
          const d = await r.json();
          if (d.error || !d.data) continue;

          for (const ad of d.data) {
            let insights = {};
            try {
              const ir = await fetch(`${GRAPH_URL}/${ad.id}/insights?fields=${INSIGHTS_FIELDS}&time_range=${encodeURIComponent(timeRange)}&access_token=${FB_TOKEN}`);
              const id = await ir.json();
              if (id.data && id.data[0]) insights = id.data[0];
            } catch {}

            const spend = parseFloat(insights.spend || 0);
            const impressions = parseInt(insights.impressions || 0);
            const clicks = parseInt(insights.clicks || 0);
            const reach = parseInt(insights.reach || 0);
            const cv = extractConversions(insights);

            criativos.push({
              id: ad.id,
              name: ad.name,
              status: ad.status,
              effective_status: ad.effective_status,
              campaign_name: ad.campaign?.name || '',
              campaign_id: ad.campaign?.id || '',
              creative: ad.creative || {},
              spend, impressions, clicks, reach,
              ctr: impressions > 0 ? (clicks / impressions * 100).toFixed(2) : '0.00',
              cpc: clicks > 0 ? (spend / clicks).toFixed(2) : '0.00',
              cpm: impressions > 0 ? (spend / impressions * 1000).toFixed(2) : '0.00',
              ...cv
            });
          }
        } catch {}
      }

      res.json(criativos);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // === ADS DE UM ADSET ===
  router.get('/api/anuncios/adsets/:id/ads', auth, async (req, res) => {
    try {
      const { desde, ate } = req.query;
      const hoje = new Date().toISOString().split('T')[0];
      const timeRange = JSON.stringify({ since: desde || new Date(Date.now() - 30*86400000).toISOString().split('T')[0], until: ate || hoje });

      const r = await fetch(`${GRAPH_URL}/${req.params.id}/ads?fields=name,status,effective_status,creative{thumbnail_url,title,body}&limit=100&access_token=${FB_TOKEN}`);
      const d = await r.json();
      if (!d.data) return res.json([]);

      const ads = [];
      for (const ad of d.data) {
        let insights = {};
        try {
          const ir = await fetch(`${GRAPH_URL}/${ad.id}/insights?fields=${INSIGHTS_FIELDS}&time_range=${encodeURIComponent(timeRange)}&access_token=${FB_TOKEN}`);
          const id = await ir.json();
          if (id.data && id.data[0]) insights = id.data[0];
        } catch {}
        ads.push({ id: ad.id, name: ad.name, status: ad.status, effective_status: ad.effective_status, creative: ad.creative, insights });
      }

      res.json(ads);
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  // === ANALISE IA DE CRIATIVOS ===
  router.post('/api/anuncios/analise-ia', auth, async (req, res) => {
    try {
      const { criativos, campanha } = req.body;
      if (!criativos || !criativos.length) return res.status(400).json({ erro: 'Nenhum criativo enviado' });
      if (!CLAUDE) return res.status(400).json({ erro: 'API key da IA nao configurada' });

      const top = criativos.slice(0, 30).map((cr, i) => {
        return `${i+1}. "${cr.name}" (Campanha: ${cr.campaign_name})
   Status: ${cr.effective_status} | Gasto: R$${parseFloat(cr.spend).toFixed(2)} | Impressoes: ${cr.impressions} | Cliques: ${cr.clicks}
   CTR: ${cr.ctr}% | CPC: R$${parseFloat(cr.cpc).toFixed(2)} | CPM: R$${parseFloat(cr.cpm).toFixed(2)}
   Conversoes: ${cr.conversions} | ROAS: ${cr.roas}x | CPA: R$${parseFloat(cr.cpa).toFixed(2)}
   Titulo criativo: ${cr.creative?.title || 'N/A'} | Texto: ${cr.creative?.body || 'N/A'}`;
      }).join('\n\n');

      const contexto = campanha
        ? `Voce esta analisando os criativos especificamente da campanha "${campanha}". Foque sua analise nessa campanha, comparando os criativos entre si para identificar qual funciona melhor dentro dessa campanha.\n\n`
        : '';

      const prompt = `Voce e um especialista em trafego pago e performance de anuncios Meta Ads (Facebook/Instagram). Analise os criativos abaixo e faca uma analise completa em portugues (pt-BR).

${contexto}DADOS DOS CRIATIVOS:
${top}

Faca a analise seguindo esta estrutura:

## Ranking dos Melhores Criativos
Liste os top 5 melhores criativos com justificativa baseada em metricas (CTR, CPC, ROAS, conversoes).

## Criativos com Pior Performance
Liste os 3 piores e explique por que estao performando mal.

## Padroes Identificados
Que padroes voce identifica nos criativos que performam bem vs mal? (tipo de copy, formato, abordagem)

## Recomendacoes de Otimizacao
- O que manter/escalar
- O que pausar
- Sugestoes de novos criativos baseado no que funciona
- Ajustes de copy e segmentacao

## Resumo Executivo
3-4 frases com os insights mais importantes para a equipe.

Seja direto, use dados concretos e de recomendacoes acionaveis.`;

      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
      });
      const d = await r.json();
      if (d.error) return res.status(400).json({ erro: d.error.message });
      const texto = d.content?.[0]?.text || 'Sem resposta da IA';
      res.json({ analise: texto });
    } catch (e) { res.status(500).json({ erro: e.message }); }
  });

  return router;
};
