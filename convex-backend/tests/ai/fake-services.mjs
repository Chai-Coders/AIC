// Fake Anthropic and Gemini APIs, for local end-to-end tests only.
import http from 'node:http'; import crypto from 'node:crypto';
const PORT = 4599;
const state={calls:[],script:[]};
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
 if(u.pathname==='/control/state'){return respond(res,200,{calls:state.calls,remaining:state.script.length});}
 const gm=u.pathname.match(/^\/v1beta\/models\/([^:]+):generateContent$/);
 if(gm){ const next=state.script.shift(); state.calls.push({provider:'google',model:gm[1],contents:j.contents,tools:j.tools,hasKey:!!req.headers['x-goog-api-key']});
   if(next?.status) return respond(res,next.status,{error:{code:next.status,message:next.message||'boom',status:'RESOURCE_EXHAUSTED'}});
   const parts=next?.tools?next.tools.map(([name,args],i)=>({functionCall:{name,args},...(i===0?{thoughtSignature:next.signature||'gem-sig-1'}:{})})):[{text:next?.text||'(script empty)'}];
   return respond(res,200,{candidates:[{content:{role:'model',parts},finishReason:'STOP'}],usageMetadata:{promptTokenCount:1000,candidatesTokenCount:200,totalTokenCount:1200}}); }
 if(u.pathname==='/v1/messages'){ const next=state.script.shift(); if(next?.delay){return setTimeout(()=>answer(res,next),next.delay);} state.calls.push({bodyKeys:Object.keys(j),system:j.system,messages:j.messages,tools:(j.tools||[]).map(t=>t.name),key:req.headers['x-api-key'],model:j.model,tool_choice:j.tool_choice});
   return answer(res,next); }
 respond(res,404,{});});}).listen(PORT,'127.0.0.1',()=>console.log('fake up'));
