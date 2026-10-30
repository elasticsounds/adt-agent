import {parse,serialize,relative,resolvePath,enc,dec,sha,validateTokens,contrast} from './core.mjs?v=0.10.0';

export const COMPOSITION_VERSION=1;
const referenceHashes=new Set(['e3154247e6984557f9f9852a705a8bbed818a60ae4aba93baf9e0a07cf65bd69','d21e854edf195029e8ad8a23342f9781796baa050fa0a83c45c76402d1cf742d']);
export const hasReferenceProfile=source=>referenceHashes.has(source?.hash);
const qid=(root,id)=>root.querySelector(`[data-id="${CSS.escape(id)}"]`);
function contract(root){return {
 ids:[...root.querySelectorAll('[data-id]')].map(n=>n.dataset.id).sort(),
 text:[...root.querySelectorAll('[data-id]:not(img)')].filter(n=>!n.querySelector('[data-id]')).map(n=>[n.dataset.id,n.textContent.replace(/\s+/g,' ').trim()]).sort(),
 controls:[...root.querySelectorAll('input,textarea,select,button')].map(n=>[n.tagName,...['id','type','name','value','data-activity-item','data-correct','data-correct-answers'].map(a=>n.getAttribute(a)),n.tagName==='SELECT'?n.innerHTML:null]),
 answers:[...root.querySelectorAll('[data-correct-answers],#quiz-correct-answers')].map(n=>[n.getAttribute('data-correct-answers'),n.textContent]),
 };
}
function checkContract(before,root){const after=contract(root);for(const key of Object.keys(before))if(JSON.stringify(before[key])!==JSON.stringify(after[key]))throw Error('Composition changed protected '+key+'. The existing book has been kept.');}

