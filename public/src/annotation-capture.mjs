// Runs inside the reader's opaque sandbox. No parent DOM or application storage
// access is needed: only a self-contained image description leaves this frame.
export function snapshotReaderArea(rect){
 const root=document.querySelector('#content')||document.querySelector('main');
 if(!root)throw Error('This page has no book content to capture.');
 const blocked=new Set(['SCRIPT','STYLE','LINK','IFRAME','OBJECT','EMBED']);
 const fonts=new Set();
 function clone(node){
  if(node.nodeType===3)return document.createTextNode(node.textContent);
  if(node.nodeType!==1||blocked.has(node.tagName))return null;
  const result=node.cloneNode(false),style=getComputedStyle(node);fonts.add(style.fontFamily);
  for(const attr of [...result.attributes])if(/^on/i.test(attr.name)||['srcset','srcdoc','href','target','autofocus'].includes(attr.name))result.removeAttribute(attr.name);
  result.removeAttribute('style');
  for(const property of style){const value=style.getPropertyValue(property);if(value)result.style.setProperty(property,value);}
  result.style.setProperty('animation','none','important');result.style.setProperty('transition','none','important');
  if(node instanceof HTMLImageElement)result.src=node.currentSrc||node.src;
  if(node instanceof HTMLInputElement){result.setAttribute('value',node.value);if(node.checked)result.setAttribute('checked','');else result.removeAttribute('checked');}
  if(node instanceof HTMLTextAreaElement)result.textContent=node.value;
  else for(const child of node.childNodes){const copy=clone(child);if(copy)result.append(copy);}
  if(node instanceof HTMLSelectElement)for(let i=0;i<result.options.length;i++)result.options[i].toggleAttribute('selected',node.options[i].selected);
  for(const pseudo of ['::before','::after']){const ps=getComputedStyle(node,pseudo),content=ps.content;if(!content||['none','normal','""'].includes(content))continue;let value;try{value=JSON.parse(content)}catch{continue}const span=document.createElement('span');span.textContent=value;for(const property of ps)span.style.setProperty(property,ps.getPropertyValue(property));span.style.removeProperty('content');pseudo==='::before'?result.prepend(span):result.append(span);}
  return result;
 }
 const copy=clone(root),bounds=root.getBoundingClientRect();
 for(const name of ['inset','inset-inline','inset-block','inset-inline-start','inset-inline-end','inset-block-start','inset-block-end','left','right','top','bottom','margin','margin-inline','margin-block','margin-inline-start','margin-inline-end','margin-block-start','margin-block-end'])copy.style.removeProperty(name);
 Object.assign(copy.style,{position:'absolute',left:(bounds.left+scrollX)+'px',top:(bounds.top+scrollY)+'px',margin:'0',transform:'none'});
 const styleText=[];
 for(const sheet of document.querySelectorAll('style,link[rel=stylesheet]')){let css='';try{if(sheet.tagName==='STYLE')css=sheet.textContent;else {const href=sheet.getAttribute('href').split('#')[0];if(href.startsWith('data:text/css;base64,'))css=atob(href.split(',')[1]);}}catch{}
  for(const face of css.match(/@font-face\s*\{[^}]+\}/gi)||[]){const family=face.match(/font-family\s*:\s*([^;]+)/i)?.[1]?.replace(/["']/g,'').trim();if(family&&[...fonts].some(value=>value.includes(family)))styleText.push(face);}
 }
 const pageWidth=document.documentElement.clientWidth,pageHeight=document.documentElement.getBoundingClientRect().height;
 const wrapper=document.createElement('div');wrapper.setAttribute('xmlns','http://www.w3.org/1999/xhtml');wrapper.style.cssText=`position:relative;width:${pageWidth}px;height:${pageHeight}px;overflow:hidden;background:${getComputedStyle(document.body).backgroundColor}`;
 const style=document.createElement('style');style.textContent=[...new Set(styleText)].join('\n');wrapper.append(style,copy);
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${rect.w}" height="${rect.h}" viewBox="${rect.x} ${rect.y} ${rect.w} ${rect.h}"><foreignObject x="0" y="0" width="${pageWidth}" height="${pageHeight}">${new XMLSerializer().serializeToString(wrapper)}</foreignObject></svg>`;
 return {svg,width:Math.round(rect.w),height:Math.round(rect.h)};
}

export function installReaderAnnotations(token,snapshot){
 const send=(type,payload={})=>parent.postMessage({readerToken:token,type,...payload},'*');
 let active=false,down=null,hovered=null,moving=false,overlay=null,candidates=[],keyboardIndex=-1,suppressClick=false,oldTouch='';
 const content=()=>document.querySelector('#content')||document.querySelector('main');
 const candidate=node=>{const root=content();if(!root||!root.contains(node))return null;const chosen=node.closest('img,figure,table,textarea,input,select,label,h1,h2,h3,p,li')||node.closest('[data-id],section,article');return chosen&&root.contains(chosen)?chosen:node;};
 const pathFor=node=>{const result=[];while(node&&node!==content()){result.unshift([...node.parentElement.children].indexOf(node));node=node.parentElement;}return result;};
 const metrics=node=>{const s=getComputedStyle(node),r=node.getBoundingClientRect();return {widthPx:r.width,heightPx:r.height,parentWidthPx:node.parentElement.getBoundingClientRect().width,fontSizePx:parseFloat(s.fontSize),lineHeightMultiple:parseFloat(s.lineHeight)/parseFloat(s.fontSize),marginTopPx:parseFloat(s.marginTop),marginBottomPx:parseFloat(s.marginBottom),paddingPx:parseFloat(s.paddingTop),gapPx:parseFloat(s.gap),borderRadiusPx:parseFloat(s.borderTopLeftRadius)};};
 const descriptor=node=>({metrics:metrics(node),tag:node.tagName.toLowerCase(),id:node.id||'',dataId:node.dataset.id||'',path:pathFor(node),bindingIds:[...node.querySelectorAll('[data-id]')].map(n=>n.dataset.id).slice(0,80),text:node.textContent.trim().slice(0,600)});
 const box=rect=>{overlay.style.cssText=`position:fixed;pointer-events:none;z-index:2147483647;box-sizing:border-box;border:3px solid #b14b22;background:#b14b2215;left:${rect.x}px;top:${rect.y}px;width:${rect.w}px;height:${rect.h}px`;};
 const bounds=node=>{const r=node.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height};};
 const stop=()=>{if(!active)return;active=false;down=null;overlay?.remove();overlay=null;document.documentElement.style.removeProperty('cursor');if(content())content().style.touchAction=oldTouch;send('annotation-mode',{active:false});};
 const start=()=>{if(active)return;active=true;oldTouch=content()?.style.touchAction||'';if(content())content().style.touchAction='none';overlay=document.createElement('div');overlay.dataset.adtAnnotationOverlay='';overlay.setAttribute('aria-hidden','true');document.documentElement.append(overlay);document.documentElement.style.cursor='crosshair';};
 const capture=(rect,node)=>{const padding=node?6:0,x=Math.max(0,rect.x-padding),y=Math.max(0,rect.y-padding);rect={x,y,w:Math.min(innerWidth-x,rect.w+padding*2),h:Math.min(innerHeight-y,rect.h+padding*2)};if(rect.w<8||rect.h<8)return;
  const nodes=node?[node]:[...content().querySelectorAll('[data-id],img,input,textarea,select,table')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.left>=x&&r.top>=y&&r.right<=x+rect.w&&r.bottom<=y+rect.h}).slice(0,12);
  const images=[...content().querySelectorAll('img')].flatMap((n,i)=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.left>=x&&r.top>=y&&r.right<=x+rect.w&&r.bottom<=y+rect.h?[i]:[];});
  stop();send('annotation-start');try{send('annotation-capture',{capture:{...snapshot({...rect,x:x+scrollX,y:y+scrollY}),rect,viewport:{width:innerWidth,height:innerHeight},objects:nodes.map(descriptor),images:images.slice(0,12).map(i=>descriptor(content().querySelectorAll('img')[i])),kind:node?'object':'area',sectionId:document.querySelector('meta[name=title-id]')?.content||''}});}catch(e){send('annotation-error',{message:e.message});}
 };
 window.addEventListener('message',e=>{if(e.source!==parent||e.data?.readerToken!==token||e.data.type!=='annotation-mode')return;e.data.active?start():stop();});
 document.addEventListener('pointermove',e=>{if(!active)return;if(down){moving ||= Math.hypot(e.clientX-down.x,e.clientY-down.y)>5;if(moving)box({x:Math.min(down.x,e.clientX),y:Math.min(down.y,e.clientY),w:Math.abs(e.clientX-down.x),h:Math.abs(e.clientY-down.y)});}else {hovered=candidate(e.target);if(hovered)box(bounds(hovered));}},true);
 document.addEventListener('pointerdown',e=>{if(!active||e.button!==0)return;hovered=candidate(e.target);if(!hovered)return;suppressClick=true;e.preventDefault();e.stopImmediatePropagation();down={x:e.clientX,y:e.clientY,node:hovered};moving=false;e.target.setPointerCapture?.(e.pointerId);},true);
 document.addEventListener('pointercancel',()=>{down=null;},true);
 document.addEventListener('pointerup',e=>{if(!active||!down)return;e.preventDefault();e.stopImmediatePropagation();const initial=down;down=null;capture(moving?{x:Math.min(initial.x,e.clientX),y:Math.min(initial.y,e.clientY),w:Math.abs(e.clientX-initial.x),h:Math.abs(e.clientY-initial.y)}:bounds(initial.node),moving?null:initial.node);},true);
 // Prevent the selected exercise/button from activating on the following click.
 document.addEventListener('click',e=>{if(active||suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
 document.addEventListener('keydown',e=>{if(!active)return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();stop();}else if(['ArrowDown','ArrowUp','Enter'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();if(e.key==='Enter'){if(hovered)capture(bounds(hovered),hovered);return;}candidates=[...content().querySelectorAll('img,table,input,textarea,select,h1,h2,h3,p,[data-id]')].filter(n=>n.getBoundingClientRect().width&&n.getBoundingClientRect().height);keyboardIndex=(keyboardIndex+(e.key==='ArrowDown'?1:-1)+candidates.length)%candidates.length;hovered=candidates[keyboardIndex];if(hovered){box(bounds(hovered));send('annotation-focus',{rect:bounds(hovered)});}}},true);
 document.addEventListener('adt:page-changed',stop);
}
