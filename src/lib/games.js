// The registry for both halves of the app. `bank.js` owns vocab data and the
// question builders; this file owns what the menu shows and which component
// renders a game.
//
//   category — which Home section the card sits in
//   kind     — which renderer GameScreen dispatches to
//   flag     — vocab games only: the wordBank eligibility flag

export const DIFFICULTIES = ['medium', 'hard']

export const GAMES = {
  sentence: {
    id: 'sentence',
    name: 'Sentence Fit',
    category: 'vocab',
    kind: 'quiz',
    flag: 'canSentence',
    blurb: 'Pick the sentence the word completes.',
  },
  definition: {
    id: 'definition',
    name: 'Definition Match',
    category: 'vocab',
    kind: 'quiz',
    flag: 'canDefinition',
    blurb: 'Match the word to its meaning.',
  },
  synonym: {
    id: 'synonym',
    name: 'Synonym Pick',
    category: 'vocab',
    kind: 'quiz',
    flag: 'canSynonym',
    blurb: 'Choose the closest synonym.',
  },

  wordspan: {
    id: 'wordspan',
    name: 'Word Span',
    category: 'memory',
    kind: 'wordspan',
    blurb: 'Rebuild the sequence of words in order.',
  },
  gridflash: {
    id: 'gridflash',
    name: 'Grid Flash',
    category: 'memory',
    kind: 'gridflash',
    blurb: 'Tap the cells back in the order they lit.',
  },
  matrix: {
    id: 'matrix',
    name: 'Pattern Matrix',
    category: 'memory',
    kind: 'matrix',
    blurb: 'Memorize the pattern, then rebuild it.',
  },
  lexicon: {
    id: 'lexicon',
    name: 'Lexicon Recall',
    category: 'memory',
    kind: 'lexicon',
    blurb: 'Study the list. Was this word on it?',
  },
  concentration: {
    id: 'concentration',
    name: 'Concentration',
    category: 'memory',
    kind: 'concentration',
    blurb: 'Flip two. Match word to meaning.',
  },
  pairbond: {
    id: 'pairbond',
    name: 'Pair Bond',
    category: 'memory',
    kind: 'pairbond',
    blurb: 'Learn the pairs, then recall them under interference.',
  },
}

export const CATEGORIES = [
  { id: 'vocab', label: 'Vocabulary' },
  { id: 'memory', label: 'Memory' },
]

const list = Object.values(GAMES)

export const GAMES_BY_CATEGORY = {
  vocab: list.filter((g) => g.category === 'vocab'),
  memory: list.filter((g) => g.category === 'memory'),
}
