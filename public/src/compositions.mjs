import {parse,serialize,relative,resolvePath,enc,dec,sha,validateTokens,contrast} from './core.mjs?v=0.6.0';

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
  const title=s.querySelector('h1,h2');if(!title)throw Error('Contents heading is missing.');title.className='adt-toc-title';
  const rows=[...s.querySelectorAll('[data-toc-leader]')].map(leader=>{
   const holder=leader.parentElement,values=[...holder.children].filter(n=>n.hasAttribute('data-id'));if(values.length!==2)throw Error('Contents row needs two bound text nodes.');
   let group=false;for(let e=holder;e&&e!==s;e=e.parentElement)if(/bg-(amber|\[#f)/.test(oldClasses.get(e)||''))group=true;
   const row=make('div','adt-toc-row'+(group?' adt-toc-group':'')),rule=make('span','adt-toc-leader');rule.setAttribute('aria-hidden','true');
   row.append(inline(values[0]),rule,inline(values[1]));return row;
  });if(!rows.length)throw Error('Contents rows are not recognized.');s.replaceChildren(title,...rows);
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
 }else throw Error('This composition has not been implemented.');
 for(const [id,path]of Object.entries(assetPaths)){const n=qid(root,id);if(n?.tagName==='IMG')n.src=relative(recipe.href,path);}
 for(const img of root.querySelectorAll('img'))img.setAttribute('decoding','async');
 for(const file of ['components.css','tokens.css']){const link=d.createElement('link');link.rel='stylesheet';link.href=relative(recipe.href,packagePath+'/'+file);d.head.append(link);}
 if(sourceHash){root.dataset.adtSource=sourceHash;root.dataset.adtSavedMessage=responseMessages.saved||'Responses saved in this browser.';root.dataset.adtSaveFailure=responseMessages.failure||'Cannot save in this browser. Copy your answers before leaving.';const helper=d.createElement('script');helper.src=relative(recipe.href,packagePath+'/responses.js');helper.dataset.adtResponseAdapter='true';d.body.append(helper);}
 checkContract(before,root);return {html:serialize(d),contract:before};
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
 if(!book.design?.draft)return book;
 const files=new Map(book.files);for(const [href,html]of Object.entries(book.design.draft.pages))files.set(href,enc.encode(html));
 return Object.assign(Object.create(Object.getPrototypeOf(book)),book,{name:book.name+' · design draft',files});
}

export function updateCompositionTokens(book,tokens){
 const draft=book.design?.draft;if(!draft)throw Error('Create the composition gallery first.');
 const css=compositionCSS(tokens,draft.brand);book.snapshot('Updated the six-page design draft');book.tokens={...tokens};book.design.tokens={...tokens};
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
  const {html,contract:signature}=composePage(dec.decode(book.files.get(recipe.href)),recipe,{assetPaths,packagePath,sourceHash:source.hash,responseMessages:profile.responseMessages});pages[recipe.href]=html;contracts[recipe.href]=signature;
 }
 // Commit only after every composition preserves its content and controls.
 book.snapshot('Created six PDF-guided design examples');
 system={...system,version:2,tokens,method:'verified-composition-profile',status:'Six composed examples · awaiting visual approval',notes:'The first six compositions use the verified reference recipe and artwork extracted from your PDF. The rest of the book remains unchanged. All source pages are inventoried; unreviewed matches are still provisional.',draft:{version:COMPOSITION_VERSION,profile:profile.id,stage:'review',brand:profile.brand,pages,contracts,assets:provenance,examples:profile.examples.map(({href,kind,name,page,region,sourceNote})=>({href,kind,name,page,region,sourceNote}))}};
 for(const example of profile.examples){const section=system.sections.find(s=>s.href===example.href);Object.assign(section,{sourcePage:example.page,basis:'verified-reference-region',confidence:1,composition:example.kind,title:example.name});}
 system.families=profile.examples.map(e=>({id:e.kind,name:e.name,examples:[e.href],sections:[system.sections.find(s=>s.href===e.href).id],sourcePages:[e.page]}));
 for(const p of system.pages)p.sectionIds=system.sections.filter(s=>s.sourcePage===p.page).map(s=>s.id);
 book.design=system;book.tokens=tokens;for(const [path,bytes]of staged)book.write(path,bytes);
 book.write('folio/design-system.json',JSON.stringify(system,null,2));book.write('folio/page-inventory.json',JSON.stringify({pdfPages:system.pages.map(({thumbnail,...p})=>p),sections:system.sections.map(({text,...s})=>s)},null,2));
 return system;
}
