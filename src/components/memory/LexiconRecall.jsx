import { useMemo, useState } from 'react'
import { paramsFor, memoryWords, lureWords } from '../../lib/memory'
import { shuffle } from '../../lib/bank'
import usePhaseTimer from '../../hooks/usePhaseTimer'
import PhaseBanner from './PhaseBanner'

// Recognition memory. Study a list, then judge words one at a time: seen or new?
// On hard the lures are drawn from the studied words' own synonyms and antonyms,
// so "it feels familiar" stops being a usable strategy.
export default function LexiconRecall({ difficulty, onFinish, onScore }) {
  const { studyCount, studyMs } = paramsFor('lexicon', difficulty)

  const { studied, trials } = useMemo(() => {
    const words = memoryWords(difficulty, studyCount)
    const lures = lureWords(words, difficulty, studyCount)
    return {
      studied: words.map((w) => w.word),
      trials: shuffle([
        ...words.map((w) => ({ label: w.word, seen: true })),
        ...lures.map((label) => ({ label, seen: false })),
      ]),
    }
  }, [difficulty, studyCount])

  const [phase, setPhase] = useState('study')
  const [index, setIndex] = useState(0)
  const [tally, setTally] = useState({ correct: 0, hits: 0, falseAlarms: 0 })

  usePhaseTimer(studyMs, { running: phase === 'study', onDone: () => setPhase('test') })

  function answer(saidSeen) {
    const trial = trials[index]
    const next = {
      correct: tally.correct + (saidSeen === trial.seen ? 1 : 0),
      hits: tally.hits + (saidSeen && trial.seen ? 1 : 0),
      falseAlarms: tally.falseAlarms + (saidSeen && !trial.seen ? 1 : 0),
    }
    setTally(next)
    onScore?.(next.correct)

    if (index + 1 >= trials.length) {
      onFinish({
        score: next.correct,
        total: trials.length,
        unit: 'correct',
        detail: `${next.hits} hits · ${next.falseAlarms} false alarms`,
      })
    } else {
      setIndex(index + 1)
    }
  }

  if (phase === 'study') {
    return (
      <div className="memory">
        <PhaseBanner label="Study the list" note={`${studied.length} words`} timerMs={studyMs} />
        <div className="study-list">
          {studied.map((w) => (
            <span key={w} className="study-list__word">
              {w}
            </span>
          ))}
        </div>
        <button className="btn btn--primary memory__skip" onClick={() => setPhase('test')}>
          I&apos;ve got it
        </button>
      </div>
    )
  }

  return (
    <div className="memory">
      <PhaseBanner label="Was it on the list?" note={`${index + 1} / ${trials.length}`} />
      <div className="probe">
        <span className="probe__word">{trials[index].label}</span>
      </div>
      <div className="binary-choice">
        <button className="binary-choice__btn" onClick={() => answer(true)}>
          Seen
        </button>
        <button className="binary-choice__btn" onClick={() => answer(false)}>
          New
        </button>
      </div>
    </div>
  )
}
