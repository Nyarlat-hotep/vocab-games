import { useEffect, useState } from 'react'
import { paramsFor, randomCells, sameCellSet } from '../../lib/memory'
import useSpanLadder from '../../hooks/useSpanLadder'
import usePhaseTimer from '../../hooks/usePhaseTimer'
import CellGrid from './CellGrid'
import PhaseBanner from './PhaseBanner'

const FEEDBACK_MS = 700

// Simultaneous spatial memory: the whole pattern flashes at once, so there's no
// sequence to rehearse — a different system from Grid Flash's serial order.
export default function PatternMatrix({ difficulty, onFinish, onScore }) {
  const { start, size, studyMs } = paramsFor('matrix', difficulty)
  const ladder = useSpanLadder({ start })

  const [pattern, setPattern] = useState(() => randomCells(size, start))
  const [trial, setTrial] = useState(0)
  const [phase, setPhase] = useState('study')
  const [taps, setTaps] = useState(new Set())
  const [verdict, setVerdict] = useState(null)

  usePhaseTimer(studyMs, {
    running: phase === 'study',
    resetKey: trial,
    onDone: () => setPhase('recall'),
  })

  useEffect(() => {
    if (phase !== 'feedback') return undefined
    const id = setTimeout(() => {
      if (ladder.over) {
        onFinish({ score: ladder.best, total: null, unit: 'span' })
        return
      }
      setTaps(new Set())
      setVerdict(null)
      setPattern(randomCells(size, ladder.level))
      setTrial((t) => t + 1)
      setPhase('study')
    }, FEEDBACK_MS)
    return () => clearTimeout(id)
  }, [phase, size, ladder.over, ladder.best, ladder.level, onFinish])

  // Order is irrelevant here — only the final set has to match.
  function handleCell(i) {
    if (phase !== 'recall') return
    const next = new Set(taps).add(i)
    setTaps(next)
    if (next.size < pattern.size) return

    const ok = sameCellSet(next, pattern)
    setVerdict(ok ? 'correct' : 'wrong')
    if (ok) {
      ladder.succeed()
      onScore?.(Math.max(ladder.best, ladder.level))
    } else {
      ladder.fail()
    }
    setPhase('feedback')
  }

  // On feedback, show the real pattern so a miss is legible.
  const lit = phase === 'study' || phase === 'feedback' ? pattern : null

  // The timer bar stays mounted for every phase — it drains during study, then
  // sits empty through recall and feedback. Unmounting it would shrink the
  // banner and jump the grid up the page mid-trial.
  return (
    <div className="memory">
      <PhaseBanner
        label={phase === 'study' ? 'Memorize' : phase === 'recall' ? 'Rebuild it' : verdict}
        note={
          phase === 'recall'
            ? `${taps.size} / ${pattern.size}`
            : `${pattern.size} cells · ${ladder.misses > 0 ? 'last life' : `${size}×${size}`}`
        }
        timerMs={studyMs}
        timerKey={trial}
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
