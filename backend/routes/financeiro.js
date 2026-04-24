const express = require('express');
module.exports = function({ pool, ExcelJS, auth }) {
  const router = express.Router();

// === DESPESAS ===
router.get('/api/eventos/:id/despesas',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post("/api/eventos/:id/despesas",auth,async(req,res)=>{try{const{descricao,quantidade,valor_unitario,valor,centro_custo,fonte_pagamento,situacao,data,fornecedor,id_projecao}=req.body;if(!descricao&&!fornecedor)return res.status(400).json({erro:"Descricao obrigatoria"});const r=await pool.query("INSERT INTO despesas(id_evento,org_id,valor,quantidade,valor_unitario,fornecedor,data,descricao,centro_custo,fonte_pagamento,situacao,registrado_por,fonte,id_projecao) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *",[req.params.id,req.user.org_id,parseFloat(valor)||0,parseFloat(quantidade)||1,parseFloat(valor_unitario)||0,fornecedor||"",data||new Date().toISOString().split("T")[0],descricao||"",centro_custo||"Outros",fonte_pagamento||"",situacao||"pendente",req.user.nome||"manual","manual",id_projecao?parseInt(id_projecao):null]);res.json(r.rows[0])}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

router.get('/api/eventos/:id/exportar',async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1',[req.params.id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const desp=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 ORDER BY criado_em',[req.params.id]);
let csv='ID,Valor,Fornecedor,Data,Descricao,Centro de Custo,Registrado por,Fonte\n';
desp.rows.forEach(x=>{csv+=x.id+','+x.valor+',"'+x.fornecedor+'",'+x.data+',"'+x.descricao+'",'+x.centro_custo+',"'+x.registrado_por+'",'+x.fonte+'\n'});
res.setHeader('Content-Type','text/csv');
res.setHeader('Content-Disposition','attachment; filename='+ev.rows[0].nome.replace(/\s/g,'_')+'_despesas.csv');
res.send(csv)}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/despesas/:id',auth,async(req,res)=>{try{
const b=req.body;const f=[];const v=[];let i=1;
['descricao','centro_custo','fonte_pagamento','situacao','data','fornecedor'].forEach(function(k){if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});
['valor','quantidade','valor_unitario','falta_pagar'].forEach(function(k){if(b[k]!==undefined){f.push(k+'=$'+i);v.push(parseFloat(b[k])||0);i++}});
if(b.id_projecao!==undefined){f.push('id_projecao=$'+i);v.push(b.id_projecao?parseInt(b.id_projecao):null);i++}
if(!f.length)return res.status(400).json({erro:'Nada'});
v.push(parseInt(req.params.id));v.push(req.user.org_id);
const r=await pool.query('UPDATE despesas SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/despesas/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM despesas WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === RECEITAS ===
router.get('/api/eventos/:id/receitas',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM receitas WHERE id_evento=$1 AND org_id=$2 ORDER BY data_pagamento DESC NULLS LAST, criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/receitas',auth,async(req,res)=>{try{
const{descricao,centro_custo,valor,situacao,conta,data_pagamento,id_projecao}=req.body;
if(!descricao||!valor)return res.status(400).json({erro:'Descricao e valor obrigatorios'});
const r=await pool.query('INSERT INTO receitas(org_id,id_evento,descricao,centro_custo,valor,situacao,conta,data_pagamento,id_projecao) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
[req.user.org_id,req.params.id,descricao,centro_custo||'Outro',parseFloat(valor)||0,situacao||'pendente',conta||'',data_pagamento||null,id_projecao?parseInt(id_projecao):null]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/receitas/:id',auth,async(req,res)=>{try{
const b=req.body;const f=[];const v=[];let i=1;
['descricao','centro_custo','situacao','conta','data_pagamento'].forEach(function(k){if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});
if(b.valor!==undefined){f.push('valor=$'+i);v.push(parseFloat(b.valor)||0);i++}
if(b.id_projecao!==undefined){f.push('id_projecao=$'+i);v.push(b.id_projecao?parseInt(b.id_projecao):null);i++}
if(!f.length)return res.status(400).json({erro:'Nada para atualizar'});
v.push(parseInt(req.params.id));v.push(req.user.org_id);
const r=await pool.query('UPDATE receitas SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/receitas/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM receitas WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === RESUMO FINANCEIRO ===
router.get('/api/eventos/:id/financeiro',auth,async(req,res)=>{try{
const desp=await pool.query('SELECT COALESCE(SUM(valor),0) as total_despesas, COUNT(*) as qtd_despesas FROM despesas WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const rec=await pool.query('SELECT COALESCE(SUM(valor),0) as total_receitas, COUNT(*) as qtd_receitas FROM receitas WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const recRecebido=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 AND situacao='RECEBIDO'",[req.params.id,req.user.org_id]);
const recPendente=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 AND situacao!='RECEBIDO'",[req.params.id,req.user.org_id]);
const despPorCat=await pool.query("SELECT centro_custo, SUM(valor) as total FROM despesas WHERE id_evento=$1 AND org_id=$2 GROUP BY centro_custo ORDER BY total DESC",[req.params.id,req.user.org_id]);
const recPorCat=await pool.query("SELECT centro_custo, SUM(valor) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 GROUP BY centro_custo ORDER BY total DESC",[req.params.id,req.user.org_id]);
res.json({
  total_despesas:parseFloat(desp.rows[0].total_despesas),
  qtd_despesas:parseInt(desp.rows[0].qtd_despesas),
  total_receitas:parseFloat(rec.rows[0].total_receitas),
  qtd_receitas:parseInt(rec.rows[0].qtd_receitas),
  receitas_recebidas:parseFloat(recRecebido.rows[0].total),
  receitas_pendentes:parseFloat(recPendente.rows[0].total),
  saldo:parseFloat(rec.rows[0].total_receitas)-parseFloat(desp.rows[0].total_despesas),
  despesas_por_categoria:despPorCat.rows,
  receitas_por_categoria:recPorCat.rows
})}catch(e){res.status(500).json({erro:e.message})}});

// === CONTAS POR EVENTO ===
router.get('/api/eventos/:id/contas',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM contas_evento WHERE id_evento=$1 AND org_id=$2 ORDER BY nome',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/contas',auth,async(req,res)=>{try{
const{nome,tipo,titular,percentual}=req.body;
if(!nome)return res.status(400).json({erro:'Nome obrigatorio'});
const r=await pool.query('INSERT INTO contas_evento(org_id,id_evento,nome,tipo,titular,percentual) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
[req.user.org_id,req.params.id,nome,tipo||'banco',titular||'',parseFloat(percentual)||0]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/contas/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM contas_evento WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});


// === ENCONTRO DE CONTAS ===
router.get('/api/eventos/:id/encontro-contas',auth,async(req,res)=>{try{
const contasR=await pool.query('SELECT * FROM contas_evento WHERE id_evento=$1 AND org_id=$2 ORDER BY nome',[req.params.id,req.user.org_id]);
const despR=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const recR=await pool.query('SELECT * FROM receitas WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const contas=contasR.rows;
const totalDesp=despR.rows.reduce(function(s,d){return s+parseFloat(d.valor||0)},0);
const totalRec=recR.rows.reduce(function(s,r){return s+parseFloat(r.valor||0)},0);
const lucro=totalRec-totalDesp;
const resultado=contas.map(function(c){
  var pagou=despR.rows.filter(function(d){return d.fonte_pagamento===c.nome}).reduce(function(s,d){return s+parseFloat(d.valor||0)},0);
  var recebeu=recR.rows.filter(function(r){return r.centro_custo===c.nome}).reduce(function(s,r){return s+parseFloat(r.valor||0)},0);
  var percent=parseFloat(c.percentual)||0;
  var lucroParte=(lucro*percent)/100;
  var saldo=lucroParte+pagou-recebeu;
  return {id:c.id,nome:c.nome,tipo:c.tipo,titular:c.titular,percentual:percent,pagou:pagou,recebeu:recebeu,lucro_parte:lucroParte,saldo:saldo};
});
res.json({total_receitas:totalRec,total_despesas:totalDesp,lucro:lucro,contas:resultado})
}catch(e){res.status(500).json({erro:e.message})}});

// === UPDATE CONTA ===
router.patch('/api/contas/:id',auth,async(req,res)=>{try{
const{nome,tipo,titular,percentual}=req.body;
const f=[];const v=[];let i=1;
if(nome!==undefined){f.push('nome=$'+i);v.push(nome);i++}
if(tipo!==undefined){f.push('tipo=$'+i);v.push(tipo);i++}
if(titular!==undefined){f.push('titular=$'+i);v.push(titular);i++}
if(percentual!==undefined){f.push('percentual=$'+i);v.push(parseFloat(percentual)||0);i++}
if(!f.length)return res.status(400).json({erro:'Nada'});
v.push(parseInt(req.params.id));v.push(req.user.org_id);
const r=await pool.query('UPDATE contas_evento SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});


// === EXPORTAR PAGAMENTOS XLSX ===
router.get('/api/eventos/:id/exportar-pagamentos',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const evento=ev.rows[0];
const despR=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 AND org_id=$2 ORDER BY centro_custo,criado_em',[req.params.id,req.user.org_id]);
const contasR=await pool.query('SELECT * FROM contas_evento WHERE id_evento=$1 AND org_id=$2 ORDER BY nome',[req.params.id,req.user.org_id]);
const cats=['Artistico','Logistica/Camarim','Estrutura do Evento','Divulgacao e Midia','Documentacao e Taxas','Operacional','Bar','Alimentacao','Outros'];
const contas=contasR.rows;
const wb=new ExcelJS.Workbook();
const ws=wb.addWorksheet('Pagamentos');

// Colors
const headerFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1a1a2e'}};
const catFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF16213e'}};
const subtotalFill={type:'pattern',pattern:'solid',fgColor:{argb:'FFe8e8e8'}};
const totalFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0f3460'}};
const whiteFont={color:{argb:'FFFFFFFF'},bold:true};
const boldFont={bold:true};
const moneyFmt='#,##0.00';

// Column widths
var cols=['Descricao','Qtd','Valor Uni','Valor Total'];
contas.forEach(function(c){cols.push(c.nome)});
cols.push('Falta Pagar','Status');
ws.columns=cols.map(function(c,i){return {width:i===0?35:i===1?8:15}});

// Title row
var row=ws.addRow([evento.nome.toUpperCase()]);
row.font={bold:true,size:14,color:{argb:'FF1a1a2e'}};
ws.mergeCells(1,1,1,cols.length);
ws.addRow([]);

// Header row
var hdr=ws.addRow(cols);
hdr.eachCell(function(cell){cell.fill=headerFill;cell.font=whiteFont;cell.alignment={horizontal:'center',vertical:'middle'}});
hdr.height=25;

var grandTotal=0;
cats.forEach(function(cat){
  var items=despR.rows.filter(function(d){return (d.centro_custo||'Outros')===cat});
  if(!items.length)return;
  var catTotal=items.reduce(function(s,d){return s+parseFloat(d.valor||0)},0);
  grandTotal+=catTotal;

  // Category header
  var cr=ws.addRow([cat.toUpperCase()]);
  cr.font={bold:true,color:{argb:'FFFFFFFF'},size:11};
  cr.eachCell(function(cell){cell.fill=catFill});
  ws.mergeCells(cr.number,1,cr.number,cols.length);

  // Agrupar por fornecedor
  var agrup={};
  items.forEach(function(d){
    var key=(d.descricao||d.fornecedor||'Sem nome').trim().split(/\s+/)[0].toLowerCase();
    if(!agrup[key])agrup[key]={descricao:(d.descricao||d.fornecedor||'').trim().split(/\s+/)[0],qtd:parseInt(d.quantidade)||1,valorUni:0,valorTotal:0,fonte:d.fonte_pagamento||'',situacao:'pago',items:[]};
    agrup[key].valorTotal+=parseFloat(d.valor||0);
    agrup[key].valorUni+=parseFloat(d.valor_unitario||d.valor||0);
    agrup[key].items.push(d);
    if(d.situacao==='pendente')agrup[key].situacao='pendente';
    if(d.fonte_pagamento)agrup[key].fonte=d.fonte_pagamento;
    // descricao ja definida como primeiro nome
  });
  Object.values(agrup).forEach(function(g){
    var vals=[g.descricao+(g.items.length>1?' ('+g.items.length+'x)':''),g.qtd,g.valorUni,g.valorTotal];
    var pagoPorConta=0;
    contas.forEach(function(c){
      var val=g.items.filter(function(d){return d.fonte_pagamento===c.nome}).reduce(function(s,d){return s+parseFloat(d.valor||0)},0);
      vals.push(val);
      pagoPorConta+=val;
    });
    var falta=g.valorTotal-pagoPorConta;
    vals.push(falta>0?falta:0);
    vals.push(g.situacao);
    var r=ws.addRow(vals);
    for(var i=3;i<=3+contas.length+1;i++){
      var cell=r.getCell(i);
      if(typeof cell.value==='number')cell.numFmt=moneyFmt;
    }
    var faltaCell=r.getCell(4+contas.length+1);
    if(falta>0)faltaCell.font={color:{argb:'FFFF0000'},bold:true};
  });

  // Subtotal
  var subVals=['SUBTOTAL','','',(catTotal)];
  contas.forEach(function(c){
    var val=items.filter(function(d){return d.fonte_pagamento===c.nome}).reduce(function(s,d){return s+parseFloat(d.valor||0)},0);
    subVals.push(val);
  });
  var faltaCat=catTotal-items.reduce(function(s,d){var p=0;contas.forEach(function(c){if(d.fonte_pagamento===c.nome)p+=parseFloat(d.valor||0)});return s+p},0);
  subVals.push(faltaCat>0?faltaCat:0);
  subVals.push('');
  var sr=ws.addRow(subVals);
  sr.font=boldFont;
  sr.eachCell(function(cell){cell.fill=subtotalFill;if(typeof cell.value==='number')cell.numFmt=moneyFmt});
  ws.addRow([]);
});

// Grand total
ws.addRow([]);
var totVals=['TOTAL GERAL','','',grandTotal];
contas.forEach(function(c){
  var val=despR.rows.filter(function(d){return d.fonte_pagamento===c.nome}).reduce(function(s,d){return s+parseFloat(d.valor||0)},0);
  totVals.push(val);
});
var faltaTotal=grandTotal-despR.rows.reduce(function(s,d){var p=0;contas.forEach(function(c){if(d.fonte_pagamento===c.nome)p+=parseFloat(d.valor||0)});return s+p},0);
totVals.push(faltaTotal>0?faltaTotal:0);
totVals.push('');
var tr=ws.addRow(totVals);
tr.font={bold:true,color:{argb:'FFFFFFFF'},size:12};
tr.eachCell(function(cell){cell.fill=totalFill;if(typeof cell.value==='number')cell.numFmt=moneyFmt});

// Borders
ws.eachRow(function(row){row.eachCell(function(cell){cell.border={top:{style:'thin',color:{argb:'FFcccccc'}},bottom:{style:'thin',color:{argb:'FFcccccc'}},left:{style:'thin',color:{argb:'FFcccccc'}},right:{style:'thin',color:{argb:'FFcccccc'}}}})});

res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition','attachment; filename=pagamentos_'+evento.nome.replace(/\s/g,'_')+'.xlsx');
await wb.xlsx.write(res);
res.end();
}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

// === EXPORTAR ENCONTRO DE CONTAS XLSX ===
router.get('/api/eventos/:id/exportar-encontro',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({erro:'X'});
const evento=ev.rows[0];
const contasR=await pool.query('SELECT * FROM contas_evento WHERE id_evento=$1 AND org_id=$2 ORDER BY nome',[req.params.id,req.user.org_id]);
const despR=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const recR=await pool.query('SELECT * FROM receitas WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
var totalDesp=despR.rows.reduce(function(s,d){return s+parseFloat(d.valor||0)},0);
var totalRec=recR.rows.reduce(function(s,r){return s+parseFloat(r.valor||0)},0);
var lucro=totalRec-totalDesp;

const wb=new ExcelJS.Workbook();
const ws=wb.addWorksheet('Encontro de Contas');

const headerFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1a1a2e'}};
const greenFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF27ae60'}};
const redFill={type:'pattern',pattern:'solid',fgColor:{argb:'FFe74c3c'}};
const blueFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2980b9'}};
const whiteFont={color:{argb:'FFFFFFFF'},bold:true};
const moneyFmt='#,##0.00';

ws.columns=[{width:25},{width:20},{width:12},{width:18},{width:18},{width:18},{width:18}];

// Title
var r1=ws.addRow(['ENCONTRO DE CONTAS - '+evento.nome.toUpperCase()]);
r1.font={bold:true,size:14,color:{argb:'FF1a1a2e'}};
ws.mergeCells(1,1,1,7);
ws.addRow([]);

// Summary cards
var rRec=ws.addRow(['RECEITAS','','','DESPESAS','','','']);
rRec.font={bold:true,color:{argb:'FFFFFFFF'}};
rRec.getCell(1).fill=greenFill;rRec.getCell(2).fill=greenFill;rRec.getCell(3).fill=greenFill;
rRec.getCell(4).fill=redFill;rRec.getCell(5).fill=redFill;rRec.getCell(6).fill=redFill;
var lbl=lucro>=0?'LUCRO':'PREJUIZO';
rRec.getCell(7).fill=lucro>=0?blueFill:redFill;rRec.getCell(7).value=lbl;rRec.getCell(7).font=whiteFont;

var rVal=ws.addRow([totalRec,'','',totalDesp,'','',Math.abs(lucro)]);
rVal.getCell(1).numFmt=moneyFmt;rVal.getCell(1).font={bold:true,size:14,color:{argb:'FF27ae60'}};
rVal.getCell(4).numFmt=moneyFmt;rVal.getCell(4).font={bold:true,size:14,color:{argb:'FFe74c3c'}};
rVal.getCell(7).numFmt=moneyFmt;rVal.getCell(7).font={bold:true,size:14,color:lucro>=0?{argb:'FF2980b9'}:{argb:'FFe74c3c'}};
ws.addRow([]);

// Table header
var hdr=ws.addRow(['Conta','Titular','%','Pagou','Recebeu','Parte Lucro','Saldo Final']);
hdr.eachCell(function(cell){cell.fill=headerFill;cell.font=whiteFont;cell.alignment={horizontal:'center'}});
hdr.height=25;

// Data
contasR.rows.forEach(function(c){
  var pagou=despR.rows.filter(function(d){return d.fonte_pagamento===c.nome}).reduce(function(s,d){return s+parseFloat(d.valor||0)},0);
  var recebeu=recR.rows.filter(function(r){return r.centro_custo===c.nome}).reduce(function(s,r){return s+parseFloat(r.valor||0)},0);
  var percent=parseFloat(c.percentual)||0;
  var lucroParte=(lucro*percent)/100;
  var saldo=lucroParte+pagou-recebeu;
  var dr=ws.addRow([c.nome,c.titular||'',percent/100,pagou,recebeu,lucroParte,saldo]);
  dr.getCell(3).numFmt='0.00%';
  dr.getCell(4).numFmt=moneyFmt;dr.getCell(4).font={color:{argb:'FFe74c3c'}};
  dr.getCell(5).numFmt=moneyFmt;dr.getCell(5).font={color:{argb:'FF27ae60'}};
  dr.getCell(6).numFmt=moneyFmt;dr.getCell(6).font={color:{argb:'FF2980b9'}};
  dr.getCell(7).numFmt=moneyFmt;dr.getCell(7).font={bold:true,color:saldo>=0?{argb:'FF27ae60'}:{argb:'FFe74c3c'}};
});

ws.eachRow(function(row){row.eachCell(function(cell){cell.border={top:{style:'thin',color:{argb:'FFcccccc'}},bottom:{style:'thin',color:{argb:'FFcccccc'}},left:{style:'thin',color:{argb:'FFcccccc'}},right:{style:'thin',color:{argb:'FFcccccc'}}}})});

res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition','attachment; filename=encontro_contas_'+evento.nome.replace(/\s/g,'_')+'.xlsx');
await wb.xlsx.write(res);
res.end();
}catch(e){console.error(e);res.status(500).json({erro:e.message})}});


// === DASHBOARD FINANCEIRO ===
router.get('/api/eventos/:id/dashboard-financeiro',auth,async(req,res)=>{try{
const eid=req.params.id,oid=req.user.org_id;
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[eid,oid]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});

// Despesas por categoria
const despCat=await pool.query("SELECT centro_custo as categoria,COUNT(*) as qtd,SUM(valor) as total FROM despesas WHERE id_evento=$1 AND org_id=$2 GROUP BY centro_custo ORDER BY total DESC",[eid,oid]);

// Despesas por dia
const despDia=await pool.query("SELECT DATE(criado_em) as dia,SUM(valor) as total FROM despesas WHERE id_evento=$1 AND org_id=$2 GROUP BY DATE(criado_em) ORDER BY dia",[eid,oid]);

// Receitas por categoria
const recCat=await pool.query("SELECT centro_custo as categoria,COUNT(*) as qtd,SUM(valor) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 GROUP BY centro_custo ORDER BY total DESC",[eid,oid]);

// Totais
const totDesp=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM despesas WHERE id_evento=$1 AND org_id=$2",[eid,oid]);
const totRec=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE id_evento=$1 AND org_id=$2",[eid,oid]);
const totRecRecebido=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 AND situacao='RECEBIDO'",[eid,oid]);
const totRecPendente=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 AND situacao='pendente'",[eid,oid]);

// Despesas por status
const despStatus=await pool.query("SELECT situacao,COUNT(*) as qtd,SUM(valor) as total FROM despesas WHERE id_evento=$1 AND org_id=$2 GROUP BY situacao",[eid,oid]);

// Despesas por fonte pagamento
const despFonte=await pool.query("SELECT fonte_pagamento as fonte,COUNT(*) as qtd,SUM(valor) as total FROM despesas WHERE id_evento=$1 AND org_id=$2 AND fonte_pagamento IS NOT NULL AND fonte_pagamento!='' GROUP BY fonte_pagamento ORDER BY total DESC",[eid,oid]);

// Vendas BaladaAPP por dia
var vendasDia=[];
if(ev.rows[0].baladapp_id){
  const vd=await pool.query("SELECT DATE(data_venda) as dia,COUNT(*) as qtd,SUM(valor) as total FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2 AND LOWER(status)='aprovado' GROUP BY DATE(data_venda) ORDER BY dia",[eid,oid]);
  // Ajustar valores proporcionalmente para bater com a receita
  const recBalDash=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 AND conta='BaladaAPP'",[eid,oid]);
  const totalRecBal=parseFloat(recBalDash.rows[0].total)||0;
  const somaBrutaDash=vd.rows.reduce((s,d)=>s+parseFloat(d.total||0),0);
  if(totalRecBal>0 && somaBrutaDash>0 && Math.abs(somaBrutaDash-totalRecBal)>1){
    const fatorDash=totalRecBal/somaBrutaDash;
    vendasDia=vd.rows.map(d=>({...d,total:(parseFloat(d.total||0)*fatorDash).toFixed(2)}));
  }else{
    vendasDia=vd.rows;
  }
}

// Contas
const contas=await pool.query("SELECT * FROM contas_evento WHERE id_evento=$1 AND org_id=$2 ORDER BY nome",[eid,oid]);

var totalDesp=parseFloat(totDesp.rows[0].total)||0;
var totalRec=parseFloat(totRec.rows[0].total)||0;
var totalRecebido=parseFloat(totRecRecebido.rows[0].total)||0;
var totalPendente=parseFloat(totRecPendente.rows[0].total)||0;
var lucro=totalRec-totalDesp;
var margem=totalRec>0?((lucro/totalRec)*100):0;

res.json({
  total_despesas:totalDesp,
  total_receitas:totalRec,
  total_recebido:totalRecebido,
  total_pendente:totalPendente,
  lucro:lucro,
  margem:margem.toFixed(1),
  despesas_por_categoria:despCat.rows,
  despesas_por_dia:despDia.rows,
  despesas_por_status:despStatus.rows,
  despesas_por_fonte:despFonte.rows,
  receitas_por_categoria:recCat.rows,
  vendas_por_dia:vendasDia,
  contas:contas.rows,
  baladapp_id:ev.rows[0].baladapp_id,
  baladapp_sync:ev.rows[0].baladapp_ultima_sync
})
}catch(e){res.status(500).json({erro:e.message})}});

// === PROJECOES (PLANILHA) ===
// Listar projecoes de um evento, com valor_realizado e valor_a_pagar agregados
router.get('/api/eventos/:id/projecoes',auth,async(req,res)=>{try{
const tipo=req.query.tipo;
const params=[req.params.id,req.user.org_id];
let filterTipo='';
if(tipo==='despesa'||tipo==='receita'){params.push(tipo);filterTipo=' AND p.tipo=$3';}
const r=await pool.query(
  `SELECT p.*,
    CASE WHEN p.tipo='despesa'
      THEN COALESCE((SELECT SUM(valor) FROM despesas WHERE id_projecao=p.id),0)
      ELSE COALESCE((SELECT SUM(valor) FROM receitas WHERE id_projecao=p.id),0)
    END AS valor_realizado,
    CASE WHEN p.tipo='despesa'
      THEN COALESCE((SELECT SUM(CASE WHEN situacao='pendente' THEN COALESCE(NULLIF(falta_pagar,0),valor) ELSE 0 END) FROM despesas WHERE id_projecao=p.id),0)
      ELSE 0
    END AS valor_a_pagar
   FROM projecoes_evento p
   WHERE p.id_evento=$1 AND p.org_id=$2`+filterTipo+
  ` ORDER BY p.tipo, p.centro_custo NULLS LAST, p.id`,params);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

// Criar projecao
router.post('/api/eventos/:id/projecoes',auth,async(req,res)=>{try{
const{tipo,centro_custo,descricao,fornecedor_previsto,valor_projetado,observacoes,quantidade,valor_unitario}=req.body;
if(!tipo||(tipo!=='despesa'&&tipo!=='receita'))return res.status(400).json({erro:'Tipo deve ser despesa ou receita'});
if(!descricao||!descricao.trim())return res.status(400).json({erro:'Descricao obrigatoria'});
const qtd=quantidade!=null?parseFloat(quantidade):null;
const vu=valor_unitario!=null?parseFloat(valor_unitario):null;
const total=(qtd!=null&&vu!=null)?(qtd*vu):(parseFloat(valor_projetado)||0);
const r=await pool.query(
  `INSERT INTO projecoes_evento(org_id,id_evento,tipo,centro_custo,descricao,fornecedor_previsto,valor_projetado,observacoes,criado_por,quantidade,valor_unitario)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
  [req.user.org_id,req.params.id,tipo,centro_custo||null,descricao.trim(),fornecedor_previsto||null,total,observacoes||null,req.user.nome||'',qtd,vu]);
res.json(r.rows[0])}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

// Atualizar projecao (se valor mudar, grava historico)
router.patch('/api/projecoes/:id',auth,async(req,res)=>{try{
const prev=await pool.query('SELECT * FROM projecoes_evento WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!prev.rows.length)return res.status(404).json({erro:'Projecao nao encontrada'});
const b=req.body;const f=[];const v=[];let i=1;
['centro_custo','descricao','fornecedor_previsto','observacoes','tipo'].forEach(function(k){if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});
if(b.quantidade!==undefined){f.push('quantidade=$'+i);v.push(b.quantidade==null||b.quantidade===''?null:parseFloat(b.quantidade));i++}
if(b.valor_unitario!==undefined){f.push('valor_unitario=$'+i);v.push(b.valor_unitario==null||b.valor_unitario===''?null:parseFloat(b.valor_unitario));i++}
// Se qtd ou valor_unitario mudou mas valor_projetado nao veio, recalcula a partir do estado combinado
if(b.valor_projetado!==undefined){
  f.push('valor_projetado=$'+i);v.push(parseFloat(b.valor_projetado)||0);i++;
}else if(b.quantidade!==undefined||b.valor_unitario!==undefined){
  const novaQtd=b.quantidade!==undefined?(b.quantidade==null||b.quantidade===''?null:parseFloat(b.quantidade)):prev.rows[0].quantidade;
  const novoVU=b.valor_unitario!==undefined?(b.valor_unitario==null||b.valor_unitario===''?null:parseFloat(b.valor_unitario)):prev.rows[0].valor_unitario;
  if(novaQtd!=null&&novoVU!=null){f.push('valor_projetado=$'+i);v.push(parseFloat(novaQtd)*parseFloat(novoVU));i++}
}
if(!f.length)return res.status(400).json({erro:'Nada para atualizar'});
f.push('atualizado_em=NOW()');
v.push(parseInt(req.params.id));v.push(req.user.org_id);
const r=await pool.query('UPDATE projecoes_evento SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
const antes=parseFloat(prev.rows[0].valor_projetado)||0;
const depois=parseFloat(r.rows[0].valor_projetado)||0;
if(b.valor_projetado!==undefined && antes!==depois){
  await pool.query('INSERT INTO projecoes_historico(id_projecao,valor_antes,valor_depois,motivo,alterado_por) VALUES($1,$2,$3,$4,$5)',
    [r.rows[0].id,antes,depois,b.motivo||null,req.user.nome||'']);
}
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

// Deletar projecao (FKs em despesas/receitas viram NULL por ON DELETE SET NULL)
router.delete('/api/projecoes/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM projecoes_evento WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// Historico de revisoes de uma projecao
router.get('/api/projecoes/:id/historico',auth,async(req,res)=>{try{
const r=await pool.query(
  `SELECT h.* FROM projecoes_historico h
   JOIN projecoes_evento p ON p.id=h.id_projecao
   WHERE h.id_projecao=$1 AND p.org_id=$2
   ORDER BY h.alterado_em DESC`,[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

// Resumo consolidado do evento: totais projetado x realizado x a pagar, por tipo
router.get('/api/eventos/:id/projecoes/resumo',auth,async(req,res)=>{try{
const r=await pool.query(
  `SELECT p.tipo,
     COALESCE(SUM(p.valor_projetado),0) AS total_projetado,
     COALESCE(SUM(CASE WHEN p.tipo='despesa'
       THEN (SELECT COALESCE(SUM(valor),0) FROM despesas WHERE id_projecao=p.id)
       ELSE (SELECT COALESCE(SUM(valor),0) FROM receitas WHERE id_projecao=p.id) END),0) AS total_realizado
   FROM projecoes_evento p
   WHERE p.id_evento=$1 AND p.org_id=$2
   GROUP BY p.tipo`,[req.params.id,req.user.org_id]);
// Realizado "fora da projecao" (despesas/receitas sem id_projecao)
const foraD=await pool.query("SELECT COALESCE(SUM(valor),0) AS t FROM despesas WHERE id_evento=$1 AND org_id=$2 AND id_projecao IS NULL",[req.params.id,req.user.org_id]);
const foraR=await pool.query("SELECT COALESCE(SUM(valor),0) AS t FROM receitas WHERE id_evento=$1 AND org_id=$2 AND id_projecao IS NULL",[req.params.id,req.user.org_id]);
const out={despesa:{projetado:0,realizado:0,fora_projecao:parseFloat(foraD.rows[0].t)},
           receita:{projetado:0,realizado:0,fora_projecao:parseFloat(foraR.rows[0].t)}};
r.rows.forEach(function(row){
  out[row.tipo].projetado=parseFloat(row.total_projetado);
  out[row.tipo].realizado=parseFloat(row.total_realizado);
});
res.json(out)}catch(e){res.status(500).json({erro:e.message})}});

// Exportar projecao em XLSX seguindo o layout da tela
router.get('/api/eventos/:id/projecoes/exportar',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const evento=ev.rows[0];
const it=await pool.query(
  `SELECT p.*,
    CASE WHEN p.tipo='despesa'
      THEN COALESCE((SELECT SUM(valor) FROM despesas WHERE id_projecao=p.id),0)
      ELSE COALESCE((SELECT SUM(valor) FROM receitas WHERE id_projecao=p.id),0)
    END AS valor_realizado,
    CASE WHEN p.tipo='despesa'
      THEN COALESCE((SELECT SUM(CASE WHEN situacao='pendente' THEN COALESCE(NULLIF(falta_pagar,0),valor) ELSE 0 END) FROM despesas WHERE id_projecao=p.id),0)
      ELSE 0
    END AS valor_a_pagar
   FROM projecoes_evento p
   WHERE p.id_evento=$1 AND p.org_id=$2
   ORDER BY p.tipo, p.centro_custo NULLS LAST, p.id`,[req.params.id,req.user.org_id]);
const foraD=await pool.query("SELECT COALESCE(SUM(valor),0) AS t FROM despesas WHERE id_evento=$1 AND org_id=$2 AND id_projecao IS NULL",[req.params.id,req.user.org_id]);
const foraR=await pool.query("SELECT COALESCE(SUM(valor),0) AS t FROM receitas WHERE id_evento=$1 AND org_id=$2 AND id_projecao IS NULL",[req.params.id,req.user.org_id]);
const itens=it.rows;
const despesas=itens.filter(function(i){return i.tipo==='despesa'});
const receitas=itens.filter(function(i){return i.tipo==='receita'});
const CENTROS=['Artistico','Estrutura do Evento','Divulgacao e Midia','Documentacao e Taxas','Operacional','Bar','Open Bar','Alimentacao','Outros'];
const despesaSet=new Set(CENTROS);
const orfas=despesas.filter(function(i){return !despesaSet.has(i.centro_custo||'')});
const sum=function(arr,k){return arr.reduce(function(s,i){return s+parseFloat(i[k]||0)},0)};
const totDespProj=sum(despesas,'valor_projetado');
const totDespReal=sum(despesas,'valor_realizado')+parseFloat(foraD.rows[0].t);
const totRecProj=sum(receitas,'valor_projetado');
const totRecReal=sum(receitas,'valor_realizado')+parseFloat(foraR.rows[0].t);
const lucroProj=totRecProj-totDespProj;
const lucroReal=totRecReal-totDespReal;

const wb=new ExcelJS.Workbook();
const ws=wb.addWorksheet('Projecao');
const headerFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1a1a2e'}};
const sectionFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF16213e'}};
const subFill={type:'pattern',pattern:'solid',fgColor:{argb:'FFe8e8e8'}};
const totalFill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0f3460'}};
const resumoFill={type:'pattern',pattern:'solid',fgColor:{argb:'FFf5f5f5'}};
const whiteFont={color:{argb:'FFFFFFFF'},bold:true};
const moneyFmt='#,##0.00';
const COLS=['Descricao','Fornecedor','Qtd','Valor Unit','Projetado','Realizado','Variacao'];
ws.columns=[{width:40},{width:24},{width:10},{width:14},{width:14},{width:14},{width:14}];

// Titulo
var t=ws.addRow([evento.nome.toUpperCase()+' - PROJECAO ORCADA']);
t.font={bold:true,size:14,color:{argb:'FF1a1a2e'}};
ws.mergeCells(t.number,1,t.number,COLS.length);
ws.addRow([]);

// Resumo
var rh=ws.addRow(['RESUMO','','','','']);
rh.eachCell(function(c){c.fill=headerFill;c.font=whiteFont;c.alignment={horizontal:'left'}});
ws.mergeCells(rh.number,1,rh.number,COLS.length);
function resumoRow(label,projetado,realizado){
  var r=ws.addRow([label,'','','',projetado,realizado,'']);
  r.getCell(5).numFmt=moneyFmt; r.getCell(6).numFmt=moneyFmt;
  r.eachCell(function(c){c.fill=resumoFill});
  r.getCell(1).font={bold:true};
  return r;
}
resumoRow('Receita projetada',totRecProj,totRecReal);
resumoRow('Despesa projetada',totDespProj,totDespReal);
var lp=resumoRow('Lucro projetado',lucroProj,lucroReal);
if(lucroProj<0)lp.getCell(5).font={color:{argb:'FFFF0000'},bold:true};
if(lucroReal<0)lp.getCell(6).font={color:{argb:'FFFF0000'},bold:true};
ws.addRow([]);

// Bloco helper
function bloco(titulo,lista){
  var sr=ws.addRow([titulo.toUpperCase(),'','','','']);
  sr.font={bold:true,color:{argb:'FFFFFFFF'},size:11};
  sr.eachCell(function(c){c.fill=sectionFill});
  ws.mergeCells(sr.number,1,sr.number,COLS.length);
  if(!lista.length){
    var vz=ws.addRow(['vazio','','','','','','']);
    vz.getCell(1).font={italic:true,color:{argb:'FF888888'}};
    return;
  }
  var hdr=ws.addRow(COLS);
  hdr.eachCell(function(c){c.fill=headerFill;c.font=whiteFont;c.alignment={horizontal:'center'}});
  hdr.height=20;
  lista.forEach(function(i){
    var proj=parseFloat(i.valor_projetado||0);
    var real=parseFloat(i.valor_realizado||0);
    var vari=real-proj;
    var qtd=i.quantidade!=null?parseFloat(i.quantidade):'';
    var vu=i.valor_unitario!=null?parseFloat(i.valor_unitario):'';
    var r=ws.addRow([i.descricao||'',i.fornecedor_previsto||'',qtd,vu,proj,real,vari]);
    if(typeof qtd==='number')r.getCell(3).numFmt='#,##0.###';
    if(typeof vu==='number')r.getCell(4).numFmt=moneyFmt;
    r.getCell(5).numFmt=moneyFmt; r.getCell(6).numFmt=moneyFmt; r.getCell(7).numFmt=moneyFmt;
  });
  var subProj=sum(lista,'valor_projetado');
  var subReal=sum(lista,'valor_realizado');
  var subVari=subReal-subProj;
  var sub=ws.addRow(['SUBTOTAL','','','',subProj,subReal,subVari]);
  sub.font={bold:true};
  sub.eachCell(function(c){c.fill=subFill});
  sub.getCell(5).numFmt=moneyFmt; sub.getCell(6).numFmt=moneyFmt; sub.getCell(7).numFmt=moneyFmt;
}

// DESPESAS
var dh=ws.addRow(['DESPESAS','','','','','','']);
dh.font={bold:true,color:{argb:'FFFFFFFF'},size:12};
dh.eachCell(function(c){c.fill=totalFill});
ws.mergeCells(dh.number,1,dh.number,COLS.length);
CENTROS.forEach(function(centro){
  var lista=despesas.filter(function(i){return (i.centro_custo||'')===centro});
  if(lista.length){bloco(centro,lista);ws.addRow([])}
});
if(orfas.length){bloco('Sem categoria',orfas);ws.addRow([])}
if(parseFloat(foraD.rows[0].t)>0){
  var av=ws.addRow(['Realizado fora da projecao: '+parseFloat(foraD.rows[0].t).toFixed(2),'','','','','','']);
  av.getCell(1).font={italic:true,color:{argb:'FFB45309'}};
  ws.addRow([]);
}
// Total despesas
var td=ws.addRow(['TOTAL DESPESAS','','','',totDespProj,totDespReal,totDespReal-totDespProj]);
td.font={bold:true,color:{argb:'FFFFFFFF'},size:12};
td.eachCell(function(c){c.fill=totalFill});
td.getCell(5).numFmt=moneyFmt; td.getCell(6).numFmt=moneyFmt; td.getCell(7).numFmt=moneyFmt;
ws.addRow([]);

// RECEITAS
var rh2=ws.addRow(['RECEITAS','','','','','','']);
rh2.font={bold:true,color:{argb:'FFFFFFFF'},size:12};
rh2.eachCell(function(c){c.fill=totalFill});
ws.mergeCells(rh2.number,1,rh2.number,COLS.length);
bloco('Receitas',receitas);
if(parseFloat(foraR.rows[0].t)>0){
  ws.addRow([]);
  var avR=ws.addRow(['Realizado fora da projecao: '+parseFloat(foraR.rows[0].t).toFixed(2),'','','','','','']);
  avR.getCell(1).font={italic:true,color:{argb:'FFB45309'}};
}
ws.addRow([]);
var tr=ws.addRow(['TOTAL RECEITAS','','','',totRecProj,totRecReal,totRecReal-totRecProj]);
tr.font={bold:true,color:{argb:'FFFFFFFF'},size:12};
tr.eachCell(function(c){c.fill=totalFill});
tr.getCell(5).numFmt=moneyFmt; tr.getCell(6).numFmt=moneyFmt; tr.getCell(7).numFmt=moneyFmt;
ws.addRow([]);

// LUCRO final
var lr=ws.addRow(['LUCRO','','','',lucroProj,lucroReal,lucroReal-lucroProj]);
lr.font={bold:true,color:{argb:'FFFFFFFF'},size:13};
lr.eachCell(function(c){c.fill=headerFill});
lr.getCell(5).numFmt=moneyFmt; lr.getCell(6).numFmt=moneyFmt; lr.getCell(7).numFmt=moneyFmt;

// Bordas
ws.eachRow(function(row){row.eachCell(function(cell){cell.border={top:{style:'thin',color:{argb:'FFcccccc'}},bottom:{style:'thin',color:{argb:'FFcccccc'}},left:{style:'thin',color:{argb:'FFcccccc'}},right:{style:'thin',color:{argb:'FFcccccc'}}}})});

res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
res.setHeader('Content-Disposition','attachment; filename=projecao_'+evento.nome.replace(/\s/g,'_')+'.xlsx');
await wb.xlsx.write(res);
res.end();
}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

// Importacao em lote (usada pelo CSV do frontend)
router.post('/api/eventos/:id/projecoes/bulk',auth,async(req,res)=>{try{
const itens=req.body.itens;
if(!Array.isArray(itens)||!itens.length)return res.status(400).json({erro:'Lista vazia'});
const client=await pool.connect();
try{
  await client.query('BEGIN');
  const inseridos=[];
  for(const it of itens){
    if(!it.descricao||!it.descricao.trim())continue;
    if(it.tipo!=='despesa'&&it.tipo!=='receita')continue;
    const qtd=it.quantidade!=null&&it.quantidade!==''?parseFloat(it.quantidade):null;
    const vu=it.valor_unitario!=null&&it.valor_unitario!==''?parseFloat(it.valor_unitario):null;
    const total=(qtd!=null&&vu!=null)?(qtd*vu):(parseFloat(it.valor_projetado)||0);
    const r=await client.query(
      `INSERT INTO projecoes_evento(org_id,id_evento,tipo,centro_custo,descricao,fornecedor_previsto,valor_projetado,observacoes,criado_por,quantidade,valor_unitario)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [req.user.org_id,req.params.id,it.tipo,it.centro_custo||null,it.descricao.trim(),it.fornecedor_previsto||null,total,it.observacoes||null,req.user.nome||'',qtd,vu]);
    inseridos.push(r.rows[0]);
  }
  await client.query('COMMIT');
  res.json({sucesso:true,inseridos:inseridos.length,itens:inseridos});
}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

  return router;
};
