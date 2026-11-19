/* Club calendar conductor. This layer only schedules the existing, guarded day advance. */
(function(global){
  'use strict';
  const node=typeof window==='undefined';
  const K=node?require('./season-calendar.js'):global.TLSeasonCalendar;
  const S=node?require('./season-state.js'):global.TLSeasonState;
  function gate(s, target){
    if(s.session)return {reason:'session',fixture:s.session.id};
    const due=S.pending(s);
    if(due.length)return {reason:'decision',messages:due.map(m=>m.id)};
    const f=K.due(s);
    if(f)return {reason:'fixture',fixture:f.id};
    if(K.day(s.now)>=K.end)return {reason:'end'};
    if(Number.isFinite(target)&&K.day(s.now)>=target)return {reason:'target'};
    return null;
  }
  function create({store, delay=720, lead=260, schedule=setTimeout, cancel=clearTimeout, pauseAt=()=>null,
    onFrame=()=>{}, onStop=()=>{}}){
    let run=null, timer=null;
    const frame=()=>({...run,now:store.value.now});
    function stop(result={reason:'manual'}){
      if(!run)return false;
      const last=frame();
      run=null;
      if(timer!=null)cancel(timer);
      timer=null;
      onStop({...last,...result});
      return true;
    }
    function queue(current){
      if(run!==current)return;
      timer=schedule(()=>{
        if(run!==current)return; // a cancelled callback cannot affect a later run
        timer=null;
        const before=gate(store.value,current.target);
        if(before)return stop(before);
        if(!store.advance())return stop({reason:'unchanged'});
        current.days++;
        const after=gate(store.value,current.target);
        if(after)return stop(after);
        onFrame(frame());
        queue(current);
      },delay+(current.days===0?lead:0));
    }
    return {
      get running(){return run!==null;},
      start(){
        if(run||gate(store.value))return false;
        const target=pauseAt();
        const current=run={from:store.value.now, days:0,target:Number.isFinite(target)&&target>K.day(store.value.now)?target:null};
        onFrame(frame());
        queue(current);
        return true;
      },
      stop
    };
  }
  const api={create,gate};
  global.TLCalendarProgress=api;
  if(node)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
