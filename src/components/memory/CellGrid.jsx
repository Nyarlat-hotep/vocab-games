// A size×size grid of ink-bordered squares, shared by Grid Flash and Pattern
// Matrix.
//
//   lit     Set of indexes currently flashing
//   tapped  Map of index → ordinal badge (Grid Flash) or Set of indexes
//           (Pattern Matrix, where order doesn't matter)
//   state   'idle' | 'correct' | 'wrong' — tints the whole grid on feedback
export default function CellGrid({ size, lit, tapped, state = 'idle', onCell, disabled }) {
  const cells = [...Array(size * size).keys()]
  const ordinalOf = (i) => (tapped instanceof Map ? tapped.get(i) : undefined)
  const isTapped = (i) => (tapped instanceof Map ? tapped.has(i) : Boolean(tapped?.has(i)))

  return (
    <div
      className={`cellgrid cellgrid--${state}`}
      style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
    >
      {cells.map((i) => {
        const classes = ['cellgrid__cell']
        if (lit?.has(i)) classes.push('cellgrid__cell--lit')
        if (isTapped(i)) classes.push('cellgrid__cell--tapped')
        return (
          <button
            key={i}
            type="button"
            className={classes.join(' ')}
            disabled={disabled || isTapped(i)}
            onClick={() => onCell?.(i)}
            aria-label={`Cell ${i + 1}`}
          >
            {ordinalOf(i) !== undefined && <span className="cellgrid__ord">{ordinalOf(i)}</span>}
          </button>
        )
      })}
    </div>
  )
}
