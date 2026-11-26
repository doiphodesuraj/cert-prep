import { useMemo, useState } from 'react'
import { navigate, useApp } from '../state/AppState'
import { buildSession } from '../lib/sessions'
import { cx, formatDate, formatDuration, pct } from '../lib/util'
import { AnswerReview, QuestionText } from '../components/QuestionParts'
import { Badge, Button, Card, EmptyState, Icon, PageHeader, ProgressBar, StatCard } from '../components/ui'
import type { ExamResult } from '../types'

export function Results({ id }: { id: string }) {
  const { progress, byId, saveSession, setExam } = useApp()
  const r = progress.examHistory.find((x) => x.id === id)
  const [filter, setFilter] = useState<'wrong' | 'all'>('wrong')
  const [open, setOpen] = useState<number | null>(null)

  const topics = useMemo(() => {
    if (!r) return []
    const m = new Map<string, { total: number; correct: number }>()
    for (const qid of r.ids) {
      const q = byId.get(qid)
      if (!q) continue
      const t = m.get(q.topic) ?? { total: 0, correct: 0 }
      t.total++
      if (r.correctIds.includes(qid)) t.correct++
      m.set(q.topic, t)
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [r, byId])

  if (!r) return <EmptyState icon="chart" title="Result not found">This exam result is not stored in this browser.</EmptyState>

  const passed = r.percent >= r.passPercent
  const wrong = [...r.incorrectIds, ...r.unansweredIds].sort((a, b) => r.ids.indexOf(a) - r.ids.indexOf(b))
  const list = filter === 'wrong' ? wrong : r.ids
  const retry = () => {
    const qs = wrong.map((x) => byId.get(x)!).filter(Boolean)
    saveSession(buildSession(`retry-${r.id}`, `Retry exam mistakes (${qs.length})`, qs))
    navigate(`practice/retry-${r.id}`)
  }

  return (
    <>
      <PageHeader
        title="Exam results"
        subtitle={`${formatDate(r.finishedAt)}${r.autoSubmitted ? ' · auto-submitted when time ran out' : ''}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => { setExam(null); navigate('exam') }}>Restart new exam</Button>
            {wrong.length > 0 && <Button onClick={retry}>Retry {wrong.length} incorrect / unanswered</Button>}
          </>
        }
      />
      <Card className={cx('mb-6 overflow-hidden p-6 sm:p-8', passed ? 'border-emerald-300 dark:border-emerald-500/40' : 'border-rose-300 dark:border-rose-500/40')}>
        <div className="flex flex-wrap items-center gap-6">
          <ScoreRing value={r.percent} passed={passed} />
          <div>
            <Badge tone={passed ? 'emerald' : 'rose'}>{passed ? 'PASS' : 'BELOW PASS MARK'}</Badge>
            <div className="tabular mt-2 text-4xl font-bold tracking-tight">{r.percent}%</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              {r.correctIds.length} of {r.ids.length} correct · pass mark {r.passPercent}%
            </div>
          </div>
        </div>
      </Card>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total questions" value={r.ids.length} icon="practice" tone="indigo" />
        <StatCard label="Correct" value={r.correctIds.length} icon="check" tone="emerald" />
        <StatCard label="Incorrect" value={r.incorrectIds.length} icon="x" tone="rose" />
        <StatCard label="Unanswered" value={r.unansweredIds.length} icon="alert" tone="amber" />
        <StatCard label="Time taken" value={formatDuration(r.timeTakenSec)} sub={`of ${formatDuration(r.durationSec)}`} icon="clock" tone="violet" />
      </div>
      <Card className="mb-6 p-5 sm:p-6">
        <h2 className="mb-4 font-semibold">Topic-wise performance</h2>
        <div className="space-y-4">
          {topics.map(([t, s]) => {
            const p = pct(s.correct, s.total)
            return (
              <div key={t}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium">{t}</span>
                  <span className="tabular text-slate-500">{s.correct}/{s.total} · {p}%</span>
                </div>
                <ProgressBar value={p} color={p >= r.passPercent ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-500' : 'bg-rose-500'} />
              </div>
            )
          })}
        </div>
      </Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Question review</h2>
        <div className="flex rounded-xl bg-slate-200/70 p-1 text-sm dark:bg-slate-800">
          {(['wrong', 'all'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={cx('rounded-lg px-3 py-1.5 font-medium', filter === f ? 'bg-white shadow-sm dark:bg-slate-900' : 'text-slate-500')}>
              {f === 'wrong' ? `Incorrect & unanswered (${wrong.length})` : `All (${r.ids.length})`}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {list.length === 0 && <EmptyState icon="check" title="Perfect score">Every question was answered correctly.</EmptyState>}
        {list.map((qid) => {
          const q = byId.get(qid)
          if (!q) return null
          const sel = r.answers[qid] ?? []
          const st = r.correctIds.includes(qid) ? 'correct' : r.unansweredIds.includes(qid) ? 'unanswered' : 'incorrect'
          const isOpen = open === qid
          return (
            <Card key={qid} className="overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : qid)} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={isOpen}>
                <span className={cx('mt-0.5 grid size-6 shrink-0 place-items-center rounded-full text-white', st === 'correct' ? 'bg-emerald-500' : st === 'incorrect' ? 'bg-rose-500' : 'bg-amber-500')}>
                  <Icon name={st === 'correct' ? 'check' : st === 'incorrect' ? 'x' : 'alert'} className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-xs text-slate-500">Q{r.ids.indexOf(qid) + 1} · #{q.id} · {q.topic}</span>
                  <span className="mt-0.5 line-clamp-2 block text-sm font-medium">{q.question}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Your answer: <strong>{sel.length ? sel.join(', ') : '—'}</strong> · Correct: <strong className="text-emerald-600 dark:text-emerald-400">{q.correctAnswers.join(', ')}</strong>
                  </span>
                </span>
                <Icon name={isOpen ? 'left' : 'right'} className={cx('size-4 shrink-0 text-slate-400 transition', isOpen && '-rotate-90')} />
              </button>
              {isOpen && (
                <div className="border-t border-slate-200 p-4 sm:p-5 dark:border-slate-800">
                  <QuestionText q={q} />
                  <ul className="my-4 space-y-1.5 text-sm">
                    {q.options.map((o) => (
                      <li key={o.id} className={cx('flex gap-2 rounded-lg px-3 py-2', q.correctAnswers.includes(o.id) ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200' : sel.includes(o.id) ? 'bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200' : '')}>
                        <strong>{o.id}.</strong> {o.text}
                      </li>
                    ))}
                  </ul>
                  <AnswerReview q={q} selected={sel} />
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

function ScoreRing({ value, passed }: { value: number; passed: boolean }) {
  const r = 42, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 100 100" className="size-28 -rotate-90" aria-hidden="true">
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" className="stroke-slate-200 dark:stroke-slate-800" />
      <circle cx="50" cy="50" r={r} fill="none" strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className={cx('transition-all duration-700', passed ? 'stroke-emerald-500' : 'stroke-rose-500')} />
    </svg>
  )
}

export function ExamHistoryList({ history }: { history: ExamResult[] }) {
  if (history.length === 0) return <p className="text-sm text-slate-500">No exams taken yet.</p>
  return (
    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
      {history.slice().reverse().map((r) => (
        <li key={r.id}>
          <button onClick={() => navigate(`results/${r.id}`)} className="flex w-full items-center gap-4 py-3 text-left hover:opacity-80">
            <span className={cx('tabular w-16 text-lg font-bold', r.percent >= r.passPercent ? 'text-emerald-600' : 'text-rose-600')}>{r.percent}%</span>
            <span className="flex-1 text-sm">
              <span className="block font-medium">{r.correctIds.length}/{r.ids.length} correct</span>
              <span className="text-xs text-slate-500">{formatDate(r.finishedAt)} · {formatDuration(r.timeTakenSec)}</span>
            </span>
            <Icon name="right" className="size-4 text-slate-400" />
          </button>
        </li>
      ))}
    </ul>
  )
}
