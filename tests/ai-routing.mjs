import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {OpenAISession,MODELS,validatePlan,buildHandoff,validateExecution} from '../public/src/ai.mjs';
import {defaults} from '../public/src/core.mjs';
const KEY='sk-adt-agent-test-not-a-real-key-1234567890';
const originalFetch=globalThis.fetch,checks=[],calls=[];
const task=(patch={})=>({id:'size',kind:'style',target:'fontSize',instruction:'Increase the reading size to 24 px.',context_ids:[],requires_image:false,...patch});
const plan=(tasks=[task()])=>({message:'Improve readability while preserving content.',tasks});
const result=(patch={})=>({message:'Ready for review.',results:[{task_id:'size',status:'completed',value:'24',note:'Larger reading text.',...patch}]});
const data=(patch={})=>({message:'Make the text larger',consent:true,context:{section:'pg001',language:'en',isQuiz:false,styles:{...defaults},text:[{id:'title',text:'Our shared world'},{id:'prompt',text:'What helps you belong?'},{id:'unrelated',text:'UNRELATED_SOURCE '.repeat(100)}],images:[{index:0,id:'img',description:'Two children.'},{index:1,id:'other',description:'A hill.'}],controls:[{index:0,id:'answer',type:'text',label:''}],issues:[{title:'Not for the executor',detail:'An unrelated finding.'}]},...patch});
const ok=value=>({ok:true,status:200,json:async()=>({status:'completed',usage:{input_tokens:200,output_tokens:40},output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}]})});
let respond;
globalThis.fetch=async(url,options)=>{const call={url,options,body:JSON.parse(options.body)};calls.push(call);return respond(call);};
function session(){const s=new OpenAISession();s.connect(KEY);return s;}
async function check(name,fn){calls.length=0;respond=c=>ok(c.body.model===MODELS.planner?plan():result());await fn();checks.push(name);console.log('PASS '+name);}
try{
 await check('Sol plans before Luna; bounded reasoning, strict schemas and minimal context',async()=>{
  const s=session(),stages=[],d=data(),r=await s.request(d,{onStage:v=>stages.push(v)});
  assert.deepEqual(calls.map(c=>c.body.model),['gpt-6.1-sol','gpt-6-luna']);assert.deepEqual(stages,['planning','executing']);
  assert.deepEqual(calls.map(c=>c.body.reasoning.effort),['medium','low']);assert.deepEqual(calls.map(c=>c.body.max_output_tokens),[6000,4000]);
  for(const c of calls){assert.equal(c.url,'https://api.openai.com/v1/responses');assert.equal(c.options.headers.Authorization,'Bearer '+KEY);assert.equal(c.options.credentials,'omit');assert.equal(c.options.redirect,'error');assert.equal(c.options.referrerPolicy,'no-referrer');assert.equal(c.body.store,false);assert.equal(c.body.text.format.strict,true);assert.ok(!JSON.stringify(c.body).includes(KEY));assert.ok(!('temperature' in c.body));}
  assert.ok(calls[0].body.input[1].content[0].text.includes('UNRELATED_SOURCE'));assert.ok(!calls[1].body.input[1].content[0].text.includes('UNRELATED_SOURCE'));assert.ok(!calls[1].body.input[1].content[0].text.includes('An unrelated finding'));
  assert.deepEqual(r.operations,[{type:'style',target:'fontSize',value:'24'}]);assert.equal(r.execution.requests,2);assert.ok(r.execution.handoffCharacters<r.execution.sourceCharacters);assert.equal(s.hasPlan,false);
 });
 await check('Text, label and image tasks receive only their assigned evidence',async()=>{
  const d=data({image:'data:image/jpeg;base64,AAAA',imageIndex:0});const p=plan([task({id:'text',kind:'text',target:'title'}),task({id:'label',kind:'label',target:'0',context_ids:['prompt']}),task({id:'alt',kind:'alt',target:'0',requires_image:true})]);validatePlan(p,d);
  const h=buildHandoff(d,p);assert.deepEqual(h.text.map(t=>t.id),['title','prompt']);assert.deepEqual(h.images.map(i=>i.index),[0]);assert.equal(h.controls.length,1);assert.equal(h.selectedImageIndex,0);assert.ok(!('styles' in h));
  respond=c=>ok(c.body.model===MODELS.planner?p:{message:'Review descriptions.',results:p.tasks.map(t=>({task_id:t.id,status:'needs_review',value:'',note:'Needs source confirmation.'}))});const r=await session().request(d);assert.equal(r.operations.length,0);assert.equal(r.unresolved.length,3);assert.ok(calls.every(c=>c.body.input[1].content.some(i=>i.type==='input_image')));
 });
 await check('Selected images are not handed to Luna for unrelated style tasks',async()=>{await session().request(data({image:'data:image/jpeg;base64,AAAA',imageIndex:0}));assert.ok(calls[0].body.input[1].content.some(c=>c.type==='input_image'));assert.ok(!calls[1].body.input[1].content.some(c=>c.type==='input_image'));});
 await check('No work needed skips Luna entirely',async()=>{respond=()=>ok(plan([]));const r=await session().request(data());assert.equal(calls.length,1);assert.equal(r.execution.requests,1);assert.deepEqual(r.operations,[]);});
 await check('Failed Luna request is not retried automatically; explicit retry reuses the plan',async()=>{
  const s=session(),d=data();respond=c=>c.body.model===MODELS.planner?ok(plan()):{ok:false,status:429};await assert.rejects(s.request(d),/limit/);assert.equal(calls.length,2);assert.equal(s.hasPlan,true);
  respond=()=>ok(result());const r=await s.request(d);assert.deepEqual(calls.map(c=>c.body.model),[MODELS.planner,MODELS.executor,MODELS.executor]);assert.equal(r.execution.plannerReused,true);assert.equal(r.execution.requests,1);assert.equal(s.hasPlan,false);
 });
 await check('Changed source invalidates a saved plan',async()=>{const s=session();respond=c=>c.body.model===MODELS.planner?ok(plan()):{ok:false,status:429};await assert.rejects(s.request(data()),/limit/);respond=c=>ok(c.body.model===MODELS.planner?plan():result());const d=data();d.context.text[0].text='Changed title';await s.request(d);assert.deepEqual(calls.map(c=>c.body.model),[MODELS.planner,MODELS.executor,MODELS.planner,MODELS.executor]);});
 await check('Cancel after planning prevents the Luna call and clears the handoff',async()=>{const s=session();await assert.rejects(s.request(data(),{onPlan:()=>s.cancel()}),/cancelled/);assert.equal(calls.length,1);assert.equal(s.hasPlan,false);});
 await check('Disconnect or replacing the key prevents stale results and plan reuse',async()=>{for(const action of ['disconnect','connect']){const s=session();await assert.rejects(s.request(data(),{onPlan:()=>action==='disconnect'?s.disconnect():s.connect(KEY+'x')}),/cancelled|changed/);assert.equal(s.hasPlan,false);}assert.equal(calls.length,2);});
 await check('Consent and key required before any call',async()=>{await assert.rejects(new OpenAISession().request(data()),/Connect/);await assert.rejects(session().request(data({consent:false})),/Approve/);assert.equal(calls.length,0);});
 await check('Unsupported or protected planner targets cannot reach Luna',async()=>{
  const bad=[task({kind:'script'}),task({kind:'style',target:'__proto__'}),task({kind:'text',target:'missing'}),task({kind:'alt',target:'2'}),task({kind:'alt',target:'0',requires_image:true}),task({kind:'label',target:'0'}),task({context_ids:['missing']}),task({kind:'component',target:'page'})];
  for(const t of bad)assert.throws(()=>validatePlan(plan([t]),data()));const quiz=data();quiz.context.isQuiz=true;assert.throws(()=>validatePlan(plan([task({kind:'text',target:'title'})]),quiz),/protected/);
  respond=()=>ok(plan([task({kind:'script'})]));await assert.rejects(session().request(data()),/unsupported/);assert.equal(calls.length,1);
  assert.throws(()=>validatePlan(plan([task(),task({id:'duplicate'})]),data()),/ambiguous/);assert.throws(()=>validatePlan(plan([task({kind:'alt',target:'1',requires_image:true})]),data({image:'data:image/jpeg;base64,AAAA',imageIndex:0})),/not supplied/);
 });
 await check('Unknown, duplicate, missing and unsafe Luna results are rejected',async()=>{
  assert.throws(()=>validateExecution(result({task_id:'unplanned'}),plan(),data()),/unsupported/);
  assert.throws(()=>validateExecution({message:'',results:[]},plan(),data()),/every planned/);
  const duplicate=result().results[0];assert.throws(()=>validateExecution({message:'',results:[duplicate,duplicate]},plan([task(),task({id:'spacing',target:'space'})]),data()),/unsupported/);
  assert.throws(()=>validateExecution(result({value:'99'}),plan(),data()),/out of range/);
  assert.throws(()=>validateExecution(result({value:'#ffffff'}),plan([task({target:'ink'})]),data()),/4.5/);
  assert.throws(()=>validateExecution(result({status:'needs_review',value:'24'}),plan(),data()),/unresolved/);
 });
 await check('No fallback model when requested access is unavailable',async()=>{respond=()=>({ok:false,status:404});await assert.rejects(session().request(data()),/does not substitute/);assert.equal(calls.length,1);assert.equal(calls[0].body.model,MODELS.planner);});
 await mkdir('tests/results',{recursive:true});await writeFile('tests/results/ai-routing.json',JSON.stringify({passed:true,checks,paidAPICalls:0},null,2));
}finally{globalThis.fetch=originalFetch;}
