import { useMemo, useState } from 'react'
import { navigate, useApp, useStats } from '../state/AppState'
import { buildSession } from '../lib/sessions'
import { cx } from '../lib/util'
import { Badge, Button, Card, EmptyState, Icon, PageHeader } from '../components/ui'
import type { Question } from '../types'

type Tab = 'bookmarks' | 'incorrect' | 'flagged' | 'unattempted'
const TABS: { id: Tab; label: string; icon: string; empty: string }[] = [
  { id: 'bookmarks', label: 'Bookmarked', icon: 'bookmark', empty: 'Bookmark difficult questions during practice to collect them here.' },
  { id: 'incorrect', label: 'Previously incorrect', icon: 'x', empty: 'Questions whose latest attempt was wrong will appear here.' },
  { id: 'flagged', label: 'Marked for review', icon: 'flag', empty: 'Flag questions during practice to revisit them here.' },
  { id: 'unattempted', label: 'Not attempted', icon: 'clock', empty: 'You have attempted every question.' },
]

export function Revision() {
  const { byId, progress, saveSession, sessions } = useApp()
  const s = useStats()
  const [tab, setTab] = useState<Tab>('bookmarks')
  const sets: Record<Tab, number[]> = {
    bookmarks: progress.bookmarks,
    incorrect: s.incorrect,
    flagged: progress.flagged,
    unattempted: s.notAttempted,
  }
  const current = TABS.find((t) => t.id === tab)!
  const qs = sets[tab].map((id) => byId.get(id)).filter((q): q is Question => !!q).sort((a, b) => a.id - b.id)
  const key = `rev-${tab}`

  const start = (shuffleQuestions: boolean) => {
    saveSession(buildSession(key, `Revision · ${current.label}`, qs, { shuffleQuestions }))
    navigate(`practice/${key}`)
  }

  return (
    <>
      <PageHeader title="Revision" subtitle="Focus your study on the questions that need it most. Each set can be practised on its own." />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cx(
              'rounded-2xl border p-4 text-left transition',
              tab === t.id ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20 dark:bg-indigo-500/10' : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900',
            )}
          >
            <Icon name={t.icon} className="size-5 text-indigo-500" />
            <div className="tabular mt-2 text-2xl font-bold">{sets[t.id].length}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">{t.label}</div>
          </button>
        ))}
      </div>
      {qs.length === 0 ? (
        <EmptyState icon={current.icon} title={`No ${current.label.toLowerCase()} questions`}>{current.empty}</EmptyState>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">{current.label} · {qs.length}</h2>
            <div className="flex gap-2">
              {sessions[key] && <Button variant="secondary" onClick={() => navigate(`practice/${key}`)}>Continue session</Button>}
              <Button variant="secondary" onClick={() => start(true)}><Icon name="shuffle" className="size-4" /> Shuffled</Button>
              <Button onClick={() => start(false)}><Icon name="play" className="size-4" /> Practise these</Button>
            </div>
          </div>
          <QuestionList qs={qs} />
        </>
      )}
    </>
  )
}

export function QuestionList({ qs, onRemove }: { qs: Question[]; onRemove?: (id: number) => void }) {
  const { progress, saveSession } = useApp()
  return (
    <Card className="divide-y divide-slate-200 dark:divide-slate-800">
      {qs.slice(0, 300).map((q) => {
        const a = progress.attempts[q.id]
        return (
          <div key={q.id} className="flex items-start gap-3 p-4">
            <span className="tabular w-12 shrink-0 pt-0.5 text-sm font-semibold text-slate-400">#{q.id}</span>
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                saveSession(buildSession('single', `Question #${q.id}`, [q]))
                navigate('practice/single')
              }}
            >
              <p className="line-clamp-2 text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">{q.question}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge>{q.topic}</Badge>
                {a && <Badge tone={a.correct ? 'emerald' : 'rose'}>{a.correct ? 'Last: correct' : 'Last: incorrect'} · {a.count} attempt{a.count > 1 ? 's' : ''}</Badge>}
              </div>
            </button>
            {onRemove && (
              <button onClick={() => onRemove(q.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-500 dark:hover:bg-slate-800" aria-label={`Remove bookmark from question ${q.id}`}>
                <Icon name="trash" className="size-4" />
              </button>
            )}
          </div>
        )
      })}
      {qs.length > 300 && <p className="p-4 text-center text-sm text-slate-500">Showing the first 300 of {qs.length}. Start a session to practise all of them.</p>}
    </Card>
  )
}

export function Bookmarks() {
  const { byId, progress, toggleBookmark, saveSession } = useApp()
  const [query, setQuery] = useState('')
  const qs = useMemo(
    () =>
      progress.bookmarks
        .map((id) => byId.get(id))
        .filter((q): q is Question => !!q)
        .filter((q) => !query || `${q.id} ${q.question} ${q.options.map((o) => o.text).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.id - b.id),
    [progress.bookmarks, byId, query],
  )
  return (
    <>
      <PageHeader
        title="Bookmarks"
        subtitle="Questions you saved for later. Click a question to open it."
        actions={
          progress.bookmarks.length > 0 && (
            <Button
              onClick={() => {
                saveSession(buildSession('rev-bookmarks', 'Revision · Bookmarked', qs))
                navigate('practice/rev-bookmarks')
              }}
            >
              <Icon name="play" className="size-4" /> Practise {qs.length} bookmarked
            </Button>
          )
        }
      />
      {progress.bookmarks.length === 0 ? (
        <EmptyState icon="bookmark" title="No bookmarks yet">Use the bookmark icon (or press B) on any practice question.</EmptyState>
      ) : (
        <>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search bookmarked questions…" className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-900" />
          <QuestionList qs={qs} onRemove={toggleBookmark} />
        </>
      )}
    </>
  )
}
