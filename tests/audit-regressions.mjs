import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'chrome',headless:true}),p=await browser.newPage();
try{
 await p.goto('http://127.0.0.1:8890/?sample');await p.waitForFunction(()=>document.body.dataset.ready==='true'&&document.body.dataset.busy!=='true');
 const result=await p.evaluate(async()=>{
  const b=folio.book,section=b.spine[0],{sourcePageFor}=await import('./src/source-navigation.mjs');
  b.design.sections.find(s=>s.href===section.href).sourcePage=4;
  const mapped={viewer:sourcePageFor(b,section,4),quick:b.pageInfoFastSource(section),detail:b.pageInfo(section).source,missing:b.scan().filter(i=>['source-unmapped','design-source-gap'].includes(i.kind)&&i.index===1).map(i=>i.kind)};
  b.mappings[section.href]={page:1,confirmed:true};
  const corrected={viewer:sourcePageFor(b,section,4),detail:b.pageInfo(section).source,missing:b.scan().filter(i=>['source-unmapped','design-source-gap'].includes(i.kind)&&i.index===1).length};
  b.mappings[section.href]={page:10,confirmed:true};const outside={viewer:sourcePageFor(b,section,4),flagged:b.scan().some(i=>i.href===section.href&&i.kind==='source-range')};
  return {mapped,corrected,outside};
 });
 assert.deepEqual(result,{mapped:{viewer:4,quick:4,detail:4,missing:['design-source-gap','source-unmapped']},corrected:{viewer:1,detail:1,missing:0},outside:{viewer:null,flagged:true}});
 console.log('PASS viewer, reports and issue flags share source mappings; confirmed corrections clear false gaps; out-of-range mappings stay flagged');
}finally{await browser.close()}
