// Content generators and difficulty tuning for the memory games. Every duration,
// grid size and count lives in PARAMS so tuning is a one-file job.

import { wordBank, getPool, shuffle, pickRandom, firstDef, norm } from './bank'

// --- difficulty params -------------------------------------------------------

export const PARAMS = {
  wordspan: {
    medium: { start: 3, reverse: false, onMs: 900, offMs: 250, extraTiles: 3 },
    hard: { start: 3, reverse: true, onMs: 750, offMs: 200, extraTiles: 4 },
  },
  gridflash: {
    medium: { start: 3, reverse: false, size: 4, onMs: 600, offMs: 200 },
    hard: { start: 3, reverse: true, size: 5, onMs: 500, offMs: 160 },
  },
  matrix: {
    medium: { start: 3, size: 4, studyMs: 2500 },
    hard: { start: 4, size: 5, studyMs: 1800 },
  },
  lexicon: {
    medium: { studyCount: 10, studyMs: 15000, semanticLures: false },
    hard: { studyCount: 10, studyMs: 10000, semanticLures: true },
  },
  concentration: {
    medium: { pairs: 6, cols: 3, moveLimit: 20, mode: 'definition' },
    hard: { pairs: 8, cols: 4, moveLimit: 22, mode: 'synonym' },
  },
  pairbond: {
    medium: { pairs: 6, studyMs: 20000, interferenceMs: 8000, studiedDistractors: false },
    hard: { pairs: 6, studyMs: 14000, interferenceMs: 8000, studiedDistractors: true },
  },
}

export const paramsFor = (gameId, difficulty) => PARAMS[gameId][difficulty]

// --- word content ------------------------------------------------------------

// `count` distinct words from the difficulty tier with the given flag.
export function memoryWords(difficulty, count, flag = 'canDefinition') {
  return shuffle(getPool(difficulty, flag)).slice(0, count)
}

// Recognition-test distractors. On medium they're unrelated words; on hard they
// come from the studied words' own synonym/antonym lists, so a lure feels like
// something you just read. Falls back to unrelated words if the semantic well
// runs dry — the bank caps syns/ants at 8 each, but short lists happen.
export function lureWords(studied, difficulty, count) {
  const taken = new Set(studied.map((w) => norm(w.word)))
  const lures = []
  const push = (label) => {
    const key = norm(label)
    if (taken.has(key)) return
    taken.add(key)
    lures.push(label)
  }

  if (PARAMS.lexicon[difficulty].semanticLures) {
    const related = shuffle(studied.flatMap((w) => [...w.synonyms, ...w.antonyms]))
    for (const label of related) {
      if (lures.length >= count) break
      push(label)
    }
  }

  const filler = shuffle(getPool(difficulty, 'canDefinition'))
  for (const w of filler) {
    if (lures.length >= count) break
    push(w.word)
  }
  for (const w of shuffle(wordBank)) {
    if (lures.length >= count) break
    push(w.word)
  }
  return lures.slice(0, count)
}

// A Concentration card is a small square. Definitions run to 245 characters in
// the bank, which is unreadable at that size, so prefer short ones — there are
// 400+ under this cap per tier, far more than the 8 a board needs.
const CARD_TEXT_MAX = 60

// Word ↔ meaning pairs for Concentration. `mode` picks which face the partner
// card shows: the definition (readable, medium) or a synonym (a looser link you
// can't skim your way through, hard).
export function meaningPairs(difficulty, count, mode) {
  const flag = mode === 'synonym' ? 'canSynonym' : 'canDefinition'
  const usable = shuffle(getPool(difficulty, flag)).filter((w) =>
    mode === 'synonym' ? w.synonyms.length > 0 : Boolean(firstDef(w)),
  )
  const short = usable.filter((w) => mode === 'synonym' || firstDef(w).length <= CARD_TEXT_MAX)
  // Fall back to the unfiltered pool rather than short-changing the board.
  const pool = short.length >= count ? short : usable

  return pool.slice(0, count).map((w) => ({
    word: w.word,
    partOfSpeech: w.partOfSpeech,
    meaning: mode === 'synonym' ? pickRandom(w.synonyms) : firstDef(w),
  }))
}

// --- abstract grid content ---------------------------------------------------

const cellCount = (size) => size * size

// `len` distinct cell indexes in presentation order (Grid Flash).
export function randomSequence(size, len) {
  const all = shuffle([...Array(cellCount(size)).keys()])
  return all.slice(0, Math.min(len, all.length))
}

// `n` distinct cell indexes as an unordered set (Pattern Matrix).
export function randomCells(size, n) {
  return new Set(randomSequence(size, n))
}

export const sameCellSet = (a, b) => a.size === b.size && [...a].every((v) => b.has(v))
