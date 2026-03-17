const express = require('express');
const baladappAxios=require('axios');
const tough=require('tough-cookie');
const {wrapper}=require('axios-cookiejar-support');

module.exports = function({ pool, axios, auth }) {
  const router = express.Router();

async function baladappLogin(login,senha){
  const jar=new tough.CookieJar();
  const client=wrapper(baladappAxios.create({jar,withCredentials:true}));
  const loginRes=await client.post('https://acesso-adm.baladapp.com.br/produtor/login.json',{login,type:'password',password:senha},{headers:{'Content-Type':'application/json','Accept':'application/json'}});
  if(loginRes.data.status!=='ok')throw new Error('Login falhou');
  const token=loginRes.data.dados.token;
  await client.get('https://produtor.baladapp.com.br/baladapp-login/v1/auth?token='+encodeURIComponent(token),{maxRedirects:5});
  return client;
}

async function baladappSyncEvento(eventoId,orgId){
  try{
    const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[eventoId,orgId]);
    if(!ev.rows.length||!ev.rows[0].baladapp_id)return{erro:'Evento sem baladapp_id'};
    const cfg=await pool.query('SELECT * FROM baladapp_config WHERE org_id=$1 LIMIT 1',[orgId]);
    if(!cfg.rows.length)return{erro:'Sem config BaladaAPP'};
    const client=await baladappLogin(cfg.rows[0].login,cfg.rows[0].senha);
    const bId=ev.rows[0].baladapp_id;
    // Buscar totais via headers (1 request apenas)
    var pedRes=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+bId+'/pedidos?page=1&status=aprovado',{headers:{'Accept':'application/json'}});
    var totalLinhas=parseInt(pedRes.headers['totallinhas'])||0;
    var valorTotal=parseFloat(pedRes.headers['valortotal'])||0;
    var valorTotalFiltrado=parseFloat(pedRes.headers['valortotalfiltrado'])||0;
    var totalIngressos=parseInt(pedRes.headers['quantidadetotalingressos'])||0;
    var totalIngressosFiltrados=parseInt(pedRes.headers['quantidadetotalingressosfiltrados'])||0;
    console.log('BaladaAPP: '+totalLinhas+' pedidos, R$ '+valorTotal+' total, R$ '+valorTotalFiltrado+' filtrado, '+totalIngressos+' ingressos');
    var totalAprovado=valorTotal;
    var novos=totalLinhas;var atualizados=0;
    // Atualizar receitas automaticamente
    // Primeiro remove receitas antigas do baladapp
    await pool.query("DELETE FROM receitas WHERE id_evento=$1 AND org_id=$2 AND conta='BaladaAPP'",[eventoId,orgId]);
    // Buscar detalhes do evento pra saber sessoes
    var detRes=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+bId,{headers:{'Accept':'application/json'}});
    var sessoes=detRes.data.sessoes||[];
    // Criar receita unica com total aprovado
    if(totalAprovado>0){
      await pool.query("INSERT INTO receitas(org_id,id_evento,descricao,centro_custo,valor,situacao,conta) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [orgId,eventoId,'Vendas BaladaAPP - '+(detRes.data.evento||{}).titulo,'BaladaAPP',totalAprovado,'RECEBIDO','BaladaAPP']);
    }
    // Criar conta BaladaAPP se não existir
    var contaExiste=await pool.query("SELECT id FROM contas_evento WHERE id_evento=$1 AND org_id=$2 AND nome='BaladaAPP'",[eventoId,orgId]);
    if(!contaExiste.rows.length){
      await pool.query("INSERT INTO contas_evento(org_id,id_evento,nome,tipo,titular,percentual) VALUES($1,$2,'BaladaAPP','empresa','BaladaAPP Ticketeira',0)",[orgId,eventoId]);
      console.log('Conta BaladaAPP criada para evento #'+eventoId);
    }
    // Buscar cidades via endpoint de municipios
    var cidadesJson=null;
    try{
      var munRes=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+bId+'/cancelamentos/municipios',{headers:{'Accept':'application/json'}});
      var munData=(munRes.data||[]).filter(m=>m.id!==null);
      cidadesJson=munData.map(m=>{
        var match=(m.titulo||'').match(/^(.+?)\s*-\s*(\w{2})\s*\((\d+)\)$/);
        if(match)return{cidade:match[1].trim(),estado:match[2],qtd:parseInt(match[3])};
        return{cidade:m.titulo||'Desconhecida',estado:'',qtd:0};
      }).filter(c=>c.qtd>0).sort((a,b)=>b.qtd-a.qtd);
      console.log('BaladaAPP cidades: '+cidadesJson.length+' cidades encontradas');
    }catch(e){console.error('Erro buscar cidades:',e.message)}
    // Buscar tipos de ingresso via relatorios
    var tiposJson=null;
    try{
      var tipRes=await client.get('https://produtor.baladapp.com.br/api/relatorios/geral-vendas-totais',{params:{anuncio_id:bId},headers:{'Accept':'application/json'}});
      tiposJson=(tipRes.data||[]).map(t=>({tipo:t.label,qtd:parseInt(t.quantidade)||0,total:parseFloat(t.valor_total)||0})).filter(t=>t.qtd>0).sort((a,b)=>b.total-a.total);
      console.log('BaladaAPP tipos: '+tiposJson.length+' tipos encontrados');
    }catch(e){console.error('Erro buscar tipos:',e.message)}
    // Atualizar timestamp, valor total, cidades e tipos
    await pool.query('UPDATE eventos SET baladapp_ultima_sync=NOW(),baladapp_valor_total=$1,baladapp_cidades_json=$2,baladapp_tipos_json=$3 WHERE id=$4',[totalAprovado,cidadesJson?JSON.stringify(cidadesJson):null,tiposJson?JSON.stringify(tiposJson):null,eventoId]);
    // Sync vendas detalhadas por dia
    try{
      await pool.query('DELETE FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2',[eventoId,orgId]);
      let syncPage=1;let syncTotal=0;let syncInseridos=0;
      while(true){
        const pr=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+bId+'/pedidos?pagina='+syncPage+'&status=aprovado',{headers:{'Accept':'application/json'}});
        const pedidos=pr.data||[];
        if(!pedidos.length)break;
        const syncTotalLinhas=parseInt(pr.headers['totallinhas'])||0;
        for(const p of pedidos){
          const pedidoId=parseInt(p.id)||0;
          if(!pedidoId)continue;
          try{
            await pool.query('INSERT INTO baladapp_vendas(org_id,id_evento,pedido_id,valor,quantidade_ingressos,tipo_venda,status,data_venda,cidade) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(pedido_id) DO UPDATE SET valor=$4,quantidade_ingressos=$5,tipo_venda=$6,status=$7,data_venda=$8,cidade=$9',
              [orgId,eventoId,pedidoId,parseFloat(p.valor)||0,parseInt(p.quantidade_ingressos)||1,(p.comissario&&p.comissario.nome)||'Online',p.status||'aprovado',p.datahora||new Date().toISOString(),(p.cliente&&p.cliente.cidade)||'']);
            syncInseridos++;
          }catch(e){}
        }
        syncTotal+=pedidos.length;
        if(syncTotal>=syncTotalLinhas)break;
        syncPage++;
        if(syncPage>200)break;
      }
      console.log('Auto-sync vendas: '+syncInseridos+' pedidos evento #'+eventoId);
    }catch(e){console.error('Erro auto-sync vendas:',e.message)}
    return{sucesso:true,total_pedidos:totalLinhas,novos,atualizados,total_aprovado:totalAprovado};
  }catch(e){console.error('BaladaAPP sync erro:',e.message);return{erro:e.message}}
}

