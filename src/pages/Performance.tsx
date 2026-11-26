import { useMemo, useRef, useState } from 'react'
import { useApp, useStats } from '../state/AppState'
import { cx, pct } from '../lib/util'
import { Button, Card, Modal, PageHeader, ProgressBar, StatCard } from '../components/ui'
import { ExamHistoryList } from './Results'

export function Performance() {
  const { questions, progress } = useApp()
  const s = useStats()
  const exams = progress.examHistory
  const best = exams.length ? Math.max(...exams.map((e) => e.percent)) : 0
  const avg = exams.length ? Math.round((exams.reduce((a, e) => a + e.percent, 0) / exams.length) * 10) / 10 : 0

  const byDifficulty = useMemo(() => {
    const m: Record<string, { total: number; attempted: number; correct: number }> = {}
    for (const q of questions) {
      const d = (m[q.difficulty] ??= { total: 0, attempted: 0, correct: 0 })
      d.total++
      const a = progress.attempts[q.id]
      if (a) {
        d.attempted++
        if (a.correct) d.correct++
      }
    }
    return ['Easy', 'Medium', 'Hard'].filter((k) => m[k]).map((k) => [k, m[k]] as const)
  }, [questions, progress])

  const multi = useMemo(() => {
    const att = questions.filter((q) => q.multiSelect && progress.attempts[q.id])
    return { attempted: att.length, correct: att.filter((q) => progress.attempts[q.id].correct).length }
  }, [questions, progress])

  return (
    <>
      <PageHeader title="Performance" subtitle="Accuracy is based on your most recent attempt at each question, across practice and exams." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Overall accuracy" value={`${pct(s.correct.length, s.attempted.length)}%`} icon="chart" tone="indigo" sub={`${s.correct.length}/${s.attempted.length} questions`} />
        <StatCard label="Exams taken" value={exams.length} icon="exam" tone="violet" />
        <StatCard label="Best exam score" value={exams.length ? `${best}%` : '—'} icon="check" tone="emerald" />
        <StatCard label="Average exam score" value={exams.length ? `${avg}%` : '—'} icon="chart" tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Accuracy by topic</h2>
          <div className="space-y-4">
            {s.topics.map(([t, v]) => {
              const p = pct(v.correct, v.attempted)
              return (
                <div key={t}>
                  <div className="mb-1.5 flex justify-between gap-2 text-sm">
                    <span className="font-medium">{t}</span>
                    <span className="tabular text-slate-500">{v.attempted ? `${p}% (${v.correct}/${v.attempted})` : 'not started'}</span>
                  </div>
                  <ProgressBar value={v.attempted ? p : 0} color={p >= 70 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-500' : 'bg-rose-500'} />
                </div>
              )
            })}
          </div>
          <h2 className="mt-8 mb-4 font-semibold">Accuracy by difficulty</h2>
          <div className="space-y-4">
            {byDifficulty.map(([d, v]) => {
              const p = pct(v.correct, v.attempted)
              return (
                <div key={d}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-medium">{d} <span className="font-normal text-slate-400">· {v.total} questions</span></span>
                    <span className="tabular text-slate-500">{v.attempted ? `${p}%` : '—'}</span>
                  </div>
                  <ProgressBar value={v.attempted ? p : 0} color="bg-indigo-500" />
                </div>
              )
            })}
            <p className="text-xs text-slate-500">Multiple-answer questions: {multi.attempted ? `${pct(multi.correct, multi.attempted)}% (${multi.correct}/${multi.attempted})` : 'none attempted yet'}</p>
          </div>
        </Card>
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Exam score trend</h2>
          <ScoreTrend scores={exams.map((e) => ({ p: e.percent, pass: e.passPercent }))} />
          <h2 className="mt-6 mb-2 font-semibold">Exam history</h2>
          <ExamHistoryList history={exams} />
        </Card>
      </div>
    </>
  )
}

function ScoreTrend({ scores }: { scores: { p: number; pass: number }[] }) {
  if (scores.length === 0) return <p className="text-sm text-slate-500">Take a mock exam to see your trend.</p>
  const last = scores.slice(-20)
  const pass = last[last.length - 1].pass
  return (
    <div className="relative h-44">
      <div className="absolute inset-x-0 border-t border-dashed border-emerald-500/60" style={{ bottom: `${pass}%` }}>
        <span className="absolute -top-5 right-0 text-[10px] font-medium text-emerald-600">pass {pass}%</span>
      </div>
      <div className="flex h-full items-end gap-1.5">
        {last.map((s, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <div className={cx('w-full rounded-t-md transition-all', s.p >= s.pass ? 'bg-emerald-500' : 'bg-rose-400')} style={{ height: `${Math.max(2, s.p)}%` }} title={`${s.p}%`} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function Settings() {
  const { bank, questions, progress, resetProgress, theme, toggleTheme } = useApp()
  const [confirm, setConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const flagged = questions.filter((q) => q.needsReview || q.sourceNote || q.manuallyVerified)

  const exportProgress = () => {
    const blob = new Blob([JSON.stringify({ bank: bank?.id, exportedAt: new Date().toISOString(), progress }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `certprep-${bank?.id}-progress.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const importProgress = async (f: File) => {
    try {
      const data = JSON.parse(await f.text())
      if (!data.progress?.attempts) throw new Error('Not a progress export')
      localStorage.setItem(`certprep:${bank?.id}:progress`, JSON.stringify(data.progress))
      location.reload()
    } catch (e) {
      alert(`Import failed: ${e}`)
    }
  }

  return (
    <>
      <PageHeader title="Data & shortcuts" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <h2 className="font-semibold">Question bank</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            <dt className="text-slate-500">Exam</dt><dd>{bank?.title} ({bank?.code})</dd>
            <dt className="text-slate-500">Source</dt><dd className="break-all">{bank?.source}</dd>
            <dt className="text-slate-500">Questions</dt><dd>{questions.length} ({questions.filter((q) => q.multiSelect).length} multiple-answer)</dd>
            <dt className="text-slate-500">Theme</dt><dd><button className="text-indigo-600 dark:text-indigo-400" onClick={toggleTheme}>{theme} (switch)</button></dd>
          </dl>
          <h3 className="mt-6 text-sm font-semibold">Extraction notes</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
            {flagged.map((q) => (
              <li key={q.id} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <strong>#{q.id}</strong> — {q.sourceNote ?? q.manuallyVerified ?? q.needsReview?.join('; ')}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">Topics and difficulty were assigned automatically (the PDF does not include them). Question text, options, answers and explanations come from the PDF.</p>
        </Card>
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold">Keyboard shortcuts</h2>
            <ul className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[
                ['1 – 5', 'Select option'],
                ['Enter', 'Submit answer / next question (practice)'],
                ['← →', 'Previous / next question'],
                ['B', 'Bookmark (practice)'],
                ['F', 'Flag for revision (practice)'],
                ['M', 'Mark for review (exam)'],
              ].map(([k, v]) => (
                <li key={k} className="contents">
                  <kbd className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-center font-mono text-xs dark:border-slate-700 dark:bg-slate-800">{k}</kbd>
                  <span>{v}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold">Your progress data</h2>
            <p className="mt-1 text-sm text-slate-500">Saved in this browser's localStorage. Export it to back it up or move it to another browser.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportProgress}>Export progress</Button>
              <Button variant="secondary" onClick={() => fileRef.current?.click()}>Import progress</Button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importProgress(e.target.files[0])} />
              <Button variant="danger" onClick={() => setConfirm(true)}>Reset all progress</Button>
            </div>
          </Card>
        </div>
      </div>
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Reset all progress?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => { resetProgress(); setConfirm(false) }}>Reset everything</Button>
          </>
        }
      >
        This permanently deletes your attempts, bookmarks, flags, practice sessions, any exam in progress and all exam history for {bank?.code} in this browser. It cannot be undone.
      </Modal>
    </>
  )
}
