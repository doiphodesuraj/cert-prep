export type OptionId = string

export interface Option {
  id: OptionId
  text: string
}

export interface Question {
  id: number
  question: string
  options: Option[]
  correctAnswers: OptionId[]
  multiSelect: boolean
  explanation: string
  topic: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  sourcePages: number[]
  ocrLines?: number
  inferredOptionLabels?: number
  needsReview?: string[]
  manuallyVerified?: string
  sourceNote?: string
}

export interface BankMeta {
  id: string
  title: string
  code: string
  file: string
  source: string
  exam: { questions: number; minutes: number; passPercent: number }
}

/** Latest outcome for a question, from practice or exam. */
export interface Attempt {
  selected: OptionId[]
  correct: boolean
  at: number
  count: number
  correctCount: number
  mode: 'practice' | 'exam'
}

export interface PracticeSession {
  key: string
  title: string
  ids: number[]
  index: number
  /** answers submitted in this session */
  submitted: Record<number, OptionId[]>
  shuffleOptions: boolean
  optionOrder: Record<number, OptionId[]>
  createdAt: number
}

export interface ExamState {
  id: string
  ids: number[]
  optionOrder: Record<number, OptionId[]>
  answers: Record<number, OptionId[]>
  visited: number[]
  marked: number[]
  index: number
  startedAt: number
  durationSec: number
  status: 'running' | 'submitted'
}

export interface ExamResult {
  id: string
  bankId: string
  startedAt: number
  finishedAt: number
  durationSec: number
  timeTakenSec: number
  ids: number[]
  answers: Record<number, OptionId[]>
  correctIds: number[]
  incorrectIds: number[]
  unansweredIds: number[]
  percent: number
  passPercent: number
  autoSubmitted: boolean
}

export interface Progress {
  attempts: Record<number, Attempt>
  bookmarks: number[]
  flagged: number[]
  examHistory: ExamResult[]
}
