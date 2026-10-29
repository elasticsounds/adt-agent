import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {zipSync} from 'fflate';
import {designFromPalette} from '../public/src/design.mjs';
import {contrastChecks} from '../public/src/core.mjs';
const base=process.env.APP_URL||'http://127.0.0.1:8890/';
const manifest=JSON.parse(await readFile('public/demo/files.json','utf8')),files={};
for(const name of manifest)files[name]=new Uint8Array(await readFile('public/demo/book/'+name));
// A long page inside a viewport-locked reader wrapper reproduces imported Studio layouts.
const pageName='pg001_sec001.html';let html=new TextDecoder().decode(files[pageName]);
html=html.replace('<body>','<body style="height:100vh;overflow:hidden"><div style="height:100vh;overflow:hidden">').replace('</body>','</div></body>').replace('</main>',Array.from({length:35},(_,i)=>'<p>Reading line '+i+': every part of this page must remain reachable.</p>').join('')+'<p id="last-line">End of the complete reading page.</p></main>');files[pageName]=new TextEncoder().encode(html);
const archive={name:'A complete textbook with a long descriptive filename.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync(files))};
await mkdir('tests/results',{recursive:true});const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:1280,height:800}}),errors=[],external=[],checks=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(new URL(base).origin))external.push(r.url())});
const idle=()=>p.waitForFunction(()=>document.body.dataset.busy!=='true');
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name)}
async function bookFrame(){await p.waitForFunction(()=>document.querySelector('#book-preview').dataset.ready==='true'&&!document.querySelector('#book-preview').hidden&&document.querySelector('#book-preview').srcdoc.includes('last-line'));const f=p.frames().find(f=>f.parentFrame());await f.waitForSelector('#last-line',{state:'attached'});return f;}
try{
 await p.goto(base);
 await check('ADT and PDF load together on Overview, in either order',async()=>{
  assert.ok(await p.locator('#create-design').isDisabled());await p.setInputFiles('#adt-file',archive);await idle();assert.ok(await p.locator('#start-view').isVisible());assert.match(await p.locator('#adt-file-name').textContent(),/complete textbook/);assert.ok(await p.locator('#create-design').isDisabled());await p.click('#continue-book');await p.click('#show-source');assert.ok(await p.locator('#pdf-empty').isVisible());await p.click('#add-source');assert.ok(await p.locator('#start-view').isVisible());assert.match(await p.locator('#adt-file-state').textContent(),/Loaded/);
  await p.setInputFiles('#pdf-file','public/demo/source.pdf');await idle();assert.ok(await p.locator('#start-view').isVisible());assert.match(await p.locator('#pdf-file-detail').textContent(),/4 pages inventoried/);assert.ok(await p.locator('#create-design').isEnabled());
  const reverse=await b.newPage();await reverse.goto(base);await reverse.setInputFiles('#pdf-file','public/demo/source.pdf');await reverse.waitForFunction(()=>document.body.dataset.busy!=='true');assert.ok(await reverse.locator('#start-view').isVisible());assert.match(await reverse.locator('#pdf-file-state').textContent(),/Loaded/);await reverse.setInputFiles('#adt-file',archive);await reverse.waitForFunction(()=>document.body.dataset.busy!=='true');assert.ok(await reverse.locator('#create-design').isEnabled());assert.ok(await reverse.locator('#start-view').isVisible());await reverse.close();
 });
 await check('Explicit design creation uses source colors with accessible contrast',async()=>{
  for(const color of ['#ffee22','#fafafa','#000000','#ff0022','#a8c090'])assert.ok(contrastChecks(designFromPalette([color])).every(c=>c.ratio>=4.5));
  await p.click('#create-design');await idle();assert.equal(await p.locator('#show-components').getAttribute('aria-pressed'),'true');assert.match(await p.locator('#pdf-evidence').textContent(),/4 physical pages inventoried/);assert.ok(parseFloat((await p.locator('#contrast-result').textContent()).match(/[\d.]+/)[0])>=4.5);await p.screenshot({path:'tests/results/usability-design.png',fullPage:true});
 });
 await check('Wide workspace fits a laptop and all reading content scrolls to its end',async()=>{
  await p.click('[data-view=book]');await p.click('#show-book');const frame=await bookFrame();const bounds=await p.locator('#book-preview').boundingBox(),footer=await p.locator('.preview-footer').boundingBox();assert.ok(bounds.width>850);assert.ok(footer.y+footer.height<=801);
  await p.mouse.move(bounds.x+bounds.width/2,bounds.y+100);await p.mouse.wheel(0,500);await frame.waitForFunction(()=>document.scrollingElement.scrollTop>100);
  await frame.locator('#last-line').scrollIntoViewIfNeeded();assert.ok(await frame.locator('#last-line').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight+1));
  const top=await frame.evaluate(()=>document.scrollingElement.scrollTop);await p.click('[data-view=start]');assert.match(await p.locator('#adt-file-state').textContent(),/Loaded/);assert.match(await p.locator('#pdf-file-state').textContent(),/Loaded/);await p.click('#continue-book');assert.equal(await frame.evaluate(()=>document.scrollingElement.scrollTop),top);
 });
 await check('Overview and the brand button preserve current section, design and edits',async()=>{
  await p.selectOption('#section-picker','2');await p.click('[data-panel=chat]');await p.fill('#chat-input','Make the text larger');await p.click('#chat-form button');await idle();const size=await p.locator('[name=fontSize]').inputValue();
  await p.click('#go-overview');assert.match(await p.locator('#overview-detail').textContent(),/Current section: 3 of 4/);await p.screenshot({path:'tests/results/usability-overview.png',fullPage:true});await p.click('[data-view=book]');assert.equal(await p.locator('#section-picker').inputValue(),'2');assert.equal(await p.locator('[name=fontSize]').inputValue(),size);assert.equal(await p.locator('[data-panel=chat]').getAttribute('aria-pressed'),'true');
 });
 await check('PDF scroll, page navigation and position survive Overview',async()=>{
  await p.click('#show-source');await p.waitForFunction(()=>document.querySelector('#pdf-canvas').dataset.ready==='true');const bounds=await p.locator('#preview-stage').boundingBox();await p.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await p.mouse.wheel(0,600);await p.waitForFunction(()=>document.querySelector('#preview-stage').scrollTop>100);
  await p.locator('#preview-stage').evaluate(n=>n.scrollTop=n.scrollHeight);assert.ok(await p.locator('#use-crop').evaluate(n=>n.getBoundingClientRect().bottom<=document.querySelector('#preview-stage').getBoundingClientRect().bottom));await p.click('#pdf-next');await p.waitForFunction(()=>document.querySelector('#pdf-canvas').dataset.ready==='true');const pageNumber=await p.locator('#pdf-page').inputValue();await p.locator('#preview-stage').evaluate(n=>n.scrollTop=200);const top=await p.locator('#preview-stage').evaluate(n=>n.scrollTop);await p.click('[data-view=start]');await p.click('[data-view=book]');assert.equal(await p.locator('#show-source').getAttribute('aria-pressed'),'true');assert.equal(await p.locator('#pdf-page').inputValue(),pageNumber);assert.equal(await p.locator('#preview-stage').evaluate(n=>n.scrollTop),top);await p.click('#show-book');await p.click('#show-source');assert.equal(await p.locator('#preview-stage').evaluate(n=>n.scrollTop),top);assert.equal(await p.locator('#pdf-canvas-wrap').evaluate(n=>getComputedStyle(n).touchAction),'pan-y');
 });
 await check('Tools and section list can be hidden without losing the working page',async()=>{
  const width=(await p.locator('#preview-stage').boundingBox()).width;await p.click('#toggle-tools');assert.ok((await p.locator('#preview-stage').boundingBox()).width>width+250);await p.click('#toggle-tools');await p.click('#toggle-sections');await p.fill('#page-search','small act');await p.locator('#page-list button').click();assert.equal(await p.locator('#section-picker').inputValue(),'3');await p.click('#toggle-sections');assert.ok(await p.locator('#page-list-panel').isHidden());
 });
 await check('Short laptop, tablet and phone layouts remain reachable and accessible',async()=>{
  await p.click('[data-panel=style]');await p.selectOption('#section-picker','0');await p.click('#show-book');await bookFrame();await p.addScriptTag({path:'node_modules/axe-core/axe.min.js'});
  for(const [width,height] of [[1280,720],[1024,768],[1440,900],[390,844]]){
   await p.setViewportSize({width,height});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const footer=await p.locator('.preview-footer').boundingBox();if(width>780)assert.ok(footer.y+footer.height<=height+1);
   const violations=await p.evaluate(async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));assert.deepEqual(violations,[],width+'px: '+JSON.stringify(violations));
  }
  await p.screenshot({path:'tests/results/usability-phone.png',fullPage:true});await p.setViewportSize({width:1280,height:800});
 });
 await check('Folder import stays on Overview and keeps the paired PDF',async()=>{
  await p.click('[data-view=start]');await p.setInputFiles('#adt-folder','public/demo/book');await idle();assert.ok(await p.locator('#start-view').isVisible());assert.match(await p.locator('#adt-file-detail').textContent(),/4 sections loaded/);assert.match(await p.locator('#pdf-file-detail').textContent(),/4 pages inventoried/);assert.ok(await p.locator('#create-design').isEnabled());assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 });
 await writeFile('tests/results/usability.json',JSON.stringify({passed:true,url:base,checks,errors,externalRequests:external},null,2));
}finally{await b.close();}
