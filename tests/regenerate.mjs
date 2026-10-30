import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1440,height:1100}}),sent=[],errors=[];
p.on('pageerror',e=>errors.push(e.message));let mode='valid',attempt=0;
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:90000});
const saved=()=>p.waitForFunction(()=>document.querySelector('#dirty-status').textContent==='Saved on this device');
const preview=()=>p.waitForFunction(()=>document.querySelector('#regen-preview').dataset.ready==='true');
const bytes=()=>p.evaluate(()=>[...folio.book.files].filter(([name])=>name.endsWith('.html')).map(([name,b])=>[name,new TextDecoder().decode(b)]));
async function check(name,fn){await fn();console.log('PASS '+name)}
await p.route('https://api.openai.com/v1/responses',async r=>{
 const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
 if(r.request().method()==='OPTIONS'){await r.fulfill({status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});return;}
 const body=r.request().postDataJSON();sent.push(body);const user=body.input[1].content[0].text,reference=JSON.parse(user.split('UNTRUSTED REFERENCE: ')[1]);
 if(mode==='error'){await r.fulfill({status:500,headers,body:JSON.stringify({error:{message:'Temporary test failure'}})});return;}
 if(mode==='slow'){await new Promise(resolve=>setTimeout(resolve,1500));}
 const value=body.model==='gpt-6.1-sol'?{summary:'Recompose the selected page.',instructions:'Use a compact stack and outlined adjacent content groups.'}:{summary:'A compact page with grouped content.',layout:'stack',density:++attempt%2?'compact':'airy',headingScale:2,imageWidth:70,readingWidth:860,alignment:'start',groups:reference.blocks.map(b=>({blocks:[b.id],treatment:attempt%2?'cards':'plain',layout:'stack'}))};
 if(mode==='invalid'&&body.model==='gpt-6-luna')value.groups.pop();
 await r.fulfill({headers,body:JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})}).catch(()=>{});
});
try{
 await mkdir('tests/results/regenerate',{recursive:true});await p.goto((process.env.APP_URL||'http://127.0.0.1:8890/')+'?sample');await ready();await p.click('[data-view=book]');if(await p.locator('#inspector').isHidden())await p.click('#toggle-tools');
 const initial=await bytes();let first;
 await check('Prompt dialog requires a key and explicit consent, makes no request on opening',async()=>{
  await p.click('#chat-regenerate');await preview();assert.equal(sent.length,0);await p.fill('#regen-prompt','Use a compact page with a smaller title and outlined groups.');await p.click('#regen-generate');await ready();assert.match(await p.locator('#regen-error').textContent(),/API key/);assert.equal(sent.length,0);
  await p.click('#regen-key');await p.fill('#openai-key','sk-adt-agent-test-not-a-real-key-1234567890');await p.click('#ai-connect-form button[type=submit]');await p.click('#regen-generate');await ready();assert.match(await p.locator('#regen-error').textContent(),/Approve sharing/);assert.equal(sent.length,0);
 });
 await check('Sol plans, Luna composes; source included only by choice; original page unchanged',async()=>{
  await p.check('#regen-consent');await p.uncheck('#regen-source');await p.click('#regen-generate');await ready();await preview();assert.equal(await p.locator('#regen-error').isVisible(),false,await p.locator('#regen-error').textContent());assert.equal(sent.length,2);assert.deepEqual(sent.map(s=>s.model),['gpt-6.1-sol','gpt-6-luna']);assert.ok(sent.every(s=>s.store===false&&s.text.format.strict));assert.ok(sent.every(s=>s.input[1].content.every(c=>c.type!=='input_image')));assert.deepEqual(await bytes(),initial);assert.equal(await p.locator('#regen-generate').textContent(),'Try again');
  first=await p.frameLocator('#regen-preview').locator('#content').innerHTML();assert.match(first,/adt-regenerated-page/);assert.equal(await p.frameLocator('#regen-preview').locator('html').evaluate(()=>innerWidth),1280);assert.equal(await p.locator('#regen-preview').getAttribute('sandbox'),'allow-scripts');
 });
 await check('Retry uses revised prompt and previous attempt, with a PDF reference',async()=>{
  await p.fill('#regen-prompt','Try again: give the page more space and remove card borders.');await p.check('#regen-source');await p.click('#regen-generate');await ready();await preview();assert.equal(await p.locator('#regen-error').isVisible(),false,await p.locator('#regen-error').textContent());assert.equal(sent.length,4);assert.match(sent[2].input[1].content[0].text,/previousAttempts.*outlined groups/);assert.ok(sent.slice(2).every(s=>s.input[1].content.some(c=>c.type==='input_image')));assert.notEqual(await p.frameLocator('#regen-preview').locator('#content').innerHTML(),first);assert.deepEqual(await bytes(),initial);await saved();
  await p.locator('#regenerate-dialog').screenshot({path:'tests/results/regenerate/preview.png'});
 });
 await check('Prompt and preview survive refresh without another API call',async()=>{
  await p.reload();await ready();await p.click('#chat-regenerate');await preview();assert.equal(sent.length,4);assert.match(await p.locator('#regen-summary').textContent(),/Attempt 2/);assert.match(await p.locator('#regen-prompt').inputValue(),/Try again/);assert.equal(await p.locator('#regen-consent').isChecked(),false);assert.ok(await p.locator('#regen-use').isEnabled());
 });
 await check('Invalid output and API failure retain the prior preview and original book',async()=>{
  await p.check('#regen-consent');mode='invalid';await p.click('#regen-generate');await ready();assert.match(await p.locator('#regen-error').textContent(),/omitted/);assert.match(await p.locator('#regen-summary').textContent(),/Attempt 2/);assert.deepEqual(await bytes(),initial);
  mode='error';await p.click('#regen-generate');await ready();assert.ok(await p.locator('#regen-error').isVisible());assert.ok(await p.locator('#regen-use').isEnabled());assert.deepEqual(await bytes(),initial);mode='valid';
 });
 await check('Preview keeps a fixed desktop size and fits phone screens accessibly',async()=>{
  for(const width of [2560,390]){await p.setViewportSize({width,height:1000});await p.waitForTimeout(150);assert.equal(await p.frameLocator('#regen-preview').locator('html').evaluate(()=>innerWidth),1280);const box=await p.locator('#regen-preview').evaluate(n=>({frame:n.getBoundingClientRect().toJSON(),host:n.parentElement.getBoundingClientRect().toJSON()}));assert.ok(Math.abs(box.frame.width-box.host.width)<2);assert.ok(Math.abs(box.frame.height-box.host.height)<2);assert.ok(await p.locator('#regenerate-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth));}
  await p.addScriptTag({url:new URL('vendor/axe.min.js',p.url()).href});const violations=await p.evaluate(async()=>{const result=await axe.run(document.querySelector('#regenerate-dialog'),{rules:{'frame-tested':{enabled:false}}});return result.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));});assert.deepEqual(violations,[]);await p.setViewportSize({width:1440,height:1100});
 });
 await check('Apply changes only the selected HTML, validates ADT, Undo restores it',async()=>{
  await p.click('#regen-use');await ready();await saved();assert.equal(await p.locator('#regenerate-dialog').isVisible(),false);const changed=(await bytes()).filter(([name,html])=>initial.find(([n])=>n===name)?.[1]!==html);assert.equal(changed.length,1);assert.match(changed[0][1],/adt-regenerated-page/);assert.equal(await p.evaluate(()=>folio.book.validate().valid),true);assert.equal(await p.evaluate(()=>JSON.parse(new TextDecoder().decode(folio.book.files.get('folio/page-regenerations.json')))[folio.book.spine[0].href].attempt),2);
  await p.click('#undo');await ready();assert.deepEqual(await bytes(),initial);
 });
 await check('Abort stops the workflow without changing the page',async()=>{
  await p.click('#chat-regenerate');await preview();mode='slow';const count=sent.length;await p.click('#regen-generate');await p.waitForFunction(()=>!document.querySelector('#cancel-ai').hidden);await p.click('#cancel-ai');await ready();assert.deepEqual(await bytes(),initial);assert.ok(sent.length<=count+1);mode='valid';await p.click('#regen-close');
 });
 await check('A stale preview cannot overwrite a later edit',async()=>{
  await p.click('#chat-regenerate');await preview();await p.click('#regen-generate');await ready();assert.equal(await p.locator('#regen-error').isVisible(),false);await p.evaluate(()=>folio.book.snapshot('A later edit'));await p.click('#regen-use');await ready();assert.match(await p.locator('#regen-error').textContent(),/book changed/);assert.deepEqual(await bytes(),initial);await p.click('#regen-close');await p.click('#chat-regenerate');await preview();assert.equal(await p.locator('#regen-use').isEnabled(),false);assert.match(await p.locator('#regen-error').textContent(),/book changed/);await p.click('#regen-close');
 });
 await check('Protected exercise layouts reject split, missing and duplicated content',async()=>{
  const result=await p.evaluate(async()=>{const m=await import('./src/regenerate.mjs');const b=folio.book,p=b.spine.find(p=>b.doc(p.href).querySelector('input,textarea,select'));const c=m.regenerationContext(b,p.href),recipe={summary:'Test',layout:'stack',density:'normal',headingScale:2,imageWidth:80,readingWidth:900,alignment:'start',groups:c.blocks.map(x=>({blocks:[x.id],treatment:'plain',layout:'stack'}))};const html=m.renderRegeneration(b,p.href,recipe).html;let rejected=0;for(const r of [{...recipe,layout:'split'},{...recipe,groups:recipe.groups.slice(1)},{...recipe,groups:[...recipe.groups,recipe.groups[0]]}])try{m.validateRegeneration(r,c)}catch{rejected++}return {rejected,html};});assert.equal(result.rejected,3);assert.match(result.html,/adt-regenerated/);
 });
 assert.deepEqual(errors,[]);console.log('All regeneration checks passed.');
}finally{await browser.close()}
