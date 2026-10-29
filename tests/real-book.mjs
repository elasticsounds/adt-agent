import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {unzipSync} from 'fflate';
if(!process.env.ADT_TEST_ZIP||!process.env.ADT_TEST_PDF)throw Error('Set ADT_TEST_ZIP and ADT_TEST_PDF to your private regression inputs.');
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1512,height:1100}});let errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://127.0.0.1:8890');
await page.setInputFiles('#adt-file',process.env.ADT_TEST_ZIP);await page.waitForFunction(()=>window.folio?.book?.spine.length===92&&!document.querySelector('#progress-dialog').open,null,{timeout:120000});
console.log('Imported 92 ADT sections');
let val=await page.evaluate(()=>folio.book.validate());await writeFile('tests/results/real-before.json',JSON.stringify(val,null,2));assert.equal(val.valid,true,JSON.stringify(val.failures));
await page.setInputFiles('#pdf-file',process.env.ADT_TEST_PDF);await page.waitForFunction(()=>window.folio?.source?.inventory.length===94&&!document.querySelector('#progress-dialog').open,null,{timeout:120000});console.log('Inventoried all 94 source pages');
await page.evaluate(()=>{document.querySelector('#style-form').elements.accent.value='#684372';document.querySelector('#style-form').elements.ink.value='#292331';document.querySelector('#style-form').elements.surface.value='#f5eff7';document.querySelector('#style-form').dispatchEvent(new Event('input'))});
await page.click('#apply-style');await page.waitForFunction(()=>!document.querySelector('#progress-dialog').open,null,{timeout:60000});val=await page.evaluate(()=>folio.book.validate());assert.equal(val.valid,true,JSON.stringify(val.failures));console.log('Applied shared styles to all 92 sections; preservation passed');
await page.evaluate(()=>folio.selectPage(10));await page.waitForTimeout(2500);await page.screenshot({path:'tests/results/real-book.png',fullPage:true});
await page.click('#export-top');const pending=page.waitForEvent('download');await page.click('#download-book');const download=await pending;await download.saveAs('tests/results/real-book-folio.zip');console.log('Exported real book');
const actual=unzipSync(new Uint8Array(await readFile('tests/results/real-book-folio.zip')));const original=unzipSync(new Uint8Array(await readFile(process.env.ADT_TEST_ZIP)));const key=Object.keys(original).find(k=>k.endsWith('content/pages.json')),prefix=key.slice(0,-'content/pages.json'.length);const d=new TextDecoder(),spine=JSON.parse(d.decode(actual['content/pages.json']));
assert.deepEqual(actual['content/pages.json'],original[key]);for(const [p,b]of Object.entries(original)){const rel=p.slice(prefix.length);if(rel.endsWith('.js')&&!rel.endsWith('offline-preloader.js'))assert.deepEqual(actual[rel],b,rel)}
const cache=d.decode(actual['assets/offline-preloader.js']);const match=/\bvar INLINE\s*=\s*/.exec(cache);const inline=JSON.parse(cache.slice(match.index+match[0].length).split(';\n')[0]);for(const p of spine){assert.equal(inline['./'+p.href],d.decode(actual[p.href]),'Stale cache '+p.href);assert.match(d.decode(actual[p.href]),/offline-preloader\.js\?v=[a-f0-9]{16}/)}console.log('Embedded navigation cache matches all 92 edited pages');
await writeFile('tests/results/real-book.json',JSON.stringify({passed:true,sections:spine.length,pdfPages:94,validation:val,cacheEntries:spine.length,originalRuntimePreserved:true,errors},null,2));assert.deepEqual(errors,[]);await browser.close();
