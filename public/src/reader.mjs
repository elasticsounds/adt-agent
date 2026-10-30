import {snapshotReaderArea,installReaderAnnotations} from './annotation-capture.mjs?v=0.9.1';
import {Preview} from './preview.mjs?v=0.9.1';
import {parse,text,serialize,resolvePath} from './core.mjs?v=0.9.1';

// Run the imported Studio reader, not a replacement UI. Only its file transport,
// browser history and storage are adapted for an opaque, local-only iframe.
// Never give this frame allow-same-origin: the app's credentials live outside it.
export class Reader {
 constructor(){this.assets=new Preview();this.serial=0;window.addEventListener('message',e=>this.message(e));}
 dispose(){this.serial++;this.frame=null;this.assets.dispose();this.cache=null;this.resolve?.({cancelled:true});clearTimeout(this.timer);}
 async message(e){
  const m=e.data;if(!this.frame||e.source!==this.frame.contentWindow||m?.readerToken!==this.token)return;
  if(m.type==='asset'){const path=this.path(m.url);this.frame.contentWindow.postMessage({readerToken:this.token,type:'asset-response',id:m.id,value:path?this.assets.asset(path):''},'*');}
  else if(m.type==='fetch'){
   const path=this.path(m.url);let body='',status=404,type='text/plain';
   if(path&&this.files.has(path)){status=200;if(path.endsWith('.html')){body=this.document(path,false);type='text/html';}else {body=text(this.files,path);type=path.endsWith('.json')?'application/json':'text/plain';}}
   this.frame.contentWindow.postMessage({readerToken:this.token,type:'response',id:m.id,body,status,contentType:type},'*');
  }else if(m.type==='height'&&Number.isFinite(m.height)){this.frame.style.height=Math.min(100000,Math.max(600,m.height))+'px';}
  else if(m.type==='ready'){clearTimeout(this.timer);this.resolve?.({ready:true});this.resolve=null;}
  else if(m.type==='page'){const href=this.path(m.url);if(this.book.spine.some(p=>p.href===href)){this.href=href;this.options.onNavigate?.(href);}}
  else if(m.type==='navigate'){const href=this.path(m.url);if(this.book.spine.some(p=>p.href===href))this.options.onFullNavigate?.(href);}
  else if(typeof m.type==='string'&&m.type.startsWith('annotation-')){this.options.onAnnotation?.(m,this.href);}
  else if(m.type==='storage'&&typeof m.key==='string'&&m.key.length<500&&(m.value===null||typeof m.value==='string'&&m.value.length<100000)){
   if(m.value===null)delete this.state[m.key];else this.state[m.key]=m.value;this.options.onStorage?.();
  }
 }
 annotationMode(active){this.frame?.contentWindow.postMessage({readerToken:this.token,type:'annotation-mode',active},'*');}
 path(value){try{const u=new URL(value,'https://adt.local/'+this.href);return u.origin==='https://adt.local'?decodeURIComponent(u.pathname.slice(1)):null;}catch{return null;}}
 document(href,boot){
  const d=parse(text(this.files,href));for(const n of d.querySelectorAll('base,meta[http-equiv],iframe,object,embed,link[rel=manifest],link[rel=prefetch],link[rel=preload]'))n.remove();
  for(const n of d.querySelectorAll('[src],link[href]')){const attr=n.hasAttribute('src')?'src':'href',v=n.getAttribute(attr);if(n.tagName==='SCRIPT')continue;const path=resolvePath(href,v),globalSheet=n.tagName==='LINK'&&['tailwind_output.css','all.min.css','fonts.css'].includes(path?.split('/').pop());const u=globalSheet?(boot?this.assets.asset(path):'data:,')+'#/'+path:this.assets.asset(path);if(u)n.setAttribute(attr,u);else if(!/^data:/i.test(v))n.removeAttribute(attr);}
  for(const n of d.querySelectorAll('script')){
   const src=n.getAttribute('src'),path=src&&resolvePath(href,src);
   // The parent serves current project files, including edited pages. Using the
   // original preloader's baked-in HTML here would silently resurrect old pages.
   if(path?.endsWith('offline-preloader.js')){n.remove();continue;}
   if(path&&!boot){n.remove();continue;}
   if(n.type&&!['text/javascript','application/javascript','module'].includes(n.type))continue;
   const code=path?text(this.files,path):n.textContent;n.removeAttribute('src');n.removeAttribute('integrity');n.removeAttribute('crossorigin');n.removeAttribute('type');
   n.textContent=`(function(window,self,location,history,localStorage,sessionStorage,fetch){\n${code}\n}).call(window.__adtEmbed.window,window.__adtEmbed.window,window.__adtEmbed.window,window.__adtEmbed.location,window.__adtEmbed.history,window.localStorage,window.sessionStorage,window.fetch);`.replace(/<\/script/gi,'<\\/script');
  }
  for(let n=d.querySelector('main');n;n=n.parentElement)n.setAttribute('data-adt-embed-flow','');
  const style=d.createElement('style');style.textContent=`html,body{height:auto!important;min-height:0!important;overflow-y:visible!important}body{display:block!important}[data-adt-embed-flow],main,#content{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}#interface-container{position:relative!important;min-height:88px}#interface-container>div{position:relative!important;inset:auto!important}#nav-container{position:relative!important}html{scrollbar-width:none}`;d.head.append(style);
  if(boot){
   const csp=d.createElement('meta');csp.httpEquiv='Content-Security-Policy';csp.content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' data:; img-src data:; font-src data:; media-src data:; connect-src 'none'; frame-src 'none'; worker-src blob:; form-action 'none'; base-uri 'none';";
   const script=d.createElement('script');script.textContent=`(${embed.toString()})(${JSON.stringify({token:this.token,href,state:this.state}).replace(/</g,'\\u003c')});(${installReaderAnnotations.toString()})(${JSON.stringify(this.token)},${snapshotReaderArea.toString()});`;d.head.prepend(script);d.head.prepend(csp);
  }
  return serialize(d);
 }
 async show(frame,book,href,options={}){
  const files=options.original?book.original:book.files,key=[book,book.revision,options.original];
  if(!this.cache||key.some((v,i)=>v!==this.cache[i])){this.assets.prepare(book,options.original);this.cache=key;}
  this.resolve?.({cancelled:true});clearTimeout(this.timer);this.book=book;this.files=files;this.href=href;this.options=options;this.state=options.state||{};this.token=crypto.randomUUID();this.frame=frame;
  const result=new Promise((resolve,reject)=>{this.resolve=resolve;this.timer=setTimeout(()=>reject(Error('The embedded ADT Reader did not finish opening.')),30000)});
  frame.style.height='800px';frame.srcdoc=this.document(href,true);return result;
 }
}

