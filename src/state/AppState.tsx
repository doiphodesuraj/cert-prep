import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Attempt, BankMeta, ExamResult, ExamState, OptionId, PracticeSession, Progress, Question } from '../types'
import { isCorrect } from '../lib/util'

const NS = 'certprep'
const emptyProgress = (): Progress => ({ attempts: {}, bookmarks: [], flagged: [], examHistory: [] })

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Could not save progress', e)
  }
}

interface Ctx {
  banks: BankMeta[]
  bank: BankMeta | null
  setBankId: (id: string) => void
  questions: Question[]
  byId: Map<number, Question>
  loading: boolean
  error: string | null
  progress: Progress
  recordAttempt: (q: Question, selected: OptionId[], mode: Attempt['mode']) => boolean
  toggleBookmark: (id: number) => void
  toggleFlag: (id: number) => void
  sessions: Record<string, PracticeSession>
  saveSession: (s: PracticeSession) => void
  deleteSession: (key: string) => void
  exam: ExamState | null
  setExam: (e: ExamState | null | ((prev: ExamState | null) => ExamState | null)) => void
  addExamResult: (r: ExamResult) => void
  resetProgress: () => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

const AppCtx = createContext<Ctx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const base = import.meta.env.BASE_URL
  const [banks, setBanks] = useState<BankMeta[]>([])
  const [bankId, setBankIdRaw] = useState<string | null>(() => read<string | null>(`${NS}:bank`, null))
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Progress>(emptyProgress)
  const [sessions, setSessions] = useState<Record<string, PracticeSession>>({})
  const [exam, setExamRaw] = useState<ExamState | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  )

  useEffect(() => {
    fetch(`${base}data/banks.json`)
      .then((r) => r.json())
      .then((b: BankMeta[]) => {
        setBanks(b)
        if (!bankId || !b.some((x) => x.id === bankId)) setBankIdRaw(b[0]?.id ?? null)
      })
      .catch((e) => setError(`Could not load question banks: ${e}`))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const bank = banks.find((b) => b.id === bankId) ?? null

  useEffect(() => {
    if (!bank) return
    setLoading(true)
    write(`${NS}:bank`, bank.id)
    setProgress({ ...emptyProgress(), ...read<Progress>(`${NS}:${bank.id}:progress`, emptyProgress()) })
    setSessions(read(`${NS}:${bank.id}:sessions`, {}))
    setExamRaw(read<ExamState | null>(`${NS}:${bank.id}:exam`, null))
    fetch(`${base}data/${bank.file}`)
      .then((r) => r.json())
      .then((qs: Question[]) => {
        setQuestions(qs)
        setLoading(false)
      })
      .catch((e) => {
        setError(`Could not load questions: ${e}`)
        setLoading(false)
      })
  }, [bank, base])

  const key = (k: string) => `${NS}:${bank?.id}:${k}`

  const updateProgress = useCallback(
    (fn: (p: Progress) => Progress) => {
      setProgress((p) => {
        const next = fn(p)
        if (bank) write(`${NS}:${bank.id}:progress`, next)
        return next
      })
    },
    [bank],
  )

  const recordAttempt = useCallback(
    (q: Question, selected: OptionId[], mode: Attempt['mode']) => {
      const correct = isCorrect(q, selected)
      updateProgress((p) => {
        const prev = p.attempts[q.id]
        const a: Attempt = {
          selected,
          correct,
          at: Date.now(),
          mode,
          count: (prev?.count ?? 0) + 1,
          correctCount: (prev?.correctCount ?? 0) + (correct ? 1 : 0),
        }
        return { ...p, attempts: { ...p.attempts, [q.id]: a } }
      })
      return correct
    },
    [updateProgress],
  )

  const toggleIn = (list: number[], id: number) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  const toggleBookmark = useCallback((id: number) => updateProgress((p) => ({ ...p, bookmarks: toggleIn(p.bookmarks, id) })), [updateProgress])
  const toggleFlag = useCallback((id: number) => updateProgress((p) => ({ ...p, flagged: toggleIn(p.flagged, id) })), [updateProgress])

  const saveSession = useCallback(
    (s: PracticeSession) =>
      setSessions((all) => {
        const next = { ...all, [s.key]: s }
        write(key('sessions'), next)
        return next
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bank],
  )
  const deleteSession = useCallback(
    (k: string) =>
      setSessions((all) => {
        const next = { ...all }
        delete next[k]
        write(key('sessions'), next)
        return next
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bank],
  )

  const setExam = useCallback<Ctx['setExam']>(
    (e) =>
      setExamRaw((prev) => {
        const next = typeof e === 'function' ? e(prev) : e
        write(key('exam'), next)
        return next
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bank],
  )

  const addExamResult = useCallback(
    (r: ExamResult) => updateProgress((p) => (p.examHistory.some((x) => x.id === r.id) ? p : { ...p, examHistory: [...p.examHistory, r] })),
    [updateProgress],
  )

  const resetProgress = useCallback(() => {
    if (!bank) return
    for (const k of ['progress', 'sessions', 'exam']) localStorage.removeItem(`${NS}:${bank.id}:${k}`)
    setProgress(emptyProgress())
    setSessions({})
    setExamRaw(null)
  }, [bank])

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      localStorage.setItem(`${NS}:theme`, next)
      return next
    })
  }, [])

  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])

  const value: Ctx = {
    banks,
    bank,
    setBankId: setBankIdRaw,
    questions,
    byId,
    loading,
    error,
    progress,
    recordAttempt,
    toggleBookmark,
    toggleFlag,
    sessions,
    saveSession,
    deleteSession,
    exam,
    setExam,
    addExamResult,
    resetProgress,
    theme,
    toggleTheme,
  }
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): Ctx {
  const c = useContext(AppCtx)
  if (!c) throw new Error('useApp outside provider')
  return c
}

/* ---------- hash routing ---------- */
export function useRoute(): string[] {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const on = () => setHash(window.location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  const path = hash.replace(/^#\/?/, '').split('?')[0]
  return path ? path.split('/') : ['dashboard']
}

export function navigate(path: string) {
  window.location.hash = '#/' + path.replace(/^\//, '')
}

/* ---------- derived stats ---------- */
export function useStats() {
  const { questions, progress } = useApp()
  return useMemo(() => {
    const attempts = progress.attempts
    const ids = questions.map((q) => q.id)
    const attempted = ids.filter((id) => attempts[id])
    const correct = attempted.filter((id) => attempts[id].correct)
    const incorrect = attempted.filter((id) => !attempts[id].correct)
    const notAttempted = ids.filter((id) => !attempts[id])
    const topics = new Map<string, { total: number; attempted: number; correct: number }>()
    for (const q of questions) {
      const t = topics.get(q.topic) ?? { total: 0, attempted: 0, correct: 0 }
      t.total++
      const a = attempts[q.id]
      if (a) {
        t.attempted++
        if (a.correct) t.correct++
      }
      topics.set(q.topic, t)
    }
    return {
      total: ids.length,
      attempted,
      correct,
      incorrect,
      notAttempted,
      topics: [...topics.entries()].sort((a, b) => b[1].total - a[1].total),
    }
  }, [questions, progress])
}
