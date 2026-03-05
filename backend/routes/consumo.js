const express = require('express');
module.exports = function({ pool, auth }) {
  const router = express.Router();

// Produtos - CRUD
router.get('/api/consumo/produtos',auth,async(req,res)=>{try{
  const r=await pool.query('SELECT * FROM produtos_consumo WHERE org_id=$1 ORDER BY categoria,nome',[req.user.org_id]);
  res.json(r.rows)
}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/consumo/produtos',auth,async(req,res)=>{try{
  const{nome,categoria,unidade,volume_ml}=req.body;
  if(!nome||!categoria)return res.status(400).json({erro:'Nome e categoria obrigatorios'});
  const r=await pool.query('INSERT INTO produtos_consumo(org_id,nome,categoria,unidade,volume_ml) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [req.user.org_id,nome,categoria,unidade||'unidade',parseInt(volume_ml)||0]);
  res.json(r.rows[0])
}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/consumo/produtos/:id',auth,async(req,res)=>{try{
  const b=req.body;const f=[];const v=[];let i=1;
  ['nome','categoria','unidade'].forEach(k=>{if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});
  if(b.volume_ml!==undefined){f.push('volume_ml=$'+i);v.push(parseInt(b.volume_ml)||0);i++}
  if(b.ativo!==undefined){f.push('ativo=$'+i);v.push(b.ativo);i++}
  if(!f.length)return res.status(400).json({erro:'Nada para atualizar'});
  v.push(parseInt(req.params.id));v.push(req.user.org_id);
  const r=await pool.query('UPDATE produtos_consumo SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
  if(!r.rows.length)return res.status(404).json({erro:'Produto nao encontrado'});
  res.json(r.rows[0])
}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/consumo/produtos/:id',auth,async(req,res)=>{try{
  await pool.query('DELETE FROM produtos_consumo WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  res.json({sucesso:true})
}catch(e){res.status(500).json({erro:e.message})}});

// Setores - CRUD
router.get('/api/consumo/setores/evento/:eventoId',auth,async(req,res)=>{try{
  const r=await pool.query('SELECT * FROM setores_consumo WHERE id_evento=$1 AND org_id=$2 ORDER BY tipo,nome',
    [req.params.eventoId,req.user.org_id]);
  res.json(r.rows)
}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/consumo/setores',auth,async(req,res)=>{try{
  const{id_evento,nome,tipo,publico_real}=req.body;
  if(!id_evento||!nome||!tipo)return res.status(400).json({erro:'Evento, nome e tipo obrigatorios'});
  const r=await pool.query(
    'INSERT INTO setores_consumo(org_id,id_evento,nome,tipo,publico_real) VALUES($1,$2,$3,$4,$5) RETURNING *',
    [req.user.org_id,id_evento,nome,tipo,parseInt(publico_real)||0]);
  res.json(r.rows[0])
}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/consumo/setores/:id',auth,async(req,res)=>{try{
  const b=req.body;const f=[];const v=[];let i=1;
  ['nome','tipo'].forEach(k=>{if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});
  if(b.publico_real!==undefined){f.push('publico_real=$'+i);v.push(parseInt(b.publico_real));i++}
  if(!f.length)return res.status(400).json({erro:'Nada para atualizar'});
  v.push(parseInt(req.params.id));v.push(req.user.org_id);
  const r=await pool.query('UPDATE setores_consumo SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
  if(!r.rows.length)return res.status(404).json({erro:'Setor nao encontrado'});
  res.json(r.rows[0])
}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/consumo/setores/:id',auth,async(req,res)=>{try{
  await pool.query('DELETE FROM setores_consumo WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  res.json({sucesso:true})
}catch(e){res.status(500).json({erro:e.message})}});

