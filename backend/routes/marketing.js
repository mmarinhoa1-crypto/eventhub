const express = require('express');
module.exports = function({ pool, axios, auth, upload, CLAUDE }) {
  const router = express.Router();

  const IG_APP_ID = process.env.INSTAGRAM_APP_ID;
  const IG_INSTAGRAM_APP_ID = process.env.INSTAGRAM_IG_APP_ID || '761874503395552';
  const IG_APP_SECRET = process.env.INSTAGRAM_APP_SECRET;
  const IG_REDIRECT_URI = 'https://app.314br.com/api/instagram/callback';

// === BRIEFINGS DE MARKETING ===
router.get('/api/briefings/todos',auth,async(req,res)=>{try{
const r=await pool.query('SELECT b.*, e.nome as evento_nome FROM briefings b LEFT JOIN eventos e ON b.id_evento=e.id WHERE b.org_id=$1 ORDER BY b.criado_em DESC',[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/eventos/:id/briefings',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM briefings WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/briefings',auth,async(req,res)=>{try{
const b=req.body;
const r=await pool.query('INSERT INTO briefings(org_id,id_evento,titulo,tipo,descricao,publico_alvo,mensagem_chave,referencias_visuais,dimensoes,status,atribuido_para,data_vencimento,hora_vencimento,tipo_conteudo,formato,referencia,musica,legenda) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *',
[req.user.org_id,req.params.id,b.titulo,b.tipo||'post',b.descricao||'',b.publico_alvo||'',b.mensagem_chave||'',b.referencias_visuais||'',b.dimensoes||'',b.status||'pendente',b.atribuido_para||'',b.data_vencimento||'',b.hora_vencimento||'',b.tipo_conteudo||'',b.formato||'',b.referencia||'',b.musica||'',b.legenda||'']);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/briefings/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['titulo','tipo','descricao','publico_alvo','mensagem_chave','referencias_visuais','dimensoes','status','atribuido_para','data_vencimento','hora_vencimento','feedback','tipo_conteudo','formato','referencia','musica','legenda'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
fields.push('atualizado_em=NOW()');
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE briefings SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
const updated=r.rows[0];
// Notificar gestores quando status muda para em_revisao
if(b.status==='em_revisao'&&updated){
  try{
    const gestores=await pool.query("SELECT id FROM usuarios WHERE org_id=$1 AND funcao IN ('admin','diretor') AND id!=$2",[req.user.org_id,req.user.id]);
    for(const g of gestores.rows){
      await pool.query('INSERT INTO notificacoes(org_id,usuario_id,tipo,titulo,mensagem,link,referencia_tipo,referencia_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [req.user.org_id,g.id,'demanda_aprovacao','Demanda aguardando aprovação',
         (req.user.nome||'Usuário')+' enviou "'+updated.titulo+'" para revisão',
         '/demandas','briefing',updated.id]);
    }
  }catch(e2){console.error('Erro ao criar notificacoes de briefing:',e2.message)}
}
res.json(updated)}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/briefings/:id',auth,async(req,res)=>{try{
const b=await pool.query('SELECT cronograma_id FROM briefings WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const cronogramaId=b.rows[0]?.cronograma_id;
await pool.query('DELETE FROM briefings WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(cronogramaId){await pool.query('DELETE FROM cronograma_marketing WHERE id=$1 AND org_id=$2',[cronogramaId,req.user.org_id]);}
res.json({sucesso:true,cronograma_id:cronogramaId||null})}catch(e){res.status(500).json({erro:e.message})}});

// === CRONOGRAMA DE MARKETING ===
router.get('/api/eventos/:id/cronograma',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM cronograma_marketing WHERE id_evento=$1 AND org_id=$2 ORDER BY data_publicacao,hora_publicacao',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/cronograma',auth,async(req,res)=>{try{
const b=req.body;
const r=await pool.query('INSERT INTO cronograma_marketing(org_id,id_evento,titulo,plataforma,data_publicacao,hora_publicacao,conteudo,hashtags,formato,status,collaborators) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *',
[req.user.org_id,req.params.id,b.titulo,b.plataforma||'',b.data_publicacao||'',b.hora_publicacao||'',b.conteudo||'',b.hashtags||'',b.formato||'',b.status||'pendente',b.collaborators||'']);
const post=r.rows[0];
// Criar briefing automaticamente para o designer (somente se destino=design)
if(b.destino==='design'){
try{
const brf=await pool.query('INSERT INTO briefings(org_id,id_evento,titulo,tipo,descricao,status,data_vencimento,hora_vencimento,tipo_conteudo,formato,referencia,musica,cronograma_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id',
[req.user.org_id,req.params.id,post.titulo,'post',b.descricao||post.conteudo||'','pendente',post.data_publicacao||'',post.hora_publicacao||'',b.tipo_conteudo||'',b.formato||'',b.referencia||'',b.musica||'',post.id]);
post.briefing_id=brf.rows[0].id;
}catch(e2){console.log('Erro ao criar briefing automatico:',e2.message)}
}
res.json(post)}catch(e){res.status(500).json({erro:e.message})}});

// Toggle visibilidade do briefing para o designer
router.post('/api/cronograma/:id/toggle-designer',auth,async(req,res)=>{try{
const{ativo,descricao='',tipo_conteudo='',formato='',referencia='',musica=''}=req.body;
const br=await pool.query('SELECT id FROM briefings WHERE cronograma_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(ativo&&br.rows.length===0){
  const cm=await pool.query('SELECT * FROM cronograma_marketing WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  const post=cm.rows[0];
  if(!post)return res.status(404).json({erro:'Post não encontrado'});
  await pool.query('INSERT INTO briefings(org_id,id_evento,titulo,tipo,descricao,status,data_vencimento,hora_vencimento,tipo_conteudo,formato,referencia,musica,cronograma_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',
    [req.user.org_id,post.id_evento,post.titulo,'post',descricao||post.conteudo||'','pendente',post.data_publicacao||'',post.hora_publicacao||'',tipo_conteudo||'',formato||'',referencia||'',musica||'',post.id]);
  res.json({sucesso:true,ativo:true});
}else if(!ativo&&br.rows.length>0){
  await pool.query('DELETE FROM briefings WHERE id=$1 AND org_id=$2',[br.rows[0].id,req.user.org_id]);
  res.json({sucesso:true,ativo:false});
}else{res.json({sucesso:true,ativo:!!ativo});}
}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/cronograma/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['titulo','plataforma','data_publicacao','hora_publicacao','conteudo','hashtags','formato','status','feedback','auto_publish','boost_enabled','boost_budget','boost_duration','boost_age_min','boost_age_max','boost_cities','collaborators'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE cronograma_marketing SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
const updated=r.rows[0];
// Notificar gestores quando status muda para em_revisao
if(b.status==='em_revisao'&&updated){
  try{
    const gestores=await pool.query("SELECT id FROM usuarios WHERE org_id=$1 AND funcao IN ('admin','diretor') AND id!=$2",[req.user.org_id,req.user.id]);
    for(const g of gestores.rows){
      await pool.query('INSERT INTO notificacoes(org_id,usuario_id,tipo,titulo,mensagem,link,referencia_tipo,referencia_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [req.user.org_id,g.id,'demanda_aprovacao','Demanda aguardando aprovação',
         (req.user.nome||'Usuário')+' enviou "'+updated.titulo+'" para revisão',
         '/demandas','cronograma',updated.id]);
    }
  }catch(e2){console.error('Erro ao criar notificacoes de cronograma:',e2.message)}
}
res.json(updated)}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/cronograma/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM briefings WHERE cronograma_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
await pool.query('DELETE FROM cronograma_marketing WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});




// === INSTAGRAM ACCOUNTS MANAGEMENT ===
// Listar todas as contas de Instagram da org
router.get('/api/instagram/accounts',auth,async(req,res)=>{try{
  const r = await pool.query('SELECT id,ig_account_id,ig_username,profile_picture,token_expires_at,criado_em FROM instagram_accounts WHERE org_id=$1 ORDER BY ig_username',[req.user.org_id]);
  res.json(r.rows);
}catch(e){res.status(500).json({erro:e.message})}});

// Adicionar conta via token
router.post('/api/instagram/accounts',auth,async(req,res)=>{try{
  const {access_token} = req.body;
  if(!access_token) return res.status(400).json({erro:'Token obrigatório'});
  
  // Verificar token
  const igRes = await fetch('https://graph.instagram.com/me?fields=id,username,name,profile_picture_url&access_token='+access_token);
  const igData = await igRes.json();
  if(igData.error) return res.status(400).json({erro:'Token inválido: '+igData.error.message});
  
  const expiresAt = new Date(Date.now() + 5184000 * 1000);
  
  await pool.query(`INSERT INTO instagram_accounts(org_id,ig_account_id,ig_username,profile_picture,access_token,token_expires_at) 
    VALUES($1,$2,$3,$4,$5,$6) 
    ON CONFLICT (org_id, ig_username) DO UPDATE SET ig_account_id=$2,access_token=$5,profile_picture=$4,token_expires_at=$6,criado_em=NOW()`,
    [req.user.org_id, igData.id, igData.username||igData.name, igData.profile_picture_url||'', access_token, expiresAt]);
  
  res.json({sucesso:true, username: igData.username||igData.name, picture: igData.profile_picture_url||''});
}catch(e){res.status(500).json({erro:e.message})}});

// Remover conta
router.delete('/api/instagram/accounts/:id',auth,async(req,res)=>{try{
  await pool.query('DELETE FROM instagram_accounts WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  // Remover conexões de eventos que usam esta conta
  await pool.query('DELETE FROM instagram_connections WHERE org_id=$1 AND ig_account_id=(SELECT ig_account_id FROM instagram_accounts WHERE id=$2)',[req.user.org_id,req.params.id]);
  res.json({sucesso:true});
}catch(e){res.status(500).json({erro:e.message})}});

// Conectar conta existente a um evento (só selecionar)
router.post('/api/eventos/:id/instagram/connect',auth,async(req,res)=>{try{
  const {account_id} = req.body;
  const acc = await pool.query('SELECT * FROM instagram_accounts WHERE id=$1 AND org_id=$2',[account_id,req.user.org_id]);
  if(acc.rows.length===0) return res.status(404).json({erro:'Conta não encontrada'});
  const a = acc.rows[0];
  
  const expiresAt = a.token_expires_at || new Date(Date.now() + 5184000 * 1000);
  
  await pool.query(`INSERT INTO instagram_connections(org_id,evento_id,ig_account_id,ig_username,page_id,page_name,access_token,token_expires_at) 
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) 
    ON CONFLICT (evento_id) DO UPDATE SET ig_account_id=$3,ig_username=$4,page_id=$5,page_name=$6,access_token=$7,token_expires_at=$8,criado_em=NOW()`,
    [req.user.org_id, req.params.id, a.ig_account_id, a.ig_username, '', a.ig_username, a.access_token, expiresAt]);
  
  res.json({sucesso:true, username: a.ig_username});
}catch(e){res.status(500).json({erro:e.message})}});

// === INSTAGRAM OAUTH & CONNECTIONS ===

// Iniciar OAuth - redireciona pro Instagram Login direto
router.get('/api/instagram/connect/:eventoId',auth,async(req,res)=>{
  const state = Buffer.from(JSON.stringify({evento_id:req.params.eventoId,user_id:req.user.id,org_id:req.user.org_id})).toString('base64');
  const url = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(IG_REDIRECT_URI)}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement&state=${state}&response_type=code`;
  res.json({url});
});

// Callback do OAuth
router.get('/api/instagram/callback',async(req,res)=>{try{
  const {code,state} = req.query;
  if(!code&&!state) return res.status(400).send('Código não recebido');
  
  const stateData = JSON.parse(Buffer.from(state,'base64').toString());
  const {evento_id, user_id, org_id} = stateData;
  
  // Step 1: Trocar code por token via Facebook
  const tokenRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?client_id=${IG_APP_ID}&redirect_uri=${encodeURIComponent(IG_REDIRECT_URI)}&client_secret=${IG_APP_SECRET}&code=${code}`);
  const tokenData = await tokenRes.json();
  if(tokenData.error) return res.status(400).send('Erro: '+tokenData.error.message);
  
  // Trocar por long-lived token
  const longRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${IG_APP_ID}&client_secret=${IG_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`);
  const longData = await longRes.json();
  const longToken = longData.access_token || tokenData.access_token;
  
  // Buscar páginas e Instagram Business
  const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?limit=100&access_token=${longToken}`);
  const pagesData = await pagesRes.json();
  
  const igAccounts = [];
  if(pagesData.data) {
    for(const page of pagesData.data) {
      try {
        const igRes = await fetch(`https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account,name&access_token=${page.access_token}`);
        const igData = await igRes.json();
        if(igData.instagram_business_account) {
          const userRes = await fetch(`https://graph.facebook.com/v21.0/${igData.instagram_business_account.id}?fields=username,name,profile_picture_url&access_token=${page.access_token}`);
          const userData = await userRes.json();
          igAccounts.push({ pageId: page.id, pageName: page.name, pageToken: page.access_token, igId: igData.instagram_business_account.id, username: userData.username || userData.name, picture: userData.profile_picture_url || '' });
        }
      } catch(e) { /* skip */ }
    }
  }
  
  if(igAccounts.length === 0) return res.send('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#fdf2f8"><div style="text-align:center"><h2>Nenhum Instagram encontrado</h2><p>Suas páginas do Facebook não possuem Instagram Business vinculado.</p><p style="color:#999">A conta precisa ser Business/Creator e estar vinculada a uma Página.</p><script>setTimeout(()=>window.close(),5000)</script></div></body></html>');
  const userId = null;
  
  // Se só tem 1 conta, salva direto
  async function saveIGConnection(acc) {
    const pageLongRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${IG_APP_ID}&client_secret=${IG_APP_SECRET}&fb_exchange_token=${acc.pageToken}`);
    const pageLongData = await pageLongRes.json();
    const finalToken = pageLongData.access_token || acc.pageToken;
    const expiresAt = new Date(Date.now() + 5184000 * 1000);
    
    await pool.query(`INSERT INTO instagram_accounts(org_id,ig_account_id,ig_username,profile_picture,access_token,token_expires_at) 
      VALUES($1,$2,$3,$4,$5,$6) 
      ON CONFLICT (org_id, ig_username) DO UPDATE SET ig_account_id=$2,access_token=$5,profile_picture=$4,token_expires_at=$6,criado_em=NOW()`,
      [org_id, acc.igId, acc.username, acc.picture, finalToken, expiresAt]);
    
    await pool.query(`INSERT INTO instagram_connections(org_id,evento_id,ig_account_id,ig_username,page_id,page_name,access_token,token_expires_at) 
      VALUES($1,$2,$3,$4,$5,$6,$7,$8) 
      ON CONFLICT (evento_id) DO UPDATE SET ig_account_id=$3,ig_username=$4,page_id=$5,page_name=$6,access_token=$7,token_expires_at=$8,criado_em=NOW()`,
      [org_id, evento_id, acc.igId, acc.username, acc.pageId, acc.pageName, finalToken, expiresAt]);
    
    return acc.username;
  }
  
  if(igAccounts.length === 1) {
    const username = await saveIGConnection(igAccounts[0]);
    return res.send('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#fdf2f8"><div style="text-align:center"><h2 style="color:#ec4899">Instagram Conectado!</h2><p>@'+username+'</p><p style="color:#999">Pode fechar esta janela.</p><script>setTimeout(()=>window.close(),2000)</script></div></body></html>');
  }
  
  // Múltiplas contas: mostrar seletor bonito
  // Salvar token temporário pra usar no step 2
  const tempId = Date.now().toString(36);
  global._igTemp = global._igTemp || {};
  global._igTemp[tempId] = { igAccounts, org_id, evento_id };
  setTimeout(() => { delete global._igTemp[tempId] }, 300000);
  
  let cardsHtml = '';
  igAccounts.forEach((acc, idx) => {
    cardsHtml += `<div onclick="window.location.href='/api/instagram/callback-select?t=${tempId}&i=${idx}'" style="display:flex;align-items:center;gap:12px;padding:16px;border:2px solid #e5e7eb;border-radius:16px;cursor:pointer;transition:all 0.2s;margin-bottom:10px;background:white" onmouseover="this.style.borderColor='#ec4899';this.style.background='#fdf2f8'" onmouseout="this.style.borderColor='#e5e7eb';this.style.background='white'">
      ${acc.picture ? '<img src="'+acc.picture+'" style="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #e5e7eb" onerror="this.style.display=\'none\'" />' : '<div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#a855f7,#ec4899);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px">'+acc.username[0].toUpperCase()+'</div>'}
      <div><p style="font-weight:bold;color:#111;margin:0;font-size:15px">@${acc.username}</p><p style="font-size:12px;color:#999;margin:2px 0 0">via ${acc.pageName}</p></div>
    </div>`;
  });
  
  res.send(`<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
    <body style="font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#fdf2f8,#ede9fe);margin:0;padding:20px">
    <div style="background:white;border-radius:20px;padding:28px;max-width:420px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,0.1)">
      <div style="text-align:center;margin-bottom:20px">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#a855f7,#ec4899);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg>
        </div>
        <h2 style="color:#111;margin:0 0 4px;font-size:18px">Selecione o Instagram</h2>
        <p style="color:#999;font-size:13px;margin:0">Escolha qual perfil conectar:</p>
      </div>
      ${cardsHtml}
    </div></body></html>`);
}catch(e){console.error('Instagram callback erro:',e);res.status(500).send('Erro: '+e.message)}});


// Callback seleção de conta Instagram
router.get('/api/instagram/callback-select',async(req,res)=>{try{
  const {t, i} = req.query;
  if(!global._igTemp || !global._igTemp[t]) return res.status(400).send('Sessão expirada. Tente novamente.');
  const {igAccounts, org_id, evento_id} = global._igTemp[t];
  const acc = igAccounts[parseInt(i)];
  if(!acc) return res.status(400).send('Conta não encontrada');
  
  const pageLongRes = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${IG_APP_ID}&client_secret=${IG_APP_SECRET}&fb_exchange_token=${acc.pageToken}`);
  const pageLongData = await pageLongRes.json();
  const finalToken = pageLongData.access_token || acc.pageToken;
  const expiresAt = new Date(Date.now() + 5184000 * 1000);
  
  await pool.query(`INSERT INTO instagram_accounts(org_id,ig_account_id,ig_username,profile_picture,access_token,token_expires_at) 
    VALUES($1,$2,$3,$4,$5,$6) 
    ON CONFLICT (org_id, ig_username) DO UPDATE SET ig_account_id=$2,access_token=$5,profile_picture=$4,token_expires_at=$6,criado_em=NOW()`,
    [org_id, acc.igId, acc.username, acc.picture, finalToken, expiresAt]);
  
  await pool.query(`INSERT INTO instagram_connections(org_id,evento_id,ig_account_id,ig_username,page_id,page_name,access_token,token_expires_at) 
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) 
    ON CONFLICT (evento_id) DO UPDATE SET ig_account_id=$3,ig_username=$4,page_id=$5,page_name=$6,access_token=$7,token_expires_at=$8,criado_em=NOW()`,
    [org_id, evento_id, acc.igId, acc.username, acc.pageId, acc.pageName, finalToken, expiresAt]);
  
  delete global._igTemp[t];
  
  res.send('<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#fdf2f8"><div style="text-align:center"><h2 style="color:#ec4899">Instagram Conectado!</h2><p style="font-size:16px">@'+acc.username+'</p><p style="color:#999">Pode fechar esta janela.</p><script>setTimeout(()=>window.close(),2000)</script></div></body></html>');
}catch(e){res.status(500).send('Erro: '+e.message)}});

// Listar conexão de um evento
router.get('/api/eventos/:id/instagram',auth,async(req,res)=>{try{
  const r = await pool.query('SELECT id,ig_account_id,ig_username,page_name,token_expires_at FROM instagram_connections WHERE evento_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  res.json(r.rows[0] || null);
}catch(e){res.status(500).json({erro:e.message})}});

// Desconectar Instagram de um evento
router.delete('/api/eventos/:id/instagram',auth,async(req,res)=>{try{
  await pool.query('DELETE FROM instagram_connections WHERE evento_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  res.json({sucesso:true});
}catch(e){res.status(500).json({erro:e.message})}});




// === AD FUNNEL SYSTEM ===
const PHASE_CONFIG = {
  1: { name: 'Awareness', objective: 'OUTCOME_AWARENESS', optimization: 'REACH', daysStart: 60, daysEnd: 30 },
  2: { name: 'Consideração', objective: 'OUTCOME_ENGAGEMENT', optimization: 'POST_ENGAGEMENT', daysStart: 30, daysEnd: 15 },
  3: { name: 'Conversão', objective: 'OUTCOME_TRAFFIC', optimization: 'LINK_CLICKS', daysStart: 15, daysEnd: 7 },
  4: { name: 'Urgência', objective: 'OUTCOME_TRAFFIC', optimization: 'LINK_CLICKS', daysStart: 7, daysEnd: 0 }
};

// Buscar/criar funil do evento
router.get('/api/eventos/:id/funnel',auth,async(req,res)=>{try{
  let r = await pool.query('SELECT * FROM ad_funnels WHERE evento_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  if(r.rows.length===0) {
    // Buscar cidade do evento pra pré-preencher
    const ev = await pool.query('SELECT cidade,data_evento FROM eventos WHERE id=$1',[req.params.id]);
    const cidade = ev.rows[0]?.cidade || '';
    await pool.query('INSERT INTO ad_funnels(org_id,evento_id,target_city) VALUES($1,$2,$3) ON CONFLICT(evento_id) DO NOTHING',[req.user.org_id,req.params.id,cidade]);
    r = await pool.query('SELECT * FROM ad_funnels WHERE evento_id=$1',[req.params.id]);
  }
  res.json(r.rows[0]);
}catch(e){res.status(500).json({erro:e.message})}});

// Atualizar configuração do funil
router.patch('/api/eventos/:id/funnel',auth,async(req,res)=>{try{
  const b = req.body;
  const fields = []; const vals = []; let idx = 1;
  ['status','total_budget','budget_phase1','budget_phase2','budget_phase3','budget_phase4','target_city','target_radius','target_age_min','target_age_max','target_interests','ticket_url','cta','pixel_id'].forEach(k => {
    if(b[k] !== undefined) { fields.push(k+'=$'+idx); vals.push(b[k]); idx++ }
  });
  if(fields.length === 0) return res.json({ok:true});
  vals.push(req.params.id); vals.push(req.user.org_id);
  const r = await pool.query('UPDATE ad_funnels SET '+fields.join(',')+' WHERE evento_id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *', vals);
  res.json(r.rows[0]);
}catch(e){res.status(500).json({erro:e.message})}});

// Ativar funil (criar todas as campanhas)
router.post('/api/eventos/:id/funnel/activate',auth,async(req,res)=>{try{
  let funnel = await pool.query('SELECT f.*, e.nome as evento_nome, e.data_evento, e.cidade FROM ad_funnels f JOIN eventos e ON e.id=f.evento_id WHERE f.evento_id=$1 AND f.org_id=$2',[req.params.id,req.user.org_id]);
  if(funnel.rows.length===0) {
    const ev = await pool.query('SELECT cidade,data_evento,nome FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
    if(ev.rows.length===0) return res.status(404).json({erro:'Evento não encontrado'});
    await pool.query('INSERT INTO ad_funnels(org_id,evento_id,target_city,total_budget) VALUES($1,$2,$3,50000)',[req.user.org_id,req.params.id,ev.rows[0].cidade||'']);
    funnel = await pool.query('SELECT f.*, e.nome as evento_nome, e.data_evento, e.cidade FROM ad_funnels f JOIN eventos e ON e.id=f.evento_id WHERE f.evento_id=$1',[req.params.id]);
    if(funnel.rows.length===0) return res.status(500).json({erro:'Erro ao criar funil'});
  }
  const f = funnel.rows[0];
  
  const ig = await pool.query('SELECT * FROM instagram_connections WHERE evento_id=$1',[req.params.id]);
  if(ig.rows.length===0) return res.status(400).json({erro:'Conecte o Instagram primeiro'});
  
  const dataEvento = new Date(f.data_evento);
  const hoje = new Date();
  const diasAteEvento = Math.ceil((dataEvento - hoje) / (1000*60*60*24));
  
  const results = {};
  
  for(let phase = 1; phase <= 4; phase++) {
    const cfg = PHASE_CONFIG[phase];
    const budgetPct = f['budget_phase'+phase] || 25;
    const phaseBudget = Math.round(f.total_budget * (budgetPct/100));
    
    // Calcular datas da fase
    let startDate = new Date(dataEvento);
    startDate.setDate(startDate.getDate() - cfg.daysStart);
    if(startDate < hoje) startDate = new Date(hoje.getTime() + 3600000); // pelo menos 1h no futuro
    
    let endDate = new Date(dataEvento);
    endDate.setDate(endDate.getDate() - cfg.daysEnd);
    if(endDate <= startDate) endDate = new Date(startDate.getTime() + 86400000);
    
    const diasFase = Math.max(1, Math.ceil((endDate - startDate) / (1000*60*60*24)));
    const dailyBudget = Math.max(600, Math.round(phaseBudget / diasFase));
    
    const campaignName = f.evento_nome + ' - F' + phase + ' ' + cfg.name;
    
    try {
      // Criar Campanha
      const campRes = await fetch(GRAPH_URL+'/'+AD_ACCOUNT_ID+'/campaigns', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ name: campaignName, objective: cfg.objective, status: phase === 1 || startDate <= hoje ? 'ACTIVE' : 'PAUSED', special_ad_categories: [], is_adset_budget_sharing_enabled: false, access_token: FB_TOKEN })
      });
      const campData = await campRes.json();
      if(campData.error) { console.error('Funil fase '+phase+' campanha erro:', JSON.stringify(campData.error)); continue; }
      
      // Targeting
      const targeting = { age_min: f.target_age_min||18, age_max: f.target_age_max||45 };
      if(f.target_city) {
        targeting.geo_locations = { custom_locations: [{ latitude: 0, longitude: 0, radius: f.target_radius||50, distance_unit: 'kilometer' }], countries: ['BR'] };
        targeting.targeting_automation = { advantage_audience: 0 };
        // Usar cidade como location key se disponível
        targeting.geo_locations = { countries: ['BR'] };
      } else {
        targeting.geo_locations = { countries: ['BR'] };
        targeting.targeting_automation = { advantage_audience: 0 };
      }
      
      // Adicionar interesses
      if(f.target_interests && f.target_interests !== '[]') {
        try {
          const interests = JSON.parse(f.target_interests);
          if(interests.length > 0) targeting.flexible_spec = [{ interests: interests }];
        } catch {}
      }
      
      // Criar AdSet
      const adsetBody = {
        name: campaignName + ' - AdSet',
        campaign_id: campData.id,
        daily_budget: dailyBudget,
        billing_event: 'IMPRESSIONS',
        optimization_goal: cfg.optimization,
        bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
        targeting: targeting,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        status: phase === 1 || startDate <= hoje ? 'ACTIVE' : 'PAUSED',
        access_token: FB_TOKEN
      };
      
      // Se tem link (fase 3 e 4) e URL de ingresso
      if(phase >= 3 && f.ticket_url) {
        adsetBody.promoted_object = { page_id: ig.rows[0].page_id || '' };
        adsetBody.destination_type = 'WEBSITE';
      }
      
      const adsetRes = await fetch(GRAPH_URL+'/'+AD_ACCOUNT_ID+'/adsets', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify(adsetBody)
      });
      const adsetData = await adsetRes.json();
      if(adsetData.error) { console.error('Funil fase '+phase+' adset erro:', JSON.stringify(adsetData.error)); }
      
      results[phase] = { campaign_id: campData.id, adset_id: adsetData.id || '' };
      console.log('Funil: fase '+phase+' ('+cfg.name+') criada - campanha #'+campData.id+' budget R$'+(dailyBudget/100)+'/dia por '+diasFase+' dias');
      
    } catch(e) { console.error('Funil fase '+phase+' erro:', e.message); }
  }
  
  // Calcular fase atual
  let currentPhase = 0;
  if(diasAteEvento <= 0) currentPhase = 4;
  else if(diasAteEvento <= 7) currentPhase = 4;
  else if(diasAteEvento <= 15) currentPhase = 3;
  else if(diasAteEvento <= 30) currentPhase = 2;
  else currentPhase = 1;
  
  await pool.query(`UPDATE ad_funnels SET status='active', current_phase=$1,
    phase1_campaign_id=$2, phase1_adset_id=$3,
    phase2_campaign_id=$4, phase2_adset_id=$5,
    phase3_campaign_id=$6, phase3_adset_id=$7,
    phase4_campaign_id=$8, phase4_adset_id=$9
    WHERE evento_id=$10`,
    [currentPhase,
     results[1]?.campaign_id||'', results[1]?.adset_id||'',
     results[2]?.campaign_id||'', results[2]?.adset_id||'',
     results[3]?.campaign_id||'', results[3]?.adset_id||'',
     results[4]?.campaign_id||'', results[4]?.adset_id||'',
     req.params.id]);
  
  res.json({sucesso:true, phases: results, current_phase: currentPhase});
}catch(e){console.error('Funil ativação erro:',e);res.status(500).json({erro:e.message})}});


// Endpoint: Buscar métricas de performance do funil
router.get('/api/eventos/:id/funnel/metrics',auth,async(req,res)=>{try{
  const f = await pool.query('SELECT * FROM ad_funnels WHERE evento_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  if(f.rows.length===0) return res.json({phases:[]});
  const funnel = f.rows[0];
  
  const phases = [];
  for(let phase = 1; phase <= 4; phase++) {
    const campId = funnel['phase'+phase+'_campaign_id'];
    const adsetId = funnel['phase'+phase+'_adset_id'];
    if(!campId) { phases.push({phase, name: ['','Awareness','Consideração','Conversão','Urgência'][phase], campaigns:null}); continue; }
    
    let adsetInsights = null;
    let ads = [];
    
    try {
      // Métricas do adset
      if(adsetId) {
        const insRes = await fetch(GRAPH_URL+'/'+adsetId+'/insights?fields=impressions,reach,clicks,cpc,cpm,ctr,spend,actions,cost_per_action_type&date_preset=maximum&access_token='+FB_TOKEN);
        const insData = await insRes.json();
        adsetInsights = insData.data?.[0] || null;
      }
      
      // Buscar ads individuais com métricas
      if(adsetId) {
        const adsRes = await fetch(GRAPH_URL+'/'+adsetId+'/ads?fields=id,name,status,effective_status,creative{thumbnail_url,title,body}&access_token='+FB_TOKEN);
        const adsData = await adsRes.json();
        
        for(const ad of (adsData.data || [])) {
          let adInsights = null;
          try {
            const adInsRes = await fetch(GRAPH_URL+'/'+ad.id+'/insights?fields=impressions,reach,clicks,cpc,cpm,ctr,spend,actions&date_preset=maximum&access_token='+FB_TOKEN);
            const adInsData = await adInsRes.json();
            adInsights = adInsData.data?.[0] || null;
          } catch {}
          ads.push({ ...ad, insights: adInsights });
        }
      }
    } catch(e) { console.error('Metrics fase '+phase+' erro:', e.message); }
    
    // Buscar status campanha
    let campStatus = 'UNKNOWN';
    try {
      const campRes = await fetch(GRAPH_URL+'/'+campId+'?fields=status,effective_status&access_token='+FB_TOKEN);
      const campData = await campRes.json();
      campStatus = campData.effective_status || campData.status || 'UNKNOWN';
    } catch {}
    
    phases.push({
      phase,
      name: ['','Awareness','Consideração','Conversão','Urgência'][phase],
      campaign_id: campId,
      adset_id: adsetId,
      campaign_status: campStatus,
      insights: adsetInsights,
      ads: ads
    });
  }
  
  res.json({ phases, funnel_status: funnel.status, current_phase: funnel.current_phase, total_budget: funnel.total_budget });
}catch(e){res.status(500).json({erro:e.message})}});

// Pausar funil
router.post('/api/eventos/:id/funnel/pause',auth,async(req,res)=>{try{
  const f = await pool.query('SELECT * FROM ad_funnels WHERE evento_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  if(f.rows.length===0) return res.status(404).json({erro:'Funil não encontrado'});
  const funnel = f.rows[0];
  
  for(let phase = 1; phase <= 4; phase++) {
    const campId = funnel['phase'+phase+'_campaign_id'];
    if(campId) {
      try {
        await fetch(GRAPH_URL+'/'+campId, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'PAUSED',access_token:FB_TOKEN}) });
      } catch {}
    }
  }
  
  await pool.query("UPDATE ad_funnels SET status='paused' WHERE evento_id=$1",[req.params.id]);
  res.json({sucesso:true});
}catch(e){res.status(500).json({erro:e.message})}});

// Adicionar post como anúncio numa fase
router.post('/api/cronograma/:id/add-to-funnel',auth,async(req,res)=>{try{
  const post = await pool.query('SELECT c.*, ic.ig_account_id, ic.access_token as ig_token FROM cronograma_marketing c LEFT JOIN instagram_connections ic ON ic.evento_id=c.id_evento WHERE c.id=$1 AND c.org_id=$2',[req.params.id,req.user.org_id]);
  if(post.rows.length===0) return res.status(404).json({erro:'Post não encontrado'});
  const p = post.rows[0];
  if(p.status !== 'publicado') return res.status(400).json({erro:'Post precisa estar publicado'});
  
  const funnel = await pool.query('SELECT * FROM ad_funnels WHERE evento_id=$1',[p.id_evento]);
  if(funnel.rows.length===0) return res.status(400).json({erro:'Funil não configurado'});
  const f = funnel.rows[0];
  if(f.status !== 'active') return res.status(400).json({erro:'Funil não está ativo'});
  
  const phase = req.body.phase || f.current_phase || 1;
  const adsetId = f['phase'+phase+'_adset_id'];
  if(!adsetId) return res.status(400).json({erro:'Fase '+phase+' não tem adset'});
  
  // Buscar último post do IG
  const igRes = await fetch('https://graph.instagram.com/'+p.ig_account_id+'/media?fields=id&limit=1&access_token='+p.ig_token);
  const igData = await igRes.json();
  if(!igData.data||igData.data.length===0) return res.status(400).json({erro:'Post não encontrado no Instagram'});
  
  // Criar creative e ad
  const creativeRes = await fetch(GRAPH_URL+'/'+AD_ACCOUNT_ID+'/adcreatives', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name: p.titulo+' - Creative', object_story_id: p.ig_account_id+'_'+igData.data[0].id, access_token: FB_TOKEN })
  });
  const creative = await creativeRes.json();
  if(creative.error) return res.status(400).json({erro:'Creative: '+creative.error.message});
  
  const adRes = await fetch(GRAPH_URL+'/'+AD_ACCOUNT_ID+'/ads', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ name: p.titulo+' - Ad', adset_id: adsetId, creative:{creative_id:creative.id}, status:'ACTIVE', access_token: FB_TOKEN })
  });
  const ad = await adRes.json();
  if(ad.error) return res.status(400).json({erro:'Ad: '+ad.error.message});
  
  await pool.query("UPDATE cronograma_marketing SET boost_status='funnel_phase_'+$1, boost_campaign_id=$2 WHERE id=$3",[phase,f['phase'+phase+'_campaign_id'],p.id]);
  
  res.json({sucesso:true, phase, ad_id: ad.id});
}catch(e){res.status(500).json({erro:e.message})}});

