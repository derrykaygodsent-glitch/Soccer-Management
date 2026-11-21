/* A desk edit replaces its contents, but is not a navigation. */
(function(g){'use strict';
function remember(desk,anchor){
 // Keep the section being edited in place even if a receipt is inserted above it.
 const section=desk.ownerDocument?.activeElement?.closest('section[class], article[class]');
 if(!anchor&&section&&desk.contains(section)&&section.classList.length){
  const selector=section.localName+'.'+CSS.escape(section.classList[0]);
  if(desk.querySelectorAll(selector).length===1)anchor=selector;
 }
 // Replacing the HTML closes native details.
 // Keep user-expanded sections by summary (not index; decisions can remove rows).
 const signature=d=>d.id||d.querySelector('summary')?.textContent.trim();
 const expanded=new Set(Array.from(desk.querySelectorAll?.('details[open]')||[],signature));
 const parents=[];for(let el=desk.parentElement;el;el=el.parentElement)if(el.scrollTop)parents.push([el,el.scrollTop]);
 const top=desk.scrollTop,old=anchor&&desk.querySelector(anchor)?.getBoundingClientRect(),view=old&&desk.getBoundingClientRect();
 const pinned=old&&old.bottom>view.top&&old.top<view.bottom;
 return ()=>{
  for(const d of desk.querySelectorAll?.('details')||[])if(expanded.has(signature(d)))d.open=true;
  for(const [el,y] of parents)el.scrollTop=y;
  desk.scrollTop=top;
  // Status messages and briefings above the pitch can also change height.
  const next=pinned&&desk.querySelector(anchor)?.getBoundingClientRect();
  if(next)desk.scrollTop+=next.top-old.top;
 };
}
g.TLDeskScroll={remember};if(typeof module!=='undefined')module.exports=g.TLDeskScroll;
})(typeof window==='undefined'?globalThis:window);
