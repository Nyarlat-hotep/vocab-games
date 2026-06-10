import { useState } from 'react'
import { GAMES, DIFFICULTIES } from '../lib/bank'

const GAME_LIST = Object.values(GAMES)

export default function Home({ onStart }) {
  const [difficulty, setDifficulty] = useState('medium')

  return (
    <div className="home">
      <p className="home__lead">Practice your vocabulary. Pick a difficulty, then a game.</p>

      <div className="home__difficulty" role="group" aria-label="Difficulty">
        {DIFFICULTIES.map((d) => (
          <button
            key={d}
            className={`pill ${difficulty === d ? 'pill--active' : ''} pill--${d}`}
            onClick={() => setDifficulty(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="home__games">
        {GAME_LIST.map((g) => (
          <button key={g.id} className="game-card" onClick={() => onStart(g.id, difficulty)}>
            <span className="game-card__name">{g.name}</span>
            <span className="game-card__blurb">{g.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
