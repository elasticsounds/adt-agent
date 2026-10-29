// Project data and credentials use separate stores. Keys never enter project snapshots.
const DATABASE='folio-local-studio', VERSION=2;
const hashes=new WeakMap();
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
function done(tx){return new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Storage transaction cancelled'))})}
async function open(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DATABASE,VERSION);req.onupgradeneeded=()=>{for(const name of ['projects','blobs','settings','credentials'])if(!req.result.objectStoreNames.contains(name))req.result.createObjectStore(name)};req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result)};req.onerror=()=>reject(req.error);req.onblocked=()=>reject(Error('Close another older ADT Agent tab, then try saving again.'))})}
async function get(store,key){const db=await open();try{return await request(db.transaction(store).objectStore(store).get(key))}finally{db.close()}}
async function put(store,key,value){const db=await open();try{const tx=db.transaction(store,'readwrite'),finished=done(tx);tx.objectStore(store).put(value,key);await finished}finally{db.close()}}
async function remove(store,key){const db=await open();try{const tx=db.transaction(store,'readwrite'),finished=done(tx);tx.objectStore(store).delete(key);await finished}finally{db.close()}}
async function digest(bytes){if(hashes.has(bytes))return hashes.get(bytes);const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');hashes.set(bytes,hash);return hash}
export async function saveProject(snapshot,id,generation=0){
 const blobs=new Map();async function ref(bytes){const hash=await digest(bytes);blobs.set(hash,bytes);return hash}
 const record={...snapshot,id,format:2,generation:generation+1,updated:new Date().toISOString()};
 record.original=await Promise.all(snapshot.original.map(async([p,b])=>[p,await ref(b)]));
 record.files=await Promise.all(snapshot.files.map(async([p,b])=>[p,await ref(b)]));
 record.pdfBytes=snapshot.pdfBytes?await ref(snapshot.pdfBytes):null;
 record.history=await Promise.all((snapshot.history||[]).map(async h=>({...h,files:await Promise.all(h.files.map(async([p,b])=>[p,await ref(b)]))}))); 
 const db=await open();try{
  const tx=db.transaction(['projects','blobs','settings'],'readwrite'),finished=done(tx),projects=tx.objectStore('projects');
  const [existing,keys]=await Promise.all([request(projects.get(id)),request(tx.objectStore('blobs').getAllKeys())]),knownBlobs=new Set(keys);if(existing&&existing.generation!==generation){tx.abort();await finished.catch(()=>{});throw Error('This project changed in another tab. Open its latest saved version before editing here.');}
  for(const [hash,bytes] of blobs)if(!knownBlobs.has(hash))tx.objectStore('blobs').put(bytes,hash);
  projects.put(record,id);tx.objectStore('settings').put(id,'active-project');
  const references=r=>[...r.original,...r.files,...(r.history||[]).flatMap(h=>h.files)].map(x=>x[1]).concat(r.pdfBytes?[r.pdfBytes]:[]);
  const removed=existing?.format===2?[...new Set(references(existing))].filter(hash=>!blobs.has(hash)):[];
  if(removed.length){const records=await request(projects.getAll()),used=new Set(records.filter(r=>r.format===2).flatMap(references));for(const hash of removed)if(!used.has(hash))tx.objectStore('blobs').delete(hash);}
  await finished;for(const hash of blobs.keys())knownBlobs.add(hash);
  return {generation:record.generation,updated:record.updated};
 }finally{db.close()}
}
export async function loadProject(id){
 const record=await get('projects',id);if(!record)return null;if(record.format!==2)return {...record,id:'legacy-current',generation:0};
 const db=await open();try{const tx=db.transaction('blobs'),store=tx.objectStore('blobs'),all=new Map();
  for(const hash of new Set([...record.original,...record.files,...(record.history||[]).flatMap(h=>h.files)].map(p=>p[1]).concat(record.pdfBytes?[record.pdfBytes]:[])))all.set(hash,request(store.get(hash)));
  await Promise.all([...all].map(async([hash,value])=>{const bytes=await value;if(!bytes)throw Error('A saved project file is missing. Import a project backup to recover it.');hashes.set(bytes,hash);all.set(hash,bytes)}));
  return {...record,history:(record.history||[]).map(h=>({...h,files:h.files.map(([p,hash])=>[p,all.get(hash)])})),original:record.original.map(([p,h])=>[p,all.get(h)]),files:record.files.map(([p,h])=>[p,all.get(h)]),pdfBytes:record.pdfBytes?all.get(record.pdfBytes):null};
 }finally{db.close()}
}
export async function listProjects(){const db=await open();try{return (await request(db.transaction('projects').objectStore('projects').getAll())).map(p=>({id:p.id||'current',name:p.name,updated:p.updated||'',sections:p.sections||p.original?.length||0})).sort((a,b)=>b.updated.localeCompare(a.updated))}finally{db.close()}}
export const activeProject=()=>get('settings','active-project');
export async function deleteProject(id){
 const db=await open();try{const tx=db.transaction(['projects','blobs','settings'],'readwrite'),finished=done(tx);tx.objectStore('projects').delete(id);
 const [records,keys,active]=await Promise.all([request(tx.objectStore('projects').getAll()),request(tx.objectStore('blobs').getAllKeys()),request(tx.objectStore('settings').get('active-project'))]);
 const used=new Set(records.filter(r=>r.format===2).flatMap(r=>[...r.original,...r.files,...(r.history||[]).flatMap(h=>h.files)].map(x=>x[1]).concat(r.pdfBytes?[r.pdfBytes]:[])));
 for(const key of keys)if(!used.has(key))tx.objectStore('blobs').delete(key);if(active===id)tx.objectStore('settings').delete('active-project');await finished;
 }finally{db.close()}
}
export const activateProject=id=>put('settings','active-project',id);
export const clearActiveProject=()=>remove('settings','active-project');
export async function rememberKey(value){
 if(!value){await remove('credentials','openai');return;}
 const deviceKey=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},deviceKey,new TextEncoder().encode(value));
 await put('credentials','openai',{deviceKey,iv,ciphertext});
}
export async function recalledKey(){const saved=await get('credentials','openai');if(!saved)return '';try{return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:saved.iv},saved.deviceKey,saved.ciphertext))}catch{throw Error('The saved OpenAI connection could not be unlocked. Reconnect your key.')}}
export const forgetKey=()=>remove('credentials','openai');
export async function preferDurableStorage(){try{return await navigator.storage?.persist?.()||false}catch{return false}}
