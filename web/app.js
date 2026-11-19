'use strict';
// Eden Check: dependency-free, no build step. Content comes from content/*.json (English)
// and content/<lang>/*.json; interface strings come from i18n.js.

const $app = document.getElementById('app');
const DATA = { cards: null, insights: null, plans: null, quiz: null, meta: null, cats: null };
let LANG = 'en';
const t = k => (UI[LANG] && UI[LANG][k] !== undefined) ? UI[LANG][k] : UI.en[k];

/* ---------- small helpers ---------- */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'aria-pressed') el.setAttribute(k, String(v));
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return el;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem('eden.' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('eden.' + k, JSON.stringify(v)); } catch { /* storage may be blocked */ } },
  clearProgress() {
    try { Object.keys(localStorage).filter(k => k.startsWith('eden.plan.') || k === 'eden.quiz.best').forEach(k => localStorage.removeItem(k)); } catch { /* ignore */ }
  }
};
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cardById = id => DATA.cards.find(c => c.id === id);
const insightById = id => DATA.insights.find(c => c.id === id);
const detectLang = () => {
  const saved = store.get('lang', null);
  if (saved && LANGS[saved]) return saved;
  return (navigator.language || 'en').toLowerCase().startsWith('de') ? 'de' : 'en';
};

function badge(key) {
  const b = DATA.meta.badges[key];
  return h('span', { class: 'badge', title: b.help }, b.icon, ' ', b.label);
}
function sources(list) {
  return h('ul', { class: 'src' }, list.map(s => {
    const kindText = t('kind')[s.kind] || s.kind;
    const label = s.url ? h('a', { href: s.url, rel: 'noopener noreferrer', target: '_blank' }, s.label) : h('span', {}, s.label);
    return h('li', {}, label, h('span', { class: 'kind' + (s.kind === 'primary-todo' ? ' todo' : ''), title: DATA.meta.sourceKinds[s.kind] }, kindText));
  }));
}
function safeguard(text) {
  return h('div', { class: 'safe', role: 'note' },
    h('b', {}, t('careNote')), text, ' ', h('a', { href: '#/help' }, t('helpLink')));
}
function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach(a => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
function show(...nodes) {
  $app.replaceChildren(...nodes.flat().filter(n => n != null && n !== false));
  window.scrollTo(0, 0);
  $app.focus({ preventScroll: true });
}

/* ---------- page chrome, theme, text size ---------- */
function applyLook() {
  const root = document.documentElement;
  const theme = store.get('theme', 'system');
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme); else root.removeAttribute('data-theme');
  const size = Number(store.get('font', 1));
  root.style.fontSize = (size >= 0.85 && size <= 2 ? size : 1) * 100 + '%';
}
function applyChrome() {
  document.documentElement.lang = LANG;
  const skip = document.getElementById('skip'); if (skip) skip.textContent = t('skip');
  document.title = t('title');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', t('description'));
  document.getElementById('brand-sub').textContent = t('brandSub');
  document.getElementById('tabs').setAttribute('aria-label', t('mainNav'));
  document.querySelectorAll('.tab[data-nav]').forEach(a => { const s = a.querySelector('span'); if (s && t('nav')[a.dataset.nav]) s.textContent = t('nav')[a.dataset.nav]; });
  const gear = document.getElementById('gear');
  gear.setAttribute('aria-label', t('settings')); gear.setAttribute('title', t('settings'));
  const hb = document.getElementById('helpbtn');
  hb.setAttribute('aria-label', t('helpTitle')); hb.setAttribute('title', t('helpTitle'));
  document.getElementById('foot-about').textContent = t('howWorks');
  document.getElementById('foot-text').textContent = ' · ' + t('footer');
}

