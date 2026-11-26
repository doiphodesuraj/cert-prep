import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { navigate, useApp } from '../state/AppState'
import { cx, formatDuration, isCorrect, orderedOptions, requiredCount, shuffle, uid } from '../lib/util'
import { OptionCard, QuestionText, SelectHint } from '../components/QuestionParts'
import { Badge, Button, Card, Icon, Modal, PageHeader } from '../components/ui'
import type { ExamResult, ExamState } from '../types'

/* ---------------- setup ---------------- */
export function ExamSetup() {
  const { bank, questions, exam, setExam, progress } = useApp()
  const defaults = bank?.exam ?? { questions: 65, minutes: 90, passPercent: 70 }
  const [count, setCount] = useState(Math.min(defaults.questions, questions.length))
  const [minutes, setMinutes] = useState(defaults.minutes)
  const [shuffleO, setShuffleO] = useState(false)
  const [pool, setPool] = useState<'all' | 'unattempted' | 'incorrect'>('all')
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const poolQs = questions.filter((q) => (pool === 'all' ? true : pool === 'unattempted' ? !progress.attempts[q.id] : progress.attempts[q.id] && !progress.attempts[q.id].correct))
  const n = Math.min(count, poolQs.length)

  const start = () => {
    const picked = shuffle(poolQs).slice(0, n)
    const optionOrder: ExamState['optionOrder'] = {}
    if (shuffleO) for (const q of picked) optionOrder[q.id] = shuffle(q.options.map((o) => o.id))
    setExam({ id: uid(), ids: picked.map((q) => q.id), optionOrder, answers: {}, visited: [], marked: [], index: 0, startedAt: Date.now(), durationSec: minutes * 60, status: 'running' })
    navigate('exam/run')
  }

  const running = exam?.status === 'running'
  const field = 'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900'
  return (
    <>
      <PageHeader title="Mock Exam" subtitle={`Timed exam simulation. Answers and explanations are revealed only after you submit. The real ${bank?.code} has ${defaults.questions} questions in ${defaults.minutes} minutes.`} />
      {running && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-4 border-amber-300 p-5 dark:border-amber-500/40">
          <div>
            <div className="flex items-center gap-2 font-semibold"><Icon name="clock" className="size-5 text-amber-500" /> Exam in progress</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {Object.keys(exam.answers).length} of {exam.ids.length} answered · time keeps running while you are away
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setConfirmDiscard(true)}>Discard</Button>
            <Button onClick={() => navigate('exam/run')}>Resume exam</Button>
          </div>
        </Card>
      )}
      <Card className="p-5 sm:p-6">
        <h2 className="font-semibold">Exam settings</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm font-medium">
            Number of questions
            <input type="number" min={1} max={questions.length} value={count} onChange={(e) => setCount(Math.max(1, Math.min(questions.length, +e.target.value || 1)))} className={cx(field, 'tabular')} />
          </label>
          <label className="text-sm font-medium">
            Time limit (minutes)
            <input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Math.max(1, Math.min(600, +e.target.value || 1)))} className={cx(field, 'tabular')} />
          </label>
          <label className="text-sm font-medium">
            Question pool
            <select value={pool} onChange={(e) => setPool(e.target.value as typeof pool)} className={field}>
              <option value="all">All {questions.length} questions</option>
              <option value="unattempted">Not attempted yet</option>
              <option value="incorrect">Previously incorrect</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            [defaults.questions, defaults.minutes, 'Full exam'],
            [30, Math.round((defaults.minutes / defaults.questions) * 30), 'Half exam'],
            [10, Math.round((defaults.minutes / defaults.questions) * 10), 'Quick quiz'],
          ].map(([c, m, label]) => (
            <button key={label} onClick={() => { setCount(c as number); setMinutes(m as number) }} className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-300">
              {label} · {c} q / {m} min
            </button>
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-indigo-600" checked={shuffleO} onChange={(e) => setShuffleO(e.target.checked)} /> Shuffle answer options (questions are always drawn in random order)
        </label>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {n} questions · {minutes} min · pass mark {defaults.passPercent}%
            {n < count && <span className="text-amber-600"> (only {poolQs.length} available in this pool)</span>}
          </span>
          <Button onClick={() => (running ? setConfirmDiscard(true) : start())} disabled={n === 0}>
            Start exam <Icon name="right" className="size-4" />
          </Button>
        </div>
      </Card>
      <Modal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard the exam in progress?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDiscard(false)}>Keep it</Button>
            <Button variant="danger" onClick={() => { setExam(null); setConfirmDiscard(false) }}>Discard exam</Button>
          </>
        }
      >
        Your answers for the current exam will be lost and it will not be scored.
      </Modal>
    </>
  )
}

