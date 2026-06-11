// Build-time pipeline: fetch Merriam-Webster Dictionary + Thesaurus data for the
// curated seed list and bake a static word bank the app reads at runtime.
//
// Run:  npm run build:wordbank   (loads keys from .env in project root)
//
// Caching: results are stored in scripts/wordbank-cache.json (gitignored). A
// re-run only fetches seed words not already in the cache, so growing the seed
// list is cheap and the per-run work shrinks to just the new words. The cache
// also remembers "skips" (words with no usable data) so they aren't re-fetched.
//
// Daily budget: MW's free tier allows 1000 queries/day per reference. Each word
// costs one Dictionary + one Thesaurus query, so a run fetches at most
// WORDBANK_DAILY_LIMIT new words (default 900). If more remain, run again the
// next day — the cache picks up where it left off.
//
// Needs Node 18+ (global fetch). Keys: MW_DICT_KEY, MW_THESAURUS_KEY.
// Output: src/data/wordBank.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SEED_PATH = join(ROOT, 'scripts', 'seed-words.json')
const CACHE_PATH = join(ROOT, 'scripts', 'wordbank-cache.json')
const OUT_PATH = join(ROOT, 'src', 'data', 'wordBank.json')
const TIERS = ['easy', 'medium', 'hard']
const DAILY_LIMIT = Number(process.env.WORDBANK_DAILY_LIMIT) || 900

