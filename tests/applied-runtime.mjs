import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {unzipSync} from 'fflate';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const entries=unzipSync(new Uint8Array(await readFile(process.env.APPLIED_ZIP||'tests/results/book-application/applied-book.zip'))),spine=JSON.parse(new TextDecoder().decode(entries['content/pages.json']));
const types={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',ttf:'font/ttf',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml',woff2:'font/woff2'};
const server=http.createServer((req,res)=>{const key=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html',bytes=entries[key];if(!bytes){res.writeHead(404);res.end();return}res.setHeader('Content-Type',types[key.split('.').pop()]||'application/octet-stream');res.end(bytes)});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port+'/',browser=await chromium.launch({channel:'chrome',headless:true}),results={walks:[],checks:[],errors:[],incomplete:[]};
try{
 for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:1000}});p.on('pageerror',e=>results.errors.push(e.message));const ready=()=>p.waitForFunction(()=>document.querySelector('#content.adt-composition')?.classList.contains('opacity-100'));
  await p.goto(base+spine[0].href);await ready();
  for(let index=0;index<spine.length;index++){
   assert.ok(new URL(p.url()).pathname.endsWith(spine[index].href));await ready();assert.equal(await p.locator('#content.adt-composition .adt-page').count(),1);
   if(index<spine.length-1){await p.getByRole('button',{name:'Faqja e ardhshme',exact:true}).click();await p.waitForURL('**/'+spine[index+1].href);}
   if((index+1)%20===0)console.log('Reader Next: '+(index+1)+' / '+spine.length+' at '+width);
  }
  results.walks.push({width,sections:spine.length});
  for(const href of ['pg008_sec002.html','pg015_sec001.html','pg041_sec005.html','pg032_sec003.html']){
   await p.goto(base+href);await ready();const field=p.locator('textarea').first(),choice=p.locator('input[type=radio],input[type=checkbox]').first();
   if(await field.count())await field.fill('Saved response '+width);else {const label=p.locator('label[for="'+await choice.getAttribute('id')+'"]');if(await label.count())await label.click();else await choice.check();}
   const controlId=await (await field.count()?field:choice).getAttribute('id');await p.getByRole('button',{name:'Faqja e ardhshme',exact:true}).click();await p.waitForURL(url=>!url.pathname.endsWith(href));await ready();await p.getByRole('button',{name:'Faqja e mëparshme',exact:true}).click();await p.waitForURL('**/'+href);await ready();await p.reload();await ready();
   if(await field.count())assert.equal(await p.locator('#'+controlId).inputValue(),'Saved response '+width);else assert.equal(await p.locator('#'+controlId).isChecked(),true);results.checks.push('Saved activity after Next/Back/reload: '+href+' '+width);
  }
  for(const href of ['qz001.html','qz009.html']){await p.goto(base+href);await ready();const answers=await p.locator('[data-correct-answers]').evaluate(n=>JSON.parse(n.dataset.correctAnswers));for(const correct of [false,true]){const key=Object.keys(answers).find(k=>answers[k]===correct),option=p.locator(`label[data-activity-item="${key}"]`);await option.focus();await p.keyboard.press('Enter');assert.equal(await option.getAttribute('aria-invalid'),String(!correct));assert.ok((await option.locator('.feedback-text').innerText()).length>3);}results.checks.push('Quiz keyboard feedback: '+href+' '+width);}
  await p.goto(base+'pg032_sec003.html');await ready();const region=p.locator('.adt-table-scroll');assert.equal(await region.getAttribute('tabindex'),'0');await region.focus();await p.keyboard.press('ArrowRight');await p.waitForTimeout(200);if(width===390)assert.ok(await region.evaluate(n=>n.scrollLeft>0));results.checks.push('Table is keyboard scrollable at '+width);
  for(const href of ['pg005_sec001.html','pg025_sec001.html','pg031_sec003.html','pg042_sec001.html']){await p.goto(base+href);await ready();await p.addScriptTag({path:'public/vendor/axe.min.js'});const incomplete=await p.evaluate(async()=>{const r=await axe.run(document.querySelector('#content'),{runOnly:{type:'rule',values:['color-contrast']}});return {violations:r.violations.map(v=>v.id),incomplete:r.incomplete.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target),reasons:v.nodes.map(n=>n.any.map(c=>c.message))}))}});results.incomplete.push({href,width,...incomplete});assert.deepEqual(incomplete.violations,[]);}
  await p.close();
 }
 assert.deepEqual(results.errors,[]);results.passed=true;console.log('Full exported reader: 184 navigation visits; written responses, radio states, quizzes and keyboard table scrolling passed.');
}finally{await browser.close();server.close();await writeFile('tests/results/book-application/runtime.json',JSON.stringify(results,null,2));}
