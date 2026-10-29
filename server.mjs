import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const PORT=Number(process.env.PORT||8890),HOST='127.0.0.1';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.wasm':'application/wasm','.bcmap':'application/octet-stream','.ttf':'font/ttf','.woff2':'font/woff2'};
function json(res,status,obj){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
const server=http.createServer(async(req,res)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');res.setHeader('X-Frame-Options','SAMEORIGIN');
 if(![`127.0.0.1:${PORT}`,`localhost:${PORT}`].includes(req.headers.host)){json(res,403,{error:'Local host required'});return}
 const url=new URL(req.url,`http://${req.headers.host}`);
 try{
 if(url.pathname.startsWith('/api/')){json(res,404,{error:'Unknown API route'});return}if(req.method!=='GET'&&req.method!=='HEAD'){json(res,405,{error:'Read-only static server'});return}
 let decoded;try{decoded=decodeURIComponent(url.pathname)}catch{json(res,400,{error:'Invalid path'});return}if(decoded.includes('\0')||decoded.includes('\\')){json(res,400,{error:'Invalid path'});return}const target=path.resolve(ROOT,'.'+(decoded==='/'?'/index.html':decoded));if(!target.startsWith(ROOT+path.sep)){json(res,403,{error:'Invalid path'});return}const s=await stat(target);if(!s.isFile()){json(res,404,{error:'Not found'});return}res.setHeader('Content-Type',mime[path.extname(target)]||'application/octet-stream');if(target.endsWith('index.html'))res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' data:; img-src 'self' data: blob:; font-src 'self' blob: data:; worker-src 'self' blob:; frame-src 'self' blob:; connect-src 'self' https://api.openai.com; object-src 'none'; base-uri 'self'; form-action 'none'");res.end(req.method==='HEAD'?undefined:await readFile(target));
 }catch(e){if(!res.headersSent)json(res,e.code==='ENOENT'?404:500,{error:e.code==='ENOENT'?'Not found':'The request could not be completed.'});else res.end()}});
server.listen(PORT,HOST,()=>console.log(`ADT Agent: http://${HOST}:${PORT}\nFiles are processed in the browser. Bring your own OpenAI key in the website.`));
