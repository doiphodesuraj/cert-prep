import type { PracticeSession, Question } from '../types'
import { shuffle } from './util'

export function buildSession(key: string, title: string, questions: Question[], opts: { shuffleQuestions?: boolean; shuffleOptions?: boolean } = {}): PracticeSession {
  const ids = questions.map((q) => q.id)
  const optionOrder: PracticeSession['optionOrder'] = {}
  if (opts.shuffleOptions) for (const q of questions) optionOrder[q.id] = shuffle(q.options.map((o) => o.id))
  return {
    key,
    title,
    ids: opts.shuffleQuestions ? shuffle(ids) : ids,
    index: 0,
    submitted: {},
    shuffleOptions: !!opts.shuffleOptions,
    optionOrder,
    createdAt: Date.now(),
  }
}