// Registros de Consumo - CRUD (com setor)
router.get('/api/consumo/registros',auth,async(req,res)=>{try{
  const r=await pool.query(`
    SELECT c.*,p.nome as produto_nome,p.categoria,p.unidade,
      e.nome as evento_nome,e.data_evento,
      s.nome as setor_nome,s.tipo as setor_tipo
    FROM consumo_eventos c
    JOIN produtos_consumo p ON p.id=c.id_produto
    LEFT JOIN eventos e ON e.id=c.id_evento
    LEFT JOIN setores_consumo s ON s.id=c.id_setor
    WHERE c.org_id=$1 ORDER BY c.criado_em DESC
  `,[req.user.org_id]);
  res.json(r.rows)
}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/consumo/registros/evento/:eventoId',auth,async(req,res)=>{try{
  const r=await pool.query(`
    SELECT c.*,p.nome as produto_nome,p.categoria,p.unidade,
      s.nome as setor_nome,s.tipo as setor_tipo
    FROM consumo_eventos c
    JOIN produtos_consumo p ON p.id=c.id_produto
    LEFT JOIN setores_consumo s ON s.id=c.id_setor
    WHERE c.id_evento=$1 AND c.org_id=$2
    ORDER BY s.nome,p.categoria,p.nome
  `,[req.params.eventoId,req.user.org_id]);
  res.json(r.rows)
}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/consumo/registros/lote',auth,async(req,res)=>{try{
  const{id_evento,setores}=req.body;
  // setores = [{ id_setor, itens: [{ id_produto, quantidade_consumida }] }]
  if(!id_evento||!setores?.length)
    return res.status(400).json({erro:'Evento e setores obrigatorios'});
  // Limpar registros antigos do evento
  await pool.query('DELETE FROM consumo_eventos WHERE id_evento=$1 AND org_id=$2',[id_evento,req.user.org_id]);
  let totalInseridos=0;
  for(const setor of setores){
    if(!setor.id_setor||!setor.itens?.length)continue;
    // Pegar publico_real do setor
    const setorInfo=await pool.query('SELECT publico_real FROM setores_consumo WHERE id=$1',[setor.id_setor]);
    const pubReal=setorInfo.rows[0]?.publico_real||0;
    for(const item of setor.itens){
      if(!item.id_produto||!item.quantidade_consumida||parseFloat(item.quantidade_consumida)<=0)continue;
      await pool.query(
        'INSERT INTO consumo_eventos(org_id,id_evento,id_setor,id_produto,quantidade_consumida,publico_real) VALUES($1,$2,$3,$4,$5,$6)',
        [req.user.org_id,id_evento,setor.id_setor,item.id_produto,parseFloat(item.quantidade_consumida),pubReal]);
      totalInseridos++;
    }
  }
  res.json({sucesso:true,inseridos:totalInseridos})
}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/consumo/registros/:id',auth,async(req,res)=>{try{
  await pool.query('DELETE FROM consumo_eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  res.json({sucesso:true})
}catch(e){res.status(500).json({erro:e.message})}});

