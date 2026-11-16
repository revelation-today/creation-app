// Content gate. Run: node scripts/validate.mjs
// Fails if a card or insight has no source, a broken cross-reference, or a bad quiz answer.
import { readFileSync } from 'node:fs';
const load = f => JSON.parse(readFileSync(new URL('../web/content/' + f, import.meta.url), 'utf8'));
const cards = load('cards.json'), ins = load('insights.json'), plans = load('plans.json'), quiz = load('quiz.json');
const errors = [], warnings = [];
const err = m => errors.push(m);
const cardIds = new Set(cards.cards.map(c => c.id)), insIds = new Set(ins.insights.map(i => i.id));
const badges = new Set(Object.keys(cards.meta.badges)), kinds = new Set(Object.keys(cards.meta.sourceKinds));

for (const c of cards.cards) {
  for (const f of ['id', 'title', 'claim', 'badge', 'verses', 'text', 'tradition', 'today', 'weakestJoint', 'confidence', 'lastChecked']) if (!c[f]) err(`card ${c.id}: missing ${f}`);
  if (!badges.has(c.badge)) err(`card ${c.id}: unknown badge ${c.badge}`);
  if (!c.sources?.length) err(`card ${c.id}: no sources`);
  for (const s of c.sources || []) if (!kinds.has(s.kind)) err(`card ${c.id}: bad source kind ${s.kind}`);
  if (c.sources?.every(s => s.kind === 'primary-todo')) err(`card ${c.id}: only unchecked sources`);
  if (c.sources?.some(s => s.kind === 'primary-todo')) warnings.push(`card ${c.id}: has primary sources still to check`);
}
for (const i of ins.insights) {
  for (const f of ['id', 'title', 'category', 'verses', 'insight', 'whyItMatters', 'today', 'confidence', 'caveat']) if (!i[f]) err(`insight ${i.id}: missing ${f}`);
  if (!ins.categories[i.category]) err(`insight ${i.id}: unknown category`);
  if (!i.sources?.length) err(`insight ${i.id}: no sources`);
  if (i.sources?.some(s => s.kind === 'primary-todo')) warnings.push(`insight ${i.id}: has primary sources still to check`);
}
for (const p of plans.plans) for (const d of p.days) {
  if (!d.sections?.length) err(`plan ${p.id}/${d.title}: no reading sections`);
  const words = (d.sections || []).flatMap(s => s.text).join(' ').split(/\s+/).length;
  if (words < 250) err(`plan ${p.id}/${d.title}: reading too short (${words} words)`);
  if (!d.questions?.length) err(`plan ${p.id}/${d.title}: no questions`);
  for (const c of d.cards || []) if (!cardIds.has(c)) err(`plan ${p.id}/${d.title}: unknown card ${c}`);
  for (const i of d.insights || []) if (!insIds.has(i)) err(`plan ${p.id}/${d.title}: unknown insight ${i}`);
}
for (const q of quiz.questions) {
  const set = q.kind === 'card' ? cardIds : insIds;
  if (!set.has(q.ref)) err(`quiz ${q.id}: unknown ref ${q.ref}`);
  if (!(q.answer >= 0 && q.answer < q.options.length)) err(`quiz ${q.id}: answer out of range`);
  if (!q.explain) err(`quiz ${q.id}: missing explanation`);
}
console.log(`${cards.cards.length} cards, ${ins.insights.length} insights, ${plans.plans.length} plans, ${quiz.questions.length} questions`);
for (const w of warnings) console.log('  todo: ' + w);
if (errors.length) { console.error('\nERRORS:\n' + errors.map(e => '  ' + e).join('\n')); process.exit(1); }
console.log('OK');
