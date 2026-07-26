import { Trophy } from '@phosphor-icons/react'

// Span games have no denominator — you play until you fail, so the score is the
// furthest you got rather than a fraction of a fixed set.
function spanNote(span) {
  if (span >= 8) return 'Exceptional span.'
  if (span >= 6) return 'Strong span.'
  if (span >= 4) return 'Solid. Push further.'
  if (span >= 1) return 'Warming up.'
  return 'No level cleared.'
}

function scoreNote(pct) {
  if (pct === 100) return 'Perfect round!'
  if (pct >= 70) return 'Nicely done.'
  if (pct >= 40) return 'Keep practicing.'
  return 'Warming up.'
}

export default function Summary({
  gameName,
  difficulty,
  score,
  total,
  unit = 'correct',
  detail,
  best,
  onReplay,
  onHome,
}) {
  const isSpan = unit === 'span'
  const isBest = score > best && score > 0
  const bestSoFar = Math.max(score, best)
  const note = isSpan ? spanNote(score) : scoreNote(Math.round((score / total) * 100))

  return (
    <div className="summary">
      <p className="summary__game">
        {gameName} · <span className={`tag tag--${difficulty}`}>{difficulty}</span>
      </p>
      <div className="summary__score">
        {isSpan && <span className="summary__unit">Span</span>}
        {score}
        {!isSpan && <span className="summary__total">/ {total}</span>}
      </div>
      <p className="summary__note">{note}</p>
      {detail && <p className="summary__detail">{detail}</p>}
      <p className="summary__best">
        {isBest ? (
          <>
            <Trophy weight="fill" size={18} color="#ff7a18" /> New best!
          </>
        ) : isSpan ? (
          `Best: ${bestSoFar}`
        ) : (
          `Best: ${bestSoFar} / ${total}`
        )}
      </p>
      <div className="summary__actions">
        <button className="btn btn--primary" onClick={onReplay}>
          Play again
        </button>
        <button className="btn" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  )
}
