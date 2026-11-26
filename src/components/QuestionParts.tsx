import type { Option, Question } from '../types'
import { linkify, paragraphs, whyIncorrect } from '../lib/explain'
import { cx, requiredCount } from '../lib/util'
import { Badge, Icon } from './ui'

export type OptionState = 'idle' | 'selected' | 'correct' | 'incorrect' | 'missed' | 'dim'

export function OptionCard({ option, state, multi, disabled, onSelect, index }: { option: Option; state: OptionState; multi: boolean; disabled?: boolean; onSelect?: () => void; index: number }) {
  const styles: Record<OptionState, string> = {
    idle: 'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500/60 dark:hover:bg-indigo-500/5',
    selected: 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20 dark:border-indigo-400 dark:bg-indigo-500/10',
    correct: 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 dark:border-emerald-400 dark:bg-emerald-500/10',
    incorrect: 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/20 dark:border-rose-400 dark:bg-rose-500/10',
    missed: 'border-emerald-500 border-dashed bg-emerald-50/50 dark:border-emerald-400 dark:bg-emerald-500/5',
    dim: 'border-slate-200 bg-white opacity-70 dark:border-slate-800 dark:bg-slate-900',
  }
  const letter: Record<OptionState, string> = {
    idle: 'border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300',
    selected: 'border-indigo-600 bg-indigo-600 text-white dark:border-indigo-400 dark:bg-indigo-500',
    correct: 'border-emerald-600 bg-emerald-600 text-white',
    incorrect: 'border-rose-600 bg-rose-600 text-white',
    missed: 'border-emerald-600 text-emerald-700 dark:text-emerald-300',
    dim: 'border-slate-300 text-slate-400 dark:border-slate-700',
  }
  return (
    <button
      type="button"
      role={multi ? 'checkbox' : 'radio'}
      aria-checked={state === 'selected' || state === 'correct' || state === 'incorrect'}
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        'group flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:p-4',
        styles[state],
        disabled && state !== 'dim' ? 'cursor-default' : '',
        !disabled && 'cursor-pointer',
      )}
    >
      <span className={cx('grid size-7 shrink-0 place-items-center border text-sm font-semibold transition', multi ? 'rounded-md' : 'rounded-full', letter[state])}>
        {state === 'correct' ? <Icon name="check" className="size-4" /> : state === 'incorrect' ? <Icon name="x" className="size-4" /> : option.id}
      </span>
      <span className="flex-1 pt-0.5 text-[15px] leading-relaxed">{option.text}</span>
      <span className="hidden pt-1 text-xs text-slate-400 sm:block" aria-hidden="true">{index + 1}</span>
    </button>
  )
}

export function QuestionText({ q }: { q: Question }) {
  return (
    <div className="space-y-2 text-[17px] leading-relaxed font-medium text-slate-900 dark:text-slate-100">
      {paragraphs(q.question).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  )
}

export function SelectHint({ q, selectedCount }: { q: Question; selectedCount: number }) {
  const n = requiredCount(q)
  if (n === 1) return <p className="text-sm text-slate-500 dark:text-slate-400">Select one answer.</p>
  return (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      Multiple answers: select <strong className="text-slate-700 dark:text-slate-200">{n}</strong> options ({selectedCount}/{n} selected).
    </p>
  )
}

export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cx('space-y-3 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300', className)}>
      {paragraphs(text).map((p, i) => (
        <p key={i} className={/^(\d+\.|[•●▪◦-])\s/.test(p) ? 'pl-4' : undefined}>
          {linkify(p).map((s, j) =>
            s.type === 'link' ? (
              <a key={j} href={s.value} target="_blank" rel="noreferrer noopener" className="break-all text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-500 dark:text-indigo-400">
                {s.value}
              </a>
            ) : (
              <span key={j}>{s.value}</span>
            ),
          )}
        </p>
      ))}
    </div>
  )
}

export function SourceNote({ q }: { q: Question }) {
  if (!q.sourceNote) return null
  return (
    <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <Icon name="alert" className="mt-0.5 size-5 shrink-0" />
      <p>{q.sourceNote}</p>
    </div>
  )
}

export function AnswerReview({ q, selected, showStatus = true }: { q: Question; selected: string[]; showStatus?: boolean }) {
  const correct = selected.length === q.correctAnswers.length && q.correctAnswers.every((a) => selected.includes(a))
  const wrongPicks = selected.filter((s) => !q.correctAnswers.includes(s))
  const why = wrongPicks.map((id) => ({ id, paras: whyIncorrect(q, id) })).filter((w) => w.paras.length)
  const answered = selected.length > 0
  return (
    <div className="fade-in space-y-4">
      {showStatus && (
        <div
          className={cx(
            'flex items-center gap-3 rounded-xl p-4 font-semibold',
            correct ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300',
          )}
          role="status"
        >
          <span className={cx('grid size-8 place-items-center rounded-full text-white', correct ? 'bg-emerald-600' : 'bg-rose-600')}>
            <Icon name={correct ? 'check' : 'x'} className="size-4" />
          </span>
          <div>
            <div>{correct ? 'Correct' : answered ? 'Incorrect' : 'Not answered'}</div>
            <div className="text-sm font-normal opacity-90">
              Correct answer{q.correctAnswers.length > 1 ? 's' : ''}: <strong>{q.correctAnswers.join(', ')}</strong>
              {answered && !correct && (
                <>
                  {' '}· Your answer: <strong>{selected.slice().sort().join(', ')}</strong>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      <SourceNote q={q} />
      {why.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-500/30 dark:bg-rose-500/5">
          <h4 className="mb-2 text-sm font-semibold text-rose-800 dark:text-rose-300">Why your selection is incorrect (from the source explanation)</h4>
          {why.map((w) => (
            <div key={w.id} className="mt-2">
              <Badge tone="rose" className="mb-1">Option {w.id}</Badge>
              <RichText text={w.paras.join('\n')} />
            </div>
          ))}
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Icon name="info" className="size-4 text-indigo-500" /> Explanation
        </h4>
        <RichText text={q.explanation} />
        <p className="mt-4 text-xs text-slate-400">Source: PDF page{q.sourcePages.length > 1 ? 's' : ''} {q.sourcePages.join(', ')}</p>
      </div>
    </div>
  )
}

export function QuestionMeta({ q }: { q: Question }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="indigo">{q.topic}</Badge>
      <Badge tone={q.difficulty === 'Hard' ? 'rose' : q.difficulty === 'Easy' ? 'emerald' : 'amber'}>{q.difficulty}</Badge>
      {q.multiSelect && <Badge tone="violet">Multiple answers</Badge>}
    </div>
  )
}