/** Pure presentation adapter. Recipes identify existing nodes; components own every style. */
export function composePage(html,recipe,{assetPaths={},packagePath='folio/compositions',sourceHash='',responseMessages={}}={}){
 const d=parse(html),root=d.querySelector('#content'),s=root?.querySelector('[data-section-type]');
 if(!root||!s)throw Error('This section does not expose a supported Studio content root.');
 const before=contract(root),oldClasses=new Map([...root.querySelectorAll('*')].map(n=>[n,n.className]));
 const make=(tag,cls)=>{const n=d.createElement(tag);n.className=cls||'';return n;};
 const get=id=>{const n=qid(root,id);if(!n)throw Error('Missing source binding '+id);return n;};
 const inline=n=>{if(!/^H[1-6]$/.test(n.tagName)){n.className='';return n;}const span=make('span');for(const a of n.attributes)if(a.name!=='class')span.setAttribute(a.name,a.value);span.append(...n.childNodes);n.replaceWith(span);return span;};
 // Remove earlier ADT Agent presentation links, never the Studio runtime or its assets.
 for(const n of d.querySelectorAll('link[rel=stylesheet]'))if(/^\.?\/?folio\//.test(n.getAttribute('href')||''))n.remove();
 root.className='adt-composition opacity-0';root.removeAttribute('style');
 for(const key of Object.keys(root.dataset))if(key.startsWith('folio'))delete root.dataset[key];
 d.body.dataset.adtComposition=String(COMPOSITION_VERSION);s.className='adt-page';s.dataset.composition=recipe.kind;
 if(recipe.kind==='cover'){
  const r=recipe.roles,copy=make('div','adt-cover-copy'),grade=make('div','adt-grade'),authors=make('p'),title=make('h1'),footer=make('div','adt-cover-footer');
  grade.append(...r.grade.map(id=>inline(get(id))));
  r.authors.forEach((id,i)=>{if(i)authors.append(d.createTextNode(' '));authors.append(inline(get(id)));});
  title.append(...r.title.map(id=>inline(get(id))));copy.append(grade,authors,title,...r.subtitle.map(id=>inline(get(id))));
  const photo=get(r.photo);photo.className='adt-cover-photo';
  footer.append(...r.footer.map(id=>inline(get(id))));
  s.replaceChildren(copy,photo,footer);s.classList.add('adt-cover');
 }else if(recipe.kind==='contents'){
  const title=s.querySelector('h1,h2');if(title)title.className='adt-toc-title';
  const rows=[...s.querySelectorAll('[data-toc-leader]')].map(leader=>{
   const holder=leader.parentElement,values=[...holder.children].filter(n=>n.hasAttribute('data-id'));if(values.length!==2)throw Error('Contents row needs two bound text nodes.');
   let group=false;for(let e=holder;e&&e!==s;e=e.parentElement)if(/bg-(amber|\[#f)/.test(oldClasses.get(e)||''))group=true;
   const row=make('div','adt-toc-row'+(group?' adt-toc-group':'')),rule=make('span','adt-toc-leader');rule.setAttribute('aria-hidden','true');
   row.append(inline(values[0]),rule,inline(values[1]));return row;
  });if(!rows.length)throw Error('Contents rows are not recognized.');s.replaceChildren(...(title?[title]:[]),...rows);
 }else if(recipe.kind==='lesson'){
  const hero=make('header','adt-hero'),keywords=make('div','adt-keywords');
  for(const id of recipe.roles.headings){const n=get(id);n.className='';hero.append(n);}
  for(const id of recipe.roles.keywords)keywords.append(inline(get(id)));
  s.replaceChildren(hero,keywords);
 }else if(recipe.kind==='reflection'){
  const heading=s.querySelector('h1,h2'),list=s.querySelector('ul,ol');if(!heading||!list)throw Error('Reflection prompts are missing.');
  heading.className='adt-panel-heading';list.className='adt-prompts';
  for(const li of list.children){li.className='';for(const n of li.querySelectorAll('[class]'))if(!n.classList.contains('sr-only'))n.className='';const prompt=li.querySelector('div');if(prompt)prompt.className='adt-prompt';for(const n of li.querySelectorAll('[aria-hidden=true]'))if(!n.hasAttribute('data-id'))n.remove();}
  if(assetPaths[recipe.icon]){const icon=make('img');icon.src=relative(recipe.href,assetPaths[recipe.icon]);icon.alt='';icon.setAttribute('aria-hidden','true');heading.prepend(icon);}
  s.replaceChildren(heading,list);
 }else if(recipe.kind==='illustrated'){
  const copy=[...s.querySelectorAll('p')],images=[...s.querySelectorAll('img')];
  for(const n of copy)n.className='adt-reading-copy';
  const figures=images.map(img=>{const f=make('figure','adt-figure');img.className='';f.append(img);return f;});s.replaceChildren(...copy,...figures);
 }else if(recipe.kind==='quiz'){
  const wrapper=s.firstElementChild;if(!wrapper||!s.querySelector('.quiz-card'))throw Error('Quiz structure is not recognized.');wrapper.className='adt-quiz-wrap';
 }else if(recipe.kind==='flow'){
  composeFlow(s,oldClasses);
 }else throw Error('This composition has not been implemented.');
 for(const [id,path]of Object.entries(assetPaths)){const n=qid(root,id);if(n?.tagName==='IMG')n.src=relative(recipe.href,path);}
 for(const img of root.querySelectorAll('img'))img.setAttribute('decoding','async');
 for(const file of ['components.css','tokens.css']){const link=d.createElement('link');link.rel='stylesheet';link.href=relative(recipe.href,packagePath+'/'+file);d.head.append(link);}
 if(sourceHash){root.dataset.adtSource=sourceHash;root.dataset.adtSavedMessage=responseMessages.saved||'Responses saved in this browser.';root.dataset.adtSaveFailure=responseMessages.failure||'Cannot save in this browser. Copy your answers before leaving.';const helper=d.createElement('script');helper.src=relative(recipe.href,'folio/compositions/responses.js');helper.dataset.adtResponseAdapter='true';d.body.append(helper);}
 checkContract(before,root);return {html:serialize(d),contract:before};
}

// Reuse the original DOM for mixed lessons, tables and worksheets. Only presentation
// utilities are replaced; grid relationships, labels and activity hooks stay intact.
function composeFlow(section,oldClasses){
 const nodes=[...section.querySelectorAll('*')];
 for(const n of nodes){
  if(n.closest('svg,table')||n.classList.contains('sr-only'))continue;
  const classes=oldClasses.get(n)||'',parts=classes.split(/\s+/);
  const color=parts.find(c=>/^bg-(sky|cyan|blue|amber|yellow|orange|purple|violet)/.test(c));
  if(color&&n.matches('div,aside,header')&&n.querySelector('[data-id],input,textarea')){
   const tone=/sky|cyan|blue/.test(color)?'reflection':/amber|yellow|orange/.test(color)?'practice':'brand';
   n.dataset.adtPanel=tone;
  }
  // Decorative shapes never carry or contain textbook content.
  if(n.getAttribute('aria-hidden')==='true'&&!n.matches('img')&&!n.querySelector('[data-id],img,input,textarea,select')&&!n.hasAttribute('data-id')){n.remove();continue;}
  n.className=parts.filter(c=>{
   const base=c.split(':').at(-1).replace(/^-/,'');
   return !/^(?:text-|font-|leading-|tracking-|bg-|border(?:-|$)|rounded|shadow|p[trblxy]?-|m[trblxy]?-|space-[xy]-|h-|min-h-|max-h-|max-w-|w-screen|w-\[|float-|overflow-hidden|left-|right-|top-|bottom-|inset-)/.test(base);
  }).join(' ');
  if(n.matches('div,aside,header,figure')&&!n.querySelector('svg')){n.classList.remove('absolute','fixed');}
  if(n.matches('h1,h2,h3,h4'))n.classList.add('adt-flow-heading');
  if(n.matches('p'))n.classList.add('adt-reading-copy');
  if(n.matches('img')){n.classList.add('adt-flow-image');if(/(?:^|\s)(?:w|h)-(?:12|14|16|20|24)(?:\s|$)/.test(classes))n.classList.add('adt-flow-icon');}
  if(n.matches('figure'))for(const c of [...n.classList])if(/(?:^|:)rotate-/.test(c))n.classList.remove(c);
  if(n.matches('div,aside')&&n.style.backgroundImage.includes('linear-gradient')&&!n.querySelector('svg,table'))n.style.removeProperty('background-image');
  if(n.matches('input[type=radio],input[type=checkbox]'))n.classList.add('adt-choice-control');
 }
 // Nested color wrappers were a printing treatment; use one panel per region.
 for(const n of section.querySelectorAll('[data-adt-panel]'))if(n.parentElement.closest('[data-adt-panel]'))n.removeAttribute('data-adt-panel');
 // Reuse the same lesson header and keyword components as the reviewed example.
 for(const n of section.querySelectorAll('div,header')){
  const old=oldClasses.get(n)||'',headings=[...n.querySelectorAll('h1,h2')];
  if(/bg-/.test(old)&&headings.length&&headings.every(h=>/text-white/.test(oldClasses.get(h)||''))&&!n.querySelector('img,input,textarea,select')&&n.textContent.replace(/\s/g,'')===headings.map(h=>h.textContent).join('').replace(/\s/g,'')){
   n.classList.add('adt-hero');n.removeAttribute('data-adt-panel');
  }
 }
 for(const label of section.querySelectorAll('[data-id]'))if(/^Fjal[ëe]t ky[çc]e:$/i.test(label.textContent.trim())){
  let wrapper=label.parentElement;
  while(wrapper&&wrapper!==section&&wrapper.querySelectorAll('[data-id]').length<2)wrapper=wrapper.parentElement;
  if(!wrapper||wrapper===section||wrapper.querySelector('img,input,textarea,select'))continue;
  const values=[...wrapper.querySelectorAll('[data-id]')];
  if(values.length===2&&wrapper.textContent.replace(/\s/g,'')===values.map(n=>n.textContent).join('').replace(/\s/g,'')){
   wrapper.className='adt-keywords';wrapper.removeAttribute('data-adt-panel');for(const n of values){n.className='';n.removeAttribute('data-adt-panel');}wrapper.replaceChildren(...values);
  }
 }
 for(const n of section.querySelectorAll('table')){const wrap=section.ownerDocument.createElement('div');wrap.className='adt-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Table');n.before(wrap);wrap.append(n);}
}

/** Apply the reviewed library atomically, preserving any edits made since generation. */
export async function applyCompositionSystem(book,onProgress=()=>{}){
 const draft=book.design?.draft;if(!draft)throw Error('Create the component library first.');
 const profile=await referenceProfile({hash:book.design.pdfHash});if(!profile||profile.id!==draft.profile)throw Error('The component profile is unavailable.');
 const staged=new Map(book.files),applied=[],packagePath='folio/book-design';
 for(const [path,bytes]of book.files)if(path.startsWith('folio/compositions/')&&!path.endsWith('/responses.js'))staged.set(path.replace('folio/compositions/',packagePath+'/'),bytes);
 // Saved projects may carry an older compiled library; update from this release.
 for(const file of ['components.css','components.source.css','responses.js']){const url=new URL('../design/'+file,import.meta.url);url.search=new URL(import.meta.url).search;const response=await fetch(url);if(!response.ok)throw Error('The component stylesheet could not be loaded.');const bytes=enc.encode(await response.text());staged.set((file==='responses.js'?'folio/compositions':packagePath)+'/'+file,bytes);}
 staged.set(packagePath+'/tokens.css',enc.encode(compositionCSS(book.tokens,draft.brand)));
 const assetPaths=Object.fromEntries(draft.assets.map(a=>[a.id,a.path]));
 for(const [index,page]of book.spine.entries()){
  onProgress('Applying the design to every section',`${index+1} of ${book.spine.length} · ${page.href}`,(index+1)/book.spine.length*100);
  const html=dec.decode(book.files.get(page.href)),d=parse(html),root=d.querySelector('#content');if(!root)throw Error('No content root in '+page.href+'. Nothing was applied.');
  let kind,result;
  if(root.classList.contains('adt-composition')){
   kind=root.querySelector('[data-composition]')?.dataset.composition||'flow';
   for(const link of d.querySelectorAll('link[rel=stylesheet]'))if(/folio\/(compositions|book-design)\/(components|tokens)\.css/.test(link.getAttribute('href')||''))link.href=relative(page.href,packagePath+'/'+(/tokens/.test(link.href)?'tokens.css':'components.css'));
   result=serialize(d);
  }else{
   let recipe=profile.examples.find(e=>e.href===page.href);
   if(!recipe){kind=root.querySelector('.quiz-card')?'quiz':root.querySelector('[data-toc-leader]')?'contents':'flow';recipe={href:page.href,kind};}
   kind=recipe.kind;result=composePage(html,recipe,{assetPaths,packagePath,sourceHash:book.design.pdfHash,responseMessages:profile.responseMessages}).html;
  }
  staged.set(page.href,enc.encode(result));applied.push({href:page.href,kind});
  if(index%8===0)await new Promise(r=>setTimeout(r,0));
 }
 const candidate=Object.assign(Object.create(Object.getPrototypeOf(book)),book,{files:staged,applied:true});
 const validation=candidate.validate();if(!validation.valid)throw Error('Apply stopped: '+validation.failures.slice(0,3).map(f=>f.message+' '+f.path).join('; '));
 book.snapshot('Applied the reviewed design to all '+applied.length+' sections');book.files=staged;book.applied=true;
 book.design.application={at:new Date().toISOString(),sections:applied,tokens:{...book.tokens},pending:false};
 book.design.draft.stage='applied';book.design.status='Design applied to all '+applied.length+' sections · source review remains available';
 book.write('folio/design-system.json',JSON.stringify(book.design,null,2));
 return applied;
}

export function compositionCSS(tokens,brand){
 validateTokens(tokens);
 const colors={ink:tokens.ink,paper:tokens.paper,accent:tokens.accent,surface:tokens.surface,'on-accent':'#ffffff',...brand.colors};
 for(const value of Object.values(colors))if(!/^#[\da-f]{6}$/i.test(value))throw Error('Invalid semantic color.');
 const pairs=[['ink','paper'],['ink','surface'],['ink','reflection'],['on-accent','cover'],['on-accent','accent'],['practice-ink','practice-header']];
 const failed=pairs.filter(([a,b])=>contrast(colors[a],colors[b])<4.5);if(failed.length)throw Error('Text contrast below 4.5:1: '+failed.map(p=>p.join(' on ')).join(', '));
 const reading=tokens.font==='sans'?'ADTHeading,system-ui,sans-serif':tokens.font==='serif'?'Georgia,serif':'ADTReading,Georgia,serif';
 return `:root{${Object.entries(colors).map(([k,v])=>`--adt-${k}:${v}`).join(';')};--adt-heading:ADTHeading,system-ui,sans-serif;--adt-reading:${reading};--adt-width:${tokens.width}px;--adt-size:${tokens.fontSize}px;--adt-leading:${tokens.lineHeight};--adt-space:${tokens.space}px;--adt-radius:${tokens.radius}px}`;
}

export function designPreviewBook(book){
 const pages=book.design?.draft?.pages||book.design?.previewPages;if(!pages)return book;
 const files=new Map(book.files);for(const [href,html]of Object.entries(pages))files.set(href,enc.encode(html));
 return Object.assign(Object.create(Object.getPrototypeOf(book)),book,{name:book.name+' · design draft',files});
}

export function updateCompositionTokens(book,tokens){
 const draft=book.design?.draft;if(!draft)throw Error('Create the composition gallery first.');
 const css=compositionCSS(tokens,draft.brand);book.snapshot('Updated the six-page design draft');book.tokens={...tokens};book.design.tokens={...tokens};
 if(book.design.application)book.design.application.pending=true;
 book.write('folio/compositions/tokens.css',css);book.write('folio/design-system.json',JSON.stringify(book.design,null,2));
}

/** Render the verified PDF region, retaining clipping and composite artwork. */
async function cropAsset(source,asset){
 const page=await source.pdf.getPage(asset.page),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:asset.render[1]/base.height});
 const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
 await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
 const [x,y,right,bottom]=asset.bounds.map((v,i)=>Math.round(v*(i%2?canvas.height/asset.render[1]:canvas.width/asset.render[0])));
 const crop=document.createElement('canvas');crop.width=right-x;crop.height=bottom-y;crop.getContext('2d').drawImage(canvas,x,y,crop.width,crop.height,0,0,crop.width,crop.height);
 const blob=await new Promise(r=>crop.toBlob(r,'image/png'));return new Uint8Array(await blob.arrayBuffer());
}

export async function referenceProfile(source){
 // A verified reference is explicitly fingerprinted. Never apply its palette or bindings to another PDF.
 const url=new URL('../design/reference-5b.json',import.meta.url);url.search=new URL(import.meta.url).search;const response=await fetch(url);if(!response.ok)throw Error('Reference profile unavailable.');
 const profile=await response.json();return profile.pdfHashes.includes(source.hash)?profile:null;
}

export async function buildCompositionDraft(book,source,system,profile,onProgress=()=>{}){
 if(!profile.pdfHashes.includes(source.hash))throw Error('The source PDF does not match this verified composition profile.');
 const staged=new Map(),assetPaths={},provenance=[],pages={},contracts={};
 const getAsset=async path=>{const url=new URL('../design/'+path,import.meta.url);url.search=new URL(import.meta.url).search;const response=await fetch(url);if(!response.ok)throw Error('Design asset unavailable: '+path);return new Uint8Array(await response.arrayBuffer());};
 const packagePath='folio/compositions';
 for(const file of ['components.css','components.source.css','responses.js',...profile.fontFiles.map(f=>'fonts/'+f)])staged.set(packagePath+'/'+file,await getAsset(file));
 for(const asset of profile.assets){onProgress('Extracting verified source artwork','PDF page '+asset.page+' · '+asset.role);const bytes=await cropAsset(source,asset),path=packagePath+'/images/'+asset.id+'.png';staged.set(path,bytes);assetPaths[asset.id]=path;provenance.push({...asset,path,method:'PDF rendered crop',pdfSHA256:source.hash,sha256:await sha(bytes)});}
 const tokens=book.design?.draft?.profile===profile.id?{...book.tokens}:{...system.tokens,...profile.tokens};staged.set(packagePath+'/tokens.css',enc.encode(compositionCSS(tokens,profile.brand)));
 for(const recipe of profile.examples){onProgress('Composing the design examples',recipe.name);if(!book.spine.some(p=>p.href===recipe.href))throw Error('This ADT does not contain the reference section '+recipe.href);
  const originalHTML=dec.decode(book.files.get(recipe.href)),existing=parse(originalHTML),root=existing.querySelector('#content.adt-composition');
  if(root){for(const link of existing.querySelectorAll('link[rel=stylesheet]'))if(/folio\/(compositions|book-design)\/(components|tokens)\.css/.test(link.getAttribute('href')||''))link.href=relative(recipe.href,packagePath+'/'+(/tokens/.test(link.href)?'tokens.css':'components.css'));pages[recipe.href]=serialize(existing);contracts[recipe.href]=contract(root);}
  else {const {html,contract:signature}=composePage(originalHTML,recipe,{assetPaths,packagePath,sourceHash:source.hash,responseMessages:profile.responseMessages});pages[recipe.href]=html;contracts[recipe.href]=signature;}
 }
 // Commit only after every composition preserves its content and controls.
 book.snapshot('Created six PDF-guided design examples');
 const analysis=system.method==='ai-guided'?{method:system.method,notes:system.notes,tokens:system.tokens,pagesReviewed:system.observations.length,sectionsAssigned:system.sections.length}:null;
 system={...system,version:2,tokens,analysis,method:analysis?'ai-guided-reference-compositions':'verified-composition-profile',status:analysis?'AI reviewed · six composed examples · awaiting visual approval':'Six composed examples · awaiting visual approval',notes:(analysis?'AI source review is complete. ':'')+'The first six compositions use the verified reference recipe and artwork extracted from your PDF. The rest of the book remains unchanged. All source pages are inventoried; unreviewed matches are still provisional.',draft:{version:COMPOSITION_VERSION,profile:profile.id,stage:'review',brand:profile.brand,pages,contracts,assets:provenance,examples:profile.examples.map(({href,kind,name,page,region,sourceNote})=>({href,kind,name,page,region,sourceNote}))}};
 for(const example of profile.examples){const section=system.sections.find(s=>s.href===example.href);Object.assign(section,{sourcePage:example.page,basis:'verified-reference-region',confidence:1,composition:example.kind,title:example.name});}
 system.families=profile.examples.map(e=>({id:e.kind,name:e.name,examples:[e.href],sections:[system.sections.find(s=>s.href===e.href).id],sourcePages:[e.page]}));
 for(const p of system.pages)p.sectionIds=system.sections.filter(s=>s.sourcePage===p.page).map(s=>s.id);
 if(book.design?.application)system.application={...book.design.application,pending:true};
 book.design=system;book.tokens=tokens;for(const [path,bytes]of staged)book.write(path,bytes);
 book.write('folio/design-system.json',JSON.stringify(system,null,2));book.write('folio/page-inventory.json',JSON.stringify({pdfPages:system.pages.map(({thumbnail,...p})=>p),sections:system.sections.map(({text,...s})=>s)},null,2));
 return system;
}
