import {chromium} from 'playwright';
import {clickReader} from './reader-coordinates.mjs';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
p.on('pageerror',e=>errors.push(e.message));
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:120000});
const f=()=>p.frameLocator('#book-preview');
const frameReady=async()=>{await p.waitForFunction(()=>document.querySelector('#book-preview').dataset.ready==='true');await f().locator('#content.opacity-100').waitFor()};
try{
 await p.goto('http://127.0.0.1:8890/');await ready();await p.setInputFiles('#adt-file',process.env.APPLIED_ZIP||'tests/results/book-application/upgraded-book.zip');await ready();await p.click('[data-view=book]');await frameReady();
 const checks=await p.evaluate(async()=>{
  const m=await import('./src/regenerate.mjs'),b=folio.book,results=[];
  window.regenTestRecipe=c=>({summary:'Compact source-based page',layout:'stack',density:'compact',headingScale:2,imageWidth:80,readingWidth:900,alignment:'start',groups:c.blocks.map(x=>({blocks:[x.id],treatment:'plain',layout:'stack'}))});
  for(const index of [0,1,2,6,7,8,26,40,70,91]){const page=b.spine[index];if(!page)continue;try{const context=m.regenerationContext(b,page.href),result=m.renderRegeneration(b,page.href,regenTestRecipe(context));results.push({href:page.href,blocks:context.blocks.length,ok:!!result.html});}catch(e){results.push({href:page.href,error:e.message});}}
  return results;
 });
 console.log(checks);assert.ok(checks.every(c=>c.ok),'Representative real-book pages preserve their ADT contract');
 await p.selectOption('#section-picker','8');await frameReady();await f().locator('textarea').first().fill('Answer retained after regeneration');
 await p.evaluate(async()=>{const m=await import('./src/regenerate.mjs'),{sha}=await import('./src/core.mjs'),b=folio.book,href=b.spine[8].href,recipe=regenTestRecipe(m.regenerationContext(b,href));const result=m.renderRegeneration(b,href,recipe);await m.applyRegeneration(b,{href,...result,recipe,baseHash:await sha(b.files.get(href)),prompt:'Make the exercise compact.',attempt:1});await folio.setView('book');});await frameReady();
 assert.equal(await f().locator('textarea').first().inputValue(),'Answer retained after regeneration');
 await clickReader(p,f().getByRole('button',{name:'Faqja e ardhshme',exact:true}));await p.waitForFunction(()=>document.querySelector('#section-picker').value==='9');
 await clickReader(p,f().getByRole('button',{name:'Faqja e mëparshme',exact:true}));await p.waitForFunction(()=>document.querySelector('#section-picker').value==='8');await frameReady();assert.equal(await f().locator('textarea').first().inputValue(),'Answer retained after regeneration');assert.equal(await f().locator('.adt-regenerated-page').count(),1);
 console.log('PASS actual reader Next / Back retain regenerated layout and learner answer');
 const verification=await p.evaluate(async()=>{const m=await import('./src/regenerate.mjs'),{sha}=await import('./src/core.mjs'),b=folio.book,href=b.spine[8].href,recipe=regenTestRecipe(m.regenerationContext(b,href)),result=m.renderRegeneration(b,href,{...recipe,density:'airy'});await m.applyRegeneration(b,{href,...result,recipe:{...recipe,density:'airy'},baseHash:await sha(b.files.get(href)),prompt:'Try again with more space.',attempt:2});const d=b.doc(href),output=await b.output();return {wrappers:d.querySelectorAll('.adt-regenerated-page').length,valid:b.validate().valid,exported:new TextDecoder().decode(output.get(href)).includes('--regen-space:36px')};});assert.deepEqual(verification,{wrappers:1,valid:true,exported:true});
 console.log('PASS regenerating an applied page replaces its previous layout, and exports correctly');
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
