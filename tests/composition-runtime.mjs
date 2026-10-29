import http from 'node:http';
import path from 'node:path';
import {readFile,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const raw=process.env.RAW_ADT;if(!raw)throw Error('Set RAW_ADT. Run composition-reference.mjs first.');
const root=path.resolve('tests/results/compositions/runtime');
const draft=JSON.parse(await readFile('tests/results/compositions/draft.json','utf8')).draft;
const types={html:'text/html',js:'text/javascript',css:'text/css',json:'application/json',ttf:'font/ttf',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml',woff2:'font/woff2'};
const server=http.createServer(async(req,res)=>{try{const file=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';if(file.split('/').includes('..'))throw Error('Invalid path');let bytes;try{bytes=await readFile(path.join(root,file))}catch{bytes=await readFile(path.join(raw,file))}res.setHeader('Content-Type',types[file.split('.').pop()]||'application/octet-stream');res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/';
const browser=await chromium.launch({channel:'chrome',headless:true}),results={checks:[],audits:[],errors:[]};
try{
 for(const width of [1440,390]){
  const p=await browser.newPage({viewport:{width,height:1000}});p.on('pageerror',e=>results.errors.push(e.message));
  for(const example of draft.examples){await p.goto(base+example.href);await p.waitForFunction(()=>document.querySelector('#content')?.classList.contains('opacity-100'));await p.evaluate(()=>document.fonts.ready);await p.addScriptTag({path:'public/vendor/axe.min.js'});
   const audit=await p.evaluate(async()=>{const r=await axe.run(document.querySelector('#content'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),incomplete:r.incomplete.map(v=>v.id),overflow:document.documentElement.scrollWidth>innerWidth+2};});
   results.audits.push({width,href:example.href,...audit});assert.equal(audit.overflow,false);assert.deepEqual(audit.violations,[],example.href+' '+width);
   if(example.kind==='quiz'){const answers=await p.locator('[data-correct-answers]').evaluate(n=>JSON.parse(n.dataset.correctAnswers));for(const correct of [false,true]){const key=Object.keys(answers).find(k=>answers[k]===correct),option=p.locator(`label[data-activity-item="${key}"]`);await option.focus();await p.keyboard.press('Enter');assert.equal(await option.getAttribute('aria-invalid'),String(!correct));assert.ok((await option.locator('.feedback-text').innerText()).length>3);}results.checks.push('Quiz keyboard feedback at '+width);}
  }
  await p.goto(base+'pg008_sec002.html');const ready=()=>p.waitForFunction(()=>document.querySelector('#content')?.classList.contains('opacity-100'));await ready();await p.locator('#item-1').fill('Composition review answer');
  await p.getByRole('button',{name:'Faqja e ardhshme',exact:true}).click();await p.waitForURL('**/pg008_sec003.html');await ready();assert.equal(await p.locator('#content.adt-composition').count(),1);
  await p.getByRole('button',{name:'Faqja e mëparshme',exact:true}).click();await p.waitForURL('**/pg008_sec002.html');await ready();assert.equal(await p.locator('#content.adt-composition').count(),1);assert.equal(await p.locator('#item-1').inputValue(),'Composition review answer');await p.reload();await ready();assert.equal(await p.locator('#item-1').inputValue(),'Composition review answer');results.checks.push('Next/Back retain composition and saved answer survives reload at '+width);await p.close();
 }
 assert.deepEqual(results.errors,[]);results.passed=true;console.log(JSON.stringify(results,null,2));
}finally{await browser.close();server.close();await writeFile('tests/results/compositions/runtime-checks.json',JSON.stringify(results,null,2));}