// CRON: Gerenciar fases do funil (roda a cada hora)
setInterval(async()=>{
  try{
    const funnels = await pool.query("SELECT f.*, e.data_evento, e.nome as evento_nome FROM ad_funnels f JOIN eventos e ON e.id=f.evento_id WHERE f.status='active'");
    
    for(const f of funnels.rows) {
      const dataEvento = new Date(f.data_evento);
      const hoje = new Date();
      const diasAte = Math.ceil((dataEvento - hoje) / (1000*60*60*24));
      
      let newPhase = 1;
      if(diasAte <= 0) newPhase = 4;
      else if(diasAte <= 7) newPhase = 4;
      else if(diasAte <= 15) newPhase = 3;
      else if(diasAte <= 30) newPhase = 2;
      else newPhase = 1;
      
      if(newPhase !== f.current_phase) {
        console.log('Funil '+f.evento_nome+': fase '+f.current_phase+' -> '+newPhase+' ('+diasAte+' dias pro evento)');
        
        // Pausar fase anterior
        if(f.current_phase > 0) {
          const oldCampId = f['phase'+f.current_phase+'_campaign_id'];
          if(oldCampId) {
            try { await fetch(GRAPH_URL+'/'+oldCampId, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'PAUSED',access_token:FB_TOKEN}) }); } catch {}
          }
        }
        
        // Ativar nova fase
        const newCampId = f['phase'+newPhase+'_campaign_id'];
        const newAdsetId = f['phase'+newPhase+'_adset_id'];
        if(newCampId) {
          try { await fetch(GRAPH_URL+'/'+newCampId, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'ACTIVE',access_token:FB_TOKEN}) }); } catch {}
        }
        if(newAdsetId) {
          try { await fetch(GRAPH_URL+'/'+newAdsetId, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'ACTIVE',access_token:FB_TOKEN}) }); } catch {}
        }
        
        await pool.query('UPDATE ad_funnels SET current_phase=$1 WHERE id=$2',[newPhase, f.id]);
      }
      
      // Se evento passou, completar funil
      if(diasAte < -1) {
        for(let p=1;p<=4;p++) {
          const cid = f['phase'+p+'_campaign_id'];
          if(cid) { try { await fetch(GRAPH_URL+'/'+cid, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:'PAUSED',access_token:FB_TOKEN}) }); } catch {} }
        }
        await pool.query("UPDATE ad_funnels SET status='completed' WHERE id=$1",[f.id]);
        console.log('Funil '+f.evento_nome+': completado (evento passou)');
      }
    }
  } catch(e) { console.error('Funil CRON erro:', e.message) }
}, 3600000);