// --- tiny .env loader (avoids a dependency; ignores missing file) ---
function loadEnv() {
  const path = join(ROOT, '.env')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const DICT_KEY = process.env.MW_DICT_KEY
const THES_KEY = process.env.MW_THESAURUS_KEY
if (!DICT_KEY || !THES_KEY) {
  console.error(
    '\nMissing API keys. Copy .env.example to .env and add MW_DICT_KEY and MW_THESAURUS_KEY.\n' +
      'Register free keys (one Dictionary, one Thesaurus) at https://dictionaryapi.com/\n',
  )
  process.exit(1)
}

const DICT_URL = (w) =>
  `https://www.dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(w)}?key=${DICT_KEY}`
const THES_URL = (w) =>
  `https://www.dictionaryapi.com/api/v3/references/thesaurus/json/${encodeURIComponent(w)}?key=${THES_KEY}`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Throws on non-OK / unparseable responses — callers treat these as transient
// (e.g. daily quota hit) and abort the run rather than caching a bad result.
async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// --- MW markup cleanup -------------------------------------------------------
// MW embeds tokens like {it}..{/it}, {bc}, {sx|word||}, {ldquo}. Strip/normalize.
function cleanText(s) {
  if (typeof s !== 'string') return ''
  return s
    .replace(/\{ldquo\}/g, '“')
    .replace(/\{rdquo\}/g, '”')
    .replace(/\{bc\}/g, '')
    // token links: keep the displayed word (first field after the pipe)
    .replace(/\{(?:sx|dx_def|dxt|a_link|d_link|i_link|et_link|mat)\|([^|}]*)[^}]*\}/g, '$1')
    // any remaining paired or single brace tokens
    .replace(/\{\/?[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Recursively collect every verbal-illustration (`vis`) sentence in an entry.
function collectVis(node, out) {
  if (Array.isArray(node)) {
    if (node[0] === 'vis' && Array.isArray(node[1])) {
      for (const v of node[1]) if (v && v.t) out.push(cleanText(v.t))
    } else {
      for (const child of node) collectVis(child, out)
    }
  } else if (node && typeof node === 'object') {
    for (const v of Object.values(node)) collectVis(v, out)
  }
}

// Blank the headword (and simple inflections) out of an example sentence.
// Returns the blanked sentence, or null if the word never appeared.
function blankWord(sentence, word) {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b${esc}(s|es|ed|ing|d|ly|er|est)?\\b`, 'gi')
  if (!re.test(sentence)) return null
  return sentence.replace(re, '———') // ———
}

function pickEntry(entries, word) {
  if (!Array.isArray(entries) || !entries.length || typeof entries[0] !== 'object') return null
  const exact = entries.find((e) => (e?.meta?.id || '').split(':')[0].toLowerCase() === word.toLowerCase())
  return exact || entries[0]
}

// Fetch + normalize one word. Returns { entry } on success or { skip, reason }
// when the word has no usable data. Throws on transient network/HTTP errors so
// the caller can abort and resume later without caching a bad result. The
// returned entry has no `difficulty` — that's applied from the seed at assembly.
async function fetchWord(word) {
  const dict = await getJson(DICT_URL(word)) // transient errors propagate
  await sleep(120)
  const thes = await getJson(THES_URL(word)) // transient errors propagate

  const entry = pickEntry(dict, word)
  if (!entry) return { skip: true, reason: 'no-entry' }

  const definitions = (entry.shortdef || [])
    .map(cleanText)
    // MW appends ": such as" / trailing colons when subsenses follow — drop them.
    .map((d) => d.replace(/\s*:\s*such as\s*$/i, '').replace(/\s*:\s*$/, '').trim())
    .filter(Boolean)
  if (!definitions.length) return { skip: true, reason: 'no-def' }

  const rawVis = []
  collectVis(entry.def, rawVis)
  const examples = rawVis.map((s) => blankWord(s, word)).filter(Boolean).slice(0, 3)

  const tEntry = pickEntry(thes, word)
  const synonyms = []
  const antonyms = []
  if (tEntry?.meta) {
    for (const group of tEntry.meta.syns || []) for (const w of group) synonyms.push(w)
    for (const group of tEntry.meta.ants || []) for (const w of group) antonyms.push(w)
  }
  const dedupe = (arr) => [...new Set(arr.map((w) => w.toLowerCase()))]

  return {
    entry: {
      word,
      partOfSpeech: cleanText(entry.fl || ''),
      definitions,
      examples,
      synonyms: dedupe(synonyms).slice(0, 8),
      antonyms: dedupe(antonyms).slice(0, 8),
      canSentence: examples.length > 0,
      canDefinition: true,
      canSynonym: synonyms.length > 0,
    },
  }
}

// Ordered, de-duplicated [{ word, tier }] from the seed (first tier wins).
function loadSeed() {
  const seed = JSON.parse(readFileSync(SEED_PATH, 'utf8'))
  const out = []
  const seen = new Set()
  for (const tier of TIERS) {
    for (const raw of seed[tier] || []) {
      const word = raw.trim().toLowerCase()
      if (!word || seen.has(word)) continue
      seen.add(word)
      out.push({ word, tier })
    }
  }
  return out
}

// Load the fetch cache. If absent, seed it from a previously-built wordBank.json
// so already-shipped words are never re-fetched after a cache wipe.
function loadCache() {
  if (existsSync(CACHE_PATH)) return JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
  const cache = {}
  if (existsSync(OUT_PATH)) {
    for (const e of JSON.parse(readFileSync(OUT_PATH, 'utf8'))) {
      const { difficulty, ...rest } = e // difficulty comes from the seed, not the cache
      cache[e.word] = rest
    }
    console.log(`Migrated ${Object.keys(cache).length} existing words into a new cache.`)
  }
  return cache
}

const saveCache = (cache) => writeFileSync(CACHE_PATH, JSON.stringify(cache))

async function main() {
  const seed = loadSeed()
  const cache = loadCache()

  const toFetch = seed.filter(({ word }) => !(word in cache))
  const fetchNow = toFetch.slice(0, DAILY_LIMIT)
  const deferred = toFetch.length - fetchNow.length

  console.log(`Seed: ${seed.length} words | cached: ${seed.length - toFetch.length} | to fetch: ${toFetch.length}`)
  if (fetchNow.length) console.log(`Fetching up to ${fetchNow.length} new word(s) this run (daily limit ${DAILY_LIMIT})...\n`)

  let fetched = 0
  let aborted = false
  for (const { word } of fetchNow) {
    try {
      const res = await fetchWord(word)
      cache[word] = res.entry ?? { skip: true, reason: res.reason }
      process.stdout.write(res.entry ? '.' : 'x')
    } catch (e) {
      console.warn(`\n! fetch error on "${word}" (${e.message}) — likely the daily quota. Saving progress and stopping.`)
      aborted = true
      break
    }
    fetched++
    if (fetched % 25 === 0) saveCache(cache)
    await sleep(120)
  }
  saveCache(cache)

  // Assemble the shipped bank from the cache, applying difficulty from the seed.
  const bank = []
  for (const { word, tier } of seed) {
    const c = cache[word]
    if (c && !c.skip) bank.push({ ...c, difficulty: tier })
  }
  writeFileSync(OUT_PATH, JSON.stringify(bank, null, 0) + '\n')

  const stat = (flag) => bank.filter((e) => e[flag]).length
  console.log(`\n\nWrote ${bank.length} words to ${OUT_PATH}`)
  console.log(`  fetched this run:    ${fetched}`)
  console.log(`  sentence-eligible:   ${stat('canSentence')}`)
  console.log(`  synonym-eligible:    ${stat('canSynonym')}`)
  for (const tier of TIERS) console.log(`  ${tier}: ${bank.filter((e) => e.difficulty === tier).length}`)
  const remaining = deferred + (aborted ? fetchNow.length - fetched : 0)
  if (remaining > 0) console.log(`\n${remaining} seed word(s) still need fetching — run \`npm run build:wordbank\` again.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
