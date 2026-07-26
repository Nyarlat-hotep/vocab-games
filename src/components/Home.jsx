import { useState } from 'react'
import { CATEGORIES, GAMES_BY_CATEGORY, DIFFICULTIES } from '../lib/games'

export default function Home({ onStart }) {
  const [difficulty, setDifficulty] = useState('medium')

  return (
    <div className="home">
      <p className="home__lead">Train your vocabulary and your memory. Pick a difficulty, then a game.</p>

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

      {CATEGORIES.map((cat) => (
        <section key={cat.id} className="home__section">
          <h2 className="home__section-title">{cat.label}</h2>
          <div className="home__games">
            {GAMES_BY_CATEGORY[cat.id].map((g) => (
              <button key={g.id} className="game-card" onClick={() => onStart(g.id, difficulty)}>
                <span className="game-card__name">{g.name}</span>
                <span className="game-card__blurb">{g.blurb}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
