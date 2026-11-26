import type { OptionId, Question } from '../types'

export function paragraphs(text: string): string[] {
  return text.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean)
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Paragraphs of the source explanation that discuss a specific (wrong) option.
 * Only text that already exists in the PDF explanation is returned — nothing is generated.
 */
export function whyIncorrect(q: Question, optionId: OptionId): string[] {
  const opt = q.options.find((o) => o.id === optionId)
  if (!opt) return []
  const L = esc(optionId)
  const byLetter = [
    new RegExp(`\\b(?:Options?|Choices?|Answers?)\\s*\\(?${L}\\)?(?![A-Za-z])`),
    new RegExp(`^\\(?${L}\\)?\\s*[.:)\\-–]\\s`),
    new RegExp(`\\(\\s*(?:Option\\s*)?${L}\\s*\\)`),
  ]
  const snippet = opt.text.replace(/[.\s]+$/, '').slice(0, 40)
  const byText = snippet.length >= 6 ? new RegExp(esc(snippet), 'i') : null
  const negative = /\b(incorrect|not|n't|wrong|doesn|isn|unsuitable|less suitable|irrelevant|unrelated|does not|cannot)\b/i
  // a paragraph that names this option as the correct one must never be shown as "why it is wrong"
  const namesAsCorrect = new RegExp(`correct (?:answers?|options?|choices?) (?:is|are)\\b[^.]*?(?<![A-Za-z])${L}(?![a-z])`, 'i')
  const out: string[] = []
  for (const p of paragraphs(q.explanation)) {
    if (/^(the )?correct answer/i.test(p) || namesAsCorrect.test(p)) continue
    const letterHit = byLetter.some((r) => r.test(p))
    const textHit = byText ? byText.test(p) && negative.test(p) : false
    if (letterHit || textHit) out.push(p)
  }
  return out
}

export type Segment = { type: 'text'; value: string } | { type: 'link'; value: string }

export function linkify(text: string): Segment[] {
  const out: Segment[] = []
  const re = /https?:\/\/[^\s)\]]+[^\s)\].,;:]/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ type: 'text', value: text.slice(last, m.index) })
    out.push({ type: 'link', value: m[0] })
    last = m.index! + m[0].length
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) })
  return out
}
