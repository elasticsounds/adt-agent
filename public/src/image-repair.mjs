import {serialize,resolvePath,relative,sha} from './core.mjs?v=0.10.0';

// A crop belongs to one image occurrence. Never replace a shared source file.
export async function replaceImageFromCrop(book,selection,bytes,evidence){
 const doc=book.doc(selection.href),image=doc.querySelectorAll('#content img')[selection.index];
 if(!image||!selection.path||resolvePath(selection.href,image.getAttribute('src'))!==selection.path)throw Error('The selected artwork changed. Select it again before replacing it.');
 const previous=book.files.get(selection.path),path='folio/image-repairs/'+crypto.randomUUID()+'-folio-crop.png';
 const repair={href:selection.href,imageIndex:selection.index,path,previousPath:selection.path,...evidence,beforeSHA256:previous?await sha(previous):null,afterSHA256:await sha(bytes),reason:'Editor selected the verified source artwork'};
 image.setAttribute('src',relative(selection.href,path));
 book.snapshot('Re-extracted selected artwork in '+selection.href+' from PDF page '+evidence.page);
 book.write(path,bytes);book.write(selection.href,serialize(doc));book.assetRepairs.push(repair);return repair;
}