// Config BaladaAPP
router.get('/api/baladapp/config',auth,async(req,res)=>{try{
const r=await pool.query('SELECT id,login,criado_em FROM baladapp_config WHERE org_id=$1 LIMIT 1',[req.user.org_id]);
res.json(r.rows[0]||null)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/baladapp/config',auth,async(req,res)=>{try{
const{login,senha}=req.body;
if(!login||!senha)return res.status(400).json({erro:'Login e senha obrigatorios'});
// Testar login
try{await baladappLogin(login,senha)}catch(e){return res.status(400).json({erro:'Login falhou: '+e.message})}
await pool.query('DELETE FROM baladapp_config WHERE org_id=$1',[req.user.org_id]);
const r=await pool.query('INSERT INTO baladapp_config(org_id,login,senha) VALUES($1,$2,$3) RETURNING id,login,criado_em',[req.user.org_id,login,senha]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

// Buscar evento da BaladaAPP por ID
router.get('/api/baladapp/evento/:baladappId',auth,async(req,res)=>{try{
const cfg=await pool.query('SELECT * FROM baladapp_config WHERE org_id=$1 LIMIT 1',[req.user.org_id]);
if(!cfg.rows.length)return res.status(400).json({erro:'Configure login BaladaAPP primeiro'});
const client=await baladappLogin(cfg.rows[0].login,cfg.rows[0].senha);
var r=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+req.params.baladappId,{headers:{'Accept':'application/json'}});
var a=r.data;
var ev=a.evento||{};
// Pegar totais de vendas
var pedRes=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+req.params.baladappId+'/pedidos?page=1',{headers:{'Accept':'application/json'}});
var totalPedidos=parseInt(pedRes.headers['totallinhas'])||0;
var valorTotal=parseFloat(pedRes.headers['valortotal'])||0;
var totalIngressos=parseInt(pedRes.headers['quantidadetotalingressos'])||0;
res.json({id:a.id,titulo:ev.titulo||'?',foto:ev.foto_url||'',local:(ev.local||{}).nome||'',data:a.data,finalizado:a.finalizado||false,ja_aconteceu:a.ja_aconteceu||false,total_pedidos:totalPedidos,valor_total:valorTotal,total_ingressos:totalIngressos,sessoes:(a.sessoes||[]).map(function(s){return{id:s.id,label:s.label}})})
}catch(e){if(e.response&&e.response.status===404)return res.status(404).json({erro:'Evento não encontrado na BaladaAPP'});res.status(500).json({erro:e.message})}});

// Vincular evento BaladaAPP a evento 314
router.post('/api/eventos/:id/baladapp/vincular',auth,async(req,res)=>{try{
const{baladapp_id}=req.body;
if(!baladapp_id)return res.status(400).json({erro:'ID BaladaAPP obrigatório'});
// Verificar se evento existe no 314
var ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento não encontrado'});
// Verificar se evento existe na BaladaAPP
var cfg=await pool.query('SELECT * FROM baladapp_config WHERE org_id=$1 LIMIT 1',[req.user.org_id]);
if(!cfg.rows.length)return res.status(400).json({erro:'Configure login BaladaAPP primeiro'});
var client=await baladappLogin(cfg.rows[0].login,cfg.rows[0].senha);
try{
  await client.get('https://produtor.baladapp.com.br/api/anuncios/'+baladapp_id,{headers:{'Accept':'application/json'}});
}catch(e){return res.status(404).json({erro:'Evento não encontrado na BaladaAPP'})}
// Vincular
await pool.query('UPDATE eventos SET baladapp_id=$1 WHERE id=$2',[baladapp_id,req.params.id]);
// Sync imediato
var result=await baladappSyncEvento(parseInt(req.params.id),req.user.org_id);
res.json({sucesso:true,baladapp_id:baladapp_id,sync:result})
}catch(e){res.status(500).json({erro:e.message})}});

// Desvincular evento BaladaAPP
router.delete('/api/eventos/:id/baladapp/vincular',auth,async(req,res)=>{try{
await pool.query('UPDATE eventos SET baladapp_id=NULL,baladapp_ultima_sync=NULL WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
await pool.query("DELETE FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2",[req.params.id,req.user.org_id]);
res.json({sucesso:true})
}catch(e){res.status(500).json({erro:e.message})}});

// Sync manual
router.post('/api/eventos/:id/baladapp/sync',auth,async(req,res)=>{try{
const result=await baladappSyncEvento(parseInt(req.params.id),req.user.org_id);
res.json(result)}catch(e){res.status(500).json({erro:e.message})}});

// Vendas do evento
router.get('/api/eventos/:id/baladapp/vendas',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2 ORDER BY data_venda DESC',[req.params.id,req.user.org_id]);
const stats=await pool.query("SELECT status,COUNT(*) as qtd,SUM(valor) as total FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2 GROUP BY status",[req.params.id,req.user.org_id]);
res.json({vendas:r.rows,stats:stats.rows})}catch(e){res.status(500).json({erro:e.message})}});

// ===== PREVISAO IA - Coeficientes dinamicos =====
router.get('/api/previsao/coeficientes',auth,async(req,res)=>{try{
  const orgId=req.user.org_id
  // Busca eventos finalizados com despesas
  const eventos=await pool.query(`
    SELECT e.id, e.nome, e.publico, e.tipo_local, e.tipo_bar,
      (SELECT COALESCE(SUM(valor),0) FROM despesas WHERE id_evento=e.id) as total_despesas,
      (SELECT COALESCE(SUM(valor),0) FROM receitas WHERE id_evento=e.id) as total_receitas
    FROM eventos e
    WHERE e.org_id=$1 AND e.status_evento='finalizado' AND e.publico > 0
    AND (SELECT COUNT(*) FROM despesas WHERE id_evento=e.id) > 0
    ORDER BY e.id
  `,[orgId])

  if(!eventos.rows.length) return res.json({eventos:[],coeficientes:{},mensagem:'Nenhum evento finalizado encontrado. Finalize eventos para gerar previsões.'})

  // Para cada evento, busca breakdown por centro_custo
  const dadosEventos=[]
  for(const ev of eventos.rows){
    const desp=await pool.query(`
      SELECT centro_custo, SUM(valor) as total
      FROM despesas WHERE id_evento=$1 AND centro_custo IS NOT NULL AND centro_custo != ''
      GROUP BY centro_custo ORDER BY total DESC
    `,[ev.id])

    const rec=await pool.query(`
      SELECT centro_custo, SUM(valor) as total
      FROM receitas WHERE id_evento=$1 AND centro_custo IS NOT NULL AND centro_custo != ''
      GROUP BY centro_custo ORDER BY total DESC
    `,[ev.id])

    dadosEventos.push({
      id:ev.id, nome:ev.nome, publico:parseFloat(ev.publico),
      tipo_local:ev.tipo_local||'fechado', tipo_bar:ev.tipo_bar||'bar_vendido',
      total_despesas:parseFloat(ev.total_despesas),
      total_receitas:parseFloat(ev.total_receitas),
      lucro:parseFloat(ev.total_receitas)-parseFloat(ev.total_despesas),
      despesas_por_categoria:desp.rows.reduce((o,r)=>{o[r.centro_custo]=parseFloat(r.total);return o},{}),
      receitas_por_categoria:rec.rows.reduce((o,r)=>{o[r.centro_custo]=parseFloat(r.total);return o},{})
    })
  }

  // Calcular coeficientes por tipo_local
  const tipos={}
  for(const ev of dadosEventos){
    const t=ev.tipo_local||'geral'
    if(!tipos[t]) tipos[t]={eventos:[],totalDesp:0,totalRec:0,totalPublico:0,categorias:{}}
    tipos[t].eventos.push(ev)
    tipos[t].totalDesp+=ev.total_despesas
    tipos[t].totalRec+=ev.total_receitas
    tipos[t].totalPublico+=ev.publico

    // Custo sem artístico por pessoa
    const semArt=ev.total_despesas-(ev.despesas_por_categoria['Artistico']||0)

    for(const [cat,val] of Object.entries(ev.despesas_por_categoria)){
      if(!tipos[t].categorias[cat]) tipos[t].categorias[cat]={valores:[],pcts:[]}
      tipos[t].categorias[cat].valores.push(val)
      if(semArt>0 && cat!=='Artistico') tipos[t].categorias[cat].pcts.push(val/semArt)
    }
  }

  // Gerar coeficientes médios
  const coeficientes={}
  for(const [tipo,data] of Object.entries(tipos)){
    const avgCustoPP=data.totalPublico>0?data.totalDesp/data.totalPublico:0
    const avgRecPP=data.totalPublico>0?data.totalRec/data.totalPublico:0
    const semArtTotal=data.totalDesp-Object.values(data.categorias).reduce((s,c)=>s,0)

    const cats={}
    for(const [cat,vals] of Object.entries(data.categorias)){
      const avgPct=vals.pcts.length>0?vals.pcts.reduce((s,v)=>s+v,0)/vals.pcts.length:0
      const minPct=vals.pcts.length>0?Math.min(...vals.pcts):0
      const maxPct=vals.pcts.length>0?Math.max(...vals.pcts):0
      const avgVal=vals.valores.reduce((s,v)=>s+v,0)/vals.valores.length
      cats[cat]={pct:avgPct,min:minPct,max:maxPct,avgValor:avgVal}
    }

    // Custo base por pessoa (sem artístico)
    let custoBasePP=0
    for(const ev of data.eventos){
      const semArt=ev.total_despesas-(ev.despesas_por_categoria['Artistico']||0)
      custoBasePP+=ev.publico>0?semArt/ev.publico:0
    }
    custoBasePP=data.eventos.length>0?custoBasePP/data.eventos.length:0

    coeficientes[tipo]={
      label:tipo==='fechado'?'Fechado':tipo==='fechado_mesas'?'Fechado com Mesas':tipo==='aberto'?'Aberto':tipo,
      qtdEventos:data.eventos.length,
      custoBasePP:Math.round(custoBasePP),
      avgCustoPP:Math.round(avgCustoPP),
      avgRecPP:Math.round(avgRecPP),
      categorias:cats,
      refEventos:data.eventos.map(e=>`${e.nome} (${e.publico}p): R$${Math.round(e.total_despesas/1000)}K`)
    }
  }

  res.json({eventos:dadosEventos,coeficientes,mensagem:null})
}catch(e){console.error(e);res.status(500).json({error:e.message})}})


// === VENDAS POR DIA ===
router.get('/api/eventos/:id/vendas-dia',auth,async(req,res)=>{try{
  const eid=req.params.id,oid=req.user.org_id;
  const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[eid,oid]);
  if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});

  // Vendas por dia (da tabela baladapp_vendas)
  const porDia=await pool.query(`
    SELECT DATE(data_venda) as dia, COUNT(*) as qtd, SUM(valor) as total,
    SUM(quantidade_ingressos) as ingressos
    FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2 AND LOWER(status)='aprovado'
    GROUP BY DATE(data_venda) ORDER BY dia
  `,[eid,oid]);

  // Vendas por setor/sessao
  const porSetor=await pool.query(`
    SELECT COALESCE(tipo_venda,'Geral') as setor, COUNT(*) as qtd, SUM(valor) as total,
    SUM(quantidade_ingressos) as ingressos
    FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2 AND LOWER(status)='aprovado'
    GROUP BY tipo_venda ORDER BY total DESC
  `,[eid,oid]);

  // Buscar total oficial da receita BaladaAPP (valor correto do header da API)
  const recBal=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 AND conta='BaladaAPP'",[eid,oid]);
  const totalReceitaBaladapp=parseFloat(recBal.rows[0].total)||0;

  // Ajustar valores proporcionalmente para bater com o total da receita
  var porDiaAjustado=porDia.rows;
  var porSetorAjustado=porSetor.rows;
  if(totalReceitaBaladapp>0){
    const somaBruta=porDia.rows.reduce((s,d)=>s+parseFloat(d.total||0),0);
    if(somaBruta>0 && Math.abs(somaBruta-totalReceitaBaladapp)>1){
      const fator=totalReceitaBaladapp/somaBruta;
      porDiaAjustado=porDia.rows.map(d=>({...d,total:(parseFloat(d.total||0)*fator).toFixed(2)}));
      porSetorAjustado=porSetor.rows.map(d=>({...d,total:(parseFloat(d.total||0)*fator).toFixed(2)}));
    }
  }

  // Vendas por cidade (do JSON salvo durante sync via endpoint BaladaAPP municipios)
  var porCidadeAjustado=[];
  const cidadesJson=ev.rows[0].baladapp_cidades_json;
  if(cidadesJson && Array.isArray(cidadesJson)){
    const totalQtdCidades=cidadesJson.reduce((s,c)=>s+c.qtd,0);
    porCidadeAjustado=cidadesJson.map(c=>({
      cidade:c.cidade+(c.estado?' - '+c.estado:''),
      qtd:c.qtd,
      ingressos:c.qtd,
      total: totalReceitaBaladapp>0 && totalQtdCidades>0 ? (totalReceitaBaladapp*c.qtd/totalQtdCidades).toFixed(2) : '0.00'
    }));
  }

  // Tipos de ingresso (do JSON salvo durante sync)
  var porTipoAjustado=[];
  const tiposJson=ev.rows[0].baladapp_tipos_json;
  if(tiposJson && Array.isArray(tiposJson)){
    porTipoAjustado=tiposJson.map(t=>({
      tipo:t.tipo,
      qtd:t.qtd,
      total:t.total
    }));
  }

  res.json({
    por_dia: porDiaAjustado,
    por_setor: porSetorAjustado,
    por_cidade: porCidadeAjustado,
    por_tipo: porTipoAjustado,
    ultima_sync: ev.rows[0].baladapp_ultima_sync,
    total_receita_baladapp: totalReceitaBaladapp
  });
}catch(e){res.status(500).json({erro:e.message})}});

