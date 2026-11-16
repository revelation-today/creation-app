// Content gate. Run: node scripts/validate.mjs
// Fails if a card or insight has no source, a broken cross-reference, a bad quiz answer,
// or if a translation does not match the English structure (same ids, same references, same answers).
import { readFileSync, existsSync } from 'node:fs';
const LANGS = ['en', 'de'];
const errors = [], warnings = [];
const err = m => errors.push(m);
const load = (lang, f) => JSON.parse(readFileSync(new URL('../web/content/' + (lang === 'en' ? '' : lang + '/') + f, import.meta.url), 'utf8'));
const words = a => a.join(' ').split(/\s+/).length;
const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

const sets = {};
for (const lang of LANGS) {
  const tag = lang + ': ';
  const cards = load(lang, 'cards.json'), ins = load(lang, 'insights.json'), plans = load(lang, 'plans.json'), quiz = load(lang, 'quiz.json');
  sets[lang] = { cards, ins, plans, quiz };
  const cardIds = new Set(cards.cards.map(c => c.id)), insIds = new Set(ins.insights.map(i => i.id));
  const badges = new Set(Object.keys(cards.meta.badges)), kinds = new Set(Object.keys(cards.meta.sourceKinds));

  for (const c of cards.cards) {
    for (const f of ['id', 'title', 'claim', 'badge', 'verses', 'text', 'tradition', 'today', 'weakestJoint', 'confidence', 'lastChecked']) if (!c[f]) err(`${tag}card ${c.id}: missing ${f}`);
    if (!badges.has(c.badge)) err(`${tag}card ${c.id}: unknown badge ${c.badge}`);
    if (!c.sources?.length) err(`${tag}card ${c.id}: no sources`);
    for (const s of c.sources || []) if (!kinds.has(s.kind)) err(`${tag}card ${c.id}: bad source kind ${s.kind}`);
    if (c.sources?.every(s => s.kind === 'primary-todo')) err(`${tag}card ${c.id}: only unchecked sources`);
    if (lang === 'en' && c.sources?.some(s => s.kind === 'primary-todo')) warnings.push(`card ${c.id}: has primary sources still to check`);
  }
  for (const i of ins.insights) {
    for (const f of ['id', 'title', 'category', 'verses', 'insight', 'whyItMatters', 'today', 'confidence', 'caveat']) if (!i[f]) err(`${tag}insight ${i.id}: missing ${f}`);
    if (!ins.categories[i.category]) err(`${tag}insight ${i.id}: unknown category`);
    if (!i.sources?.length) err(`${tag}insight ${i.id}: no sources`);
    if (lang === 'en' && i.sources?.some(s => s.kind === 'primary-todo')) warnings.push(`insight ${i.id}: has primary sources still to check`);
  }
  for (const p of plans.plans) for (const d of p.days) {
    const where = `${tag}plan ${p.id}/${d.title}`;
    if (!d.story?.text?.length) err(`${where}: no story`);
    if (!d.layout?.text?.length) err(`${where}: no passage layout`);
    if ((d.discoveries || []).length < 3) err(`${where}: needs at least 3 discoveries`);
    if (!d.apply?.bullets?.length || !d.apply?.questions?.length) err(`${where}: needs apply bullets and a question`);
    const n = words([...(d.story?.text || []), ...(d.layout?.text || []), ...(d.discoveries || []).flatMap(x => x.text)]);
    if (n < 250) err(`${where}: reading too short (${n} words)`);
    for (const c of d.cards || []) if (!cardIds.has(c)) err(`${where}: unknown card ${c}`);
    for (const i of d.insights || []) if (!insIds.has(i)) err(`${where}: unknown insight ${i}`);
  }
  for (const q of quiz.questions) {
    const set = q.kind === 'card' ? cardIds : insIds;
    if (!set.has(q.ref)) err(`${tag}quiz ${q.id}: unknown ref ${q.ref}`);
    if (!(q.answer >= 0 && q.answer < q.options.length)) err(`${tag}quiz ${q.id}: answer out of range`);
    if (!q.explain) err(`${tag}quiz ${q.id}: missing explanation`);
  }
  console.log(`${lang}: ${cards.cards.length} cards, ${ins.insights.length} insights, ${plans.plans.length} plans, ${quiz.questions.length} questions`);
}

