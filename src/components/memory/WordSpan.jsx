import { useEffect, useMemo, useState } from 'react'
import { paramsFor, memoryWords } from '../../lib/memory'
import { shuffle } from '../../lib/bank'
import useSpanLadder from '../../hooks/useSpanLadder'
import useSequencePlayer from '../../hooks/useSequencePlayer'
import PhaseBanner from './PhaseBanner'

const NONE = []
// Longer than the grid games' beat: the feedback screen prints the whole
// sequence back, and at seven words that needs a moment to read.
const FEEDBACK_MS = 1500

// The sequence plus distractor tiles, drawn together so no word repeats.
function makeTrial(difficulty, level, extraTiles) {
  const drawn = memoryWords(difficulty, level + extraTiles).map((w) => w.word)
  return { sequence: drawn.slice(0, level), tiles: shuffle(drawn) }
}

// Verbal span: words flash one at a time, then you rebuild the sequence from a
// tile board padded with distractors — so recognising the words isn't enough,
// you have to hold their order.
export default function WordSpan({ difficulty, onFinish, onScore }) {
  const { start, max, reverse, onMs, offMs, extraTiles } = paramsFor('wordspan', difficulty)
  const ladder = useSpanLadder({ start, max })

  const [trial, setTrial] = useState(() => makeTrial(difficulty, start, extraTiles))
  const [phase, setPhase] = useState('watch')
  const [taps, setTaps] = useState([])
  const [verdict, setVerdict] = useState(null)

  const expected = useMemo(
    () => (reverse ? [...trial.sequence].reverse() : trial.sequence),
    [trial, reverse],
  )

  const player = useSequencePlayer(phase === 'watch' ? trial.sequence : NONE, {
    onMs,
    offMs,
    onDone: () => setPhase('recall'),
  })

  useEffect(() => {
    if (phase !== 'feedback') return undefined
    const id = setTimeout(() => {
      if (ladder.over) {
        onFinish({ score: ladder.best, total: null, unit: 'span' })
        return
      }
      setTaps([])
      setVerdict(null)
      setTrial(makeTrial(difficulty, ladder.level, extraTiles))
      setPhase('watch')
    }, FEEDBACK_MS)
    return () => clearTimeout(id)
  }, [phase, difficulty, extraTiles, ladder.over, ladder.best, ladder.level, onFinish])

  function handleTile(word) {
    if (phase !== 'recall' || taps.includes(word)) return
    const next = [...taps, word]
    setTaps(next)

    if (word !== expected[next.length - 1]) {
      setVerdict('wrong')
      ladder.fail()
      setPhase('feedback')
      return
    }
    if (next.length === expected.length) {
      setVerdict('correct')
      ladder.succeed()
      onScore?.(Math.max(ladder.best, ladder.level))
      setPhase('feedback')
    }
  }

  if (phase === 'watch' || phase === 'feedback') {
    const shown = phase === 'watch' && player.phase === 'on' ? trial.sequence[player.index] : ''
    const status = ladder.misses > 0 ? 'last life' : ladder.atMax ? 'max level' : null
    return (
      <div className="memory">
        <PhaseBanner
          label={phase === 'watch' ? 'Remember' : verdict}
          note={`Level ${ladder.level}${status ? ` · ${status}` : ''}`}
        />
        <div className={`flashword flashword--${phase === 'feedback' ? verdict : 'idle'}`}>
          <span className="flashword__word">{phase === 'feedback' ? verdict : shown}</span>
          <div className="flashword__dots">
            {trial.sequence.map((_, i) => (
              <span
                key={i}
                className={`flashword__dot ${
                  phase === 'watch' && player.index >= i ? 'flashword__dot--on' : ''
                }`}
              />
            ))}
          </div>
        </div>
        {phase === 'feedback' && <p className="memory__answer">{expected.join(' → ')}</p>}
      </div>
    )
  }

  return (
    <div className="memory">
      <PhaseBanner
        label={reverse ? 'Tap in reverse' : 'Tap in order'}
        note={`${taps.length} / ${expected.length}`}
      />
      <div className="tiles">
        {trial.tiles.map((word) => {
          const ord = taps.indexOf(word)
          return (
            <button
              key={word}
              type="button"
              className={`tile ${ord >= 0 ? 'tile--tapped' : ''}`}
              disabled={ord >= 0}
              onClick={() => handleTile(word)}
            >
              {word}
              {ord >= 0 && <span className="tile__ord">{ord + 1}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
