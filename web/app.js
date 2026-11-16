'use strict';
// Eden Check: dependency-free, no build step. All content comes from /content/*.json.

const $app = document.getElementById('app');
const DATA = { cards: null, insights: null, plans: null, quiz: null, meta: null, cats: null };

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
  set(k, v) { try { localStorage.setItem('eden.' + k, JSON.stringify(v)); } catch { /* storage may be blocked */ } }
};
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cardById = id => DATA.cards.find(c => c.id === id);
const insightById = id => DATA.insights.find(c => c.id === id);

function badge(key) {
  const b = DATA.meta.badges[key];
  return h('span', { class: 'badge', title: b.help }, b.icon, ' ', b.label);
}
function sources(list) {
  return h('ul', { class: 'src' }, list.map(s => {
    const kindText = { text: 'text', secondary: 'seen in secondary source', 'primary-todo': 'to check' }[s.kind] || s.kind;
    const label = s.url ? h('a', { href: s.url, rel: 'noopener noreferrer', target: '_blank' }, s.label) : h('span', {}, s.label);
    return h('li', {}, label, h('span', { class: 'kind' + (s.kind === 'primary-todo' ? ' todo' : ''), title: DATA.meta.sourceKinds[s.kind] }, kindText));
  }));
}
function safeguard(text) {
  return h('div', { class: 'safe', role: 'note' },
    h('b', {}, 'Care note'), text, ' ', h('a', { href: '#/help' }, 'Help and support →'));
}
function setNav(name) {
  document.querySelectorAll('nav a').forEach(a => {
    if (a.dataset.nav === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}
function show(...nodes) {
  $app.replaceChildren(...nodes.flat().filter(n => n != null && n !== false));
  window.scrollTo(0, 0);
  $app.focus({ preventScroll: true });
}

/* ---------- views ---------- */
function viewHome() {
  const teaser = h('div', { class: 'teaser' });
  function drawTeaser(c) {
    teaser.replaceChildren(
      h('p', { class: 'muted' }, 'Test yourself: is this in Genesis?'),
      h('div', { class: 'claim' }, c.claim),
      h('div', { class: 'row' },
        h('a', { class: 'btn', href: '#/myths/' + c.id }, 'Check it'),
        h('button', { class: 'btn secondary', type: 'button', onclick: () => drawTeaser(pick(c.id)) }, 'Another one')));
  }
  const pick = notId => { const pool = DATA.cards.filter(c => c.id !== notId); return pool[Math.floor(Math.random() * pool.length)]; };
  drawTeaser(pick());
  const tile = (href, n, label, text) => h('a', { class: 'card tile', href },
    h('span', { class: 'count' }, String(n)), h('h3', {}, label), h('p', {}, text));
  show(
    h('section', { class: 'hero' },
      h('h1', {}, 'What does Genesis 1–4 actually say?'),
      h('p', { class: 'lead' }, 'Most of us know Eden, Eve and Cain from sermons, children’s Bibles and half-remembered lessons. Some of it is in the text. Some was added later. This app helps you tell the difference, and shows what is still worth taking from it.')),
    h('div', { class: 'grid three' },
      h('div', { class: 'layer' }, h('h2', {}, 'Text'), h('p', {}, 'What the Hebrew words and the story actually say.')),
      h('div', { class: 'layer' }, h('h2', {}, 'Tradition'), h('p', {}, 'What later readers added, and who held which view.')),
      h('div', { class: 'layer' }, h('h2', {}, 'Today'), h('p', {}, 'What the corrected reading changes for real life.'))),
    h('div', { class: 'layer' }, teaser),
    h('h2', {}, 'Start here'),
    h('div', { class: 'grid two' },
      tile('#/myths', DATA.cards.length, 'Myths', 'Common claims, checked against the text.'),
      tile('#/insights', DATA.insights.length, 'Insights', 'Poetry, language and ancient background.'),
      tile('#/plans', DATA.plans.length, 'Reading plans', 'A week on your own, or four evenings in a group.'),
      tile('#/quiz', DATA.quiz.length, 'Quiz', 'Ten questions at a time, with explanations.')),
    h('h2', {}, 'How to read the verdicts'),
    h('ul', { class: 'legend' }, Object.values(DATA.meta.badges).map(b => h('li', {}, h('b', {}, b.icon + ' ' + b.label + ': '), b.help))),
    h('p', { class: 'note' }, 'This is a draft. Every entry lists its sources and marks which ones still have to be checked in the original books. ',
      h('a', { href: '#/about' }, 'How this works'), ' · ', h('a', { href: '#/help' }, 'Help and support')));
}

function viewMyths() {
  let filter = 'all';
  const list = h('div', { class: 'grid' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by verdict' });
  function draw() {
    list.replaceChildren(...DATA.cards.filter(c => filter === 'all' || c.badge === filter).map(c =>
      h('a', { class: 'card', href: '#/myths/' + c.id },
        badge(c.badge), h('h3', {}, c.title), h('p', {}, c.verses))));
    chips.replaceChildren(...['all', ...Object.keys(DATA.meta.badges)].filter(k => k === 'all' || DATA.cards.some(c => c.badge === k)).map(k =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': filter === k, onclick: () => { filter = k; draw(); } },
        k === 'all' ? 'All' : DATA.meta.badges[k].icon + ' ' + DATA.meta.badges[k].label)));
  }
  draw();
  show(h('h1', {}, 'What the text says, and what we added'),
    h('p', { class: 'lead' }, 'Common claims about Genesis 1–4, each split into what the text says, what tradition added, and what it means today.'),
    chips, list);
}

function viewCard(id) {
  const c = cardById(id);
  if (!c) return viewMyths();
  const idx = DATA.cards.indexOf(c);
  const related = DATA.plans.flatMap(p => p.days.map((d, n) => ({ p, d, n })).filter(r => (r.d.cards || []).includes(id)));
  const insightLinks = DATA.insights.filter(i => related.some(r => (r.d.insights || []).includes(i.id)));
  show(
    h('p', {}, h('a', { href: '#/myths' }, '← All myths')),
    badge(c.badge), h('h1', {}, c.title),
    h('p', { class: 'muted' }, c.verses, ' · confidence: ', c.confidence),
    h('div', { class: 'claim' }, c.claim),
    h('div', { class: 'layer' }, h('h2', {}, 'Text'), h('p', {}, c.text)),
    h('div', { class: 'layer' }, h('h2', {}, 'Tradition'), h('p', {}, c.tradition)),
    h('div', { class: 'layer' }, h('h2', {}, 'Today'), h('p', {}, c.today)),
    c.safeguard && safeguard(c.safeguard),
    h('p', { class: 'weak' }, h('b', {}, 'Weakest joint: '), c.weakestJoint),
    h('h2', {}, 'Sources'), sources(c.sources),
    related.length ? h('p', { class: 'links' }, 'Read it in context: ', related.map(r => h('a', { href: '#/plans/' + r.p.id + '/' + r.n }, r.d.title))) : null,
    insightLinks.length ? h('p', { class: 'links' }, 'Related insights: ', insightLinks.map(i => h('a', { href: '#/insights/' + i.id }, i.title))) : null,
    h('p', { class: 'note' }, 'Last checked ' + c.lastChecked + '. Items marked “to check” have not yet been verified in the primary source.'),
    h('div', { class: 'row' },
      idx > 0 ? h('a', { class: 'btn secondary', href: '#/myths/' + DATA.cards[idx - 1].id }, '← Previous') : null,
      idx < DATA.cards.length - 1 ? h('a', { class: 'btn secondary', href: '#/myths/' + DATA.cards[idx + 1].id }, 'Next →') : null));
}

function viewInsights() {
  let cat = 'all';
  const list = h('div', { class: 'grid' });
  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filter by topic' });
  function draw() {
    list.replaceChildren(...DATA.insights.filter(i => cat === 'all' || i.category === cat).map(i =>
      h('a', { class: 'card', href: '#/insights/' + i.id },
        h('span', { class: 'badge' }, DATA.cats[i.category]), h('h3', {}, i.title), h('p', {}, i.verses))));
    chips.replaceChildren(...['all', ...Object.keys(DATA.cats)].map(k =>
      h('button', { class: 'chip', type: 'button', 'aria-pressed': cat === k, onclick: () => { cat = k; draw(); } }, k === 'all' ? 'All' : DATA.cats[k])));
  }
  draw();
  show(h('h1', {}, 'Insights'),
    h('p', { class: 'lead' }, 'Background, language, structure and poetry: what a reader of the original would have noticed.'), chips, list);
}

function viewInsight(id) {
  const i = insightById(id);
  if (!i) return viewInsights();
  const idx = DATA.insights.indexOf(i);
  show(
    h('p', {}, h('a', { href: '#/insights' }, '← All insights')),
    h('span', { class: 'badge' }, DATA.cats[i.category]), h('h1', {}, i.title),
    h('p', { class: 'muted' }, i.verses, ' · confidence: ', i.confidence),
    h('div', { class: 'layer' }, h('h2', {}, 'What to notice'), h('p', {}, i.insight)),
    h('div', { class: 'layer' }, h('h2', {}, 'Why it matters'), h('p', {}, i.whyItMatters)),
    h('div', { class: 'layer' }, h('h2', {}, 'Today'), h('p', {}, i.today)),
    i.safeguard && safeguard(i.safeguard),
    h('p', { class: 'weak' }, h('b', {}, 'Caveat: '), i.caveat),
    h('h2', {}, 'Sources'), sources(i.sources),
    h('div', { class: 'row' },
      idx > 0 ? h('a', { class: 'btn secondary', href: '#/insights/' + DATA.insights[idx - 1].id }, '← Previous') : null,
      idx < DATA.insights.length - 1 ? h('a', { class: 'btn secondary', href: '#/insights/' + DATA.insights[idx + 1].id }, 'Next →') : null));
}

function viewPlans() {
  show(h('h1', {}, 'Reading plans'),
    h('p', { class: 'lead' }, 'Read the text first. Then the short notes. Your progress stays on this device.'),
    h('div', { class: 'grid' }, DATA.plans.map(p => {
      const done = (store.get('plan.' + p.id, [])).length;
      return h('a', { class: 'card', href: '#/plans/' + p.id },
        h('span', { class: 'badge' }, p.audience + ' · ' + p.minutes),
        h('h3', {}, p.title), h('p', {}, p.description),
        h('p', {}, done + ' of ' + p.days.length + ' done'));
    })));
}

function viewPlan(id) {
  const p = DATA.plans.find(x => x.id === id);
  if (!p) return viewPlans();
  const done = store.get('plan.' + id, []);
  const bar = h('i', {});
  bar.style.width = (100 * done.length / p.days.length) + '%';
  show(h('p', {}, h('a', { href: '#/plans' }, '← All plans')),
    h('h1', {}, p.title), h('p', { class: 'lead' }, p.description),
    h('div', { class: 'progress', role: 'presentation' }, bar),
    h('p', { class: 'muted' }, done.length + ' of ' + p.days.length + ' done'),
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
  function sync() { btn.textContent = done.includes(n) ? '✓ Done (tap to undo)' : 'Mark as done'; btn.classList.toggle('secondary', done.includes(n)); }
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
    h('p', { class: 'muted' }, 'Read first: ', h('b', {}, d.passage), ' · ' + p.minutes),
    d.leaderNote ? h('div', { class: 'safe' }, h('b', {}, 'Note for the leader'), d.leaderNote) : null,
    d.sections.map(s => h('section', { class: 'reading' }, h('h2', {}, s.heading), s.text.map(t => h('p', {}, t)))),
    d.safeguard ? safeguard(d.safeguard) : null,
    h('h2', {}, d.questions.length > 1 ? 'Questions' : 'Question'),
    h('ul', { class: 'q' }, d.questions.map(q => h('li', {}, q))),
    h('div', { class: 'row' }, btn, d.finish ? h('a', { class: 'btn secondary', href: '#/quiz' }, d.finish) : null),
    (cards.length || ins.length) ? h('div', { class: 'deeper' },
      h('h2', {}, 'Go deeper'),
      h('p', { class: 'muted' }, 'Everything above rests on these entries. Each lists its sources and how far they have been checked.'),
      cards.length ? h('h3', {}, 'Myth cards') : null,
      cards.length ? h('ul', { class: 'links' }, cards.map(c => h('li', {}, badge(c.badge), ' ', h('a', { href: '#/myths/' + c.id }, c.title)))) : null,
      ins.length ? h('h3', {}, 'Insights') : null,
      ins.length ? h('ul', { class: 'links' }, ins.map(i => h('li', {}, h('a', { href: '#/insights/' + i.id }, i.title)))) : null) : null,
    h('div', { class: 'row' },
      n > 0 ? h('a', { class: 'btn secondary', href: '#/plans/' + id + '/' + (n - 1) }, '← ' + p.days[n - 1].title.split(':')[0]) : null,
      n < p.days.length - 1 ? h('a', { class: 'btn secondary', href: '#/plans/' + id + '/' + (n + 1) }, p.days[n + 1].title.split(':')[0] + ' →') : null));
}

function viewQuiz() {
  const best = store.get('quiz.best', null);
  show(h('h1', {}, 'Quiz'),
    h('p', { class: 'lead' }, 'Ten questions drawn from the myth cards and the insights. After each answer you see why, and where to read more.'),
    best != null ? h('p', {}, 'Your best score: ' + best + ' / 10') : null,
    h('div', { class: 'row' },
      h('button', { class: 'btn', type: 'button', onclick: () => runQuiz(shuffle(DATA.quiz).slice(0, 10)) }, 'Start (10 random)'),
      h('button', { class: 'btn secondary', type: 'button', onclick: () => runQuiz(DATA.quiz.filter(q => q.kind === 'card')) }, 'Myths only'),
      h('button', { class: 'btn secondary', type: 'button', onclick: () => runQuiz(DATA.quiz.filter(q => q.kind === 'insight')) }, 'Insights only')));
}

function runQuiz(qs) {
  let i = 0, score = 0; const missed = [];
  function step() {
    if (i >= qs.length) return finish();
    const q = qs[i];
    const box = h('div', {});
    const next = h('div', {});
    q.options.forEach((o, n) => box.append(h('button', { class: 'opt', type: 'button', onclick: () => {
      box.querySelectorAll('button').forEach((b, m) => { b.disabled = true; if (m === q.answer) b.classList.add('right'); else if (m === n) b.classList.add('wrong'); });
      if (n === q.answer) score++; else missed.push(q);
      const link = (q.kind === 'card' ? '#/myths/' : '#/insights/') + q.ref;
      next.append(h('p', {}, h('b', {}, n === q.answer ? 'Right. ' : 'Not quite. '), q.explain),
        h('div', { class: 'row' },
          h('a', { class: 'btn secondary', href: link }, 'Read more'),
          h('button', { class: 'btn', type: 'button', onclick: () => { i++; step(); } }, i + 1 < qs.length ? 'Next question' : 'See result')));
    } }, o)));
    show(h('p', { class: 'muted' }, 'Question ' + (i + 1) + ' of ' + qs.length), h('h1', {}, q.q), box, next);
  }
  function finish() {
    if (qs.length === 10 && score > (store.get('quiz.best', -1))) store.set('quiz.best', score);
    show(h('h1', {}, 'Result: ' + score + ' / ' + qs.length),
      missed.length ? h('div', {}, h('h2', {}, 'Worth another look'),
        h('ul', {}, missed.map(q => h('li', {}, h('a', { href: (q.kind === 'card' ? '#/myths/' : '#/insights/') + q.ref }, q.q))))) : h('p', {}, 'No misses.'),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: viewQuiz }, 'Back to quiz')));
  }
  step();
}

function viewHelp() {
  const li = (name, text) => h('li', {}, h('b', {}, name + ': '), text);
  show(h('h1', {}, 'Help and support'),
    h('div', { class: 'safe' }, h('b', {}, 'If you are in danger now'), 'Call your local emergency number.'),
    h('p', {}, 'Genesis 2–3 and 4 are sometimes used to say who should lead, who is to blame, or that a person must stay, forgive or submit. If a sentence like that is used on you to excuse control, humiliation, threats or violence, it is not what these chapters teach, and it is not your fault.'),
    h('h2', {}, 'Where to find help'),
    h('ul', {},
      li('United States', 'National Domestic Violence Hotline, 1-800-799-7233 (text START to 88788), thehotline.org'),
      li('United Kingdom', 'National Domestic Abuse Helpline, 0808 2000 247'),
      li('Germany', 'Hilfetelefon Gewalt gegen Frauen, 116 016, hilfetelefon.de'),
      li('Elsewhere', 'findahelpline.com lists services by country')),
    h('p', { class: 'note' }, 'Numbers were entered from memory on 2026-11-16 and must be re-checked before release. This app is not counselling.'),
    h('h2', {}, 'What these chapters do not say'),
    h('ul', {},
      h('li', {}, 'They do not give anyone the right to control, punish or silence a partner.'),
      h('li', {}, 'Genesis 3:16 describes what goes wrong between people. It is not a command.'),
      h('li', {}, 'God’s mercy to Cain (4:15) does not tell a victim to forgive or go back to someone who has not changed.'),
      h('li', {}, 'Both people in Genesis 3 are asked and held to account.')),
    h('p', {}, 'See the cards marked with a care note: ',
      DATA.cards.filter(c => c.safeguard).map(c => h('a', { href: '#/myths/' + c.id, class: 'chip-link' }, c.title + ' ')).flatMap(a => [a, ' · '])));
}

function viewAbout() {
  show(h('h1', {}, 'How this works'),
    h('p', {}, 'Each myth card separates three layers that popular retelling mixes up: what the text says, what tradition added, and what it means today. Insights cover the language, structure and background of the passages. Everything carries its sources.'),
    h('h2', {}, 'Verdicts'),
    h('ul', {}, Object.values(DATA.meta.badges).map(b => h('li', {}, h('b', {}, b.icon + ' ' + b.label + ': '), b.help))),
    h('h2', {}, 'Source labels'),
    h('ul', {}, Object.entries(DATA.meta.sourceKinds).map(([k, v]) => h('li', {}, h('b', {}, k + ': '), v))),
    h('p', {}, 'This is a draft. Research was done with secondary sources. Entries show where primary lexicons, commentaries and texts still have to be checked. If you find an error, it will be corrected openly.'),
    h('p', {}, 'Bible quotations are paraphrases or short quotes for study. Always check them in your own translation.'));
}

/* ---------- router ---------- */
function route() {
  if (!DATA.cards) return;
  const [, area = 'home', id, sub] = (location.hash || '#/').split('/');
  setNav({ myths: 'myths', insights: 'insights', plans: 'plans', quiz: 'quiz', help: 'help' }[area] || null);
  if (area === 'myths') return id ? viewCard(id) : viewMyths();
  if (area === 'insights') return id ? viewInsight(id) : viewInsights();
  if (area === 'plans') return id ? (sub != null ? viewPlanDay(id, Number(sub)) : viewPlan(id)) : viewPlans();
  if (area === 'quiz') return viewQuiz();
  if (area === 'help') return viewHelp();
  if (area === 'about') return viewAbout();
  return viewHome();
}

async function boot() {
  try {
    const [c, i, p, q] = await Promise.all(['cards', 'insights', 'plans', 'quiz'].map(n => fetch('content/' + n + '.json').then(r => { if (!r.ok) throw new Error(n); return r.json(); })));
    DATA.meta = c.meta; DATA.cards = c.cards.sort((a, b) => a.order - b.order);
    DATA.cats = i.categories; DATA.insights = i.insights.sort((a, b) => a.order - b.order);
    DATA.plans = p.plans; DATA.quiz = q.questions;
    window.addEventListener('hashchange', route);
    route();
  } catch (e) {
    $app.replaceChildren(h('p', {}, 'Could not load the content. If you opened the file directly, serve the folder with a small web server (see README).'));
  }
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
