# Eden Check: Genesis 1–4

A small, offline-capable web app (PWA). It has:

- **Myths**: 22 common claims about Genesis 1–4, each split into *Text / Tradition / Today*,
  with a verdict badge (🔴 checkable error, 🟠 contested, 🟡 tradition, 🟢 solid), the weakest
  joint of the argument and a source list.
- **Insights**: 12 notes on language, poetic structure, ancient background and echoes
  elsewhere in the Bible.
- **Plans**: a 7-day personal plan and a 4-evening small-group plan.
- **Quiz**: 24 questions, played 10 at a time.
- **Help**: a care page with support lines and what these chapters do not say.

No build step, no dependencies, no tracking.

## Run it

```
node scripts/serve.mjs   # then open http://localhost:8080/ (or: python -m http.server 8080)
node scripts/validate.mjs
```

Opening `index.html` directly will not work: the browser blocks `fetch` on `file://`.

## Content

All content is JSON in `web/content/`:

| File | Contents |
|---|---|
| `cards.json` | myth cards, verdict badges, source kinds |
| `insights.json` | insights with categories |
| `plans.json` | reading plans (each day is a guided reading with sections, questions, and “go deeper” links to cards and insights) |
| `quiz.json` | questions linked to a card or insight |

`scripts/validate.mjs` refuses cards without sources, broken cross-references and bad quiz
answers, and lists sources still marked `primary-todo`.

## Rules

1. No entry without a source. Mark honestly what was checked (`text`, `secondary`, `primary-todo`).
2. Keep **Text**, **Tradition** and **Today** apart. Imagination must not look like exegesis.
3. State the weakest joint on every card.
4. Contested readings: show both sides and who holds them.
5. Read [SAFEGUARD.md](SAFEGUARD.md) before touching a card on gender, blame, authority or
   forgiveness.

## Status

Draft 0.1. Content was researched on 2026-11-16 from secondary sources. Entries marked
`primary-todo` need a check in the original lexicon, commentary or text before publishing.
See `docs/research-log.md` for the corrections found while verifying the first critique.
