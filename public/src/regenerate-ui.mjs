import {generatePage,applyRegeneration,regenerationContext} from './regenerate.mjs?v=0.10.0';
import {Reader} from './reader.mjs?v=0.10.0';
import {enc,sha,text} from './core.mjs?v=0.10.0';
import {sourcePageFor} from './source-navigation.mjs?v=0.10.0';
import {pageImage} from './pdf.mjs?v=0.10.0';
const $=id=>document.getElementById(id);
export class Regenerator {
 constructor({state,session,run,progress,onChange,onApply,onError,connect}){
  Object.assign(this,{state,session,run,progress,onChange,onApply,onError,connect});this.drafts={};this.reader=new Reader();
  $('chat-regenerate').onclick=()=>this.open().catch(onError);
  $('regen-close').onclick=()=>this.close();$('regenerate-dialog').addEventListener('cancel',e=>{e.preventDefault();this.close()});
  $('regen-key').onclick=connect;
  $('regen-prompt').oninput=()=>{if(this.href){this.drafts[this.href]??={};this.drafts[this.href].prompt=$('regen-prompt').value;onChange()}};
  $('regen-form').onsubmit=e=>{e.preventDefault();run(async()=>{try{await this.generate()}catch(e){$('regen-error').textContent=(e.name==='AbortError'||this.abort?.signal.aborted)?'Generation stopped. Your page and previous preview are kept.':e.message;$('regen-error').hidden=false;}})};
  $('regen-use').onclick=()=>run(async()=>{try{await this.use()}catch(e){$('regen-error').textContent=e.message;$('regen-error').hidden=false;}});
  $('regen-before').onclick=()=>this.preview(false).catch(onError);$('regen-after').onclick=()=>this.preview(true).catch(onError);
 }
 reset(){this.abort?.abort();this.close();this.drafts={};$('regen-consent').checked=false;}
 close(){this.reader.dispose();$('regenerate-dialog').close();this.href=null;}
 async open(){
  const {book,href,busy}=this.state();if(busy)throw Error('Wait for the current operation to finish.');if(!book||!href)throw Error('Open a book page first.');regenerationContext(book,href);
  this.href=href;this.book=book;this.beforeState=structuredClone(this.state().readerState||{});
  let record={};try{record=JSON.parse(text(book.files,'folio/page-regenerations.json'))[href]||{}}catch{}
  const draft=this.drafts[href]??={prompt:record.prompt||'',attempt:record.attempt||0};
  $('regen-prompt').value=draft.prompt||'';$('regen-page').textContent=book.pageInfo(book.spine.find(p=>p.href===href)).title+' · '+href;
  const {source}=this.state();this.sourcePage=sourcePageFor(book,book.spine.find(p=>p.href===href),source?.inventory.length||0);
  $('regen-source').disabled=!source||!this.sourcePage;$('regen-source').checked=!!source&&!!this.sourcePage;
  $('regen-source-label').textContent=source&&this.sourcePage?'Include matching PDF page '+this.sourcePage+' as visual reference':'No matching PDF page — use the book and its design system';
  $('regen-key').hidden=this.session.connected;$('regen-error').hidden=true;
  if(draft.candidate&&(draft.candidate.revision!==book.revision||draft.candidate.baseHash!==await sha(book.files.get(href)))){delete draft.candidate;this.onChange();$('regen-error').textContent='The book changed since this preview. Your prompt is saved; generate a fresh version.';$('regen-error').hidden=false;}
  $('regenerate-dialog').showModal();this.render();await this.preview(!!draft.candidate);$('regen-prompt').focus({preventScroll:true});
 }
 render(){$('regen-key').hidden=this.session.connected;const d=this.drafts[this.href],c=d?.candidate;$('regen-result').hidden=!c;$('regen-use').disabled=!c;$('regen-after').disabled=!c;$('regen-generate').textContent=c?'Try again':'Generate new version';$('regen-summary').textContent=c?'Attempt '+d.attempt+' · '+c.recipe.summary:'';$('regen-used-prompt').textContent=c?'Prompt for this preview: '+c.prompt:'';}
 async preview(after){
  if(!this.href)return;const draft=this.drafts[this.href],book=this.book,c=after&&draft?.candidate;
  const candidate=Object.assign(Object.create(Object.getPrototypeOf(book)),book,{files:new Map(book.files)});if(c)candidate.files.set(this.href,enc.encode(c.html));
  $('regen-before').setAttribute('aria-pressed',String(!c));$('regen-after').setAttribute('aria-pressed',String(!!c));$('regen-preview-label').textContent=c?'Regenerated version · not yet applied':'Current book page';
  const frame=$('regen-preview');frame.dataset.ready='false';
  const navigate=href=>{if(this.href&&href!==this.href)this.preview(!!c).catch(this.onError)};
  await this.reader.show(frame,candidate,this.href,{state:structuredClone(this.beforeState),onNavigate:navigate,onFullNavigate:navigate});frame.dataset.ready='true';
 }
 async generate(){
  this.abort=null;
  if(!this.session.connected){$('regen-key').hidden=false;throw Error('Connect your OpenAI API key before regenerating.');}
  if(!$('regen-consent').checked)throw Error('Approve sharing this page with OpenAI before generating.');
  const {book,href,source}=this.state(),revision=book.revision;
  if(book!==this.book||href!==this.href)throw Error('The selected page changed. Reopen Regenerate page.');
  const draft=this.drafts[href],prompt=$('regen-prompt').value.trim();if(!prompt)throw Error('Describe how you want to regenerate this page.');
  this.abort=new AbortController();$('cancel-ai').hidden=false;$('regen-error').hidden=true;
  let sourceEvidence=null;
  if($('regen-source').checked&&source&&this.sourcePage){this.progress('Preparing the source reference','Only the matching PDF page will be included.');sourceEvidence={page:this.sourcePage,text:source.inventory[this.sourcePage-1]?.text?.slice(0,12000)||'',image:await pageImage(source,this.sourcePage,1000)};}
  const result=await generatePage({book,href,prompt,session:this.session,sourceEvidence,previous:draft.previous||[],signal:this.abort.signal,onProgress:this.progress});
  if(this.book!==book||this.state().book!==book||this.state().href!==href||book.revision!==revision||this.state().source!==source)throw Error('The project changed during generation. Open the current page and try again.');
  draft.attempt=(draft.attempt||0)+1;draft.prompt=prompt;draft.candidate={href,html:result.html,recipe:result.recipe,prompt,baseHash:result.baseHash,revision,attempt:draft.attempt};
  draft.previous=[...(draft.previous||[]),{prompt,recipe:result.recipe}].slice(-3);this.onChange();this.render();await this.preview(true);
 }
 async use(){
  const draft=this.drafts[this.href],candidate=draft?.candidate,{book,href}=this.state();
  if(!candidate||book!==this.book||href!==this.href||candidate.revision!==book.revision)throw Error('The book changed after this preview. Generate a fresh version before applying.');
  await applyRegeneration(book,candidate);delete draft.candidate;this.onChange();this.close();await this.onApply(candidate);
 }
}
