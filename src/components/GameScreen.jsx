import { useCallback, useState } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { GAMES } from '../lib/games'
import QuizGame from './QuizGame'
import WordSpan from './memory/WordSpan'
import GridFlash from './memory/GridFlash'
import PatternMatrix from './memory/PatternMatrix'
import LexiconRecall from './memory/LexiconRecall'
import Concentration from './memory/Concentration'
import PairBond from './memory/PairBond'
import Summary from './Summary'

const bestKey = (gameId, difficulty) => `vocab-games:best:${gameId}:${difficulty}`

function readBest(gameId, difficulty) {
  const v = Number(localStorage.getItem(bestKey(gameId, difficulty)))
  return Number.isFinite(v) ? v : 0
}

// Every renderer takes { gameId, difficulty, onFinish, onScore } and reports
// back { score, total, unit, detail? }. `unit` is 'correct' for fixed-length
// games and 'span' for the adaptive ones, which have no denominator.
const RENDERERS = {
  quiz: QuizGame,
  wordspan: WordSpan,
  gridflash: GridFlash,
  matrix: PatternMatrix,
  lexicon: LexiconRecall,
  concentration: Concentration,
  pairbond: PairBond,
}

export default function GameScreen({ gameId, difficulty, onHome }) {
  const game = GAMES[gameId]
  const Renderer = RENDERERS[game.kind]

  // Bumped so each round remounts the renderer with fresh internal state.
  const [runId, setRunId] = useState(0)
  const [hudScore, setHudScore] = useState(0)
  const [result, setResult] = useState(null)
  // Best score *before* this round — what the player is trying to beat.
  const [best, setBest] = useState(() => readBest(gameId, difficulty))

  // Stable identity: the memory games hold this in timer effects, and a new
  // function every render would restart their feedback timeouts.
  const handleFinish = useCallback(
    (next) => {
      if (next.score > best) localStorage.setItem(bestKey(gameId, difficulty), String(next.score))
      setResult(next)
    },
    [best, gameId, difficulty],
  )

  function replay() {
    setBest(readBest(gameId, difficulty))
    setResult(null)
    setHudScore(0)
    setRunId((r) => r + 1)
  }

  if (result) {
    return (
      <Summary
        gameName={game.name}
        difficulty={difficulty}
        score={result.score}
        total={result.total}
        unit={result.unit}
        detail={result.detail}
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
          <span className="game__score">{hudScore}</span>
        </span>
      </div>

      <Renderer
        key={runId}
        gameId={gameId}
        difficulty={difficulty}
        onFinish={handleFinish}
        onScore={setHudScore}
      />
    </div>
  )
}