const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const FB_TOKEN = process.env.META_FB_TOKEN;
const GRAPH_URL = 'https://graph.facebook.com/v21.0';

async function criarCampanhaAds(postIgId, postTitulo, orcamentoCentavos, duracaoDias, ageMin, ageMax, cities, igAccountId) {
  if (!AD_ACCOUNT_ID || !FB_TOKEN) throw new Error('Ads não configurado');
  
  const now = new Date();
  const endDate = new Date(now.getTime() + duracaoDias * 24 * 60 * 60 * 1000);
  const campaignName = 'EventHub - ' + postTitulo + ' - ' + now.toISOString().split('T')[0];
  
  // Step 1: Criar Campanha
  const campRes = await fetch(`${GRAPH_URL}/${AD_ACCOUNT_ID}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: campaignName,
      objective: 'OUTCOME_ENGAGEMENT',
      status: 'ACTIVE',
      special_ad_categories: [],
      access_token: FB_TOKEN
    })
  });
  const campData = await campRes.json();
  if (campData.error) throw new Error('Campanha: ' + campData.error.message);
  const campaignId = campData.id;
  console.log('Ads: campanha criada #' + campaignId);
  
  // Step 2: Criar Ad Set (público + orçamento)
  const targeting = { age_min: ageMin || 18, age_max: ageMax || 45 };
  if (cities && cities.trim()) {
    const cityList = cities.split(',').map(c => ({ key: c.trim() }));
    targeting.geo_locations = { cities: cityList };
  } else {
    targeting.geo_locations = { countries: ['BR'] };
  }
  
  const adsetRes = await fetch(`${GRAPH_URL}/${AD_ACCOUNT_ID}/adsets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: campaignName + ' - AdSet',
      campaign_id: campaignId,
      daily_budget: orcamentoCentavos,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'POST_ENGAGEMENT',
      targeting: targeting,
      start_time: now.toISOString(),
      end_time: endDate.toISOString(),
      status: 'ACTIVE',
      access_token: FB_TOKEN
    })
  });
  const adsetData = await adsetRes.json();
  if (adsetData.error) throw new Error('AdSet: ' + adsetData.error.message);
  const adsetId = adsetData.id;
  console.log('Ads: adset criado #' + adsetId);
  
  // Step 3: Criar Ad (usando o post do Instagram)
  const adCreativeRes = await fetch(`${GRAPH_URL}/${AD_ACCOUNT_ID}/adcreatives`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: campaignName + ' - Creative',
      object_story_id: igAccountId + '_' + postIgId,
      access_token: FB_TOKEN
    })
  });
  const creativeData = await adCreativeRes.json();
  if (creativeData.error) throw new Error('Creative: ' + creativeData.error.message);
  
  const adRes = await fetch(`${GRAPH_URL}/${AD_ACCOUNT_ID}/ads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: campaignName + ' - Ad',
      adset_id: adsetId,
      creative: { creative_id: creativeData.id },
      status: 'ACTIVE',
      access_token: FB_TOKEN
    })
  });
  const adData = await adRes.json();
  if (adData.error) throw new Error('Ad: ' + adData.error.message);
  console.log('Ads: anúncio criado #' + adData.id);
  
  return { campaignId, adsetId, adId: adData.id };
}

// Endpoint: Impulsionar post manualmente
router.post('/api/cronograma/:id/boost',auth,async(req,res)=>{try{
  const post = await pool.query('SELECT c.*, ic.ig_account_id, ic.access_token as ig_token FROM cronograma_marketing c LEFT JOIN instagram_connections ic ON ic.evento_id=c.id_evento WHERE c.id=$1 AND c.org_id=$2',[req.params.id,req.user.org_id]);
  if(post.rows.length===0) return res.status(404).json({erro:'Post não encontrado'});
  const p = post.rows[0];
  
  if(p.status !== 'publicado') return res.status(400).json({erro:'Post precisa estar publicado primeiro'});
  if(!p.ig_account_id) return res.status(400).json({erro:'Instagram não conectado neste evento'});
  
  const budget = (req.body.budget || p.boost_budget || 2000);
  const duration = (req.body.duration || p.boost_duration || 3);
  const ageMin = (req.body.age_min || p.boost_age_min || 18);
  const ageMax = (req.body.age_max || p.boost_age_max || 45);
  const cities = (req.body.cities || p.boost_cities || '');
  
  // Buscar o Instagram post ID (último publicado)
  const igPostsRes = await fetch(`https://graph.instagram.com/${p.ig_account_id}/media?fields=id,caption,timestamp&limit=5&access_token=${p.ig_token}`);
  const igPosts = await igPostsRes.json();
  if(!igPosts.data || igPosts.data.length === 0) return res.status(400).json({erro:'Nenhum post encontrado no Instagram'});
  
  const igPostId = igPosts.data[0].id;
  
  const result = await criarCampanhaAds(igPostId, p.titulo, budget, duration, ageMin, ageMax, cities, p.ig_account_id);
  
  await pool.query("UPDATE cronograma_marketing SET boost_status='active', boost_campaign_id=$1 WHERE id=$2",[result.campaignId, p.id]);
  
  res.json({sucesso:true, campaign_id: result.campaignId});
}catch(e){console.error('Boost erro:',e.message);res.status(500).json({erro:'Erro ao impulsionar: '+e.message})}});

