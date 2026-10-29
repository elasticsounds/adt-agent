import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {mockDesignAnalysis,connectTestKey} from './mock-design-analysis.mjs';
const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage({viewport:{width:1280,height:900}}),mock=await mockDesignAnalysis(p),checks=[];
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:90000});
try{
 await p.goto('http://127.0.0.1:8890/?sample');await ready();await p.click('[data-view=start]');
 assert.ok(await p.locator('#api-setup').isVisible());assert.match(await p.locator('#setup-key-state').textContent(),/required/);assert.equal(await p.locator('#design-ai').isChecked(),false);
 const before=await p.evaluate(()=>JSON.stringify(folio.book.design));await p.click('#create-design');assert.ok(await p.locator('#ai-dialog').isVisible());assert.equal(mock.calls.length,0);assert.equal(await p.evaluate(()=>JSON.stringify(folio.book.design)),before);await p.click('#cancel-ai-settings');checks.push('Missing key blocks generation and opens key setup without changing the book');
 await connectTestKey(p);assert.equal(mock.calls.length,0);await p.click('#create-design');assert.equal(await p.locator('#design-ai').isChecked(),false);assert.match(await p.locator('#toast').textContent(),/Tick/);assert.equal(mock.calls.length,0);checks.push('Key entry does not imply consent; explicit Analyze checkbox is required');
 await p.check('#design-ai');await p.click('#create-design');await ready();assert.deepEqual(mock.calls.map(c=>c.kind),['adt_pdf_pages','adt_brand_plan','adt_family_assignment']);assert.deepEqual(mock.calls.map(c=>c.model),['gpt-6.1-sol','gpt-6.1-sol','gpt-6-luna']);assert.equal(await p.evaluate(()=>folio.book.design.method),'ai-guided');checks.push('Checked analysis runs Sol page review and brand planning before Luna assignment');
 const analyzed=await p.evaluate(()=>JSON.stringify(folio.book.design));await p.reload();await ready();assert.equal(mock.calls.length,3);checks.push('Restoring a remembered key and project makes no automatic paid request');
 await p.evaluate(()=>folio.source.hash='e3154247e6984557f9f9852a705a8bbed818a60ae4aba93baf9e0a07cf65bd69');await p.click('[data-view=start]');assert.ok(await p.locator('#design-ai').isVisible());mock.error=401;await p.click('#create-design');await ready();assert.equal(mock.calls.length,4);assert.match(await p.locator('#toast').textContent(),/rejected this key/);assert.equal(await p.evaluate(()=>JSON.stringify(folio.book.design)),analyzed);checks.push('Reference PDFs also require real AI analysis; rejected keys never fall back to local generation');
 await p.click('#open-ai-settings');await p.click('#disconnect-ai');assert.equal(await p.locator('#design-ai').isChecked(),false);await p.click('#create-design');assert.ok(await p.locator('#ai-dialog').isVisible());assert.equal(mock.calls.length,4);checks.push('Disconnect clears analysis consent and restores the key gate');
 await mkdir('tests/results',{recursive:true});await writeFile('tests/results/ai-required.json',JSON.stringify({passed:true,checks,mockedCalls:mock.calls.length,paidCalls:0},null,2));console.log(checks.join('\n'));
}finally{await browser.close();}
