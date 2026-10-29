import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const raw=process.env.RAW_ADT;if(!raw)throw Error('Set RAW_ADT to the original Studio book.');
const out='tests/results/book-application';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:180000});
const frameReady=()=>p.waitForFunction(()=>document.querySelector('#book-preview').dataset.ready==='true',null,{timeout:30000});
try{
 await p.goto('http://127.0.0.1:8890/');await ready();await p.locator('#adt-folder').setInputFiles(raw);await ready();
 const design=JSON.parse(await readFile('tests/results/compositions/draft.json','utf8'));delete design.application;design.draft.stage='review';
 const assets=[];async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await walk(f);else assets.push([f.slice('tests/results/compositions/runtime/'.length),Array.from(await readFile(f))]);}}await walk('tests/results/compositions/runtime/folio/compositions');
 await p.evaluate(({design,assets})=>{folio.book.design=design;folio.book.tokens=design.tokens;for(const [path,bytes]of assets)folio.book.write(path,new Uint8Array(bytes));folio.setView('book')},{design,assets});await frameReady();
 const before=await p.evaluate(()=>folio.book.spine.map(p=>[p.href,new TextDecoder().decode(folio.book.files.get(p.href))]));
 await p.click('#apply-book-design');await ready();assert.equal(await p.evaluate(()=>folio.book.design.application?.sections.length),92,await p.locator('#toast').textContent());
 assert.ok(await p.evaluate(()=>folio.book.spine.every(p=>folio.book.doc(p.href).querySelector('#content.adt-composition .adt-page'))));assert.equal(await p.evaluate(()=>folio.book.validate().valid),true);
 const once=await p.evaluate(()=>folio.book.spine.map(p=>[p.href,new TextDecoder().decode(folio.book.files.get(p.href))]));assert.equal(once.filter(([href,html],i)=>html!==before[i][1]).length,92);
 await p.click('#undo');await frameReady();assert.deepEqual(await p.evaluate(()=>folio.book.spine.map(p=>[p.href,new TextDecoder().decode(folio.book.files.get(p.href))])),before);
 await p.click('#apply-book-design');await ready();assert.deepEqual(await p.evaluate(()=>folio.book.spine.map(p=>[p.href,new TextDecoder().decode(folio.book.files.get(p.href))])),once);console.log('All 92 sections applied; contracts pass; one Undo restores all originals; reapply is deterministic.');
 await p.click('[data-view=design]');await p.click('#toggle-design-tools');await p.locator('[name=fontSize]').fill('24');const liveTokens=await p.evaluate(()=>new TextDecoder().decode(folio.book.files.get('folio/book-design/tokens.css')));await p.click('#apply-style');await ready();assert.equal(await p.evaluate(()=>new TextDecoder().decode(folio.book.files.get('folio/book-design/tokens.css'))),liveTokens);
 await p.click('#design-open-book');await p.click('#apply-book-design');await ready();assert.equal(await p.evaluate(()=>folio.book.design.application.pending),false);assert.equal(await p.evaluate(()=>folio.book.validate().valid),true);assert.match(await p.evaluate(()=>new TextDecoder().decode(folio.book.files.get('folio/book-design/tokens.css'))),/--adt-size:24px/);console.log('Updated library tokens stay separate until Apply updated design; repeated application preserves contracts.');
 await p.waitForFunction(()=>document.querySelector('#dirty-status').textContent==='Saved on this device');await p.reload();await ready();await frameReady();assert.equal(await p.evaluate(()=>folio.book.design.application.sections.length),92);assert.ok(await p.locator('#apply-book-design').isDisabled());
 await p.exposeFunction('scanProgress',(n,total,href,width)=>{if(n%20===0||n===total)console.log('Checked '+n+'/'+total+' '+width+'px '+href)});
 await p.evaluate(async()=>{await folio.scanBook(folio.book,(...args)=>window.scanProgress(...args))});
 const report=await p.evaluate(()=>({coverage:folio.book.coverage,visual:folio.book.visual,validation:folio.book.validate()}));await writeFile(out+'/checks.json',JSON.stringify(report,null,2));
 console.log('Scan findings: '+JSON.stringify(Object.fromEntries([...new Set(report.visual.map(i=>i.kind))].map(k=>[k,report.visual.filter(i=>i.kind===k).length]))));
 for(const href of ['pg015_sec001.html','pg023_sec001.html','pg041_sec005.html','pg043_sec001.html']){
  await p.selectOption('#section-picker',String(await p.evaluate(href=>folio.book.spine.findIndex(s=>s.href===href),href)));await frameReady();const frame=await (await p.locator('#book-preview').elementHandle()).contentFrame();const capture=await browser.newPage({viewport:{width:1000,height:1100}});await capture.setContent(await p.locator('#book-preview').getAttribute('srcdoc'),{waitUntil:'load'});await capture.evaluate(()=>document.fonts.ready);await capture.screenshot({path:out+'/'+href.replace('.html','.png'),fullPage:true});await capture.close();
 }
 await p.click('[data-view=export]');const dl=p.waitForEvent('download');await p.click('#download-book');await (await dl).saveAs(out+'/applied-book.zip');await ready();console.log('Applied book exported with synchronized cache and shared components.');
 assert.deepEqual(errors,[]);assert.equal(report.coverage.completed.length,184);assert.equal(report.visual.filter(i=>['overflow','render-image','scan-error'].includes(i.kind)).length,0,'Layout failures: '+JSON.stringify(report.visual.filter(i=>['overflow','render-image','scan-error'].includes(i.kind))));
}finally{await browser.close()}
