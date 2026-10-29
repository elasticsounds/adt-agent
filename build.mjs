import {cp,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
await mkdir('public/vendor',{recursive:true});
for(const [from,to] of [
 ['node_modules/fflate/esm/browser.js','public/vendor/fflate.mjs'],
 ['node_modules/pdfjs-dist/build/pdf.mjs','public/vendor/pdf.mjs'],
 ['node_modules/pdfjs-dist/build/pdf.worker.mjs','public/vendor/pdf.worker.mjs'],
 ['node_modules/pdfjs-dist/cmaps','public/vendor/cmaps'],
 ['node_modules/pdfjs-dist/standard_fonts','public/vendor/standard_fonts'],
 ['node_modules/pdfjs-dist/wasm','public/vendor/wasm'],
 ['node_modules/axe-core/axe.min.js','public/vendor/axe.min.js'],
 ['node_modules/fflate/LICENSE','public/vendor/LICENSE-fflate'],
 ['node_modules/pdfjs-dist/LICENSE','public/vendor/LICENSE-pdfjs'],
 ['node_modules/axe-core/LICENSE','public/vendor/LICENSE-axe']])await cp(from,to,{recursive:true});
execFileSync('node_modules/.bin/tailwindcss',['-i','library/components.css','-o','public/vendor/components.css','--minify'],{stdio:'inherit'});
await cp('library/components.css','public/vendor/components.source.css');
execFileSync('node_modules/.bin/tailwindcss',['-i','library/compositions.css','-o','public/design/components.css','--minify'],{stdio:'inherit'});
await cp('library/compositions.css','public/design/components.source.css');
console.log('Local vendor assets and fixed Tailwind components ready.');

// Keep a newly loaded page from mixing cached modules from an older release.
const {version}=JSON.parse(await readFile('package.json','utf8'));
for(const name of await readdir('public/src'))if(name.endsWith('.mjs')){
 const path='public/src/'+name,source=await readFile(path,'utf8');
 await writeFile(path,source.replace(/(['"])(\.\/[a-z-]+\.mjs)(?:\?v=[\w.-]+)?\1/g,(_,quote,file)=>quote+file+'?v='+version+quote));
}
const entry=await readFile('public/index.html','utf8');
await writeFile('public/index.html',entry.replace(/(href="app\.css|src="src\/app\.mjs)(?:\?v=[\w.-]+)?"/g,(_,prefix)=>prefix+'?v='+version+'"'));
