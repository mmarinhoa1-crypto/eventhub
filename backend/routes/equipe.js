const express = require('express');
module.exports = function({ pool, bcrypt, auth }) {
  const router = express.Router();

// === GESTAO DE EQUIPE ===

router.get('/api/equipe/por-funcao/:funcao',auth,async(req,res)=>{try{
const r=await pool.query('SELECT id,nome,email,funcao FROM usuarios WHERE org_id=$1 AND funcao=$2 ORDER BY nome',[req.user.org_id,req.params.funcao]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});
router.get('/api/equipe',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const r=await pool.query('SELECT id,nome,email,funcao,criado_em FROM usuarios WHERE org_id=$1 ORDER BY criado_em',[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/equipe/convidar',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const{nome,email,senha,funcao}=req.body;
if(!nome||!email||!senha)return res.status(400).json({erro:'Nome, email e senha obrigatorios'});
const existe=await pool.query('SELECT id FROM usuarios WHERE email=$1',[email]);
if(existe.rows.length)return res.status(400).json({erro:'Email ja cadastrado'});
const funcoesValidas=['admin','agent','designer','social_media','diretor','viewer'];
const funcaoUsuario=funcoesValidas.includes(funcao)?funcao:'agent';
if(req.user.role==='diretor'&&funcaoUsuario!=='designer'&&funcaoUsuario!=='social_media')return res.status(403).json({erro:'Diretor so pode criar designer ou social media'});
const hash=await bcrypt.hash(senha,10);
const r=await pool.query('INSERT INTO usuarios(org_id,nome,email,hash_senha,funcao) VALUES($1,$2,$3,$4,$5) RETURNING id,nome,email,funcao',[req.user.org_id,nome,email,hash,funcaoUsuario]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/equipe/:id',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
if(parseInt(req.params.id)===req.user.id)return res.status(400).json({erro:'Nao pode remover a si mesmo'});
await pool.query('DELETE FROM usuarios WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true})}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/equipe/:id',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const{funcao}=req.body;
const funcoesValidas=['admin','agent','designer','social_media','diretor','viewer'];
if(!funcoesValidas.includes(funcao))return res.status(400).json({erro:'Funcao invalida'});
// Diretor nao pode alterar admin
if(req.user.role==='diretor'){const alvo=await pool.query('SELECT funcao FROM usuarios WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);if(alvo.rows[0]&&alvo.rows[0].funcao==='admin')return res.status(403).json({erro:'Sem permissao para alterar admin'})}
const r=await pool.query('UPDATE usuarios SET funcao=$1 WHERE id=$2 AND org_id=$3 RETURNING id,nome,email,funcao',[funcao,req.params.id,req.user.org_id]);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

  return router;
};
