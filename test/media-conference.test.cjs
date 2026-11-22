const test = require('node:test');
const assert = require('node:assert/strict');
const Media = require('../src/media-conference.js');

global.TLClubUI = {
  esc: value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]),
  art: () => '',
};
global.TLManagerLife = { date: day => `Day ${day}`, pool: [] };
const Press = require('../src/football-press.js');

test('conference questions are grounded in fixtures and settled score context, with distinct reporters', () => {
  const pre = Media.create('pre:fixture-1', 'pre-match', {
    day: 42, club: 'Harbour FC', nation: 'Zandora', opponent: 'Cedar Town',
    opponentStyle: 'a narrow defensive block', competition: 'District Premier',
  });
  assert.equal(pre.questions.length, 3);
  assert.ok(pre.questions[0].prompt.includes('Cedar Town'));
  assert.ok(pre.questions[0].prompt.includes('narrow defensive block'));
  assert.equal(new Set(pre.questions.map(q => q.journalistId)).size, 3);

  const post = Media.create('post:fixture-1', 'postmatch', {
    day: 43, club: 'Harbour FC', opponent: 'Cedar Town', score: [3, 1],
    performer: { id: 'player-7', name: 'A. Mensah' }, performerGoals: 3,
    hatTrick: true, upcoming: 'Ridge United',
  });
  assert.ok(post.questions[0].prompt.includes('3–1'));
  assert.ok(post.questions[1].prompt.includes('A. Mensah'));
  assert.ok(post.questions[1].prompt.includes('hat-trick'));
  assert.ok(post.questions[2].prompt.includes('Ridge United'));
  assert.ok(post.questions[1].options.some(option => option.id === 'back-player'));
});

test('answers persist transcript, change relationships and trust, and build a persona from repeated choices', () => {
  const state = { id: 'media-career', day: 120, profile: { name: 'Jordan Boateng' }, club: { name: 'Harbour FC' } };
  const conference = Media.create('post:result', 'postmatch', {
    day: state.day, club: 'Harbour FC', opponent: 'Cedar Town', score: [2, 0],
    performer: { id: 'p1', name: 'A. Mensah' }, performerGoals: 2,
  });
  for (let i = 0; i < conference.questions.length; i++) {
    const q = conference.questions[conference.cursor || 0];
    const option = q.options.find(x => x.id === 'back-player') || q.options.find(x => x.id === 'credit-team');
    Media.apply(state, conference, option.id, 'The team worked hard.', [{ id: 'p1', name: 'A. Mensah' }]);
  }
  assert.equal(conference.status, 'answered');
  assert.equal(conference.answers.length, 3);
  assert.ok(state.media.journalists[conference.questions[0].journalistId].interactions > 0);
  assert.ok(state.media.dressingRoom > 50);
  assert.equal(Media.transcript(conference).length, 3);
  const appointment = Media.create('appointment:repeat', 'appointment', { club: 'Cedar Town' });
  for (let i = 0; i < appointment.questions.length; i++) Media.apply(state, appointment, 'interested');
  assert.equal(Media.personality(state.media), 'The Straight-Talking Manager');
  const restored = JSON.parse(JSON.stringify({ state, conference }));
  assert.equal(restored.conference.answers.length, 3);
  assert.equal(restored.state.media.journalists[conference.questions[0].journalistId].interactions, 1);
});

test('repeated topics are phrased differently when recent conference history is supplied', () => {
  const first = Media.create('pre:one', 'pre-match', { opponent: 'Cedar Town' });
  const next = Media.create('pre:two', 'pre-match', { opponent: 'Cedar Town' }, [first]);
  assert.notEqual(first.questions[0].prompt, next.questions[0].prompt);
});

test('press desk renders an active conference and its answer controls without completing it', () => {
  const state = {
    id: 'desk-render', day: 17,
    profile: { name: 'Jordan Boateng', nation: 'Valdoria' },
    club: { name: 'Harbour FC' }, mail: [],
  };
  const conference = Press.open(state, 'pre-match', {
    club: 'Harbour FC', nation: 'Valdoria', opponent: 'Cedar Town',
    opponentStyle: 'a narrow defensive block',
  }, 'pre:render-test');
  const html = Press.conferencePanel(state, conference);
  assert.match(html, /Cedar Town/);
  assert.match(html, /mediaAnswer/);
  assert.match(html, /mediaDelegate/);
  assert.match(html, /mediaEnd/);
  assert.equal(conference.status, 'invited');
  assert.equal(conference.cursor, undefined);
});
