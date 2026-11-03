const express=require('express');
const cors=require('cors');
const multer=require('multer');
const path=require('path');
const fs=require('fs');
const crypto=require('crypto');
const {Pool}=require('pg');

const app=express();
const PORT=process.env.PORT||5000;
const UPLOAD_DIR=path.join(__dirname,'uploads');
const APPLICATION_DIR=path.join(__dirname,'..','Application');
fs.mkdirSync(UPLOAD_DIR,{recursive:true});
fs.mkdirSync(APPLICATION_DIR,{recursive:true});
const LOGIN_ROOT=path.join(APPLICATION_DIR);
function safeEmailKey(email){return String(email||'').toLowerCase().trim().replace(/[^a-z0-9._-]/g,'_').slice(0,100)}
function hashPassword(password,salt){return crypto.scryptSync(password,salt,64).toString('hex')}
function issueToken(user){const payload=Buffer.from(JSON.stringify({id:user.id,email:user.email,exp:Date.now()+1000*60*60*24})).toString('base64url');const sig=crypto.createHmac('sha256',process.env.SESSION_SECRET||'nidhiroute-demo-secret-change-me').update(payload).digest('base64url');return payload+'.'+sig}
function verifyToken(token){try{const [p,s]=String(token||'').split('.');if(!p||!s)return null;const expected=crypto.createHmac('sha256',process.env.SESSION_SECRET||'nidhiroute-demo-secret-change-me').update(p).digest('base64url');if(!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(expected)))return null;const data=JSON.parse(Buffer.from(p,'base64url').toString());if(data.exp<Date.now())return null;return data}catch(e){return null}}
function readAccounts(){const out=[];if(!fs.existsSync(LOGIN_ROOT))return out;for(const name of fs.readdirSync(LOGIN_ROOT)){const f=path.join(LOGIN_ROOT,name,'login info','account.json');if(fs.existsSync(f)){try{out.push(JSON.parse(fs.readFileSync(f,'utf8')))}catch{}}}return out}
function accountPath(name){return path.join(LOGIN_ROOT,safeFolderName(name),'login info')}

function safeFolderName(name){const clean=String(name||'Applicant').replace(/[<>:"/\\|?*\x00-\x1f]/g,' ').replace(/\s+/g,' ').trim();return (clean||'Applicant').slice(0,120)}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use('/uploads',express.static(UPLOAD_DIR));

const pool=process.env.DATABASE_URL?new Pool({
 connectionString:process.env.DATABASE_URL,
 ssl:process.env.DATABASE_SSL==='true'?{rejectUnauthorized:false}:undefined
}):null;

const upload=multer({
 storage:multer.diskStorage({
  destination:(req,file,cb)=>cb(null,UPLOAD_DIR),
  filename:(req,file,cb)=>cb(null,Date.now()+'-'+crypto.randomBytes(5).toString('hex')+path.extname(file.originalname).toLowerCase())
 }),
 limits:{fileSize:10*1024*1024},
 fileFilter:(req,file,cb)=>{
  const allowed=['application/pdf','image/jpeg','image/png','image/webp'];
  cb(null,allowed.includes(file.mimetype));
 }
});

const memory={applications:new Map(),documents:new Map()};
function id(prefix){return prefix+'-'+crypto.randomBytes(6).toString('hex').toUpperCase()}

async function query(text,params=[]){if(!pool)return null;return pool.query(text,params)}

app.get('/api/health',async(req,res)=>res.json({ok:true,backend:'NidhiRoute AI API',database:!!pool}));

function publicUser(a){return {name:a.name,email:a.email,createdAt:a.createdAt}}
function validEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email||'').trim())}

