// Single source of truth for gameplay data. Reads the static word bank baked at
// build time and exposes helpers all three games share. No network, no API key.

import wordBank from '../data/wordBank.json'

export const DIFFICULTIES = ['easy', 'medium', 'hard']

export const GAMES = {
  sentence: { id: 'sentence', name: 'Sentence Fit', flag: 'canSentence', blurb: 'Pick the sentence the word completes.' },
  definition: { id: 'definition', name: 'Definition Match', flag: 'canDefinition', blurb: 'Match the word to its meaning.' },
  synonym: { id: 'synonym', name: 'Synonym Pick', flag: 'canSynonym', blurb: 'Choose the closest synonym.' },
}

export const ROUND_LENGTH = 10
const OPTIONS = 4

// Fisher–Yates shuffle (returns a new array).
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Words at the given difficulty with the game's eligibility flag set. Falls back
// to all difficulties if a single tier can't fill an option set.
export function getPool(difficulty, flag) {
  const tier = wordBank.filter((w) => w.difficulty === difficulty && w[flag])
  if (tier.length >= OPTIONS) return tier
  return wordBank.filter((w) => w[flag])
}

// Draw `n` distinct entries from `pool` excluding the target word.
function sampleDistractors(pool, excludeWord, n) {
  const others = shuffle(pool.filter((w) => w.word !== excludeWord))
  return others.slice(0, n)
}

const firstDef = (w) => w.definitions[0]

function frame(target) {
  return { word: target.word, partOfSpeech: target.partOfSpeech, definition: firstDef(target) }
}

// --- per-game question builders ---------------------------------------------
// Each returns { ...frame, prompt, options:[{label, correct}] }.

export function makeSentenceQuestion(difficulty) {
  const pool = getPool(difficulty, 'canSentence')
  const target = pickRandom(pool)
  const distractors = sampleDistractors(pool, target.word, OPTIONS - 1)
  const options = shuffle([
    { label: target.examples[0], correct: true },
    ...distractors.map((d) => ({ label: d.examples[0], correct: false })),
  ])
  return { ...frame(target), prompt: 'Which sentence does this word complete?', options }
}

export function makeDefinitionQuestion(difficulty) {
  const pool = getPool(difficulty, 'canDefinition')
  const target = pickRandom(pool)
  const distractors = sampleDistractors(pool, target.word, OPTIONS - 1)
  const options = shuffle([
    { label: firstDef(target), correct: true },
    ...distractors.map((d) => ({ label: firstDef(d), correct: false })),
  ])
  // Prompt shows the word itself, so don't repeat the definition in the frame.
  return { word: target.word, partOfSpeech: target.partOfSpeech, definition: null, prompt: 'What does this word mean?', options }
}

export function makeSynonymQuestion(difficulty) {
  const pool = getPool(difficulty, 'canSynonym')
  const target = pickRandom(pool)
  const correct = pickRandom(target.synonyms)
  // Distractors are unrelated words — never the target's own synonyms/antonyms.
  const related = new Set([target.word, correct, ...target.synonyms, ...target.antonyms].map((s) => s.toLowerCase()))
  const eligible = (w) => !related.has(w.word.toLowerCase())
  // Prefer same-tier words, then top up from the whole bank so we always reach
  // OPTIONS-1 distractors even when the tier is small and many words are related.
  const tierFirst = [...shuffle(getPool(difficulty, 'canDefinition').filter(eligible)), ...shuffle(wordBank.filter(eligible))]
  const distractors = []
  const used = new Set()
  for (const w of tierFirst) {
    if (used.has(w.word)) continue
    used.add(w.word)
    distractors.push(w.word)
    if (distractors.length === OPTIONS - 1) break
  }
  const options = shuffle([
    { label: correct, correct: true },
    ...distractors.map((label) => ({ label, correct: false })),
  ])
  return { ...frame(target), prompt: 'Which word is the closest synonym?', options }
}

const BUILDERS = {
  sentence: makeSentenceQuestion,
  definition: makeDefinitionQuestion,
  synonym: makeSynonymQuestion,
}

// A full round: `count` questions for the chosen game + difficulty, avoiding
// back-to-back repeats of the same target word.
export function buildRound(gameId, difficulty, count = ROUND_LENGTH) {
  const build = BUILDERS[gameId]
  const questions = []
  let lastWord = null
  let guard = 0
  while (questions.length < count && guard < count * 20) {
    guard++
    const q = build(difficulty)
    if (q.word === lastWord) continue
    lastWord = q.word
    questions.push(q)
  }
  return questions
}
