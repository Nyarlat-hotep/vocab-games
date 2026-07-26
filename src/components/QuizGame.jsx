import { useState } from 'react'
import { buildRound } from '../lib/bank'
import QuestionCard from './QuestionCard'

// The original three vocab games: ten four-option questions, one point each.
export default function QuizGame({ gameId, difficulty, onFinish, onScore }) {
  const [round] = useState(() => buildRound(gameId, difficulty))
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)

  function handleAnswer(correct) {
    if (!correct) return
    const next = score + 1
    setScore(next)
    onScore?.(next)
  }

  function handleNext() {
    if (index + 1 >= round.length) {
      onFinish({ score, total: round.length, unit: 'correct' })
    } else {
      setIndex((i) => i + 1)
    }
  }

  return (
    <>
      <div className="game__progress">
        <div className="game__progress-fill" style={{ width: `${(index / round.length) * 100}%` }} />
      </div>
      <p className="game__count">
        Question {index + 1} of {round.length}
      </p>

      <QuestionCard
        key={index}
        question={round[index]}
        onAnswer={handleAnswer}
        onNext={handleNext}
        isLast={index + 1 >= round.length}
      />
    </>
  )
}