/* ---------------- runner ---------------- */
type PaletteStatus = 'notVisited' | 'answered' | 'notAnswered' | 'marked' | 'answeredMarked'
const STATUS_LABEL: Record<PaletteStatus, string> = {
  notVisited: 'not visited',
  answered: 'answered',
  notAnswered: 'visited, not answered',
  marked: 'marked for review',
  answeredMarked: 'answered and marked for review',
}

export function ExamRunner() {
  const { exam, setExam, byId, recordAttempt, addExamResult, bank } = useApp()
  const [now, setNow] = useState(Date.now())
  const [confirm, setConfirm] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const submittingRef = useRef(false)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // mark current question as visited
  useEffect(() => {
    if (!exam || exam.status !== 'running') return
    const id = exam.ids[exam.index]
    if (!exam.visited.includes(id)) setExam((e) => (e ? { ...e, visited: [...e.visited, id] } : e))
  }, [exam, setExam])

  const finish = useCallback(
    (auto: boolean) => {
      if (!exam || exam.status !== 'running' || submittingRef.current) return // guard against double submission
      submittingRef.current = true
      const finishedAt = Date.now()
      const correctIds: number[] = [], incorrectIds: number[] = [], unansweredIds: number[] = []
      for (const id of exam.ids) {
        const q = byId.get(id)!
        const sel = exam.answers[id]
        if (!sel || sel.length === 0) unansweredIds.push(id)
        else if (isCorrect(q, sel)) correctIds.push(id)
        else incorrectIds.push(id)
        if (sel && sel.length) recordAttempt(q, sel, 'exam')
      }
      const result: ExamResult = {
        id: exam.id,
        bankId: bank?.id ?? '',
        startedAt: exam.startedAt,
        finishedAt,
        durationSec: exam.durationSec,
        timeTakenSec: Math.min(exam.durationSec, Math.round((finishedAt - exam.startedAt) / 1000)),
        ids: exam.ids,
        answers: exam.answers,
        correctIds,
        incorrectIds,
        unansweredIds,
        percent: Math.round((correctIds.length / exam.ids.length) * 1000) / 10,
        passPercent: bank?.exam.passPercent ?? 70,
        autoSubmitted: auto,
      }
      addExamResult(result)
      setExam(null)
      navigate(`results/${result.id}`)
    },
    [exam, byId, recordAttempt, addExamResult, setExam, bank],
  )

  const remaining = exam ? exam.durationSec - Math.floor((now - exam.startedAt) / 1000) : 0
  useEffect(() => {
    if (exam?.status === 'running' && remaining <= 0) finish(true)
  }, [remaining, exam, finish])

  const status = useCallback(
    (id: number): PaletteStatus => {
      if (!exam) return 'notVisited'
      const answered = (exam.answers[id]?.length ?? 0) > 0
      const marked = exam.marked.includes(id)
      if (marked) return answered ? 'answeredMarked' : 'marked'
      if (answered) return 'answered'
      return exam.visited.includes(id) ? 'notAnswered' : 'notVisited'
    },
    [exam],
  )

  const q = exam ? byId.get(exam.ids[exam.index]) : undefined
  const opts = useMemo(() => (q && exam ? orderedOptions(q, exam.optionOrder[q.id]) : []), [q, exam])
  const selected = (q && exam?.answers[q.id]) || []

  const goto = useCallback((i: number) => setExam((e) => (e ? { ...e, index: Math.max(0, Math.min(e.ids.length - 1, i)) } : e)), [setExam])
  const choose = useCallback(
    (optId: string) => {
      if (!q) return
      setExam((e) => {
        if (!e || e.status !== 'running') return e
        const cur = e.answers[q.id] ?? []
        const next = q.multiSelect ? (cur.includes(optId) ? cur.filter((x) => x !== optId) : cur.length >= requiredCount(q) ? cur : [...cur, optId]) : cur[0] === optId ? [] : [optId]
        return { ...e, answers: { ...e.answers, [q.id]: next.sort() } }
      })
    },
    [q, setExam],
  )
  const toggleMark = useCallback(() => q && setExam((e) => (e ? { ...e, marked: e.marked.includes(q.id) ? e.marked.filter((x) => x !== q.id) : [...e.marked, q.id] } : e)), [q, setExam])
  const clear = () => q && setExam((e) => (e ? { ...e, answers: { ...e.answers, [q.id]: [] } } : e))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirm || e.target instanceof HTMLInputElement || e.ctrlKey || e.metaKey || e.altKey || !exam) return
      const k = e.key.toLowerCase()
      if (/^[1-9]$/.test(k) && opts[+k - 1]) choose(opts[+k - 1].id)
      else if (k === 'arrowright' || k === 'enter') goto(exam.index + 1)
      else if (k === 'arrowleft') goto(exam.index - 1)
      else if (k === 'm') toggleMark()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [confirm, exam, opts, choose, goto, toggleMark])

  if (!exam || !q) {
    return (
      <Card className="p-8 text-center">
        <p className="font-semibold">No exam in progress.</p>
        <Button className="mt-4" onClick={() => navigate('exam')}>Set up a mock exam</Button>
      </Card>
    )
  }

  const counts = exam.ids.reduce(
    (acc, id) => {
      acc[status(id)]++
      return acc
    },
    { notVisited: 0, answered: 0, notAnswered: 0, marked: 0, answeredMarked: 0 } as Record<PaletteStatus, number>,
  )
  const answeredTotal = counts.answered + counts.answeredMarked
  const low = remaining <= 300

  const palette = (
    <div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 lg:grid-cols-5 xl:grid-cols-6">
        {exam.ids.map((id, i) => {
          const s = status(id)
          return (
            <button
              key={id}
              onClick={() => { goto(i); setPaletteOpen(false) }}
              aria-label={`Question ${i + 1}: ${STATUS_LABEL[s]}`}
              className={cx(
                'tabular relative grid aspect-square place-items-center rounded-lg border text-xs font-semibold transition',
                s === 'notVisited' && 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900',
                s === 'answered' && 'border-emerald-500 bg-emerald-500 text-white',
                s === 'notAnswered' && 'border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
                (s === 'marked' || s === 'answeredMarked') && 'border-violet-500 bg-violet-500 text-white',
                i === exam.index && 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-white dark:ring-offset-slate-900',
              )}
            >
              {i + 1}
              {s === 'answeredMarked' && <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />}
            </button>
          )
        })}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-slate-600 dark:text-slate-400">
        <li className="flex items-center gap-2"><span className="size-3 rounded border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />Not visited ({counts.notVisited})</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded bg-emerald-500" />Answered ({counts.answered})</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded border border-rose-400 bg-rose-50" />Not answered ({counts.notAnswered})</li>
        <li className="flex items-center gap-2"><span className="size-3 rounded bg-violet-500" />Marked ({counts.marked + counts.answeredMarked})</li>
      </ul>
    </div>
  )

  return (
    <div className="mx-auto max-w-6xl">
      <div className="sticky top-14 z-20 -mx-4 mb-5 flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10 dark:border-slate-800 dark:bg-slate-950/95">
        <div className="min-w-0">
          <div className="hidden text-xs text-slate-500 sm:block">Mock exam · {bank?.code}</div>
          <div className="tabular text-sm font-semibold">{answeredTotal}/{exam.ids.length} answered</div>
        </div>
        <div className={cx('tabular flex items-center gap-2 rounded-xl px-3 py-1.5 text-lg font-bold', low ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-white text-slate-800 shadow-sm dark:bg-slate-900 dark:text-slate-100')} role="timer" aria-label="Time remaining">
          <Icon name="clock" className="size-5" />
          {formatDuration(remaining)}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="lg:hidden" onClick={() => setPaletteOpen(true)} aria-label="Question palette"><Icon name="grid" className="size-4" /></Button>
          <Button variant="success" onClick={() => setConfirm(true)}>Submit<span className="hidden sm:inline"> exam</span></Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card className="p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="tabular text-sm font-semibold text-indigo-600 dark:text-indigo-400">
              Question {exam.index + 1} <span className="font-normal text-slate-400">of {exam.ids.length}</span>
            </div>
            <div className="flex items-center gap-2">
              {q.multiSelect && <Badge tone="violet">Select {requiredCount(q)}</Badge>}
              <button onClick={toggleMark} aria-pressed={exam.marked.includes(q.id)} className={cx('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition', exam.marked.includes(q.id) ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}>
                <Icon name="flag" className="size-4" filled={exam.marked.includes(q.id)} /> {exam.marked.includes(q.id) ? 'Marked for review' : 'Mark for review'}
              </button>
            </div>
          </div>
          <QuestionText q={q} />
          <div className="mt-2"><SelectHint q={q} selectedCount={selected.length} /></div>
          <div className="mt-5 space-y-2.5">
            {opts.map((o, i) => (
              <OptionCard key={o.id} option={o} index={i} multi={q.multiSelect} state={selected.includes(o.id) ? 'selected' : 'idle'} onSelect={() => choose(o.id)} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <Button variant="ghost" onClick={clear} disabled={selected.length === 0}>Clear response</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => goto(exam.index - 1)} disabled={exam.index === 0}><Icon name="left" className="size-4" /> Previous</Button>
              {exam.index < exam.ids.length - 1 ? (
                <Button onClick={() => goto(exam.index + 1)}>{selected.length ? 'Save & next' : 'Next'} <Icon name="right" className="size-4" /></Button>
              ) : (
                <Button variant="success" onClick={() => setConfirm(true)}>Review &amp; submit</Button>
              )}
            </div>
          </div>
        </Card>
        <aside className="hidden lg:block">
          <Card className="sticky top-24 p-4">
            <h3 className="mb-3 text-sm font-semibold">Question palette</h3>
            {palette}
          </Card>
        </aside>
      </div>
      <p className="mt-6 hidden text-center text-xs text-slate-400 sm:block">Shortcuts: 1–5 select · ← → navigate · M mark for review</p>

      {paletteOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setPaletteOpen(false)} />
          <div className="fade-in absolute inset-x-0 bottom-0 max-h-[75vh] overflow-auto rounded-t-2xl bg-white p-5 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Question palette</h3>
              <button onClick={() => setPaletteOpen(false)} aria-label="Close"><Icon name="x" /></button>
            </div>
            {palette}
          </div>
        </div>
      )}

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Submit your exam?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Return to exam</Button>
            <Button variant="success" onClick={() => finish(false)}>Submit final answers</Button>
          </>
        }
      >
        <div className="tabular grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-500/10"><div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{answeredTotal}</div><div className="text-xs">Answered</div></div>
          <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-500/10"><div className="text-xl font-bold text-rose-700 dark:text-rose-300">{exam.ids.length - answeredTotal}</div><div className="text-xs">Unanswered</div></div>
          <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-500/10"><div className="text-xl font-bold text-violet-700 dark:text-violet-300">{counts.marked + counts.answeredMarked}</div><div className="text-xs">Marked</div></div>
        </div>
        <p className="mt-4">Time remaining: <strong className="tabular">{formatDuration(remaining)}</strong>. After submitting you cannot change your answers.</p>
      </Modal>
    </div>
  )
}
