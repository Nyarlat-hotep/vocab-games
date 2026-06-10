// Build-time pipeline: fetch Merriam-Webster Dictionary + Thesaurus data for the
// curated seed list and bake a static word bank the app reads at runtime.
//
// Run:  npm run build:wordbank   (loads keys from .env in project root)
//
// Needs Node 18+ (global fetch). Keys: MW_DICT_KEY, MW_THESAURUS_KEY.
// Output: src/data/wordBank.json

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

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

async function buildWord(word, difficulty) {
  let dict, thes
  try {
    dict = await getJson(DICT_URL(word))
  } catch (e) {
    console.warn(`  ! dict fetch failed for "${word}": ${e.message}`)
    return null
  }
  await sleep(120)
  try {
    thes = await getJson(THES_URL(word))
  } catch {
    thes = []
  }

  const entry = pickEntry(dict, word)
  if (!entry) {
    console.warn(`  - no dictionary entry for "${word}" (suggestions only) — skipped`)
    return null
  }

  const definitions = (entry.shortdef || []).map(cleanText).filter(Boolean)
  if (!definitions.length) {
    console.warn(`  - no definitions for "${word}" — skipped`)
    return null
  }

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
    word,
    difficulty,
    partOfSpeech: cleanText(entry.fl || ''),
    definitions,
    examples,
    synonyms: dedupe(synonyms).slice(0, 8),
    antonyms: dedupe(antonyms).slice(0, 8),
    canSentence: examples.length > 0,
    canDefinition: true,
    canSynonym: synonyms.length > 0,
  }
}

async function main() {
  const seed = JSON.parse(readFileSync(join(ROOT, 'scripts', 'seed-words.json'), 'utf8'))
  const tiers = ['easy', 'medium', 'hard']
  const bank = []

  for (const tier of tiers) {
    const words = seed[tier] || []
    console.log(`\n=== ${tier} (${words.length} words) ===`)
    for (const word of words) {
      const entry = await buildWord(word.trim().toLowerCase(), tier)
      if (entry) {
        bank.push(entry)
        process.stdout.write('.')
      }
      await sleep(120)
    }
  }

  const outDir = join(ROOT, 'src', 'data')
  const outPath = join(outDir, 'wordBank.json')
  writeFileSync(outPath, JSON.stringify(bank, null, 0) + '\n')

  const stat = (flag) => bank.filter((e) => e[flag]).length
  console.log(`\n\nWrote ${bank.length} words to ${outPath}`)
  console.log(`  sentence-eligible:   ${stat('canSentence')}`)
  console.log(`  synonym-eligible:    ${stat('canSynonym')}`)
  for (const tier of tiers) console.log(`  ${tier}: ${bank.filter((e) => e.difficulty === tier).length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