// Endpoint: Parar campanha
router.post('/api/cronograma/:id/boost-stop',auth,async(req,res)=>{try{
  const post = await pool.query('SELECT * FROM cronograma_marketing WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
  if(post.rows.length===0) return res.status(404).json({erro:'Post não encontrado'});
  const p = post.rows[0];
  
  if(p.boost_campaign_id) {
    await fetch(`${GRAPH_URL}/${p.boost_campaign_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PAUSED', access_token: FB_TOKEN })
    });
  }
  
  await pool.query("UPDATE cronograma_marketing SET boost_status='paused' WHERE id=$1",[p.id]);
  res.json({sucesso:true});
}catch(e){res.status(500).json({erro:e.message})}});


// === INSTAGRAM PUBLISHING ===
const IG_ACCOUNT_ID = process.env.INSTAGRAM_ACCOUNT_ID;
const IG_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const IG_GRAPH_URL = 'https://graph.instagram.com';

async function publicarInstagram(imageUrl, caption, igAccountId, igToken, collaborators) {
  const accountId = igAccountId || IG_ACCOUNT_ID;
  const token = igToken || IG_ACCESS_TOKEN;
  if (!accountId || !token) throw new Error('Instagram não configurado para este evento');

  // Step 1: Criar container de mídia
  const bodyData = {
    image_url: imageUrl,
    caption: caption,
    access_token: token
  };
  if (collaborators && collaborators.length > 0) bodyData.collaborators = collaborators;
  const createRes = await fetch(`${IG_GRAPH_URL}/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyData)
  });
  const createData = await createRes.json();
  if (createData.error) throw new Error(createData.error.message);
  const containerId = createData.id;
  
  // Step 2: Aguardar processamento (poll status)
  let ready = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusRes = await fetch(`${IG_GRAPH_URL}/${containerId}?fields=status_code&access_token=${token}`);
    const statusData = await statusRes.json();
    if (statusData.status_code === 'FINISHED') { ready = true; break; }
    if (statusData.status_code === 'ERROR') throw new Error('Erro ao processar mídia no Instagram');
  }
  if (!ready) throw new Error('Timeout ao processar mídia');
  
  // Step 3: Publicar
  const publishRes = await fetch(`${IG_GRAPH_URL}/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: token
    })
  });
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(publishData.error.message);
  return publishData;
}

// Publicar Carrossel
async function publicarCarrosselInstagram(imageUrls, caption, igAccountId, igToken, collaborators) {
  const accountId = igAccountId || IG_ACCOUNT_ID;
  const token = igToken || IG_ACCESS_TOKEN;
  if (!accountId || !token) throw new Error('Instagram não configurado para este evento');

  // Step 1: Criar containers individuais
  const childIds = [];
  for (const url of imageUrls) {
    const res = await fetch(`${IG_GRAPH_URL}/${accountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: url, is_carousel_item: true, access_token: token })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    childIds.push(data.id);
  }

  // Step 2: Criar container do carrossel
  const carouselBody = { media_type: 'CAROUSEL', children: childIds, caption, access_token: token };
  if (collaborators && collaborators.length > 0) carouselBody.collaborators = collaborators;
  const carouselRes = await fetch(`${IG_GRAPH_URL}/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(carouselBody)
  });
  const carouselData = await carouselRes.json();
  if (carouselData.error) throw new Error(carouselData.error.message);
  
  // Step 3: Aguardar e publicar
  await new Promise(r => setTimeout(r, 5000));
  const publishRes = await fetch(`${IG_GRAPH_URL}/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: carouselData.id, access_token: token })
  });
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(publishData.error.message);
  return publishData;
}

