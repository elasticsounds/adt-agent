import {serialize} from './core.mjs?v=0.10.0';
const numeric={fontSize:[16,64,'px'],lineHeight:[1.2,2.4,''],width:[20,100,'%'],maxWidth:[60,1200,'px'],marginTop:[0,80,'px'],marginBottom:[0,80,'px'],padding:[0,64,'px'],gap:[0,64,'px'],borderRadius:[0,40,'px']};
const choices={display:['block','inline-block'],textAlign:['start','left','center','right'],objectFit:['contain','cover'],alignSelf:['auto','start','center','end','stretch'],marginInline:['auto','0']};
export const ELEMENT_STYLE_HELP='fontSize (16–64 px), lineHeight (1.2–2.4), width (20–100 percent), maxWidth (60–1200 px), marginTop/marginBottom (0–80 px), padding/gap (0–64 px), borderRadius (0–40 px), display (block/inline-block), textAlign (start/left/center/right), objectFit (contain/cover), alignSelf (auto/start/center/end/stretch), marginInline (auto/0). Values for numeric properties must be numbers. To centre an image use display:block, a smaller width or maxWidth and marginInline:auto. Use objectFit:cover only when the person explicitly requests cropping.';
export function normalizeElementStyle(value){
 const data=typeof value==='string'?JSON.parse(value):value;
 if(!data||Array.isArray(data)||typeof data!=='object'||!Object.keys(data).length||Object.keys(data).length>8)throw Error('Choose one to eight supported object adjustments.');
 return Object.entries(data).map(([key,value])=>{let css;if(Object.hasOwn(numeric,key)){const [min,max,unit]=numeric[key];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Object style is outside its supported range.');css=value+unit;}else if(Object.hasOwn(choices,key)&&choices[key].includes(value))css=value;else throw Error('Unsupported object style.');return [key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),css];});
}
function pathNode(root,path){let node=root;for(const index of path||[]){if(!Number.isInteger(index)||index<0)return null;node=node?.children[index];}return node;}
function pathOf(root,node){const path=[];for(;node&&node!==root;node=node.parentElement)path.unshift([...node.parentElement.children].indexOf(node));return path;}
export function resolveSelectionTargets(book,href,objects){
 const root=book.doc(href).querySelector('#content'),targets=[];if(!root)return targets;
 for(const descriptor of (objects||[]).slice(0,12)){
  const all=[root,...root.querySelectorAll('*')];let matches=[];
  if(descriptor.dataId)matches=all.filter(n=>n.dataset.id===descriptor.dataId);
  else if(descriptor.id)matches=all.filter(n=>n.id===descriptor.id);
  else {const equal=n=>n?.tagName.toLowerCase()===descriptor.tag&&JSON.stringify([...n.querySelectorAll('[data-id]')].map(n=>n.dataset.id).slice(0,80))===JSON.stringify(descriptor.bindingIds||[])&&n.textContent.trim().slice(0,600)===descriptor.text;const byPath=pathNode(root,descriptor.path);if(equal(byPath))matches=[byPath];else matches=all.filter(equal);}
  if(matches.length!==1||['SCRIPT','STYLE','LINK'].includes(matches[0].tagName))continue;
  const node=matches[0],path=pathOf(root,node);if(targets.some(t=>JSON.stringify(t.path)===JSON.stringify(path)))continue;
  targets.push({id:'selection-'+(targets.length+1),path,tag:node.tagName.toLowerCase(),elementId:node.id||'',dataId:node.dataset.id||'',text:node.textContent.trim().slice(0,600),rendered:Object.fromEntries(Object.entries(descriptor.metrics||{}).filter(([k,v])=>['widthPx','heightPx','parentWidthPx','fontSizePx','lineHeightMultiple','marginTopPx','marginBottomPx','paddingPx','gapPx','borderRadiusPx'].includes(k)&&Number.isFinite(v)&&Math.abs(v)<100000))});
 }
 return targets;
}
export function applyElementStyle(book,href,target,value){
 const styles=normalizeElementStyle(value),doc=book.doc(href),root=doc.querySelector('#content'),node=root&&pathNode(root,target?.path);
 if(!node||node.tagName.toLowerCase()!==target.tag||node.id!==target.elementId|| (node.dataset.id||'')!==target.dataId)throw Error('The selected object changed. Capture it again before editing.');
 book.snapshot('Adjusted selected '+target.tag+' in '+href);
 for(const [property,value]of styles)node.style.setProperty(property,value,'important');
 book.write(href,serialize(doc));
}

export function selectionImageIndices(book,href,descriptors){
 const root=book.doc(href).querySelector('#content');if(!root)return [];const images=[...root.querySelectorAll('img')];
 return resolveSelectionTargets(book,href,descriptors).filter(t=>t.tag==='img').map(t=>images.indexOf(pathNode(root,t.path))).filter(i=>i>=0);
}
