import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],checks=[],requests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:8890/'))requests.push(r.url())});
const ready=()=>page.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:90000});
const frame=async()=>{await page.waitForFunction(()=>document.querySelector('#book-preview').dataset.ready==='true');const f=await (await page.locator('#book-preview').elementHandle()).contentFrame();await f.waitForSelector('#content.opacity-100');return f;};
async function select(href){await page.evaluate(h=>folio.selectPage(folio.book.spine.findIndex(p=>p.href===h)),href);return frame()}
try{
 await page.goto('http://127.0.0.1:8890/');await ready();await page.setInputFiles('#adt-file',process.env.APPLIED_ZIP||'tests/results/book-application/upgraded-book.zip');await ready();await page.click('[data-view=book]');let f=await frame();
 const count=await page.evaluate(()=>folio.book.spine.length);
 assert.equal(await f.getByRole('button',{name:'Cilësimet',exact:true}).count(),1);assert.equal(await f.getByRole('button',{name:'Fjalori',exact:true}).count(),1);
 for(let n=0;n<count;n++){
  await f.waitForFunction(()=>document.querySelector('#content.adt-composition')?.classList.contains('opacity-100'));
  assert.equal(await page.locator('#section-picker').inputValue(),String(n));
  assert.equal(await f.locator('#content.adt-composition .adt-page').count(),1);
  if(n<count-1){await f.getByRole('button',{name:'Faqja e ardhshme',exact:true}).click();await page.waitForFunction(n=>document.querySelector('#section-picker').value===String(n),n+1);}
  if((n+1)%20===0)console.log('Embedded native Next',n+1,'/',count);
 }
 checks.push('All '+count+' sections visited with the original reader Next button; applied design preserved');
 f=await select('pg008_sec002.html');await f.locator('textarea').first().fill('Embedded reader saved response');await f.getByRole('button',{name:'Faqja e ardhshme',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#section-picker').value==='9');await f.getByRole('button',{name:'Faqja e mëparshme',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#section-picker').value==='8');assert.equal(await f.locator('textarea').first().inputValue(),'Embedded reader saved response');
 await page.waitForFunction(()=>document.querySelector('#dirty-status').textContent==='Saved on this device');await page.reload();await ready();f=await frame();assert.equal(await f.locator('textarea').first().inputValue(),'Embedded reader saved response');checks.push('Responses and current page survive native Next/Back and app refresh');
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});f=await select('qz001.html');const answers=await f.locator('[data-correct-answers]').evaluate(n=>JSON.parse(n.dataset.correctAnswers));
  for(const correct of [false,true]){const key=Object.keys(answers).find(k=>answers[k]===correct),option=f.locator(`label[data-activity-item="${key}"]`);await option.focus();await page.keyboard.press('Enter');assert.equal(await option.getAttribute('aria-invalid'),String(!correct));assert.ok((await option.locator('.feedback-text').innerText()).length>3);}
  f=await select('pg032_sec003.html');const region=f.locator('.adt-table-scroll');await region.focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#section-picker').inputValue(),await page.evaluate(()=>String(folio.book.spine.findIndex(p=>p.href==='pg032_sec003.html'))));if(width===390)assert.ok(await region.evaluate(n=>n.scrollLeft)>0);
  await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await f.evaluate(()=>document.body.scrollHeight<=innerHeight+3));
  await page.locator('#book-preview').scrollIntoViewIfNeeded();await page.mouse.wheel(0,700);await page.waitForTimeout(300);assert.ok(await page.evaluate(()=>scrollY>100));assert.ok((await page.locator('.app-header').boundingBox()).y<0);assert.equal(await f.evaluate(()=>scrollY),0);
  await mkdir('tests/results/embedded-reader',{recursive:true});await page.screenshot({path:`tests/results/embedded-reader/book-${width}.png`,fullPage:true});
 }
 checks.push('Native quiz keyboard feedback and table scrolling work on desktop and phone; outer page scrolls, reader has no nested vertical viewport');
 await page.setViewportSize({width:1440,height:1000});f=await select('pg008_sec002.html');await f.getByRole('button',{name:'Cilësimet',exact:true}).click();await page.waitForTimeout(300);assert.ok((await f.locator('body').innerText()).includes('Cilësimet'));checks.push('Native settings panel opens inside the reader');
 assert.equal(await page.locator('#book-preview').getAttribute('sandbox'),'allow-scripts');assert.equal(await f.evaluate(()=>{try{return parent.document.title}catch{return 'isolated'}}),'isolated');assert.equal(await f.evaluate(async()=>{try{return (await fetch('https://example.com/')).status}catch{return 0}}),404);assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);checks.push('Imported reader isolated from application storage and network; no external requests or script errors');
 console.log(checks.join('\n'));await writeFile('tests/results/embedded-reader/checks.json',JSON.stringify({checks,errors,requests},null,2));
}finally{await browser.close()}
