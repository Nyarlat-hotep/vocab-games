export default function Summary({ gameName, difficulty, score, total, best, onReplay, onHome }) {
  const pct = Math.round((score / total) * 100)
  const isBest = score > best && score > 0
  const bestSoFar = Math.max(score, best)
  const note =
    pct === 100 ? 'Perfect round!' : pct >= 70 ? 'Nicely done.' : pct >= 40 ? 'Keep practicing.' : 'Warming up.'

  return (
    <div className="summary">
      <p className="summary__game">
        {gameName} · <span className={`tag tag--${difficulty}`}>{difficulty}</span>
      </p>
      <div className="summary__score">
        {score}
        <span className="summary__total">/ {total}</span>
      </div>
      <p className="summary__note">{note}</p>
      <p className="summary__best">
        {isBest ? '🏆 New best!' : `Best: ${bestSoFar} / ${total}`}
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
