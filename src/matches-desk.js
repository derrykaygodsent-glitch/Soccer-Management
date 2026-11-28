/* Matches is the manager's match week: one fixture in focus, the six jobs that prepare it, and the season behind it. */
(function(g){
  'use strict';
  const W=g.TLManagerLife||require('./manager-life'), F=g.TLFASeason||require('./fa-season'), Y=g.TLTurnover||require('./season-turnover');
  const C=g.TLCups||require('./cup-circuit'), Q=g.TLLeagueMatchday||require('./league-matchday'), K=g.TLSeasonCalendar||require('./season-calendar');
  const D=g.TLData||require('./data'), B=g.TLMatchBoard||require('./match-board'), Dyn=g.TLDynamics||require('./team-dynamics');
  const Kit=g.TLKit||require('./squad-registration'), FA=g.TLFAOffice||require('./fa-office');
  const SECTIONS=[['next','Next match'],['season','Season']];
  const esc=v=>g.TLClubUI.esc(v);
  const stamp=day=>new Date(W.date(day)+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'});
  const long=day=>new Date(W.date(day)+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  const short=day=>new Date(W.date(day)+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
  const ago=(s,day)=>day===s.day?'Today':day===s.day+1?'Tomorrow':day===s.day-1?'Yesterday':day>s.day?`In ${day-s.day} days`:`${s.day-day} days ago`;
  const memo=new Map();

  function nation(s){
    const club=s.club?.name;
    if(!club)return null;
    if(s.club.owner)return s.profile.nation;
    return Object.keys(W.nations||{}).find(k=>(W.nations[k]||[]).includes(club))||null;
  }

  /* Every fixture the club has a result for, and every one still to play, from league, cups and friendlies. */
  function ledger(s){
    const club=s.club?.name, out={played:[],ahead:[]};
    if(!club)return out;
    const key=[s.id,s.day,Object.keys(s.leagueScores||{}).length,JSON.stringify(s.cupScores||{}).length,(s.friendlyHistory||[]).length].join('|');
    if(memo.has(key))return memo.get(key);
    const seen=new Set();
    const add=row=>{
      if(!row.team||!row.host||![row.team,row.host].includes(club))return;
      const stamp=[row.kind,row.key||'',row.day,row.team,row.host].join('|');
      if(seen.has(stamp))return;
      seen.add(stamp);
      row.own=row.team===club?0:1;
      if(row.score)out.played.push(row); else out.ahead.push(row);
    };
    const n=nation(s);
    if(n){
      const year=Y.season(s.day);
      for(const y of [year-1,year,year+1]){
        let rows=[];
        try{rows=F.fixtures(s,n,y)||[];}catch{rows=[];}
        for(const f of rows)add({kind:'league',comp:F.leagueName(s,n,y)||'District league',day:f.day,key:f.key,team:f.team,host:f.host,kickoff:f.kickoff||'',score:s.leagueScores?.[f.key]?.score||null,pens:s.leagueScores?.[f.key]?.pens||null});
      }
    }
    let cups=[];
    try{cups=C.circuit(s,W.pool)||[];}catch{cups=[];}
    for(const cup of cups){
      if(cup.national)continue;
      for(const round of cup.rounds||[])for(const f of round||[])add({kind:'cup',comp:cup.title,day:f.day,key:f.key,team:f.team,host:f.host,kickoff:f.kickoff||'',score:f.result?.score||null,pens:f.result?.pens||null});
    }
    for(const f of s.friendlyHistory||[])add({kind:'friendly',comp:'Friendly',day:f.day,team:f.team,host:f.host,score:f.result||null,pens:null});
    if(s.friendly&&!s.friendly.result)add({kind:'friendly',comp:'Friendly',day:s.friendly.day,team:s.friendly.team,host:s.friendly.host,score:null,pens:null});
    out.played.sort((a,b)=>b.day-a.day);
    out.ahead=out.ahead.filter(r=>r.day>=s.day).sort((a,b)=>a.day-b.day);
    memo.set(key,out);
    if(memo.size>12)memo.delete(memo.keys().next().value);
    return out;
  }

  const goalsFor=f=>f.score?f.score[f.own]:null;
  const goalsAgainst=f=>f.score?f.score[1-f.own]:null;
  const result=f=>f.score?`${goalsFor(f)}–${goalsAgainst(f)}`:'';
  const verdict=f=>!f.score?'':goalsFor(f)>goalsAgainst(f)?'W':goalsFor(f)===goalsAgainst(f)?'D':'L';

  function form(s,L){
    return L.played.filter(f=>f.kind==='league').slice(0,5).map(verdict);
  }

  function jobs(s,L){
    let board={};
    try{board=(s.boards?.[s.boardIndex||0])||{};}catch{board={};}
    const named=(board.ids||[]).filter(Boolean);
    const roster=W.pool.filter(p=>s.roster.includes(p.id));
    let inside={};
    try{inside=Dyn.snapshot(s,roster).players||{};}catch{inside={};}
    const out=roster.filter(p=>inside[p.id]&&inside[p.id].injuredUntil>s.day);
    const fit=roster.filter(p=>!out.includes(p));
    const heavy=fit.filter(p=>inside[p.id]&&inside[p.id].fitness<80);
    const next=L.ahead[0];
    let numbers={};
    try{numbers=Kit.matchNumbers(s,W.pool,Y.season(s.day),'League',next?.day??s.day)||{};}catch{numbers={};}
    const missing=named.filter(id=>!numbers[id]);
    let banned=[];
    try{banned=next&&next.kind==='league'?FA.suspendedPlayers(s,s.club?.name,next.key)||[]:[];}catch{banned=[];}
    const lastPractice=(s.practices||[]).slice(-1)[0];
    const practiceDays=s.practices?.length||0;
    const rows=[
      {id:'selection',label:'Team selection',state:named.length?`${named.length} of 11 named`:'No starting XI named yet',needs:named.length!==11,go:'tactics'},
      {id:'shape',label:'Shape and orders',state:`${board.defenseFormation||s.tactic||'No shape'}${board.system?` · ${board.system}`:''}`,needs:false,go:'tactics'},
      {id:'condition',label:'Condition',state:`${fit.length} available${heavy.length?` · ${heavy.length} under 80%`:''}${out.length?` · ${out.length} out`:''}`,needs:fit.length<11,go:'medical'},
      {id:'numbers',label:'Squad numbers',state:named.length?(missing.length?`${missing.length} named player${missing.length===1?' has':'s have'} no number`:'Every named player is numbered'):'Name a starting XI first',needs:!!named.length&&!!missing.length,go:'kitOffice'},
      {id:'discipline',label:'Discipline',state:banned.length?`${banned.length} suspension${banned.length===1?'':'s'} for this fixture`:'No suspension for this fixture',needs:!!banned.length,go:'faOffice'},
      {id:'training',label:'Training',state:lastPractice?`Last session ${stamp(lastPractice.day??s.day)} · ${practiceDays} this season`:'No session recorded yet',needs:false,go:'training'}
    ];
    const open=rows.filter(r=>r.needs).length;
    return {rows,open,ready:rows.length-open,banned,missing,out};
  }

  function hero(s,L){
    const f=L.ahead[0];
    if(!f){
      const friendly=(()=>{try{return g.TLFieldwork?.friendlyView?.(s)||'';}catch{return '';}})();
      return `<article class="match-hero match-hero-empty"><span class="match-eyebrow">NEXT MATCH</span><h2>No fixture scheduled</h2><p>${s.club?`The league has not put ${esc(s.club.name)} on a date yet. Competitions lists every round as soon as it is drawn.`:'You have no club, so there is no fixture to prepare.'}</p><div class="org-actions"><button type="button" data-life="go" data-v="${s.club?'league':'jobs'}">${s.club?'Open competitions':'Find a club'}</button></div></article>${friendly}`;
    }
    const today=f.day===s.day, home=f.own===0;
    let primary='';
    if(today&&f.kind==='league')primary=`<button type="button" class="cc-btn cc-btn-primary" data-life="leagueMatch">${s.leagueSession?.ticks?'Resume the match':'Enter matchday'}</button>`;
    else if(today&&f.kind==='cup')primary=`<button type="button" class="cc-btn cc-btn-primary" data-cup-match="${esc(f.key)}">Enter cup match</button>`;
    else if(today&&f.kind==='friendly')primary=`<button type="button" class="cc-btn cc-btn-primary" data-life="friendlyMatch">Enter friendly match</button>`;
    else primary=`<button type="button" class="cc-btn cc-btn-primary" data-life="go" data-v="tactics">Open tactics</button>`;
    const meetings=L.played.filter(p=>[p.team,p.host].includes(f.team)&&[p.team,p.host].includes(f.host));
    const last=meetings[0];
    const books=meetings.length?`${meetings.filter(m=>verdict(m)==='W').length}W ${meetings.filter(m=>verdict(m)==='D').length}D ${meetings.filter(m=>verdict(m)==='L').length}L`:'';
    const facts=`<dl class="match-facts"><div><dt>Last meeting</dt><dd>${last?`${stamp(last.day)} · ${last.own===0?'Home':'Away'} · ${result(last)}`:'First meeting in the book'}</dd></div><div><dt>Against them</dt><dd>${books||'Nothing played against them yet'}</dd></div></dl>`;
    return `<article class="match-hero${today?' match-hero-today':''}"><span class="match-eyebrow">NEXT MATCH　 /　 ${esc(f.comp)}</span>
      <h2><span>${esc(f.team)}</span> <em>v</em> <span>${esc(f.host)}</span></h2>
      <p class="match-when">${long(f.day)}${f.kickoff?` · ${esc(f.kickoff)}`:''} · ${home?'Home':'Away'}</p>
      <p class="match-count">${today?'<b>Today</b> · the fixture is due before the day ends':ago(s,f.day)}</p>
      <div class="org-actions">${primary}<button type="button" data-life="go" data-v="league">Competitions</button></div>
      ${formStrip(s,L)}
      ${facts}
    </article>`;
  }

  function prep(s,L){
    const j=jobs(s,L);
    return `<aside class="match-prep" aria-label="Preparations"><header><h3>Preparations</h3><p>${j.ready} ready · ${j.open} to look at</p></header><ul>${j.rows.map(r=>`<li><button type="button" class="match-job${r.needs?' match-job-open':''}" data-life="go" data-v="${r.go}"><b>${esc(r.label)}</b><span>${esc(r.state)}</span>${r.needs?'<small>Needs you</small>':''}</button></li>`).join('')}</ul></aside>`;
  }

  function formStrip(s,L){
    const chips=form(s,L);
    if(!chips.length)return '';
    return `<div class="match-inline-form"><small>Last five league matches</small><div class="match-chips">${chips.map(v=>`<span class="match-chip match-chip-${v.toLowerCase()}">${v}</span>`).join('')}</div><span>${chips.filter(v=>v==='W').length}W ${chips.filter(v=>v==='D').length}D ${chips.filter(v=>v==='L').length}L</span></div>`;
  }

  function nextView(s,L){
    if(s.legacy?.exit)return `<article class="match-hero match-hero-empty"><span class="match-eyebrow">MATCHES</span><h2>Your management duties have ended</h2><p>No fixture will be prepared from this desk again. The career record stays open.</p><div class="org-actions"><button type="button" data-life="go" data-v="legacy">Open health and legacy</button></div></article>`;
    return `<div class="match-next">${hero(s,L)}${prep(s,L)}</div>`;
  }

  function record(s,L){
    const rows=L.played.filter(f=>f.kind==='league');
    const w=rows.filter(f=>verdict(f)==='W').length, d=rows.filter(f=>verdict(f)==='D').length, l=rows.filter(f=>verdict(f)==='L').length;
    const gf=rows.reduce((n,f)=>n+goalsFor(f),0), ga=rows.reduce((n,f)=>n+goalsAgainst(f),0);
    return `<section class="match-record"><div><small>Played</small><b>${rows.length}</b></div><div><small>Won</small><b>${w}</b></div><div><small>Drawn</small><b>${d}</b></div><div><small>Lost</small><b>${l}</b></div><div><small>Goals</small><b>${gf}–${ga}</b></div></section>`;
  }

  function row(s,f){
    const home=f.own===0, res=result(f);
    return `<li class="match-row"><time datetime="${W.date(f.day)}">${stamp(f.day)}</time><span class="match-comp">${esc(f.comp)}</span><b>${esc(f.team)} v ${esc(f.host)}</b><span class="match-side">${home?'Home':'Away'}</span>${res?`<span class="match-score match-score-${verdict(f).toLowerCase()}">${res}${f.pens?` <small>pens ${f.pens.join('–')}</small>`:''}</span>`:`<span class="match-score">${ago(s,f.day)}</span>`}</li>`;
  }

  function seasonView(s,L){
    const ahead=L.ahead.slice(0,5), played=L.played;
    return `${record(s,L)}
      ${ahead.length?`<section class="match-upcoming"><h3>Coming up</h3><ul>${ahead.map(f=>row(s,f)).join('')}</ul></section>`:''}
      <section class="match-results"><header><h3>Played</h3><p>${played.length?`${played.length} match${played.length===1?'':'es'} in the book`:'Nothing has been played yet'}</p></header>
        ${played.length?`<ul class="match-list" data-wire-stream="season" data-wire-key="matches:season" data-wire-size="14" data-wire-size-phone="8" data-wire-noun="matches">${played.map(f=>row(s,f)).join('')}</ul>`:'<p class="match-none">Results appear here as soon as a match is settled.</p>'}
      </section>`;
  }

  function render(s,view){
    const here=SECTIONS.some(([id])=>id===view)?view:'next';
    const L=ledger(s);
    const nav=`<nav class="match-nav" aria-label="Matches sections">${SECTIONS.map(([id,label])=>`<button type="button" data-match-tab="${id}" aria-pressed="${here===id}">${label}</button>`).join('')}</nav>`;
    return `<section class="matches-desk">${nav}<div class="match-body">${here==='season'?seasonView(s,L):nextView(s,L)}</div></section>`;
  }

  const api={render,SECTIONS,ledger,jobs};
  g.TLMatchesDesk=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window==='undefined'?globalThis:window);
