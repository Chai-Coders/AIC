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
// A draft the review passes waits on the Versions page; these do what the admin does there.
const sent=()=>page.getByRole('link',{name:'Review on Versions'}).first();
const toVersions=async()=>{await sent().click();await page.waitForURL('**/versions?tab=pending');await page.getByRole('button',{name:'Approve and publish'}).waitFor({timeout:15000});};
const approveOnVersions=async()=>{await toVersions();await page.getByRole('button',{name:'Approve and publish'}).click();await page.getByRole('button',{name:'Publish',exact:true}).click();await page.waitForURL(/\/versions\/[^/?]+$/,{timeout:15000});};
const rejectOnVersions=async()=>{await toVersions();await page.getByRole('button',{name:'Reject all'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Reject all'}).click();await page.getByText('The draft was rejected.').first().waitFor({timeout:15000});};
const undoThisVersion=async()=>{await page.getByRole('button',{name:/Undo these changes/}).click();await page.getByRole('button',{name:/^Undo \d+ changes?$/}).click();await page.getByRole('button',{name:'Undo changes'}).click();await page.getByRole('alertdialog').waitFor({state:'detached',timeout:15000});};
const backToAssistant=async()=>{await page.locator('nav a',{hasText:'AI Assistant'}).click();await page.waitForURL('**/ai');};
const DONE={text:'Done.'},OK={tools:[['approve',{}]]};
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
  // A suggestion fills in the message box, ready to finish.
  await page.getByRole('button',{name:/Update contact details/}).click();
  assert.match(await page.getByLabel('Message to the AI Assistant').inputValue(),/^Update our phone numbers to /);
  await page.getByLabel('Message to the AI Assistant').fill('');
});
const contentPrint=(s)=>JSON.stringify([s.news.map(x=>x.title),s.gallery.map(x=>x.subtext),s.startups.map(x=>x.name),s.team.map(x=>x.name),s.text].map(a=>JSON.stringify(a)).sort());
// Anything left on the live site by a failed check is reported at the end.
const liveBefore=contentPrint(await live());
// These checks read the fake Claude's requests. Put the admin's model back at the end.
// The model menu under the message box: a button, and a list that opens above it.
const modelButton=page.getByRole('button',{name:/^AI model:/});
const pickModel=async(value)=>{
  await modelButton.click();
  await page.getByRole('listbox',{name:'AI model'}).locator(`[data-value="${value}"]`).click();
  await page.waitForFunction((v)=>document.querySelector('button[aria-haspopup="listbox"]')?.dataset.value===v,value,{timeout:10000});
};
await modelButton.waitFor({timeout:15000});
const adminsModel=await modelButton.getAttribute('data-value');
await pickModel('anthropic/claude-opus-5-5');
assert.equal(await page.getByRole('listbox',{name:'AI model'}).count(),0,'the menu closes after choosing');
await page.waitForTimeout(500);
await step('the preview IS the real site: same images, buttons, links and text as the public website',async()=>{
  const facts=()=>{const seen=(e)=>{const r=e.getBoundingClientRect();const c=getComputedStyle(e);return r.width>0&&r.height>0&&c.visibility!=='hidden'&&c.display!=='none'};const q=(s)=>[...document.querySelectorAll(s)].filter(seen);return {sources:[...document.querySelectorAll('img')].map(i=>i.getAttribute('src')).join(' '),imgs:q('img').length,broken:q('img').filter(i=>i.complete&&i.naturalWidth===0).length,buttons:q('button,.btn').length,links:q('a[href]').length,headings:q('h1,h2,h3').map(h=>h.innerText.trim().replace(/\s+/g,' ')),height:document.documentElement.scrollHeight,headerLinks:q('header a').length,headerButtons:q('header button').length,h1Size:getComputedStyle(document.querySelector('h1')||document.body).fontSize,columns:q('.grid,.split').map(g=>getComputedStyle(g).gridTemplateColumns.split(' ').length).join(','),font:getComputedStyle(document.querySelector('h1')||document.body).fontFamily}};
  // Like the Site text page, the preview is the site at the frame's own width, not
  // shrunk: compare with the public site in a window that size.
  const fr=page.frames().find(f=>f.url().includes('5174'));
  assert.ok(fr,'the frame loads the website itself');
  const win=await fr.evaluate(()=>({width:innerWidth,height:innerHeight}));
  const box=await page.locator('.aic-site-preview iframe').boundingBox();
  assert.ok(Math.abs(box.width-win.width)<=1&&Math.abs(box.height-win.height)<=1,'the site fills the frame, not shrunk');
  const real=await (await browser.newContext({viewport:win})).newPage();
  await real.addInitScript(()=>{try{sessionStorage.setItem('aic:splash-seen','1')}catch{}});
  assert.ok(!page.frames().some(f=>f.url().includes('codesandbox')),'no sandbox');
  for(const path of ['/','/summary','/news','/aicteam','/boardmember','/mentor','/sia','/sisfs','/startup','/gallery','/careers']){
    await fr.evaluate((p)=>{history.pushState({},'',p);dispatchEvent(new PopStateEvent('popstate'))},path);
    await real.goto('http://localhost:5174'+path,{waitUntil:'load'});
    await page.waitForTimeout(1800);
    // Pictures load lazily as they come near the screen, so go through each whole page.
    const scrollThrough=async()=>{for(let y=0;y<=document.documentElement.scrollHeight;y+=500){scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}await new Promise(r=>setTimeout(r,500));scrollTo(0,0);};
    await Promise.all([real.evaluate(scrollThrough),fr.evaluate(scrollThrough)]);
    const a=await real.evaluate(facts),b=await fr.evaluate(facts);
    assert.equal(b.broken,0,`${path}: broken images in the preview`);
    for(const k of ['sources','imgs','buttons','links','font'])assert.equal(b[k],a[k],`${path}: ${k} differ, preview ${b[k]} vs site ${a[k]}`);
    assert.deepEqual(b.headings,a.headings,`${path}: headings differ`);
    assert.ok(Math.abs(b.height-a.height)<=2,`${path}: page height ${b.height} vs ${a.height}`);
    for(const k of ['headerLinks','headerButtons','h1Size','columns'])assert.deepEqual(b[k],a[k],`${path}: ${k} differ, preview ${JSON.stringify(b[k])} vs site ${JSON.stringify(a[k])}`);
  }
  await real.context().close();
  await fr.evaluate(()=>{history.pushState({},'','/');dispatchEvent(new PopStateEvent('popstate'))});
});
await step('every element on every page sits exactly where it does on the public website',async()=>{
  // Whole pages, not just the top: a rule like `.program__stage span` once restyled a
  // wrapper in the preview, halfway down the home page.
  const boxes=()=>{const out={},seen={};for(const e of document.querySelectorAll('#main-content *, .site-footer *, .site-header *')){const cls=e.getAttribute('class')||'';
    // Things that move by themselves.
    if(e.closest('[data-aic]')||e.tagName==='AIC-TEXT'||e.tagName==='IMG'||/hero|about__(ring|circle)|logo-(marquee|tile)/.test(cls)||e.closest('.logo-marquee,.member-carousel--loop'))continue;
    const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;const c=getComputedStyle(e);
    const k=`${e.tagName}.${cls.replace(/\b(is-|reveal)\S*/g,'').trim()}|${(e.innerText||'').slice(0,30)}`;const i=seen[k]=(seen[k]||0)+1;
    out[`${k}#${i}`]={x:r.left,y:r.top+scrollY,w:r.width,h:r.height,font:c.fontSize,color:c.color,border:c.borderTopWidth};}return out;};
  const fr=page.frames().find(f=>f.url().includes('5174'));
  const win=await fr.evaluate(()=>({width:innerWidth,height:innerHeight}));
  const real=await (await browser.newContext({viewport:win})).newPage();
  await real.addInitScript(()=>{try{sessionStorage.setItem('aic:splash-seen','1')}catch{}});
  const through=async()=>{for(let y=0;y<=document.documentElement.scrollHeight;y+=400){scrollTo(0,y);await new Promise(r=>setTimeout(r,70));}scrollTo(0,0);await new Promise(r=>setTimeout(r,900));};
  for(const path of ['/','/summary','/news','/aicteam','/boardmember','/mentor','/sia','/sisfs','/startup','/gallery','/careers']){
    await fr.evaluate((p)=>{history.pushState({},'',p);dispatchEvent(new PopStateEvent('popstate'))},path);
    await real.goto('http://localhost:5174'+path,{waitUntil:'load'});
    await page.waitForTimeout(1800);
    await Promise.all([real.evaluate(through),fr.evaluate(through)]);
    const a=await real.evaluate(boxes),b=await fr.evaluate(boxes);
    assert.deepEqual(Object.keys(b).sort(),Object.keys(a).sort(),`${path}: different elements`);
    for(const k of Object.keys(a))for(const f of Object.keys(a[k])){
      const same=typeof a[k][f]==='number'?Math.abs(a[k][f]-b[k][f])<=2:a[k][f]===b[k][f];
      assert.ok(same,`${path}: "${k}" ${f} is ${a[k][f]} on the site and ${b[k][f]} in the preview`);
    }
  }
  await real.context().close();
  await fr.evaluate(()=>{history.pushState({},'','/');dispatchEvent(new PopStateEvent('popstate'))});
});
await step('content edit shows in the preview only, Before/After flips, approved and undone on Versions',async()=>{
  const item=(await live()).news[0];
  const HEADLINE=`Draft headline ${Date.now()}`;
  await control('script',{script:[{tools:[['update_record',{table:'news',id:item.id,field:'title',value:HEADLINE}],['describe_change',{summary:'Renamed the news post',page:'/news',text:HEADLINE,beforeText:item.title}]]},{text:'Changed the headline on the news page. This is a content change.'},OK]});
  await say('Rename the first news post');
  await sent().waitFor({timeout:30000});
  await page.getByText('Change 1 of 1').waitFor();
  await site().getByText(HEADLINE).first().waitFor({timeout:30000});
  await page.waitForTimeout(2500); await shot('2-after');
  const fr=page.frames().find(f=>f.url().includes('5174'));
  const seen=await fr.evaluate((HEADLINE)=>{const o=document.getElementById('__aic_outline');if(!o)return 'no outline';const r=o.getBoundingClientRect();const t=[...document.querySelectorAll('h1,h2,h3,a,p,span')].find(e=>e.textContent.trim()===HEADLINE);const tr=t.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&tr.top>=r.top-1&&tr.bottom<=r.bottom+1?'ok':JSON.stringify({o:[r.top,r.bottom],t:[tr.top,tr.bottom],h:innerHeight});},HEADLINE);
  assert.equal(seen,'ok','the outline must be on the changed element, on screen');
  assert.equal((await live()).news[0].title,item.title);
  const leaked=await page.frames().find(f=>f.url().includes('5174')).evaluate((h)=>Object.values(localStorage).some(v=>String(v).includes(h)),HEADLINE);
  assert.equal(leaked,false,'the draft must not reach the browser cache the public site reads');
  await page.getByRole('button',{name:'Now',exact:true}).click();
  await site().getByText(item.title).first().waitFor({timeout:30000});
  await site().getByText(HEADLINE).first().waitFor({state:'detached',timeout:30000});
  await page.waitForTimeout(2200); await shot('3-before');
  await page.getByRole('button',{name:'After approval',exact:true}).click();
  await site().getByText(HEADLINE).first().waitFor({timeout:30000});
  await page.getByRole('status').getByText(/waiting for your approval/).waitFor();
  await page.getByRole('list',{name:'The changes'}).getByText('Renamed the news post').waitFor();
  await page.getByRole('list',{name:'Progress'}).getByText('Approval').waitFor();
  await toVersions();
  await page.getByText('proposed by AI Assistant').waitFor();
  await page.getByText(HEADLINE).first().waitFor();
  await shot('4-versions');
  await page.getByRole('button',{name:'Approve and publish'}).click();await page.getByRole('button',{name:'Publish',exact:true}).click();await page.waitForURL(/\/versions\/[^/?]+$/,{timeout:15000});
  assert.equal((await live()).news.find(n=>n.id===item.id).title,HEADLINE);
  await undoThisVersion();
  assert.equal((await live()).news.find(n=>n.id===item.id).title,item.title);
  await backToAssistant();
  await page.getByText('You approved this on the Versions page').waitFor({timeout:10000});
  await page.getByRole('button',{name:'New chat'}).click();
});
await step('website text edit: draft shows on the page, Before/After, approved and undone on Versions',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  const KEY='notFound.hero.title', OLD='We couldn’t find that page', NEW=`Draft lost page heading ${Date.now()}`;
  await control('script',{script:[{tools:[['get_site_text',{query:'find that page'}]]},{tools:[['update_site_text',{key:KEY,value:NEW}],['describe_change',{summary:'Changed the not found heading',page:'/page-not-found',text:NEW,beforeText:OLD}]]},{text:'Changed the heading. This is website text.'},OK]});
  await say('Change the not found heading');
  await sent().waitFor({timeout:30000});
  await site().getByRole('heading',{name:NEW}).waitFor({timeout:30000});
  await page.waitForTimeout(1500); await shot('12-text-draft');
  assert.ok(!(await live()).text.some(t=>t.key===KEY),'live text changed before Publish');
  await page.getByRole('button',{name:'Now',exact:true}).click();
  await site().getByRole('heading',{name:OLD}).waitFor({timeout:30000});
  await page.getByRole('button',{name:'After approval',exact:true}).click();
  await site().getByRole('heading',{name:NEW}).waitFor({timeout:30000});
  await approveOnVersions();
  assert.equal((await live()).text.find(t=>t.key===KEY)?.value,NEW);
  await undoThisVersion();
  assert.ok(!(await live()).text.some(t=>t.key===KEY));
  await backToAssistant();
  await site().locator('body').waitFor({timeout:60000});
});
await step('removed text leaves no gap, and a rejected draft leaves the site alone',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await page.waitForTimeout(800);
  await control('script',{script:[{tools:[['update_site_text',{key:'summary.story.eyebrow',value:''}],['describe_change',{summary:'Removed the small line',page:'/summary',textKey:'summary.story.eyebrow'}]]},{text:'Removed it.'},OK]});
  await say('Remove the small line above our story');
  await sent().waitFor({timeout:30000});
  const fr=page.frames().find(f=>f.url().includes('5174'));
  await fr.waitForFunction(()=>location.pathname==='/summary',null,{timeout:10000});
  // The story's small line, the first thing in its column.
  const eyebrow=()=>{const p=document.querySelector('#main-content .split__copy > .eyebrow');return p?getComputedStyle(p).display:'gone'};
  await fr.waitForFunction((f)=>['none','gone'].includes(eval(f)()),eyebrow.toString(),{timeout:10000}).catch(()=>{});
  const shown=await fr.evaluate(eyebrow);
  assert.ok(shown==='none'||shown==='gone',`removed text still shows: ${shown}`);
  await page.waitForTimeout(1200);await shot('15-removed-text');
  await rejectOnVersions();
  assert.ok(!(await live()).text.some(t=>t.key==='summary.story.eyebrow'),'a rejected draft changed the site');
  await backToAssistant();
  await page.getByText('This was rejected on the Versions page').waitFor({timeout:10000});
});
await step('a picture attached in the chat reaches the agent',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await page.waitForTimeout(500);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
  await page.locator('input[type=file]').setInputFiles({name:'logo.png',mimeType:'image/png',buffer:png});
  await page.getByRole('list',{name:'Attached pictures'}).getByText('logo.png').waitFor({timeout:15000});
  await control('script',{script:[{text:'Got the **picture**.'}]});
  await say('Here is a logo');
  await page.locator('strong',{hasText:'picture'}).waitFor({timeout:30000});
  const {calls}=await control('state');
  assert.match(JSON.stringify(calls[0].messages),/attached a picture, .*logo\.png/);
  assert.equal(await page.getByRole('list',{name:'Attached pictures'}).count(),0,'the list clears after sending');
});
await step('no more than three pictures on a message',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await page.waitForTimeout(500);
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
  await page.locator('input[type=file]').setInputFiles([1,2,3,4].map((n)=>({name:`p${n}.png`,mimeType:'image/png',buffer:png})));
  await page.getByText('You can attach up to 3 pictures to a message.').first().waitFor({timeout:5000});
  const list=page.getByRole('list',{name:'Attached pictures'});
  await list.getByText('p3.png').waitFor({timeout:15000});
  assert.equal(await list.locator('li').count(),3);
  await page.locator('input[type=file]').setInputFiles({name:'p5.png',mimeType:'image/png',buffer:png});
  await page.waitForTimeout(800);
  assert.equal(await list.locator('li').count(),3,'a later pick can\'t go over the limit');
  for(const n of [1,2,3])await page.getByRole('button',{name:/^Remove/}).first().click();
});
await step('every change stays marked, and the preview goes to each new one',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await page.waitForTimeout(800);
  const tag=Date.now();
  // Far apart on the page, so seeing one doesn't mean seeing the other.
  await control('script',{script:[{tools:[
    ['update_site_text',{key:'home.hero.eyebrow',value:`Top ${tag}`}],
    ['update_site_text',{key:'home.programs.0.title',value:`Mid ${tag}`}],
    ['describe_change',{summary:`Top ${tag}`,page:'/',textKey:'home.hero.eyebrow'}],
  ]},
  // One call at a time: calls made together can land in the list in any order.
  {tools:[['describe_change',{summary:`Mid ${tag}`,page:'/',textKey:'home.programs.0.title'}]]},DONE,OK]});
  await say('Change the two lines');
  await sent().waitFor({timeout:40000});
  const fr=page.frames().find(f=>f.url().includes('5174'));
  const marks=()=>fr.evaluate(()=>[...document.querySelectorAll('[data-aic-mark]')].map((m)=>m.dataset.aicMark).sort().join());
  await fr.waitForFunction(()=>document.querySelectorAll('[data-aic-mark]').length===2,null,{timeout:10000});
  assert.equal(await marks(),'1,2','both changes are marked at once');
  // It moves on to the second change by itself, and scrolls to it.
  await page.getByText('Change 2 of 2').waitFor({timeout:8000});
  await fr.waitForFunction(()=>{const r=document.querySelector('[data-cms-key="home.programs.0.title"]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;},null,{timeout:6000});
  await shot('14-both-marked');
  // A second message starts a new draft, added to the one waiting: straight to what's new.
  await control('script',{script:[{tools:[
    ['update_site_text',{key:'home.contact.title',value:`Low ${tag}`}],
    // The page's name, which is what models copy from search results.
    ['describe_change',{summary:`Low ${tag}`,page:'Home',textKey:'home.contact.title'}],
  ]},DONE,OK]});
  // From another page: it has to come back here.
  await fr.evaluate(()=>{history.pushState({},'','/gallery');dispatchEvent(new PopStateEvent('popstate'))});
  await say('And this one');
  await page.getByText('Change 1 of 1').waitFor({timeout:40000});
  await sent().waitFor({timeout:40000});
  await page.waitForTimeout(800);
  await fr.waitForFunction(()=>{const e=document.querySelector('[data-cms-key="home.contact.title"]');if(!e)return false;const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;},null,{timeout:6000});
  // The preview still shows the first draft's changes: they are waiting too.
  await fr.waitForFunction((tag)=>document.body.textContent.includes(`Top ${tag}`)&&document.body.textContent.includes(`Low ${tag}`),tag,{timeout:6000});
  await rejectOnVersions();
  await backToAssistant();
  await site().locator('h1,h2').first().waitFor({timeout:60000});
  const fr2=page.frames().find(f=>f.url().includes('5174'));
  await fr2.waitForFunction(()=>document.querySelectorAll('[data-aic-mark]').length===0,null,{timeout:10000});
});
await step('a reload of the public site shows an approval and an undo straight away',async()=>{
  const item=(await live()).news[0];
  const pub=await (await browser.newContext({viewport:{width:1200,height:800}})).newPage();
  await pub.addInitScript(()=>{try{sessionStorage.setItem('aic:splash-seen','1')}catch{}});
  await pub.goto('http://localhost:5174/news');await pub.getByText(item.title).first().waitFor({timeout:15000});
  await page.getByRole('button',{name:'New chat'}).click();
  await page.waitForTimeout(800);
  const HEADLINE=`Fast headline ${Date.now()}`;
  await control('script',{script:[{tools:[['update_record',{table:'news',id:item.id,field:'title',value:HEADLINE}],['describe_change',{summary:'Rename',page:'/news',text:HEADLINE}]]},DONE,OK]});
  await say('Rename the first news post');
  await sent().waitFor({timeout:40000});
  await approveOnVersions();
  // Always undone, even if this check fails: the headline is on the live site.
  try{
    await pub.reload();await pub.getByText(HEADLINE).first().waitFor({timeout:4000});
  }finally{
    // Straight after, well inside the minute the site used to trust its copy for.
    await undoThisVersion();
  }
  await pub.reload();await pub.getByText(item.title).first().waitFor({timeout:4000});
  assert.equal(await pub.getByText(HEADLINE).count(),0);
  await pub.context().close();
  await backToAssistant();
});
await step('the spend meter moves by itself, and the AI activity tab filters',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await page.waitForTimeout(800);
  const item=(await live()).news[0];
  const meter=page.getByRole('meter',{name:'Estimated AI spend this month'});
  await meter.waitFor();
  const before=await meter.getAttribute('aria-valuetext');
  // Hovering the ring shows the details.
  await meter.hover();
  await page.getByRole('tooltip').getByText(/^AI spend: \$[\d.]+ of \$[\d.]+ this month$/).waitFor({timeout:3000});
  const HEADLINE=`Meter headline ${Date.now()}`;
  await control('script',{script:[{tools:[['update_record',{table:'news',id:item.id,field:'title',value:HEADLINE}],['describe_change',{summary:'Rename',page:'/news',text:HEADLINE}]]},DONE,OK]});
  await say('Rename the first news post');
  await sent().waitFor({timeout:40000});
  await page.waitForFunction((b)=>document.querySelector('[role=meter]').getAttribute('aria-valuetext')!==b,before,{timeout:10000});
  // The log is a tab on Versions now.
  await page.locator('nav a',{hasText:'Versions'}).click();
  await page.getByRole('tab',{name:'AI activity'}).click();
  const body=page.locator('section',{hasText:'AI Assistant activity'}).locator('tbody tr');
  await page.getByRole('combobox',{name:'Show category'}).selectOption('sending');
  await page.waitForFunction(()=>[...document.querySelectorAll('section tbody tr td:nth-child(4)')].some(t=>t.textContent==='sent'),null,{timeout:5000});
  await page.getByRole('combobox',{name:'Show category'}).selectOption('models');
  await page.waitForFunction(()=>[...document.querySelectorAll('section tbody tr')].length>0&&[...document.querySelectorAll('section tbody tr td:nth-child(2)')].every(t=>t.textContent==='Model calls'),null,{timeout:5000});
  const model=(await body.first().locator('td').nth(2).innerText()).trim();
  await page.getByRole('combobox',{name:'Show model'}).selectOption(model);
  await page.waitForTimeout(400);
  for(const m of await body.locator('td:nth-child(3)').allInnerTexts())assert.equal(m.trim(),model);
  await shot('16-log-filter');
  await page.goto(CMS+'/versions?tab=pending');
  await page.getByRole('button',{name:'Reject all'}).click();await page.getByRole('alertdialog').getByRole('button',{name:'Reject all'}).click();await page.getByText('The draft was rejected.').first().waitFor({timeout:15000});
  assert.equal((await live()).news.find(n=>n.id===item.id).title,item.title);
  await backToAssistant();
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
await step('point at several things: numbered, removable, all reach the agent',async()=>{
  await page.getByRole('button',{name:'New chat'}).click();
  await page.waitForTimeout(3000);
  await site().locator('h1').first().waitFor({timeout:60000});
  await page.getByRole('button',{name:'Point at something'}).click();
  await page.waitForTimeout(300);
  await site().locator('h1').first().click();
  await page.getByRole('list',{name:/pointing at/}).locator('li').first().waitFor({timeout:10000});
  await site().getByRole('link',{name:'Explore programmes'}).click();
  await site().getByRole('link',{name:'Apply for incubation'}).first().click();
  const chips=page.getByRole('list',{name:/pointing at/}).locator('li');
  await page.waitForFunction(()=>document.querySelectorAll('ul[aria-label*="pointing at"] li').length===3,null,{timeout:10000});
  await site().locator('[data-aic-mark="3"]').waitFor({state:'attached',timeout:5000});
  await shot('8-point');
  // Clicking one again takes it off; so does its button.
  await site().locator('h1').first().click();
  await page.waitForFunction(()=>document.querySelectorAll('ul[aria-label*="pointing at"] li').length===2,null,{timeout:5000});
  await page.getByRole('button',{name:'Stop pointing at item 1'}).click();
  await site().getByRole('link',{name:'Explore programmes'}).click();
  await page.waitForFunction(()=>document.querySelectorAll('ul[aria-label*="pointing at"] li').length===2,null,{timeout:5000});
  assert.equal(await chips.count(),2);
  // Ctrl-click moves the preview to another page, still pointing, without opening a tab.
  const tabs=page.context().pages().length;
  await site().getByRole('link',{name:'Apply for incubation'}).first().click({modifiers:['Control']});
  await page.waitForTimeout(400);
  assert.equal(page.context().pages().length,tabs,'it opened a new tab');
  await site().getByRole('link',{name:'Explore programmes'}).waitFor({state:'attached',timeout:3000}).catch(()=>{});
  await page.getByRole('button',{name:'Done pointing'}).first().waitFor();
  await page.getByRole('button',{name:'Done pointing'}).first().click();
  await control('script',{script:[{tools:[['get_selected_element',{}]]},{text:'I see them.'}]});
  await say('Make these bigger');
  await page.getByText('I see them.').waitFor({timeout:30000});
  const {calls}=await control('state');
  assert.match(JSON.stringify(calls[0].messages),/2 elements/);
  assert.equal(await page.getByRole('list',{name:/pointing at/}).count(),0,'the list clears after sending');
  assert.equal(await site().locator('[data-aic-mark]').count(),0,'the marks clear after sending');
});
await step('browser frame, phone width, draggable chat',async()=>{
  const frame=page.locator('.aic-site-preview iframe');
  const wide=(await frame.boundingBox()).width;
  await page.getByRole('button',{name:'phone',exact:true}).click();
  await page.waitForTimeout(400);
  const narrow=(await frame.boundingBox()).width;
  assert.ok(narrow<=400&&narrow<wide,`phone width: ${narrow}`);
  const fp=page.frames().find(f=>f.url().includes('5174'));
  assert.ok(await fp.evaluate(()=>innerWidth<=400),'Phone shows the phone layout, unscaled');
  await page.getByRole('button',{name:'desktop',exact:true}).click();
  await page.waitForTimeout(400);
  await page.locator('section[aria-label="Website preview"]').getByText('localhost:5174').waitFor();
  const fr=page.frames().find(f=>f.url().includes('5174'));
  // Dragging the divider resizes the chat.
  const chatBar=page.getByRole('separator',{name:'Resize the chat'});
  const d=await chatBar.boundingBox();
  await page.mouse.move(d.x+4,d.y+200);await page.mouse.down();await page.mouse.move(d.x-40,d.y+200,{steps:6});await page.mouse.up();
  await page.waitForTimeout(200);
  assert.ok((await chatBar.boundingBox()).x<d.x-30,'dragging resizes the chat');
  // The comparison lives on Versions: no second list of changes here.
  assert.equal(await page.getByRole('tab',{name:'Changes'}).count(),0);
});
await step("Abhijith's Site text page: click to edit, live preview, publish",async()=>{
  await page.locator('nav a',{hasText:'Site text'}).click(); await page.waitForURL('**/site-text');
  const frame=page.frameLocator('iframe[title="Website preview"]');
  const target=frame.locator('h1 [data-cms-key]').first();
  await target.waitFor({timeout:30000});
  await target.click();
  const key=await target.getAttribute('data-cms-key');
  const field=page.locator('section[aria-label="Editor"]').locator('input[type=text]:focus,textarea:focus').or(page.locator('section[aria-label="Editor"] input[type=text],section[aria-label="Editor"] textarea').first()).first();
  await field.waitFor({timeout:10000});
  const usedKey=key; const before=await field.inputValue();
  await field.fill(before+' edited');
  await frame.getByText(before+' edited',{exact:false}).first().waitFor({timeout:10000});
  await shot('13-site-text');
  const publish=page.locator('button:has(span:text-is("Publish"))'); await publish.click();
  await page.getByText(/Published 1 change/).waitFor({timeout:15000});
  const row=(await live()).text.find(t=>t.value===before+' edited'); assert.ok(row,`no published row for ${usedKey}`);
  await field.fill(before); await publish.click();
  await page.getByText(/Published 1 change/).first().waitFor({timeout:15000});
  await page.waitForTimeout(500);
  assert.ok(!(await live()).text.some(t=>t.value===before+' edited'));
});
await step('settings page and phone width',async()=>{
  await page.locator('nav a',{hasText:'Settings'}).click();
  await page.getByRole('heading',{name:'Settings'}).waitFor();
  assert.ok(!(await page.content()).includes('sk-ant-fake'));
  await page.getByRole('button',{name:'Check now'}).click();
  await page.getByText(/prices? changed/).first().waitFor({timeout:20000});
  const picker=page.getByRole('combobox',{name:'Editing model model'});
  assert.match(await picker.locator('option',{hasText:'Claude Opus 5.5'}).innerText(),/Claude Opus 5\.5 \(\$4\.00 in, \$20\.00 out\)/);
  assert.equal(await picker.locator('option',{hasText:'Claude Test Only'}).count(),0,"a model the key can't use isn't offered");
  await page.getByRole('combobox',{name:'Usage month'}).waitFor();
  await shot('10-settings');
  await page.getByRole('tab',{name:'MCP'}).click();
  await page.getByRole('heading',{name:'Connection address'}).waitFor();
  await page.getByRole('tab',{name:'Version history'}).click();
  await page.getByText('Start a new version after').waitFor();
  // The old pages lead to the new places.
  await page.goto(CMS+'/ai/history');await page.waitForURL('**/versions?tab=activity');
  await page.locator('section',{hasText:'AI Assistant activity'}).locator('tbody tr').first().waitFor({timeout:10000});
  await page.goto(CMS+'/ai-connection');await page.waitForURL('**/settings?tab=mcp');
  await page.locator('nav a',{hasText:'AI Assistant'}).click();
  await page.setViewportSize({width:390,height:800}); await page.waitForTimeout(800);
  const w=await page.evaluate(()=>document.documentElement.scrollWidth); assert.ok(w<=390,`page scrolls sideways: ${w}`);
  await shot('11-phone');
});
await step('the checks left the live site as they found it',async()=>{
  assert.equal(contentPrint(await live()),liveBefore);
});
await page.setViewportSize({width:1500,height:950});
await modelButton.waitFor({timeout:15000});
await pickModel(adminsModel);
await page.waitForTimeout(800);
assert.equal(await modelButton.getAttribute('data-value'),adminsModel,"the admin's model is back");
await browser.close();
