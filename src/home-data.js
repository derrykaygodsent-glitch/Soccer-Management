/* The starter club dashboard is a season snapshot, not a second match engine. */
(function (global) {
  'use strict';
  const D = typeof window === 'undefined' ? require('./data.js') : global.TLData;
  const at = (month, day, hour = 15, minute = 0) => Date.UTC(2024, month - 1, day, hour, minute);
  const start = at(10, 26, 17, 15);
  const homeId = 'rvr';
  const manager = 'Alex Mercer';
  const division = 'Touchline Premier Division';
  const local = [
    ['wst', 'Westhaven', '#28608d', '#f3e4a5'], ['sby', 'Stonebury', '#9a263f', '#f6dee3'],
    ['brk', 'Brockley FC', '#21395b', '#e4c272'], ['ard', 'Arden City', '#2d7849', '#e1f2d8'],
    ['dun', 'Dunmore', '#8b3844', '#f5c880'], ['ash', 'Ashcombe', '#5555a0', '#dce0fa'],
    ['red', 'Redwick', '#b53a39', '#f7ebd0'], ['val', 'Valemoor', '#2c7183', '#ccedee'],
    ['crt', 'Creston', '#572b65', '#f4e5f8'], ['elm', 'Elmbrook', '#1e5d42', '#eeefb5'],
    ['lyd', 'Lydden County', '#a43d37', '#f3e4ce'], ['mer', 'Mereford', '#3b567f', '#d3e7f9']
  ].map(([id, name, primary, secondary]) => ({ id, name, primary, secondary, short: id.toUpperCase() }));
  const clubs = Object.fromEntries([...D.CLUBS, ...local].map(c => [c.id, c]));
  const f = (date, venue, opponent, comp, score = null) => ({ date, venue, opponent, comp, score });
  const fixtures = [
    f(at(10, 22, 19, 45), 'A', 'oak', 'PD', [4, 0]),
    f(at(10, 26, 15), 'A', 'efc', 'PD', [4, 0]),
    f(at(10, 30, 19, 45), 'H', 'hpt', 'LC'),
    f(at(11, 2), 'H', 'swl', 'PD'),
    f(at(11, 5, 20), 'A', 'kgd', 'CC'),
    f(at(11, 10, 14), 'A', 'nbu', 'PD'),
    f(at(11, 23), 'H', 'crl', 'PD'),
    f(at(11, 30), 'H', 'wst', 'PD')
  ];
  const competition = { PD: division, LC: 'League Cup Fourth Round', CC: 'Continental Cup' };
  const next = fixtures.find(item => !item.score);
  const matchConfig = () => {
    const host = next.venue === 'H' ? homeId : next.opponent;
    const visitor = next.venue === 'H' ? next.opponent : homeId;
    return { home: D.CLUBS.findIndex(c => c.id === host), away: D.CLUBS.findIndex(c => c.id === visitor), competition: competition[next.comp] };
  };

  // Points and goal difference are derived from the same displayed record.
  const standings = [
    ['rvr', 8, 3, 0, 39, 7, 0], ['nbu', 7, 3, 0, 24, 11, 0],
    ['kgd', 7, 1, 2, 22, 14, 1], ['efc', 6, 3, 2, 26, 10, 1],
    ['oak', 6, 3, 2, 25, 9, -1], ['crl', 6, 3, 2, 15, 13, 1],
    ['hpt', 6, 2, 3, 14, 13, -1], ['swl', 6, 1, 4, 11, 12, 1],
    ['wst', 5, 3, 2, 18, 8, 0], ['sby', 5, 2, 4, 16, 15, -1],
    ['brk', 4, 4, 3, 12, 20, 0], ['ard', 4, 3, 4, 14, 16, 0],
    ['dun', 3, 3, 5, 13, 17, 1], ['ash', 3, 2, 6, 11, 18, -1],
    ['red', 2, 3, 6, 10, 20, 0], ['val', 2, 2, 7, 10, 21, -1],
    ['crt', 2, 1, 8, 10, 23, 1], ['elm', 2, 0, 9, 8, 21, -1],
    ['lyd', 1, 2, 8, 8, 22, 0], ['mer', 1, 0, 9, 7, 23, 0]
  ].map(([id, w, d, l, gf, ga, move]) => ({ id, w, d, l, gf, ga, played: w + d + l, gd: gf - ga, pts: w * 3 + d, move }))
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  const positionHistory = [1, 1, 2, 4, 3, 1, 3, 4, 2, 2, 1, 1, 1];
  const opponentManager = 'Vincent Hartley';
  const squad = D.genSquad(clubs[homeId], D.seedFor(homeId));
  const portraitFor = { rvr_17: 'forward', rvr_14: 'winger', rvr_3: 'defender', rvr_12: 'midfielder' };
  const leaders = [
    ['ball', 'Top goalscorer', 'rvr_17', '16 goals'],
    ['rating', 'Highest average rating', 'rvr_17', '8.38'],
    ['assist', 'Most assists', 'rvr_14', '11 assists'],
    ['percent', 'Best pass completion', 'rvr_3', '94%'],
    ['star', 'Most Player of the Match awards', 'rvr_17', '7 Player of the Match awards'],
    ['card', 'Most yellow cards', 'rvr_12', '5 yellow cards'],
    ['redcard', 'Most red cards', 'rvr_3', '1 red card']
  ].map(([icon, label, id, value]) => ({ icon, label, player: squad.find(p => p.id === id), value }));
  const finance = {
    balance: 346547102, profit: 188710574, transfer: 279375245, original: 224000000,
    retention: 100, nextSeason: 94710000, wage: 7560000, spending: 6166930, committed: 6166930,
    history: [34, 19, 7, -328, -347, -374, -354, 88, 145, 247, 207, 181, 165, 187, 167, 151, 123, 376, 419, 398, 347]
  };
  const inbox = [
    ['Club secretary', 'League Cup fixture confirmed', 'Harbourport Town will visit Quayside Park on Wednesday. The match centre is ready when you are.'],
    ['Scouting department', 'Harbourport Town: opponent preview', 'Harbourport favour early deliveries and two forwards. Their next visit is listed in your schedule.'],
    ['Analytics department', 'October squad report', 'Fabio Novak leads the team in goals and rating. Diego Berg is our leading provider.'],
    ['Finance department', 'October budget statement', 'The current transfer and wage allocations are available under Finance & Salary.']
  ];
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const weekdays = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const two = n => String(n).padStart(2, '0');
  const ordinal = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'));
  const shortDate = ts => { const d = new Date(ts); return `${two(d.getUTCDate())}/${two(d.getUTCMonth() + 1)}`; };
  const calendar = ts => {
    const d = new Date(ts), m = d.getUTCMonth();
    return { day: `${weekdays[d.getUTCDay()].slice(0,3)} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}`,
      date: `${d.getUTCDate()} ${month[m]} ${d.getUTCFullYear()}`,
      long: `${weekdays[d.getUTCDay()]} ${ordinal(d.getUTCDate())} ${new Intl.DateTimeFormat('en-GB', { month: 'long', timeZone: 'UTC' }).format(d)} ${d.getUTCFullYear()}` };
  };
  const leadTime = (now, date) => {
    const days = Math.floor(date / 86400000) - Math.floor(now / 86400000);
    return days > 0 ? `${days} ${days === 1 ? 'day' : 'days'}` : 'Today';
  };
  const currency = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });
  const money = amount => currency.format(amount);
  const millions = amount => `£${+(amount / 1000000).toFixed(2)}M`;
  const api = { start, homeId, manager, division, clubs, fixtures, next, competition, matchConfig, standings, positionHistory, opponentManager,
    squad, portraitFor, leaders, finance, inbox, shortDate, calendar, leadTime, ordinal, money, millions };
  global.TLHomeData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
