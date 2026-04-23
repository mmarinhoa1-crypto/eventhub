const express=require('express'),ExcelJS=require('exceljs'),multer=require('multer'),path=require('path'),cors=require('cors'),axios=require('axios'),{Pool}=require('pg'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken');
require('dotenv').config();
const app=express();
app.disable('x-powered-by');app.use(cors({origin:'*'}));app.use(express.json({limit:'10mb'}));

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const EVO=process.env.EVOLUTION_API_URL||'http://evolution_api:8080';
const KEY=process.env.EVOLUTION_API_KEY;
const INST=process.env.EVOLUTION_INSTANCE||'meuwhats';
const INST_MARKETING=process.env.EVOLUTION_INSTANCE_MARKETING||INST;
const CLAUDE=process.env.ANTHROPIC_API_KEY;
const SECRET=process.env.JWT_SECRET||'secret';
const PORT=process.env.PORT||3000;

// Upload config
const storage=multer.diskStorage({destination:function(req,file,cb){cb(null,'/app/uploads')},filename:function(req,file,cb){cb(null,Date.now()+'-'+file.originalname.replace(/[^a-zA-Z0-9.-]/g,'_'))}});
const upload=multer({storage:storage,limits:{fileSize:1024*1024*1024},fileFilter:function(req,file,cb){const ext=['.jpg','.jpeg','.png','.gif','.mp4','.mov','.pdf','.webp'];const ok=ext.includes(path.extname(file.originalname).toLowerCase());ok?cb(null,true):cb(new Error('Tipo nao permitido'))}});
app.use('/uploads',express.static('/app/uploads'));
app.use('/api/uploads',express.static('/app/uploads'));

// === MODULOS DE ROTAS ===
const { router: authRouter, auth } = require('./routes/auth')({ pool, bcrypt, jwt, SECRET });
app.use(authRouter);

app.use(require('./routes/chamados')({ pool, axios, auth, EVO, KEY, INST, CLAUDE }));
app.use(require('./routes/eventos')({ pool, auth }));
app.use(require('./routes/marketing')({ pool, axios, auth, upload, CLAUDE }));
app.use(require('./routes/equipe')({ pool, bcrypt, auth }));
app.use(require('./routes/organizacao')({ pool, axios, auth, EVO, KEY, INST_MARKETING }));
app.use(require('./routes/financeiro')({ pool, ExcelJS, auth }));
app.use(require('./routes/vendas')({ pool, axios, auth }));
app.use(require('./routes/consumo')({ pool, auth }));
app.use(require('./routes/anuncios')({ pool, auth, CLAUDE }));
app.use(require('./routes/notificacoes')({ pool, auth }));
app.use(require('./routes/legacy')({ pool, axios, bcrypt, auth, upload, multer, path, CLAUDE, EVO, KEY, INST }));

// Worker: notificacoes WhatsApp de demandas (cronograma_marketing)
// Usa a instancia de marketing (LAB3) - separada da meuwhats que cuida do financeiro
require('./jobs/notificacoesDemandas').start({ pool, EVO, KEY, INST: INST_MARKETING });

app.listen(PORT,()=>console.log('EventHub rodando na porta '+PORT));
