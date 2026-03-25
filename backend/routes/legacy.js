const express = require("express");
module.exports = function({ pool, axios, bcrypt, auth, upload, multer, path, CLAUDE, EVO, KEY, INST }) {
  const router = express.Router();

router.post('/api/auth/login',async(req,res)=>{try{
const{email,password}=req.body;
if(!email||!password)return res.status(400).json({error:'Email e senha obrigatorios'});
const r=await pool.query('SELECT u.*,o.nome as nome_org,o.slug,o.plano FROM usuarios u JOIN organizacoes o ON u.org_id=o.id WHERE u.email=$1',[email]);
if(!r.rows.length)return res.status(401).json({error:'Email ou senha incorretos'});
const usuario=r.rows[0];
const ok=await bcrypt.compare(password,usuario.hash_senha);
if(!ok)return res.status(401).json({error:'Email ou senha incorretos'});
const token=jwt.sign({id:usuario.id,org_id:usuario.org_id,role:usuario.funcao,funcao:usuario.funcao,name:usuario.nome,nome:usuario.nome},SECRET,{expiresIn:'30d'});
res.json({token,usuario:{id:usuario.id,nome:usuario.nome,email:usuario.email,funcao:usuario.funcao},organizacao:{id:usuario.org_id,nome:usuario.nome_org,plano:usuario.plano}})}catch(e){res.status(500).json({error:e.message})}});
router.post('/api/auth/register',async(req,res)=>{try{
const{name,email,password,org_name}=req.body;
if(!name||!email||!password||!org_name)return res.status(400).json({error:'Campos obrigatorios'});
const exists=await pool.query('SELECT id FROM usuarios WHERE email=$1',[email]);
if(exists.rows.length)return res.status(400).json({error:'Email ja cadastrado'});
const slug=org_name.toLowerCase().replace(/[^a-z0-9]/g,'-');
const org=await pool.query('INSERT INTO organizacoes(nome,slug) VALUES($1,$2) RETURNING *',[org_name,slug]);
const hash=await bcrypt.hash(password,10);
const u=await pool.query('INSERT INTO usuarios(org_id,nome,email,hash_senha,funcao) VALUES($1,$2,$3,$4,$5) RETURNING *',[org.rows[0].id,name,email,hash,'admin']);
const token=jwt.sign({id:u.rows[0].id,org_id:org.rows[0].id,role:'admin',name:name},SECRET,{expiresIn:'30d'});
res.json({token,usuario:{id:u.rows[0].id,nome:name,email:email,funcao:'admin'},organizacao:{id:org.rows[0].id,nome:org_name,plano:'basic'}})}catch(e){res.status(500).json({error:e.message})}});
router.get('/api/auth/me',auth,async(req,res)=>{try{
const r=await pool.query('SELECT u.*,o.nome as nome_org,o.plano FROM usuarios u JOIN organizacoes o ON u.org_id=o.id WHERE u.id=$1',[req.user.id]);
if(!r.rows.length)return res.status(404).json({error:'X'});
const u=r.rows[0];
res.json({usuario:{id:u.id,nome:u.nome,email:u.email,funcao:u.funcao,foto_url:u.foto_url||null},organizacao:{id:u.org_id,nome:u.nome_org,plano:u.plano}})}catch(e){res.status(500).json({error:e.message})}});
router.get('/api/tickets',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM tickets WHERE org_id=$1 ORDER BY created_at DESC',[req.user.org_id]);
res.json(r.rows)}catch(e){res.json([])}});
router.get('/api/tickets/:id/messages',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM messages WHERE ticket_id=$1 ORDER BY created_at',[req.params.id]);
res.json(r.rows)}catch(e){res.json([])}});
router.post('/api/tickets/:id/reply',auth,async(req,res)=>{try{
const t=await pool.query('SELECT * FROM tickets WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!t.rows.length)return res.status(404).json({error:'X'});
const tk=t.rows[0];const txt=req.body.text;
const jid=tk.real_number?tk.real_number+'@s.whatsapp.net':tk.remote_jid;
await axios.post(EVO+'/message/sendText/'+INST,{number:jid.replace('@s.whatsapp.net','').replace('@lid',''),text:txt},{headers:{apikey:KEY}});
await pool.query('INSERT INTO messages(ticket_id,from_type,text,time) VALUES($1,$2,$3,$4)',[req.params.id,'agent',txt,new Date().toLocaleTimeString('pt-BR')]);
await pool.query('UPDATE tickets SET status=$1 WHERE id=$2',['respondido',req.params.id]);
res.json({success:true})}catch(e){res.status(500).json({error:e.message})}});
router.post('/api/tickets/:id/number',auth,async(req,res)=>{try{
const num=req.body.number.replace(/\D/g,'');
await pool.query('UPDATE tickets SET real_number=$1 WHERE id=$2 AND org_id=$3',[num,req.params.id,req.user.org_id]);
const t=await pool.query('SELECT * FROM tickets WHERE id=$1',[req.params.id]);
if(t.rows[0]){const lid=t.rows[0].client_phone;if(lid)await pool.query('INSERT INTO lid_map(lid,number) VALUES($1,$2) ON CONFLICT(lid) DO UPDATE SET number=$2',[lid.replace('@lid',''),num])}
res.json({success:true})}catch(e){res.status(500).json({error:e.message})}});
router.patch('/api/tickets/:id',auth,async(req,res)=>{try{
const{status,priority}=req.body;const f=[];const v=[];let i=1;
if(status){f.push('status=$'+i);v.push(status);i++}
if(priority){f.push('priority=$'+i);v.push(priority);i++}
v.push(req.params.id);v.push(req.user.org_id);
const r=await pool.query('UPDATE tickets SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.get('/api/tickets/:id/notes',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM notes WHERE ticket_id=$1 ORDER BY created_at',[req.params.id]);
res.json(r.rows)}catch(e){res.json([])}});
router.post('/api/tickets/:id/notes',auth,async(req,res)=>{try{
const r=await pool.query('INSERT INTO notes(ticket_id,text,time) VALUES($1,$2,$3) RETURNING *',[req.params.id,req.body.text,new Date().toLocaleTimeString('pt-BR')]);
res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.get('/api/events',auth,async(req,res)=>{try{
const r=await pool.query('SELECT e.*,COALESCE(SUM(x.valor),0) as total,COUNT(x.id) as count FROM events e LEFT JOIN expenses x ON e.id=x.event_id WHERE e.org_id=$1 GROUP BY e.id ORDER BY e.created_at DESC',[req.user.org_id]);
res.json(r.rows)}catch(e){res.json([])}});
router.get('/api/events/:id',auth,async(req,res)=>{try{
const e=await pool.query('SELECT * FROM events WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!e.rows.length)return res.status(404).json({error:'X'});
const x=await pool.query('SELECT centro_custo,COUNT(*) as count,COALESCE(SUM(valor),0) as total FROM expenses WHERE event_id=$1 AND org_id=$2 GROUP BY centro_custo',[req.params.id,req.user.org_id]);
const tot=await pool.query('SELECT COALESCE(SUM(valor),0) as total,COUNT(*) as count FROM expenses WHERE event_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
var ev=e.rows[0];ev.total=tot.rows[0].total;ev.count=tot.rows[0].count;ev.by_center={};
x.rows.forEach(function(r){ev.by_center[r.centro_custo]={total:parseFloat(r.total),count:parseInt(r.count)}});
res.json(ev)}catch(e){res.status(500).json({error:e.message})}});
router.get('/api/events/:id/expenses',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM expenses WHERE event_id=$1 AND org_id=$2 ORDER BY created_at DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.json([])}});
router.post('/api/events',auth,async(req,res)=>{try{
const{name,group_id}=req.body;
const r=await pool.query('INSERT INTO events(org_id,name,group_id) VALUES($1,$2,$3) RETURNING *',[req.user.org_id,name,group_id||'']);
res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.get('/api/events/:id/export',async(req,res)=>{try{
const x=await pool.query('SELECT * FROM expenses WHERE event_id=$1 ORDER BY created_at',[req.params.id]);
var csv='Valor,Fornecedor,Data,Descricao,Centro de Custo,Registrado por\n';
x.rows.forEach(function(r){csv+=r.valor+','+r.fornecedor+','+r.data+',"'+r.descricao+'",'+r.centro_custo+','+r.registrado_por+'\n'});
res.setHeader('Content-Type','text/csv');res.setHeader('Content-Disposition','attachment;filename=despesas.csv');res.send(csv)}catch(e){res.status(500).send('erro')}});
router.post('/api/ai/suggest',auth,async(req,res)=>{try{
const{ticketId,agentType}=req.body;
const msgs=await pool.query('SELECT * FROM messages WHERE ticket_id=$1 ORDER BY created_at DESC LIMIT 5',[ticketId]);
const ctx=msgs.rows.map(function(m){return m.from_type+': '+m.text}).join('\n');
const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':CLAUDE,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,messages:[{role:'user',content:'Sugira uma resposta profissional para este atendimento de evento. Contexto:\n'+ctx+'\nResponda diretamente, sem explicacoes.'}]})});
const data=await r.json();res.json({suggestion:data.content[0].text})}catch(e){res.status(500).json({error:e.message})}});
router.post('/api/ai/ask',auth,async(req,res)=>{try{
const{question}=req.body;
const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':CLAUDE,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:500,messages:[{role:'user',content:question}]})});
const data=await r.json();res.json({answer:data.content[0].text})}catch(e){res.status(500).json({error:e.message})}});
router.get('/api/whatsapp/status',async(req,res)=>{try{const r=await axios.get(EVO+'/instance/connectionState/'+INST,{headers:{apikey:KEY}});res.json(r.data)}catch(e){res.json({state:'error'})}});
router.post('/api/lid-map',async(req,res)=>{const{lid,number}=req.body;if(lid&&number)await pool.query('INSERT INTO lid_map(lid,number) VALUES($1,$2) ON CONFLICT(lid) DO UPDATE SET number=$2',[lid.replace('@lid',''),number.replace(/\D/g,'')]);res.json({success:true})});
router.get('/health',async(req,res)=>{res.json({status:'ok'})});

// === SUPPLIERS ===
router.get('/api/events/:id/suppliers',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM suppliers WHERE event_id=$1 AND org_id=$2 ORDER BY created_at DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({error:e.message})}});
router.post('/api/events/:id/suppliers',auth,async(req,res)=>{try{
const b=req.body;
const r=await pool.query('INSERT INTO suppliers(org_id,event_id,name,category,contact_name,contact_phone,contact_email,valor,status,notes,due_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
[req.user.org_id,req.params.id,b.name,b.category||'Outros',b.contact_name||'',b.contact_phone||'',b.contact_email||'',parseFloat(b.valor)||0,b.status||'pendente',b.notes||'',b.due_date||'']);
res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.patch('/api/suppliers/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['name','category','contact_name','contact_phone','contact_email','status','notes','due_date'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
if(b.valor!==undefined){fields.push('valor=$'+idx);vals.push(parseFloat(b.valor));idx++}
if(b.paid!==undefined){fields.push('paid=$'+idx);vals.push(b.paid);idx++}
fields.push('updated_at=NOW()');
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE suppliers SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.delete('/api/suppliers/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM suppliers WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({success:true})}catch(e){res.status(500).json({error:e.message})}});

// === MARKETING ===
router.get('/api/events/:id/briefings',auth,async(req,res)=>{try{const r=await pool.query('SELECT * FROM briefings WHERE event_id=$1 AND org_id=$2 ORDER BY created_at DESC',[req.params.id,req.user.org_id]);res.json(r.rows)}catch(e){res.json([])}});
router.post('/api/events/:id/briefings',auth,async(req,res)=>{try{const b=req.body;const r=await pool.query('INSERT INTO briefings(org_id,event_id,title,type,description,target_audience,key_message,visual_references,dimensions,status,assigned_to,due_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',[req.user.org_id,req.params.id,b.title,b.type||'post',b.description||'',b.target_audience||'',b.key_message||'',b.visual_references||'',b.dimensions||'',b.status||'pendente',b.assigned_to||'',b.due_date||'']);res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
// endpoints duplicados em ingles removidos
router.get('/api/events/:id/timeline',auth,async(req,res)=>{try{const r=await pool.query('SELECT * FROM marketing_timeline WHERE event_id=$1 AND org_id=$2 ORDER BY post_date,post_time',[req.params.id,req.user.org_id]);res.json(r.rows)}catch(e){res.json([])}});
router.post('/api/events/:id/timeline',auth,async(req,res)=>{try{const b=req.body;const r=await pool.query('INSERT INTO marketing_timeline(org_id,event_id,title,platform,post_date,post_time,content,hashtags,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[req.user.org_id,req.params.id,b.title,b.platform||'',b.post_date||'',b.post_time||'',b.content||'',b.hashtags||'',b.status||'pendente']);res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.patch('/api/timeline/:id',auth,async(req,res)=>{try{const b=req.body;const f=[];const v=[];let i=1;['title','platform','post_date','post_time','content','hashtags','status'].forEach(function(k){if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});v.push(parseInt(req.params.id));v.push(req.user.org_id);const r=await pool.query('UPDATE marketing_timeline SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.delete('/api/timeline/:id',auth,async(req,res)=>{try{await pool.query('DELETE FROM marketing_timeline WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);res.json({success:true})}catch(e){res.status(500).json({error:e.message})}});
router.get('/api/events/:id/materials',auth,async(req,res)=>{try{const r=await pool.query('SELECT * FROM marketing_materials WHERE event_id=$1 AND org_id=$2 ORDER BY created_at DESC',[req.params.id,req.user.org_id]);res.json(r.rows)}catch(e){res.json([])}});
router.post('/api/events/:id/materials',auth,async(req,res)=>{try{const b=req.body;const r=await pool.query('INSERT INTO marketing_materials(org_id,event_id,name,category,status,assigned_to,due_date,notes) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[req.user.org_id,req.params.id,b.name,b.category||'',b.status||'pendente',b.assigned_to||'',b.due_date||'',b.notes||'']);res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.patch('/api/materials/:id',auth,async(req,res)=>{try{const b=req.body;const f=[];const v=[];let i=1;['name','category','status','assigned_to','due_date','notes'].forEach(function(k){if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});if(b.done!==undefined){f.push('done=$'+i);v.push(b.done);i++}v.push(parseInt(req.params.id));v.push(req.user.org_id);const r=await pool.query('UPDATE marketing_materials SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});
router.delete('/api/materials/:id',auth,async(req,res)=>{try{await pool.query('DELETE FROM marketing_materials WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);res.json({success:true})}catch(e){res.status(500).json({error:e.message})}});

// === TEAM ===
router.get('/api/team',auth,async(req,res)=>{try{if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({error:'Sem permissao'});const r=await pool.query('SELECT id,name,email,role,created_at FROM users WHERE org_id=$1 ORDER BY created_at',[req.user.org_id]);res.json(r.rows)}catch(e){res.status(500).json({error:e.message})}});
router.post('/api/team/invite',auth,async(req,res)=>{try{if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({error:'Sem permissao'});const{name,email,password,role}=req.body;if(!name||!email||!password)return res.status(400).json({error:'Campos obrigatorios'});const exists=await pool.query('SELECT id FROM users WHERE email=$1',[email]);if(exists.rows.length)return res.status(400).json({error:'Email ja cadastrado'});const hash=await bcrypt.hash(password,10);const r=await pool.query('INSERT INTO users(org_id,name,email,password_hash,role) VALUES($1,$2,$3,$4,$5) RETURNING id,name,email,role',[req.user.org_id,name,email,hash,role||'agent']);res.json(r.rows[0])}catch(e){res.status(500).json({error:e.message})}});

// === AI FEATURES ===
router.post('/api/events/:id/ai/briefing',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM events WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({error:'X'});
const evento=ev.rows[0];const{type}=req.body;
const dims={post:'1080x1080',stories:'1080x1920',reels:'1080x1920',banner:'1920x1080',flyer:'1080x1520',video:'1920x1080'};
const prompt='Voce e um especialista em marketing de eventos. Gere um briefing criativo para um '+(type||'post')+' de divulgacao do evento "'+evento.name+'". Responda APENAS em JSON valido sem markdown, com: title, description, target_audience, key_message, visual_references.';
const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':CLAUDE,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
const data=await r.json();const txt=data.content[0].text.replace(/```json|```/g,'').trim();
const briefing=JSON.parse(txt);briefing.type=type||'post';briefing.dimensions=dims[type]||'1080x1080';briefing.status='pendente';
res.json(briefing)}catch(e){res.status(500).json({error:e.message})}});

router.get('/api/events/:id/ai/alerts',auth,async(req,res)=>{try{
const sups=await pool.query('SELECT * FROM suppliers WHERE event_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const alerts=[];const hoje=new Date();const cats=sups.rows.map(function(s){return s.category});
sups.rows.forEach(function(s){
if(s.due_date){var d=new Date(s.due_date);if(d<hoje&&s.status!=='confirmado'&&s.status!=='cancelado')alerts.push({type:'vencido',severity:'alta',icon:'\u{1F534}',msg:'Fornecedor "'+s.name+'" prazo vencido'})}
if(!s.paid&&s.valor>0&&s.status==='confirmado')alerts.push({type:'pagamento',severity:'alta',icon:'\u{1F4B0}',msg:'"'+s.name+'" confirmado mas NAO PAGO'});
if(s.status==='pendente')alerts.push({type:'pendente',severity:'media',icon:'\u{1F7E1}',msg:'"'+s.name+'" ainda pendente'})});
['Seguranca','Estrutura','Alimentacao/Bebidas'].forEach(function(c){if(cats.indexOf(c)===-1)alerts.push({type:'faltando',severity:'alta',icon:'\u26A0\uFE0F',msg:'"'+c+'" sem fornecedor'})});
res.json({alerts:alerts,summary:{total:alerts.length}})}catch(e){res.status(500).json({error:e.message})}});

router.get('/api/events/:id/ai/report',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM events WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({error:'X'});
const exps=await pool.query('SELECT * FROM expenses WHERE event_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const sups=await pool.query('SELECT * FROM suppliers WHERE event_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
var byCenter={};var totalExp=0;
exps.rows.forEach(function(e){var c=e.centro_custo||'Outros';if(!byCenter[c])byCenter[c]={total:0,count:0};byCenter[c].total+=parseFloat(e.valor||0);byCenter[c].count++;totalExp+=parseFloat(e.valor||0)});
var totalSup=sups.rows.reduce(function(a,s){return a+parseFloat(s.valor||0)},0);
var prompt='Analise dados do evento "'+ev.rows[0].name+'". Despesas=R$'+totalExp.toFixed(2)+', Fornecedores=R$'+totalSup.toFixed(2)+'. Categorias: '+JSON.stringify(byCenter)+'. Gere resumo executivo em portugues. Max 300 palavras.';
const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':CLAUDE,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
const data=await r.json();
res.json({event:ev.rows[0].name,summary:data.content[0].text,by_center:byCenter})}catch(e){res.status(500).json({error:e.message})}});

router.post('/api/suppliers/:id/ai/contract',auth,async(req,res)=>{try{
const sup=await pool.query('SELECT s.*,e.name as event_name,o.name as org_name FROM suppliers s JOIN events e ON s.event_id=e.id JOIN organizations o ON s.org_id=o.id WHERE s.id=$1 AND s.org_id=$2',[req.params.id,req.user.org_id]);
if(!sup.rows.length)return res.status(404).json({error:'X'});
const s=sup.rows[0];
var prompt='Gere contrato de prestacao de servicos. CONTRATANTE: '+s.org_name+'. CONTRATADO: '+s.name+' ('+s.category+'). EVENTO: '+s.event_name+'. VALOR: R$'+parseFloat(s.valor).toFixed(2)+'. SERVICO: '+(s.notes||s.category)+'. Clausulas numeradas. Max 500 palavras.';
const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':CLAUDE,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,messages:[{role:'user',content:prompt}]})});
const data=await r.json();
res.json({contract:data.content[0].text,supplier:s.name,event:s.event_name})}catch(e){res.status(500).json({error:e.message})}});


// === UPLOAD CONFIG ===
router.use('/uploads',express.static('/app/uploads'));
router.use('/api/uploads',express.static('/app/uploads'));

// === ARQUIVOS/CRIATIVOS ===
router.get('/api/briefings/:id/arquivos',auth,async(req,res)=>{try{
const r=await pool.query('SELECT a.*,u.nome as enviado_nome FROM arquivos a LEFT JOIN usuarios u ON a.enviado_por=u.id WHERE a.briefing_id=$1 AND a.org_id=$2 ORDER BY a.criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/briefings/:id/arquivos',auth,function(req,res,next){upload.single('arquivo')(req,res,function(err){if(err)return res.status(400).json({erro:err.message});next()})},async(req,res)=>{try{
if(!req.file)return res.status(400).json({erro:'Arquivo obrigatorio'});
const b=await pool.query('SELECT * FROM briefings WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!b.rows.length)return res.status(404).json({erro:'Briefing nao encontrado'});
const url='/uploads/'+req.file.filename;
const isRef=req.body.is_referencia==='true'||req.body.is_referencia===true;
const r=await pool.query('INSERT INTO arquivos(org_id,briefing_id,evento_id,nome_original,nome_arquivo,tipo,tamanho,url,enviado_por,is_referencia) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
[req.user.org_id,req.params.id,b.rows[0].id_evento,req.file.originalname,req.file.filename,req.file.mimetype,req.file.size,url,req.user.id,isRef]);
await pool.query('UPDATE briefings SET arquivos_count=COALESCE(arquivos_count,0)+1 WHERE id=$1',[req.params.id]);
// Vincular ao cronograma do briefing
const bref=await pool.query('SELECT cronograma_id FROM briefings WHERE id=$1',[req.params.id]);
if(bref.rows.length&&bref.rows[0].cronograma_id){
await pool.query('UPDATE arquivos SET cronograma_id=$1 WHERE id=$2',[bref.rows[0].cronograma_id,r.rows[0].id]).catch(()=>{});
}
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/arquivos/:id',auth,async(req,res)=>{try{
const a=await pool.query('SELECT * FROM arquivos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!a.rows.length)return res.status(404).json({erro:'X'});
try{require('fs').unlinkSync('/app/uploads/'+a.rows[0].nome_arquivo)}catch(e){}
await pool.query('DELETE FROM arquivos WHERE id=$1',[req.params.id]);
if(a.rows[0].briefing_id)await pool.query('UPDATE briefings SET arquivos_count=GREATEST(COALESCE(arquivos_count,1)-1,0) WHERE id=$1',[a.rows[0].briefing_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === ARQUIVOS CRONOGRAMA ===
router.get('/api/eventos/:id/cronograma-arquivos',auth,async(req,res)=>{try{
const r=await pool.query('SELECT a.*,u.nome as enviado_nome FROM arquivos a LEFT JOIN usuarios u ON a.enviado_por=u.id WHERE a.cronograma_id IS NOT NULL AND a.org_id=$1 AND a.cronograma_id IN (SELECT id FROM cronograma_marketing WHERE id_evento=$2 AND org_id=$1) ORDER BY a.criado_em DESC',[req.user.org_id,req.params.id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/cronograma/:id/arquivos',auth,async(req,res)=>{try{
const r=await pool.query('SELECT a.*,u.nome as enviado_nome FROM arquivos a LEFT JOIN usuarios u ON a.enviado_por=u.id WHERE a.cronograma_id=$1 AND a.org_id=$2 ORDER BY a.criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/cronograma/:id/arquivos',auth,function(req,res,next){upload.single('arquivo')(req,res,function(err){if(err)return res.status(400).json({erro:err.message});next()})},async(req,res)=>{try{
if(!req.file)return res.status(400).json({erro:'Arquivo obrigatorio'});
const c=await pool.query('SELECT * FROM cronograma_marketing WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!c.rows.length)return res.status(404).json({erro:'Post nao encontrado'});
const url='/uploads/'+req.file.filename;
const isRef=req.body.is_referencia==='true'||req.body.is_referencia===true;
const r=await pool.query('INSERT INTO arquivos(org_id,cronograma_id,evento_id,nome_original,nome_arquivo,tipo,tamanho,url,enviado_por,is_referencia) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
[req.user.org_id,req.params.id,c.rows[0].id_evento,req.file.originalname,req.file.filename,req.file.mimetype,req.file.size,url,req.user.id,isRef]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/briefings/:id/aprovar',auth,async(req,res)=>{try{
const{aprovado,feedback}=req.body;
const f=[];const v=[];let i=1;
if(aprovado!==undefined){f.push('aprovado=$'+i);v.push(aprovado);i++}
if(feedback!==undefined){f.push('feedback=$'+i);v.push(feedback);i++}
f.push('status=$'+i);v.push(aprovado?'aprovado':'em_revisao');i++;
v.push(parseInt(req.params.id));v.push(req.user.org_id);
const r=await pool.query('UPDATE briefings SET '+f.join(',')+' WHERE id=$'+i+' AND org_id=$'+(i+1)+' RETURNING *',v);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

// === DESIGNER VIEW ===
router.get('/api/designer/briefings',auth,async(req,res)=>{try{
const r=await pool.query("SELECT b.*,e.nome as evento_nome FROM briefings b JOIN eventos e ON b.id_evento=e.id WHERE b.org_id=$1 AND b.status IN ('pendente','em_andamento','em_revisao') ORDER BY CASE WHEN b.status='em_andamento' THEN 1 WHEN b.status='pendente' THEN 2 ELSE 3 END, b.criado_em DESC",[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/designer/todos',auth,async(req,res)=>{try{
const r=await pool.query("SELECT b.*,e.nome as evento_nome FROM briefings b JOIN eventos e ON b.id_evento=e.id WHERE b.org_id=$1 ORDER BY b.criado_em DESC",[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

// === CAMPANHAS IA ===
router.get('/api/eventos/:id/campanhas',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM campanhas WHERE evento_id=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/ia/campanha',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const evento=ev.rows[0];
const org=await pool.query('SELECT nome FROM organizacoes WHERE id=$1',[req.user.org_id]);
const briefs=await pool.query("SELECT titulo,tipo,status,aprovado,arquivos_count FROM briefings WHERE id_evento=$1 AND org_id=$2 AND aprovado=true",[req.params.id,req.user.org_id]);
const{objetivo,orcamento,duracao,plataforma,direcionamento}=req.body;

var prompt='Voce e um gestor de trafego SENIOR especialista em anuncios para eventos no Brasil. Crie um plano de campanha completo e profissional.\n\n';
prompt+='=== EVENTO ===\n';
prompt+='Nome: '+evento.nome+'\n';
if(evento.tipo_evento)prompt+='Tipo: '+evento.tipo_evento+'\n';
if(evento.data_evento)prompt+='Data: '+evento.data_evento+'\n';
if(evento.local_evento)prompt+='Local: '+evento.local_evento+(evento.cidade?', '+evento.cidade:'')+'\n';
if(evento.atracoes)prompt+='Atracoes: '+evento.atracoes+'\n';
if(evento.publico_alvo)prompt+='Publico: '+evento.publico_alvo+'\n';
if(evento.capacidade)prompt+='Capacidade: '+evento.capacidade+'\n';
if(evento.info_lotes)prompt+='Ingressos: '+evento.info_lotes+'\n';
if(evento.promo_abertura)prompt+='Promo: '+evento.promo_abertura+'\n';
if(evento.descricao)prompt+='Descricao: '+evento.descricao+'\n';
prompt+='Produtora: '+(org.rows.length?org.rows[0].nome:'')+'\n';
if(briefs.rows.length)prompt+='Criativos aprovados: '+briefs.rows.map(function(b){return b.titulo+' ('+b.tipo+', '+b.arquivos_count+' arquivos)'}).join(', ')+'\n';
prompt+='\n=== PARAMETROS DA CAMPANHA ===\n';
prompt+='Objetivo: '+(objetivo||'engajamento')+'\n';
prompt+='Plataforma: '+(plataforma||'Instagram + Facebook')+'\n';
prompt+='Orcamento total: R$ '+(orcamento||'500')+'\n';
prompt+='Duracao: '+(duracao||'7')+' dias\n';
if(direcionamento)prompt+='Direcionamento do produtor: '+direcionamento+'\n';
prompt+='\n=== GERE O PLANO ===\n';
prompt+='Responda APENAS em JSON valido (sem markdown, sem ```), com EXATAMENTE estes campos:\n';
prompt+='{\n';
prompt+='  "nome": "nome da campanha",\n';
prompt+='  "objetivo": "objetivo principal",\n';
prompt+='  "plataforma": "plataformas",\n';
prompt+='  "publico_alvo": "descricao detalhada do publico (idade, genero, interesses, localizacao, comportamento)",\n';
prompt+='  "segmentacao": {"idade_min": 18, "idade_max": 35, "genero": "todos", "interesses": ["lista","de","interesses"], "localizacao": "cidade/raio", "comportamento": "descricao"},\n';
prompt+='  "orcamento_diario": 0.00,\n';
prompt+='  "orcamento_total": 0.00,\n';
prompt+='  "duracao_dias": 7,\n';
prompt+='  "data_inicio": "YYYY-MM-DD",\n';
prompt+='  "data_fim": "YYYY-MM-DD",\n';
prompt+='  "copy_principal": "texto principal do anuncio (max 125 chars)",\n';
prompt+='  "copy_secundaria": "texto secundario/descricao do anuncio",\n';
prompt+='  "headline": "titulo do anuncio (max 40 chars)",\n';
prompt+='  "cta": "botao CTA (ex: Comprar agora, Saiba mais, Garantir ingresso)",\n';
prompt+='  "posicionamentos": "feed, stories, reels, explore",\n';
prompt+='  "horarios_sugeridos": "horarios de melhor performance",\n';
prompt+='  "cronograma": [{"dia": 1, "acao": "descricao", "orcamento_dia": 0}, ...],\n';
prompt+='  "observacoes_ia": "dicas estrategicas e insights para otimizacao"\n';
prompt+='}';

const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:3000,messages:[{role:'user',content:prompt}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
const txt=r.data.content.map(function(b){return b.text||''}).join('').replace(/```json|```/g,'').trim();
const campanha=JSON.parse(txt);
const ins=await pool.query('INSERT INTO campanhas(org_id,evento_id,nome,objetivo,plataforma,publico_alvo,orcamento_diario,orcamento_total,duracao_dias,data_inicio,data_fim,copy_principal,copy_secundaria,headline,cta,segmentacao,posicionamentos,horarios_sugeridos,observacoes_ia) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *',
[req.user.org_id,req.params.id,campanha.nome,campanha.objetivo,campanha.plataforma,campanha.publico_alvo,parseFloat(campanha.orcamento_diario)||0,parseFloat(campanha.orcamento_total)||0,parseInt(campanha.duracao_dias)||7,campanha.data_inicio||'',campanha.data_fim||'',campanha.copy_principal||'',campanha.copy_secundaria||'',campanha.headline||'',campanha.cta||'',JSON.stringify(campanha.segmentacao||{}),campanha.posicionamentos||'',campanha.horarios_sugeridos||'',campanha.observacoes_ia||'']);
campanha.id=ins.rows[0].id;
res.json(campanha)}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

router.delete('/api/campanhas/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM campanhas WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === ANALISE SEMANAL IA ===
router.get('/api/eventos/:id/analises',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM analises_marketing WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC LIMIT 20',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/analises/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM analises_marketing WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/ia/analise-semanal',auth,async(req,res)=>{try{
  const eid=req.params.id,oid=req.user.org_id;
  const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[eid,oid]);
  if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
  const evento=ev.rows[0];
  const org=await pool.query('SELECT nome FROM organizacoes WHERE id=$1',[oid]);

  // Vendas por dia (todas)
  const vendasDia=await pool.query(`
    SELECT DATE(data_venda) as dia, COUNT(*) as pedidos, SUM(valor) as total, SUM(quantidade_ingressos) as ingressos
    FROM baladapp_vendas WHERE id_evento=$1 AND org_id=$2 AND LOWER(status)='aprovado'
    GROUP BY DATE(data_venda) ORDER BY dia
  `,[eid,oid]);

  // Cronograma de marketing (ações realizadas)
  const cronograma=await pool.query('SELECT * FROM cronograma_marketing WHERE id_evento=$1 AND org_id=$2 ORDER BY data_publicacao',[eid,oid]);

  // Briefings
  const briefs=await pool.query('SELECT titulo,tipo,status,criado_em FROM briefings WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[eid,oid]);

  // Receita total
  const recBal=await pool.query("SELECT COALESCE(SUM(valor),0) as total FROM receitas WHERE id_evento=$1 AND org_id=$2 AND conta='BaladaAPP'",[eid,oid]);

  // Dados de cidade e tipo
  const cidadesJson=evento.baladapp_cidades_json||[];
  const tiposJson=evento.baladapp_tipos_json||[];

  // Montar dados para o prompt
  var vendasStr=vendasDia.rows.map(d=>'  '+d.dia+': '+d.pedidos+' pedidos, '+d.ingressos+' ingressos, R$ '+parseFloat(d.total).toFixed(2)).join('\n');

  var cronoStr=cronograma.rows.length?cronograma.rows.map(c=>'  '+c.data_publicacao+(c.hora_publicacao?' '+c.hora_publicacao:'')+' | '+c.plataforma+' | '+c.titulo+(c.conteudo?' | '+c.conteudo.substring(0,80):'')+(c.status?' ['+c.status+']':'')).join('\n'):'  Nenhuma acao registrada';

  var cidadesStr=cidadesJson.slice(0,20).map(c=>'  '+c.cidade+(c.estado?' - '+c.estado:'')+': '+c.qtd+' ingressos').join('\n');

  var tiposStr=tiposJson.map(t=>'  '+t.tipo+': '+t.qtd+' ingressos, R$ '+t.total.toFixed(2)).join('\n');

  var prompt='Voce e um analista de marketing SENIOR especialista em eventos no Brasil. Analise os dados de vendas e acoes de marketing abaixo para gerar um briefing semanal inteligente.\n\n';
  prompt+='=== EVENTO ===\n';
  prompt+='Nome: '+evento.nome+'\n';
  prompt+='Produtora: '+(org.rows.length?org.rows[0].nome:'')+'\n';
  if(evento.data_evento)prompt+='Data do evento: '+evento.data_evento+'\n';
  if(evento.local_evento)prompt+='Local: '+evento.local_evento+(evento.cidade?' - '+evento.cidade:'')+'\n';
  if(evento.atracoes)prompt+='Atracoes: '+evento.atracoes+'\n';
  prompt+='Receita total BaladaAPP: R$ '+parseFloat(recBal.rows[0].total).toFixed(2)+'\n';

  prompt+='\n=== VENDAS POR DIA ===\n'+vendasStr+'\n';
  prompt+='\n=== ACOES DE MARKETING (CRONOGRAMA) ===\n'+cronoStr+'\n';
  prompt+='\n=== TOP CIDADES (por ingressos vendidos) ===\n'+cidadesStr+'\n';
  prompt+='\n=== VENDAS POR TIPO DE INGRESSO ===\n'+tiposStr+'\n';

  if(req.body.contexto_extra)prompt+='\n=== DIRECIONAMENTO DO PRODUTOR ===\n'+req.body.contexto_extra+'\n';

  prompt+='\n=== TAREFA ===\n';
  prompt+='Analise TODOS os dados acima e gere um briefing semanal completo. Voce deve:\n';
  prompt+='1. Identificar picos de venda e correlacionar com acoes de marketing feitas nos dias anteriores\n';
  prompt+='2. Identificar quais tipos de acao (post, stories, reels, trafego pago) geraram mais conversao\n';
  prompt+='3. Analisar quais cidades estao comprando mais e sugerir focar nelas\n';
  prompt+='4. Comparar a ultima semana com semanas anteriores\n';
  prompt+='5. Dar recomendacoes ESPECIFICAS e PRATICAS para a proxima semana\n';
  prompt+='6. Escrever um briefing completo para a equipe de marketing\n\n';
  prompt+='Responda APENAS em JSON valido (sem markdown, sem ```), com EXATAMENTE estes campos:\n';
  prompt+='{\n';
  prompt+='  "resumo_semana": "resumo executivo da semana (2-3 frases)",\n';
  prompt+='  "total_vendas_semana": 0,\n';
  prompt+='  "total_ingressos_semana": 0,\n';
  prompt+='  "comparativo": "comparacao com semana anterior (ex: +15% em vendas)",\n';
  prompt+='  "top_acoes": [{"acao": "descricao da acao", "data": "data", "vendas_no_dia": 0, "impacto": "alto/medio/baixo"}],\n';
  prompt+='  "top_cidades": [{"cidade": "nome", "ingressos": 0, "potencial": "descricao do potencial"}],\n';
  prompt+='  "insights": ["insight 1 sobre o comportamento de venda", "insight 2", "insight 3"],\n';
  prompt+='  "recomendacoes": [{"acao": "o que fazer", "plataforma": "onde", "quando": "quando", "motivo": "por que vai funcionar"}],\n';
  prompt+='  "briefing_semana": "texto completo do briefing para a equipe (min 200 palavras com tom profissional e direto)"\n';
  prompt+='}';

  const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:4000,messages:[{role:'user',content:prompt}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
  const txt=r.data.content.map(function(b){return b.text||''}).join('').replace(/```json|```/g,'').trim();
  const analise=JSON.parse(txt);

  // Salvar no banco
  const ins=await pool.query('INSERT INTO analises_marketing(org_id,id_evento,resumo,total_vendas,comparativo,top_acoes,top_cidades,insights,recomendacoes,briefing_semana) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
    [oid,eid,analise.resumo_semana||'',parseFloat(analise.total_vendas_semana)||0,analise.comparativo||'',JSON.stringify(analise.top_acoes||[]),JSON.stringify(analise.top_cidades||[]),JSON.stringify(analise.insights||[]),JSON.stringify(analise.recomendacoes||[]),analise.briefing_semana||'']);
  res.json(ins.rows[0]);
}catch(e){console.error(e);res.status(500).json({erro:e.message})}});

// === RECEITAS ===
router.get('/api/eventos/:id/receitas',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM receitas WHERE id_evento=$1 AND org_id=$2 ORDER BY data_pagamento DESC NULLS LAST, criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/receitas',auth,async(req,res)=>{try{
const{descricao,centro_custo,valor,situacao,conta,data_pagamento}=req.body;
if(!descricao||!valor)return res.status(400).json({erro:'Descricao e valor obrigatorios'});
const r=await pool.query('INSERT INTO receitas(org_id,id_evento,descricao,centro_custo,valor,situacao,conta,data_pagamento) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
[req.user.org_id,req.params.id,descricao,centro_custo||'Outro',parseFloat(valor)||0,situacao||'pendente',conta||'',data_pagamento||null]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/receitas/:id',auth,async(req,res)=>{try{
const b=req.body;const f=[];const v=[];let i=1;
['descricao','centro_custo','situacao','conta','data_pagamento'].forEach(function(k){if(b[k]!==undefined){f.push(k+'=$'+i);v.push(b[k]);i++}});
if(b.valor!==undefined){f.push('valor=$'+i);v.push(parseFloat(b.valor)||0);i++}
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

// === IMPORT PLANILHA ===
router.post('/api/eventos/:id/importar',auth,upload.single('planilha'),async(req,res)=>{try{
if(!req.file)return res.status(400).json({erro:'Arquivo obrigatorio'});
res.json({sucesso:true,msg:'Upload recebido. Processamento em breve.'})
}catch(e){res.status(500).json({erro:e.message})}});


  return router;
};
