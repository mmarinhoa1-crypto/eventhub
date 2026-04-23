const express = require('express');

module.exports = function({ pool, auth }) {
  const router = express.Router();

// === CONFIGURACAO DA ORGANIZACAO ===

router.get('/api/organizacao',auth,async(req,res)=>{try{
const r=await pool.query('SELECT id,nome,slug,plano,instancia_whatsapp,jid_grupo_equipe FROM organizacoes WHERE id=$1',[req.user.org_id]);
res.json(r.rows[0]||{})}catch(e){res.status(500).json({erro:e.message})}});

router.patch('/api/organizacao',auth,async(req,res)=>{try{
if(req.user.role!=='admin')return res.status(403).json({erro:'Apenas admin pode alterar configuracoes'});
const{jid_grupo_equipe}=req.body;
if(jid_grupo_equipe!==undefined&&jid_grupo_equipe!==null&&jid_grupo_equipe!==''){
  if(typeof jid_grupo_equipe!=='string'||!jid_grupo_equipe.endsWith('@g.us'))return res.status(400).json({erro:'JID invalido. Deve terminar em @g.us'});
}
const sets=[];const vals=[];let idx=1;
if(jid_grupo_equipe!==undefined){sets.push(`jid_grupo_equipe=$${idx++}`);vals.push(jid_grupo_equipe||null);}
if(sets.length===0)return res.status(400).json({erro:'Nada a atualizar'});
vals.push(req.user.org_id);
const r=await pool.query(`UPDATE organizacoes SET ${sets.join(',')} WHERE id=$${idx} RETURNING id,nome,slug,plano,instancia_whatsapp,jid_grupo_equipe`,vals);
res.json(r.rows[0])}catch(e){res.status(500).json({erro:e.message})}});

  return router;
};
