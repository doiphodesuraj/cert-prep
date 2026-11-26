import { navigate, useApp, useStats } from '../state/AppState'
import { pct } from '../lib/util'
import { Button, Card, Icon, PageHeader, ProgressBar, StatCard } from '../components/ui'
import { ExamHistoryList } from './Results'

export function Dashboard() {
  const { bank, progress, sessions, exam } = useApp()
  const s = useStats()
  const accuracy = pct(s.correct.length, s.attempted.length)
  const coverage = pct(s.attempted.length, s.total)
  const main = sessions['main']
  const lastExams = progress.examHistory.slice(-5)

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={bank ? `${bank.title} (${bank.code}) · ${s.total} questions extracted from the source PDF` : ''}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(exam?.status === 'running' ? 'exam/run' : 'exam')}>
              <Icon name="exam" className="size-4" /> {exam?.status === 'running' ? 'Resume exam' : 'Mock exam'}
            </Button>
            <Button onClick={() => navigate(main ? 'practice/main' : 'practice')}>
              <Icon name="play" className="size-4" /> {main ? 'Continue practice' : 'Start practice'}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total questions" value={s.total} icon="practice" tone="indigo" />
        <StatCard label="Attempted" value={s.attempted.length} icon="check" tone="violet" sub={`${coverage}% of the bank`} />
        <StatCard label="Remaining" value={s.notAttempted.length} icon="clock" tone="slate" />
        <StatCard label="Correct" value={s.correct.length} icon="check" tone="emerald" sub="latest attempt per question" />
        <StatCard label="Incorrect" value={s.incorrect.length} icon="x" tone="rose" sub="latest attempt per question" />
        <StatCard label="Accuracy" value={`${accuracy}%`} icon="chart" tone="amber" sub={s.attempted.length ? `${s.correct.length}/${s.attempted.length}` : 'no attempts yet'} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Learning progress</h2>
            <span className="tabular text-sm text-slate-500">{coverage}% covered</span>
          </div>
          <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-label="Correct, incorrect and remaining questions">
            <div className="bg-emerald-500 transition-all" style={{ width: `${pct(s.correct.length, s.total)}%` }} />
            <div className="bg-rose-500 transition-all" style={{ width: `${pct(s.incorrect.length, s.total)}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-emerald-500" /> Correct {s.correct.length}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-rose-500" /> Incorrect {s.incorrect.length}</span>
            <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-slate-300 dark:bg-slate-700" /> Not attempted {s.notAttempted.length}</span>
          </div>
          <h3 className="mt-7 mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">By topic</h3>
          <div className="space-y-4">
            {s.topics.map(([t, v]) => (
              <div key={t}>
                <div className="mb-1.5 flex justify-between gap-3 text-sm">
                  <span className="font-medium">{t}</span>
                  <span className="tabular text-slate-500">
                    {v.attempted}/{v.total} done · {v.attempted ? `${pct(v.correct, v.attempted)}% accuracy` : '—'}
                  </span>
                </div>
                <ProgressBar value={pct(v.attempted, v.total)} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold">Revision queue</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {[
                ['Bookmarked', progress.bookmarks.length, 'bookmark', 'text-amber-500'],
                ['Previously incorrect', s.incorrect.length, 'x', 'text-rose-500'],
                ['Flagged for review', progress.flagged.length, 'flag', 'text-violet-500'],
                ['Not attempted', s.notAttempted.length, 'clock', 'text-slate-400'],
              ].map(([label, n, icon, color]) => (
                <li key={label as string}>
                  <button onClick={() => navigate('revision')} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Icon name={icon as string} className={`size-4 ${color}`} />
                    <span className="flex-1 text-left">{label}</span>
                    <span className="tabular font-semibold">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Recent exams</h2>
              {progress.examHistory.length > 0 && <button className="text-sm text-indigo-600 dark:text-indigo-400" onClick={() => navigate('performance')}>View all</button>}
            </div>
            <div className="mt-2"><ExamHistoryList history={lastExams} /></div>
          </Card>
        </div>
      </div>
    </>
  )
}
