import {pdfObjects} from './pdf.mjs?v=0.9.0';
import {resolveSelectionTargets,selectionImageIndices} from './element-edits.mjs?v=0.9.0';
import {sourcePageFor,sectionForSourcePage} from './source-navigation.mjs?v=0.9.0';
const $=id=>document.getElementById(id);
export async function rasterCrop(image,width,height){
 const scale=Math.min(2,1600/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);let jpeg=canvas.toDataURL('image/jpeg',.86);if(jpeg.length>1800000)jpeg=canvas.toDataURL('image/jpeg',.65);if(jpeg.length>1800000)throw Error('That capture is too large. Select a smaller area.');return jpeg;
}
export class Comments {
 constructor(options){this.options=options;this.draft=null;this.pending=null;this.active=false;
  for(const id of ['comment-tool','chat-comment-tool'])$(id).onclick=()=>this.toggle().catch(e=>this.fail(e));$('comment-cancel').onclick=()=>this.cancel();
  $('comment-dismiss').onclick=()=>$('comment-dialog').close();$('comment-dialog').addEventListener('close',()=>{this.pending=null});
  $('comment-form').onsubmit=e=>{e.preventDefault();if(!this.pending)return;const href=$('comment-section').value,note=$('comment-note').value.trim();if(!href)return;if(!note){$('comment-note').setCustomValidity('Add a comment about what should change.');$('comment-note').reportValidity();return;}this.draft={...this.pending,href,note};$('comment-dialog').close();this.render();Promise.resolve(this.options.onDraft(this.draft)).catch(e=>this.fail(e));};
  $('comment-note').oninput=()=>$('comment-note').setCustomValidity('');
  $('comment-remove').onclick=()=>{this.draft=null;this.render();this.options.onChange()};$('comment-open').onclick=()=>Promise.resolve(this.options.onOpen(this.draft)).catch(e=>this.fail(e));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&this.active){e.preventDefault();this.cancel();$('comment-tool').focus();}});
  const overlay=$('pdf-comment-overlay');let down=null,hover=null,moving=false;
  const point=e=>{const r=overlay.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))}};
  const paint=rect=>Object.assign($('pdf-comment-box').style,{left:rect.x*100+'%',top:rect.y*100+'%',width:rect.w*100+'%',height:rect.h*100+'%',display:'block'});
  overlay.onpointermove=e=>{const p=point(e);if(down){moving ||= Math.hypot(p.x-down.x,p.y-down.y)>.008;if(moving)paint({x:Math.min(p.x,down.x),y:Math.min(p.y,down.y),w:Math.abs(p.x-down.x),h:Math.abs(p.y-down.y)});}else {hover=this.objects?.find(o=>p.x>=o.x&&p.x<=o.x+o.w&&p.y>=o.y&&p.y<=o.y+o.h);if(hover)paint(hover);else $('pdf-comment-box').style.display='none';}};
  overlay.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();down={...point(e),object:hover};moving=false;overlay.setPointerCapture(e.pointerId);};
  overlay.onpointerup=e=>{if(!down)return;const p=point(e),rect=moving?{x:Math.min(p.x,down.x),y:Math.min(p.y,down.y),w:Math.abs(p.x-down.x),h:Math.abs(p.y-down.y)}:down.object;down=null;if(rect)this.capturePDF(rect,moving?'area':'object').catch(e=>this.fail(e));};overlay.onpointercancel=()=>{down=null};
  let index=-1;this.resetPDFSelection=()=>{index=-1;down=null;hover=null;};overlay.onkeydown=e=>{if(['ArrowDown','ArrowUp','Enter'].includes(e.key)){e.preventDefault();if(e.key==='Enter'){if(hover)this.capturePDF(hover,'object').catch(e=>this.fail(e));return;}const objects=[...(this.objects||[])].sort((a,b)=>a.y-b.y||a.x-b.x);if(!objects.length)return;index=(index+(e.key==='ArrowDown'?1:-1)+objects.length)%objects.length;hover=objects[index];paint(hover);const r=overlay.getBoundingClientRect();window.scrollBy({top:r.top+hover.y*r.height-innerHeight/3,behavior:'smooth'});}};
 }
 cancel(){this.active=false;this.options.reader.annotationMode(false);$('comment-tool').setAttribute('aria-pressed','false');$('comment-cancel').hidden=true;$('comment-instructions').hidden=true;$('pdf-comment-overlay').hidden=true;$('pdf-comment-box').style.display='none';}
 async toggle(){if(this.active){this.cancel();return;}const {book,source,pdfPage,href}=this.options.state();if(!book)return;if(this.options.canStart&&!this.options.canStart())return;
  this.active=true;this.options.onStart();$('comment-tool').setAttribute('aria-pressed','true');$('comment-cancel').hidden=false;$('comment-instructions').hidden=false;this.options.reader.annotationMode(true);
  this.context={book,source,pdfPage,href,revision:book.revision};this.resetPDFSelection();this.objects=[];$('pdf-comment-overlay').setAttribute('aria-busy','true');
  if(source&&!$('pdf-preview').hidden&&!$('pdf-canvas-wrap').hidden&&$('pdf-canvas').dataset.ready==='true'){$('pdf-comment-overlay').hidden=false;const objects=await pdfObjects(source,pdfPage);if(this.active&&this.context.source===source&&this.context.pdfPage===pdfPage){this.objects=objects;$('pdf-comment-overlay').setAttribute('aria-busy','false');}}
 }
 fail(error){this.cancel();this.options.onError(error.message||String(error));}
 async readerMessage(message,href){
  if(message.type==='annotation-mode'){if(!message.active)this.cancel();return;}
  if(message.type==='annotation-focus'){if(!Number.isFinite(message.rect?.y)||message.rect.y<0||message.rect.y>100000)return;const r=$('book-preview').getBoundingClientRect();window.scrollBy({top:r.top+message.rect.y-innerHeight/3,behavior:'smooth'});return;}
  if(message.type==='annotation-error'){this.fail(Error(message.message));return;}
  if(message.type!=='annotation-capture')return;
  const state=this.options.state(),capture=message.capture,book=state.book,revision=book?.revision;
  if(!book||state.href!==href||!capture||typeof capture.svg!=='string'||capture.svg.length>35000000||!Number.isFinite(capture.width)||!Number.isFinite(capture.height)||capture.width<8||capture.height<8||capture.width>30000||capture.height>30000||book.spine.find(p=>p.href===href)?.section_id!==capture.sectionId)return;
  this.cancel();try{
   const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(capture.svg);await image.decode();const jpg=await rasterCrop(image,capture.width,capture.height);if(this.options.state().book!==book||book.revision!==revision)throw Error('The book changed during capture. Select the area again.');
   const targets=resolveSelectionTargets(book,href,capture.objects);
   this.open({id:crypto.randomUUID(),source:'book',href,revision,pdfPage:sourcePageFor(book,book.spine.find(p=>p.href===href),state.source?.inventory.length||0),sourceHash:state.source?.hash||null,image:jpg,rect:capture.rect,viewport:capture.viewport,kind:capture.kind,targets,imageIndices:selectionImageIndices(book,href,capture.images),capturedAt:new Date().toISOString()});
  }catch(error){this.fail(error);}
 }
 async capturePDF(rect,kind){
  const state=this.options.state(),context=this.context;if(!this.active||!context||state.source!==context.source||state.pdfPage!==context.pdfPage||state.book!==context.book)return;
  if(kind==='object'){const r=$('pdf-comment-overlay').getBoundingClientRect(),padX=4/r.width,padY=4/r.height,x=Math.max(0,rect.x-padX),y=Math.max(0,rect.y-padY);rect={x,y,w:Math.min(1-x,rect.w+2*padX),h:Math.min(1-y,rect.h+2*padY)};}
  const source=$('pdf-canvas'),x=Math.round(rect.x*source.width),y=Math.round(rect.y*source.height),w=Math.min(source.width-x,Math.round(rect.w*source.width)),h=Math.min(source.height-y,Math.round(rect.h*source.height));if(w<8||h<8)return;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(source,x,y,w,h,0,0,w,h);const image=await rasterCrop(canvas,w,h),index=sectionForSourcePage(state.book,state.pdfPage,state.book.spine.findIndex(p=>p.href===state.href),state.source.inventory.length);
  if(this.options.state().book!==context.book||context.book.revision!==context.revision||this.options.state().source!==context.source||this.options.state().pdfPage!==context.pdfPage)throw Error('The page changed during capture. Select the area again.');
  const sourceText=(this.objects||[]).filter(o=>o.kind==='text'&&o.x>=rect.x&&o.y>=rect.y&&o.x+o.w<=rect.x+rect.w&&o.y+o.h<=rect.y+rect.h).map(o=>o.label).join(' ').slice(0,2000);this.cancel();
  this.open({id:crypto.randomUUID(),source:'pdf',href:index>=0?state.book.spine[index].href:'',revision:state.book.revision,pdfPage:state.pdfPage,sourceHash:state.source.hash,image,rect,viewport:{width:source.width,height:source.height},kind,targets:[],imageIndices:[],sourceText,capturedAt:new Date().toISOString()});
 }
 open(capture){this.pending=capture;$('comment-image').src=capture.image;$('comment-origin').textContent=capture.source==='pdf'?'PDF source · physical page '+capture.pdfPage:'Book · '+capture.href.replace('.html','');$('comment-note').value='';$('comment-note').setCustomValidity('');
  const select=$('comment-section');select.replaceChildren();const first=document.createElement('option');first.value='';first.textContent='Choose the ADT section this comment should change';select.append(first);
  for(const [i,page]of this.options.state().book.spine.entries()){const option=document.createElement('option');option.value=page.href;option.textContent=(i+1)+' · '+this.options.state().book.pageInfo(page).title;select.append(option);}select.value=capture.href;select.disabled=capture.source==='book';$('comment-dialog').showModal();$('comment-note').focus();
 }
 render(){const draft=this.draft;$('chat-attachment').hidden=!draft;if(!draft)return;$('chat-attachment-image').src=draft.image;$('chat-attachment-label').textContent=(draft.source==='pdf'?'PDF page '+draft.pdfPage:'Book selection')+' · '+draft.href.replace('.html','');$('chat-attachment-note').textContent=draft.note;}
 restore(draft){this.cancel();this.draft=draft&&typeof draft.image==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(draft.image)&&draft.image.length<=1800000?draft:null;this.render();}
 assertCurrent(){const draft=this.draft;if(!draft)return;const {book,source}=this.options.state();if(draft.revision!==book.revision||!book.spine.some(p=>p.href===draft.href)||(draft.source==='pdf'&&draft.sourceHash!==source?.hash))throw Error('The book or source changed after this capture. Remove the attachment and select the area again.');}
}
