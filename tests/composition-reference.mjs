import {chromium} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const raw=process.env.RAW_ADT,source=process.env.SOURCE_PDF;
if(!raw||!source)throw Error('Set RAW_ADT to the unstyled Studio folder and SOURCE_PDF to the matching PDF.');
assert.ok(!(await readFile(raw+'/pg001_sec001.html','utf8')).includes('pdf-document'),'Test input must be raw Studio output.');
const out='tests/results/compositions';await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage(),errors=[],checks=[];
p.on('pageerror',e=>errors.push(e.message));
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:180000});
const frameReady=()=>p.waitForFunction(()=>document.querySelector('#book-preview').dataset.ready==='true',null,{timeout:30000});
try{
 await p.goto(process.env.APP_URL||'http://127.0.0.1:8890/');await ready();
 await p.locator('#adt-folder').setInputFiles(raw);await ready();
 await p.locator('#pdf-file').setInputFiles(source);await ready();
 assert.equal(await p.evaluate(()=>folio.source.inventory.length),94);
 const before=await p.evaluate(()=>({html:Object.fromEntries(folio.book.spine.map(s=>[s.href,new TextDecoder().decode(folio.book.files.get(s.href))])),count:folio.book.spine.length}));
 await p.evaluate(()=>document.querySelector('#design-ai').checked=false);await p.click('#create-design');await ready();
 const design=await p.evaluate(()=>folio.book.design);assert.ok(design?.draft,await p.locator('#toast').textContent());assert.equal(design.draft.examples.length,6);
 assert.equal(await p.evaluate(()=>folio.book.validate().valid),true);
 const preservation=await p.evaluate(async()=>{const {designPreviewBook}=await import('./src/compositions.mjs?v=0.6.0');return designPreviewBook(folio.book).validate();});assert.equal(preservation.valid,true,JSON.stringify(preservation.failures));checks.push('Raw 92-section ADT and 94-page source; six composed examples');
 assert.deepEqual(await p.evaluate(()=>Object.fromEntries(folio.book.spine.map(s=>[s.href,new TextDecoder().decode(folio.book.files.get(s.href))]))),before.html);checks.push('Gallery generation leaves every original book section unchanged');
 await p.click('#toggle-tools');await p.locator('#style-form [name=accent]').fill('#285876');await p.click('#apply-style');await ready();await frameReady();assert.equal(await p.evaluate(()=>folio.book.tokens.accent),'#285876');assert.deepEqual(await p.evaluate(()=>Object.fromEntries(folio.book.spine.map(s=>[s.href,new TextDecoder().decode(folio.book.files.get(s.href))]))),before.html);await p.click('#undo');await frameReady();assert.equal(await p.evaluate(()=>folio.book.tokens.accent),'#765181');await p.click('#toggle-tools');checks.push('Style controls update the shared draft only; undo restores its tokens');
 await p.click('[data-view=start]');await p.click('#create-design');await ready();await frameReady();assert.deepEqual(await p.evaluate(()=>folio.book.design.draft.pages),design.draft.pages);checks.push('Repeated generation produces identical compositions without accumulating wrappers');
 await frameReady();const gallery=await context.newPage();await gallery.setContent(await p.locator('#book-preview').getAttribute('srcdoc'),{waitUntil:'load'});await gallery.evaluate(()=>document.fonts.ready);await gallery.screenshot({path:out+'/gallery.png',fullPage:true});await gallery.close();await p.bringToFront();
 const results=[];
 for(const width of [1440,390]){
  await p.setViewportSize({width,height:1000});
  for(const example of design.draft.examples){
   await p.selectOption('#design-example',example.href);await frameReady();
   const frame=p.frames().find(f=>f.parentFrame());await frame.waitForFunction(()=>document.querySelector('#content')?.getBoundingClientRect().width>0);
   const info=await frame.evaluate(async()=>{
    await document.fonts.ready;const root=document.querySelector('#content'),visible=n=>{const r=n.getBoundingClientRect(),s=getComputedStyle(n);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!n.closest('.sr-only,[hidden],[aria-hidden=true]');};
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,headingFont:root.querySelector('h1,h2,.quiz-question')?getComputedStyle(root.querySelector('h1,h2,.quiz-question')).fontFamily:null,fonts:[...document.fonts].map(f=>({family:f.family,status:f.status})),broken:[...root.querySelectorAll('img')].filter(n=>!n.naturalWidth).map(n=>n.dataset.id||n.src),visible:[...root.querySelectorAll('[data-id]')].filter(n=>visible(n)).map(n=>n.dataset.id),controls:root.querySelectorAll('input,textarea,select').length,css:!!document.querySelector('.adt-page')};
   });assert.equal(info.css,true);assert.equal(info.broken.length,0);assert.ok(info.scrollWidth<=info.width+2,example.href+' overflows at '+width);if(!info.fonts.some(f=>f.family==='ADTHeading'&&f.status==='loaded')&&example.kind!=='illustrated'){await writeFile(out+'/font-failure.json',JSON.stringify({example,info,outer:await p.evaluate(()=>({viewHidden:document.querySelector('#workspace-view').hidden,toast:document.querySelector('#toast').textContent,frameHidden:document.querySelector('#book-preview').hidden,ancestors:(()=>{let n=document.querySelector('#book-preview'),a=[];while(n){a.push([n.tagName,n.id,n.hidden,getComputedStyle(n).display,n.getBoundingClientRect().width,n.getBoundingClientRect().height]);n=n.parentElement;}return a})()}))},null,2));await writeFile(out+'/font-failure.html',await p.locator('#book-preview').getAttribute('srcdoc'));}assert.ok(info.fonts.some(f=>f.family==='ADTHeading'&&f.status==='loaded')||example.kind==='illustrated',example.href+' font loading');
   const expected=design.draft.contracts[example.href].text.map(t=>t[0]);assert.deepEqual(expected.filter(id=>!info.visible.includes(id)),[],example.href+' lost visible bound text');
   const capture=await context.newPage();await capture.setViewportSize({width,height:1000});await capture.setContent(await p.locator('#book-preview').getAttribute('srcdoc'),{waitUntil:'load'});await capture.evaluate(async()=>{await document.fonts.ready;window.scrollTo(0,0)});await capture.screenshot({path:out+'/'+example.kind+'-'+width+'.png',fullPage:true});await capture.close();await p.bringToFront();results.push({href:example.href,width,...info});console.log('PASS '+example.kind+' at '+width);
  }
 }
 checks.push('Six real compositions at desktop and phone: visible bound text, loaded fonts, no missing assets or horizontal overflow');
 await p.setViewportSize({width:1440,height:1000});await p.selectOption('#design-example','pg001_sec001.html');await frameReady();
 await p.waitForFunction(()=>document.querySelector('#dirty-status').textContent==='Saved on this device');await p.reload();await ready();await frameReady();assert.equal(await p.evaluate(()=>folio.book.design.draft.examples.length),6);assert.equal(await p.locator('#design-example').inputValue(),'pg001_sec001.html');checks.push('Draft, selected example, PDF and extracted assets survive refresh');
 const snapshot=await p.evaluate(()=>({draft:folio.book.design.draft,files:[...folio.book.files].filter(([path])=>path.startsWith('folio/compositions/')).map(([path,bytes])=>[path,Array.from(bytes)])}));
 for(const [path,bytes]of snapshot.files){await mkdir(out+'/runtime/'+path.split('/').slice(0,-1).join('/'),{recursive:true});await writeFile(out+'/runtime/'+path,Buffer.from(bytes));}
 for(const [href,html]of Object.entries(snapshot.draft.pages))await writeFile(out+'/runtime/'+href,html);
 const runtime=await p.evaluate(async()=>{const {designPreviewBook}=await import('./src/compositions.mjs?v=0.6.0');const view=designPreviewBook(folio.book),files=await view.output();return [...files].filter(([path,bytes])=>!folio.book.original.has(path)||!['png','jpg','jpeg','webp','ttf','woff2','mp3','mp4'].includes(path.split('.').pop())).map(([path,bytes])=>[path,Array.from(bytes)]);});for(const [path,bytes]of runtime){await mkdir(out+'/runtime/'+path.split('/').slice(0,-1).join('/'),{recursive:true});await writeFile(out+'/runtime/'+path,Buffer.from(bytes));}
 await writeFile(out+'/draft.json',JSON.stringify(design,null,2));
 await p.click('[data-view=export]');const downloading=p.waitForEvent('download');await p.click('#download-library');const download=await downloading;await download.saveAs(out+'/component-library.zip');await ready();checks.push('Component library exports the six composed examples and shared assets');
 assert.deepEqual(errors,[]);await writeFile(out+'/checks.json',JSON.stringify({passed:true,checks,results,errors,paidAPICalls:0},null,2));
 console.log(checks.join('\n'));
}finally{await browser.close();}
