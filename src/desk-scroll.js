/* A desk edit replaces its contents, but is not a navigation. */
(function(g){'use strict';
function remember(desk,anchor){
 const top=desk.scrollTop,old=anchor&&desk.querySelector(anchor)?.getBoundingClientRect(),view=old&&desk.getBoundingClientRect();
 const pinned=old&&old.bottom>view.top&&old.top<view.bottom;
 return ()=>{
  desk.scrollTop=top;
  // Status messages and briefings above the pitch can also change height.
  const next=pinned&&desk.querySelector(anchor)?.getBoundingClientRect();
  if(next)desk.scrollTop+=next.top-old.top;
 };
}
g.TLDeskScroll={remember};if(typeof module!=='undefined')module.exports=g.TLDeskScroll;
})(typeof window==='undefined'?globalThis:window);
