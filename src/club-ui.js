/* Shared, offline rendering primitives for the clubhouse pages. */
(function (global) {
  'use strict';
  const H = global.TLHomeData, C = global.TLClubData;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const icon = name => `<svg class="hc-icon" aria-hidden="true"><use href="#${name.startsWith('i-')?name:'hc-i-'+name}"/></svg>`;
  const media = /* @CLUB_MEDIA@ */ {};
  const art = (name, alt = '') => `<img class="cc-art" src="${media[name]}" alt="${esc(alt)}" width="640" height="360">`;
  const attr = (name, value) => value == null || value === '' ? '' : ` ${name}="${esc(value)}"`;
  const btn = (caption, cmd, val, options = {}) => `<button type="button" class="cc-btn${options.kind?' cc-btn-'+options.kind:''}" data-c-do="${esc(cmd)}"${attr('data-c-val',val)}${attr('aria-label',options.label)}${options.pressed==null?'':` aria-pressed="${!!options.pressed}"`}${options.disabled?' disabled':''}>${options.icon?icon(options.icon):''}${esc(caption)}${options.arrow?icon('chevron'):''}</button>`;
  const link = (page, label, tab, key, kind = 'outline', arrow = true) => `<button type="button" class="cc-btn${kind?' cc-btn-'+kind:''}" data-c-go="${esc(page)}"${attr('data-c-tab',tab)}${attr('data-c-id',key)}>${esc(label)}${arrow?icon('chevron'):''}</button>`;
  const card = (title, content, className = '') => `<section class="cc-card ${className}">${title?`<h2 class="cc-title">${esc(title)}</h2>`:''}${content}</section>`;
  const empty = (title, detail = '') => `<div class="cc-empty"><strong>${esc(title)}</strong>${detail?`<p>${esc(detail)}</p>`:''}</div>`;
  const values = entries => `<dl class="cc-values">${entries.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  const tag = (text, tone = '') => `<span class="cc-tag${tone?' cc-'+tone:''}">${esc(text)}</span>`;
  const result = score => !score?'':score[0]>score[1]?'W':score[0]===score[1]?'D':'L';
  const resultColor = score => ({W:'good',D:'warn',L:'bad'}[result(score)] || 'quiet');
  const form = results => `<span class="cc-form" aria-label="Recent form: ${results.map(f=>result(f.score)).join(', ')}">${results.map(f=>`<i class="cc-${resultColor(f.score)}" title="${result(f.score)}"></i>`).join('')}</span>`;
  const initials = name => String(name || '').split(' ').filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  const options = entries => entries.map(option=>Array.isArray(option)?option:[option,option]);
  const optionTags = (entries,selected) => options(entries).map(([id,label])=>`<option value="${esc(id)}"${String(selected)===String(id)?' selected':''}>${esc(label)}</option>`).join('');
  const select = (field, label, entries, selected, option = {}) => `<label class="cc-control${option.show?' cc-labeled':''}"><span${option.show?'':' class="hc-sr"'}>${esc(label)}</span><select class="cc-select" data-c-field="${esc(field)}"${attr('name',option.name)}>${optionTags(entries,selected)}</select></label>`;
  const search = (field, value, placeholder) => `<label class="cc-control cc-searchbox"><span class="hc-sr">${esc(placeholder)}</span>${icon('search')}<input type="search" data-c-search="${esc(field)}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off"></label>`;
  const check = (field,label,value) => `<label class="cc-check"><input type="checkbox" data-c-field="${esc(field)}"${value?' checked':''}>${esc(label)}</label>`;
  const formSelect = (name,label,entries,selected) => `<label class="cc-form-field"><span>${esc(label)}</span><select name="${esc(name)}" required class="cc-select">${optionTags(entries,selected)}</select></label>`;
  const formField = (name,label,type,value,attrs='') => `<label class="cc-form-field"><span>${esc(label)}</span><input name="${esc(name)}" type="${esc(type)}" value="${esc(value)}" ${attrs} required></label>`;
  const editForm = (command, id, fields, submit, description = '') => `<form class="cc-edit" data-c-form="${esc(command)}"${attr('data-c-val',id)}>${description?`<p class="cc-muted">${esc(description)}</p>`:''}${fields}<p class="cc-form-error" role="alert" hidden></p><div class="cc-actions"><button class="cc-btn cc-btn-primary" type="button" data-c-submit>${esc(submit)}</button></div></form>`;
  const stars = number => `<span class="cc-stars" role="img" aria-label="${number} out of 5 stars"><span aria-hidden="true">★★★★★</span><span aria-hidden="true" style="width:${20*number}%">★★★★★</span></span>`;
  const grade = letter => `<b class="cc-grade ${letter.startsWith('A')?'cc-good':'cc-lime'}" aria-label="Recommendation ${esc(letter)}">${esc(letter)}</b>`;
  const avatar = (c, name, id, extra = '') => `<span class="cc-avatar ${extra}" aria-hidden="true">${c.portrait(id)?`<img src="${c.portrait(id)}" alt="" width="45" height="52">`:esc(initials(name))}</span>`;
  const rank = rating => `<span class="cc-rating ${rating>=7.15?'cc-good':rating>=6.8?'cc-info':'cc-warn'}">${Number(rating).toFixed(2)}</span>`;
  const num = n => new Intl.NumberFormat('en-GB').format(n);
  const compact = n => n >= 1e6 ? H.millions(n) : n >= 1e3 ? `£${+(n/1000).toFixed(1)}K` : H.money(n);
  const stamp = date => H.calendar(date).day.slice(4);
  const month = date => new Intl.DateTimeFormat('en-GB',{month:'long',year:'numeric',timeZone:'UTC'}).format(date);
  const week = date => H.calendar(date).day.slice(0,3);
  const nation = code => `<span class="cc-nation" title="${esc(C.nation[code]||code)}"><i aria-hidden="true" data-flag="${esc(code)}"></i>${esc(code)}</span>`;
  const scroll = (id,label,content,extra='') => `<div class="cc-scroll ${extra}" tabindex="0" role="region" aria-label="${esc(label)}" data-c-scroll="${esc(id)}">${content}</div>`;
  const table = (label, columns, rows, key, extra='') => scroll(key,label,`<table class="cc-table ${extra}"><caption class="hc-sr">${esc(label)}</caption><thead><tr>${columns.map(col=>typeof col==='string'?`<th scope="col">${esc(col)}</th>`:`<th scope="col"${attr('aria-sort',col.sort)}>${col.html}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`, 'cc-table-wrap');
  const tr = (cells, cls = '') => `<tr${attr('class',cls)}>${cells.map(cell=>`<td>${cell??''}</td>`).join('')}</tr>`;
  const meter = (pct, label = 'Progress', tone = '') => `<span class="cc-meter ${tone?'cc-'+tone:''}" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></span>`;
  const spark = (points, label = 'Player development trend', tone = '#87cc90') => `<svg class="cc-spark" viewBox="0 0 68 24" role="img" aria-label="${esc(label)}"><polyline points="${points.map((v,i)=>`${2+i*64/(points.length-1)},${22-v*2.15}`).join(' ')}" fill="none" stroke="${tone}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const clubName = (c, id, label) => `<span class="cc-club-name">${c.crest(id)}<span>${esc(label || (typeof id==='string'?H.clubs[id]?.name:id.name))}</span></span>`;
  function standings(c, label, rows, key, full = false) {
    const columns = full ? ['Pos','Team','P','W','D','L','GD','Pts'] : ['Pos','Team','P','GD','Pts'];
    return table(label,columns,rows.map((r,i)=>tr([H.ordinal(i+1),clubName(c,H.clubs[r.id]?r.id:r),r.played,...(full?[r.w,r.d,r.l]:[]),r.gd,`<b>${r.pts}</b>`],r.id===H.homeId?'cc-club-row':i<7?'cc-place-row':'')),key, 'cc-standings');
  }
  function score(c,f,large = false) {
    const left=f.venue==='A'?f.opponent:H.homeId, right=f.venue==='A'?H.homeId:f.opponent;
    const numbers=f.score?(f.venue==='A'?[f.score[1],f.score[0]]:f.score):null;
    return `<div class="cc-score${large?' cc-score-art':''}">${large?art('floodlights'):''}<div class="cc-score-line"><div>${c.crest(left)}<span>${esc(H.clubs[left].name)}</span></div><strong>${numbers?numbers.join(' – '):'v'}</strong><div>${c.crest(right)}<span>${esc(H.clubs[right].name)}</span></div></div></div>`;
  }
  const resource = (small,big,description,symbol = 'money') => `<div class="cc-resource"><span class="cc-resource-icon">${icon(symbol)}</span><div><strong>${esc(small)}</strong><div>${big}</div>${description?`<small>${esc(description)}</small>`:''}</div></div>`;
  const breakdown = entries => `<dl class="cc-breakdown">${entries.map(([name,amount])=>`<div><dt>${esc(name)}</dt><dd>${H.money(amount)}</dd></div>`).join('')}</dl>`;
  function chart(values, { label, max, min=0, color, ticks }) {
    const width=630, high=83, plot=v=>+(1+(max-v)/(max-min)*high).toFixed(2);
    const x=i=>+(2+i*(width-4)/(values.length-1)).toFixed(2), base=plot(0);
    const coords=values.map((v,i)=>`${x(i)} ${plot(v)}`), xMarks=Array.from({length:26},(_,i)=>`M${2+i*(width-4)/25} ${base}v4`).join('');
    return `<div class="cc-chart" role="img" aria-label="${esc(label)}, from September 2024 to October 2026"><div class="cc-chart-scale" aria-hidden="true">${ticks.map(t=>`<span style="top:${plot(t)/.87}%">${esc(t<0?`(£${-t}M)`:t?`£${t}M`:'£0')}</span>`).join('')}</div><div class="cc-chart-plot"><svg viewBox="0 0 ${width} 87" preserveAspectRatio="none" aria-hidden="true"><path d="M2 ${base} L${coords.join(' L')} L${width-2} ${base}Z" fill="${color}"/><path d="M2 1v83M2 ${base}h${width-4}${xMarks}" stroke="#9298a9" stroke-width=".8" vector-effect="non-scaling-stroke" fill="none"/></svg><div class="cc-chart-dates"><span>Sep 2024</span><span>Oct 2025</span><span>Oct 2026</span></div></div></div>`;
  }
  const lookup = (rows,id) => rows.find(x=>x.id===id);
  const textMatch = (q,...values) => !q||values.some(v=>String(v||'').toLocaleLowerCase('en-GB').includes(q.trim().toLocaleLowerCase('en-GB')));
  const tabs = (...entries) => options(entries);
  global.TLClubUI = { views:{}, H,C,art,esc,icon,btn,link,card,empty,values,tag,result,resultColor,form,initials,select,search,check,
    formSelect,formField,editForm,stars,grade,avatar,rank,num,compact,stamp,month,week,nation,scroll,table,tr,meter,spark,clubName,standings,score,resource,breakdown,chart,lookup,textMatch,optionTags,tabs };
})(window);