app.post('/api/auth/signup',async(req,res)=>{
 try{
  const name=String(req.body.name||'').trim();
  const email=String(req.body.email||'').trim().toLowerCase();
  const password=String(req.body.password||'');
  if(name.length<2)return res.status(400).json({message:'Please enter a valid applicant name.'});
  if(!validEmail(email))return res.status(400).json({message:'Please enter a valid email address.'});
  if(password.length<8)return res.status(400).json({message:'Password must be at least 8 characters.'});
  const accounts=readAccounts();
  if(accounts.some(a=>String(a.email||'').toLowerCase()===email))return res.status(409).json({message:'An account with this email already exists. Please sign in.'});
  const salt=crypto.randomBytes(16).toString('hex');
  const record={id:id('USR'),name,email,salt,passwordHash:hashPassword(password,salt),createdAt:new Date().toISOString()};
  const dir=accountPath(name);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'account.json'),JSON.stringify(record,null,2),'utf8');
  const token=issueToken(record);
  res.status(201).json({ok:true,token,user:publicUser(record)});
 }catch(e){console.error(e);res.status(500).json({message:'Unable to create account.'})}
});

app.post('/api/auth/login',async(req,res)=>{
 try{
  const email=String(req.body.email||'').trim().toLowerCase();
  const password=String(req.body.password||'');
  if(!validEmail(email)||!password)return res.status(400).json({message:'Enter your email and password.'});
  const account=readAccounts().find(a=>String(a.email||'').toLowerCase()===email);
  if(!account)return res.status(401).json({message:'Invalid email or password.'});
  const candidate=hashPassword(password,account.salt);
  if(candidate!==account.passwordHash)return res.status(401).json({message:'Invalid email or password.'});
  const token=issueToken(account);
  res.json({ok:true,token,user:publicUser(account)});
 }catch(e){console.error(e);res.status(500).json({message:'Unable to sign in.'})}
});

app.get('/api/auth/me',async(req,res)=>{
 const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
 const payload=verifyToken(token);
 if(!payload)return res.status(401).json({message:'Session expired or invalid.'});
 const account=readAccounts().find(a=>a.id===payload.id && String(a.email).toLowerCase()===String(payload.email).toLowerCase());
 if(!account)return res.status(401).json({message:'Account not found.'});
 res.json({ok:true,user:publicUser(account)});
});

app.post('/api/applications',async(req,res)=>{
 const {category,income,purpose,cost,location,tenure,schemeKey,schemeName,matchScore}=req.body;
 if(!category||!purpose||!cost)return res.status(400).json({error:'Missing required application fields'});
 const applicationId=id('NRA');
 const row={applicationId,category,income:Number(income),purpose,cost:Number(cost),location,tenure:Number(tenure),schemeKey,schemeName,matchScore:Number(matchScore||0),status:'Profile & scheme selected',createdAt:new Date().toISOString()};
 memory.applications.set(applicationId,row);
 if(pool){
  await query(`INSERT INTO applications(application_id,category,income,purpose,cost,location,tenure,scheme_key,scheme_name,match_score,status)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
  [applicationId,category,Number(income),purpose,Number(cost),location,Number(tenure),schemeKey,schemeName,Number(matchScore||0),row.status]);
 }
 res.json({ok:true,applicationId,status:row.status});
});

app.get('/api/applications/:id',async(req,res)=>{
 const idv=req.params.id;
 if(pool){const r=await query('SELECT * FROM applications WHERE application_id=$1',[idv]);if(r.rows[0])return res.json({ok:true,application:r.rows[0]})}
 const a=memory.applications.get(idv);if(!a)return res.status(404).json({error:'Application not found'});res.json({ok:true,application:a});
});

app.post('/api/documents',upload.single('document'),async(req,res)=>{
 if(!req.file)return res.status(400).json({error:'Valid PDF/JPG/PNG document is required'});
 const applicationId=req.body.applicationId,documentType=req.body.documentType,applicantName=req.body.applicantName,aiVerified=String(req.body.aiVerified||'').toLowerCase()==='true';
 if(!applicationId||!documentType){fs.unlinkSync(req.file.path);return res.status(400).json({error:'applicationId and documentType are required'})}
 if(!aiVerified){fs.unlinkSync(req.file.path);return res.status(400).json({error:'Document must pass AI verification before submission'})}
 const applicantFolder=safeFolderName(applicantName||'Applicant');
 const applicantDir=path.join(APPLICATION_DIR,applicantFolder);
 fs.mkdirSync(applicantDir,{recursive:true});
 const finalName=Date.now()+'-'+crypto.randomBytes(5).toString('hex')+path.extname(req.file.originalname).toLowerCase();
 const finalPath=path.join(applicantDir,finalName);
 fs.renameSync(req.file.path,finalPath);
 const documentId=id('DOC');
 const row={documentId,applicationId,documentType,originalName:req.file.originalname,storedName:finalName,mimeType:req.file.mimetype,size:req.file.size,status:'Verified',applicantName:applicantFolder,storedPath:finalPath,uploadedAt:new Date().toISOString(),verifiedAt:new Date().toISOString()};
 memory.documents.set(documentId,row);
 if(pool){
  await query(`INSERT INTO documents(document_id,application_id,document_type,original_name,stored_name,mime_type,file_size,status)
  VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[documentId,applicationId,documentType,req.file.originalname,finalName,req.file.mimetype,req.file.size,row.status]);
 }
 res.json({ok:true,document:{...row,folder:'Application/'+applicantFolder}});
});