// Analise de Consumo (separado por tipo de setor: open vs vendido)
router.get('/api/consumo/analise',auth,async(req,res)=>{try{
  const tipoFiltro=req.query.tipo; // 'open','vendido', ou vazio=todos
  let filtroTipo='';let params=[req.user.org_id];
  if(tipoFiltro){filtroTipo=' AND s.tipo=$2';params.push(tipoFiltro)}

  // Total publico por tipo de setor
  const totalPublico=await pool.query(`
    SELECT COALESCE(SUM(s.publico_real),0) as total_publico,COUNT(DISTINCT c.id_evento) as total_eventos
    FROM (SELECT DISTINCT id_setor,id_evento FROM consumo_eventos WHERE org_id=$1) c
    JOIN setores_consumo s ON s.id=c.id_setor${filtroTipo}
  `,params);

  // Produtos com consumo
  const r=await pool.query(`
    SELECT p.id,p.nome,p.categoria,p.unidade,p.volume_ml,
      SUM(c.quantidade_consumida) as total_consumido,
      COUNT(DISTINCT c.id_evento) as eventos_com_registro
    FROM consumo_eventos c
    JOIN produtos_consumo p ON p.id=c.id_produto
    LEFT JOIN setores_consumo s ON s.id=c.id_setor
    WHERE c.org_id=$1${filtroTipo}
    GROUP BY p.id,p.nome,p.categoria,p.unidade,p.volume_ml
    ORDER BY p.categoria,p.nome
  `,params);

  const totalPub=parseFloat(totalPublico.rows[0].total_publico)||1;
  const totalEventos=parseInt(totalPublico.rows[0].total_eventos)||0;
  const produtos=r.rows.map(row=>{
    const tc=parseFloat(row.total_consumido);
    const mpp=tc/totalPub;
    return{id:row.id,nome:row.nome,categoria:row.categoria,unidade:row.unidade,volume_ml:row.volume_ml,
      total_consumido:tc,eventos_com_registro:parseInt(row.eventos_com_registro),media_por_pessoa:parseFloat(mpp.toFixed(4))}
  });
  const porCategoria={};
  produtos.forEach(p=>{
    if(!porCategoria[p.categoria])porCategoria[p.categoria]={produtos:[],total_consumido:0};
    porCategoria[p.categoria].produtos.push(p);
    porCategoria[p.categoria].total_consumido+=p.total_consumido;
  });

  // Resumo por tipo de setor
  const porTipo=await pool.query(`
    SELECT s.tipo,COALESCE(SUM(s2.publico_real),0) as total_publico,
      COUNT(DISTINCT c.id_evento) as total_eventos
    FROM (SELECT DISTINCT id_setor,id_evento FROM consumo_eventos WHERE org_id=$1) c
    JOIN setores_consumo s ON s.id=c.id_setor
    JOIN setores_consumo s2 ON s2.id=c.id_setor
    GROUP BY s.tipo
  `,[req.user.org_id]);

  res.json({total_eventos:totalEventos,total_publico:totalPub,produtos,por_categoria:porCategoria,por_tipo:porTipo.rows})
}catch(e){res.status(500).json({erro:e.message})}});

// Dashboard Consumo
router.get('/api/consumo/dashboard',auth,async(req,res)=>{try{
  const ev=await pool.query('SELECT COUNT(DISTINCT id_evento) as total FROM consumo_eventos WHERE org_id=$1',[req.user.org_id]);
  const pr=await pool.query('SELECT COUNT(*) as total FROM produtos_consumo WHERE org_id=$1 AND ativo=true',[req.user.org_id]);
  const pe=await pool.query('SELECT COUNT(*) as total FROM pedidos_bebidas WHERE org_id=$1',[req.user.org_id]);
  const porCat=await pool.query(`
    SELECT p.categoria,SUM(c.quantidade_consumida) as total,COUNT(DISTINCT c.id_evento) as eventos
    FROM consumo_eventos c JOIN produtos_consumo p ON p.id=c.id_produto
    WHERE c.org_id=$1 GROUP BY p.categoria ORDER BY total DESC
  `,[req.user.org_id]);
  const topProd=await pool.query(`
    SELECT p.nome,p.categoria,SUM(c.quantidade_consumida) as total
    FROM consumo_eventos c JOIN produtos_consumo p ON p.id=c.id_produto
    WHERE c.org_id=$1 GROUP BY p.id,p.nome,p.categoria ORDER BY total DESC LIMIT 10
  `,[req.user.org_id]);
  const porEvento=await pool.query(`
    SELECT e.nome as evento_nome,e.data_evento,
      COALESCE((SELECT SUM(publico_real) FROM setores_consumo WHERE id_evento=e.id),0) as publico_total,
      SUM(c.quantidade_consumida) as total_itens,
      COUNT(DISTINCT c.id_produto) as produtos_distintos
    FROM consumo_eventos c JOIN eventos e ON e.id=c.id_evento
    WHERE c.org_id=$1 GROUP BY e.id,e.nome,e.data_evento ORDER BY e.data_evento ASC
  `,[req.user.org_id]);
  // Resumo por tipo de setor
  const porTipo=await pool.query(`
    SELECT s.tipo,SUM(c.quantidade_consumida) as total_consumo,
      COALESCE(SUM(DISTINCT s.publico_real),0) as total_publico
    FROM consumo_eventos c JOIN setores_consumo s ON s.id=c.id_setor
    WHERE c.org_id=$1 GROUP BY s.tipo
  `,[req.user.org_id]);
  res.json({
    total_eventos:parseInt(ev.rows[0].total),total_produtos:parseInt(pr.rows[0].total),
    total_pedidos:parseInt(pe.rows[0].total),por_categoria:porCat.rows,
    top_produtos:topProd.rows,por_evento:porEvento.rows,por_tipo:porTipo.rows
  })
}catch(e){res.status(500).json({erro:e.message})}});

