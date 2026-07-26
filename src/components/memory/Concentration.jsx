import { useEffect, useMemo, useState } from 'react'
import { paramsFor, meaningPairs } from '../../lib/memory'
import { shuffle } from '../../lib/bank'
import PhaseBanner from './PhaseBanner'

const FLIP_BACK_MS = 800

// Classic flip-two-to-match, but the pair is a word and its meaning rather than
// two identical faces — so it drills the vocabulary while it drills recall. Hard
// pairs a word with a *synonym*, a looser link you can't skim your way through.
export default function Concentration({ difficulty, onFinish, onScore }) {
  const { pairs, cols, moveLimit, mode } = paramsFor('concentration', difficulty)

  const cards = useMemo(() => {
    const chosen = meaningPairs(difficulty, pairs, mode)
    return shuffle(
      chosen.flatMap((p, i) => [
        { id: `${i}-w`, pairId: i, face: p.word, kind: 'word' },
        { id: `${i}-m`, pairId: i, face: p.meaning, kind: 'meaning' },
      ]),
    )
  }, [difficulty, pairs, mode])

  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState(new Set())
  const [moves, setMoves] = useState(0)

  const found = matched.size / 2
  const done = found >= pairs || moves >= moveLimit
  // Two cards face-up and unmatched means we're mid flip-back; ignore taps.
  const locked = flipped.length === 2

  // The only timer here: a non-match stays face-up long enough to be memorized,
  // then flips back. Matches are resolved in the click handler.
  useEffect(() => {
    if (flipped.length !== 2) return undefined
    const id = setTimeout(() => setFlipped([]), FLIP_BACK_MS)
    return () => clearTimeout(id)
  }, [flipped])

  useEffect(() => {
    if (!done) return
    onFinish({
      score: found,
      total: pairs,
      unit: 'correct',
      detail: `${moves} of ${moveLimit} moves used`,
    })
  }, [done, found, moves, pairs, moveLimit, onFinish])

  function flip(card) {
    if (locked || matched.has(card.id) || flipped.some((c) => c.id === card.id)) return
    const next = [...flipped, card]
    if (next.length < 2) {
      setFlipped(next)
      return
    }

    setMoves(moves + 1)
    if (next[0].pairId === next[1].pairId) {
      setMatched(new Set(matched).add(next[0].id).add(next[1].id))
      setFlipped([])
      onScore?.(found + 1)
    } else {
      setFlipped(next)
    }
  }

  const isUp = (card) => matched.has(card.id) || flipped.some((c) => c.id === card.id)

  return (
    <div className="memory">
      <PhaseBanner
        label="Find the pairs"
        note={`${found} / ${pairs} · ${moveLimit - moves} moves left`}
      />
      <div className="flipgrid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map((card) => {
          const up = isUp(card)
          const classes = ['flipcard', `flipcard--${card.kind}`]
          if (up) classes.push('flipcard--faceup')
          if (matched.has(card.id)) classes.push('flipcard--matched')
          return (
            <button
              key={card.id}
              type="button"
              className={classes.join(' ')}
              disabled={up || locked}
              onClick={() => flip(card)}
              aria-label={up ? card.face : 'Face-down card'}
            >
              {up ? card.face : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
