/* Build the offline game. Fonts, icons and player portraits travel with the HTML. */
'use strict';
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const src = join(__dirname, 'src');
const read = name => readFileSync(join(src, name), 'utf8');
const base64 = name => readFileSync(join(src, name)).toString('base64');
const css = [read('tokens.css'), read('style.css'), read('home.css'), read('club.css'), read('matchday.css'), read('season.css'), read('office.css'), read('reading.css'), read('tactics-desk.css')].join('\n')
  .replace('{{FAMILY_STREET}}', () => base64('media/family-street.jpg'))
  .replace('{{LOCAL_REPORTER}}', () => base64('media/local-reporter.webp'))
  .replace('{{LOCAL_FOUNDER}}', () => base64('media/local-founder.webp'))
  .replace('{{COMMUNITY_EVENT}}', () => base64('media/community-event.webp'))
  .replace('{{MARKET_RADIO}}', () => base64('media/market-radio.webp'))
  .replace('{{HOUSEHOLD}}', () => base64('media/household.jpg'))
  .replace('{{OPEN_GROUND}}', () => base64('media/open-ground.jpg'))
  .replace('{{ENTRY_ROOM}}', () => base64('media/entry-room.jpg'))
  .replace('{{ENTRY_TUNNEL}}', () => base64('media/entry-tunnel.jpg'))
  .replace('{{INTER}}', () => base64('fonts/inter-variable.woff2'))
  .replace('{{BARLOW}}', () => base64('fonts/barlow-condensed-700.woff2'));
const portraits = Object.fromEntries(['forward', 'winger', 'defender', 'midfielder'].map(id => [id, 'data:image/webp;base64,' + base64(`media/home-player-${id}.webp`)]));
const clubMedia = Object.fromEntries(['terrace', 'floodlights', 'pressroom', 'briefing', 'dressing', 'quayside', 'supporters', 'training', 'silverware'].map(id => [id, 'data:image/webp;base64,' + base64(`media/club-${id}.webp`)]));
const files = ['data.js', 'player-intelligence.js', 'tactical-zones.js', 'tactical-analysis.js', 'home-data.js', 'club-data.js', 'matchday-data.js', 'season-calendar.js', 'season-state.js', 'calendar-progress.js', 'club-state.js', 'pitch.js', 'physics.js', 'runoff.js', 'decisions.js', 'setpieces.js', 'referee.js', 'engine.js', 'render.js', 'audio.js', 'broadcast.js', 'highlights.js', 'season-match.js', 'ui.js', 'club-ui.js', 'matchday-ui.js', 'club-season.js', 'club-tactics.js', 'club-player.js', 'club-readiness.js', 'club-matchday-pre.js', 'club-matchday-game.js', 'club-matchday.js', 'club-recruitment.js', 'club-inbox.js', 'club-squad.js', 'club-identity.js', 'club-people.js', 'club-finance.js', 'club-office.js', 'club-desk.js', 'career-files.js', 'cloud.js', 'meridian.js', 'world-guide.js', 'atlas-map.js', 'season-turnover.js', 'world-talent.js', 'world-economy.js', 'fa-season.js', 'technical-area.js', 'consortium.js', 'luma.js', 'club-estate.js', 'fa-office.js', 'boardroom.js', 'fa-hearing.js', 'district-life.js', 'office-planner.js', 'district-people.js', 'family-paths.js', 'district-circle.js', 'household.js', 'career-legacy.js', 'football-memory.js', 'player-contracts.js', 'transfer-market.js', 'transfer-centre.js', 'competition-honours.js', 'club-succession.js', 'media-conference.js', 'football-press.js', 'touchline-life.js', 'commercial.js', 'personal-enterprise.js', 'career-guide.js', 'team-dynamics.js', 'match-board.js', 'board-room.js', 'scouting-travel.js', 'squad-registration.js', 'office-reports.js', 'terrace-trials.js', 'terrace-world.js', 'supporters-network.js', 'manager-profile.js', 'staff-office.js', 'manager-life.js', 'career-entry.js', 'scout-centre.js', 'squad-room.js', 'contract-queue.js', 'district-session.js', 'cup-circuit.js', 'league-matchday.js', 'district-view.js', 'world-service.js', 'meridian-feed.js', 'season-book.js', 'competition-room.js', 'office-organiser.js', 'career-clock.js', 'desk-attention.js', 'table-headings.js', 'entity-links.js', 'global-search.js', 'continue-calendar.js', 'desk-scroll.js', 'club-profile.js', 'career-development.js', 'training-room.js', 'football-dossiers.js', 'screen-head.js', 'list-pager.js', 'wire-pager.js', 'personal-accounts.js', 'matches-desk.js', 'shell-nav.js', 'manager-desk.js', 'home.js', 'offline.js'];
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
  .replace('{{BUILD}}', () => require('node:crypto').createHash('sha256').update(css + js).digest('hex').slice(0, 20))
  .replace('{{CSS}}', () => css)
  .replace('{{HOME_ICONS}}', () => read('home-icons.html'))
  .replace('{{HOME}}', () => read('home.html'))
  .replace('{{MATCH_SHELL}}', () => read('match-shell.html'))
  .replace('{{JS}}', () => js);
writeFileSync(join(__dirname, 'index.html'), html);
const revision=require('node:crypto').createHash('sha256').update(html).digest('hex').slice(0,20);
// The worker name carries the build so a new deploy always installs a fresh shell cache.
writeFileSync(join(__dirname,'offline-worker.js'),read('offline-worker.js').replace(/__BUILD__/g,revision));
console.log(`Built Touchline 26 (${(Buffer.byteLength(html) / 1024).toFixed(1)} KiB)`);