function embed({token,href,state}){
 const send=(type,values={})=>parent.postMessage({readerToken:token,type,...values},'*');
 let url=new URL(href,'https://adt.local/'),counter=0;const pending=new Map();
 const storage=initial=>{const values=new Map(Object.entries(initial));return {get length(){return values.size},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(String(k))??null,setItem(k,v){values.set(String(k),String(v));send('storage',{key:String(k),value:String(v)})},removeItem(k){values.delete(String(k));send('storage',{key:String(k),value:null})},clear(){for(const k of [...values.keys()])this.removeItem(k)}};};
 Object.defineProperty(window,'localStorage',{value:storage(state)});Object.defineProperty(window,'sessionStorage',{value:storage({})});
 Object.defineProperty(document,'cookie',{get(){return Object.entries(state).filter(([k])=>k.startsWith('cookie:')).map(([k,v])=>k.slice(7)+'='+v).join('; ')},set(v){const pair=v.split(';')[0],i=pair.indexOf('=');if(i>=0){const k='cookie:'+pair.slice(0,i).trim(),value=pair.slice(i+1);state[k]=value;window.localStorage.setItem(k,value)}}});
 const localPath=v=>{try{const u=new URL(v,url);return u.origin==='https://adt.local'?decodeURIComponent(u.pathname.slice(1)):null}catch{return null}};
 const requests=new Map(),assetCache=new Map(),requested=new WeakMap();
 const resource=(node,value,apply)=>{if(/^data:/i.test(value)){apply(value);return}const path=localPath(value);if(!path){apply('data:,');return}requested.set(node,value);if(assetCache.has(path)){apply(assetCache.get(path));return}apply('data:,');const id=++counter;requests.set(id,v=>{assetCache.set(path,v);if(requested.get(node)===value)apply(v)});send('asset',{id,url:new URL(value,url).href});};
 // Resolve URLs made by the native reader too (fonts, sounds, glossary images).
 const set=Element.prototype.setAttribute;Element.prototype.setAttribute=function(k,v){if((k==='src'&&['IMG','AUDIO','VIDEO','SOURCE','INPUT'].includes(this.tagName))||(k==='href'&&this.tagName==='LINK')){resource(this,v,u=>set.call(this,k,u));return}return set.call(this,k,v)};
 for(const [klass,prop]of [[HTMLImageElement,'src'],[HTMLMediaElement,'src'],[HTMLSourceElement,'src'],[HTMLLinkElement,'href']]){const d=Object.getOwnPropertyDescriptor(klass.prototype,prop);if(d?.set)Object.defineProperty(klass.prototype,prop,{...d,set(v){resource(this,v,u=>d.set.call(this,u))}});}
 const NativeAudio=window.Audio;window.Audio=function(src){const node=new NativeAudio();if(src)node.src=src;return node};
 window.fetch=(input,options={})=>new Promise((resolve,reject)=>{if(options.signal?.aborted){reject(new DOMException('Aborted','AbortError'));return}const id=++counter;pending.set(id,{resolve,reject});send('fetch',{id,url:new URL(typeof input==='string'?input:input.url,url).href});});
 window.addEventListener('message',e=>{if(e.source!==parent||e.data?.readerToken!==token)return;const m=e.data;if(m.type==='asset-response'){requests.get(m.id)?.(m.value||'data:,');requests.delete(m.id);}if(m.type==='response'){const request=pending.get(m.id);if(request){pending.delete(m.id);request.resolve(new Response(m.body,{status:m.status,headers:{'Content-Type':m.contentType}}))}}});
 const navigate=v=>send('navigate',{url:new URL(v,url).href});
 const locationProxy=new Proxy({},{get(_,key){if(key==='assign'||key==='replace')return navigate;if(key==='reload')return ()=>navigate(url.href);if(key==='toString')return ()=>url.href;return url[key]},set(_,key,v){if(key==='href')navigate(v);else {const next=new URL(url);next[key]=v;navigate(next.href)}return true}});
 const history={state:null,scrollRestoration:'manual',replaceState(value,_,next){this.state=value;if(next)url=new URL(next,url)},pushState(value,_,next){this.state=value;if(next)url=new URL(next,url)}};
 const bound=new Set(['addEventListener','removeEventListener','dispatchEvent','getComputedStyle','matchMedia','requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','scrollTo','scrollBy']);
 const facade=new Proxy(window,{get(t,k){if(k==='location')return locationProxy;if(k==='history')return history;if(k==='window'||k==='self'||k==='parent'||k==='top')return facade;const value=Reflect.get(t,k,t);return bound.has(k)&&typeof value==='function'?value.bind(t):value},set(t,k,v){if(k==='location'){navigate(v);return true}return Reflect.set(t,k,v,t)}});
 window.__adtEmbed={window:facade,location:locationProxy,history};
 document.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;const target=a.getAttribute('href');if(target.startsWith('#'))return;e.preventDefault();if(localPath(target)?.endsWith('.html'))navigate(target);},true);
 let lastHeight=0,queued=false;
 const measure=()=>{queued=false;const body=document.body;if(!body)return;const height=Math.ceil(document.documentElement.getBoundingClientRect().height);if(height!==lastHeight){lastHeight=height;send('height',{height})}};
 const queue=()=>{if(!queued){queued=true;requestAnimationFrame(measure)}};
 document.addEventListener('adt:page-changed',()=>{send('page',{url:url.href});queue()});
 window.addEventListener('load',async()=>{new ResizeObserver(queue).observe(document.body);await document.fonts.ready;queue();send('ready')});
}
