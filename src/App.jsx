import { useState } from 'react'
import Home from './components/Home'
import GameScreen from './components/GameScreen'
import './styles/app.css'

export default function App() {
  // view: { name: 'home' } | { name: 'game', gameId, difficulty }
  const [view, setView] = useState({ name: 'home' })

  return (
    <div className="app">
      <header className="app__header">
        <button className="app__title" onClick={() => setView({ name: 'home' })}>
          Vocab Games
        </button>
      </header>

      <main className="app__main">
        {view.name === 'home' ? (
          <Home onStart={(gameId, difficulty) => setView({ name: 'game', gameId, difficulty })} />
        ) : (
          <GameScreen
            gameId={view.gameId}
            difficulty={view.difficulty}
            onHome={() => setView({ name: 'home' })}
          />
        )}
      </main>
    </div>
  )
}
