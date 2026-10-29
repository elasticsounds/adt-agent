import {chromium} from 'playwright';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {unzipSync} from 'fflate';
import assert from 'node:assert/strict';
const raw=process.env.RAW_ADT;if(!raw)throw Error('Set RAW_ADT and run composition-reference.mjs first.');
const out='tests/results/compositions',design=JSON.parse(await readFile(out+'/draft.json','utf8')),assets=[];
async function walk(dir,prefix){for(const item of await readdir(dir,{withFileTypes:true})){const from=dir+'/'+item.name,to=prefix+'/'+item.name;if(item.isDirectory())await walk(from,to);else assets.push([to,Array.from(await readFile(from))]);}}
await walk(out+'/runtime/folio/compositions','folio/compositions');
const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1440,height:1000}});
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:90000});
const frameReady=()=>p.waitForFunction(()=>document.querySelector('#design-preview').dataset.ready==='true');
try{
 await p.goto('http://127.0.0.1:8890/');await ready();await p.locator('#adt-folder').setInputFiles(raw);await ready();
 await p.evaluate(async({design,assets})=>{folio.book.design=design;folio.book.tokens=design.tokens;for(const [name,bytes]of assets)folio.book.write(name,new Uint8Array(bytes));folio.book.write('folio/page-inventory.json',JSON.stringify({pages:design.pages,sections:design.sections}));folio.book.revision++;await folio.setView('design');},{design,assets});await frameReady();
 for(const e of design.draft.examples){await p.selectOption('#design-example',e.href);await frameReady();const f=await p.locator('#design-preview').contentFrame();await f.locator('.adt-page').waitFor();const info=await f.locator('#content').evaluate(async n=>{await document.fonts.ready;return {width:n.getBoundingClientRect().width,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),broken:[...n.querySelectorAll('img')].some(i=>!i.naturalWidth)}});assert.ok(info.width>0);assert.equal(info.broken,false);assert.ok(info.fonts.includes(e.kind==='illustrated'?'ADTReading':'ADTHeading'));}
 await p.click('[data-view=export]');
 const take=async(selector,file)=>{const pending=p.waitForEvent('download',{timeout:90000});await p.click(selector);const download=await pending;await download.saveAs(out+'/'+file);await ready();return unzipSync(new Uint8Array(await readFile(out+'/'+file)));};
 const library=await take('#download-library','component-library.zip'),book=await take('#download-book','book-with-gallery.zip');const text=b=>new TextDecoder().decode(b);
 assert.match(text(library['brand-guide.html']),/examples\/section-1.html/);
 assert.equal(Object.keys(library).filter(k=>k.startsWith('examples/')&&k.endsWith('.html')).length,6);
 for(let i=1;i<=6;i++){assert.match(text(library['examples/section-'+i+'.html']),/adt-composition/);assert.ok(!text(library['examples/section-'+i+'.html']).includes('<script'));assert.match(text(book['folio/design-examples/section-'+i+'.html']),/adt-composition/);}
 assert.match(text(book['folio/brand-guide.html']),/design-examples\/section-1.html/);
 for(const e of design.draft.examples)assert.ok(!text(book[e.href]).includes('adt-composition'),'Draft must not replace reader section '+e.href);
 const report={passed:true,checks:['All six previews load their intended fonts after trimming unused reader fonts','Library links to six portable composed examples','Book export links to its separate composed gallery; original reader sections remain unchanged'],libraryBytes:(await readFile(out+'/component-library.zip')).length};await writeFile(out+'/export-checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