/* ---------- views ---------- */
function viewHome() {
  const teaser = h('div', { class: 'teaser' });
  function drawTeaser(c) {
    teaser.replaceChildren(
      h('p', { class: 'muted' }, t('testTeaser')),
      h('div', { class: 'claim' }, c.claim),
      h('div', { class: 'row' },
        h('a', { class: 'btn', href: '#/myths/' + c.id }, t('checkIt')),
        h('button', { class: 'btn secondary', type: 'button', onclick: () => drawTeaser(pick(c.id)) }, t('another'))));
  }
  const pick = notId => { const pool = DATA.cards.filter(c => c.id !== notId); return pool[Math.floor(Math.random() * pool.length)]; };
  drawTeaser(pick());
  const tile = (href, n, label, text) => h('a', { class: 'card tile', href },
    h('span', { class: 'count' }, String(n)), h('h3', {}, label), h('p', {}, text));
  show(
    h('section', { class: 'hero' },
      h('h1', {}, t('homeTitle')),
      h('p', { class: 'lead' }, t('homeLead'))),
    h('div', { class: 'grid three' },
      h('div', { class: 'layer' }, h('h2', {}, t('layerText')), h('p', {}, t('layerTextHelp'))),
      h('div', { class: 'layer' }, h('h2', {}, t('layerTradition')), h('p', {}, t('layerTraditionHelp'))),
      h('div', { class: 'layer' }, h('h2', {}, t('layerToday')), h('p', {}, t('layerTodayHelp')))),
    h('div', { class: 'layer' }, teaser),
    h('h2', {}, t('startHere')),
    h('div', { class: 'grid two' },
      tile('#/myths', DATA.cards.length, t('tileMyths'), t('tileMythsText')),
      tile('#/insights', DATA.insights.length, t('tileInsights'), t('tileInsightsText')),
      tile('#/plans', DATA.plans.length, t('tilePlans'), t('tilePlansText')),
      tile('#/quiz', DATA.quiz.length, t('tileQuiz'), t('tileQuizText'))),
    h('h2', {}, t('legendTitle')),
    h('ul', { class: 'legend' }, Object.values(DATA.meta.badges).map(b => h('li', {}, h('b', {}, b.icon + ' ' + b.label + ': '), b.help))),
    h('p', { class: 'note' }, t('draftNote'),
      h('a', { href: '#/about' }, t('howWorks')), ' · ', h('a', { href: '#/help' }, t('helpTitle'))));
}

