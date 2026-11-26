import { useState, type ReactNode } from 'react'
import { navigate, useApp } from '../state/AppState'
import { cx } from '../lib/util'
import { Icon } from './ui'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'practice', label: 'Practice Questions', icon: 'practice' },
  { id: 'exam', label: 'Mock Exam', icon: 'exam' },
  { id: 'revision', label: 'Revision', icon: 'revision' },
  { id: 'bookmarks', label: 'Bookmarks', icon: 'bookmark' },
  { id: 'performance', label: 'Performance', icon: 'chart' },
]

export function Layout({ active, children }: { active: string; children: ReactNode }) {
  const { bank, banks, setBankId, theme, toggleTheme, progress, exam } = useApp()
  const [open, setOpen] = useState(false)
  const go = (id: string) => {
    navigate(id)
    setOpen(false)
  }
  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4" aria-label="Main">
      <div className="mb-6 flex items-center gap-3 px-2">
        <span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Icon name="check" className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="font-bold tracking-tight">CertPrep</div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{bank ? `${bank.code} · ${bank.title}` : 'Loading…'}</div>
        </div>
      </div>
      {banks.length > 1 && (
        <select
          value={bank?.id}
          onChange={(e) => setBankId(e.target.value)}
          className="mb-4 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
          aria-label="Question bank"
        >
          {banks.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.title}
            </option>
          ))}
        </select>
      )}
      {NAV.map((n) => {
        const badge = n.id === 'bookmarks' ? progress.bookmarks.length : n.id === 'exam' && exam?.status === 'running' ? '●' : null
        return (
          <button
            key={n.id}
            onClick={() => go(n.id)}
            aria-current={active === n.id ? 'page' : undefined}
            className={cx(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
              active === n.id
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100',
            )}
          >
            <Icon name={n.icon} className="size-[18px]" />
            <span className="flex-1 text-left">{n.label}</span>
            {badge ? (
              <span className={cx('text-xs tabular', n.id === 'exam' ? 'text-amber-500' : 'rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-700')}>{badge}</span>
            ) : null}
          </button>
        )
      })}
      <div className="mt-auto space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800">
        <button onClick={toggleTheme} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70">
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="size-[18px]" />
          {theme === 'dark' ? 'Light theme' : 'Dark theme'}
        </button>
        <button onClick={() => go('settings')} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800/70', active === 'settings' ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400')}>
          <Icon name="keyboard" className="size-[18px]" />
          Data &amp; shortcuts
        </button>
      </div>
    </nav>
  )

  return (
    <div className="flex min-h-full">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-slate-200 bg-white lg:block dark:border-slate-800 dark:bg-slate-900">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
          <aside className="fade-in absolute inset-y-0 left-0 w-72 bg-white shadow-xl dark:bg-slate-900">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
          <button onClick={() => setOpen(true)} className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <span className="font-semibold">CertPrep</span>
          <span className="text-sm text-slate-500">{bank?.code}</span>
          <button onClick={toggleTheme} className="ml-auto rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Toggle theme">
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  )
}
