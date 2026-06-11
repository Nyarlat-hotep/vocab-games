// Single source of truth for gameplay data. Reads the static word bank baked at
// build time and exposes helpers all three games share. No network, no API key.

import wordBank from '../data/wordBank.json'

export const DIFFICULTIES = ['medium', 'hard']

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

const firstDef = (w) => w.definitions[0]
const norm = (s) => s.trim().toLowerCase()

function frame(target) {
  return { word: target.word, partOfSpeech: target.partOfSpeech, definition: firstDef(target) }
}

// Assemble a 4-option set: the correct label plus distinct distractor labels.
// `candidateLabels` is a preference-ordered list (long enough that dedupe still
// reaches OPTIONS-1). Dedupe is by normalized text so two words that render the
// same label — e.g. examples that blank to an identical sentence — can't both
// appear. Returns the shuffled option list.
function assembleOptions(correctLabel, candidateLabels) {
  const seen = new Set([norm(correctLabel)])
  const distractors = []
  for (const label of candidateLabels) {
    if (!label) continue
    const key = norm(label)
    if (seen.has(key)) continue
    seen.add(key)
    distractors.push(label)
    if (distractors.length === OPTIONS - 1) break
  }
  return shuffle([
    { label: correctLabel, correct: true },
    ...distractors.map((label) => ({ label, correct: false })),
  ])
}

// Words other than `target` with the flag, tier-first then whole-bank fallback,
// so dedupe never starves the option set.
function distractorWords(difficulty, flag, target, extraExclude = () => false) {
  const ok = (w) => w.word !== target.word && w[flag] && !extraExclude(w)
  return [...shuffle(getPool(difficulty, flag).filter(ok)), ...shuffle(wordBank.filter(ok))]
}

// --- per-game question builders ---------------------------------------------
// Each returns { ...frame, prompt, options:[{label, correct}] }.

export function makeSentenceQuestion(difficulty) {
  const target = pickRandom(getPool(difficulty, 'canSentence'))
  const candidates = distractorWords(difficulty, 'canSentence', target).map((w) => w.examples[0])
  const options = assembleOptions(target.examples[0], candidates)
  return { ...frame(target), prompt: 'Which sentence does this word complete?', options }
}

export function makeDefinitionQuestion(difficulty) {
  const target = pickRandom(getPool(difficulty, 'canDefinition'))
  const candidates = distractorWords(difficulty, 'canDefinition', target).map(firstDef)
  const options = assembleOptions(firstDef(target), candidates)
  // Prompt shows the word itself, so don't repeat the definition in the frame.
  return { word: target.word, partOfSpeech: target.partOfSpeech, definition: null, prompt: 'What does this word mean?', options }
}

export function makeSynonymQuestion(difficulty) {
  const target = pickRandom(getPool(difficulty, 'canSynonym'))
  const correct = pickRandom(target.synonyms)
  // Distractors are unrelated words — never the target's own synonyms/antonyms.
  const related = new Set([correct, ...target.synonyms, ...target.antonyms].map(norm))
  const candidates = distractorWords(difficulty, 'canDefinition', target, (w) => related.has(norm(w.word))).map((w) => w.word)
  const options = assembleOptions(correct, candidates)
  return { ...frame(target), prompt: 'Which word is the closest synonym?', options }
}

const BUILDERS = {
  sentence: makeSentenceQuestion,
  definition: makeDefinitionQuestion,
  synonym: makeSynonymQuestion,
}

// A full round: `count` questions for the chosen game + difficulty, with every
// target word distinct (no repeats within a round, pool permitting).
export function buildRound(gameId, difficulty, count = ROUND_LENGTH) {
  const build = BUILDERS[gameId]
  const questions = []
  const used = new Set()
  let guard = 0
  while (questions.length < count && guard < count * 40) {
    guard++
    const q = build(difficulty)
    if (used.has(q.word)) continue
    used.add(q.word)
    questions.push(q)
  }
  return questions
}