function viewMyths() {
  let filter = 'all';
  const list = h('div', { class: 'grid' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': t('filterVerdict') });
  function draw() {
    list.replaceChildren(...DATA.cards.filter(c => filter === 'all' || c.badge === filter).map(c =>
      h('a', { class: 'card', href: '#/myths/' + c.id },
        badge(c.badge), h('h3', {}, c.title), h('p', {}, c.verses))));
    chips.replaceChildren(...['all', ...Object.keys(DATA.meta.badges)].filter(k => k === 'all' || DATA.cards.some(c => c.badge === k)).map(k =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': filter === k, onclick: () => { filter = k; draw(); } },
        k === 'all' ? t('all') : DATA.meta.badges[k].icon + ' ' + DATA.meta.badges[k].label)));
  }
  draw();
  show(h('h1', {}, t('mythsTitle')), h('p', { class: 'lead' }, t('mythsLead')), chips, list);
}

function viewCard(id) {
  const c = cardById(id);
  if (!c) return viewMyths();
  const idx = DATA.cards.indexOf(c);
  const related = DATA.plans.flatMap(p => p.days.map((d, n) => ({ p, d, n })).filter(r => (r.d.cards || []).includes(id)));
  const insightLinks = DATA.insights.filter(i => related.some(r => (r.d.insights || []).includes(i.id)));
  show(
    h('p', {}, h('a', { href: '#/myths' }, t('allMyths'))),
    badge(c.badge), h('h1', {}, c.title),
    h('p', { class: 'muted' }, c.verses, ' · ' + t('confidence'), c.confidence),
    h('div', { class: 'claim' }, c.claim),
    h('div', { class: 'layer' }, h('h2', {}, t('layerText')), h('p', {}, c.text)),
    h('div', { class: 'layer' }, h('h2', {}, t('layerTradition')), h('p', {}, c.tradition)),
    h('div', { class: 'layer' }, h('h2', {}, t('layerToday')), h('p', {}, c.today)),
    c.safeguard && safeguard(c.safeguard),
    h('p', { class: 'weak' }, h('b', {}, t('weakest')), c.weakestJoint),
    h('h2', {}, t('sourcesH')), sources(c.sources),
    related.length ? h('p', { class: 'links' }, t('inContext'), related.map(r => h('a', { href: '#/plans/' + r.p.id + '/' + r.n }, r.d.title))) : null,
    insightLinks.length ? h('p', { class: 'links' }, t('relatedInsights'), insightLinks.map(i => h('a', { href: '#/insights/' + i.id }, i.title))) : null,
    h('p', { class: 'note' }, t('lastChecked')(c.lastChecked)),
    h('div', { class: 'row' },
      idx > 0 ? h('a', { class: 'btn secondary', href: '#/myths/' + DATA.cards[idx - 1].id }, t('prev')) : null,
      idx < DATA.cards.length - 1 ? h('a', { class: 'btn secondary', href: '#/myths/' + DATA.cards[idx + 1].id }, t('next')) : null));
}

function viewInsights() {
  let cat = 'all';
  const list = h('div', { class: 'grid' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': t('filterTopic') });
  function draw() {
    list.replaceChildren(...DATA.insights.filter(i => cat === 'all' || i.category === cat).map(i =>
      h('a', { class: 'card', href: '#/insights/' + i.id },
        h('span', { class: 'badge' }, DATA.cats[i.category]), h('h3', {}, i.title), h('p', {}, i.verses))));
    chips.replaceChildren(...['all', ...Object.keys(DATA.cats)].map(k =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': cat === k, onclick: () => { cat = k; draw(); } }, k === 'all' ? t('all') : DATA.cats[k])));
  }
  draw();
  show(h('h1', {}, t('insightsTitle')), h('p', { class: 'lead' }, t('insightsLead')), chips, list);
}

function viewInsight(id) {
  const i = insightById(id);
  if (!i) return viewInsights();
  const idx = DATA.insights.indexOf(i);
  show(
    h('p', {}, h('a', { href: '#/insights' }, t('allInsights'))),
    h('span', { class: 'badge' }, DATA.cats[i.category]), h('h1', {}, i.title),
    h('p', { class: 'muted' }, i.verses, ' · ' + t('confidence'), i.confidence),
    h('div', { class: 'layer' }, h('h2', {}, t('whatNotice')), h('p', {}, i.insight)),
    h('div', { class: 'layer' }, h('h2', {}, t('whyMatters')), h('p', {}, i.whyItMatters)),
    h('div', { class: 'layer' }, h('h2', {}, t('layerToday')), h('p', {}, i.today)),
    i.safeguard && safeguard(i.safeguard),
    h('p', { class: 'weak' }, h('b', {}, t('caveat')), i.caveat),
    h('h2', {}, t('sourcesH')), sources(i.sources),
    h('div', { class: 'row' },
      idx > 0 ? h('a', { class: 'btn secondary', href: '#/insights/' + DATA.insights[idx - 1].id }, t('prev')) : null,
      idx < DATA.insights.length - 1 ? h('a', { class: 'btn secondary', href: '#/insights/' + DATA.insights[idx + 1].id }, t('next')) : null));
}

function viewPlans() {
  show(h('h1', {}, t('plansTitle')),
    h('p', { class: 'lead' }, t('plansLead')),
    h('div', { class: 'grid' }, DATA.plans.map(p => {
      const done = (store.get('plan.' + p.id, [])).length;
      return h('a', { class: 'card', href: '#/plans/' + p.id },
        h('span', { class: 'badge' }, p.audience + ' · ' + p.minutes),
        h('h3', {}, p.title), h('p', {}, p.description),
        h('p', {}, t('doneOf')(done, p.days.length)));
    })));
}

function viewPlan(id) {
  const p = DATA.plans.find(x => x.id === id);
  if (!p) return viewPlans();
  const done = store.get('plan.' + id, []);
  const bar = h('i', {});
  bar.style.width = (100 * done.length / p.days.length) + '%';
  show(h('p', {}, h('a', { href: '#/plans' }, t('allPlans'))),
    h('h1', {}, p.title), h('p', { class: 'lead' }, p.description),
    h('div', { class: 'progress', role: 'presentation' }, bar),
    h('p', { class: 'muted' }, t('doneOf')(done.length, p.days.length)),
    p.days.map((d, n) => h('a', { class: 'day' + (done.includes(n) ? ' done' : ''), href: '#/plans/' + id + '/' + n },
      h('b', {}, (done.includes(n) ? '✓ ' : '') + d.title),
      h('span', { class: 'muted' }, d.passage),
      h('span', {}, d.summary || ''))));
}

function viewPlanDay(id, n) {
  const p = DATA.plans.find(x => x.id === id);
  const d = p && p.days[n];
  if (!d) return viewPlans();
  let done = store.get('plan.' + id, []);
  const btn = h('button', { class: 'btn', type: 'button' });
  function sync() { btn.textContent = done.includes(n) ? t('undone') : t('markDone'); btn.classList.toggle('secondary', done.includes(n)); }
  btn.addEventListener('click', () => {
    done = done.includes(n) ? done.filter(x => x !== n) : [...done, n];
    store.set('plan.' + id, done); sync();
  });
  sync();
  const cards = (d.cards || []).map(cardById).filter(Boolean);
  const ins = (d.insights || []).map(insightById).filter(Boolean);
  show(
    h('p', {}, h('a', { href: '#/plans/' + id }, '← ' + p.title)),
    h('h1', {}, d.title),
    h('p', { class: 'muted' }, t('readFirst'), h('b', {}, d.passage), ' · ' + p.minutes),
    d.leaderNote ? h('div', { class: 'safe' }, h('b', {}, t('leaderNote')), d.leaderNote) : null,
    h('section', { class: 'story' }, h('h2', {}, d.story.title), h('p', { class: 'muted' }, t('imagined')), d.story.text.map(x => h('p', {}, x))),
    h('section', { class: 'reading' }, h('h2', {}, t('thePassage')),
      d.layout.text.map(x => h('p', {}, x)),
      d.layout.bullets && d.layout.bullets.length ? h('ul', {}, d.layout.bullets.map(x => h('li', {}, x))) : null),
    h('section', { class: 'reading' }, h('h2', {}, t('discoveries')),
      d.discoveries.map(x => h('div', { class: 'discovery' }, h('h3', {}, x.heading), x.text.map(y => h('p', {}, y))))),
    d.safeguard ? safeguard(d.safeguard) : null,
    h('section', { class: 'apply' }, h('h2', {}, t('makeYours')),
      h('ul', {}, d.apply.bullets.map(x => h('li', {}, x))),
      h('h3', {}, d.apply.questions.length > 1 ? t('questions') : t('question')),
      h('ul', { class: 'q' }, d.apply.questions.map(q => h('li', {}, q)))),
    d.quickCheck ? h('p', { class: 'muted quick' }, h('b', {}, t('quick')), d.quickCheck) : null,
    h('div', { class: 'row' }, btn, d.finish ? h('a', { class: 'btn secondary', href: '#/quiz' }, d.finish) : null),
    (cards.length || ins.length) ? h('div', { class: 'deeper' },
      h('h2', {}, t('deeper')),
      h('p', { class: 'muted' }, t('deeperText')),
      cards.length ? h('h3', {}, t('mythCards')) : null,
      cards.length ? h('ul', { class: 'links' }, cards.map(c => h('li', {}, badge(c.badge), ' ', h('a', { href: '#/myths/' + c.id }, c.title)))) : null,
      ins.length ? h('h3', {}, t('insightsTitle')) : null,
      ins.length ? h('ul', { class: 'links' }, ins.map(i => h('li', {}, h('a', { href: '#/insights/' + i.id }, i.title)))) : null) : null,
    h('div', { class: 'row' },
      n > 0 ? h('a', { class: 'btn secondary', href: '#/plans/' + id + '/' + (n - 1) }, '← ' + p.days[n - 1].title.split(':')[0]) : null,
      n < p.days.length - 1 ? h('a', { class: 'btn secondary', href: '#/plans/' + id + '/' + (n + 1) }, p.days[n + 1].title.split(':')[0] + ' →') : null));
}

function viewQuiz() {
  const best = store.get('quiz.best', null);
  show(h('h1', {}, t('quizTitle')),
    h('p', { class: 'lead' }, t('quizLead')),
    best != null ? h('p', {}, t('best')(best)) : null,
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'button', onclick: () => runQuiz(shuffle(DATA.quiz).slice(0, 10)) }, t('start10')),
      h('button', { class: 'btn secondary', type: 'button', onclick: () => runQuiz(DATA.quiz.filter(q => q.kind === 'card')) }, t('mythsOnly')),
      h('button', { class: 'btn secondary', type: 'button', onclick: () => runQuiz(DATA.quiz.filter(q => q.kind === 'insight')) }, t('insightsOnly'))));
}

function runQuiz(qs) {
  let i = 0, score = 0; const missed = [];
  function step() {
    if (i >= qs.length) return finish();
    const q = qs[i];
    const box = h('div', {});
    const next = h('div', { role: 'status', 'aria-live': 'polite' });
    q.options.forEach((o, n) => box.append(h('button', { class: 'opt', type: 'button', onclick: () => {
      box.querySelectorAll('button').forEach((b, m) => { b.disabled = true; if (m === q.answer) { b.classList.add('right'); b.append(h('span', { class: 'mark' }, t('correctMark'))); } else if (m === n) { b.classList.add('wrong'); b.append(h('span', { class: 'mark' }, t('yourMark'))); } });
      if (n === q.answer) score++; else missed.push(q);
      const link = (q.kind === 'card' ? '#/myths/' : '#/insights/') + q.ref;
      next.append(h('p', {}, h('b', {}, n === q.answer ? t('right') : t('notQuite')), q.explain),
        h('div', { class: 'row' },
          h('a', { class: 'btn secondary', href: link }, t('readMore')),
          h('button', { class: 'btn', type: 'button', onclick: () => { i++; step(); } }, i + 1 < qs.length ? t('nextQ') : t('seeResult'))));
    } }, o)));
    show(h('p', { class: 'muted' }, t('qOf')(i + 1, qs.length)), h('h1', {}, q.q), box, next);
  }
  function finish() {
    if (qs.length === 10 && score > (store.get('quiz.best', -1))) store.set('quiz.best', score);
    show(h('h1', {}, t('result')(score, qs.length)),
      missed.length ? h('div', {}, h('h2', {}, t('worthAgain')),
        h('ul', {}, missed.map(q => h('li', {}, h('a', { href: (q.kind === 'card' ? '#/myths/' : '#/insights/') + q.ref }, q.q))))) : h('p', {}, t('noMiss')),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: viewQuiz }, t('backQuiz'))));
  }
  step();
}