// Publicar Reels/Video
async function publicarReelsInstagram(videoUrl, caption, igAccountId, igToken, collaborators) {
  const accountId = igAccountId || IG_ACCOUNT_ID;
  const token = igToken || IG_ACCESS_TOKEN;
  if (!accountId || !token) throw new Error('Instagram não configurado para este evento');

  const reelsBody = { video_url: videoUrl, caption, media_type: 'REELS', access_token: token };
  if (collaborators && collaborators.length > 0) reelsBody.collaborators = collaborators;
  const createRes = await fetch(`${IG_GRAPH_URL}/${accountId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reelsBody)
  });
  const createData = await createRes.json();
  if (createData.error) throw new Error(createData.error.message);
  
  // Aguardar processamento (vídeo demora mais)
  let ready = false;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`${IG_GRAPH_URL}/${createData.id}?fields=status_code&access_token=${token}`);
    const statusData = await statusRes.json();
    if (statusData.status_code === 'FINISHED') { ready = true; break; }
    if (statusData.status_code === 'ERROR') throw new Error('Erro ao processar vídeo no Instagram');
  }
  if (!ready) throw new Error('Timeout ao processar vídeo');
  
  const publishRes = await fetch(`${IG_GRAPH_URL}/${accountId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ creation_id: createData.id, access_token: token })
  });
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(publishData.error.message);
  return publishData;
}

