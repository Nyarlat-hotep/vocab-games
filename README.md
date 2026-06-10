# Vocab Games

Quick vocabulary-practice games. Surface a word, then play one of three modes:

- **Sentence Fit** — pick the sentence the word correctly completes.
- **Definition Match** — match the word to its meaning.
- **Synonym Pick** — choose the closest synonym.

Words are tagged **easy / medium / hard**. Score and per-game best are tracked locally.

## How the data works

Word data comes from the [Merriam-Webster Dictionary & Thesaurus APIs](https://dictionaryapi.com/), but **the app never calls the API at runtime.** A build-time script fetches data for a curated word list once and bakes it into a static `src/data/wordBank.json`. The shipped app reads only that file — no API key, no rate limits, works offline.

This sidesteps two MW constraints: there's no random-word endpoint (so we supply the list), and the free tier is capped at 1,000 queries/day per reference with a key that can't be hidden in a static site.

### Rebuilding the word bank

1. Register two free keys at [dictionaryapi.com](https://dictionaryapi.com/) — one **Collegiate Dictionary**, one **Collegiate Thesaurus**.
2. `cp .env.example .env` and fill in `MW_DICT_KEY` and `MW_THESAURUS_KEY` (gitignored, never shipped).
3. Edit the curated list in `scripts/seed-words.json` (grouped by difficulty).
4. `npm run build:wordbank` — writes `src/data/wordBank.json`.

The repo ships with a small placeholder bank so the app runs before you generate the full one.

## Development

```bash
npm install
npm run dev      # local dev server
npm run build    # production build
npm run lint
```

## Deployment

Push to `main`; GitHub Actions builds and publishes to the `gh-pages` branch. The Vite `base` is `/vocab-games/`.

## Tech

React + Vite, plain CSS, no runtime backend.
