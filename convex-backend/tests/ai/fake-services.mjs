// Fake Anthropic Messages API + fake GitHub REST API, for local end-to-end tests only.
import http from 'node:http'; import crypto from 'node:crypto'; import fs from 'node:fs'; import path from 'node:path';
const ROOT = process.argv[2]; const PORT = 4599; const LOG = process.argv[3];
const sha1 = (s) => crypto.createHash('sha1').update(`blob ${Buffer.byteLength(s)}\0`).update(s).digest('hex');
const blobs = new Map(), trees = new Map(), commits = new Map();
const walk = (d, out=[]) => { for (const e of fs.readdirSync(d,{withFileTypes:true})) { if (e.name==='node_modules'||e.name==='.convex'||e.name==='public'||e.name.startsWith('.env')) continue; const p=path.join(d,e.name); e.isDirectory()?walk(p,out):out.push(p);} return out; };
const base = {}; for (const r of ['frontend','cms_gui','convex-backend']) for (const f of walk(path.join(ROOT,r))) { if (fs.statSync(f).size>300000) continue; const rel=path.relative(ROOT,f); const c=fs.readFileSync(f,'utf8'); const s=sha1(c); blobs.set(s,c); base[rel]=s; }
const treeId=(t)=>crypto.createHash('sha1').update(JSON.stringify(t)).digest('hex');
const t0=treeId(base); trees.set(t0,base); const c0='c'.repeat(39)+'0'; commits.set(c0,{tree:t0,parents:[]}); const state={head:c0,statuses:{},mode:'none',calls:[],script:[]};
// Scripted model: each request gets the next scripted response for the scenario.
const respond=(res,code,obj)=>{res.writeHead(code,{'content-type':'application/json'});res.end(JSON.stringify(obj));};
const msg=(content,stop)=>({id:'msg_'+crypto.randomUUID(),type:'message',role:'assistant',model:'fake',content,stop_reason:stop,stop_sequence:null,usage:{input_tokens:1000,output_tokens:200}});
const toolUse=(name,input)=>({type:'tool_use',id:'toolu_'+crypto.randomUUID().replace(/-/g,''),name,input});
const answer=(res,next)=>{
   if(!next) return respond(res,200,msg([{type:'text',text:'(script empty)'}],'end_turn'));
   if(next.status) return respond(res,next.status,{type:'error',error:{type:'api_error',message:next.message||'boom'}});
   if(next.text) return respond(res,200,msg([{type:'text',text:next.text}],next.stop||'end_turn'));
   return respond(res,200,msg([...(next.thinking?[{type:'thinking',thinking:'',signature:next.thinking}]:[]),...(next.say?[{type:'text',text:next.say}]:[]),...next.tools.map(([n,i])=>toolUse(n,i))],'tool_use'));};
