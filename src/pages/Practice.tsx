import { useCallback, useEffect, useMemo, useState } from 'react'
import { navigate, useApp } from '../state/AppState'
import { buildSession } from '../lib/sessions'
import { cx, isCorrect, orderedOptions, requiredCount } from '../lib/util'
import { AnswerReview, OptionCard, QuestionMeta, QuestionText, SelectHint, type OptionState } from '../components/QuestionParts'
import { Badge, Button, Card, EmptyState, Icon, PageHeader, ProgressBar } from '../components/ui'
import type { Question } from '../types'

/* ---------------- setup ---------------- */
export function PracticeSetup() {
  const { questions, progress, sessions, saveSession } = useApp()
  const topics = useMemo(() => [...new Set(questions.map((q) => q.topic))].sort(), [questions])
  const [topic, setTopic] = useState('all')
  const [status, setStatus] = useState<'all' | 'unattempted' | 'incorrect'>('all')
  const [difficulty, setDifficulty] = useState('all')
  const [shuffleQ, setShuffleQ] = useState(false)
  const [shuffleO, setShuffleO] = useState(false)
  const main = sessions['main']

  const filtered = questions.filter(
    (q) =>
      (topic === 'all' || q.topic === topic) &&
      (difficulty === 'all' || q.difficulty === difficulty) &&
      (status === 'all' || (status === 'unattempted' ? !progress.attempts[q.id] : progress.attempts[q.id] && !progress.attempts[q.id].correct)),
  )

  const start = () => {
    const parts = [topic !== 'all' && topic, difficulty !== 'all' && difficulty, status !== 'all' && (status === 'unattempted' ? 'Not attempted' : 'Incorrect')].filter(Boolean)
    saveSession(buildSession('main', parts.length ? `Practice · ${parts.join(' · ')}` : 'All questions', filtered, { shuffleQuestions: shuffleQ, shuffleOptions: shuffleO }))
    navigate('practice/main')
  }

  const select = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900'
  return (
    <>
      <PageHeader title="Practice Questions" subtitle="One question at a time with instant feedback and the full explanation from the source PDF." />
      {main && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Continue where you left off</div>
            <div className="font-semibold">{main.title}</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Question {main.index + 1} of {main.ids.length} · {Object.keys(main.submitted).length} answered in this session
            </div>
          </div>
          <Button onClick={() => navigate('practice/main')}>
            <Icon name="play" className="size-4" /> Continue
          </Button>
        </Card>
      )}
      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold">{main ? 'Start a new practice session' : 'Configure your practice session'}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Topic
            <select className={cx(select, 'mt-1.5')} value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="all">All topics</option>
              {topics.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Difficulty
            <select className={cx(select, 'mt-1.5')} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option value="all">All levels</option>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            Status
            <select className={cx(select, 'mt-1.5')} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">All questions</option>
              <option value="unattempted">Not attempted yet</option>
              <option value="incorrect">Previously incorrect</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-indigo-600" checked={shuffleQ} onChange={(e) => setShuffleQ(e.target.checked)} /> Shuffle questions
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-indigo-600" checked={shuffleO} onChange={(e) => setShuffleO(e.target.checked)} /> Shuffle answer options
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            <strong className="tabular text-slate-800 dark:text-slate-200">{filtered.length}</strong> question{filtered.length === 1 ? '' : 's'} match
          </span>
          <Button onClick={start} disabled={filtered.length === 0}>
            Start practice <Icon name="right" className="size-4" />
          </Button>
        </div>
      </Card>
    </>
  )
}

