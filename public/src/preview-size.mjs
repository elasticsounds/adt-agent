// Keep the document's layout viewport fixed; fit its rendered size to the
// available column while letting the outer page handle vertical scrolling.
export function fitReviewPreviews(){
 for(const viewport of document.querySelectorAll('.review-viewport')){
  let frame;
  const fit=()=>{if(!frame||frame.hidden||!viewport.clientWidth||!frame.offsetWidth)return;const scale=Math.min(1,viewport.clientWidth/frame.offsetWidth);frame.style.transform=`scale(${scale})`;const height=Math.ceil(frame.offsetHeight*scale)+'px';if(viewport.style.height!==height)viewport.style.height=height;};
  const sizes=new ResizeObserver(fit);sizes.observe(viewport);
  const attach=()=>{if(frame)sizes.unobserve(frame);frame=viewport.querySelector('iframe');if(frame)sizes.observe(frame);fit();};
  new MutationObserver(attach).observe(viewport,{childList:true});attach();
 }
}
