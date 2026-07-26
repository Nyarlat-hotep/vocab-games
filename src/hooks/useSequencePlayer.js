import { useEffect, useRef, useState } from 'react'

// True when the OS asks for reduced motion. Read at each run rather than stored,
// so a mid-session preference change is picked up on the next trial.
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// Steps through `items` one at a time: item on for `onMs`, blank for `offMs`,
// next. A setTimeout chain rather than an interval so the two durations can
// differ. Restarts whenever `items` changes identity — each trial hands in a
// fresh array, which is exactly the signal we want.
//
// Returns { index, phase } where phase is 'on' | 'off' | 'done'. `index` is -1
// once the run finishes so callers can't keep highlighting a stale item.
export function useSequencePlayer(items, { onMs = 700, offMs = 200, onDone } = {}) {
  const [state, setState] = useState({ index: -1, phase: 'idle' })
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  useEffect(() => {
    if (!items || items.length === 0) return undefined

    // Reduced motion: hold each step longer and lean on the gap rather than
    // stripping the sequence out, which would remove the game.
    const slow = prefersReducedMotion()
    const on = slow ? Math.round(onMs * 1.6) : onMs
    const off = slow ? Math.round(offMs * 1.6) : offMs

    let cancelled = false
    let timer

    const step = (i, phase) => {
      if (cancelled) return
      if (i >= items.length) {
        setState({ index: -1, phase: 'done' })
        onDoneRef.current?.()
        return
      }
      setState({ index: i, phase })
      timer = setTimeout(
        () => (phase === 'on' ? step(i, 'off') : step(i + 1, 'on')),
        phase === 'on' ? on : off,
      )
    }

    // A beat of blank before the first flash so a new trial reads as a restart.
    timer = setTimeout(() => step(0, 'on'), offMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [items, onMs, offMs])

  return state
}

export default useSequencePlayer
