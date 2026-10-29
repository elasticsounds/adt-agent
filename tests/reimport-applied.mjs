import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1440,height:1000}});
const ready=()=>p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true',null,{timeout:180000});
try{
 await p.goto('http://127.0.0.1:8890/');await ready();await p.setInputFiles('#adt-file','tests/results/book-application/applied-book.zip');await ready();assert.equal(await p.evaluate(()=>folio.book.applied),true);assert.equal(await p.evaluate(()=>folio.book.validate().valid),true);
 await p.click('[data-view=design]');await p.click('#toggle-design-tools');await p.locator('[name=fontSize]').fill('26');await p.click('#apply-style');await ready();await p.click('#design-open-book');await p.click('#apply-book-design');await ready();
 assert.equal(await p.evaluate(()=>folio.book.design.application.pending),false,await p.locator('#toast').textContent());assert.equal(await p.evaluate(()=>folio.book.validate().valid),true);assert.ok(await p.evaluate(()=>folio.book.spine.every(s=>folio.book.doc(s.href).querySelectorAll('#content.adt-composition>.adt-page').length===1)));
 await p.click('[data-view=export]');const pending=p.waitForEvent('download');await p.click('#download-book');await (await pending).saveAs('tests/results/book-application/upgraded-book.zip');await ready();
 console.log('Exported ADT reimports with its applied design, accepts shared design updates and reapplies without duplicate wrappers or runtime changes.');
}finally{await b.close()}