// Pedidos - Gerar (com setores open/vendido separados)
router.post('/api/consumo/pedidos/gerar',auth,async(req,res)=>{try{
  const{id_evento,setores_pedido,margem_seguranca,nome,notas}=req.body;
  // setores_pedido = [{ tipo: 'open', publico: 1000 }, { tipo: 'vendido', publico: 500 }]
  if(!setores_pedido?.length)return res.status(400).json({erro:'Informe os setores com publico estimado'});
  const margem=parseFloat(margem_seguranca)||1.30;
  const publicoTotal=setores_pedido.reduce((s,st)=>s+parseInt(st.publico||0),0);
  if(!publicoTotal)return res.status(400).json({erro:'Publico estimado obrigatorio'});

  // Calcular media por pessoa para cada tipo de setor
  const mediaPorTipo={};
  for(const st of setores_pedido){
    const tipo=st.tipo;
    const pubTipo=await pool.query(`
      SELECT COALESCE(SUM(s.publico_real),0) as total_publico
      FROM (SELECT DISTINCT id_setor FROM consumo_eventos WHERE org_id=$1) c
      JOIN setores_consumo s ON s.id=c.id_setor AND s.tipo=$2
    `,[req.user.org_id,tipo]);
    const analTipo=await pool.query(`
      SELECT p.id,p.nome,p.categoria,p.unidade,SUM(c.quantidade_consumida) as total_consumido
      FROM consumo_eventos c
      JOIN produtos_consumo p ON p.id=c.id_produto AND p.ativo=true
      JOIN setores_consumo s ON s.id=c.id_setor AND s.tipo=$2
      WHERE c.org_id=$1
      GROUP BY p.id,p.nome,p.categoria,p.unidade
    `,[req.user.org_id,tipo]);
    const totalPubTipo=parseFloat(pubTipo.rows[0].total_publico)||1;
    mediaPorTipo[tipo]={publico_estimado:parseInt(st.publico),total_publico_historico:totalPubTipo,produtos:{}};
    analTipo.rows.forEach(row=>{
      const tc=parseFloat(row.total_consumido);
      mediaPorTipo[tipo].produtos[row.id]={nome:row.nome,categoria:row.categoria,unidade:row.unidade,media:tc/totalPubTipo};
    });
  }

  // Criar pedido
  const pedido=await pool.query(
    'INSERT INTO pedidos_bebidas(org_id,id_evento,nome,publico_estimado,margem_seguranca,notas) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.user.org_id,id_evento||null,nome||'',publicoTotal,margem,notas||JSON.stringify(setores_pedido)]);
  const pedidoId=pedido.rows[0].id;

  // Consolidar: somar contribuicao de cada tipo de setor
  const consolidado={};
  for(const st of setores_pedido){
    const info=mediaPorTipo[st.tipo];
    if(!info)continue;
    for(const[prodId,prod] of Object.entries(info.produtos)){
      if(!consolidado[prodId])consolidado[prodId]={nome:prod.nome,categoria:prod.categoria,unidade:prod.unidade,qtdBase:0,mediaPonderada:0};
      const contrib=prod.media*parseInt(st.publico);
      consolidado[prodId].qtdBase+=contrib;
    }
  }

  // Inserir itens
  const itens=[];
  for(const[prodId,prod] of Object.entries(consolidado)){
    const mpp=prod.qtdBase/publicoTotal;
    const qf=Math.ceil(prod.qtdBase*margem);
    const item=await pool.query(
      'INSERT INTO itens_pedido(id_pedido,id_produto,media_por_pessoa,quantidade_base,quantidade_final) VALUES($1,$2,$3,$4,$5) RETURNING *',
      [pedidoId,parseInt(prodId),parseFloat(mpp.toFixed(4)),parseFloat(prod.qtdBase.toFixed(2)),qf]);
    itens.push({...item.rows[0],produto_nome:prod.nome,categoria:prod.categoria,unidade:prod.unidade});
  }
  res.json({pedido:pedido.rows[0],itens,detalhes_setores:mediaPorTipo})
}catch(e){res.status(500).json({erro:e.message})}});

// Pedidos - CRUD
router.get('/api/consumo/pedidos',auth,async(req,res)=>{try{
  const r=await pool.query(`
    SELECT p.*,e.nome as evento_nome,
      (SELECT COUNT(*) FROM itens_pedido WHERE id_pedido=p.id) as total_itens
    FROM pedidos_bebidas p LEFT JOIN eventos e ON e.id=p.id_evento
    WHERE p.org_id=$1 ORDER BY p.criado_em DESC
  `,[req.user.org_id]);
  res.json(r.rows)
}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/consumo/pedidos/:id',auth,async(req,res)=>{try{
  const pedido=await pool.query(
    'SELECT p.*,e.nome as evento_nome FROM pedidos_bebidas p LEFT JOIN eventos e ON e.id=p.id_evento WHERE p.id=$1 AND p.org_id=$2',
    [req.params.id,req.user.org_id]);
  if(!pedido.rows.length)return res.status(404).json({erro:'Pedido nao encontrado'});
  const itens=await pool.query(`
    SELECT i.*,pr.nome as produto_nome,pr.categoria,pr.unidade
    FROM itens_pedido i JOIN produtos_consumo pr ON pr.id=i.id_produto
    WHERE i.id_pedido=$1 ORDER BY pr.categoria,pr.nome
  `,[req.params.id]);
  res.json({...pedido.rows[0],itens:itens.rows})
}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/consumo/pedidos/:id',auth,async(req,res)=>{try{
  const b=req.body;const f=[];const v=[];let i=1;
  ['nome','status','notas'].forEach(k=>{if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});
  if(b.publico_estimado!==undefined){f.push('publico_estimado=$'+i);v.push(parseInt(b.publico_estimado));i++}
  if(b.margem_seguranca!==undefined){f.push('margem_seguranca=$'+i);v.push(parseFloat(b.margem_seguranca));i++}
  f.push('atualizado_em=NOW()');
  v.push(parseInt(req.params.id));v.push(req.user.org_id);
  const r=await pool.query('UPDATE pedidos_bebidas SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
  if(!r.rows.length)return res.status(404).json({erro:'Pedido nao encontrado'});
  res.json(r.rows[0])
}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/consumo/itens-pedido/:id',auth,async(req,res)=>{try{
  const{quantidade_manual}=req.body;
  const r=await pool.query('UPDATE itens_pedido SET quantidade_manual=$1 WHERE id=$2 RETURNING *',
    [quantidade_manual!==null?parseFloat(quantidade_manual):null,req.params.id]);
  if(!r.rows.length)return res.status(404).json({erro:'Item nao encontrado'});
  res.json(r.rows[0])
}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/consumo/pedidos/:id',auth,async(req,res)=>{try{
  await pool.query('DELETE FROM pedidos_bebidas WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  res.json({sucesso:true})
}catch(e){res.status(500).json({erro:e.message})}});

  return router;
};
