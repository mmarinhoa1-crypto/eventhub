const express = require('express');

module.exports = function({ pool, auth }) {
  const router = express.Router();

// === CRUD CATEGORIAS FINANCEIRAS ===

router.get('/api/categorias-financeiras',auth,async(req,res)=>{try{
const r=await pool.query('SELECT id,nome,ordem FROM categorias_financeiras WHERE org_id=$1 ORDER BY ordem,nome',[req.user.org_id]);
res.json(r.rows)}catch(e){res.status(500).json({erro:e.message})}});

router.post('/api/categorias-financeiras',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const nome=String(req.body.nome||'').trim();
if(!nome)return res.status(400).json({erro:'Nome obrigatorio'});
const ordem=Number(req.body.ordem)||0;
try{
  const r=await pool.query('INSERT INTO categorias_financeiras(org_id,nome,ordem) VALUES($1,$2,$3) RETURNING *',[req.user.org_id,nome,ordem]);
  res.json(r.rows[0]);
}catch(e){
  if(e.code==='23505')return res.status(400).json({erro:'Ja existe categoria com esse nome'});
  throw e;
}
}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/categorias-financeiras/:id',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const sets=[];const vals=[];let idx=1;
if(req.body.nome!==undefined){
  const nome=String(req.body.nome).trim();
  if(!nome)return res.status(400).json({erro:'Nome nao pode ser vazio'});
  sets.push(`nome=$${idx++}`);vals.push(nome);
}
if(req.body.ordem!==undefined){
  sets.push(`ordem=$${idx++}`);vals.push(Number(req.body.ordem)||0);
}
if(sets.length===0)return res.status(400).json({erro:'Nada a atualizar'});
vals.push(req.params.id);vals.push(req.user.org_id);
try{
  const r=await pool.query(`UPDATE categorias_financeiras SET ${sets.join(',')} WHERE id=$${idx} AND org_id=$${idx+1} RETURNING *`,vals);
  if(r.rowCount===0)return res.status(404).json({erro:'Categoria nao encontrada'});
  res.json(r.rows[0]);
}catch(e){
  if(e.code==='23505')return res.status(400).json({erro:'Ja existe categoria com esse nome'});
  throw e;
}
}catch(e){res.status(500).json({erro:e.message})}});

router.delete('/api/categorias-financeiras/:id',auth,async(req,res)=>{try{
if(req.user.role!=='admin'&&req.user.role!=='diretor')return res.status(403).json({erro:'Sem permissao'});
const r=await pool.query('DELETE FROM categorias_financeiras WHERE id=$1 AND org_id=$2',[req.params.id,req.user.org_id]);
res.json({sucesso:true,removidas:r.rowCount})}catch(e){res.status(500).json({erro:e.message})}});

  return router;
};
