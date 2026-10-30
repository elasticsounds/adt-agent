import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],calls=[];
const base=process.env.APP_URL||'http://127.0.0.1:8890/';
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:90000});
p.on('pageerror',e=>errors.push(e.message));
await p.route('https://api.openai.com/v1/responses',async route=>{
 const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
 if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});return;}
 const body=route.request().postDataJSON();calls.push(body.model);const reference=JSON.parse(body.input[1].content[0].text.split('UNTRUSTED REFERENCE: ')[1]);
 const value=body.model==='gpt-6.1-sol'?{summary:'A compact page.',instructions:'Use a compact single-column composition.'}:{summary:'A compact page with the existing design.',layout:'stack',density:'compact',headingScale:1.8,imageWidth:70,readingWidth:900,alignment:'start',groups:reference.blocks.map(b=>({blocks:[b.id],treatment:'plain',layout:'stack'}))};
 await route.fulfill({headers,body:JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})});
});
try{
 await p.goto(base+'?sample');await ready();assert.match(await p.locator('script[type=module][src]').getAttribute('src'),/v=0\.10\.0/);await p.click('[data-view=book]');if(await p.locator('#inspector').isHidden())await p.click('#toggle-tools');
 await p.click('#open-ai-settings');await p.fill('#openai-key','sk-adt-agent-test-not-a-real-key-1234567890');await p.click('#ai-connect-form button[type=submit]');
 await p.click('#chat-regenerate');await p.fill('#regen-prompt','Make this page more compact with a smaller heading.');await p.check('#regen-consent');await p.click('#regen-generate');await ready();assert.equal(await p.locator('#regen-error').isVisible(),false,await p.locator('#regen-error').textContent());assert.ok(await p.locator('#regen-use').isEnabled());assert.equal(await p.frameLocator('#regen-preview').locator('.adt-regenerated-page').count(),1);
 await p.click('#regen-close');await p.waitForFunction(()=>document.querySelector('#dirty-status').textContent==='Saved on this device');await p.reload();await ready();await p.click('#chat-regenerate');assert.ok(await p.locator('#regen-use').isEnabled());assert.equal(await p.locator('#regen-consent').isChecked(),false);await p.click('#regen-use');await ready();await p.waitForFunction(()=>document.querySelector('#book-preview').dataset.ready==='true');assert.equal(await p.frameLocator('#book-preview').locator('.adt-regenerated-page').count(),1);
 await p.click('#undo');await ready();await p.waitForFunction(()=>document.querySelector('#book-preview').dataset.ready==='true');assert.equal(await p.frameLocator('#book-preview').locator('.adt-regenerated-page').count(),0);
 assert.deepEqual(calls,['gpt-6.1-sol','gpt-6-luna']);assert.deepEqual(errors,[]);console.log('PASS deployed build: sample, key gate, Sol/Luna regeneration, saved preview, apply and Undo; no runtime errors or paid calls');
}finally{await browser.close()}
