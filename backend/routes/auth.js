const express = require('express');

module.exports = function({ pool, bcrypt, jwt, SECRET }) {
  const router = express.Router();

  // MIDDLEWARE DE AUTENTICACAO
  function auth(req,res,next){
    const token=req.headers.authorization?.split(' ')[1];
    if(!token)return res.status(401).json({erro:'Token necessario'});
    try{const d=jwt.verify(token,SECRET);req.user=d;next()}catch(e){res.status(401).json({erro:'Token invalido'})}
  }

  // REGISTRAR
  router.post('/api/auth/registrar',async(req,res)=>{try{
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
  router.post('/api/auth/entrar',async(req,res)=>{try{
    const{email,senha}=req.body;
    if(!email||!senha)return res.status(400).json({erro:'Email e senha obrigatorios'});
    const r=await pool.query('SELECT u.*,o.nome as nome_org,o.slug,o.plano FROM usuarios u JOIN organizacoes o ON u.org_id=o.id WHERE u.email=$1',[email]);
    if(!r.rows.length)return res.status(401).json({erro:'Email ou senha incorretos'});
    const usuario=r.rows[0];
    const valido=await bcrypt.compare(senha,usuario.hash_senha);
    if(!valido)return res.status(401).json({erro:'Email ou senha incorretos'});
    const token=jwt.sign({id:usuario.id,org_id:usuario.org_id,role:usuario.funcao,funcao:usuario.funcao,name:usuario.nome,nome:usuario.nome},SECRET,{expiresIn:'30d'});
    res.json({token,usuario:{id:usuario.id,nome:usuario.nome,email:usuario.email,funcao:usuario.funcao},organizacao:{id:usuario.org_id,nome:usuario.nome_org,plano:usuario.plano}})
  }catch(e){res.status(500).json({erro:e.message})}});

  // EU (dados do usuario autenticado)
  router.get('/api/auth/eu',auth,async(req,res)=>{try{
    const r=await pool.query('SELECT u.id,u.nome,u.email,u.funcao,o.nome as nome_org,o.plano FROM usuarios u JOIN organizacoes o ON u.org_id=o.id WHERE u.id=$1',[req.user.id]);
    if(!r.rows.length)return res.status(404).json({erro:'Usuario nao encontrado'});
    var u=r.rows[0];res.json({usuario:{id:u.id,nome:u.nome,email:u.email,funcao:u.funcao,nome_org:u.nome_org},organizacao:{id:req.user.org_id,nome:u.nome_org,plano:u.plano}})
  }catch(e){res.status(500).json({erro:e.message})}});

  // ENGLISH ALIASES
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
    res.json({usuario:{id:u.id,nome:u.nome,email:u.email,funcao:u.funcao},organizacao:{id:u.org_id,nome:u.nome_org,plano:u.plano}})}catch(e){res.status(500).json({error:e.message})}});

  return { router, auth };
};
