import { useState } from 'react'

// The adaptive controller behind the three span games. Clear a level and it
// grows; miss and you get one retry at the same length; miss twice in a row and
// the run is over.
//
// `best` is the highest level *completed*, so a player who never clears the
// starting level scores 0 rather than the level they were shown.
export function useSpanLadder({ start = 3, maxMisses = 2 } = {}) {
  const [level, setLevel] = useState(start)
  const [best, setBest] = useState(0)
  const [misses, setMisses] = useState(0)
  const [over, setOver] = useState(false)

  // Both are called exactly once per trial, from an event handler, so reading
  // state out of the closure is safe — and keeps setState out of an updater.
  function succeed() {
    setBest(Math.max(best, level))
    setMisses(0)
    setLevel(level + 1)
  }

  function fail() {
    const next = misses + 1
    setMisses(next)
    if (next >= maxMisses) setOver(true)
  }

  return { level, best, misses, over, succeed, fail }
}

export default useSpanLadder