function viewHelp() {
  const li = (name, text) => h('li', {}, h('b', {}, name + ': '), text);
  show(h('h1', {}, t('helpTitle')),
    h('div', { class: 'safe' }, h('b', {}, t('danger')), t('dangerText')),
    h('p', {}, t('helpIntro')),
    h('h2', {}, t('whereHelp')),
    h('ul', {},
      li(t('us'), t('usText')), li(t('uk'), t('ukText')), li(t('de'), t('deText')), li(t('elsewhere'), t('elsewhereText'))),
    h('p', { class: 'note' }, t('numbersNote')),
    h('h2', {}, t('notSay')),
    h('ul', {}, ['notSay1', 'notSay2', 'notSay3', 'notSay4'].map(k => h('li', {}, t(k)))),
    h('p', {}, t('seeCards'),
      DATA.cards.filter(c => c.safeguard).map(c => h('a', { href: '#/myths/' + c.id, class: 'chip-link' }, c.title + ' ')).flatMap(a => [a, ' · '])));
}

function viewAbout() {
  show(h('h1', {}, t('aboutTitle')),
    h('p', {}, t('about1')),
    h('h2', {}, t('verdicts')),
    h('ul', {}, Object.values(DATA.meta.badges).map(b => h('li', {}, h('b', {}, b.icon + ' ' + b.label + ': '), b.help))),
    h('h2', {}, t('sourceLabels')),
    h('ul', {}, Object.entries(DATA.meta.sourceKinds).map(([k, v]) => h('li', {}, h('b', {}, (t('kind')[k] || k) + ': '), v))),
    h('p', {}, t('about2')),
    h('p', {}, t('about3')));
}

