const express = require('express');
module.exports = function({ pool, axios, auth, EVO, KEY, INST, CLAUDE }) {
  const router = express.Router();

// === HELPER FUNCTIONS ===

async function salvarConhecimento(orgId, chamadoId) {
  try {
    const msgs = await pool.query('SELECT tipo_origem,texto FROM mensagens WHERE id_chamado=$1 ORDER BY criado_em DESC LIMIT 4', [chamadoId]);
    if (msgs.rows.length < 2) return;
    var ultClient = null, ultAgent = null;
    for (var m of msgs.rows) {
      if (m.tipo_origem === 'client' && !ultClient) ultClient = m.texto;
      if (m.tipo_origem === 'agent' && !ultAgent) ultAgent = m.texto;
    }
    if (!ultClient || !ultAgent) return;
    var existe = await pool.query('SELECT id FROM conhecimento WHERE org_id=$1 AND pergunta=$2', [orgId, ultClient]);
    if (existe.rows.length) {
      await pool.query('UPDATE conhecimento SET resposta=$1 WHERE id=$2', [ultAgent, existe.rows[0].id]);
    } else {
      await pool.query('INSERT INTO conhecimento(org_id,pergunta,resposta) VALUES($1,$2,$3)', [orgId, ultClient, ultAgent]);
    }
    console.log('Conhecimento salvo: ' + ultClient.substring(0, 50));
  } catch (e) { console.error('Erro salvar conhecimento:', e.message); }
}

async function buscarConhecimento(orgId, pergunta) {
  try {
    var rows = await pool.query('SELECT pergunta,resposta FROM conhecimento WHERE org_id=$1 ORDER BY vezes_usado DESC LIMIT 20', [orgId]);
    if (!rows.rows.length) return '';
    var palavras = pergunta.toLowerCase().split(/\s+/).filter(function(p) { return p.length > 3; });
    var relevantes = [];
    for (var r of rows.rows) {
      var score = 0;
      var pLower = r.pergunta.toLowerCase();
      for (var p of palavras) {
        if (pLower.includes(p)) score++;
      }
      if (score > 0) relevantes.push({ ...r, score: score });
    }
    relevantes.sort(function(a, b) { return b.score - a.score; });
    var top = relevantes.slice(0, 5);
    if (!top.length) return '';
    var txt = '\n=== RESPOSTAS ANTERIORES DA EQUIPE (use como referencia) ===\n';
    for (var t of top) {
      txt += 'Pergunta: ' + t.pergunta.substring(0, 100) + '\n';
      txt += 'Resposta da equipe: ' + t.resposta.substring(0, 200) + '\n\n';
      await pool.query('UPDATE conhecimento SET vezes_usado=vezes_usado+1 WHERE org_id=$1 AND pergunta=$2', [orgId, t.pergunta]);
    }
    return txt;
  } catch (e) { console.error('Erro buscar conhecimento:', e.message); return ''; }
}

async function getSysAuto(orgId){
try{
const evts=await pool.query('SELECT * FROM eventos WHERE org_id=$1',[orgId]);
var hoje=new Date().toISOString().split('T')[0];var prompt='Voce e o assistente virtual de atendimento ao cliente de uma produtora de eventos. Seja simpatico, profissional, use emojis com moderacao. DATA DE HOJE: '+hoje+'. Se uma data ja passou, trate como passado (ex: vendas ja abertas, evento ja aconteceu).\n\n';
if(evts.rows.length){
prompt+='=== EVENTOS ATIVOS ===\n';
for(var ev of evts.rows){
prompt+='\nEVENTO: '+ev.nome+'\n';
if(ev.data_evento)prompt+='DATA: '+ev.data_evento+(ev.hora_evento?' as '+ev.hora_evento:'')+'\n';
if(ev.hora_abertura)prompt+='ABERTURA PORTOES: '+ev.hora_abertura+'\n';
if(ev.local_evento)prompt+='LOCAL: '+ev.local_evento+(ev.cidade?', '+ev.cidade:'')+'\n';
if(ev.classificacao)prompt+='CLASSIFICACAO: '+ev.classificacao+'\n';
if(ev.atracoes)prompt+='ATRACOES: '+ev.atracoes+'\n';
if(ev.descricao)prompt+='DESCRICAO: '+ev.descricao+'\n';
if(ev.info_lotes)prompt+='INGRESSOS/LOTES: '+ev.info_lotes+'\n';
if(ev.data_abertura_vendas){var dvA=new Date(ev.data_abertura_vendas);var hjA=new Date(hoje);if(dvA<=hjA){prompt+='VENDAS: JA ESTAO ABERTAS (desde '+ev.data_abertura_vendas+'). Ingressos disponiveis para compra AGORA.\n';}else{prompt+='ABERTURA VENDAS: '+ev.data_abertura_vendas+(ev.hora_abertura_vendas?' as '+ev.hora_abertura_vendas:'')+'\n';}}
if(ev.promo_abertura)prompt+='PROMOCAO: '+ev.promo_abertura+'\n';
if(ev.pontos_venda)prompt+='PONTOS DE VENDA: '+ev.pontos_venda+'\n';
if(ev.publico_alvo)prompt+='PUBLICO: '+ev.publico_alvo+'\n';
if(ev.capacidade)prompt+='CAPACIDADE: '+ev.capacidade+' pessoas\n';
if(ev.observacoes)prompt+='OBS: '+ev.observacoes+'\n';
var sups=await pool.query('SELECT nome,categoria FROM fornecedores WHERE id_evento=$1 AND org_id=$2 AND status IN ($$contratado$$,$$confirmado$$)',[ev.id,orgId]);
if(sups.rows.length)prompt+='FORNECEDORES: '+sups.rows.map(function(s){return s.nome+' ('+s.categoria+')'}).join(', ')+'\n';
}
}else{prompt+='Nenhum evento cadastrado no momento. Informe que em breve teremos novidades.\n';}
prompt+='\nREGRAS DE ATENDIMENTO:\n';
prompt+='- Max 3-4 frases por resposta\n';
prompt+='- NUNCA diga "vou verificar com a equipe" se a informacao esta disponivel acima\n';
prompt+='- Se o cliente perguntar algo GENERICO sem mencionar nome de evento ou atracao, responda EXATAMENTE: "Temos alguns eventos incriveis! \u{1F389} Sobre qual voce gostaria de saber?" e NADA MAIS. NUNCA liste nomes de eventos na resposta. NUNCA mencione nomes de eventos quando o cliente nao especificou. Deixe o CLIENTE dizer qual evento quer saber.\n';
prompt+='- Se so houver 1 evento, responda direto sem perguntar\n';
prompt+='- Se a info do evento existe nos dados acima, RESPONDA com a info\n';
prompt+='- SOMENTE diga "vou verificar" se a info realmente NAO esta nos dados acima\n';
prompt+='- Seja proativo: alem de responder, sugira algo (ex: "Quer que eu te mande o link de compra?")\n';
prompt+='- Se perguntarem preco e tiver info_lotes, passe os valores\n';
prompt+='- Se perguntarem sobre um evento especifico pelo nome ou atracao, responda direto\n';
prompt+='- NAO invente informacoes que nao estao nos dados\n';
return prompt;
}catch(e){return 'Voce e um assistente de eventos. Seja simpatico e breve. Max 3-4 frases.'}}
const SYS_AUTO_FALLBACK='Voce e um assistente de eventos. Seja simpatico e breve. Max 3-4 frases.';

const SYS_FINANCEIRO=`Analise comprovantes financeiros. Identifique se e uma DESPESA (pagamento feito, compra, transferencia enviada) ou RECEITA (dinheiro recebido, pagamento de cliente, venda, deposito recebido). Extraia JSON: {"tipo":"despesa","valor":0,"quantidade":1,"valor_unitario":0,"fornecedor":"","data":"","descricao":"","centro_custo":"","conta":""} tipo=despesa ou receita. valor=total. quantidade=qtd de itens (se nao identificar use 1). valor_unitario=valor/quantidade. data no formato DD/MM/AAAA. descricao=o que foi comprado/pago/recebido. Se for RECEITA: conta=de onde veio (ex: patrocinio, venda ingressos, bar, etc). Se for DESPESA: centro_custo baseado na DESCRICAO do comprovante. Exemplos: palco/som/iluminacao/gerador=Estrutura do Evento, DJ/banda/artista=Artistico, flyer/banner/instagram=Divulgacao e Midia, cerveja/vodka/energetico/gelo=Bar, marmita/agua/comida=Alimentacao, seguranca/brigadista=Operacional, alvara/bombeiro/ecad=Documentacao e Taxas, camarim/rider/transporte=Logistica/Camarim. Centros PERMITIDOS: Artistico, Logistica/Camarim, Estrutura do Evento, Divulgacao e Midia, Documentacao e Taxas, Operacional, Bar, Alimentacao, Outros. APENAS JSON.`;
const SYS_FINANCEIRO_TEXTO=`Analise texto de despesa. Extraia JSON: {"valor":0,"fornecedor":"","data":"","descricao":"","centro_custo":""} Centros PERMITIDOS (use EXATAMENTE um destes): Artistico, Logistica/Camarim, Estrutura do Evento, Divulgacao e Midia, Documentacao e Taxas, Operacional, Bar, Alimentacao, Outros. Se nao tiver certeza use Outros. APENAS JSON.`;

async function enviarWA(numero,texto){const n=numero.startsWith('55')?numero:'55'+numero;try{await axios.post(EVO+'/message/sendText/'+INST,{number:n,textMessage:{text:texto}},{headers:{apikey:KEY,'Content-Type':'application/json'}});return true}catch(e){return false}}
async function enviarGrupo(gid,texto){try{await axios.post(EVO+'/message/sendText/'+INST,{number:gid,textMessage:{text:texto}},{headers:{apikey:KEY,'Content-Type':'application/json'}});return true}catch(e){return false}}
async function enviarLista(numero,titulo,descricao,botaoTxt,rodape,rows){try{
const n=numero.replace(/\D/g,'');
const dest=n.startsWith('55')?n:'55'+n;
const r=await axios.post(EVO+'/message/sendList/'+INST,{number:dest,options:{delay:300},listMessage:{title:titulo,description:descricao,buttonText:botaoTxt,footerText:rodape||'',sections:[{title:'Opcoes',rows:rows}]}},{headers:{apikey:KEY,'Content-Type':'application/json'}});
return r.data?.key?.id||null;
}catch(e){console.error('Erro lista:',e.response?.data||e.message);return null}}

async function respostaAutomatica(idChamado){try{
const cr=await pool.query('SELECT * FROM chamados WHERE id=$1',[idChamado]);if(!cr.rows.length)return;
const c=cr.rows[0];
const ms=await pool.query('SELECT * FROM mensagens WHERE id_chamado=$1 ORDER BY criado_em DESC LIMIT 6',[idChamado]);
const conv=ms.rows.reverse().map(m=>(m.tipo_origem==='client'?c.nome_cliente:'Assistente')+': '+m.texto).join('\n');
const sysPrompt=await getSysAuto(c.org_id);var ultMsg=ms.rows.filter(function(m){return m.tipo_origem==='client'}).pop();var conhec=await buscarConhecimento(c.org_id,ultMsg?ultMsg.texto:'');const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:300,system:sysPrompt+conhec,messages:[{role:'user',content:'Conversa:\n'+conv+'\n\nResponda. Apenas o texto.'}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
const resposta=r.data.content.map(b=>b.text||'').filter(Boolean).join('\n');if(!resposta)return;
const lidR=await pool.query('SELECT numero FROM mapa_lids WHERE lid=$1',[c.telefone_cliente]);
let num=c.numero_real||(lidR.rows.length?lidR.rows[0].numero:'')||'';
if(!num&&!c.telefone_cliente.includes('lid'))num=c.telefone_cliente;
if(!num)return;
if(await enviarWA(num,resposta)){
const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
await pool.query('INSERT INTO mensagens(id_chamado,tipo_origem,texto,hora) VALUES($1,$2,$3,$4)',[idChamado,'agent',resposta,hora]);
await pool.query('UPDATE chamados SET status=$1,atualizado_em=NOW() WHERE id=$2',['respondido',idChamado]);
console.log('IA ['+c.nome_cliente+']: '+resposta.substring(0,80));}
}catch(e){console.error('Erro resposta automatica:',e.message)}}

const CATEGORIAS_LISTA=[
{num:'1',emoji:'\u{1F3B5}',nome:'Artistico'},
{num:'2',emoji:'\u{1F4E6}',nome:'Logistica/Camarim'},
{num:'3',emoji:'\u{1F3D7}\uFE0F',nome:'Estrutura do Evento'},
{num:'4',emoji:'\u{1F4E2}',nome:'Divulgacao e Midia'},
{num:'5',emoji:'\u{1F4C4}',nome:'Documentacao e Taxas'},
{num:'6',emoji:'\u2699\uFE0F',nome:'Operacional'},
{num:'7',emoji:'\u{1F378}',nome:'Bar'},
{num:'8',emoji:'\u{1F37D}\uFE0F',nome:'Alimentacao'},
{num:'9',emoji:'\u{1F4CB}',nome:'Outros'}
];

async function processarImagem(msg,idEvento,remetente,caption='',idGrupo=''){try{
const isDoc=!!msg.message?.documentMessage;
let dadosImagem=null;
try{const r=await axios.post(EVO+'/chat/getBase64FromMediaMessage/'+INST,{message:msg},{headers:{apikey:KEY,'Content-Type':'application/json'}});dadosImagem=r.data?.base64||r.data}catch(e){}
if(!dadosImagem||typeof dadosImagem!=='string')return;
const limpo=dadosImagem.replace(/^data:[\w\/+-]+;base64,/,'');
const tipoConteudo=isDoc?'document':'image';
const tipoMidia=isDoc?'application/pdf':'image/jpeg';
const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:500,system:SYS_FINANCEIRO,messages:[{role:'user',content:[{type:tipoConteudo,source:{type:'base64',media_type:tipoMidia,data:limpo}},{type:'text',text:'Analise este comprovante.'+(caption?' O remetente descreveu: '+caption:'')}]}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
const txt=r.data.content.map(b=>b.text||'').join('');const match=txt.match(/\{[\s\S]*\}/);if(!match)return;
const p=JSON.parse(match[0]);console.log('IA retornou:',JSON.stringify(p));
const ev=await pool.query('SELECT org_id FROM eventos WHERE id=$1',[idEvento]);if(!ev.rows.length)return;
// Salvar comprovante como arquivo
const ext=isDoc?'.pdf':'.jpg';
const nomeArq=Date.now()+'-comprovante'+ext;
const fs=require('fs');
fs.writeFileSync('/app/uploads/'+nomeArq,Buffer.from(limpo,'base64'));
const compUrl='/uploads/'+nomeArq;
// Buscar conta pelo nome do remetente
let fontePag='';
const contasR=await pool.query('SELECT nome,titular FROM contas_evento WHERE id_evento=$1',[idEvento]);
if(contasR.rows.length){
const remLower=(remetente||'').toLowerCase();
const contaMatch=contasR.rows.find(c=>{
const titLower=(c.titular||'').toLowerCase();
const nomLower=(c.nome||'').toLowerCase();
return remLower.includes(titLower)||titLower.includes(remLower)||remLower.includes(nomLower);
});
if(contaMatch)fontePag=contaMatch.nome;
}
// Adicionar fonte_pagamento aos dados extraidos
p.fonte_pagamento=fontePag;
// Salvar como pendente com token unico
const grp=idGrupo||'';
const token=require('crypto').randomBytes(12).toString('base64url');
const insertR=await pool.query('INSERT INTO comprovantes_pendentes(id_evento,org_id,id_grupo,remetente,dados,comprovante_url,status,etapa,token) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id',
[idEvento,ev.rows[0].org_id,grp,remetente,JSON.stringify(p),compUrl,'pendente','tipo',token]);
const pendenteId=insertR.rows[0].id;
const evtR=await pool.query('SELECT nome FROM eventos WHERE id=$1',[idEvento]);
const catSugerida=p.centro_custo||'Outros';
const catEmoji=CATEGORIAS_LISTA.find(c=>c.nome===catSugerida);
const link='https://app.314br.com/comprovante/'+token;
const msgConfirm='\u{1F4CB} *Comprovante recebido*\n\n'
+'\u{1F4B0} *R$ '+(parseFloat(p.valor)||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'*\n'
+'\u{1F4DD} '+(p.descricao||'N/I')+'\n'
+(p.fornecedor?'\u{1F3E2} '+p.fornecedor+'\n':'')
+'\u{1F4C5} '+(p.data||'-')+'\n'
+'\u{1F4C2} Sugestao: '+(catEmoji?catEmoji.emoji+' ':'')+catSugerida+'\n'
+'\u{1F464} '+remetente+'\n'
+'\n\u{1F449} Confirmar: '+link+'\n'
+'\n_'+evtR.rows[0].nome+'_';
await enviarGrupo(grp,msgConfirm);
console.log('PENDENTE #'+pendenteId+': R$'+p.valor+' | '+catSugerida+' | Token: '+token);
}catch(e){console.error('Erro imagem:',e.response?.data||e.message)}}

async function confirmarComprovante(pendente,tipo,edicoes){try{
const p=typeof pendente.dados==='string'?JSON.parse(pendente.dados):pendente.dados;
const ed=edicoes||{};
// Aplica edicoes sobre dados extraidos pela IA
const valor=ed.valor!=null?parseFloat(ed.valor):(parseFloat(p.valor)||0);
const descricao=ed.descricao||p.descricao||'N/I';
const fornecedor=(ed.fornecedor||p.fornecedor||'N/I').toString().trim();
const data=ed.data||p.data;
const quantidade=ed.quantidade!=null?parseInt(ed.quantidade):(parseInt(p.quantidade)||1);
const fontePag=ed.fonte_pagamento!=null?ed.fonte_pagamento:(p.fonte_pagamento||'');
const catFinal=(typeof ed.categoria==='string'&&ed.categoria)?ed.categoria:(p.centro_custo||'Outros');
const evtR=await pool.query('SELECT nome,id_grupo FROM eventos WHERE id=$1',[pendente.id_evento]);
const emo={'Estrutura do Evento':'\u{1F3AA}',Artistico:'\u{1F3A4}',Seguranca:'\u{1F6E1}',Alimentacao:'\u{1F354}','Divulgacao e Midia':'\u{1F4E2}','Documentacao e Taxas':'\u{1F4CB}',Operacional:'\u2699\uFE0F',Bar:'\u{1F378}','Logistica/Camarim':'\u{1F4E6}',Outros:'\u{1F4CB}'};
let desp;let refId=null;let refType=null;
if(tipo==='receita'){
desp=await pool.query('INSERT INTO receitas(id_evento,org_id,valor,descricao,conta,data_pagamento,situacao,registrado_por,comprovante_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
[pendente.id_evento,pendente.org_id,valor,descricao,fontePag||p.conta||'Outros',data?data.split('/').reverse().join('-'):new Date().toISOString().split('T')[0],'recebido',pendente.remetente,pendente.comprovante_url]);
const x=desp.rows[0];refId=x.id;refType='receita';
await enviarGrupo(pendente.id_grupo,'\u{1F4B5} *Receita registrada!*\n\n\u{1F4B0} *R$ '+parseFloat(x.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})+'*\n\u{1F4C2} '+(x.conta||'Outros')+'\n\u{1F4DD} '+x.descricao+'\n\u{1F4C5} '+(x.data_pagamento||'')+'\n\u{1F464} '+pendente.remetente+'\n\n_#'+x.id+' | '+evtR.rows[0].nome+'_');
console.log('RECEITA #'+x.id+': R$'+x.valor);
}else{
const valUnit=valor/(quantidade||1);
desp=await pool.query('INSERT INTO despesas(id_evento,org_id,valor,quantidade,valor_unitario,fornecedor,data,descricao,centro_custo,registrado_por,fonte,comprovante_url,situacao,fonte_pagamento) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
[pendente.id_evento,pendente.org_id,valor,quantidade,valUnit,fornecedor,data||new Date().toLocaleDateString('pt-BR'),descricao,catFinal,pendente.remetente,pendente.comprovante_url?.endsWith('.pdf')?'documento':'imagem',pendente.comprovante_url,'pago',fontePag]);
const x=desp.rows[0];refId=x.id;refType='despesa';
await enviarGrupo(pendente.id_grupo,'\u2705 *Despesa registrada!*\n\n\u{1F4B0} *R$ '+parseFloat(x.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})+'*\n\u{1F4C2} '+(emo[catFinal]||'\u{1F4CB}')+' '+catFinal+'\n\u{1F3E2} '+x.fornecedor+'\n\u{1F4DD} '+x.descricao+'\n\u{1F4C5} '+x.data+'\n\u{1F464} '+pendente.remetente+'\n\n_#'+x.id+' | '+evtR.rows[0].nome+'_');
console.log('DESPESA #'+x.id+': R$'+x.valor+' | '+catFinal);
}
await pool.query("UPDATE comprovantes_pendentes SET status='confirmado',confirmed_at=NOW(),confirmed_ref_id=$1,confirmed_ref_type=$2 WHERE id=$3",[refId,refType,pendente.id]);
return{id:refId,tipo:refType};
}catch(e){console.error('Erro confirmar comprovante:',e.message);return null}}

async function iniciarPollCategoria(pendente){try{
const rows=CATEGORIAS_LISTA.map(cat=>({title:cat.emoji+' '+cat.nome,rowId:'cat:'+cat.nome}));
let listaId=null;
if(pendente.remetente_num){
listaId=await enviarLista(pendente.remetente_num,'Escolha a categoria','Selecione a categoria da despesa','Ver categorias','',rows);
}
if(listaId){
await pool.query("UPDATE comprovantes_pendentes SET etapa='categoria',poll_msg_id=$1 WHERE id=$2",[listaId,pendente.id]);
}else{
// Fallback: lista numerada no grupo
let msgCat='\u{1F4C2} *Escolha a categoria (digite o numero):*\n\n';
CATEGORIAS_LISTA.forEach(cat=>{msgCat+='*'+cat.num+'* - '+cat.emoji+' '+cat.nome+'\n'});
await enviarGrupo(pendente.id_grupo,msgCat);
await pool.query("UPDATE comprovantes_pendentes SET etapa='categoria' WHERE id=$1",[pendente.id]);
}
}catch(e){console.error('Erro lista categoria:',e.message)}}

async function processarRespostaGrupo(jid,texto,remetente){try{
const tx=texto.trim();
// Buscar pendente mais recente deste grupo
const pR=await pool.query("SELECT * FROM comprovantes_pendentes WHERE id_grupo=$1 AND status='pendente' ORDER BY criado_em DESC LIMIT 1",[jid]);
if(!pR.rows.length)return false;
const pendente=pR.rows[0];
if(pendente.etapa==='tipo'){
if(tx==='1'){
// Despesa com categoria sugerida
await confirmarComprovante(pendente,'despesa',null);
return true;
}else if(tx==='2'){
// Receita
await confirmarComprovante(pendente,'receita',null);
return true;
}else if(tx==='3'){
// Nao registrar
await pool.query("UPDATE comprovantes_pendentes SET status='ignorado' WHERE id=$1",[pendente.id]);
await enviarGrupo(jid,'\u274C Comprovante ignorado. Nao foi registrado.');
console.log('IGNORADO: comprovante #'+pendente.id);
return true;
}else if(tx==='4'){
// Mudar categoria - enviar poll
await iniciarPollCategoria(pendente);
return true;
}
}else if(pendente.etapa==='categoria'){
const catNum=parseInt(tx);
if(catNum>=1&&catNum<=9){
const catEscolhida=CATEGORIAS_LISTA.find(c=>c.num===tx);
if(catEscolhida){
await confirmarComprovante(pendente,'despesa',{categoria:catEscolhida.nome});
return true;
}
}
// Numero invalido
await enviarGrupo(jid,'\u26A0\uFE0F Numero invalido. Responda de *1* a *9*.');
return true;
}
return false;
}catch(e){console.error('Erro resposta grupo:',e.message);return false}}

async function processarTexto(texto,idEvento,remetente){try{
const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:300,system:SYS_FINANCEIRO_TEXTO,messages:[{role:'user',content:'Msg: '+texto+'\nHoje: '+new Date().toLocaleDateString('pt-BR')}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
const txt=r.data.content.map(b=>b.text||'').join('');const match=txt.match(/\{[\s\S]*\}/);if(!match)return;
const p=JSON.parse(match[0]);if(!p.valor||p.valor===0)return;
const ev=await pool.query('SELECT org_id FROM eventos WHERE id=$1',[idEvento]);if(!ev.rows.length)return;
const desp=await pool.query('INSERT INTO despesas(id_evento,org_id,valor,fornecedor,data,descricao,centro_custo,registrado_por,fonte) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[idEvento,ev.rows[0].org_id,parseFloat(p.valor)||0,p.fornecedor||'N/I',p.data||new Date().toLocaleDateString('pt-BR'),p.descricao||texto.substring(0,100),p.centro_custo||'Outros',remetente,'texto']);
const x=desp.rows[0];const evtR=await pool.query('SELECT nome,id_grupo FROM eventos WHERE id=$1',[idEvento]);
const emo={Estrutura:'\u{1F3AA}',Artistico:'\u{1F3A4}',Seguranca:'\u{1F6E1}','Alimentacao/Bebidas':'\u{1F354}',Marketing:'\u{1F4E2}','Impostos/Taxas':'\u{1F4CB}','Equipe/Staff':'\u{1F465}',Outros:'\u{1F4E6}'};
await enviarGrupo(evtR.rows[0].id_grupo,'\u2705 *Despesa registrada!*\n\n\u{1F4B0} *R$ '+parseFloat(x.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})+'*\n\u{1F4C2} '+(emo[x.centro_custo]||'\u{1F4E6}')+' '+x.centro_custo+'\n\u{1F3E2} '+x.fornecedor+'\n\u{1F4DD} '+x.descricao+'\n\u{1F4C5} '+x.data+'\n\u{1F464} '+remetente+'\n\n_#'+x.id+' | '+evtR.rows[0].nome+'_');
console.log('DESPESA TXT #'+x.id+': R$'+x.valor+' | '+x.centro_custo);
}catch(e){console.error('Erro texto:',e.response?.data||e.message)}}

// === CHAMADOS (com org_id) ===
router.get('/api/chamados',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM chamados WHERE org_id=$1 ORDER BY atualizado_em DESC',[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/chamados/:id/mensagens',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM mensagens WHERE id_chamado=$1 ORDER BY criado_em',[req.params.id]);
res.json(r.rows.map(m=>({id:m.id,de:m.tipo_origem,texto:m.texto,hora:m.hora,criado_em:m.criado_em})))}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/chamados/:id/responder',auth,async(req,res)=>{try{
const{texto}=req.body;const id=parseInt(req.params.id);
const cr=await pool.query('SELECT * FROM chamados WHERE id=$1 AND org_id=$2',[id,req.user.org_id]);
if(!cr.rows.length)return res.status(404).json({erro:'Chamado nao encontrado'});
const c=cr.rows[0];
const num=c.numero_real||c.telefone_cliente;
const enviarNum=num.startsWith('55')?num:'55'+num;
await axios.post(EVO+'/message/sendText/'+INST,{number:enviarNum,textMessage:{text:texto}},{headers:{apikey:KEY,'Content-Type':'application/json'}});
const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
await pool.query('INSERT INTO mensagens(id_chamado,tipo_origem,texto,hora) VALUES($1,$2,$3,$4)',[id,'agent',texto,hora]);
await pool.query('UPDATE chamados SET status=$1,modo_automatico=false,atualizado_em=NOW() WHERE id=$2',['respondido',id]);
salvarConhecimento(req.user.org_id, id);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/chamados/:id/numero',auth,async(req,res)=>{try{
const num=req.body.numero.replace(/\D/g,'');const id=parseInt(req.params.id);
await pool.query('UPDATE chamados SET numero_real=$1 WHERE id=$2 AND org_id=$3',[num,id,req.user.org_id]);
const c=await pool.query('SELECT telefone_cliente FROM chamados WHERE id=$1',[id]);
if(c.rows.length)await pool.query('INSERT INTO mapa_lids(lid,numero) VALUES($1,$2) ON CONFLICT(lid) DO UPDATE SET numero=$2',[c.rows[0].telefone_cliente,num]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/chamados/:id',auth,async(req,res)=>{try{
const id=parseInt(req.params.id);const{status,tipo_agente,prioridade}=req.body;
if(status)await pool.query('UPDATE chamados SET status=$1,atualizado_em=NOW() WHERE id=$2 AND org_id=$3',[status,id,req.user.org_id]);
if(tipo_agente)await pool.query('UPDATE chamados SET tipo_agente=$1,atualizado_em=NOW() WHERE id=$2 AND org_id=$3',[tipo_agente,id,req.user.org_id]);
if(prioridade)await pool.query('UPDATE chamados SET prioridade=$1,atualizado_em=NOW() WHERE id=$2 AND org_id=$3',[prioridade,id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// ANOTACOES
router.get('/api/chamados/:id/anotacoes',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM anotacoes WHERE id_chamado=$1 ORDER BY criado_em',[req.params.id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/chamados/:id/anotacoes',auth,async(req,res)=>{try{
const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
await pool.query('INSERT INTO anotacoes(id_chamado,texto,hora) VALUES($1,$2,$3)',[req.params.id,req.body.content,hora]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === IA ===
router.post('/api/ia/sugerir',auth,async(req,res)=>{try{
const{idChamado}=req.body;
const ms=await pool.query('SELECT * FROM mensagens WHERE id_chamado=$1 ORDER BY criado_em',[idChamado]);
const conv=ms.rows.map(m=>m.texto).join('\n');
const sysPrompt=await getSysAuto(req.user.org_id);const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:500,system:sysPrompt+'\nGere SUGESTAO.',messages:[{role:'user',content:'Conversa:\n'+conv}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
res.json({sugestao:r.data.content.map(b=>b.text||'').filter(Boolean).join('\n')})}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/ia/perguntar',auth,async(req,res)=>{try{
const{pergunta}=req.body;
const sysPrompt=await getSysAuto(req.user.org_id);const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:500,system:sysPrompt+'\nPergunta interna.',messages:[{role:'user',content:pergunta}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
res.json({resposta:r.data.content.map(b=>b.text||'').filter(Boolean).join('\n')})}catch(e){res.status(500).json({erro:e.message})}});

// === CONFIRMACAO PUBLICA DE COMPROVANTE (via link no grupo) ===
const TOKEN_EXP_DIAS=7;
const UNDO_MIN=5;

router.get('/api/public/comprovante/:token',async(req,res)=>{try{
const r=await pool.query("SELECT cp.*,e.nome as evento_nome,EXTRACT(EPOCH FROM (NOW()-cp.criado_em))/86400 as idade_dias FROM comprovantes_pendentes cp LEFT JOIN eventos e ON e.id=cp.id_evento WHERE cp.token=$1",[req.params.token]);
if(!r.rows.length)return res.status(404).json({erro:'Comprovante nao encontrado'});
const p=r.rows[0];
const dados=typeof p.dados==='string'?JSON.parse(p.dados):p.dados;
// Contas do evento para fonte_pagamento
const contasR=await pool.query('SELECT id,nome,titular,tipo FROM contas_evento WHERE id_evento=$1 ORDER BY nome',[p.id_evento]);
// Expiracao
const expirado=p.status==='pendente'&&parseFloat(p.idade_dias)>TOKEN_EXP_DIAS;
// Undo ainda disponivel?
let undoSegRestantes=0;
if(p.confirmed_at){
const undoAteMs=new Date(p.confirmed_at).getTime()+UNDO_MIN*60*1000;
undoSegRestantes=Math.max(0,Math.floor((undoAteMs-Date.now())/1000));
}
res.json({
id:p.id,status:expirado?'expirado':p.status,etapa:p.etapa,remetente:p.remetente,
evento_nome:p.evento_nome,comprovante_url:p.comprovante_url,
dados,confirmed_at:p.confirmed_at,confirmed_ref_type:p.confirmed_ref_type,undo_seg_restantes:undoSegRestantes,
categorias:CATEGORIAS_LISTA.map(c=>({nome:c.nome,emoji:c.emoji})),
contas:contasR.rows
});
}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/public/comprovante/:token',async(req,res)=>{try{
const{acao}=req.body;
const r=await pool.query('SELECT * FROM comprovantes_pendentes WHERE token=$1',[req.params.token]);
if(!r.rows.length)return res.status(404).json({erro:'Token invalido'});
const pendente=r.rows[0];
const idadeMs=Date.now()-new Date(pendente.criado_em).getTime();
if(pendente.status==='pendente'&&idadeMs>TOKEN_EXP_DIAS*86400*1000){
await pool.query("UPDATE comprovantes_pendentes SET status='expirado' WHERE id=$1",[pendente.id]);
return res.status(410).json({erro:'Link expirado'});
}
if(pendente.status!=='pendente')return res.status(400).json({erro:'Comprovante ja foi '+pendente.status,status:pendente.status});
const edicoes={categoria:req.body.categoria,valor:req.body.valor,descricao:req.body.descricao,fornecedor:req.body.fornecedor,data:req.body.data,quantidade:req.body.quantidade,fonte_pagamento:req.body.fonte_pagamento};
if(acao==='despesa'){const ref=await confirmarComprovante(pendente,'despesa',edicoes);return res.json({sucesso:true,acao:'despesa',ref});}
if(acao==='receita'){const ref=await confirmarComprovante(pendente,'receita',edicoes);return res.json({sucesso:true,acao:'receita',ref});}
if(acao==='ignorar'){
await pool.query("UPDATE comprovantes_pendentes SET status='ignorado',confirmed_at=NOW() WHERE id=$1",[pendente.id]);
await enviarGrupo(pendente.id_grupo,'\u274C Comprovante ignorado por '+pendente.remetente+'.');
console.log('IGNORADO (web): comprovante #'+pendente.id);
return res.json({sucesso:true,acao:'ignorar'});
}
res.status(400).json({erro:'Acao invalida'});
}catch(e){console.error('Erro confirmacao web:',e.message);res.status(500).json({erro:e.message})}});

router.post('/api/public/comprovante/:token/criar-conta',async(req,res)=>{try{
const{nome,titular,tipo}=req.body;
if(!nome||!nome.trim())return res.status(400).json({erro:'Nome obrigatorio'});
const r=await pool.query('SELECT id_evento,org_id,status FROM comprovantes_pendentes WHERE token=$1',[req.params.token]);
if(!r.rows.length)return res.status(404).json({erro:'Token invalido'});
const p=r.rows[0];
if(p.status!=='pendente')return res.status(400).json({erro:'Comprovante ja foi '+p.status});
const ins=await pool.query('INSERT INTO contas_evento(org_id,id_evento,nome,tipo,titular,percentual) VALUES($1,$2,$3,$4,$5,0) RETURNING id,nome,titular,tipo',[p.org_id,p.id_evento,nome.trim(),tipo||'banco',(titular||'').trim()]);
res.json(ins.rows[0]);
}catch(e){console.error('Erro criar conta (web):',e.message);res.status(500).json({erro:e.message})}});

router.post('/api/public/comprovante/:token/desfazer',async(req,res)=>{try{
const r=await pool.query('SELECT * FROM comprovantes_pendentes WHERE token=$1',[req.params.token]);
if(!r.rows.length)return res.status(404).json({erro:'Token invalido'});
const p=r.rows[0];
if(p.status==='pendente')return res.status(400).json({erro:'Ainda nao confirmado'});
if(!p.confirmed_at)return res.status(400).json({erro:'Sem registro de confirmacao'});
const idadeMs=Date.now()-new Date(p.confirmed_at).getTime();
if(idadeMs>UNDO_MIN*60*1000)return res.status(400).json({erro:'Janela para desfazer expirou ('+UNDO_MIN+' min)'});
// Remove o registro criado (despesa/receita) se houver
if(p.confirmed_ref_id&&p.confirmed_ref_type==='despesa'){
await pool.query('DELETE FROM despesas WHERE id=$1 AND org_id=$2',[p.confirmed_ref_id,p.org_id]);
}else if(p.confirmed_ref_id&&p.confirmed_ref_type==='receita'){
await pool.query('DELETE FROM receitas WHERE id=$1 AND org_id=$2',[p.confirmed_ref_id,p.org_id]);
}
await pool.query("UPDATE comprovantes_pendentes SET status='pendente',confirmed_at=NULL,confirmed_ref_id=NULL,confirmed_ref_type=NULL WHERE id=$1",[p.id]);
await enviarGrupo(p.id_grupo,'\u21A9\uFE0F Registro desfeito. Comprovante voltou para pendente.');
console.log('DESFAZER: comprovante #'+p.id);
res.json({sucesso:true});
}catch(e){console.error('Erro desfazer:',e.message);res.status(500).json({erro:e.message})}});

// === LISTAGEM AUTENTICADA DE PENDENTES ===
router.get('/api/comprovantes-pendentes',auth,async(req,res)=>{try{
const{status}=req.query;
const statusFiltro=status||'pendente';
const r=await pool.query("SELECT cp.id,cp.token,cp.status,cp.remetente,cp.dados,cp.comprovante_url,cp.criado_em,cp.confirmed_at,cp.confirmed_ref_id,cp.confirmed_ref_type,e.nome as evento_nome,e.id as id_evento FROM comprovantes_pendentes cp LEFT JOIN eventos e ON e.id=cp.id_evento WHERE cp.org_id=$1 AND cp.status=$2 ORDER BY cp.criado_em DESC LIMIT 100",[req.user.org_id,statusFiltro]);
const items=r.rows.map(row=>({...row,dados:typeof row.dados==='string'?JSON.parse(row.dados):row.dados}));
res.json(items);
}catch(e){res.status(500).json({erro:e.message})}});

// === WEBHOOK (sem auth - vem da Evolution) ===
router.post('/webhook/evolution',async(req,res)=>{res.sendStatus(200);try{
const d=req.body,ev=d.event;
// DEBUG TOTAL: log todos os eventos exceto mensagens normais
const rawStr=JSON.stringify(d).substring(0,1200);
const ehMsgNormal=ev==='messages.upsert'&&!rawStr.toLowerCase().includes('poll');
if(!ehMsgNormal){console.log('>>> EVT ['+ev+']:',rawStr);}
if(ev==='messages.upsert'){const m=d.data;if(!m)return;
const jid=m.key?.remoteJid||'';const nm=m.pushName||'';

if(m.key?.fromMe)return;
const isGrupo=jid.includes('@g.us');
if(isGrupo){
const evtR=await pool.query('SELECT * FROM eventos WHERE id_grupo=$1',[jid]);
if(evtR.rows.length){const evento=evtR.rows[0];
const temImagem=m.message?.imageMessage;const temDoc=m.message?.documentMessage;
const tx=m.message?.conversation||m.message?.extendedTextMessage?.text||'';
if(temImagem||temDoc){const caption=m.message?.imageMessage?.caption||m.message?.documentMessage?.caption||'';console.log('Arquivo no grupo '+evento.nome+(caption?' | Legenda: '+caption:''));setTimeout(()=>processarImagem(m,evento.id,nm,caption,jid),1000)}
else if(tx){
// Verificar se eh resposta a um comprovante pendente (1,2,3,4 ou categoria 1-9)
await processarRespostaGrupo(jid,tx,nm);
}
}
return}
const tel=jid.replace('@s.whatsapp.net','').replace('@lid','');
const tx=m.message?.conversation||m.message?.extendedTextMessage?.text||'';if(!tel||!tx)return;
const org_id=1;
const lidR=await pool.query('SELECT numero FROM mapa_lids WHERE lid=$1',[tel]);
const numReal=lidR.rows.length?lidR.rows[0].numero:'';
let cr=await pool.query("SELECT * FROM chamados WHERE (remote_jid=$1 OR telefone_cliente=$2) AND status NOT IN ('resolvido','fechado') LIMIT 1",[jid,tel]);
let chamado;
if(!cr.rows.length){
const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const nr=await pool.query('INSERT INTO chamados(org_id,nome_cliente,telefone_cliente,remote_jid,numero_real,tipo_agente,topico,status,prioridade) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[org_id,nm,tel,jid,numReal,'atendimento',tx.substring(0,100),'novo','media']);
chamado=nr.rows[0];console.log('Novo chamado #'+chamado.id+': '+nm);
}else{chamado=cr.rows[0];if(numReal&&!chamado.numero_real)await pool.query('UPDATE chamados SET numero_real=$1 WHERE id=$2',[numReal,chamado.id])}
const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
await pool.query('INSERT INTO mensagens(id_chamado,tipo_origem,texto,hora) VALUES($1,$2,$3,$4)',[chamado.id,'client',tx,hora]);
await pool.query('UPDATE chamados SET atualizado_em=NOW() WHERE id=$1',[chamado.id]);
console.log('Msg de '+nm+': '+tx.substring(0,60));
if(chamado.modo_automatico!==false)setTimeout(()=>respostaAutomatica(chamado.id),2000);
}}catch(e){console.error('Erro webhook:',e.message)}});


// === LISTAR GRUPOS WHATSAPP ===
router.get('/api/whatsapp/grupos',auth,async(req,res)=>{try{
const r=await axios.get(EVO+'/group/fetchAllGroups/'+INST+'?getParticipants=false',{headers:{apikey:KEY}});
const grupos=(r.data||[]).map(function(g){return {id:g.id,nome:g.subject||g.name||'',participantes:g.size||0}});
res.json(grupos)
}catch(e){console.error('Erro grupos:',e.message);res.json([])}});

// STATUS WHATSAPP + MAPA LIDS + SAUDE
router.get('/api/whatsapp/status',async(req,res)=>{try{const r=await axios.get(EVO+'/instance/connectionState/'+INST,{headers:{apikey:KEY}});res.json(r.data)}catch(e){res.json({state:'error'})}});
router.post('/api/mapa-lids',async(req,res)=>{const{lid,numero}=req.body;if(lid&&numero)await pool.query('INSERT INTO mapa_lids(lid,numero) VALUES($1,$2) ON CONFLICT(lid) DO UPDATE SET numero=$2',[lid.replace('@lid',''),numero.replace(/\D/g,'')]);res.json({sucesso:true})});
router.get('/saude',async(req,res)=>{const c=await pool.query('SELECT COUNT(*) FROM chamados');const d=await pool.query('SELECT COUNT(*) FROM despesas');res.json({status:'ok',chamados:parseInt(c.rows[0].count),despesas:parseInt(d.rows[0].count)})});

  // Cron simples: lembrete 24h + expiracao 7 dias
setInterval(async()=>{try{
// Lembrete para pendentes > 24h sem lembrete enviado
const lembrar=await pool.query("SELECT cp.id,cp.token,cp.remetente,cp.id_grupo,e.nome as evento_nome FROM comprovantes_pendentes cp LEFT JOIN eventos e ON e.id=cp.id_evento WHERE cp.status='pendente' AND cp.reminder_sent=FALSE AND cp.criado_em < NOW() - INTERVAL '24 hours' LIMIT 20");
for(const row of lembrar.rows){
const link='https://app.314br.com/comprovante/'+row.token;
await enviarGrupo(row.id_grupo,'\u23F0 Lembrete: comprovante de '+row.remetente+' aguardando ha 24h.\n\u{1F449} '+link);
await pool.query('UPDATE comprovantes_pendentes SET reminder_sent=TRUE WHERE id=$1',[row.id]);
}
// Expira pendentes > 7 dias
await pool.query("UPDATE comprovantes_pendentes SET status='expirado' WHERE status='pendente' AND criado_em < NOW() - INTERVAL '7 days'");
}catch(e){console.error('Erro cron comprovantes:',e.message)}},60*60*1000);

return router;
};