http.createServer((req,res)=>{let b='';req.on('data',d=>b+=d);req.on('end',()=>{ const u=new URL(req.url,'http://x'); const j=b?JSON.parse(b):{};
 if(u.pathname==='/control/script'){state.script=j.script;state.calls=[];return respond(res,200,{ok:1});}
 if(u.pathname==='/control/state'){return respond(res,200,{head:state.head,calls:state.calls,commits:[...commits.entries()].map(([k,v])=>({sha:k,message:v.message,parents:v.parents})),remaining:state.script.length});}
 if(u.pathname==='/control/deploy'){(state.statuses[j.sha]??=[]).push({state:j.state,context:j.context||'Vercel'});return respond(res,200,{ok:1});}
 if(u.pathname==='/control/set'){Object.assign(state,j);return respond(res,200,{ok:1});}
 if(u.pathname==='/control/external-edit'){const t={...trees.get(commits.get(state.head).tree)};const s=sha1(j.content);blobs.set(s,j.content);t[j.path]=s;const id=treeId(t);trees.set(id,t);const c=crypto.randomBytes(20).toString('hex');commits.set(c,{tree:id,parents:[state.head],message:'external'});state.head=c;return respond(res,200,{head:c});}
 if(u.pathname==='/control/file'){const t=trees.get(commits.get(state.head).tree);const s=t[j.path];return respond(res,200,{content:s?blobs.get(s):null});}
 const gm=u.pathname.match(/^\/v1beta\/models\/([^:]+):generateContent$/);
 if(gm){ const next=state.script.shift(); state.calls.push({provider:'google',model:gm[1],contents:j.contents,tools:j.tools,hasKey:!!req.headers['x-goog-api-key']});
   if(next?.status) return respond(res,next.status,{error:{code:next.status,message:next.message||'boom',status:'RESOURCE_EXHAUSTED'}});
   const parts=next?.tools?next.tools.map(([name,args],i)=>({functionCall:{name,args},...(i===0?{thoughtSignature:next.signature||'gem-sig-1'}:{})})):[{text:next?.text||'(script empty)'}];
   return respond(res,200,{candidates:[{content:{role:'model',parts},finishReason:'STOP'}],usageMetadata:{promptTokenCount:1000,candidatesTokenCount:200,totalTokenCount:1200}}); }
 if(u.pathname==='/v1/messages'){ const next=state.script.shift(); if(next?.delay){return setTimeout(()=>answer(res,next),next.delay);} state.calls.push({bodyKeys:Object.keys(j),system:j.system,messages:j.messages,tools:(j.tools||[]).map(t=>t.name),key:req.headers['x-api-key'],model:j.model,tool_choice:j.tool_choice}); if(LOG)fs.appendFileSync(LOG,JSON.stringify(j)+'\n');
   return answer(res,next); }
 const m=u.pathname.match(/^\/repos\/[^/]+\/[^/]+(\/.*)$/); if(m){ const p=m[1]; if(req.headers.authorization!=='Bearer fake-token') return respond(res,401,{message:'bad'});
  let x; if((x=p.match(/^\/git\/ref\/heads\/(.+)$/))) return respond(res,200,{object:{sha:state.head}});
  if((x=p.match(/^\/git\/commits\/([0-9a-f]+)$/))) return respond(res,200,{tree:{sha:commits.get(x[1]).tree}});
  if((x=p.match(/^\/git\/trees\/([0-9a-f]+)$/))){const t=trees.get(x[1]);return respond(res,200,{truncated:!!state.truncated,tree:Object.entries(t).map(([path,sha])=>({path,sha,type:'blob',size:Buffer.byteLength(blobs.get(sha))}))});}
  if((x=p.match(/^\/git\/blobs\/([0-9a-f]+)$/))) return respond(res,200,{encoding:'base64',content:Buffer.from(blobs.get(x[1])).toString('base64')});
  if(p==='/git/trees'&&req.method==='POST'){const t={...trees.get(j.base_tree)};for(const e of j.tree){if(e.sha===null)delete t[e.path];else{const s=sha1(e.content);blobs.set(s,e.content);t[e.path]=s;}}const id=treeId(t);trees.set(id,t);return respond(res,201,{sha:id});}
  if(p==='/git/commits'&&req.method==='POST'){const c=crypto.randomBytes(20).toString('hex');commits.set(c,{tree:j.tree,parents:j.parents,message:j.message});return respond(res,201,{sha:c});}
  if((x=p.match(/^\/git\/refs\/heads\/(.+)$/))&&req.method==='PATCH'){if(j.force) return respond(res,422,{message:'no force expected'}); if(!commits.get(j.sha).parents.includes(state.head)) return respond(res,422,{message:'not fast forward'}); state.head=j.sha;return setTimeout(()=>respond(res,200,{object:{sha:j.sha}}),state.refDelay||0);}
  if((x=p.match(/^\/compare\/([0-9a-f]+)\.\.\.([0-9a-f]+)$/))){const a=trees.get(commits.get(x[1]).tree),c=trees.get(commits.get(x[2]).tree);const files=[...new Set([...Object.keys(a),...Object.keys(c)])].filter(k=>a[k]!==c[k]).map(filename=>({filename}));return respond(res,200,{files});}
  if((x=p.match(/^\/commits\/([0-9a-f]+)\/status$/))){return respond(res,200,{statuses:state.statuses[x[1]]||[]});}
  if((x=p.match(/^\/commits\/([0-9a-f]+)\/check-runs$/))) return respond(res,200,{check_runs:[]});
  return respond(res,404,{message:'nope '+p}); }
 respond(res,404,{});});}).listen(PORT,'127.0.0.1',()=>console.log('fake up'));