// Translations must mirror the English structure.
const en = sets.en;
for (const lang of LANGS.filter(l => l !== 'en')) {
  const tr = sets[lang], tag = lang + ': ';
  const ids = (a, b, what) => { if (!sameList(a.map(x => x.id), b.map(x => x.id))) err(`${tag}${what}: ids differ from English`); };
  ids(en.cards.cards, tr.cards.cards, 'cards'); ids(en.ins.insights, tr.ins.insights, 'insights'); ids(en.quiz.questions, tr.quiz.questions, 'quiz'); ids(en.plans.plans, tr.plans.plans, 'plans');
  const trCard = Object.fromEntries(tr.cards.cards.map(c => [c.id, c])), trIns = Object.fromEntries(tr.ins.insights.map(c => [c.id, c]));
  for (const c of en.cards.cards) { const t = trCard[c.id]; if (!t) continue;
    if (t.badge !== c.badge || t.order !== c.order) err(`${tag}card ${c.id}: badge or order differs`);
    if (!!t.safeguard !== !!c.safeguard) err(`${tag}card ${c.id}: care note missing or extra`);
    if (t.sources.length !== c.sources.length || t.sources.some((s, i) => s.kind !== c.sources[i].kind || (s.url || '') !== (c.sources[i].url || ''))) err(`${tag}card ${c.id}: sources differ`); }
  for (const i of en.ins.insights) { const t = trIns[i.id]; if (!t) continue;
    if (t.category !== i.category || t.order !== i.order) err(`${tag}insight ${i.id}: category or order differs`);
    if (!!t.safeguard !== !!i.safeguard) err(`${tag}insight ${i.id}: care note missing or extra`);
    if (t.sources.length !== i.sources.length) err(`${tag}insight ${i.id}: sources differ`); }
  for (const q of en.quiz.questions) { const t = tr.quiz.questions.find(x => x.id === q.id); if (!t) continue;
    if (t.answer !== q.answer || t.ref !== q.ref || t.kind !== q.kind || t.options.length !== q.options.length) err(`${tag}quiz ${q.id}: answer, ref or options differ`); }
  for (const p of en.plans.plans) { const t = tr.plans.plans.find(x => x.id === p.id); if (!t) continue;
    if (t.days.length !== p.days.length) { err(`${tag}plan ${p.id}: number of days differs`); continue; }
    p.days.forEach((d, n) => { const u = t.days[n], w = `${tag}plan ${p.id} day ${n + 1}`;
      if (!sameList(d.cards || [], u.cards || []) || !sameList(d.insights || [], u.insights || [])) err(`${w}: card or insight references differ`);
      if (d.discoveries.length !== u.discoveries.length) err(`${w}: number of discoveries differs`);
      if (d.apply.bullets.length !== u.apply.bullets.length || d.apply.questions.length !== u.apply.questions.length) err(`${w}: apply items differ`);
      if (!!d.safeguard !== !!u.safeguard || !!d.leaderNote !== !!u.leaderNote || !!d.finish !== !!u.finish || !!d.quickCheck !== !!u.quickCheck) err(`${w}: care note, leader note, finish or quick check missing or extra`); }); }
  for (const f of ['privacy-' + lang + '.html', 'support-' + lang + '.html']) if (!existsSync(new URL('../' + f, import.meta.url))) err(`${tag}missing ${f}`);
}

for (const w of warnings) console.log('  todo: ' + w);
if (errors.length) { console.error('\nERRORS:\n' + errors.map(e => '  ' + e).join('\n')); process.exit(1); }
console.log('OK');
