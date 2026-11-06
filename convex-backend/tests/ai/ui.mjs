// Browser checks of the AI Assistant page, with the same fake services as e2e.mjs.
// See tests/ai/README.md. Screenshots go to SHOTS_DIR.
import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
const S = process.env.SHOTS_DIR || '/tmp'; const FAKE='http://127.0.0.1:4599'; const CMS='http://localhost:5175';
const control=(p,b={})=>fetch(`${FAKE}/control/${p}`,{method:'POST',body:JSON.stringify(b)}).then(r=>r.json());
const live=()=>fetch('http://127.0.0.1:3210/api/query',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({path:'content:siteContent',args:{},format:'json'})}).then(r=>r.json()).then(j=>j.value);
const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessRespectPreflightResults']});
const ctx=await browser.newContext({viewport:{width:1500,height:950}}); const page=await ctx.newPage();
page.on('pageerror',e=>console.log('PAGEERROR',String(e).slice(0,300)));
page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_|net::/.test(m.text()))console.log('CONSOLE',m.text().slice(0,300))});
page.on('dialog',d=>d.accept());
const shot=(n)=>page.screenshot({path:`${S}/${n}.png`});
const site=()=>page.frameLocator('.aic-site-preview iframe');
const step=async(n,f)=>{const t=Date.now();try{await f();console.log(`  ok    ${n} (${((Date.now()-t)/1000).toFixed(1)}s)`);}catch(e){console.log(`  FAIL  ${n}\n   ${String(e.message).slice(0,700)}`);await shot('fail-'+n.replace(/\W+/g,'_'));process.exitCode=1;}};
const say=async(t)=>{await page.getByLabel('Message to the AI Assistant').fill(t);await page.getByRole('button',{name:'Send'}).click();};
const publishEnabled=()=>page.getByRole('button',{name:/^Publish/}).and(page.locator(':enabled'));
const DONE={text:'Done.'},OK={tools:[['approve',{}]]};
const FILE='frontend/src/pages/NotFoundPage.jsx';
await page.goto(CMS+'/login');
await page.locator('input[type=email],input[name=email],input[type=text]').first().fill(process.env.TEST_EMAIL);
await page.locator('input[type=password]').fill(process.env.TEST_PASSWORD);
await page.locator('button[type=submit]').click();
await page.waitForURL(u=>!u.pathname.startsWith('/login'));
await step('sidebar has AI Assistant first, page loads the site',async()=>{
  const first=await page.locator('nav a').first().innerText(); assert.equal(first.trim(),'AI Assistant');
  await page.locator('nav a').first().click(); await page.waitForURL('**/ai');
  await page.getByRole('button',{name:'New chat'}).click();
  await site().locator('body').waitFor({timeout:90000});
  await site().locator('h1,h2').first().waitFor({timeout:90000});
  await shot('1-empty');
});
await step('content edit shows in the preview only, Before/After flips, Publish, rollback',async()=>{
  const item=(await live()).news[0];
  await control('script',{script:[{tools:[['update_record',{table:'news',id:item.id,field:'title',value:'Draft headline XYZ'}],['describe_change',{summary:'Renamed the news post',kind:'content',page:'/news',text:'Draft headline XYZ',beforeText:item.title}]]},{text:'Changed the headline on the news page. This is a content change.'},OK]});
  await say('Rename the first news post');
  await publishEnabled().waitFor({timeout:30000});
  await page.getByText('Change 1 of 1').waitFor();
  await site().getByText('Draft headline XYZ').first().waitFor({timeout:30000});
  await page.waitForTimeout(2500); await shot('2-after');
  const fr=page.frames().find(f=>f.url().includes('sandpack'));
  const seen=await fr.evaluate(()=>{const o=document.getElementById('__aic_outline');if(!o)return 'no outline';const r=o.getBoundingClientRect();const t=[...document.querySelectorAll('h1,h2,h3,a,p,span')].find(e=>e.textContent.trim()==='Draft headline XYZ');const tr=t.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&tr.top>=r.top-1&&tr.bottom<=r.bottom+1?'ok':JSON.stringify({o:[r.top,r.bottom],t:[tr.top,tr.bottom],h:innerHeight});});
  assert.equal(seen,'ok','the outline must be on the changed element, on screen');
  assert.equal((await live()).news[0].title,item.title);
  await page.getByRole('button',{name:'before',exact:true}).click();
  await site().getByText(item.title).first().waitFor({timeout:30000});
  await site().getByText('Draft headline XYZ').first().waitFor({state:'detached',timeout:30000});
  await page.waitForTimeout(2200); await shot('3-before');
  await page.getByRole('button',{name:'after',exact:true}).click();
  await site().getByText('Draft headline XYZ').first().waitFor({timeout:30000});
  await publishEnabled().click();
  await page.getByText('Published.').waitFor({timeout:15000});
  assert.equal((await live()).news.find(n=>n.id===item.id).title,'Draft headline XYZ');
  await page.locator('nav a',{hasText:'AI history'}).click();
  await page.getByRole('button',{name:'Roll back'}).first().waitFor();
  await shot('4-history');
  await page.getByRole('button',{name:'Roll back'}).first().click();
  await page.getByText('Rolled back.').waitFor({timeout:15000});
  assert.equal((await live()).news.find(n=>n.id===item.id).title,item.title);
  await page.locator('nav a',{hasText:'AI Assistant'}).click(); await page.waitForURL('**/ai');
  await page.getByRole('button',{name:'New chat'}).click();
});
await step('build check: a real compile error goes back to the editor, then passes',async()=>{
  const headline="We couldn’t find that page";
  await site().locator('body').waitFor({timeout:60000});
  await control('script',{script:[
    {tools:[['read_file',{path:FILE}]]},
    {tools:[['edit_file',{path:FILE,replacements:[{find:"const NotFoundPage = () => (",replace:"const NotFoundPage = () => ((("}]}],['describe_change',{summary:'Changed the not found heading',kind:'code',page:'/definitely-missing',text:'Lost page'}]]},
    DONE,
    {tools:[['edit_file',{path:FILE,replacements:[{find:"const NotFoundPage = () => (((",replace:"const NotFoundPage = () => ("},{find:headline,replace:'Lost page'}]}]]},
    DONE, OK]});
  await say('Change the not found heading');
  await publishEnabled().waitFor({timeout:120000});
  const {calls}=await control('state');
  const text=JSON.stringify(calls.map(c=>c.messages));
  assert.match(text,/failed to build/,'the compile error went back to the editor');
  await page.getByRole('tab',{name:'Changes'}).click();
  await page.getByText('Lost page').first().waitFor();
  await shot('5-changes');
  await page.getByRole('tab',{name:'Preview'}).click();
  await page.getByRole('button',{name:'Discard'}).click();
});
await step('runtime crash in the draft is caught too',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await control('script',{script:[
    {tools:[['read_file',{path:'frontend/src/main.jsx'}]]},
    {tools:[['edit_file',{path:'frontend/src/main.jsx',replacements:[{find:"createRoot(",replace:"undefinedThing.call();\ncreateRoot("}]}]]},
    DONE, {text:'Not fixing it.'}, {text:'Still not.'}]});
  await say('Break it');
  await page.getByText("The change doesn't build").waitFor({timeout:120000});
  await shot('6-buildfail');
  await page.getByRole('button',{name:'Discard'}).click();
});
await step('delete shows a confirm card',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  const g=(await live()).gallery[0];
  await control('script',{script:[{tools:[['delete_record',{table:'gallery',id:g.id,reason:'You asked to remove this photo.'}]]},{text:'Left it.'}]});
  await say('Delete the photo');
  await page.getByRole('alertdialog',{name:'Confirm delete'}).waitFor({timeout:30000});
  await shot('7-confirm');
  await page.getByRole('button',{name:'Keep it'}).click();
  await page.getByText('Left it.').waitFor({timeout:30000});
});
await step('click to point',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await page.waitForTimeout(3000);
  await site().locator('h1').first().waitFor({timeout:60000});
  await page.getByRole('button',{name:'Point at something'}).click();
  await page.waitForTimeout(300);
  await site().locator('h1').first().click();
  await page.getByText(/Pointing at:/).waitFor({timeout:10000});
  await shot('8-point');
  await control('script',{script:[{tools:[['get_selected_element',{}]]},{text:'I see it.'}]});
  await say('Make this bigger');
  await page.getByText('I see it.').waitFor({timeout:30000});
  const {calls}=await control('state');
  assert.match(JSON.stringify(calls[1].messages),/h1/);
});
await step('backend change: no build check needed, shown as a diff with a warning',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await control('script',{script:[{tools:[['read_file',{path:'convex-backend/convex/gallery.ts'}]]},{tools:[['edit_file',{path:'convex-backend/convex/gallery.ts',replacements:[{find:'max: 255',replace:'max: 300'}]}],['describe_change',{summary:'Longer gallery captions allowed',kind:'code'}]]},DONE,OK]});
  await say('Allow longer captions');
  await publishEnabled().waitFor({timeout:30000});
  await page.getByText("can't be shown in the preview").waitFor({timeout:5000}).catch(async()=>{await page.getByRole('tab',{name:'Changes'}).click();await page.getByText("can't be shown in the").waitFor({timeout:5000});});
  await page.waitForTimeout(300); await shot('9-backend');
  await page.getByRole('button',{name:'Discard'}).click();
});
await step('settings page and phone width',async()=>{
  await page.locator('nav a',{hasText:'AI settings'}).click();
  await page.getByRole('heading',{name:'AI settings'}).waitFor();
  assert.ok(!(await page.content()).includes('sk-ant-fake'));
  await shot('10-settings');
  await page.locator('nav a',{hasText:'AI Assistant'}).click();
  await page.setViewportSize({width:390,height:800}); await page.waitForTimeout(800);
  const w=await page.evaluate(()=>document.documentElement.scrollWidth); assert.ok(w<=390,`page scrolls sideways: ${w}`);
  await shot('11-phone');
});
await browser.close();