function viewSettings() {
  const sample = h('p', { class: 'sample' }, t('textSample'));
  const size = h('input', { type: 'range', id: 'text-size', min: '0.85', max: '2', step: '0.05', value: String(store.get('font', 1)),
    oninput: e => { store.set('font', Number(e.target.value)); applyLook(); } });
  const theme = h('select', { id: 'theme-pick', onchange: e => { store.set('theme', e.target.value); applyLook(); } },
    ['system', 'light', 'dark'].map(v => h('option', { value: v, selected: store.get('theme', 'system') === v ? true : null }, t('theme' + v[0].toUpperCase() + v.slice(1)))));
  const status = h('p', { class: 'fine', role: 'status' });
  show(h('h1', {}, t('settings')),
    h('h2', {}, t('setLanguage')),
    h('div', { class: 'card choices' }, Object.entries(LANGS).map(([k, name]) =>
      h('label', { class: 'choice' }, name, h('input', { type: 'radio', name: 'lang', value: k, checked: k === LANG ? true : null, onchange: () => setLanguage(k) })))),
    h('h2', {}, t('setAppearance')),
    h('div', { class: 'card' },
      h('div', { class: 'setting' }, h('label', { for: 'text-size' }, t('textSize')), h('div', { class: 'sizerow' }, h('span', { class: 'small-a' }, 'A'), size, h('span', { class: 'big-a' }, 'A')), sample),
      h('div', { class: 'setting row-between' }, h('label', { for: 'theme-pick' }, t('theme')), theme)),
    h('h2', {}, t('setAbout')),
    h('div', { class: 'card' },
      h('p', {}, t('setAboutText')),
      h('a', { class: 'linkrow', href: '#/about' }, t('howWorks'), h('small', {}, '›')),
      h('a', { class: 'linkrow', href: '#/help' }, t('helpTitle'), h('small', {}, '›')),
      h('a', { class: 'linkrow', href: 'https://revelation-today.net/apps/', target: '_blank', rel: 'noopener noreferrer' }, t('moreApps'), h('small', {}, '›')),
      h('a', { class: 'linkrow', href: t('privacyUrl'), target: '_blank', rel: 'noopener noreferrer' }, t('privacy'), h('small', {}, '›')),
      h('a', { class: 'linkrow', href: t('supportUrl'), target: '_blank', rel: 'noopener noreferrer' }, t('support'), h('small', {}, '›')),
      h('a', { class: 'linkrow', href: 'mailto:revelation-today@web.de?subject=' + encodeURIComponent(t('contactSubject')) }, t('contact'), h('small', {}, 'revelation-today@web.de'))),
    h('h2', {}, t('setProgress')),
    h('div', { class: 'card' }, h('p', {}, t('progressText')),
      h('button', { class: 'btn secondary', type: 'button', onclick: () => { if (confirm(t('clearConfirm'))) { store.clearProgress(); status.textContent = t('cleared'); } } }, t('clear')),
      status));
}