/* ---------------- runner ---------------- */
export function PracticeRunner({ sessionKey }: { sessionKey: string }) {
  const { sessions, byId, saveSession, recordAttempt, progress, toggleBookmark, toggleFlag } = useApp()
  const session = sessions[sessionKey]
  const qid = session?.ids[session.index]
  const q = qid !== undefined ? byId.get(qid) : undefined
  const submitted = q && session ? session.submitted[q.id] : undefined
  const [selected, setSelected] = useState<string[]>([])
  const [showSummary, setShowSummary] = useState(false)

  useEffect(() => {
    setSelected(submitted ?? [])
    // reset when question changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qid])

  const goto = useCallback(
    (i: number) => {
      if (!session) return
      const index = Math.max(0, Math.min(session.ids.length - 1, i))
      saveSession({ ...session, index })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [session, saveSession],
  )

  const choose = useCallback(
    (id: string) => {
      if (!q || submitted) return
      if (q.multiSelect) setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= requiredCount(q) ? s : [...s, id]))
      else setSelected([id])
    },
    [q, submitted],
  )

  const canSubmit = !!q && !submitted && selected.length === requiredCount(q)
  const submit = useCallback(() => {
    if (!q || !session || submitted || selected.length !== requiredCount(q)) return // prevents double submission
    const sel = selected.slice().sort()
    recordAttempt(q, sel, 'practice')
    saveSession({ ...session, submitted: { ...session.submitted, [q.id]: sel } })
  }, [q, session, submitted, selected, recordAttempt, saveSession])

  const isLast = session ? session.index === session.ids.length - 1 : false
  const opts = q ? orderedOptions(q, session?.optionOrder[q.id]) : []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.ctrlKey || e.metaKey || e.altKey) return
      if (!q || !session) return
      const k = e.key.toLowerCase()
      if (/^[1-9]$/.test(k) && opts[+k - 1]) choose(opts[+k - 1].id)
      else if (/^[a-h]$/.test(k) && k !== 'b' && k !== 'f' && opts.some((o) => o.id.toLowerCase() === k)) choose(k.toUpperCase())
      else if (k === 'enter') {
        e.preventDefault()
        if (!submitted) submit()
        else if (!isLast) goto(session.index + 1)
        else setShowSummary(true)
      } else if (k === 'arrowright') goto(session.index + 1)
      else if (k === 'arrowleft') goto(session.index - 1)
      else if (k === 'b' && !e.shiftKey) toggleBookmark(q.id)
      else if (k === 'f') toggleFlag(q.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [q, session, opts, choose, submit, submitted, isLast, goto, toggleBookmark, toggleFlag])

  if (!session) {
    return (
      <EmptyState icon="practice" title="This practice session no longer exists">
        <Button className="mt-4" onClick={() => navigate('practice')}>Go to practice</Button>
      </EmptyState>
    )
  }
  if (!q) return <EmptyState icon="alert" title="Question not found" />

  const answeredCount = Object.keys(session.submitted).length
  const sessionCorrect = Object.entries(session.submitted).filter(([id, sel]) => isCorrect(byId.get(+id)!, sel)).length
  const bookmarked = progress.bookmarks.includes(q.id)
  const flagged = progress.flagged.includes(q.id)

  if (showSummary) {
    return <SessionSummary title={session.title} total={session.ids.length} answered={answeredCount} correct={sessionCorrect} incorrectQs={Object.entries(session.submitted).filter(([id, sel]) => !isCorrect(byId.get(+id)!, sel)).map(([id]) => byId.get(+id)!)} onBack={() => setShowSummary(false)} />
  }

  const stateOf = (id: string): OptionState => {
    if (!submitted) return selected.includes(id) ? 'selected' : 'idle'
    const isAns = q.correctAnswers.includes(id)
    const picked = submitted.includes(id)
    if (isAns && picked) return 'correct'
    if (isAns) return 'missed'
    if (picked) return 'incorrect'
    return 'dim'
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate(sessionKey === 'main' ? 'practice' : 'revision')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          <Icon name="left" className="size-4" /> {session.title}
        </button>
        <div className="tabular text-sm text-slate-500 dark:text-slate-400">
          {answeredCount} answered · {sessionCorrect} correct
        </div>
      </div>
      <ProgressBar value={((session.index + 1) / session.ids.length) * 100} className="mb-6" />

      <Card className="p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="tabular text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Question {session.index + 1} <span className="font-normal text-slate-400">of {session.ids.length}</span>
              <span className="ml-2 font-normal text-slate-400">· #{q.id} in PDF</span>
            </div>
            <div className="mt-2"><QuestionMeta q={q} /></div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => toggleBookmark(q.id)} title="Bookmark (B)" aria-pressed={bookmarked} className={cx('rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800', bookmarked ? 'text-amber-500' : 'text-slate-400')}>
              <Icon name="bookmark" filled={bookmarked} />
            </button>
            <button onClick={() => toggleFlag(q.id)} title="Flag for revision (F)" aria-pressed={flagged} className={cx('rounded-lg p-2 transition hover:bg-slate-100 dark:hover:bg-slate-800', flagged ? 'text-violet-500' : 'text-slate-400')}>
              <Icon name="flag" filled={flagged} />
            </button>
          </div>
        </div>

        <QuestionText q={q} />
        <div className="mt-2"><SelectHint q={q} selectedCount={selected.length} /></div>

        <div className="mt-5 space-y-2.5" role={q.multiSelect ? 'group' : 'radiogroup'}>
          {opts.map((o, i) => (
            <OptionCard key={o.id} option={o} index={i} multi={q.multiSelect} state={stateOf(o.id)} disabled={!!submitted} onSelect={() => choose(o.id)} />
          ))}
        </div>

        {!submitted && (
          <div className="mt-6 flex justify-end">
            <Button onClick={submit} disabled={!canSubmit}>Submit answer</Button>
          </div>
        )}
        {submitted && (
          <div className="mt-6">
            <AnswerReview q={q} selected={submitted} />
          </div>
        )}
      </Card>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => goto(session.index - 1)} disabled={session.index === 0}>
          <Icon name="left" className="size-4" /> Previous
        </Button>
        <JumpTo total={session.ids.length} current={session.index} onJump={goto} />
        {isLast ? (
          <Button onClick={() => setShowSummary(true)}>Finish</Button>
        ) : (
          <Button variant={submitted ? 'primary' : 'secondary'} onClick={() => goto(session.index + 1)}>
            Next <Icon name="right" className="size-4" />
          </Button>
        )}
      </div>
      <p className="mt-6 hidden text-center text-xs text-slate-400 sm:block">
        Shortcuts: <kbd>1–5</kbd> select · <kbd>Enter</kbd> submit / next · <kbd>←</kbd> <kbd>→</kbd> navigate · <kbd>B</kbd> bookmark · <kbd>F</kbd> flag
      </p>
    </div>
  )
}

