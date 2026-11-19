/* Guarded, local-only clubhouse decisions. This is not match or market state. */
(function (global) {
  'use strict';
  const node = typeof window === 'undefined';
  const H = node ? require('./home-data.js') : global.TLHomeData;
  const C = node ? require('./club-data.js') : global.TLClubData;
  const K = node ? require('./season-calendar.js') : global.TLSeasonCalendar;
  const key = 'touchline26.2026.riverside.starter.v1';
  const handles = {
    read: C.inbox.map(x=>x.id), shortlist: C.prospects.map(x=>x.id), dismissed: C.prospects.map(x=>x.id),
    agent: C.prospects.map(x=>x.id), reminders: K.fixtureId, staffList:C.staffPool.map(x=>x.id),
    watch: [...C.youth, ...C.loans].map(x=>x.id), clauses:C.clauses.map(x=>x.id), board:C.boardOptions
  };
  const unique = list => [...new Set(list)];
  const allowed = (name,id) => typeof handles[name]==='function'?handles[name](id):handles[name].includes(id);
  const known = (name,list) => Array.isArray(list) ? unique(list.filter(id=>allowed(name,id))) : [];
  const number = value => typeof value === 'number' && Number.isSafeInteger(value);
  const limits = { min:Math.ceil((C.finance.committed - C.finance.wage)/5000)*5000, max:Math.floor(C.finance.transfer/52/5000)*5000 };
  const focusOK = f => f && typeof f.id==='string' && /^[a-z0-9-]{1,32}$/.test(f.id) && C.regions.some(r=>r[0]===f.region) &&
    ['All positions',...Object.keys(C.roles)].includes(f.pos) && ['High','Standard','Low'].includes(f.priority);
  const feeOK = fee => number(fee) && fee >= 1000 && fee <= C.finance.transfer;
  const dateText = date => new Date(date).toISOString().slice(0,10);
  const friendlyOK = f => f && typeof f.date === 'string' && typeof f.opponent === 'string' && f.id === `friendly-${f.date}-${f.opponent}` && /^(2026|2027)-\d\d-\d\d$/.test(f.date) &&
    !isNaN(Date.parse(f.date)) && dateText(Date.parse(f.date)) === f.date && f.date > dateText(H.next.date) && f.date <= '2027-05-31' &&
    Object.hasOwn(H.clubs,f.opponent) && f.opponent !== H.homeId && !K.announcedDate(f.date) && ['H','A'].includes(f.venue);
  function normalize(raw = {}) {
    const src = raw && typeof raw==='object' ? raw : {};
    const s = Object.fromEntries(Object.keys(handles).map(k=>[k,known(k,src[k])]));
    if (!Array.isArray(src.read)) s.read = C.inbox.filter(x=>!x.unread).map(x=>x.id);
    s.media = ['attended','delegated'].includes(src.media) ? src.media : '';
    s.meeting = C.meetingTopics.includes(src.meeting) ? src.meeting : '';
    s.focus = Array.isArray(src.focus) ? [...new Map(src.focus.filter(focusOK).slice(0,12).map(({id,region,pos,priority})=>[id,{id,region,pos,priority}])).values()] : C.starterFocus.map(f=>({...f}));
    s.offers = Object.fromEntries(C.prospects.filter(p=>feeOK(src.offers?.[p.id])).map(p=>[p.id,src.offers[p.id]]));
    s.delegation = Object.fromEntries(Object.entries(C.responsibility).map(([task,options])=>[task,options.includes(src.delegation?.[task]) ? src.delegation[task] : options[0]]));
    const used = new Set();
    s.sheet = Array.isArray(src.sheet) ? Array.from({length:17},(_,i)=>{
      const id=src.sheet[i];
      if(typeof id!=='string' || !Object.hasOwn(C.players,id) || used.has(id) || C.players[id].injury?.status==='Out') return null;
      used.add(id); return id;
    }) : C.quickPick();
    s.budgetShift = number(src.budgetShift) && src.budgetShift%5000===0 && src.budgetShift>=limits.min && src.budgetShift<=limits.max ? src.budgetShift : 0;
    s.friendlies = Array.isArray(src.friendlies) ? [...new Map(src.friendlies.filter(friendlyOK).slice(0,8).map(({id,date,opponent,venue})=>[date,{id,date,opponent,venue}])).values()] : [];
    return s;
  }
  const unread = s => C.inbox.filter(m=>!s.read.includes(m.id));
  const budgets = s => ({ ...C.finance, transfer:C.finance.transfer-s.budgetShift*52, wage:C.finance.wage+s.budgetShift });
  function reduce(s, type, value) {
    if (Object.hasOwn(handles,type)) {
      if (!allowed(type,value)) return s;
      if (['read','clauses','board'].includes(type)) return s[type].includes(value) ? s : {...s,[type]:[...s[type],value]};
      return {...s,[type]:s[type].includes(value) ? s[type].filter(id=>id!==value) : [...s[type],value]};
    }
    switch(type) {
      case 'read-all': return {...s, read:handles.read.slice()};
      case 'media': return !s.media && ['attended','delegated'].includes(value) ? {...s,media:value} : s;
      case 'meeting': return C.meetingTopics.includes(value) ? {...s,meeting:value} : s;
      case 'focus-put': {
        if (!focusOK(value) || (s.focus.length>=12 && !s.focus.some(f=>f.id===value.id))) return s;
        return {...s,focus:s.focus.some(f=>f.id===value.id) ? s.focus.map(f=>f.id===value.id?value:f) : [...s.focus,value]};
      }
      case 'focus-delete': return {...s,focus:s.focus.filter(f=>f.id!==value)};
      case 'offer': return C.prospects.some(p=>p.id===value?.id) && feeOK(value.fee) && value.fee<=budgets(s).transfer ? {...s,offers:{...s.offers,[value.id]:value.fee}} : s;
      case 'offer-delete': {
        if (!Object.hasOwn(s.offers,value)) return s;
        const offers = {...s.offers}; delete offers[value]; return {...s,offers};
      }
      case 'delegate': return Object.hasOwn(C.responsibility,value?.task) && C.responsibility[value.task].includes(value.owner) ? {...s,delegation:{...s.delegation,[value.task]:value.owner}} : s;
      case 'quick-pick': return {...s,sheet:C.quickPick(value)};
      case 'clear-sheet': return {...s,sheet:[]};
      case 'sheet-player': {
        const {id,slot} = value || {};
        if (typeof id!=='string' || !Object.hasOwn(C.players,id) || C.players[id].injury?.status==='Out') return s;
        const sheet = Array.from({length:17},(_,i)=>s.sheet[i]||null), old=sheet.indexOf(id);
        if(slot!==-1 && (!number(slot) || slot<0 || slot>=17)) return s;
        if(old>=0) sheet[old]=slot===-1?null:sheet[slot];
        if(slot>=0) sheet[slot]=id;
        return {...s,sheet};
      }
      case 'budget': return number(value) && value%5000===0 && value>=limits.min && value<=limits.max ? {...s,budgetShift:value} : s;
      case 'friendly': return friendlyOK(value) && s.friendlies.length<8 && !s.friendlies.some(f=>f.date===value.date) ? {...s,friendlies:[...s.friendlies,value]} : s;
      case 'friendly-delete': return {...s,friendlies:s.friendlies.filter(f=>f.id!==value)};
      default: return s;
    }
  }
  function open(storage) {
    let value;
    try { value = JSON.parse(storage?.getItem(key) || 'null'); } catch { /* storage is optional */ }
    let current = normalize(value);
    return {
      get value() { return current; },
      apply(type,value) {
        const result = reduce(current,type,value);
        if (result===current) return false;
        current = result;
        try { storage?.setItem(key,JSON.stringify(current)); } catch { /* opaque or quota-limited preview */ }
        return true;
      }
    };
  }
  const api = { open, normalize, reduce, budgets, limits, unread, key };
  global.TLClubState = api;
  if (node) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
