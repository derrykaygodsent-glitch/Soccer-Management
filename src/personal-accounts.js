/* Personal money reads in sections: what you hold, what moved, what it is invested in,
   and how you get about. The club's account is a different page and a different ledger. */
(function (g) {
  'use strict';

  const SECTIONS = [
    ['overview', 'Overview'],
    ['movements', 'Movements'],
    ['investments', 'Investments'],
    ['travel', 'Getting around'],
  ];

  function render(s, view) {
    const L = g.TLLuma, W = g.TLManagerLife;
    const { esc: e } = g.TLClubUI;
    const here = SECTIONS.some(([id]) => id === view) ? view : 'overview';
    const nav = `<nav class="account-nav" aria-label="Personal accounts sections">${SECTIONS.map(([id, label]) =>
      `<button type="button" data-account-tab="${id}" aria-pressed="${here === id}">${label}</button>`).join('')}</nav>`;

    const wallet = L.wallet(s, { movements: false });
    const explain = `<article class="org-agenda"><small>PERSONAL MONEY CHOICES</small><h3>What this money can do</h3><p>Use your wallet for savings, shares, a home, a local business, transport, household and family costs, and community football. Every personal purchase stays separate from the club treasury.</p><div class="org-actions"><button type="button" data-life="go" data-v="household">Household costs</button></div></article>`;
    const next = `<article class="org-agenda house-next"><small>YOUR NEXT STEP</small><h3>${W.money(s.cash)} in your wallet</h3><p>Club treasury ${W.money(s.fund)} · ${s.enterprise && Object.values(s.enterprise).filter(Boolean).length} personal holdings</p><div class="org-actions"><button type="button" data-account-tab="movements">Open movements</button></div></article>`;

    let body;
    if (here === 'movements') {
      body = L.statement(s, 'all', 60, null, '', { page: true });
    } else if (here === 'investments') {
      body = g.TLPersonalEnterprise.render(s);
    } else if (here === 'travel') {
      body = `<div class="account-cards">${g.TLNeighbour.render(s)}</div>`;
    } else {
      body = `${wallet}<div class="account-cols">${explain}${next}</div>`;
    }

    return `<section class="life-desk personal-accounts">${nav}<div class="account-body">${body}</div></section>`;
  }

  const api = { render, SECTIONS };
  g.TLPersonalAccounts = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window === 'undefined' ? globalThis : window);
