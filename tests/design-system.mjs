import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {defaults} from '../public/src/core.mjs';
const base=process.env.APP_URL||'http://127.0.0.1:8890/';await mkdir('tests/results',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1280,height:800}});
const calls=[],errors=[],checks=[];let mode='fail-brand';p.on('pageerror',e=>errors.push(e.message));
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true');
const saved=()=>p.waitForFunction(()=>document.querySelector('#dirty-status').textContent==='Saved on this device'&&document.body.dataset.busy!=='true');
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
await p.route('https://api.openai.com/v1/responses',async route=>{
 const request=route.request(),headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
 if(request.method()==='OPTIONS'){await route.fulfill({status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});return;}
 const body=request.postDataJSON(),type=body.text.format.name,input=JSON.parse(body.input[1].content[0].text);calls.push({body,type,input});let value;
 if(type==='adt_pdf_pages')value={pages:input.pages.map(page=>({page:page.page,family:page.page===1?'cover':page.page===2?'illustrated':'lesson',layout:'preserve',heading_scale:2.1,panel_style:'tinted',notes:'Visible evidence from physical page '+page.page}))};
 else if(type==='adt_brand_plan'){
  if(mode==='fail-brand'){await route.fulfill({status:429,headers,body:'{}'});return;}
  value={tokens:{...defaults,accent:'#284a72',surface:'#eff4f9'},headingScale:2.1,notes:'Blue headings and tinted panels derived from the supplied source.'};
 }else if(type==='adt_family_assignment'){
  if(mode==='fail-luna'){await route.fulfill({status:429,headers,body:'{}'});return;}
  value={sections:input.sections.map(s=>({id:s.id,family:s.family,layout:s.controls?'stack':'preserve',notes:'Retain source structure and activity bindings.'}))};if(mode==='invalid-id')value.sections[0].id='injected-section';
 }else throw Error('Unexpected API schema: '+type);
 await route.fulfill({headers,body:JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})});
});
try{
 await p.goto(base+'?sample');await ready();await saved();
 await check('Local design inventories all pages and sections, with real page-family examples',async()=>{
  const design=await p.evaluate(()=>folio.book.design);assert.equal(design.pages.length,4);assert.equal(design.sections.length,4);assert.ok(design.families.length>=3);assert.equal(new Set(design.sections.map(s=>s.id)).size,4);assert.equal(calls.length,0);await p.waitForFunction(()=>document.querySelector('#design-preview').dataset.ready==='true');let frame=await (await p.locator('#design-preview').elementHandle()).contentFrame();assert.match(await frame.locator('body').textContent(),/Every source page accounted for/);assert.equal(await frame.locator('tbody tr').count(),4);
  const first=design.families.find(f=>f.examples.length).examples[0];await frame.locator('a[data-folio-section]').first().focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.querySelector('#design-preview').dataset.ready==='true'&&document.querySelector('#design-example').value!=='brand');assert.equal(await p.locator('#design-example').inputValue(),first);assert.match(await p.locator('#design-preview').getAttribute('srcdoc'),/folio-document/);assert.ok(await p.evaluate(()=>folio.book.spine.every(s=>folio.book.doc(s.href).querySelector('#content[data-folio-family]'))));
 });
 await p.click('#open-ai-settings');await p.fill('#openai-key','sk-adt-agent-test-not-a-real-key-1234567890');await p.click('#ai-connect-form button[type=submit]');await p.waitForFunction(()=>!document.querySelector('#ai-dialog').open);await p.click('[data-view=start]');await p.check('#design-ai');
 await check('Sol examines every source image; failed brand planning preserves completed page analysis',async()=>{
  await p.click('#create-design');await ready();await saved();assert.equal(calls.length,2);assert.equal(calls[0].body.model,'gpt-6.1-sol');assert.equal(calls[0].body.input[1].content.filter(c=>c.type==='input_image').length,4);assert.deepEqual(calls[0].input.pages.map(p=>p.page),[1,2,3,4]);assert.match(await p.locator('#design-job-status').textContent(),/4 \/ 4 pages analyzed.*paused/);assert.match(await p.locator('#create-design').textContent(),/Resume/);assert.equal(await p.evaluate(()=>folio.book.design.method),'local-extraction');
 });
 await check('Refresh never restarts paid requests; resume reuses source observations and saves Sol’s plan',async()=>{
  await p.reload();await ready();assert.equal(calls.length,2);assert.equal(await p.locator('#open-ai-settings').textContent(),'OpenAI key ready');mode='fail-luna';await p.click('#create-design');await ready();await saved();assert.deepEqual(calls.map(c=>c.type),['adt_pdf_pages','adt_brand_plan','adt_brand_plan','adt_family_assignment']);assert.equal(calls.at(-1).body.model,'gpt-6-luna');assert.equal(calls.at(-1).input.sourceObservations.length,4);assert.match(await p.locator('#design-job-status').textContent(),/paused/);
 });
 await check('Unknown assignment IDs are rejected atomically and do not repeat Sol',async()=>{
  mode='invalid-id';await p.click('#create-design');await ready();assert.equal(calls.length,5);assert.equal(calls.at(-1).body.model,'gpt-6-luna');assert.match(await p.locator('#toast').textContent(),/incomplete or unsafe/);assert.equal(await p.evaluate(()=>folio.book.design.method),'local-extraction');assert.equal(await p.evaluate(()=>folio.book.tokens.accent),defaults.accent);
 });
 await check('Luna-only resume applies the full design to every section and records source treatments',async()=>{
  mode='valid';await p.reload();await ready();assert.equal(calls.length,5);await p.click('#create-design');await ready();await saved();assert.equal(calls.length,6);assert.equal(calls.at(-1).type,'adt_family_assignment');assert.equal(await p.evaluate(()=>folio.book.design.method),'ai-guided');assert.equal(await p.evaluate(()=>folio.book.tokens.accent),'#284a72');assert.equal(await p.evaluate(()=>folio.book.validate().valid),true);await p.click('[data-view=book]');await p.click('#apply-book-design');await ready();assert.ok(await p.evaluate(()=>folio.book.spine.every(s=>folio.book.doc(s.href).querySelector('#content').dataset.folioPanel==='tinted')));assert.equal(await p.evaluate(()=>folio.book.design.sections.length),4);
  await p.screenshot({path:'tests/results/design-complete.png',fullPage:true});for(const call of calls){assert.equal(call.body.store,false);assert.equal(call.body.text.format.strict,true);assert.ok(!JSON.stringify(call.body).includes('sk-adt-agent-test'));}
 });
 await check('Guide and full source coverage survive refresh; later style edits update exported design tokens',async()=>{
  await p.reload();await ready();assert.equal(calls.length,6);assert.match(await p.locator('#design-library-status').textContent(),/AI analysis complete/);await p.click('[data-view=book]');if(await p.locator('#inspector').isHidden())await p.click('#toggle-tools');await p.click('[data-panel=chat]');await p.fill('#chat-input','Make the text larger');await p.click('#chat-form button');await ready();assert.equal(await p.evaluate(()=>folio.book.design.tokens.fontSize),22);assert.equal(await p.evaluate(()=>JSON.parse(new TextDecoder().decode(folio.book.files.get('folio/design-system.json'))).tokens.fontSize),22);
 });
 await check('Invalid brand cannot be cached as successful; protected exercise layout is rejected',async()=>{
  const result=await p.evaluate(async()=>{const {analyzeDesign}=await import('./src/design-ai.mjs?v=0.5.0');let checkpoint=null,stage='bad-brand',requests=[];const session={async structured(o){requests.push(o.formatName);const data=JSON.parse(o.content[0].text);if(o.formatName==='adt_pdf_pages')return {pages:data.pages.map(p=>({page:p.page,family:'lesson',layout:'preserve',panel_style:'plain',heading_scale:2,notes:''}))};if(o.formatName==='adt_brand_plan')return {tokens:{...folio.book.tokens,ink:stage==='bad-brand'?'#ffffff':folio.book.tokens.ink},headingScale:2,notes:'source evidence'};return {sections:data.sections.map(s=>({id:s.id,family:s.family,layout:s.controls?'split':'preserve',notes:''}))}}};let error1,error2;try{await analyzeDesign({book:folio.book,source:folio.source,session,consent:true,onCheckpoint:job=>{checkpoint=job}})}catch(e){error1=e.message}const brandWasNull=checkpoint.brand===null;stage='bad-layout';try{await analyzeDesign({book:folio.book,source:folio.source,session,job:checkpoint,consent:true,onCheckpoint:job=>{checkpoint=job}})}catch(e){error2=e.message}return {brandWasNull,error1,error2,requests}});
  assert.equal(result.brandWasNull,true);assert.match(result.error1,/4.5/);assert.match(result.error2,/incomplete or unsafe/);assert.equal(result.requests.filter(v=>v==='adt_pdf_pages').length,1);assert.equal(result.requests.filter(v=>v==='adt_brand_plan').length,2);
 });
 assert.deepEqual(errors,[]);await writeFile('tests/results/design-system.json',JSON.stringify({passed:true,checks,errors,mockedCalls:calls.length,paidAPICalls:0},null,2));
}finally{await browser.close();}