function JumpTo({ total, current, onJump }: { total: number; current: number; onJump: (i: number) => void }) {
  const [v, setV] = useState('')
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const n = parseInt(v, 10)
        if (n >= 1 && n <= total) onJump(n - 1)
        setV('')
      }}
      className="flex items-center gap-2 text-sm text-slate-500"
    >
      <span className="hidden sm:inline">Go to</span>
      <input value={v} onChange={(e) => setV(e.target.value.replace(/\D/g, ''))} placeholder={String(current + 1)} inputMode="numeric" aria-label="Go to question number" className="tabular w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center dark:border-slate-700 dark:bg-slate-900" />
    </form>
  )
}

function SessionSummary({ title, total, answered, correct, incorrectQs, onBack }: { title: string; total: number; answered: number; correct: number; incorrectQs: Question[]; onBack: () => void }) {
  const { saveSession } = useApp()
  const pct = answered ? Math.round((correct / answered) * 100) : 0
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="fade-in p-6 text-center sm:p-8">
        <Badge tone="indigo">{title}</Badge>
        <h1 className="mt-3 text-2xl font-bold">Session complete</h1>
        <div className="tabular mt-6 grid grid-cols-3 gap-3">
          <div><div className="text-3xl font-bold">{answered}<span className="text-base text-slate-400">/{total}</span></div><div className="text-xs text-slate-500">Answered</div></div>
          <div><div className="text-3xl font-bold text-emerald-600">{correct}</div><div className="text-xs text-slate-500">Correct</div></div>
          <div><div className="text-3xl font-bold">{pct}%</div><div className="text-xs text-slate-500">Accuracy</div></div>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={onBack}>Review questions</Button>
          {incorrectQs.length > 0 && (
            <Button
              onClick={() => {
                saveSession(buildSession('retry-practice', `Retry ${incorrectQs.length} incorrect`, incorrectQs))
                navigate('practice/retry-practice')
                onBack()
              }}
            >
              Retry {incorrectQs.length} incorrect
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('dashboard')}>Dashboard</Button>
        </div>
      </Card>
    </div>
  )
}
