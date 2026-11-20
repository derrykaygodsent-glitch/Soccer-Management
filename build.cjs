/* Build the offline game. Fonts, icons and player portraits travel with the HTML. */
'use strict';
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const src = join(__dirname, 'src');
const read = name => readFileSync(join(src, name), 'utf8');
const base64 = name => readFileSync(join(src, name)).toString('base64');
const css = [read('style.css'), read('home.css'), read('club.css'), read('matchday.css'), read('season.css'), read('office.css')].join('\n')
  .replace('{{OPEN_GROUND}}', () => base64('media/open-ground.jpg'))
  .replace('{{ENTRY_ROOM}}', () => base64('media/entry-room.jpg'))
  .replace('{{ENTRY_TUNNEL}}', () => base64('media/entry-tunnel.jpg'))
  .replace('{{INTER}}', () => base64('fonts/inter-variable.woff2'))
  .replace('{{BARLOW}}', () => base64('fonts/barlow-condensed-700.woff2'));
const portraits = Object.fromEntries(['forward', 'winger', 'defender', 'midfielder'].map(id => [id, 'data:image/webp;base64,' + base64(`media/home-player-${id}.webp`)]));
const clubMedia = Object.fromEntries(['terrace', 'floodlights', 'pressroom', 'briefing', 'dressing', 'quayside', 'supporters', 'training', 'silverware'].map(id => [id, 'data:image/webp;base64,' + base64(`media/club-${id}.webp`)]));
const files = ['data.js', 'home-data.js', 'club-data.js', 'matchday-data.js', 'season-calendar.js', 'season-state.js', 'calendar-progress.js', 'club-state.js', 'pitch.js', 'physics.js', 'runoff.js', 'decisions.js', 'setpieces.js', 'referee.js', 'engine.js', 'render.js', 'audio.js', 'broadcast.js', 'highlights.js', 'season-match.js', 'ui.js', 'club-ui.js', 'matchday-ui.js', 'club-season.js', 'club-tactics.js', 'club-player.js', 'club-readiness.js', 'club-matchday-pre.js', 'club-matchday-game.js', 'club-matchday.js', 'club-recruitment.js', 'club-inbox.js', 'club-squad.js', 'club-identity.js', 'club-people.js', 'club-finance.js', 'club-office.js', 'club-desk.js', 'cloud.js', 'meridian.js', 'atlas-map.js', 'season-turnover.js', 'fa-season.js', 'technical-area.js', 'luma.js', 'boardroom.js', 'fa-hearing.js', 'manager-life.js', 'career-entry.js', 'scout-centre.js', 'squad-room.js', 'district-session.js', 'cup-circuit.js', 'league-matchday.js', 'district-view.js', 'meridian-feed.js', 'season-book.js', 'competition-room.js', 'office-organiser.js', 'manager-desk.js', 'home.js'];
// Only public Supabase configuration belongs in this standalone artifact.
const url = process.env.TOUCHLINE_SUPABASE_URL ?? 'https://dainetwhnjeucsyezlgf.supabase.co', key = process.env.TOUCHLINE_PUBLISHABLE_KEY ?? 'sb_publishable_l2Fud7Sebm1H8hTqgVs9qg_2iEMLtVy';
if ((url || key) && (!/^https:\/\/[a-z0-9.-]+$/i.test(url) || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))) throw Error('Expected HTTPS project origin and sb_publishable_ key');
const engine = require('node:crypto').createHash('sha256').update(files.slice(0,files.indexOf('ui.js')).map(read).join('\n')).digest('hex');
const js = files.map(name => `/* ===== ${name} ===== */\n${read(name)}`).join('\n;\n')
  .replace('/* @WORLD_PLAYERS@ */ null', () => read('world-players.json'))
  .replace('/* @CLOUD@ */ {}', () => JSON.stringify({url,key,engine}))
  .replace('/* @HOME_PORTRAITS@ */ {}', () => JSON.stringify(portraits))
  .replace('/* @CLUB_MEDIA@ */ {}', () => JSON.stringify(clubMedia));
const html = read('template.html')
  .replace('{{CSS}}', () => css)
  .replace('{{HOME_ICONS}}', () => read('home-icons.html'))
  .replace('{{HOME}}', () => read('home.html'))
  .replace('{{MATCH_SHELL}}', () => read('match-shell.html'))
  .replace('{{JS}}', () => js);
writeFileSync(join(__dirname, 'index.html'), html);
console.log(`Built Touchline 26 — Riverside Clubhouse and Classic 2D (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`);
