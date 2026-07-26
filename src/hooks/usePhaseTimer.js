import { useEffect, useRef } from 'react'

// Ends a timed phase after `ms`. Deliberately stateless: the visible countdown
// is a CSS animation on the bar (see `.phase__timer-fill`), so there's no reason
// to re-render the game ten times a second just to move it.
//
// `resetKey` rearms the timer for a repeated phase of the same length — a span
// game's study window is the same `ms` every trial, so the duration alone can't
// tell us a new one started.
export function usePhaseTimer(ms, { onDone, running = true, resetKey = 0 } = {}) {
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (!running) return undefined
    const id = setTimeout(() => onDoneRef.current?.(), ms)
    return () => clearTimeout(id)
  }, [ms, running, resetKey])
}

export default usePhaseTimer
