const express = require('express');
module.exports = function({ pool, auth }) {
  const router = express.Router();

router.get('/api/minhas-demandas',auth,async(req,res)=>{try{
const userId=req.user.id;
const funcao=req.user.funcao;
const orgId=req.user.org_id;
const nome=req.user.nome;

// Buscar eventos onde o usuario é designer ou social_media
let eventosIds=[];
if(funcao==='designer'||funcao==='social_media'){
const ev=await pool.query('SELECT id FROM eventos WHERE org_id=$1 AND (designer_id=$2 OR social_media_id=$2)',[orgId,userId]);
eventosIds=ev.rows.map(e=>e.id);
}else{
const ev=await pool.query('SELECT id FROM eventos WHERE org_id=$1',[orgId]);
eventosIds=ev.rows.map(e=>e.id);
}

if(!eventosIds.length)return res.json({briefings:[],posts:[],eventos:[]});

// Briefings de todos os eventos do usuario
const briefR=await pool.query('SELECT b.*,e.nome as evento_nome FROM briefings b JOIN eventos e ON b.id_evento=e.id WHERE b.id_evento=ANY($1) AND b.org_id=$2 ORDER BY b.data_vencimento ASC NULLS LAST,b.criado_em DESC',[eventosIds,orgId]);

// Posts do cronograma de todos os eventos
const postR=await pool.query('SELECT c.*,e.nome as evento_nome FROM cronograma_marketing c JOIN eventos e ON c.id_evento=e.id WHERE c.id_evento=ANY($1) AND c.org_id=$2 ORDER BY c.data_publicacao ASC NULLS LAST,c.hora_publicacao ASC',[eventosIds,orgId]);

// Eventos do usuario
const evR=await pool.query('SELECT id,nome,data_evento,cidade,instagram,designer_id,social_media_id FROM eventos WHERE id=ANY($1) ORDER BY data_evento',[eventosIds]);

res.json({briefings:briefR.rows,posts:postR.rows,eventos:evR.rows});
}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

router.get('/api/eventos',auth,async(req,res)=>{try{
let q='SELECT e.*,COALESCE(SUM(d.valor),0) as total,COUNT(d.id) as quantidade FROM eventos e LEFT JOIN despesas d ON d.id_evento=e.id WHERE e.org_id=$1';
const params=[req.user.org_id];
if(req.user.funcao==='designer'){q+=' AND e.designer_id=$2';params.push(req.user.id)}
else if(req.user.funcao==='social_media'){q+=' AND e.social_media_id=$2';params.push(req.user.id)}
// gestor_trafego vê todos os eventos da org (somente leitura no frontend)
q+=' GROUP BY e.id ORDER BY e.data_evento ASC';
const r=await pool.query(q,params);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/eventos/:id',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const desp=await pool.query('SELECT centro_custo,SUM(valor) as total,COUNT(*) as quantidade FROM despesas WHERE id_evento=$1 GROUP BY centro_custo',[req.params.id]);
const totalR=await pool.query('SELECT COALESCE(SUM(valor),0) as total FROM despesas WHERE id_evento=$1',[req.params.id]);
const por_centro={};desp.rows.forEach(r=>{por_centro[r.centro_custo]={total:parseFloat(r.total),quantidade:parseInt(r.quantidade)}});
res.json({...ev.rows[0],total:parseFloat(totalR.rows[0].total),por_centro})}catch(e){res.status(500).json({erro:e.message})}});

// Dashboard geral
router.get("/api/dashboard",auth,async(req,res)=>{try{
const oid=req.user.org_id;
const evs=await pool.query("SELECT id,nome,data_evento,cidade,orcamento,baladapp_id FROM eventos WHERE org_id=$1 ORDER BY data_evento ASC",[oid]);
const totDesp=await pool.query("SELECT COALESCE(SUM(d.valor),0) as total,COUNT(d.id) as qtd FROM despesas d JOIN eventos e ON d.id_evento=e.id WHERE e.org_id=$1",[oid]);
const totRec=await pool.query("SELECT COALESCE(SUM(r.valor),0) as total,COUNT(r.id) as qtd FROM receitas r JOIN eventos e ON r.id_evento=e.id WHERE e.org_id=$1",[oid]);
const despPagas=await pool.query("SELECT COALESCE(SUM(d.valor),0) as total FROM despesas d JOIN eventos e ON d.id_evento=e.id WHERE e.org_id=$1 AND d.situacao='pago'",[oid]);
const despPend=await pool.query("SELECT COALESCE(SUM(d.valor),0) as total FROM despesas d JOIN eventos e ON d.id_evento=e.id WHERE e.org_id=$1 AND d.situacao='pendente'",[oid]);
const recRecebidas=await pool.query("SELECT COALESCE(SUM(r.valor),0) as total FROM receitas r JOIN eventos e ON r.id_evento=e.id WHERE e.org_id=$1 AND r.situacao='RECEBIDO'",[oid]);
const porEvento=await pool.query("SELECT e.id,e.nome,e.data_evento,e.cidade,e.orcamento,COALESCE(SUM(d.valor),0) as despesas FROM eventos e LEFT JOIN despesas d ON d.id_evento=e.id WHERE e.org_id=$1 GROUP BY e.id ORDER BY e.data_evento ASC",[oid]);
const recPorEvento=await pool.query("SELECT r.id_evento,COALESCE(SUM(r.valor),0) as receitas FROM receitas r JOIN eventos e ON r.id_evento=e.id WHERE e.org_id=$1 GROUP BY r.id_evento",[oid]);
const recMap={};recPorEvento.rows.forEach(r=>{recMap[r.id_evento]=parseFloat(r.receitas)});
const chamados=await pool.query("SELECT COUNT(*) as total,COUNT(*) FILTER(WHERE status='novo') as novos FROM chamados WHERE org_id=$1",[oid]);
const recByCentro=await pool.query("SELECT r.centro_custo,COALESCE(SUM(r.valor),0) as total,COUNT(r.id) as qtd FROM receitas r JOIN eventos e ON r.id_evento=e.id WHERE e.org_id=$1 GROUP BY r.centro_custo ORDER BY total DESC",[oid]);
const despByCentro=await pool.query("SELECT d.centro_custo,COALESCE(SUM(d.valor),0) as total,COUNT(d.id) as qtd FROM despesas d JOIN eventos e ON d.id_evento=e.id WHERE e.org_id=$1 GROUP BY d.centro_custo ORDER BY total DESC",[oid]);
res.json({
  total_despesas:parseFloat(totDesp.rows[0].total),
  qtd_despesas:parseInt(totDesp.rows[0].qtd),
  total_receitas:parseFloat(totRec.rows[0].total),
  qtd_receitas:parseInt(totRec.rows[0].qtd),
  despesas_pagas:parseFloat(despPagas.rows[0].total),
  despesas_pendentes:parseFloat(despPend.rows[0].total),
  receitas_recebidas:parseFloat(recRecebidas.rows[0].total),
  saldo:parseFloat(totRec.rows[0].total)-parseFloat(totDesp.rows[0].total),
  total_eventos:evs.rows.length,
  chamados_total:parseInt(chamados.rows[0].total),
  chamados_novos:parseInt(chamados.rows[0].novos),
  receitas_por_centro:recByCentro.rows.map(r=>({centro:r.centro_custo,total:parseFloat(r.total),qtd:parseInt(r.qtd)})),
  despesas_por_centro:despByCentro.rows.map(r=>({centro:r.centro_custo,total:parseFloat(r.total),qtd:parseInt(r.qtd)})),
  eventos:porEvento.rows.map(e=>({...e,despesas:parseFloat(e.despesas),orcamento:parseFloat(e.orcamento||0),receitas:recMap[e.id]||0}))
})}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

router.get('/api/eventos/:id/despesas',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos',auth,async(req,res)=>{try{
if(req.user.funcao==='designer'||req.user.funcao==='social_media'||req.user.funcao==='gestor_trafego')return res.status(403).json({erro:'Sem permissao'});
const{nome,id_grupo,orcamento,data_evento,hora_evento,hora_abertura,local_evento,cidade,descricao,publico_alvo,capacidade,atracoes,tipo_evento,info_lotes,observacoes,data_abertura_vendas,hora_abertura_vendas,promo_abertura,pontos_venda,classificacao,instagram,designer,social_media,diretor,designer_id,social_media_id,diretor_id}=req.body;
const r=await pool.query('INSERT INTO eventos(org_id,nome,id_grupo,orcamento,data_evento,hora_evento,hora_abertura,local_evento,cidade,descricao,publico_alvo,capacidade,atracoes,tipo_evento,info_lotes,observacoes,data_abertura_vendas,hora_abertura_vendas,promo_abertura,pontos_venda,classificacao,instagram,designer,social_media,diretor,designer_id,social_media_id,diretor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28) RETURNING *',[req.user.org_id,nome,id_grupo||'',parseFloat(orcamento)||0,data_evento||'',hora_evento||'',hora_abertura||'',local_evento||'',cidade||'',descricao||'',publico_alvo||'',parseInt(capacidade)||0,atracoes||'',tipo_evento||'',info_lotes||'',observacoes||'',data_abertura_vendas||'',hora_abertura_vendas||'',promo_abertura||'',pontos_venda||'',classificacao||'',instagram||'',designer||'',social_media||'',diretor||'',designer_id?parseInt(designer_id):null,social_media_id?parseInt(social_media_id):null,diretor_id?parseInt(diretor_id):null]);
const evento=r.rows[0];
// Notificar todos os usuarios da org sobre o novo evento
try{
  const usuarios=await pool.query('SELECT id FROM usuarios WHERE org_id=$1 AND id!=$2',[req.user.org_id,req.user.id]);
  const dataStr=data_evento?new Date(data_evento).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}):'';
  for(const u of usuarios.rows){
    await pool.query('INSERT INTO notificacoes(org_id,usuario_id,tipo,titulo,mensagem,link,referencia_tipo,referencia_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [req.user.org_id,u.id,'novo_evento','Novo evento criado',
       (req.user.nome||'Admin')+' criou o evento "'+nome+'"'+(dataStr?' para '+dataStr:''),
       '/demandas','evento',evento.id]);
  }
}catch(e2){console.error('Erro ao criar notificacoes de evento:',e2.message)}
res.json(evento)}catch(e){res.status(500).json({erro:e.message})}});