// Endpoint: Publicar post manualmente
router.post('/api/cronograma/:id/publicar-instagram',auth,async(req,res)=>{try{
  const post = await pool.query('SELECT c.* FROM cronograma_marketing c WHERE c.id=$1 AND c.org_id=$2',[req.params.id,req.user.org_id]);
  if(post.rows.length===0) return res.status(404).json({erro:'Post não encontrado'});
  const p = post.rows[0];
  
  // Buscar conexão Instagram do evento
  const conn = await pool.query('SELECT * FROM instagram_connections WHERE evento_id=$1 AND org_id=$2',[p.id_evento,req.user.org_id]);
  if(conn.rows.length===0) return res.status(400).json({erro:'Instagram não conectado neste evento. Vá em Configurações do evento e conecte o Instagram.'});
  const ig = conn.rows[0];
  
  // Buscar arquivos do post
  const arqs = await pool.query('SELECT * FROM arquivos WHERE cronograma_id=$1 AND org_id=$2 ORDER BY criado_em',[p.id,req.user.org_id]);
  
  if(arqs.rows.length===0) return res.status(400).json({erro:'Post sem imagem/vídeo. Adicione um arquivo primeiro.'});
  
  const baseUrl = 'https://app.314br.com/api';
  const caption = (p.conteudo || p.titulo || '') + (p.hashtags ? '\\n\\n' + p.hashtags : '');
  
  const images = arqs.rows.filter(a => a.tipo && a.tipo.startsWith('image'));
  const videos = arqs.rows.filter(a => a.tipo && a.tipo.startsWith('video'));
  
  const collabs = p.collaborators ? p.collaborators.split(',').map(c => c.trim().replace(/^@/,'')).filter(Boolean) : [];
  if (collabs.length > 0) console.log('Instagram collab: convidando', collabs);

  let result;
  if (videos.length > 0) {
    result = await publicarReelsInstagram(baseUrl + videos[0].url, caption, ig.ig_account_id, ig.access_token, collabs);
  } else if (images.length > 1) {
    const urls = images.map(a => baseUrl + a.url);
    result = await publicarCarrosselInstagram(urls, caption, ig.ig_account_id, ig.access_token, collabs);
  } else if (images.length === 1) {
    result = await publicarInstagram(baseUrl + images[0].url, caption, ig.ig_account_id, ig.access_token, collabs);
  } else {
    return res.status(400).json({erro:'Nenhuma imagem ou vídeo compatível encontrado'});
  }

  await pool.query('UPDATE cronograma_marketing SET status=$1 WHERE id=$2',['publicado',p.id]);
  
  res.json({sucesso:true, instagram_id: result.id});
}catch(e){console.error('Erro Instagram:',e.message);res.status(500).json({erro:'Erro ao publicar: '+e.message})}});


// Adicionar post publicado ao funil automaticamente
async function autoAddToFunnel(postId, eventoId, igAccountId, igToken, orgId) {
  try {
    const funnelRes = await pool.query("SELECT * FROM ad_funnels WHERE evento_id=$1 AND status='active'",[eventoId]);
    if(funnelRes.rows.length === 0) return; // sem funil ativo
    const f = funnelRes.rows[0];
    
    const phase = f.current_phase || 1;
    const adsetId = f['phase'+phase+'_adset_id'];
    if(!adsetId) { console.log('Funil: fase '+phase+' sem adset, pulando auto-add'); return; }
    
    // Buscar último post do IG
    const igRes = await fetch('https://graph.instagram.com/'+igAccountId+'/media?fields=id,caption&limit=1&access_token='+igToken);
    const igData = await igRes.json();
    if(!igData.data || igData.data.length === 0) { console.log('Funil: sem post no Instagram pra adicionar'); return; }
    
    const igPostId = igData.data[0].id;
    
    // Criar creative
    const creativeRes = await fetch(GRAPH_URL+'/'+AD_ACCOUNT_ID+'/adcreatives', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: 'Post #'+postId+' - Auto', object_story_id: igAccountId+'_'+igPostId, access_token: FB_TOKEN })
    });
    const creative = await creativeRes.json();
    if(creative.error) { console.log('Funil auto-add creative erro:', creative.error.message); return; }
    
    // Criar ad
    const adRes = await fetch(GRAPH_URL+'/'+AD_ACCOUNT_ID+'/ads', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name: 'Post #'+postId+' - Fase '+phase, adset_id: adsetId, creative:{creative_id:creative.id}, status:'ACTIVE', access_token: FB_TOKEN })
    });
    const ad = await adRes.json();
    if(ad.error) { console.log('Funil auto-add ad erro:', ad.error.message); return; }
    
    await pool.query("UPDATE cronograma_marketing SET boost_status='funnel_phase_'+$1::text, boost_campaign_id=$2 WHERE id=$3",[phase, f['phase'+phase+'_campaign_id'], postId]);
    
    // Logar
    await pool.query('INSERT INTO ad_ai_logs(org_id,evento_id,phase,action,details) VALUES($1,$2,$3,$4,$5)',
      [orgId, eventoId, phase, 'auto_add_post', 'Post #'+postId+' adicionado como anúncio na fase '+phase]);
    
    console.log('🚀 Funil: post #'+postId+' adicionado automaticamente como anúncio na fase '+phase);
  } catch(e) { console.error('Funil auto-add erro:', e.message); }
}

// CRON: Verificar posts agendados a cada minuto
setInterval(async()=>{
  try{
    const agora = new Date();
    const horaAgora = String(agora.getHours()).padStart(2,'0')+':'+String(agora.getMinutes()).padStart(2,'0');
    const dataHoje = agora.toISOString().split('T')[0];
    
    const posts = await pool.query(
      `SELECT c.id, c.titulo, c.conteudo, c.hashtags, c.id_evento, c.org_id, c.auto_publish, c.status, c.boost_enabled, c.boost_budget, c.boost_duration, c.boost_age_min, c.boost_age_max, c.boost_cities, c.collaborators,
              ic.ig_account_id as conn_ig_id, ic.access_token as conn_ig_token, ic.ig_username as conn_ig_user
       FROM cronograma_marketing c 
       JOIN instagram_connections ic ON ic.evento_id=c.id_evento 
       WHERE c.auto_publish=true 
       AND c.status IN ('pendente','aprovado','em_andamento') 
       AND c.data_publicacao::text LIKE $1 
       AND c.hora_publicacao IS NOT NULL 
       AND c.hora_publicacao <= $2`,
      [dataHoje+'%', horaAgora+':59']
    );
    
    if(posts.rows.length > 0) console.log('CRON Instagram: '+posts.rows.length+' posts para publicar');
    
    for(const p of posts.rows){
      try{
        if(!p.conn_ig_id || !p.conn_ig_token) {
          console.log('CRON: post #'+p.id+' sem Instagram conectado no evento, pulando');
          continue;
        }
        
        const arqs = await pool.query('SELECT * FROM arquivos WHERE cronograma_id=$1 ORDER BY criado_em',[p.id]);
        if(arqs.rows.length===0) {
          console.log('CRON: post #'+p.id+' sem arquivos, pulando');
          continue;
        }
        
        const baseUrl = 'https://app.314br.com/api';
        const caption = (p.conteudo || p.titulo || '');
        const images = arqs.rows.filter(a => a.tipo && a.tipo.startsWith('image'));
        const videos = arqs.rows.filter(a => a.tipo && a.tipo.startsWith('video'));
        
        const collabs = p.collaborators ? p.collaborators.split(',').map(c => c.trim().replace(/^@/,'')).filter(Boolean) : [];
        console.log('CRON: publicando post #'+p.id+' ('+p.titulo+') no @'+p.conn_ig_user+' [igId:'+p.conn_ig_id+'] images:'+images.length+' videos:'+videos.length+(collabs.length ? ' collabs:'+collabs.join(',') : ''));

        if(videos.length > 0) await publicarReelsInstagram(baseUrl + videos[0].url, caption, p.conn_ig_id, p.conn_ig_token, collabs);
        else if(images.length > 1) await publicarCarrosselInstagram(images.map(a => baseUrl + a.url), caption, p.conn_ig_id, p.conn_ig_token, collabs);
        else if(images.length === 1) await publicarInstagram(baseUrl + images[0].url, caption, p.conn_ig_id, p.conn_ig_token, collabs);
        else continue;
        
        await pool.query("UPDATE cronograma_marketing SET status='publicado', auto_publish=false WHERE id=$1",[p.id]);
        console.log('✅ CRON: publicado post #'+p.id+' - '+p.titulo);
        
        // Auto-adicionar ao funil se ativo
        autoAddToFunnel(p.id, p.id_evento, p.conn_ig_id, p.conn_ig_token, p.org_id);
        
        // Auto-boost se ativado
        if(p.boost_enabled) {
          try {
            const igPostsRes = await fetch('https://graph.instagram.com/'+p.conn_ig_id+'/media?fields=id&limit=1&access_token='+p.conn_ig_token);
            const igPosts = await igPostsRes.json();
            if(igPosts.data && igPosts.data.length > 0) {
              const boostResult = await criarCampanhaAds(igPosts.data[0].id, p.titulo, p.boost_budget||2000, p.boost_duration||3, p.boost_age_min||18, p.boost_age_max||45, p.boost_cities||'', p.conn_ig_id);
              await pool.query("UPDATE cronograma_marketing SET boost_status='active', boost_campaign_id=$1 WHERE id=$2",[boostResult.campaignId, p.id]);
              console.log('🚀 CRON: boost ativado post #'+p.id+' campanha #'+boostResult.campaignId);
            }
          } catch(boostErr) { console.error('❌ CRON boost erro post #'+p.id+':',boostErr.message) }
        }
      }catch(e2){console.error('❌ CRON erro post #'+p.id+':',e2.message)}
    }
  }catch(e){console.error('CRON erro geral:',e.message)}
}, 60000);


