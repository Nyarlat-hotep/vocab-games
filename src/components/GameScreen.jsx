import { useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { GAMES, ROUND_LENGTH, buildRound } from '../lib/bank'
import QuestionCard from './QuestionCard'
import Summary from './Summary'

const bestKey = (gameId, difficulty) => `vocab-games:best:${gameId}:${difficulty}`

function readBest(gameId, difficulty) {
  const v = Number(localStorage.getItem(bestKey(gameId, difficulty)))
  return Number.isFinite(v) ? v : 0
}

export default function GameScreen({ gameId, difficulty, onHome }) {
  const game = GAMES[gameId]
  const [round, setRound] = useState(() => buildRound(gameId, difficulty))
  const [index, setIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  // Best score *before* this round — what the player is trying to beat.
  const [best, setBest] = useState(() => readBest(gameId, difficulty))

  function handleAnswer(correct) {
    if (correct) setScore((s) => s + 1)
  }

  function handleNext() {
    if (index + 1 >= round.length) {
      if (score > best) localStorage.setItem(bestKey(gameId, difficulty), String(score))
      setFinished(true)
    } else {
      setIndex((i) => i + 1)
    }
  }

  function replay() {
    setBest(readBest(gameId, difficulty))
    setRound(buildRound(gameId, difficulty))
    setIndex(0)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    return (
      <Summary
        gameName={game.name}
        difficulty={difficulty}
        score={score}
        total={round.length}
        best={best}
        onReplay={replay}
        onHome={onHome}
      />
    )
  }

  return (
    <div className="game">
      <div className="game__bar">
        <button className="game__quit" onClick={onHome} aria-label="Quit game">
          <ArrowLeft weight="bold" size={22} />
        </button>
        <span className="game__meta">
          {game.name} · <span className={`tag tag--${difficulty}`}>{difficulty}</span>
        </span>
        <span className="game__stats">
          <span className="game__score">{score}</span>
        </span>
      </div>

      <div className="game__progress">
        <div className="game__progress-fill" style={{ width: `${(index / ROUND_LENGTH) * 100}%` }} />
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
    </div>
  )
}