/* ---------- language, content, router ---------- */
async function loadContent(lang) {
  const base = lang === 'en' ? 'content/' : 'content/' + lang + '/';
  const [c, i, p, q] = await Promise.all(['cards', 'insights', 'plans', 'quiz'].map(n => fetch(base + n + '.json').then(r => { if (!r.ok) throw new Error(n); return r.json(); })));
  DATA.meta = c.meta; DATA.cards = c.cards.sort((a, b) => a.order - b.order);
  DATA.cats = i.categories; DATA.insights = i.insights.sort((a, b) => a.order - b.order);
  DATA.plans = p.plans; DATA.quiz = q.questions;
}
async function setLanguage(lang) {
  try { await loadContent(lang); } catch { return; }
  LANG = lang; store.set('lang', lang);
  applyChrome(); route();
}

function route() {
  if (!DATA.cards) return;
  const [, area = 'home', id, sub] = (location.hash || '#/').split('/');
  setNav({ myths: 'myths', insights: 'insights', plans: 'plans', quiz: 'quiz', help: 'help', settings: 'settings' }[area] || null);
  if (area === 'myths') return id ? viewCard(id) : viewMyths();
  if (area === 'insights') return id ? viewInsight(id) : viewInsights();
  if (area === 'plans') return id ? (sub != null ? viewPlanDay(id, Number(sub)) : viewPlan(id)) : viewPlans();
  if (area === 'quiz') return viewQuiz();
  if (area === 'help') return viewHelp();
  if (area === 'about') return viewAbout();
  if (area === 'settings') return viewSettings();
  return viewHome();
}

async function boot() {
  const skip = document.getElementById('skip');
  if (skip) skip.addEventListener('click', e => { e.preventDefault(); $app.focus(); $app.scrollIntoView(); });
  applyLook();
  LANG = detectLang();
  applyChrome();
  try {
    try { await loadContent(LANG); } catch (e) { if (LANG === 'en') throw e; LANG = 'en'; await loadContent('en'); applyChrome(); }
    window.addEventListener('hashchange', route);
    route();
  } catch (e) {
    $app.replaceChildren(h('p', {}, t('loadError')));
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
