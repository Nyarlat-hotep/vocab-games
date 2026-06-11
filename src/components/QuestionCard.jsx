import { useState } from 'react'
import { ArrowRight, CheckCircle } from '@phosphor-icons/react'

// Renders one question: the word/definition frame plus the answer options.
// Reveals correctness on selection, then surfaces a Next button.
export default function QuestionCard({ question, onAnswer, onNext, isLast }) {
  const [selected, setSelected] = useState(null)
  const answered = selected !== null

  function choose(i) {
    if (answered) return
    setSelected(i)
    onAnswer(question.options[i].correct)
  }

  function optionClass(i) {
    if (!answered) return 'option'
    if (question.options[i].correct) return 'option option--correct'
    if (i === selected) return 'option option--wrong'
    return 'option option--muted'
  }

  return (
    <div className="card">
      <div className="card__frame">
        <div className="card__word-row">
          <h2 className="card__word">{question.word}</h2>
          {question.partOfSpeech && <span className="card__pos">{question.partOfSpeech}</span>}
        </div>
        {question.definition && <p className="card__def">{question.definition}</p>}
        <p className="card__prompt">{question.prompt}</p>
      </div>

      <ul className="card__options">
        {question.options.map((opt, i) => (
          <li key={i}>
            <button className={optionClass(i)} onClick={() => choose(i)} disabled={answered}>
              {opt.label}
            </button>
          </li>
        ))}
      </ul>

      {answered && (
        <button className="card__next" onClick={onNext}>
          {isLast ? (
            <>See results <CheckCircle weight="bold" size={20} /></>
          ) : (
            <>Next <ArrowRight weight="bold" size={20} /></>
          )}
        </button>
      )}
    </div>
  )
}