// === PLANEJAMENTO SEMANAL ===
router.get('/api/eventos/:id/planejamentos',auth,async(req,res)=>{try{
const r=await pool.query(`SELECT ps.*, u1.nome as criado_por_nome, u2.nome as aprovado_por_nome FROM planejamento_semanal ps LEFT JOIN usuarios u1 ON ps.criado_por=u1.id LEFT JOIN usuarios u2 ON ps.aprovado_por=u2.id WHERE ps.id_evento=$1 AND ps.org_id=$2 ORDER BY ps.semana_inicio DESC`,[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.get('/api/planejamentos/:id',auth,async(req,res)=>{try{
const plan=await pool.query(`SELECT ps.*, u1.nome as criado_por_nome, u2.nome as aprovado_por_nome FROM planejamento_semanal ps LEFT JOIN usuarios u1 ON ps.criado_por=u1.id LEFT JOIN usuarios u2 ON ps.aprovado_por=u2.id WHERE ps.id=$1 AND ps.org_id=$2`,[req.params.id,req.user.org_id]);
if(!plan.rows.length) return res.status(404).json({erro:'Planejamento nao encontrado'});
const p=plan.rows[0];
const posts=await pool.query(`SELECT * FROM cronograma_marketing WHERE id_evento=$1 AND org_id=$2 AND data_publicacao>=$3 AND data_publicacao<=$4 ORDER BY data_publicacao,hora_publicacao`,[p.id_evento,req.user.org_id,p.semana_inicio,p.semana_fim]);
res.json({...p,posts:posts.rows})}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/planejamentos',auth,async(req,res)=>{try{
const{semana_inicio,semana_fim,estrategia}=req.body;
if(!semana_inicio||!semana_fim) return res.status(400).json({erro:'semana_inicio e semana_fim obrigatorios'});
const existe=await pool.query('SELECT id FROM planejamento_semanal WHERE org_id=$1 AND id_evento=$2 AND semana_inicio=$3',[req.user.org_id,req.params.id,semana_inicio]);
if(existe.rows.length) return res.status(400).json({erro:'Ja existe um planejamento para esta semana'});
const r=await pool.query(`INSERT INTO planejamento_semanal(org_id,id_evento,semana_inicio,semana_fim,estrategia,status,criado_por) VALUES($1,$2,$3,$4,$5,'rascunho',$6) RETURNING *`,[req.user.org_id,req.params.id,semana_inicio,semana_fim,estrategia||'',req.user.id]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/planejamentos/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['estrategia','status','feedback'].forEach(k=>{if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
if(b.status==='aprovado'){fields.push('aprovado_por=$'+idx);vals.push(req.user.id);idx++}
fields.push('atualizado_em=NOW()');
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE planejamento_semanal SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/planejamentos/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM planejamento_semanal WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === MATERIAIS DE MARKETING ===
router.get('/api/eventos/:id/materiais',auth,async(req,res)=>{try{
const r=await pool.query('SELECT * FROM materiais_marketing WHERE id_evento=$1 AND org_id=$2 ORDER BY criado_em DESC',[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/materiais',auth,async(req,res)=>{try{
const b=req.body;
const r=await pool.query('INSERT INTO materiais_marketing(org_id,id_evento,nome,categoria,status,atribuido_para,data_vencimento,notas) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
[req.user.org_id,req.params.id,b.nome,b.categoria||'',b.status||'pendente',b.atribuido_para||'',b.data_vencimento||'',b.notas||'']);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/materiais/:id',auth,async(req,res)=>{try{
const b=req.body;const fields=[];const vals=[];let idx=1;
['nome','categoria','status','atribuido_para','data_vencimento','notas'].forEach(function(k){if(b[k]!==undefined){fields.push(k+'=$'+idx);vals.push(b[k]);idx++}});
if(b.concluido!==undefined){fields.push('concluido=$'+idx);vals.push(b.concluido);idx++}
vals.push(parseInt(req.params.id));vals.push(req.user.org_id);
const r=await pool.query('UPDATE materiais_marketing SET '+fields.join(',')+' WHERE id=$'+idx+' AND org_id=$'+(idx+1)+' RETURNING *',vals);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/materiais/:id',auth,async(req,res)=>{try{
await pool.query('DELETE FROM materiais_marketing WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

// === ARQUIVOS MATERIAIS ===
router.get('/api/eventos/:id/materiais-arquivos',auth,async(req,res)=>{try{
const r=await pool.query(`SELECT a.*,u.nome as enviado_nome FROM arquivos a LEFT JOIN usuarios u ON a.enviado_por=u.id WHERE a.evento_id=$1 AND a.org_id=$2 AND a.categoria_material!='' ORDER BY a.categoria_material,a.criado_em DESC`,[req.params.id,req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/eventos/:id/materiais-arquivos',auth,function(req,res,next){upload.single('arquivo')(req,res,function(err){if(err)return res.status(400).json({erro:err.message});next()})},async(req,res)=>{try{
if(!req.file)return res.status(400).json({erro:'Arquivo obrigatorio'});
const url='/uploads/'+req.file.filename;
const categoria=req.body.categoria||'Geral';
const r=await pool.query('INSERT INTO arquivos(org_id,evento_id,nome_original,nome_arquivo,tipo,tamanho,url,enviado_por,categoria_material) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
[req.user.org_id,req.params.id,req.file.originalname,req.file.filename,req.file.mimetype,req.file.size,url,req.user.id,categoria]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

// === IA MARKETING (PORTUGUES) ===
router.post('/api/eventos/:id/ia/briefing',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM eventos WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({erro:'Evento nao encontrado'});
const evento=ev.rows[0];
const{tipo,contexto_extra}=req.body;
const dims={post:'1080x1080',stories:'1080x1920',reels:'1080x1920',banner:'1920x1080',flyer:'1080x1520',video:'1920x1080'};
const sups=await pool.query('SELECT nome,categoria,status FROM fornecedores WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const desp=await pool.query('SELECT COALESCE(SUM(valor),0) as total, COUNT(*) as qtd FROM despesas WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const briefs=await pool.query('SELECT titulo,tipo,status FROM briefings WHERE id_evento=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const org=await pool.query('SELECT nome FROM organizacoes WHERE id=$1',[req.user.org_id]);
var fornecedoresInfo=sups.rows.map(function(s){return s.nome+' ('+s.categoria+' - '+s.status+')'}).join(', ');
var briefsExistentes=briefs.rows.map(function(b){return b.titulo+' ('+b.tipo+' - '+b.status+')'}).join(', ');
var prompt='Voce e um diretor criativo SENIOR especialista em marketing de eventos e festas no Brasil. Voce cria briefings altamente detalhados, criativos e PRATICOS para designers e equipes de social media. Voce conhece profundamente o mercado brasileiro de eventos.\n\n';
prompt+='=== DADOS COMPLETOS DO EVENTO ===\n';
prompt+='Nome: '+evento.nome+'\n';
prompt+='Produtora: '+(org.rows.length?org.rows[0].nome:'')+'\n';
if(evento.tipo_evento)prompt+='Tipo: '+evento.tipo_evento+'\n';
if(evento.data_evento)prompt+='Data: '+evento.data_evento+'\n';
if(evento.hora_evento)prompt+='Horario inicio: '+evento.hora_evento+'\n';
if(evento.hora_abertura)prompt+='Abertura portoes: '+evento.hora_abertura+'\n';
if(evento.local_evento)prompt+='Local: '+evento.local_evento+'\n';
if(evento.cidade)prompt+='Cidade: '+evento.cidade+'\n';
if(evento.descricao)prompt+='Descricao: '+evento.descricao+'\n';
if(evento.atracoes)prompt+='Atracoes: '+evento.atracoes+'\n';
if(evento.publico_alvo)prompt+='Publico-alvo: '+evento.publico_alvo+'\n';
if(evento.capacidade)prompt+='Capacidade: '+evento.capacidade+' pessoas\n';
if(evento.classificacao)prompt+='Classificacao: '+evento.classificacao+'\n';
if(evento.info_lotes)prompt+='Lotes/Ingressos: '+evento.info_lotes+'\n';
if(evento.data_abertura_vendas)prompt+='Abertura vendas: '+evento.data_abertura_vendas+(evento.hora_abertura_vendas?' as '+evento.hora_abertura_vendas:'')+'\n';
if(evento.promo_abertura)prompt+='Promocao abertura: '+evento.promo_abertura+'\n';
if(evento.pontos_venda)prompt+='Pontos de venda: '+evento.pontos_venda+'\n';
if(evento.observacoes)prompt+='Observacoes: '+evento.observacoes+'\n';
prompt+='Orcamento investido: R$ '+parseFloat(desp.rows[0].total).toFixed(2)+' ('+desp.rows[0].qtd+' despesas)\n';
if(fornecedoresInfo)prompt+='Fornecedores: '+fornecedoresInfo+'\n';
if(briefsExistentes)prompt+='Briefings ja criados (NAO repetir): '+briefsExistentes+'\n';
if(contexto_extra)prompt+='\n=== DIRECIONAMENTO DO PRODUTOR ===\n'+contexto_extra+'\n';
prompt+='\n=== TAREFA ===\n';
prompt+='Crie um briefing criativo COMPLETO para um '+(tipo||'post')+' (dimensoes: '+(dims[tipo]||'1080x1080')+') de divulgacao deste evento.\n\n';
prompt+='O briefing deve ser PRATICO e DIRETO para o designer executar. Considere:\n';
prompt+='- Tendencias atuais de design para eventos no Brasil (neon, gradientes, tipografia bold, efeitos de luz)\n';
prompt+='- O publico-alvo tipico de eventos deste tipo (idade, comportamento, plataformas que usam)\n';
prompt+='- Gatilhos de urgencia e escassez (lotes, VIP, countdown)\n';
prompt+='- Copy persuasiva com emojis estrategicos para redes sociais\n';
prompt+='- Paleta de cores sugerida (codigos hex)\n';
prompt+='- Referencias visuais especificas (nao generico, cite estilos como "estetica Tomorrowland", "vibe sertanejo universitario", etc)\n';
prompt+='- CTA (call to action) claro\n';
prompt+='- Hashtags relevantes\n\n';
prompt+='Responda APENAS em JSON valido (sem markdown, sem ```), com EXATAMENTE estes campos:\n';
prompt+='{\n';
prompt+='  "titulo": "titulo chamativo para a peca",\n';
prompt+='  "descricao": "descricao detalhada do que o designer deve criar (min 100 palavras)",\n';
prompt+='  "publico_alvo": "descricao detalhada do publico (idade, perfil, comportamento)",\n';
prompt+='  "mensagem_chave": "a copy principal que deve estar na peca",\n';
prompt+='  "copy_complementar": "textos secundarios, CTA, informacoes de data/local",\n';
prompt+='  "paleta_cores": ["#hex1", "#hex2", "#hex3", "#hex4"],\n';
prompt+='  "referencias_visuais": "referencias especificas de estilo visual",\n';
prompt+='  "hashtags": "#hashtag1 #hashtag2 #hashtag3",\n';
prompt+='  "dicas_designer": "instrucoes tecnicas para o designer (fontes, efeitos, composicao)",\n';
prompt+='  "tom_comunicacao": "descricao do tom (ex: jovem e energetico, sofisticado e premium)"\n';
prompt+='}';
const r=await axios.post('https://api.anthropic.com/v1/messages',{model:'claude-sonnet-4-20250514',max_tokens:2000,messages:[{role:'user',content:prompt}]},{headers:{'x-api-key':CLAUDE,'anthropic-version':'2023-06-01','Content-Type':'application/json'}});
const txt=r.data.content.map(function(b){return b.text||''}).join('').replace(/```json|```/g,'').trim();
const briefing=JSON.parse(txt);briefing.tipo=tipo||'post';briefing.dimensoes=dims[tipo]||'1080x1080';briefing.status='pendente';
res.json(briefing)}catch(e){console.error(e);res.status(500).json({erro:e.message})}});


router.post('/api/events/:id/ai/briefing',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM events WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({error:'X'});
const evento=ev.rows[0];const{type}=req.body;
const dims={post:'1080x1080',stories:'1080x1920',reels:'1080x1920',banner:'1920x1080',flyer:'1080x1520',video:'1920x1080'};
const prompt='Voce e um especialista em marketing de eventos. Gere um briefing criativo para um '+(type||'post')+' de divulgacao do evento "'+evento.name+'". Responda APENAS em JSON valido sem markdown, com os campos: title, description, target_audience, key_message, visual_references. Seja criativo e especifico para o mercado de eventos brasileiro.';
const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
const data=await r.json();const txt=data.content[0].text.replace(/```json|```/g,'').trim();
const briefing=JSON.parse(txt);briefing.type=type||'post';briefing.dimensions=dims[type]||'1080x1080';briefing.status='pendente';
res.json(briefing)}catch(e){console.error(e);res.status(500).json({error:e.message})}});

router.get('/api/events/:id/ai/alerts',auth,async(req,res)=>{try{
const sups=await pool.query('SELECT * FROM suppliers WHERE event_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const exps=await pool.query('SELECT * FROM expenses WHERE event_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const alerts=[];const hoje=new Date();const cats=sups.rows.map(function(s){return s.category});
sups.rows.forEach(function(s){
if(s.due_date){var d=new Date(s.due_date);if(d<hoje&&s.status!=='confirmado'&&s.status!=='cancelado')alerts.push({type:'vencido',severity:'alta',icon:'\u{1F534}',msg:'Fornecedor "'+s.name+'" com prazo vencido ('+s.due_date+')'})}
if(!s.paid&&s.valor>0&&s.status==='confirmado')alerts.push({type:'pagamento',severity:'alta',icon:'\u{1F4B0}',msg:'Fornecedor "'+s.name+'" confirmado mas NAO PAGO'});
if(s.status==='pendente')alerts.push({type:'pendente',severity:'media',icon:'\u{1F7E1}',msg:'Fornecedor "'+s.name+'" ainda pendente'})});
['Seguranca','Estrutura','Alimentacao/Bebidas'].forEach(function(c){if(cats.indexOf(c)===-1)alerts.push({type:'faltando',severity:'alta',icon:'\u26A0\uFE0F',msg:'Categoria "'+c+'" sem fornecedor'})});
alerts.sort(function(a,b){var p={alta:0,media:1,baixa:2};return(p[a.severity]||2)-(p[b.severity]||2)});
res.json({alerts:alerts,summary:{total:alerts.length,alta:alerts.filter(function(a){return a.severity==='alta'}).length}})}catch(e){res.status(500).json({error:e.message})}});

router.get('/api/events/:id/ai/report',auth,async(req,res)=>{try{
const ev=await pool.query('SELECT * FROM events WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
if(!ev.rows.length)return res.status(404).json({error:'X'});
const evento=ev.rows[0];
const exps=await pool.query('SELECT * FROM expenses WHERE event_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
const sups=await pool.query('SELECT * FROM suppliers WHERE event_id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
var byCenter={};var totalExp=0;
exps.rows.forEach(function(e){var c=e.centro_custo||'Outros';if(!byCenter[c])byCenter[c]={total:0,count:0};byCenter[c].total+=parseFloat(e.valor||0);byCenter[c].count++;totalExp+=parseFloat(e.valor||0)});
var totalSup=sups.rows.reduce(function(a,s){return a+parseFloat(s.valor||0)},0);
var paidSup=sups.rows.filter(function(s){return s.paid}).reduce(function(a,s){return a+parseFloat(s.valor||0)},0);
var prompt='Analise estes dados do evento "'+evento.name+'" e gere resumo executivo em portugues. Total despesas=R$'+totalExp.toFixed(2)+', Fornecedores=R$'+totalSup.toFixed(2)+', Pago=R$'+paidSup.toFixed(2)+'. Categorias: '+JSON.stringify(byCenter)+'. '+sups.rows.length+' fornecedores. Maximo 300 palavras.';
const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,messages:[{role:'user',content:prompt}]})});
const data=await r.json();
res.json({event:evento.name,summary:data.content[0].text,financeiro:{total_despesas:totalExp,total_fornecedores:totalSup,pago:paidSup,pendente:totalSup-paidSup},by_center:byCenter})}catch(e){console.error(e);res.status(500).json({error:e.message})}});

router.post('/api/suppliers/:id/ai/contract',auth,async(req,res)=>{try{
const sup=await pool.query('SELECT s.*,e.name as event_name,o.name as org_name FROM suppliers s JOIN events e ON s.event_id=e.id JOIN organizations o ON s.org_id=o.id WHERE s.id=$1 AND s.org_id=$2',[req.params.id,req.user.org_id]);
if(!sup.rows.length)return res.status(404).json({error:'X'});
const s=sup.rows[0];
var prompt='Gere contrato de prestacao de servicos em portugues. CONTRATANTE: '+s.org_name+'. CONTRATADO: '+s.name+' ('+s.category+'). EVENTO: '+s.event_name+'. VALOR: R$'+parseFloat(s.valor).toFixed(2)+'. SERVICO: '+(s.notes||s.category)+'. Inclua clausulas numeradas. Max 500 palavras.';
const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:2000,messages:[{role:'user',content:prompt}]})});
const data=await r.json();
res.json({contract:data.content[0].text,supplier:s.name,event:s.event_name})}catch(e){console.error(e);res.status(500).json({error:e.message})}});


// === ALIASES ENGLISH ROUTES ===

  return router;
};
