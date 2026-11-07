// Fake Anthropic and Gemini APIs, for local end-to-end tests only.
import http from 'node:http'; import crypto from 'node:crypto';
const PORT = 4599;
const state={calls:[],script:[],feeds:{},feedHeaders:[]};
// Price sources and model lists, for the price check.
const row=(name,input,output)=>`| ${name} | $${input} / MTok | $9 / MTok | $9 / MTok | $0.1 / MTok | $${output} / MTok |`;
const per=(n)=>n/1e6;
const LL=(provider,input,output,extra={})=>({litellm_provider:provider,mode:'chat',input_cost_per_token:per(input),output_cost_per_token:per(output),...extra});
const OR=(id,name,input,output,extra={})=>({id,name,pricing:{prompt:String(per(input)),completion:String(per(output))},architecture:{output_modalities:['text']},...extra});
const FEEDS=()=>({
  'anthropic.md':['# Pricing','','| Model | Base input tokens | 5m cache writes | 1h cache writes | Cache hits | Output tokens |','| --- | --- | --- | --- | --- | --- |',row('Claude Opus 5.5',4,20),row('Claude Test Official',5,10),row('Claude Test Tier (for prompts up to 100,000 tokens)',1,2),row('Claude Test Tier (for prompts over 100,000 tokens)',7,8),row('Claude Test Wrong',500,900),''].join('\n'),
  'google.md':'# Pricing\n\n## Gemini Test Official  {% id="gemini-test-official" %}\n\n{% table %}\n  * Feature\n  * Free Tier\n  * Paid Tier, per 1M tokens in USD\n\n  ---\n\n  * Input price\n  * Free of charge\n  * $0.75 through December 31.\n\n  ---\n\n  * Output price (including thinking)\n  * Free of charge\n  * $3.75\n',
  'litellm.json':JSON.stringify({'claude-opus-5-5':LL('anthropic',4,20),'claude-test-official':LL('anthropic',6,11),'claude-test-tier':LL('anthropic',1,2),'claude-test-wrong':LL('anthropic',5,10),'claude-test-agreed':LL('anthropic',1,2),'claude-test-differ':LL('anthropic',1,2),'claude-test-only':LL('anthropic',3,4),'claude-embed-test':LL('anthropic',1,1),'claude-test-zero':LL('anthropic',0,0),'claude-test-old':LL('anthropic',1,1,{deprecation_date:'2020-01-01'}),'gemini/gemini-test-official':LL('gemini',0.8,4),'other/thing':LL('mistral',1,1)}),
  'openrouter.json':JSON.stringify({data:[OR('anthropic/claude-opus-5.5','Anthropic: Claude Opus 5.5',4,20),OR('anthropic/claude-test-official','Anthropic: Claude Test Official',5.5,10.5),OR('anthropic/claude-test-tier','Anthropic: Claude Test Tier',1,2),OR('anthropic/claude-test-wrong','Anthropic: Claude Test Wrong',5,10),OR('anthropic/claude-test-agreed','Anthropic: <img src=x onerror=alert(1)>',1,2),OR('anthropic/claude-test-agreed:batch','Batch',0.5,1),OR('anthropic/claude-test-differ','Anthropic: Claude Test Differ',2,3),OR('anthropic/claude-test-picture','Anthropic: Picture',1,1,{architecture:{output_modalities:['image']}}),OR('google/gemini-test-official','Google: Gemini Test Official',0.9,4.5)]}),
  ...state.feeds,
});
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
 if(u.pathname==='/control/feeds'){state.feeds=j;state.feedHeaders=[];return respond(res,200,{ok:1});}
 if(u.pathname==='/control/feedHeaders'){return respond(res,200,state.feedHeaders);}
 const feed=u.pathname.match(/^\/feeds\/(.+)$/);
 if(feed){state.feedHeaders.push(Object.keys(req.headers));const body=FEEDS()[feed[1]];if(body===null||body===undefined){res.writeHead(500);return res.end('down');}res.writeHead(200);return res.end(body);}
 if(req.method==='GET'&&u.pathname==='/v1beta/models'){return respond(res,200,{models:[{name:'models/gemini-test-official',displayName:'Gemini Test Official',supportedGenerationMethods:['generateContent']}]});}
 if(req.method==='GET'&&u.pathname==='/v1/models'){return respond(res,200,{data:['claude-opus-5-5','claude-test-official','claude-test-tier','claude-test-wrong','claude-test-agreed','claude-test-differ'].map(id=>({id,display_name:id==='claude-test-agreed'?'Claude Test Agreed':undefined}))});}
 if(u.pathname==='/control/state'){return respond(res,200,{calls:state.calls,remaining:state.script.length});}
 const gm=u.pathname.match(/^\/v1beta\/models\/([^:]+):generateContent$/);
 if(gm){ const next=state.script.shift(); state.calls.push({provider:'google',model:gm[1],contents:j.contents,tools:j.tools,hasKey:!!req.headers['x-goog-api-key']});
   if(next?.status) return respond(res,next.status,{error:{code:next.status,message:next.message||'boom',status:'RESOURCE_EXHAUSTED'}});
   const parts=next?.tools?next.tools.map(([name,args],i)=>({functionCall:{name,args},...(i===0?{thoughtSignature:next.signature||'gem-sig-1'}:{})})):[{text:next?.text||'(script empty)'}];
   return respond(res,200,{candidates:[{content:{role:'model',parts},finishReason:'STOP'}],usageMetadata:{promptTokenCount:1000,candidatesTokenCount:200,totalTokenCount:1200}}); }
 if(u.pathname==='/v1/messages'){ const next=state.script.shift(); if(next?.delay){return setTimeout(()=>answer(res,next),next.delay);} state.calls.push({bodyKeys:Object.keys(j),system:j.system,messages:j.messages,tools:(j.tools||[]).map(t=>t.name),key:req.headers['x-api-key'],model:j.model,tool_choice:j.tool_choice});
   return answer(res,next); }
 respond(res,404,{});});}).listen(PORT,'127.0.0.1',()=>console.log('fake up'));
