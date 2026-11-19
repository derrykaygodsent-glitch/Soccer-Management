/* Expanded 2026/27 Riverside starter season. IDs shared by every club view. */
(function (global) {
  'use strict';
  const node = typeof window === 'undefined';
  const H = node ? require('./home-data.js') : global.TLHomeData;
  const D = node ? require('./data.js') : global.TLData;
  const at = (m, d, h = 15, min = 0) => Date.UTC(2026, m - 1, d, h, min);
  const by = rows => Object.fromEntries(rows.map(row => [row.id, row]));
  const nation = { ENG: 'England', WAL: 'Wales', GHA: 'Ghana', TUR: 'Türkiye', SWE: 'Sweden', IRL: 'Ireland', POR: 'Portugal', DEN: 'Denmark', JPN: 'Japan', ITA: 'Italy', FIN: 'Finland', NOR: 'Norway', NZL: 'New Zealand', GER: 'Germany', ESP: 'Spain', NED: 'Netherlands', BEL: 'Belgium' };
  const roles = { GK: ['Goalkeeper', 'GK', 'Sweeper Keeper'], DC: ['Centre-back', 'D (C)', 'Ball-Playing Defender'], FB: ['Full-back', 'D (RL)', 'Full-Back'], DM: ['Defensive midfielder', 'DM', 'Ball-Winning Midfielder'], CM: ['Central midfielder', 'M (C)', 'Deep-Lying Playmaker'], AM: ['Attacking midfielder', 'AM (C)', 'Advanced Playmaker'], W: ['Winger', 'AM (RL)', 'Inverted Winger'], ST: ['Striker', 'ST (C)', 'Advanced Forward'] };
  const kits = [['Home', '#17478f', '#448dde', '#e8d3a0'], ['Away', '#f0f2ef', '#287d9e', '#113d6e'], ['Third', '#d1b88d', '#ab8d61', '#282a3d']];
  const leaders = { captain: 'rvr_3', vice: 'rvr_12', forward: 'rvr_17', winger: 'rvr_14' };
  const medical = [
    { id: 'rvr_11', issue: 'Tight hamstring', status: 'Out', return: '7–10 days', match: 'Medium', training: 'Light', susceptibility: 'Average', risk: 'High' },
    { id: 'rvr_12', issue: 'Accumulated workload', status: 'At risk', return: 'Available', match: 'Heavy', training: 'Heavy', susceptibility: 'Low', risk: 'High' },
    { id: 'rvr_14', issue: 'Accumulated workload', status: 'At risk', return: 'Available', match: 'Heavy', training: 'Medium', susceptibility: 'Low', risk: 'Elevated' },
    { id: 'rvr_6', issue: 'Returning to full training', status: 'Managing load', return: 'Available', match: 'Medium', training: 'Light', susceptibility: 'Low', risk: 'Low' }
  ];
  const injury = by(medical), positions = ['GK','DR','DCR','DCL','DL','DM','MCR','MCL','AMR','ST','AML'];
  const roster = H.squad.map((p, i) => {
    const [position, bestPos, role] = roles[p.pos];
    const ability = p.id === leaders.forward ? 4.5 : Math.min(4.5, Math.max(2.5, Math.round((D.ROLE_WEIGHTS[p.pos](p.attrs) / D.ROLE_WEIGHTS[p.pos](Object.fromEntries(Object.keys(p.attrs).map(k => [k, 20]))) * 5) * 2) / 2));
    const potential = Math.min(5, ability + (p.age <= 22 ? 1 : p.age <= 25 ? .5 : 0));
    const goals = p.id === leaders.forward ? 16 : [0,0,1,1,0,2,1,0,1,1,3,3,3,4,6,5,6,0][i];
    const assists = p.id === leaders.winger ? 11 : [0,0,0,1,0,0,2,0,3,1,3,2,6,3,0,5,1,4][i];
    const rating = p.id === leaders.forward ? 8.38 : +(6.78 + (i * 7 % 13) * .1).toFixed(2);
    return { ...p, position, bestPos, role, ability, potential, goals, assists, rating, appearances: [13,3,11,14,7,10,13,8,10,11,14,12,15,9,15,12,11,16][i],
      pass: p.id === leaders.captain ? 94 : 76 + i * 7 % 17,
      yellow: p.id === leaders.vice ? 5 : i * 5 % 4, redCards: p.id === leaders.captain ? 1 : 0, awards: p.id === leaders.forward ? 7 : i % 3,
      nation: ['TUR','DEN','WAL','DEN','GHA','ENG','POR','ENG','JPN','JPN','TUR','ITA','ENG','NOR','SWE','GER','GHA','ENG'][i],
      playing: p.id === leaders.forward || i === 3 || i === 14 ? 'Important Player' : i % 4 === 0 ? 'Regular Starter' : p.age < 21 ? 'Future Prospect' : 'Squad Player',
      value: Math.round((ability ** 2 * 2.4 + Math.max(0, 28-p.age)*2.1) * (1 + i % 4 * .07)) * 1e6,
      injury: injury[p.id] || null
    };
  });
  const players = by(roster);
  function quickPick(sort = 'balanced') {
    const available = roster.filter(p => p.injury?.status !== 'Out');
    const eligible = sort === 'fitness' ? available.filter(p => p.injury?.risk !== 'High') : available;
    const best = D.bestXI(eligible, '4-3-3');
    return [...best.xi.map(p => p.player.id), ...available.filter(p => !best.xi.some(x => x.player.id === p.id)).map(p => p.id)];
  }

  const staffGroups = [
    { id: 'coaching', name: 'Coaching Team', tone: 'blue', roles: [['Manager',1,1],['Assistant Manager',1,1],['Head of Youth Development',1,1],['Head Performance Analyst',1,1],['Coach',11,12],['Performance Analyst',5,5]], comparison: [['Attacking',16,13],['Defending',15,12],['Fitness',17,12],['Goalkeeping',15,12],['Mental',16,13],['Technical',16,12],['Tactical',15,13],['Working with youth',18,12],['Analysis',16,11]] },
    { id: 'recruitment', name: 'Recruitment Team', tone: 'teal', roles: [['Director of Football',1,1],['Technical Director',1,1],['Chief Scout',1,1],['Scout',17,18],['Recruitment Analyst',4,4],['Loan Manager',1,1]], comparison: [['Ability',16,12],['Potential',17,12],['Negotiating',14,11],['Knowledge',17,13]] },
    { id: 'medical', name: 'Medical Team', tone: 'rose', roles: [['Head Physio',1,1],['Chief Doctor',1,1],['Head of Sports Science',1,1],['Physio',4,5],['Sports Scientist',3,3]], comparison: [['Physiotherapy',16,13],['Sports science',18,12],['Injury prevention',16,12]] }
  ];
  const namedStaff = { Manager: H.manager, 'Assistant Manager': 'Elliot Marsh', 'Head of Youth Development': 'Mara Bennett', 'Head Performance Analyst': 'Iona Wallace', 'Director of Football': 'Leon Rook', 'Technical Director': 'Adrian Ellis', 'Chief Scout': 'Tomás Vale', 'Loan Manager': 'Hugh Brodie', 'Head Physio': 'Priya Dawson', 'Chief Doctor': 'Sofia Mendez', 'Head of Sports Science': 'Kieran Cole' };
  const first = ['Jules','Nadia','Matt','Samuel','Edie','Luke','Nina','Caleb','George','Nico','Ellis','Rory','Ari','Asha','Oscar','Alba','Ivo','Tess','Kofi'];
  const last = ['Gale','Maddox','Hart','Price','Bowen','Wood','Bramley','Forbes','Singh','Okoro','White','Moran','Petrescu','Lopes','Tierney','Mills','Finch'];
  let memberIndex = 0;
  const staff = staffGroups.flatMap(g => g.roles.flatMap(([role, count]) => Array.from({length: count}, (_, j) => {
    const i = memberIndex++;
    return { id: 'staff-' + i, name: namedStaff[role] || `${first[i % first.length]} ${last[i * 3 % last.length]}`, role, group: g.id,
      unit: namedStaff[role] || j % 5 < 3 ? 'first' : j % 5 === 3 ? 'u21' : 'u18', score: 12 + (i * 7 % 8) };
  })));
  const staffPool = [
    { id: 'staff-jana', name: 'Jana Beck', role: 'Coach', group: 'coaching', unit: 'available', score: 16 },
    { id: 'staff-ruben', name: 'Ruben Reyes', role: 'Scout', group: 'recruitment', unit: 'available', score: 15 },
    { id: 'staff-ellis', name: 'Ellis Harding', role: 'Physio', group: 'medical', unit: 'available', score: 14 },
    { id: 'staff-mina', name: 'Mina Klein', role: 'Coach', group: 'coaching', unit: 'available', score: 15 }
  ];
  const responsibility = { transfers: ['Shared', H.manager, namedStaff['Director of Football']], contracts: ['Shared', H.manager, namedStaff['Director of Football']],
    media: [H.manager, namedStaff['Assistant Manager']], friendlies: [namedStaff['Assistant Manager'], H.manager], scouting: [namedStaff['Chief Scout'], H.manager] };
  const responsibilityLabels = { transfers: 'Transfer negotiations', contracts: 'Contract negotiations', media: 'Press conferences', friendlies: 'Arranging friendlies', scouting: 'Assigning scouts' };

  const prospectData = [
    ['marin','Lucas Marín',25,'ESP','VAL','ST','B',63000000,145000,3.5,4,'Iberia','Completed report',['Finishing','Technique','Consistency','Movement off the ball'],['Needs time to learn a new system','Limited defensive contribution','High wage demands']],
    ['ribeiro','Tomás Ribeiro',22,'POR','Porto Norte','CM','A',41000000,89000,4,4.5,'Portugal','Requested report',['Passing range','Vision','Composure'],['Can tire late in games','Will want regular starts']],
    ['aaltio','Eero Aaltio',21,'FIN','Helsinki Sporting','W','A−',12700000,43000,3.5,4.5,'Finland','Recruitment focus',['Acceleration','Dribbling','Two-footed'],['Final ball','Needs time to adapt']],
    ['velden','Milo van Velden',24,'NED','Rotterdam 1908','DC','B+',28500000,71000,3.5,4,'Benelux','Recommended',['Aerial ability','Anticipation','Professional'],['Turning speed','Expensive release clause']],
    ['correia','Nuno Correia',20,'POR','Lisboa Athletic','ST','B',8500000,28000,3,4.5,'Portugal','Recruitment focus',['Pace','Finishing','Potential'],['Inconsistent','Needs senior minutes']],
    ['lehto','Arto Lehto',26,'FIN','Turku City','FB','B+',6400000,36000,3.5,3.5,'Finland','Recruitment focus',['Crossing','Work rate','Availability'],['Aerial duels','Limited resale upside']],
    ['steen','Oscar Steen',27,'DEN','Øresund FC','DM','B',13900000,48000,3.5,3.5,'Nordics','Recommended',['Tackling','Balance','Teamwork'],['Limited attacking output']],
    ['borges','Rafael Borges',19,'POR','Porto Norte','AM','A−',17900000,35500,3,5,'Portugal','Recruitment focus',['First touch','Creativity','Potential'],['May need a loan','End product']],
    ['raes','Bastien Raes',23,'BEL','Antwerp Union','GK','B−',9200000,36000,3.5,4,'Benelux','Recommended',['Reflexes','Claiming crosses'],['Distribution under pressure']],
    ['lund','Oskar Lund',22,'NOR','Bergen FK','W','B+',11800000,39500,3.5,4,'Nordics','Recommended',['Crossing','Energy','Versatility'],['Possession decisions']]
  ];
  const prospects = prospectData.map(([id,name,age,nat,club,pos,grade,value,wage,ability,potential,region,source,pros,cons], i) => ({
    id,name,age,nat,club: H.clubs[club.toLowerCase()]?.name || club, clubId: H.clubs[club.toLowerCase()]?.id, pos, grade,value,wage,ability,potential,region,source,pros,cons,
    knowledge: i === 0 || i === 1 ? 'Extensive' : i % 2 ? 'Good' : 'Reasonable', interest: i === 0 ? 'Dubious' : i % 3 ? 'Interested' : 'Uncertain'
  }));
  const regions = [ ['Portugal', 118, 79], ['Finland', 145, 45], ['Benelux', 129, 63], ['Nordics', 135, 44], ['Iberia', 122, 76], ['England', 122, 60] ];
  const starterFocus = [ { id: 'portugal', region: 'Portugal', pos: 'All positions', priority: 'High' }, { id: 'finland', region: 'Finland', pos: 'All positions', priority: 'Standard' } ];
  const clauses = [
    ['parks','Dylan Parks','brk',25,'Sell on','Receivable',2700000], ['fowler','Reece Fowler','ard',30,'Sell on','Receivable',3400000],
    ['reid','Isaac Reid','hpt',15,'Sell on','Receivable',1750000], ['palmer','Liam Palmer','wst',20,'Sell on','Payable',1900000],
    ['mora','Gabriel Mora','kgd',20,'Sell on','Receivable',4100000], ['banks','Lewin Banks','ash',40,'Sell on','Receivable',2100000],
    ['doyle','Evan Doyle','sby',40,'Sell on','Receivable',2850000]
  ].map(([id,name,club,percent,type,direction,estimate]) => ({ id,name,club,percent,type,direction,estimate }));
  const transfers = [
    { id:'tr-a',name:'Milo van Velden',club:'Rotterdam 1908',pos:'DC',direction:'In',status:'Watching',fee:28500000,date:at(10,24) },
    { id:'tr-b',name:'Lewin Banks',club:H.clubs.ash.name,pos:'FB',direction:'Out',status:'Completed',fee:8300000,date:at(8,29) },
    { id:'tr-c',name:'Dylan Parks',club:H.clubs.brk.name,pos:'ST',direction:'Out',status:'Completed',fee:14500000,date:at(8,16) },
    { id:'tr-d',name:'Dario Volkov',club:H.clubs.kgd.name,pos:'AM',direction:'In',status:'Completed',fee:17750000,date:at(8,2) },
    { id:'tr-e',name:'Eero Aaltio',club:'Helsinki Sporting',pos:'W',direction:'In',status:'Closed',fee:12700000,date:at(7,31) }
  ];

  const leagueGap = H.standings[0].pts - H.standings[1].pts;
  const reportFixture = H.fixtures.find(f => f.id === '2026-10-26-efc');
  const matchReport = { fixtureId: reportFixture.id, attendance: 27359, ratings: Object.fromEntries(quickPick().slice(0,11).map((id,i) => [id,id === leaders.forward ? '10.0' : id === leaders.winger ? '8.7' : (7.1 + i % 6 * .1).toFixed(1)])),
    potm: leaders.forward, stats: [['Shots',4,15],['xG',.62,2.71],['Possession',26,74],['On target',1,8],['Corners',2,7]],
    goals: [[25,leaders.forward,'A first-time finish into the far corner.'],[30,leaders.forward,'A low strike from the edge of the area.'],[63,leaders.winger,'A header from close range to extend the lead.'],[73,leaders.forward,'A finish from close range to seal the hat-trick.']] };
  const lastMeetings = [H.fixtures.find(f=>f.score && f.opponent==='hpt'), {date:Date.UTC(2026,3,6,15),venue:'A',opponent:'hpt',score:[2,0],comp:'PD'}, {date:Date.UTC(2023,10,25,15),venue:'H',opponent:'hpt',score:[2,1],comp:'PD'}];
  const inbox = [
    ['scout',10,26,17,0,namedStaff['Chief Scout'],'Chief Scout','Scouting','Scouting finished: Lucas Marín','scout',true],
    ['fixture',10,26,16,49,'June Fletcher','Club Secretary','Club','League Cup fixture confirmed','simple',false],
    ['form',10,26,16,41,'Sam Ellis','Press Officer','Match','FW: Riverside extend their unbeaten start','form',true],
    ['media',10,26,16,33,'Sam Ellis','Press Officer','Media','Post-match press conference about to begin','media',true],
    ['match',10,26,16,31,'Sam Ellis','Press Officer','Match','FW: Premier Division: Riverside meet expectations in dominant win','match',true],
    ['board',10,26,16,0,'Eleanor Voss','Chairperson','Club','Board response: stadium improvement','simple',false],
    ['fitness',10,26,14,5,namedStaff['Head of Sports Science'],'Head of Sports Science','Injuries','Riverside injury risk update','injury',false],
    ['analysis',10,25,12,15,namedStaff['Head Performance Analyst'],'Head Performance Analyst','Club','October squad report','simple',false],
    ['budget',10,24,10,0,'Nadia Arch','Finance Director','Club','October budget statement','simple',false],
    ['preview',10,24,8,15,namedStaff['Chief Scout'],'Chief Scout','Scouting','Harbourport Town: opponent preview','simple',false]
  ].map(([id,m,d,h,min,from,role,category,subject,type,unread])=>({id,date:at(m,d,h,min),from,role,category,subject,type,unread}));
  const journalists = [ ['Stefan Miles','Planet Football','Worldwide','Great respect'], ['Paul Adjei','Touchline Sports','National','Good'], ['Florence Shaw','Saturday Review','National','Great respect'], ['Dina Brooks','Riverside Chronicle','Local','Great respect'], ['Jack Hale','The Evening Desk','National','Neutral'] ];
  const stories = [
    ['injury','Injury update','Riverside lose Lombardi to a hamstring problem','terrace','rvr','fitness','Dani Lombardi will miss the next match','Training load monitored ahead of busy week'],
    ['cup','League Cup','Cup test awaits Harbourport at Quayside Park','floodlights','hpt','fixture','Riverside preparing for a home draw','Hartley weighs his attacking options'],
    ['run','Premier Division','Riverside hit four as run goes on','floodlights','rvr','form','Six league wins on the bounce','Riverside are still unbeaten'],
    ['hat','Premier Division','Novak takes the match ball at Vale Arena',null,'rvr','match','Three goals in another clean-sheet win','Riverside retain the lead'],
    ['media','Press room','After the whistle: reaction from Eastvale','pressroom','efc','media','Six league wins spark discussion','What the press want to ask'],
    ['title','Premier Division','Northbridge keep the pressure on',null,'nbu',null,`${leagueGap} points separate the leading pair`,'Their game in hand remains to be played'],
    ['rank','Premier Division','Oakfield’s defence put to the test',null,'oak',null,'Rovers look to reset after a tough week','The table remains tight behind the leaders'],
    ['scout','Recruitment','The recruitment desk completes its October review',null,'rvr','scout','Latest arrivals on the scouting list','Reports from Portugal and Finland']
  ].map(([id,category,title,art,club,message,...bullets])=>({id,category,title,art,club,message,bullets}));
  const makeLeague = (id,name,clubs,headlines) => ({id,name,headlines, rows: clubs.map(([name,played,gd,pts,primary],i)=>({id:`${id}-${i}`,name,short:name.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase(), played,gd,pts,primary,secondary:'#f2ebdc'})).sort((a,b)=>b.pts-a.pts||b.gd-a.gd)});
  const leagues = [
    { id:'premier', name:H.division, rows:H.standings, headlines:stories.filter(x=>['run','hat','title','rank','cup'].includes(x.id)) },
    makeLeague('iberian','Iberian First Division',[
      ['Madrid Royal',10,16,25,'#f2eee4'],['Atlético del Centro',10,14,24,'#bf3b53'],['Barcelona Azul',10,15,23,'#453ccf'],['Valencia Mar',10,9,20,'#ed9751'],['Sevilla Unión',10,6,18,'#a83155'],['Bilbao Athletic',10,1,16,'#a62f48'],['Villarreal Norte',10,2,15,'#ddb94a'],['Granada Real',10,-4,14,'#812641'],['Costa Vigo',10,-2,13,'#367e94']
    ], [['Madrid Royal','Madrid Royal edge it at the top'],['Barcelona Azul','Azul stretch home winning run'],['Valencia Mar','Mar find a late winner in Valencia'],['Granada Real','Granada hold on for a point'],['Bilbao Athletic','Athletic’s academy pair make their mark']]),
    makeLeague('italian','Italian Serie Uno',[
      ['Milano Inter',9,11,21,'#173178'],['Torino Stella',9,10,20,'#282e43'],['Roma Capitol',9,8,18,'#8a2d3c'],['Lazio Alba',9,7,17,'#497fb2'],['Napoli Mare',9,4,17,'#2695bd'],['Bergamo Calcio',9,6,16,'#2359a7'],['Firenze Viola',9,3,15,'#6f42a1'],['Genova Porto',9,-1,13,'#3b426a'],['Parma Ducale',9,-3,12,'#b28c39']
    ], [['Milano Inter','Inter hold top spot after tight away win'],['Roma Capitol','Capitol back to winning ways'],['Napoli Mare','Napoli rue chances on the road'],['Firenze Viola','Viola move closer to top six'],['Torino Stella','Stella’s strong defence sets the pace']]),
    makeLeague('german','German National League',[
      ['Leipzig Union',9,14,23,'#963448'],['München Bayern',9,13,22,'#bc2c47'],['Rhein Leverkusen',9,8,19,'#a13030'],['Dortmund 09',9,7,17,'#ac8d30'],['Berlin Hertha',9,4,16,'#2b54a4'],['Wolfsburg Grün',9,3,15,'#218052'],['Bremen Weser',9,3,14,'#259466'],['Hoffenheim Blau',9,1,13,'#377bad'],['Köln Rhein',9,-3,12,'#ab4240']
    ], [['Leipzig Union','Union remain unbeaten in the league'],['Köln Rhein','Köln sit deep to hold München'],['Rhein Leverkusen','Leverkusen find three on the road'],['Berlin Hertha','Hertha turn pressure into points'],['Dortmund 09','Late equaliser lifts Dortmund']])
  ];

  const comps = [
    { id:'PD',name:H.division,aim:'Win the Premier Division',importance:'Required',status:'Pleased',progress:84,tone:'paper' },
    { id:'CC',name:H.competition.CC,aim:'Reach the quarter-finals',importance:'Preferred',status:'Pleased',progress:71,tone:'blue' },
    { id:'NC',name:H.competition.NC,aim:'Reach the semi-finals',importance:'Favoured',status:'Reserving judgment',progress:37,tone:'paper' },
    { id:'CS',name:H.competition.CS,aim:'Be competitive in the Community Shield',importance:'Favoured',status:'Passed',progress:100,tone:'violet' },
    { id:'LC',name:'League Cup',aim:'Be competitive in the League Cup',importance:'Favoured',status:'On course',progress:60,tone:'green' }
  ];
  const continental = [['rvr',3,0,0,9,1],['kgd',2,1,0,7,3],['nbu',2,1,0,5,2],['oak',2,0,1,6,4],['ard',1,1,1,3,4],['brk',1,0,2,4,6],['crl',0,1,2,2,8]].map(([id,w,d,l,gf,ga])=>({id,w,d,l,gf,ga,played:w+d+l,gd:gf-ga,pts:3*w+d}));
  const culture = { board: [ ['Develop players through the academy','Favoured','On course'],['Play attacking football','Favoured','Very pleased'],['Play possession football','Favoured','Pleased'],['Play entertaining football','Favoured','Pleased'],['Maintain sustainable spending','Required','On course'] ],
    supporters: [ ['Finish above Northbridge United','Required','Pleased'],['Play entertaining football','Favoured','Delighted'],['Give young players a chance','Favoured','On course'],['Win matches at Quayside Park','Preferred','Very pleased'] ] };
  const objectives = [ ['Increase commercial revenue','Required','Pleased'],['Work within the wage budget','Required','On course'],['Use the original transfer budget wisely','Preferred','Satisfied'] ];
  const plan = [comps.map(c => [c.aim,c.importance,c.status,c.id]), ...[
    ['Qualify for the Continental Cup','Maintain first-team wage structure','Develop two first-team prospects'], ['Challenge for the Premier Division title','Establish an academy graduate in the XI','Grow commercial revenue'],
    ['Win a domestic trophy','Improve the academy facilities','Keep a positive operating balance'], ['Become regular title contenders','Reach the latter stages in Europe','Build a sustainable pathway to the first team']
  ].map(arr => arr.map((name,i) => [name,i===0?'Required':'Preferred','Not judging']))];
  const club = { nickname:'The Quaysiders', founded:1896, nation:'England', region:'UK & Ireland', status:'Professional', chair:'Eleanor Voss',
    ground: { capacity:43218, surface:'Hybrid grass', condition:'Very good', pitch:'105 m × 68 m', built:1924, tickets:28440, seasonPrice:795, matchPrice:46 },
    rivals:[['Northbridge derby',['nbu']],['Fierce rivals',['kgd','hpt']],['Other rivals',['oak','efc','swl']]],
    legacy:[['Legends',[['Nathan Holt','Player'],['Ben Osei','Player'],['Danny Caldwell','Player and manager'],['Vince Parkin','Player']]],['Icons',[['Elijah Morton','Player'],['Frank Wilder','Manager'],['Tomas Lund','Player']]],['Favoured personnel',[[players[leaders.captain].name,'Player'],[players[leaders.forward].name,'Player'],['Mara Bennett','Staff']]]],
    honours:[['Premier Division','1997/98, 2004/05, 2015/16, 2021/22'],['National Cup','1984, 1998, 2012, 2022'],['League Cup','2005, 2017'],['Community Shield','1998, 2005, 2026']]
  };
  const dynamics = [
    { id:'cohesion',name:'Team cohesion',symbol:'tactics',score:92,status:'Excellent',copy:'The players know how to play together and are willing to work for each other.',reasons:['The group has settled into a consistent first-team shape.','The back line is communicating more clearly.','Players are picking up each other’s runs earlier.'] },
    { id:'atmosphere',name:'Club atmosphere',symbol:'team',score:88,status:'Excellent',copy:'The squad is enjoying its football and pulling in the same direction.',reasons:[`Recent league form: ${H.form.map(f=>f.score[0]>f.score[1]?'W':f.score[0]===f.score[1]?'D':'L').join('')}.`,'No player has raised a dressing-room concern.',`${roster.length} first-team players are training together.`,'The leadership group is helping younger players settle in.'] },
    { id:'support',name:'Managerial support',symbol:'case',score:76,status:'Good',copy:'The first team supports your leadership and is happy with the way the club is playing.',reasons:['You have strong relationships with the captain and vice-captain.','The senior players are backing the current approach.','Consistent selections have helped build trust.'] }
  ];
  const youth = [
    ['nathan','Nathan Jules',20,'AM','u21',2.5,4,7.8,7.53,'Ready for first-team training.',[3,3,6,6,7,7,6,7]],
    ['fraser','Ewan Fraser',19,'CM','u21',2.5,3.5,7.15,7.30,'Find competitive senior minutes.',[5,3,4,4,5,6,6,6]],
    ['boadu','Malik Boadu',20,'FB','u21',2,4,7,7.15,'Develop his weaker foot.',[2,6,6,6,6,7,7,7]],
    ['ellis','Rory Ellis',20,'W','u21',2,3.5,8.7,7.22,'Could earn a place on the bench for cup matches.',[2,3,3,5,6,7,7,7]],
    ['hayes','Joel Hayes',18,'ST','u21',2,3,6.6,6.60,'Needs more consistent match minutes.',[4,5,5,6,4,4,4,4]],
    ['kwarteng','Kweku Kwarteng',19,'W','u21',2,3.5,6.4,6.68,'Review his individual training load.',[4,6,6,4,4,3,4,4]],
    ['mayer','Finn Mayer',17,'DC','u18',1.5,4.5,8.3,7.43,'Potential to become a first-team regular.',[2,6,7,7,8,8,8,9]],
    ['quaye','Nii Quaye',16,'FB','u18',1.5,4,7.5,7.20,'Give him time at right-back with the U21s.',[5,6,5,3,4,5,5,7]],
    ['akman','Emir Akman',17,'AM','u18',1.5,4.5,8.1,7.38,'Work on his movement between the lines.',[2,4,4,7,7,8,8,9]],
    ['tate','Callum Tate',16,'GK','u18',1,3,7.1,6.92,'Keep working on distribution.',[3,3,4,5,5,6,7,7]]
  ].map(([id,name,age,pos,unit,ability,potential,training,rating,advice,progress])=>({id,name,age,pos,unit,ability,potential,training,rating,advice,progress}));
  const loans = [
    ['Benji Hall','DC','brk',11,7.18],['Callum Wright','CM','mer',12,7.05],['Toby Madden','W','dun',8,6.91],['Théo Dahan','GK','ard',12,7.10],
    ['Rafi Noor','ST','ash',5,6.58],['Myles Kim','DM','wst',10,7.04],['Nathan Key','AM','elm',6,6.77],['Elias Young','FB','red',11,7.21]
  ].map(([name,pos,club,apps,rating],i)=>({id:`loan-${i}`,name,pos,club,apps,rating,advice:apps<7?'Review playing time with the loan club.':'Regular minutes are helping his development.'}));
  const youthFixtures = { u21:[['2026-10-21','wst','H','2 – 0'],['2026-10-28','kgd','A',''],['2026-11-04','nbu','H','']], u18:[['2026-10-19','ash','A','1 – 1'],['2026-11-02','mer','H',''],['2026-11-09','efc','A','']] };

  const finance = { ...H.finance, scouting:269372, scoutingOriginal:390000, scoutingRange:'World', income:16856408, expenditure:40040050, previousProfit:279974068,
    incomeParts:[['Gate receipts',2626224],['Broadcast revenue',5921963],['Sponsorship',5099468],['Merchandising',998372],['Prize money & other',2210381]],
    expenseParts:[['Player wages',15467383],['Bonuses',5586548],['Staff wages',3524080],['Transfer instalments',10176822],['Ground, academy & other',5285217]],
    monthlyProfit:[160,19,3,-12,-327,-179,-46,2,13,22,31,108,-23,-11,0,27,4,7,6,0,21,46,-17,-23.183642],
    monthlyIncome:[84,14,36,42,23,49,97,412,116,151,25,18,28,91,58,20,36,80,331,72,38,16.856408],
    monthlySpend:[19,37,15,19,367,43,36,46,51,62,39,57,29,31,37,24,42,34,89,126,61,40.04005],
    debt:[['Training ground loan',18400000,920000],['Stadium improvements',9600000,480000]], sponsors:[['Quayside Mutual','Main shirt sponsor',49000000],['Riverlight Energy','Training partner',17500000],['Bluebank Rail','Stadium partner',12300000]]
  };
  const ffp = ['PD','CC'].map(id=>({ id, name:comps.find(c=>c.id===id).name, result:'On course to pass', margin:id==='PD'?62500000:41200000 }));
  const boardOptions = ['Improve training facilities','Improve youth facilities','Increase scouting budget','Expand the stadium','Increase junior coaching budget'];
  const meetingTopics = ['Praise recent form','Set expectations for the cup','Encourage the younger players'];
  const api = { at, by, nation, roles, kits, leaders, medical, positions, roster, players, quickPick, staffGroups, staff, staffPool, namedStaff, responsibility, responsibilityLabels,
    prospects, regions, starterFocus, clauses, transfers, reportFixture, matchReport, lastMeetings, inbox, journalists, stories, leagues, leagueGap, comps, continental, culture, objectives, plan, club, dynamics,
    youth, loans, youthFixtures, finance, ffp, boardOptions, meetingTopics };
  global.TLClubData = api;
  if (node) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
