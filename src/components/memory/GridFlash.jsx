import { useEffect, useMemo, useState } from 'react'
import { paramsFor, randomSequence } from '../../lib/memory'
import useSpanLadder from '../../hooks/useSpanLadder'
import useSequencePlayer from '../../hooks/useSequencePlayer'
import CellGrid from './CellGrid'
import PhaseBanner from './PhaseBanner'

const NONE = []
const FEEDBACK_MS = 700

// Corsi block tapping. Cells light one at a time; tap them back in order —
// reversed on hard, which is a materially different task, not just a faster one.
export default function GridFlash({ difficulty, onFinish, onScore }) {
  const { start, max, reverse, size, onMs, offMs } = paramsFor('gridflash', difficulty)
  const ladder = useSpanLadder({ start, max })

  // A fresh pattern per trial, including a retry at the same length. Held in
  // state and replaced when the trial advances, rather than memoized off a
  // counter — the sequence is the thing that changes, so it should be the state.
  const [sequence, setSequence] = useState(() => randomSequence(size, start))
  const [phase, setPhase] = useState('watch')
  const [taps, setTaps] = useState(new Map())
  const [verdict, setVerdict] = useState(null)

  const expected = useMemo(() => (reverse ? [...sequence].reverse() : sequence), [sequence, reverse])

  const player = useSequencePlayer(phase === 'watch' ? sequence : NONE, {
    onMs,
    offMs,
    onDone: () => setPhase('recall'),
  })

  // Feedback holds briefly, then either the next trial starts or the run ends.
  useEffect(() => {
    if (phase !== 'feedback') return undefined
    const id = setTimeout(() => {
      if (ladder.over) {
        onFinish({ score: ladder.best, total: null, unit: 'span' })
        return
      }
      setTaps(new Map())
      setVerdict(null)
      setSequence(randomSequence(size, ladder.level))
      setPhase('watch')
    }, FEEDBACK_MS)
    return () => clearTimeout(id)
  }, [phase, size, ladder.over, ladder.best, ladder.level, onFinish])

  function handleCell(i) {
    if (phase !== 'recall') return
    const step = taps.size
    const next = new Map(taps).set(i, step + 1)
    setTaps(next)

    if (i !== expected[step]) {
      setVerdict('wrong')
      ladder.fail()
      setPhase('feedback')
      return
    }
    if (next.size === expected.length) {
      setVerdict('correct')
      ladder.succeed()
      onScore?.(Math.max(ladder.best, ladder.level))
      setPhase('feedback')
    }
  }

  const lit = phase === 'watch' && player.phase === 'on' ? new Set([sequence[player.index]]) : null
  const status = ladder.misses > 0 ? 'last life' : ladder.atMax ? 'max level' : `${size}×${size}`

  return (
    <div className="memory">
      <PhaseBanner
        label={
          phase === 'watch' ? 'Watch' : phase === 'recall' ? (reverse ? 'Tap in reverse' : 'Tap in order') : verdict
        }
        note={phase === 'recall' ? `${taps.size} / ${expected.length}` : `Level ${ladder.level} · ${status}`}
      />
      <CellGrid
        size={size}
        lit={lit}
        tapped={taps}
        state={phase === 'feedback' ? verdict : 'idle'}
        onCell={handleCell}
        disabled={phase !== 'recall'}
      />
    </div>
  )
}
