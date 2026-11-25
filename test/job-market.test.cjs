const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

global.window = global;
global.TLClubUI = { esc: value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]), art: () => '' };
const W = require('../src/manager-life');
global.TLManagerLife = W;
require('../src/office-organiser');
const Inbox = global.TLOfficeOrganiser;
global.TLTechnical = require('../src/technical-area');
global.TLWorldService = require('../src/world-service');
const Press = require('../src/football-press');
const Guide = require('../src/career-guide');

function career(id = 'multi0') {
  const s = W.create({ name: 'Jo Bell', age: 28, gender: 'Female', nation: 'Valdoria', job: 'Community coach', marital: 'Single', children: [], face: 'Oval', skin: 'Brown', path: 'apply' }, id);
  W.activate(s);
  return s;
}
function vacancies(s) {
  return Object.entries(W.nations).flatMap(([nation, clubs]) => clubs.filter(club => !global.TLTechnical.office(s, club, nation, clubs).coach).map(club => ({ club, nation })));
}

test('manager can apply to several vacancies and receive separate press rumours and interview invitations', () => {
  let s = career(), offers = vacancies(s).slice(0, 2);
  assert.equal(offers.length, 2);
  assert.equal(s.mail.some(message => message.offerClub), false, 'an interview introduction is not an inbox job offer');
  assert.match(Guide.managerJobs(s), /Interview invitations/);
  assert.equal(Inbox.classify({ offerClub: offers[0].club })[3], 'jobs');
  const pressRoute = Inbox.classify({ pressConferenceId: 'press-check' });
  assert.equal(pressRoute[3], 'inbox');
  assert.doesNotMatch(pressRoute[4], /standings/i);
  s = W.act(s, 'apply', offers[0].club);
  s = W.act(s, 'apply', offers[1].club);
  assert.equal(s.jobApplications.length, 2);
  assert.equal(s.plans.filter(plan => plan.kind === 'application').length, 2);
  assert.equal(s.plans.filter(plan => plan.kind === 'pressConference').length, 2);
  assert.equal(s.press.posts.filter(post => post.title.startsWith('Rumour:')).length, 2);
  const jobPanel = Guide.managerJobs(s);
  assert.match(jobPanel, /Applications &amp; interviews/);
  assert.match(jobPanel, /Apply to [^<]+/);
  assert.match(jobPanel, /data-vacancy-search/);
  const router = fs.readFileSync(require.resolve('../src/manager-desk.js'), 'utf8');
  assert.match(router, /data-board-interview/);
  assert.match(router, /data-vacancy-search/);
  assert.match(router, /b\.dataset\.life==='pressAnswer'/);
  assert.match(router, /else if\(b\.dataset\.life\)change\(b\.dataset\.life,b\.dataset\.v\)/);
  assert.match(fs.readFileSync(require.resolve('../src/manager-life.js'), 'utf8'), /case 'withdrawApplication'/);

  s = W.act(s, 'advance');
  assert.equal(s.pressConferences.filter(conf => conf.status === 'invited').length, 2);
  const pressMail = s.mail.find(message => message.pressConferenceId);
  assert.ok(pressMail, 'press requests are delivered to inbox');
  assert.equal(Inbox.pending(s, pressMail), true);
  assert.match(pressMail.from, /Wire|Gazette|Ledger|Post|Matchday|Touchline/);
  assert.equal(Inbox.classify(pressMail)[3], 'inbox');
  assert.equal(Guide.decision(s, () => false)[1], 'Press conference request');
  assert.equal(Guide.decision(s, () => false)[3], 'inbox', 'press requests interrupt into the Inbox, not the job desk');
  assert.doesNotMatch(Guide.managerJobs(s), /Press room|Journalist directory|media-reporter/, 'the job desk does not duplicate press workflow or history');
  assert.ok(new Set(Array.from({ length: 18 }, (_, i) => Press.outlet(s, s.profile.nation, 'media-' + i))).size > 1, 'more than one media source covers the country');
  const wire = Press.render(s, 'For you', s.profile.nation, (id, body) => id + body, (_mark, name) => name, (_page, label) => label);
  assert.match(wire, /Rumour: Jo Bell applies to/);
  for (const conf of [...s.pressConferences]) s = W.act(s, 'pressAnswer', { id: conf.id, answer: 'interested' });
  assert.ok(s.press.posts.some(post => post.title.startsWith('Press conference:')));

  s = W.act(s, 'advance');
  assert.equal(s.interview, offers[0].club);
  assert.equal(s.interviewQueue.length, 1);
  const invitation = s.mail.find(m => m.from === s.interview && m.text.startsWith('Interview invitation'));
  assert.ok(invitation, 'the active board interview has an Inbox invitation');
  assert.equal(Inbox.classify(invitation)[4], 'Attend board interview');
  s.boardInterviewSession = Guide.startBoardInterview(s);
  const interview = Guide.boardInterview(s);
  assert.match(interview, /applied to/);
  assert.match(interview, /What interests you in this project/);
  assert.match(interview, /Board chair/);
  assert.match(interview, /data-board-interview-choice/);
  assert.doesNotMatch(interview, /Open vacancies|data-vacancy-grid/);
  s = W.act(s, 'answer', { priority: 'academy', motivation: 'transparent' });
  assert.equal(s.interview, offers[1].club);
  s = W.act(s, 'answer', { priority: 'budget', motivation: 'exclusive' });
  const decisions = s.plans.filter(plan => plan.kind === 'decision');
  assert.equal(decisions.length, 2);
  assert.equal(decisions[0].interviewResponse.otherCount, 1);
  assert.equal(decisions[1].interviewResponse.motivation, 'exclusive');
  assert.equal(W.interviewChance('academy', { motivation: 'transparent', otherCount: 1 }), 75);
  assert.equal(W.interviewChance('academy', { motivation: 'exclusive', otherCount: 1 }), 35);
  s = W.act(s, 'advance');
  const jobOffer = s.mail.find(message => message.offerClub);
  assert.ok(jobOffer, 'a successful board decision creates a real offer in the inbox');
  assert.equal(s.club, null, 'a manager is not appointed until the inbox offer is accepted');
  assert.equal(s.jobApplications.filter(app => app.status === 'offer').length, 1);
  const marketWithOffer = Guide.managerJobs(s);
  assert.doesNotMatch(marketWithOffer, new RegExp(`data-vacancy-card[^>]*${jobOffer.offerClub}`));
  s = W.act(s, 'acceptJobOffer', jobOffer.offerClub);
  assert.ok(s.club, 'accepting the inbox offer appoints the manager');
  assert.equal(s.jobApplications.filter(app => app.status === 'appointed').length, 1);
  assert.ok(s.jobApplications.filter(app => app.status !== 'appointed').every(app => ['rejected', 'withdrawn'].includes(app.status)));
  assert.equal(s.mail.find(message => message.offerClub === jobOffer.offerClub).offerHandled, 'accepted');
});

test('declining a genuine inbox job offer returns that open vacancy to the job market', () => {
  let s = career('decline-job'), club = vacancies(s)[0].club;
  s.applications[club] = 14;
  s.mail.unshift({ day: s.day, from: club + ' board', offerClub: club, text: 'The board is offering you the manager role.' });
  s = W.act(s, 'declineJobOffer', club);
  const market = Guide.managerJobs(s);
  assert.match(market, new RegExp(`data-vacancy-card[^>]*${club}`));
  assert.equal(s.mail.find(message => message.offerClub === club).offerHandled, 'declined');
});

test('job market keeps applications withdrawable and cancels the matching board and media requests', () => {
  let s = career('withdraw-job'), offer = vacancies(s)[0];
  s = W.act(s, 'apply', offer.club);
  const application = s.jobApplications[0];
  s = W.act(s, 'withdrawApplication', application.id);
  assert.equal(s.jobApplications[0].status, 'withdrawn');
  assert.ok(!s.plans.some(plan => plan.applicationId === application.id));
  assert.ok(s.press.posts.some(post => post.key === 'application-withdrawn:' + application.id));
  assert.throws(() => W.act(s, 'pressAnswer', { id: application.id, answer: 'interested' }), /no longer open/);
});