router.post("/api/eventos/:id/despesas",auth,async(req,res)=>{try{const{descricao,quantidade,valor_unitario,valor,centro_custo,fonte_pagamento,situacao,data,fornecedor}=req.body;if(!descricao&&!fornecedor)return res.status(400).json({erro:"Descricao obrigatoria"});const r=await pool.query("INSERT INTO despesas(id_evento,org_id,valor,quantidade,valor_unitario,fornecedor,data,descricao,centro_custo,fonte_pagamento,situacao,registrado_por,fonte) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *",[req.params.id,req.user.org_id,parseFloat(valor)||0,parseFloat(quantidade)||1,parseFloat(valor_unitario)||0,fornecedor||"",data||new Date().toISOString().split("T")[0],descricao||"",centro_custo||"Outros",fonte_pagamento||"",situacao||"pendente",req.user.nome||"manual","manual"]);res.json(r.rows[0])}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

router.get('/api/eventos/:id/exportar',async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1',[req.params.id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const desp=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 ORDER BY criado_em',[req.params.id]);
let csv='ID,Valor,Fornecedor,Data,Descricao,Centro de Custo,Registrado por,Fonte\n';
desp.rows.forEach(x=>{csv+=x.id+','+x.valor+',"'+x.fornecedor+'",'+x.data+',"'+x.descricao+'",'+x.centro_custo+',"'+x.registrado_por+'",'+x.fonte+'\n'});
res.setHeader('Content-Type','text/csv');
res.setHeader('Content-Disposition','attachment; filename='+ev.rows[0].nome.replace(/\s/g,'_')+'_despesas.csv');
res.send(csv)}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/eventos/:id',auth,async(req,res)=>{try{
const b=req.body;const f=[];const v=[];let i=1;
['nome','id_grupo','data_evento','hora_evento','hora_abertura','local_evento','cidade','descricao','publico_alvo','atracoes','tipo_evento','info_lotes','observacoes','data_abertura_vendas','hora_abertura_vendas','promo_abertura','pontos_venda','classificacao','instagram','designer','social_media','diretor','designer_id','social_media_id','diretor_id'].forEach(function(k){if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});
if(b.orcamento!==undefined){f.push('orcamento=$'+i);v.push(parseFloat(b.orcamento)||0);i++}
if(b.capacidade!==undefined){f.push('capacidade=$'+i);v.push(parseInt(b.capacidade)||0);i++}
if(!f.length)return res.status(400).json({erro:'Nada para atualizar'});
v.push(parseInt(req.params.id));v.push(req.user.org_id);
const r=await pool.query('UPDATE eventos SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
if(!r.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/eventos/:id',auth,async(req,res)=>{try{
if(req.user.funcao!=='admin'&&req.user.funcao!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const id=parseInt(req.params.id);const org=req.user.org_id;
// Deletar dados relacionados ao evento (ignora tabelas/colunas que não existem)
const delQueries = [
  'DELETE FROM arquivos WHERE evento_id=$1 OR briefing_id IN (SELECT id FROM briefings WHERE id_evento=$1 AND org_id=$2) OR cronograma_id IN (SELECT id FROM cronograma_marketing WHERE id_evento=$1 AND org_id=$2)',
  'DELETE FROM briefings WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM cronograma_marketing WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM planejamento_semanal WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM materiais_marketing WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM campanhas WHERE evento_id=$1 AND org_id=$2',
  'DELETE FROM analises_marketing WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM despesas WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM fornecedores WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM receitas WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM contas_pagar WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM itens_pedido WHERE pedido_id IN (SELECT id FROM pedidos_bebidas WHERE id_evento=$1 AND org_id=$2)',
  'DELETE FROM pedidos_bebidas WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM consumo_eventos WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM setores_consumo WHERE id_evento=$1 AND org_id=$2',
  'DELETE FROM ad_funnels WHERE evento_id=$1 AND org_id=$2',
  'DELETE FROM instagram_connections WHERE evento_id=$1 AND org_id=$2',
];
for (const q of delQueries) { try { await pool.query(q, [id, org]); } catch(e) { /* tabela ou coluna pode não existir */ } }
const r=await pool.query('DELETE FROM eventos WHERE id=$1 AND org_id=$2 RETURNING id',[id,org]);
if(!r.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/eventos/:id/fornecedores',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM fornecedores WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/fornecedores',auth,async(req,res)=>{try{
const{nome,categoria,nome_contato,telefone_contato,email_contato,valor,status,notas,data_vencimento}=req.body;
const r=await pool.query('INSERT INTO fornecedores(org_id,id_evento,nome,categoria,nome_contato,telefone_contato,email_contato,valor,status,notas,data_vencimento) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
[req.user.org_id,req.params.id,nome,categoria||'Outros',nome_contato||'',telefone_contato||'',email_contato||'',parseFloat(valor)||0,status||'pendente',notas||'',data_vencimento||'']);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/fornecedores/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['nome','categoria','nome_contato','telefone_contato','email_contato','status','notas','data_vencimento'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
if(b.valor!==undefined){fields.push('valor=$'+idx);vals.push(parseFloat(b.valor));idx++}
if(b.pago!==undefined){fields.push('pago=$'+idx);vals.push(b.pago);idx++}
fields.push('atualizado_em=NOW()');
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE fornecedores SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
if(!r.rows.length)return res.status(404).json({erro:'Fornecedor nao encontrado'});
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/fornecedores/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM fornecedores WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

  return router;
};
