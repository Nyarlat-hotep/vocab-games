import { useMemo, useState } from 'react'
import { paramsFor, memoryWords } from '../../lib/memory'
import { shuffle, firstDef, assembleOptions, distractorWords } from '../../lib/bank'
import usePhaseTimer from '../../hooks/usePhaseTimer'
import QuestionCard from '../QuestionCard'
import PhaseBanner from './PhaseBanner'

const GLYPHS = ['◆', '●', '■', '▲', '◇', '○', '□', '△']

// One odd glyph hidden in a row of four identical ones.
function makeGlyphRow() {
  const [odd, common] = shuffle(GLYPHS)
  return { row: shuffle([odd, common, common, common, common]), odd }
}

// Associative memory: learn arbitrary word→meaning bindings, sit through an
// interference task so you can't just rehearse them, then recall. On hard every
// distractor is one of the *other* studied meanings, so recognising the words
// gets you nothing — only the binding itself survives.
export default function PairBond({ difficulty, onFinish, onScore }) {
  const { pairs, studyMs, interferenceMs, studiedDistractors } = paramsFor('pairbond', difficulty)

  const questions = useMemo(() => {
    const words = memoryWords(difficulty, pairs)
    const studiedDefs = words.map(firstDef)
    return words.map((w, i) => {
      const candidates = studiedDistractors
        ? shuffle(studiedDefs.filter((_, j) => j !== i))
        : distractorWords(difficulty, 'canDefinition', w).map(firstDef)
      return {
        word: w.word,
        partOfSpeech: w.partOfSpeech,
        definition: null,
        prompt: 'Which meaning did this word pair with?',
        options: assembleOptions(firstDef(w), candidates),
        studyDef: firstDef(w),
      }
    })
  }, [difficulty, pairs, studiedDistractors])

  const [phase, setPhase] = useState('study')
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [glyphs, setGlyphs] = useState(makeGlyphRow)

  usePhaseTimer(studyMs, { running: phase === 'study', onDone: () => setPhase('interference') })
  usePhaseTimer(interferenceMs, { running: phase === 'interference', onDone: () => setPhase('test') })

  function handleAnswer(correct) {
    if (!correct) return
    const next = score + 1
    setScore(next)
    onScore?.(next)
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      onFinish({ score, total: questions.length, unit: 'correct' })
    } else {
      setIndex(index + 1)
    }
  }

  if (phase === 'study') {
    return (
      <div className="memory">
        <PhaseBanner label="Learn the pairs" note={`${questions.length} pairs`} timerMs={studyMs} />
        <div className="study-pairs">
          {questions.map((q) => (
            <div key={q.word} className="study-pair">
              <span className="study-pair__word">{q.word}</span>
              <span className="study-pair__meaning">{q.studyDef}</span>
            </div>
          ))}
        </div>
        <button className="btn btn--primary memory__skip" onClick={() => setPhase('interference')}>
          I&apos;ve got it
        </button>
      </div>
    )
  }

  // Ungraded busywork. Its only job is to block rehearsal of the pairs, which is
  // what makes this a memory test rather than a reading test.
  if (phase === 'interference') {
    return (
      <div className="memory">
        <PhaseBanner label="Tap the odd one out" note="Keep going" timerMs={interferenceMs} />
        <div className="glyphrow">
          {glyphs.row.map((g, i) => (
            <button
              key={i}
              type="button"
              className="glyphrow__btn"
              onClick={() => g === glyphs.odd && setGlyphs(makeGlyphRow())}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="memory__hint">Until the timer runs out.</p>
      </div>
    )
  }

  return (
    <div className="memory">
      <PhaseBanner label="Recall" note={`${index + 1} / ${questions.length}`} />
      <QuestionCard
        key={index}
        question={questions[index]}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isLast={index + 1 >= questions.length}
      />
    </div>
  )
}
