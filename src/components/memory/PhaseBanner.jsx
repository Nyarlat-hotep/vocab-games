// The mono uppercase phase label every memory game shows — WATCH, RECALL,
// STUDY, TEST — with an optional right-hand readout and a draining timer bar.
//
// The bar is a pure CSS animation sized by `timerMs`; nothing ticks in JS, so a
// timed phase costs zero re-renders. `timerKey` restarts it when the same phase
// runs again at the same duration.
export default function PhaseBanner({ label, note, timerMs, timerKey = 0 }) {
  return (
    <div className="phase">
      <div className="phase__row">
        <span className="phase__label">{label}</span>
        {note && <span className="phase__note">{note}</span>}
      </div>
      {timerMs > 0 && (
        <div className="phase__timer">
          <div
            key={timerKey}
            className="phase__timer-fill"
            style={{ animationDuration: `${timerMs}ms` }}
          />
        </div>
      )}
    </div>
  )
}