// === SYNC VENDAS DETALHADAS BALADAPP ===
router.post('/api/eventos/:id/baladapp/sync-vendas',auth,async(req,res)=>{try{
  const eid=parseInt(req.params.id),oid=req.user.org_id;
  const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[eid,oid]);
  if(!ev.rows.length||!ev.rows[0].baladapp_id)return res.status(400).json({erro:'Evento sem BaladaAPP vinculado'});
  const cfg=await pool.query('SELECT * FROM baladapp_config WHERE org_id=$1 LIMIT 1',[oid]);
  if(!cfg.rows.length)return res.status(400).json({erro:'Sem config BaladaAPP'});

  const client=await baladappLogin(cfg.rows[0].login,cfg.rows[0].senha);
  const bId=ev.rows[0].baladapp_id;

  await pool.query('DELETE FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2',[eid,oid]);

  let page=1;let total=0;let inseridos=0;
  while(true){
    const r=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+bId+'/pedidos?pagina='+page+'&status=aprovado',{headers:{'Accept':'application/json'}});
    const pedidos=r.data||[];
    if(!pedidos.length)break;
    const totalLinhas=parseInt(r.headers['totallinhas'])||0;

    for(const p of pedidos){
      const pedidoId=parseInt(p.id)||0;
      if(!pedidoId)continue;
      const valor=parseFloat(p.valor)||0;
      const qtdIng=parseInt(p.quantidade_ingressos)||1;
      const tipo=(p.comissario&&p.comissario.nome)||p.pedido_tipo&&p.pedido_tipo.descricao||'Online';
      const status=p.status||'aprovado';
      const dataVenda=p.datahora||new Date().toISOString();
      const cidade=(p.cliente&&p.cliente.cidade)||'';

      try{
        await pool.query('INSERT INTO baladapp_vendas(org_id,id_evento,pedido_id,valor,quantidade_ingressos,tipo_venda,status,data_venda,cidade) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(pedido_id) DO UPDATE SET valor=$4,quantidade_ingressos=$5,tipo_venda=$6,status=$7,data_venda=$8,cidade=$9',
          [oid,eid,pedidoId,valor,qtdIng,tipo,status,dataVenda,cidade]);
        inseridos++;
      }catch(e){console.error('Erro pedido '+pedidoId+':',e.message)}
    }

    total+=pedidos.length;
    console.log('Sync page '+page+': '+pedidos.length+' pedidos (total: '+total+'/'+totalLinhas+')');
    if(total>=totalLinhas)break;
    page++;
    if(page>200)break;
  }

  const hrV=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+bId+'/pedidos?pagina=1&status=aprovado',{headers:{'Accept':'application/json'}});
  const valorReal=parseFloat(hrV.headers['valortotal'])||0;
  // Buscar cidades via endpoint de municipios
  let cidadesJson=null;
  try{
    const munRes=await client.get('https://produtor.baladapp.com.br/api/anuncios/'+bId+'/cancelamentos/municipios',{headers:{'Accept':'application/json'}});
    const munData=(munRes.data||[]).filter(m=>m.id!==null);
    cidadesJson=munData.map(m=>{
      const match=(m.titulo||'').match(/^(.+?)\s*-\s*(\w{2})\s*\((\d+)\)$/);
      if(match)return{cidade:match[1].trim(),estado:match[2],qtd:parseInt(match[3])};
      return{cidade:m.titulo||'Desconhecida',estado:'',qtd:0};
    }).filter(c=>c.qtd>0).sort((a,b)=>b.qtd-a.qtd);
    console.log('Sync vendas cidades: '+cidadesJson.length+' cidades');
  }catch(e){console.error('Erro buscar cidades:',e.message)}
  // Buscar tipos de ingresso via relatorios
  let tiposJson=null;
  try{
    const tipRes=await client.get('https://produtor.baladapp.com.br/api/relatorios/geral-vendas-totais',{params:{anuncio_id:bId},headers:{'Accept':'application/json'}});
    tiposJson=(tipRes.data||[]).map(t=>({tipo:t.label,qtd:parseInt(t.quantidade)||0,total:parseFloat(t.valor_total)||0})).filter(t=>t.qtd>0).sort((a,b)=>b.total-a.total);
    console.log('Sync vendas tipos: '+tiposJson.length+' tipos');
  }catch(e){console.error('Erro buscar tipos:',e.message)}
  await pool.query('UPDATE eventos SET baladapp_ultima_sync=NOW(),baladapp_valor_total=$1,baladapp_cidades_json=$2,baladapp_tipos_json=$3 WHERE id=$4',[valorReal,cidadesJson?JSON.stringify(cidadesJson):null,tiposJson?JSON.stringify(tiposJson):null,eid]);
  // Atualizar receita BaladaAPP para manter consistencia com sync normal
  await pool.query("DELETE FROM receitas WHERE id_evento=$1 AND org_id=$2 AND conta='BaladaAPP'",[eid,oid]);
  if(valorReal>0){
    await pool.query("INSERT INTO receitas(org_id,id_evento,descricao,centro_custo,valor,situacao,conta) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [oid,eid,'Vendas BaladaAPP - '+ev.rows[0].nome,'BaladaAPP',valorReal,'RECEBIDO','BaladaAPP']);
  }
  console.log('Sync vendas completo: '+inseridos+' pedidos para evento #'+eid+' (valor real: R$'+valorReal+')');
  res.json({sucesso:true,total_pedidos:total,inseridos:inseridos,total_aprovado:valorReal});
}catch(e){console.error('Sync vendas erro:',e.message);res.status(500).json({erro:e.message})}});

// Auto sync a cada 15 min
setInterval(async function(){
  try{
    const evts=await pool.query("SELECT e.id,e.org_id FROM eventos e WHERE e.baladapp_id IS NOT NULL");
    for(var ev of evts.rows){
      // sync silencioso
      await baladappSyncEvento(ev.id,ev.org_id);
    }
  }catch(e){console.error('Auto-sync erro:',e.message)}
},15*60*1000);

  return router;
};
