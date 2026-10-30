// Physical source-page mappings take precedence over printed page/filename hints.
export function sourcePageHint(book,section){
 if(!section)return null;
 const candidate=book.mappings?.[section.href]?.page??book.design?.sections?.find(s=>s.href===section.href)?.sourcePage??section.page_number??Number(section.section_id?.match(/^pg(\d+)/)?.[1]);
 const page=Number(candidate);
 return Number.isInteger(page)&&page>0?page:null;
}
export function sourcePageFor(book,section,pageCount){const page=sourcePageHint(book,section);return page!==null&&page<=pageCount?page:null;}

export function sectionsForSourcePage(book,page,pageCount){
 return book.spine.flatMap((section,index)=>sourcePageFor(book,section,pageCount)===page?[index]:[]);
}

export function sectionForSourcePage(book,page,current,pageCount){
 const matches=sectionsForSourcePage(book,page,pageCount);
 // Selecting the same PDF page must not discard progress within its sections.
 return matches.includes(current)?current:(matches[0]??-1);
}
