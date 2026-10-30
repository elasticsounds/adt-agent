// Chromium's protocol reports child-frame element boxes in unscaled CSS pixels.
// Convert through the visible iframe rectangle for real pointer interactions.
export async function readerBox(page,locator){
 const rect=await locator.evaluate(n=>n.getBoundingClientRect().toJSON());
 const frame=await page.locator('#book-preview').evaluate(n=>({rect:n.getBoundingClientRect().toJSON(),width:n.offsetWidth}));
 const scale=frame.rect.width/frame.width;
 return {x:frame.rect.x+rect.x*scale,y:frame.rect.y+rect.y*scale,width:rect.width*scale,height:rect.height*scale};
}
export async function clickReader(page,locator){
 let box=await readerBox(page,locator);
 await page.evaluate(y=>scrollBy(0,y-innerHeight/2),box.y+box.height/2);
 await page.waitForTimeout(100);box=await readerBox(page,locator);
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
}
export async function dragReader(page,locator,start,end){
 let box=await readerBox(page,locator);
 await page.evaluate(y=>scrollBy(0,y-innerHeight/2),box.y+box.height*(start[1]+end[1])/2);
 await page.waitForTimeout(100);box=await readerBox(page,locator);
 await page.mouse.move(box.x+box.width*start[0],box.y+box.height*start[1]);await page.mouse.down();
 await page.mouse.move(box.x+box.width*end[0],box.y+box.height*end[1],{steps:12});await page.mouse.up();
}
