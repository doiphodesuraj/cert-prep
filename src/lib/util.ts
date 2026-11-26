import type { OptionId, Question } from '../types'

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Exact-match scoring: every correct option selected and nothing else. */
export function isCorrect(q: Question, selected: readonly OptionId[]): boolean {
  if (selected.length !== q.correctAnswers.length) return false
  const s = new Set(selected)
  return q.correctAnswers.every((a) => s.has(a))
}

export function requiredCount(q: Question): number {
  return Math.max(1, q.correctAnswers.length)
}

export function formatDuration(sec: number): string {
  sec = Math.max(0, Math.round(sec))
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export function orderedOptions(q: Question, order?: OptionId[]) {
  if (!order) return q.options
  const byId = new Map(q.options.map((o) => [o.id, o]))
  return order.map((id) => byId.get(id)!).filter(Boolean)
}

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ')
}
