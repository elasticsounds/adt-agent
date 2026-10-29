import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {zipSync,unzipSync} from 'fflate';
const base=process.env.APP_URL||'http://127.0.0.1:8890/';
await mkdir('tests/results',{recursive:true});
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1512,height:1050}});
const sent=[],external=[],errors=[],checks=[];const TEST_KEY='sk-adt-agent-test-not-a-real-key-1234567890';let mode='valid';
const idle=()=>p.waitForFunction(()=>document.body.dataset.busy!=='true');
async function send(message){await p.fill('#chat-input',message);await p.click('#chat-form button');await idle();}
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
p.on('pageerror',e=>errors.push(e.message));
p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(new URL(base).origin))external.push(r.url())});
await p.route('https://api.openai.com/v1/responses',async r=>{
 const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
 if(r.request().method()==='OPTIONS'){await r.fulfill({status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});return}
 const body=r.request().postDataJSON();sent.push({body,headers:r.request().headers()});
 if(body.model==='gpt-6-luna'&&mode==='failure'){await r.fulfill({status:429,headers,body:'{}'});return;}
 const proposal=body.model==='gpt-6.1-sol'?{message:'Improve readability while preserving the book.',tasks:[{id:'reading-size',kind:'style',target:'fontSize',instruction:'Increase the reading size to 24 px.',context_ids:[],requires_image:false}]}:{message:'Proposed a larger reading size.',results:[{task_id:mode==='invalid'?'unplanned':'reading-size',status:'completed',value:'24',note:'Larger reading text.'}]};
 await r.fulfill({headers,body:JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(proposal)}]}]})});
});
try{
 await p.goto(base+'?sample');await p.waitForFunction(()=>document.querySelector('#project-name').textContent==='Our shared world'&&document.body.dataset.busy!=='true',null,{timeout:60000});await p.click('[data-view=book]');if(await p.locator('#inspector').isHidden())await p.click('#toggle-tools');await p.click('[data-panel=chat]');await p.selectOption('#chat-mode','ai');
 await check('Key and explicit sharing consent required; Connect makes no request',async()=>{
  await send('Make text bigger');assert.equal(sent.length,0);assert.match(await p.locator('#toast').textContent(),/Connect OpenAI/);
  await p.click('#open-ai-settings');assert.match(await p.locator('.ai-models').textContent(),/GPT-6.1 Sol.*GPT-6 Luna/);await p.fill('#openai-key',TEST_KEY);await p.click('#ai-connect-form button[type=submit]');await p.waitForFunction(()=>!document.querySelector('#ai-dialog').open);assert.equal(await p.locator('#openai-key').inputValue(),'');assert.equal(sent.length,0);
  await send('Make text bigger');assert.equal(sent.length,0);assert.match(await p.locator('#toast').textContent(),/checkbox/);
 });
 await check('Sol plans, Luna executes with reduced context, edits wait for approval',async()=>{
  await p.locator('.ai-settings summary').click();await p.check('#ai-consent');await send('Make text bigger');await p.waitForSelector('#apply-ai');assert.equal(sent.length,2);
  assert.deepEqual(sent.map(r=>r.body.model),['gpt-6.1-sol','gpt-6-luna']);assert.deepEqual(sent.map(r=>r.body.reasoning.effort),['medium','low']);
  for(const r of sent){assert.equal(r.headers.authorization,'Bearer '+TEST_KEY);assert.equal(r.body.store,false);assert.equal(r.body.text.format.strict,true);assert.ok(!JSON.stringify(r.body).includes(TEST_KEY));}
  assert.ok(sent[0].body.input[1].content[0].text.includes('pg001_sec001'));assert.ok(sent[1].body.input[1].content[0].text.length<sent[0].body.input[1].content[0].text.length);assert.match(await p.locator('#pending-ai').textContent(),/Sol’s plan.*Luna’s proposed changes/);
  assert.equal(await p.locator('#style-form input[name=fontSize]').inputValue(),'20');await p.click('#apply-ai');await idle();assert.equal(await p.locator('#style-form input[name=fontSize]').inputValue(),'24');
 });
 await check('Key is encrypted separately and never enters DOM, project or exported files',async()=>{
  await p.click('#save-project');await idle();const saved=await p.evaluate(async()=>{const open=indexedDB.open('folio-local-studio');const db=await new Promise(r=>open.onsuccess=()=>r(open.result));const tx=db.transaction('projects','readonly');const req=tx.objectStore('projects').getAll();return await new Promise(r=>req.onsuccess=()=>r(JSON.stringify(req.result)))});assert.ok(!saved.includes(TEST_KEY));assert.ok(!await p.evaluate(key=>JSON.stringify(localStorage).includes(key)||JSON.stringify(sessionStorage).includes(key)||document.documentElement.outerHTML.includes(key),TEST_KEY));
  await p.click('#export-top');const downloading=p.waitForEvent('download');await p.click('#download-book');const downloaded=await downloading;await downloaded.saveAs('tests/results/byok-export.zip');for(const bytes of Object.values(unzipSync(new Uint8Array(await readFile('tests/results/byok-export.zip')))))assert.ok(!new TextDecoder().decode(bytes).includes(TEST_KEY));await idle();await p.click('[data-view=book]');await p.click('[data-view=book]');if(await p.locator('#inspector').isHidden())await p.click('#toggle-tools');await p.click('[data-panel=chat]');
 });
 await check('Unplanned Luna edits are rejected before application',async()=>{
  mode='invalid';await send('Try an unsupported edit');assert.match(await p.locator('#toast').textContent(),/unsupported task result/);assert.equal(await p.locator('#apply-ai').count(),0);assert.equal(await p.locator('#style-form input[name=fontSize]').inputValue(),'24');await p.click('#discard-ai');
 });
 await check('Execution failure offers an explicit Luna-only retry',async()=>{
  mode='failure';const before=sent.length;await send('Please improve the reading size');assert.equal(sent.length,before+2);await p.waitForSelector('#retry-ai');assert.match(await p.locator('#pending-ai').textContent(),/Sol will not be called again/);
  mode='valid';await p.click('#retry-ai');await idle();assert.equal(sent.length,before+3);assert.equal(sent.at(-1).body.model,'gpt-6-luna');await p.waitForSelector('#apply-ai');assert.match(await p.locator('#pending-ai').textContent(),/Sol’s plan was reused/);
 });
 await check('A proposal cannot be applied to a different page',async()=>{
  const before=sent.length;await p.click('#next-section');await p.click('#apply-ai');await idle();assert.match(await p.locator('#toast').textContent(),/page has changed/);assert.equal(sent.length,before);await p.click('#previous-section');
 });
 await check('AI proposal and connection dialogs remain accessible on desktop and phone',async()=>{
  await p.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  const audit=async()=>{const violations=await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[]);};
  await audit();await p.locator('#pending-ai').screenshot({path:'tests/results/sol-luna-proposal.png'});await p.click('#open-ai-settings');await audit();await p.setViewportSize({width:390,height:844});await audit();assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'tests/results/sol-luna-phone.png',fullPage:true});await p.setViewportSize({width:1512,height:1050});await p.click('#cancel-ai-settings');await p.click('#discard-ai');
 });
 await check('Disconnect removes credentials; remembered reconnection survives refresh',async()=>{
  await p.click('#open-ai-settings');await p.click('#disconnect-ai');assert.equal(await p.locator('#open-ai-settings').textContent(),'Connect OpenAI');assert.equal(await p.locator('#ai-consent').isChecked(),false);await p.click('#open-ai-settings');await p.fill('#openai-key',TEST_KEY);await p.click('#ai-connect-form button[type=submit]');await p.waitForFunction(()=>!document.querySelector('#ai-dialog').open);await p.waitForFunction(()=>!document.querySelector('#ai-dialog').open);await p.reload();await p.waitForFunction(()=>document.body.dataset.ready==='true');assert.equal(await p.locator('#open-ai-settings').textContent(),'OpenAI key ready');assert.equal(await p.locator('#ai-consent').isChecked(),false);assert.equal(await p.locator('#openai-key').inputValue(),'');
 });
 await check('Archive traversal rejected; no external service except approved OpenAI calls',async()=>{
  await p.waitForFunction(()=>document.querySelector('#project-name').textContent==='Our shared world'&&document.body.dataset.busy!=='true',null,{timeout:60000});const archive=zipSync({'../escape.html':new TextEncoder().encode('bad'),'content/pages.json':new TextEncoder().encode('[]')});await writeFile('tests/results/unsafe.zip',archive);await p.setInputFiles('#adt-file','tests/results/unsafe.zip');await idle();assert.match(await p.locator('#toast').textContent(),/Unsafe archive path/);assert.ok(external.every(url=>url==='https://api.openai.com/v1/responses'));assert.deepEqual(errors,[]);
 });
 await writeFile('tests/results/ai-security.json',JSON.stringify({passed:true,url:base,checks,paidAPICalls:0},null,2));
}finally{await b.close();}