app.get('/api/applications/:id/documents',async(req,res)=>{
 if(pool){const r=await query('SELECT * FROM documents WHERE application_id=$1 ORDER BY uploaded_at DESC',[req.params.id]);return res.json({ok:true,documents:r.rows})}
 res.json({ok:true,documents:[...memory.documents.values()].filter(x=>x.applicationId===req.params.id)});
});

app.post('/api/applications/:id/submit',async(req,res)=>{
 const applicationId=req.params.id,applicantName=safeFolderName(req.body.applicantName||'Applicant');
 let docs=[];
 if(pool){const r=await query("SELECT * FROM documents WHERE application_id=$1",[applicationId]);docs=r.rows;}else docs=[...memory.documents.values()].filter(x=>x.applicationId===applicationId);
 if(!docs.length)return res.status(400).json({error:'No documents have been submitted'});
 if(docs.some(d=>d.status!=='Verified'))return res.status(400).json({error:'Only verified documents can be submitted'});
 if(pool){await query("UPDATE applications SET status='Documents Submitted' WHERE application_id=$1",[applicationId]);}
 const a=memory.applications.get(applicationId);if(a)a.status='Documents Submitted';
 res.json({ok:true,status:'Documents Submitted',applicationId,folder:path.join(APPLICATION_DIR,applicantName)});
});

// Verifier workflow. Protect these endpoints with real admin authentication before production.
app.patch('/api/documents/:id/status',async(req,res)=>{
 const {status,remarks}=req.body;
 if(!['Verified','Rejected','Pending Verification'].includes(status))return res.status(400).json({error:'Invalid status'});
 if(pool){const r=await query('UPDATE documents SET status=$1,remarks=$2,verified_at=CASE WHEN $1=$3 THEN NOW() ELSE NULL END WHERE document_id=$4 RETURNING *',[status,remarks||null,'Verified',req.params.id]);if(!r.rows[0])return res.status(404).json({error:'Document not found'});return res.json({ok:true,document:r.rows[0]})}
 const d=memory.documents.get(req.params.id);if(!d)return res.status(404).json({error:'Document not found'});d.status=status;d.remarks=remarks||'';d.verifiedAt=status==='Verified'?new Date().toISOString():null;res.json({ok:true,document:d});
});

app.get('/api/admin/pending-documents',async(req,res)=>{
 if(pool){const r=await query(`SELECT * FROM documents WHERE status='Pending Verification' ORDER BY uploaded_at ASC`);return res.json({ok:true,documents:r.rows})}
 res.json({ok:true,documents:[...memory.documents.values()].filter(x=>x.status==='Pending Verification')});
});

app.use((err,req,res,next)=>{if(err instanceof multer.MulterError||err){return res.status(400).json({error:err.message||'Upload failed'})}next(err)});
app.listen(PORT,()=>console.log(`NidhiRoute AI API running on http://localhost:${PORT}`));