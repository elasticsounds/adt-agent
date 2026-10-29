import {defaults} from '../public/src/core.mjs';

// Test-only Responses fixture. Never uses a real credential or paid request.
export async function mockDesignAnalysis(page){
 const state={calls:[],error:null};
 await page.route('https://api.openai.com/v1/responses',async route=>{
  const headers={'Access-Control-Allow-Origin':'*','Content-Type':'application/json'};
  if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{...headers,'Access-Control-Allow-Headers':'authorization,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'}});return;}
  const body=route.request().postDataJSON(),kind=body.text.format.name,input=JSON.parse(body.input[1].content[0].text);state.calls.push({kind,model:body.model});
  if(state.error){await route.fulfill({status:state.error,headers,body:'{}'});return;}
  let value;
  if(kind==='adt_pdf_pages')value={pages:input.pages.map(p=>({page:p.page,family:p.page===1?'cover':'lesson',layout:'preserve',heading_scale:2,panel_style:'tinted',notes:'Mock visual evidence for protocol testing.'}))};
  else if(kind==='adt_brand_plan')value={tokens:{...defaults},headingScale:2,notes:'Mock source-based brand plan for protocol testing.'};
  else if(kind==='adt_family_assignment')value={sections:input.sections.map(s=>({id:s.id,family:s.family,layout:'preserve',notes:'Preserve existing source content and activity bindings.'}))};
  else throw Error('Unexpected design API call: '+kind);
  await route.fulfill({headers,body:JSON.stringify({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(value)}]}]})});
 });
 return state;
}
export async function connectTestKey(page){
 await page.click('#open-ai-settings');await page.fill('#openai-key','sk-adt-agent-test-not-a-real-key-1234567890');await page.click('#ai-connect-form button[type=submit]');await page.waitForFunction(()=>!document.querySelector('#ai-dialog').open);
 // Keep unrelated local-command tests on their explicit local mode.
 await page.locator('#chat-mode').evaluate(n=>n.value='local');
}
