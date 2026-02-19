const express=require('express'),cors=require('cors'),axios=require('axios'),{Pool}=require('pg'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');
require('dotenv').config();
const app=express();app.use(cors({origin:'*'}));app.use(express.json({limit:'10mb'}));

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const EVO=process.env.EVOLUTION_API_URL||'http://evolution_api:8080';
const KEY=process.env.EVOLUTION_API_KEY;
const INST=process.env.EVOLUTION_INSTANCE||'meuwhats';
const CLAUDE=process.env.ANTHROPIC_API_KEY;
const SECRET=process.env.JWT_SECRET||'secret';
const PORT=process.env.PORT||3000;

// MIDDLEWARE DE AUTENTICACAO
function auth(req,res,next){
const token=req.headers.authorization?.split(' ')[1];
if(!token)return res.status(401).json({erro:'Token necessario'});
try{const d=jwt.verify(token,SECRET);req.user=d;next()}catch(e){res.status(401).json({erro:'Token invalido'})}
}

// REGISTRAR
app.post('/api/auth/registrar',async(req,res)=>{try{
const{nome,email,senha,nome_organizacao}=req.body;
if(!nome||!email||!senha||!nome_organizacao)return res.status(400).json({erro:'Campos obrigatorios: nome, email, senha, nome_organizacao'});
const existe=await pool.query('SELECT id FROM usuarios WHERE email=$1',[email]);
if(existe.rows.length)return res.status(400).json({erro:'Email ja cadastrado'});
const slug=nome_organizacao.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-');
const org=await pool.query('INSERT INTO organizacoes(nome,slug) VALUES($1,$2) RETURNING id',[nome_organizacao,slug]);
const org_id=org.rows[0].id;
const hash=await bcrypt.hash(senha,10);
const usuario=await pool.query('INSERT INTO usuarios(org_id,nome,email,hash_senha,funcao) VALUES($1,$2,$3,$4,$5) RETURNING id,nome,email,funcao',[org_id,nome,email,hash,'admin']);
const token=jwt.sign({id:usuario.rows[0].id,org_id,role:'admin',name:nome},SECRET,{expiresIn:'30d'});
res.json({token,usuario:usuario.rows[0],organizacao:{id:org_id,nome:nome_organizacao}})
}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

// ENTRAR
app.post('/api/auth/entrar',async(req,res)=>{try{
const{email,senha}=req.body;
if(!email||!senha)return res.status(400).json({erro:'Email e senha obrigatorios'});
const r=await pool.query('SELECT u.*,o.nome as nome_org,o.slug,o.plano FROM usuarios u JOIN organizacoes o ON u.org_id=o.id WHERE u.email=$1',[email]);
if(!r.rows.length)return res.status(401).json({erro:'Email ou senha incorretos'});
const usuario=r.rows[0];
const valido=await bcrypt.compare(senha,usuario.hash_senha);
if(!valido)return res.status(401).json({erro:'Email ou senha incorretos'});
const token=jwt.sign({id:usuario.id,org_id:usuario.org_id,role:usuario.funcao,name:usuario.nome},SECRET,{expiresIn:'30d'});
res.json({token,usuario:{id:usuario.id,nome:usuario.nome,email:usuario.email,funcao:usuario.funcao},organizacao:{id:usuario.org_id,nome:usuario.nome_org,plano:usuario.plano}})
}catch(e){res.status(500).json({erro:e.message})}});

// EU (dados do usuario autenticado)
app.get('/api/auth/eu',auth,async(req,res)=>{try{
const r=await pool.query('SELECT u.id,u.nome,u.email,u.funcao,o.nome as nome_org,o.plano FROM usuarios u JOIN organizacoes o ON u.org_id=o.id WHERE u.id=$1',[req.user.id]);
if(!r.rows.length)return res.status(404).json({erro:'Usuario nao encontrado'});
res.json({usuario:r.rows[0],org_id:req.user.org_id})
}catch(e){res.status(500).json({erro:e.message})}});

// === CHAMADOS (com org_id) ===
app.get('/api/chamados',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM chamados WHERE org_id=$1 ORDER BY atualizado_em DESC',[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.get('/api/chamados/:id/mensagens',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM mensagens WHERE id_chamado=$1 ORDER BY criado_em',[req.params.id]);
res.json(r.rows.map(m=>({de:m.tipo_origem,texto:m.texto,hora:m.hora})))}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/chamados/:id/responder',auth,async(req,res)=>{try{
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
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/chamados/:id/numero',auth,async(req,res)=>{try{
const num=req.body.numero.replace(/\D/g,'');const id=parseInt(req.params.id);
await pool.query('UPDATE chamados SET numero_real=$1 WHERE id=$2 AND org_id=$3',[num,id,req.user.org_id]);
const c=await pool.query('SELECT telefone_cliente FROM chamados WHERE id=$1',[id]);
if(c.rows.length)await pool.query('INSERT INTO mapa_lids(lid,numero) VALUES($1,$2) ON CONFLICT(lid) DO UPDATE SET numero=$2',[c.rows[0].telefone_cliente,num]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

app.patch('/api/chamados/:id',auth,async(req,res)=>{try{
const id=parseInt(req.params.id);const{status,tipo_agente,prioridade}=req.body;
if(status)await pool.query('UPDATE chamados SET status=$1,atualizado_em=NOW() WHERE id=$2 AND org_id=$3',[status,id,req.user.org_id]);
if(tipo_agente)await pool.query('UPDATE chamados SET tipo_agente=$1,atualizado_em=NOW() WHERE id=$2 AND org_id=$3',[tipo_agente,id,req.user.org_id]);
if(prioridade)await pool.query('UPDATE chamados SET prioridade=$1,atualizado_em=NOW() WHERE id=$2 AND org_id=$3',[prioridade,id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// ANOTACOES
app.get('/api/chamados/:id/anotacoes',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM anotacoes WHERE id_chamado=$1 ORDER BY criado_em',[req.params.id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/chamados/:id/anotacoes',auth,async(req,res)=>{try{
const hora=new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
await pool.query('INSERT INTO anotacoes(id_chamado,texto,hora) VALUES($1,$2,$3)',[req.params.id,req.body.content,hora]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === EVENTOS + DESPESAS (com org_id) ===
app.get('/api/eventos',auth,async(req,res)=>{try{
const r=await pool.query('SELECT e.*,COALESCE(SUM(d.valor),0) as total,COUNT(d.id) as quantidade FROM eventos e LEFT JOIN despesas d ON d.id_evento=e.id WHERE e.org_id=$1 GROUP BY e.id ORDER BY e.criado_em DESC',[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.get('/api/eventos/:id',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const desp=await pool.query('SELECT centro_custo,SUM(valor) as total,COUNT(*) as quantidade FROM despesas WHERE id_evento=$1 GROUP BY centro_custo',[req.params.id]);
const totalR=await pool.query('SELECT COALESCE(SUM(valor),0) as total FROM despesas WHERE id_evento=$1',[req.params.id]);
const por_centro={};desp.rows.forEach(r=>{por_centro[r.centro_custo]={total:parseFloat(r.total),quantidade:parseInt(r.quantidade)}});
res.json({...ev.rows[0],total:parseFloat(totalR.rows[0].total),por_centro})}catch(e){res.status(500).json({erro:e.message})}});

app.get('/api/eventos/:id/despesas',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/eventos',auth,async(req,res)=>{try{
const{nome,id_grupo,orcamento}=req.body;
const r=await pool.query('INSERT INTO eventos(org_id,nome,id_grupo,orcamento) VALUES($1,$2,$3,$4) RETURNING *',[req.user.org_id,nome,id_grupo||'',orcamento||0]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.get('/api/eventos/:id/exportar',async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1',[req.params.id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const desp=await pool.query('SELECT * FROM despesas WHERE id_evento=$1 ORDER BY criado_em',[req.params.id]);
let csv='ID,Valor,Fornecedor,Data,Descricao,Centro de Custo,Registrado por,Fonte\n';
desp.rows.forEach(x=>{csv+=x.id+','+x.valor+',"'+x.fornecedor+'",'+x.data+',"'+x.descricao+'",'+x.centro_custo+',"'+x.registrado_por+'",'+x.fonte+'\n'});
res.setHeader('Content-Type','text/csv');
res.setHeader('Content-Disposition','attachment; filename='+ev.rows[0].nome.replace(/\s/g,'_')+'_despesas.csv');
res.send(csv)}catch(e){res.status(500).json({erro:e.message})}});

// === IA ===
const SYS_AUTO=`Voce e o assistente virtual do Lavras Rodeo Festival 2026. Seja simpatico, use emojis com moderacao.
EVENTO: Lavras Rodeo Festival 2026 - 15 e 16 de Maio de 2026
LOCAL: Expolavras, Lavras/MG. CLASSIFICACAO: 18 anos
SHOWS: Natanzinho Lima + Matogrosso & Mathias. 2 noites de rodeio profissional.
SETORES: Arena REX (sem open bar), Camarote Smirnoff (open bar), Camarote Premium (open bar + open food).
COMPRA: Ticket360 - cartao e PIX. Instagram: @lavrasrodeo
INGRESSO SOLIDARIO: 1kg alimento = meia-entrada. MEIA-ENTRADA: Estudantes, PCD, Idosos 60+.
Max 3-4 frases. NAO invente info.`;

const SYS_FINANCEIRO=`Analise comprovantes. Extraia JSON: {"valor":0,"fornecedor":"","data":"","descricao":"","centro_custo":""} Centros: Estrutura, Artistico, Seguranca, Alimentacao/Bebidas, Marketing, Impostos/Taxas, Equipe/Staff, Outros. APENAS JSON.`;
const SYS_FINANCEIRO_TEXTO=`Analise texto de despesa. Extraia JSON: {"valor":0,"fornecedor":"","data":"","descricao":"","centro_custo":""} Centros: Estrutura, Artistico, Seguranca, Alimentacao/Bebidas, Marketing, Impostos/Taxas, Equipe/Staff, Outros. APENAS JSON.`;

app.post('/api/ia/sugerir',auth,async(req,res)=>{try{
const{idChamado}=req.body;
const ms=await pool.query('SELECT * FROM mensagens WHERE id_chamado=$1 ORDER BY criado_em',[idChamado]);
const conv=ms.rows.map(m=>m.texto).join('\n');
const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:500,system:SYS_AUTO+'\nGere SUGESTAO.',messages:[{role:'user',content:'Conversa:\n'+conv}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
res.json({sugestao:r.data.content.map(b=>b.text||'').filter(Boolean).join('\n')})}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/ia/perguntar',auth,async(req,res)=>{try{
const{pergunta}=req.body;
const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:500,system:SYS_AUTO+'\nPergunta interna.',messages:[{role:'user',content:pergunta}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
res.json({resposta:r.data.content.map(b=>b.text||'').filter(Boolean).join('\n')})}catch(e){res.status(500).json({erro:e.message})}});

// === WEBHOOK (sem auth - vem da Evolution) ===
async function enviarWA(numero,texto){const n=numero.startsWith('55')?numero:'55'+numero;try{await axios.post(EVO+'/message/sendText/'+INST,{number:n,textMessage:{text:texto}},{headers:{apikey:KEY,'Content-Type':'application/json'}});return true}catch(e){return false}}
async function enviarGrupo(gid,texto){try{await axios.post(EVO+'/message/sendText/'+INST,{number:gid,textMessage:{text:texto}},{headers:{apikey:KEY,'Content-Type':'application/json'}});return true}catch(e){return false}}

async function respostaAutomatica(idChamado){try{
const cr=await pool.query('SELECT * FROM chamados WHERE id=$1',[idChamado]);if(!cr.rows.length)return;
const c=cr.rows[0];
const ms=await pool.query('SELECT * FROM mensagens WHERE id_chamado=$1 ORDER BY criado_em DESC LIMIT 6',[idChamado]);
const conv=ms.rows.reverse().map(m=>(m.tipo_origem==='client'?c.nome_cliente:'Assistente')+': '+m.texto).join('\n');
const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:300,system:SYS_AUTO,messages:[{role:'user',content:'Conversa:\n'+conv+'\n\nResponda. Apenas o texto.'}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
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

async function processarImagem(msg,idEvento,remetente){try{
const isDoc=!!msg.message?.documentMessage;
let dadosImagem=null;
try{const r=await axios.post(EVO+'/chat/getBase64FromMediaMessage/'+INST,{message:msg},{headers:{apikey:KEY,'Content-Type':'application/json'}});dadosImagem=r.data?.base64||r.data}catch(e){}
if(!dadosImagem||typeof dadosImagem!=='string')return;
const limpo=dadosImagem.replace(/^data:[\w\/+-]+;base64,/,'');
const tipoConteudo=isDoc?'document':'image';
const tipoMidia=isDoc?'application/pdf':'image/jpeg';
const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:500,system:SYS_FINANCEIRO,messages:[{role:'user',content:[{type:tipoConteudo,source:{type:'base64',media_type:tipoMidia,data:limpo}},{type:'text',text:'Analise este comprovante.'}]}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
const txt=r.data.content.map(b=>b.text||'').join('');const match=txt.match(/\{[\s\S]*\}/);if(!match)return;
const p=JSON.parse(match[0]);
const ev=await pool.query('SELECT org_id FROM eventos WHERE id=$1',[idEvento]);if(!ev.rows.length)return;
const desp=await pool.query('INSERT INTO despesas(id_evento,org_id,valor,fornecedor,data,descricao,centro_custo,registrado_por,fonte) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[idEvento,ev.rows[0].org_id,parseFloat(p.valor)||0,p.fornecedor||'N/I',p.data||new Date().toLocaleDateString('pt-BR'),p.descricao||'N/I',p.centro_custo||'Outros',remetente,isDoc?'documento':'imagem']);
const x=desp.rows[0];const evtR=await pool.query('SELECT nome,id_grupo FROM eventos WHERE id=$1',[idEvento]);
const emo={Estrutura:'\u{1F3AA}',Artistico:'\u{1F3A4}',Seguranca:'\u{1F6E1}','Alimentacao/Bebidas':'\u{1F354}',Marketing:'\u{1F4E2}','Impostos/Taxas':'\u{1F4CB}','Equipe/Staff':'\u{1F465}',Outros:'\u{1F4E6}'};
await enviarGrupo(evtR.rows[0].id_grupo,'\u2705 *Despesa registrada!*\n\n\u{1F4B0} *R$ '+parseFloat(x.valor).toLocaleString('pt-BR',{minimumFractionDigits:2})+'*\n\u{1F4C2} '+(emo[x.centro_custo]||'\u{1F4E6}')+' '+x.centro_custo+'\n\u{1F3E2} '+x.fornecedor+'\n\u{1F4DD} '+x.descricao+'\n\u{1F4C5} '+x.data+'\n\u{1F464} '+remetente+'\n\n_#'+x.id+' | '+evtR.rows[0].nome+'_');
console.log('DESPESA #'+x.id+': R$'+x.valor+' | '+x.centro_custo);
}catch(e){console.error('Erro imagem:',e.response?.data||e.message)}}

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

app.post('/webhook/evolution',async(req,res)=>{res.sendStatus(200);try{
const d=req.body,ev=d.event;
if(ev==='messages.upsert'){const m=d.data;if(!m||m.key?.fromMe)return;
const jid=m.key?.remoteJid||'';const nm=m.pushName||'';
const isGrupo=jid.includes('@g.us');
if(isGrupo){
const evtR=await pool.query('SELECT * FROM eventos WHERE id_grupo=$1',[jid]);
if(evtR.rows.length){const evento=evtR.rows[0];
const temImagem=m.message?.imageMessage;const temDoc=m.message?.documentMessage;
const tx=m.message?.conversation||m.message?.extendedTextMessage?.text||'';
if(temImagem||temDoc){console.log('Arquivo no grupo '+evento.nome);setTimeout(()=>processarImagem(m,evento.id,nm),1000)}
else if(tx&&tx.length>3&&/r\$|reais|\d+[.,]\d{2}|\d{4,}/i.test(tx)){console.log('Texto financeiro: '+tx.substring(0,60));setTimeout(()=>processarTexto(tx,evento.id,nm),1000)}}
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

// STATUS WHATSAPP + MAPA LIDS + SAUDE
app.get('/api/whatsapp/status',async(req,res)=>{try{const r=await axios.get(EVO+'/instance/connectionState/'+INST,{headers:{apikey:KEY}});res.json(r.data)}catch(e){res.json({state:'error'})}});
app.post('/api/mapa-lids',async(req,res)=>{const{lid,numero}=req.body;if(lid&&numero)await pool.query('INSERT INTO mapa_lids(lid,numero) VALUES($1,$2) ON CONFLICT(lid) DO UPDATE SET numero=$2',[lid.replace('@lid',''),numero.replace(/\D/g,'')]);res.json({sucesso:true})});
app.get('/saude',async(req,res)=>{const c=await pool.query('SELECT COUNT(*) FROM chamados');const d=await pool.query('SELECT COUNT(*) FROM despesas');res.json({status:'ok',chamados:parseInt(c.rows[0].count),despesas:parseInt(d.rows[0].count)})});


app.get('/api/eventos/:id/fornecedores',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM fornecedores WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/eventos/:id/fornecedores',auth,async(req,res)=>{try{
const{nome,categoria,nome_contato,telefone_contato,email_contato,valor,status,notas,data_vencimento}=req.body;
const r=await pool.query('INSERT INTO fornecedores(org_id,id_evento,nome,categoria,nome_contato,telefone_contato,email_contato,valor,status,notas,data_vencimento) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
[req.user.org_id,req.params.id,nome,categoria||'Outros',nome_contato||'',telefone_contato||'',email_contato||'',parseFloat(valor)||0,status||'pendente',notas||'',data_vencimento||'']);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.patch('/api/fornecedores/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['nome','categoria','nome_contato','telefone_contato','email_contato','status','notas','data_vencimento'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
if(b.valor!==undefined){fields.push('valor=$'+idx);vals.push(parseFloat(b.valor));idx++}
if(b.pago!==undefined){fields.push('pago=$'+idx);vals.push(b.pago);idx++}
fields.push('atualizado_em=NOW()');
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE fornecedores SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
if(!r.rows.length)return res.status(404).json({erro:'Fornecedor nao encontrado'});
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.delete('/api/fornecedores/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM fornecedores WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});


// === BRIEFINGS DE MARKETING ===
app.get('/api/eventos/:id/briefings',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM briefings WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/eventos/:id/briefings',auth,async(req,res)=>{try{
const b=req.body;
const r=await pool.query('INSERT INTO briefings(org_id,id_evento,titulo,tipo,descricao,publico_alvo,mensagem_chave,referencias_visuais,dimensoes,status,atribuido_para,data_vencimento) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',
[req.user.org_id,req.params.id,b.titulo,b.tipo||'post',b.descricao||'',b.publico_alvo||'',b.mensagem_chave||'',b.referencias_visuais||'',b.dimensoes||'',b.status||'pendente',b.atribuido_para||'',b.data_vencimento||'']);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.patch('/api/briefings/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['titulo','tipo','descricao','publico_alvo','mensagem_chave','referencias_visuais','dimensoes','status','atribuido_para','data_vencimento','feedback'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
fields.push('atualizado_em=NOW()');
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE briefings SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.delete('/api/briefings/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM briefings WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === CRONOGRAMA DE MARKETING ===
app.get('/api/eventos/:id/cronograma',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM cronograma_marketing WHERE id_evento=$1 AND org_id=$2 ORDER BY data_publicacao,hora_publicacao',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/eventos/:id/cronograma',auth,async(req,res)=>{try{
const b=req.body;
const r=await pool.query('INSERT INTO cronograma_marketing(org_id,id_evento,titulo,plataforma,data_publicacao,hora_publicacao,conteudo,hashtags,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
[req.user.org_id,req.params.id,b.titulo,b.plataforma||'',b.data_publicacao||'',b.hora_publicacao||'',b.conteudo||'',b.hashtags||'',b.status||'pendente']);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.patch('/api/cronograma/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['titulo','plataforma','data_publicacao','hora_publicacao','conteudo','hashtags','status'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE cronograma_marketing SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.delete('/api/cronograma/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM cronograma_marketing WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === MATERIAIS DE MARKETING ===
app.get('/api/eventos/:id/materiais',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM materiais_marketing WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/eventos/:id/materiais',auth,async(req,res)=>{try{
const b=req.body;
const r=await pool.query('INSERT INTO materiais_marketing(org_id,id_evento,nome,categoria,status,atribuido_para,data_vencimento,notas) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
[req.user.org_id,req.params.id,b.nome,b.categoria||'',b.status||'pendente',b.atribuido_para||'',b.data_vencimento||'',b.notas||'']);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.patch('/api/materiais/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['nome','categoria','status','atribuido_para','data_vencimento','notas'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
if(b.concluido!==undefined){fields.push('concluido=$'+idx);vals.push(b.concluido);idx++}
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE materiais_marketing SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.delete('/api/materiais/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM materiais_marketing WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});


// === GESTAO DE EQUIPE ===
app.get('/api/equipe',auth,async(req,res)=>{try{
if(req.user.role!=='admin')return res.status(403).json({erro:'Sem permissao'});
const r=await pool.query('SELECT id,nome,email,funcao,criado_em FROM usuarios WHERE org_id=$1 ORDER BY criado_em',[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

app.post('/api/equipe/convidar',auth,async(req,res)=>{try{
if(req.user.role!=='admin')return res.status(403).json({erro:'Sem permissao'});
const{nome,email,senha,funcao}=req.body;
if(!nome||!email||!senha)return res.status(400).json({erro:'Nome, email e senha obrigatorios'});
const existe=await pool.query('SELECT id FROM usuarios WHERE email=$1',[email]);
if(existe.rows.length)return res.status(400).json({erro:'Email ja cadastrado'});
const funcoesValidas=['admin','agent','designer','viewer'];
const funcaoUsuario=funcoesValidas.includes(funcao)?funcao:'agent';
const hash=await bcrypt.hash(senha,10);
const r=await pool.query('INSERT INTO usuarios(org_id,nome,email,hash_senha,funcao) VALUES($1,$2,$3,$4,$5) RETURNING id,nome,email,funcao',[req.user.org_id,nome,email,hash,funcaoUsuario]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.delete('/api/equipe/:id',auth,async(req,res)=>{try{
if(req.user.role!=='admin')return res.status(403).json({erro:'Sem permissao'});
if(parseInt(req.params.id)===req.user.id)return res.status(400).json({erro:'Nao pode remover a si mesmo'});
await pool.query('DELETE FROM usuarios WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

app.patch('/api/equipe/:id',auth,async(req,res)=>{try{
if(req.user.role!=='admin')return res.status(403).json({erro:'Sem permissao'});
const{funcao}=req.body;
const funcoesValidas=['admin','agent','designer','viewer'];
if(!funcoesValidas.includes(funcao))return res.status(400).json({erro:'Funcao invalida'});
const r=await pool.query('UPDATE usuarios SET funcao=$1 WHERE id=$2 AND org_id=$3 RETURNING id,nome,email,funcao',[funcao,req.params.id,req.user.org_id]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

app.listen(PORT,()=>console.log('EventHub SaaS [PostgreSQL + JWT] porta '+PORT));
