import {cp,mkdir,readFile,writeFile} from 'node:fs/promises';
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
console.log('Local vendor assets and fixed Tailwind components ready.');
