const express = require('express');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: '/app/uploads/',
  filename: function(req, file, cb) { cb(null, 'avatar-' + req.user.id + '-' + Date.now() + path.extname(file.originalname)) }
});
const avatarUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function(req, file, cb) {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Formato inválido. Apenas PNG e JPEG são aceitos.'));
  }
});

module.exports = function({ pool, bcrypt, auth }) {
  const router = express.Router();

// === GESTAO DE EQUIPE ===

// Validacao de telefone WhatsApp: aceita apenas digitos, formato 55 + DDD + numero (12 ou 13 digitos)
function normalizarTelefone(v){if(v===undefined||v===null)return undefined;const s=String(v).replace(/\D/g,'');return s===''?null:s}
function telefoneValido(s){return s===null||/^55\d{10,11}$/.test(s)}

router.get('/api/equipe/por-funcao/:funcao',auth,async(req,res)=>{try{
const r=await pool.query('SELECT id,nome,email,funcao,foto_url,telefone_whatsapp FROM usuarios WHERE org_id=$1 AND funcao=$2 ORDER BY nome',[req.user.org_id,req.params.funcao]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});
router.get('/api/equipe',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const r=await pool.query('SELECT id,nome,email,funcao,foto_url,telefone_whatsapp,criado_em FROM usuarios WHERE org_id=$1 ORDER BY criado_em',[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/equipe/convidar',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const{nome,email,senha,funcao}=req.body;
if(!nome||!email||!senha)return res.status(400).json({erro:'Nome, email e senha obrigatorios'});
const tel=normalizarTelefone(req.body.telefone_whatsapp);
if(tel!==undefined&&!telefoneValido(tel))return res.status(400).json({erro:'WhatsApp invalido. Use formato 55 + DDD + numero (ex: 5511987654321)'});
const existe=await pool.query('SELECT id FROM usuarios WHERE email=$1',[email]);
if(existe.rows.length)return res.status(400).json({erro:'Email ja cadastrado'});
const funcoesValidas=['admin','agent','designer','social_media','diretor','viewer','gestor_trafego','suporte'];
const funcaoUsuario=funcoesValidas.includes(funcao)?funcao:'agent';
if(req.user.role==='diretor'&&funcaoUsuario!=='designer'&&funcaoUsuario!=='social_media'&&funcaoUsuario!=='gestor_trafego')return res.status(403).json({erro:'Diretor so pode criar designer, social media ou gestor de trafego'});
const hash=await bcrypt.hash(senha,10);
const r=await pool.query('INSERT INTO usuarios(org_id,nome,email,hash_senha,funcao,telefone_whatsapp) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,nome,email,funcao,telefone_whatsapp',[req.user.org_id,nome,email,hash,funcaoUsuario,tel===undefined?null:tel]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/equipe/:id',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
if(parseInt(req.params.id)===req.user.id)return res.status(400).json({erro:'Nao pode remover a si mesmo'});
await pool.query('DELETE FROM usuarios WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/equipe/:id',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const{funcao,nome,email}=req.body;
const telRaw=req.body.telefone_whatsapp;
const tel=normalizarTelefone(telRaw);

// Alterar nome/email/telefone: somente admin
if((nome!==undefined||email!==undefined||telRaw!==undefined)&&req.user.role!=='admin')return res.status(403).json({erro:'Apenas admin pode alterar nome, email e WhatsApp'});

if(nome!==undefined||email!==undefined||telRaw!==undefined){
  if(nome!==undefined&&!nome.trim())return res.status(400).json({erro:'Nome nao pode ser vazio'});
  if(email!==undefined&&!email.trim())return res.status(400).json({erro:'Email nao pode ser vazio'});
  if(telRaw!==undefined&&!telefoneValido(tel))return res.status(400).json({erro:'WhatsApp invalido. Use formato 55 + DDD + numero (ex: 5511987654321)'});
  if(email!==undefined){
    const existe=await pool.query('SELECT id FROM usuarios WHERE email=$1 AND id!=$2',[email.trim(),req.params.id]);
    if(existe.rows.length)return res.status(400).json({erro:'Email ja cadastrado para outro usuario'});
  }
  const sets=[];const vals=[];let idx=1;
  if(nome!==undefined){sets.push(`nome=$${idx++}`);vals.push(nome.trim());}
  if(email!==undefined){sets.push(`email=$${idx++}`);vals.push(email.trim());}
  if(telRaw!==undefined){sets.push(`telefone_whatsapp=$${idx++}`);vals.push(tel);}
  vals.push(req.params.id);vals.push(req.user.org_id);
  const r=await pool.query(`UPDATE usuarios SET ${sets.join(',')} WHERE id=$${idx} AND org_id=$${idx+1} RETURNING id,nome,email,funcao,telefone_whatsapp`,vals);
  return res.json(r.rows[0]);
}

const funcoesValidas=['admin','agent','designer','social_media','diretor','viewer','gestor_trafego','suporte'];
if(!funcoesValidas.includes(funcao))return res.status(400).json({erro:'Funcao invalida'});
// Diretor nao pode alterar admin
if(req.user.role==='diretor'){const alvo=await pool.query('SELECT funcao FROM usuarios WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);if(alvo.rows[0]&&alvo.rows[0].funcao==='admin')return res.status(403).json({erro:'Sem permissao para alterar admin'})}
const r=await pool.query('UPDATE usuarios SET funcao=$1 WHERE id=$2 AND org_id=$3 RETURNING id,nome,email,funcao',[funcao,req.params.id,req.user.org_id]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

// Upload de foto de perfil de um membro (admin/diretor)
router.post('/api/equipe/:id/foto',auth,function(req,res,next){avatarUpload.single('foto')(req,res,function(err){if(err)return res.status(400).json({erro:err.message});next()})},async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
if(!req.file)return res.status(400).json({erro:'Arquivo obrigatório'});
const url='/uploads/'+req.file.filename;
await pool.query('UPDATE usuarios SET foto_url=$1 WHERE id=$2 AND org_id=$3',[url,req.params.id,req.user.org_id]);
res.json({sucesso:true,foto_url:url})}catch(e){res.status(500).json({erro:e.message})}});

// Upload de foto de perfil (próprio usuário)
router.post('/api/equipe/foto',auth,function(req,res,next){avatarUpload.single('foto')(req,res,function(err){if(err)return res.status(400).json({erro:err.message});next()})},async(req,res)=>{try{
if(!req.file)return res.status(400).json({erro:'Arquivo obrigatório'});
const url='/uploads/'+req.file.filename;
await pool.query('UPDATE usuarios SET foto_url=$1 WHERE id=$2',[url,req.user.id]);
res.json({sucesso:true,foto_url:url})}catch(e){res.status(500).json({erro:e.message})}});

// Obter foto do usuário atual
router.get('/api/equipe/me',auth,async(req,res)=>{try{
const r=await pool.query('SELECT id,nome,email,funcao,foto_url,telefone_whatsapp FROM usuarios WHERE id=$1',[req.user.id]);
res.json(r.rows[0]||{})}catch(e){res.status(500).json({erro:e.message})}});

  return router;
};
