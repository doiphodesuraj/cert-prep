# CertPrep: interactive exam preparation

A React + TypeScript + Tailwind web app built from the **AWS Certified Cloud Practitioner (CLF-C02)** question PDF. All **737 questions** are included, with their options, answer keys and the original explanations.

See [EXTRACTION_REPORT.md](EXTRACTION_REPORT.md) for how the PDF was analysed, how the data was validated, and the questions flagged for manual checking.

## Run locally

Requires Node.js 20+.

```powershell
npm install
npm run dev
```

Open the URL Vite prints (default http://localhost:5173).

For a production build: `npm run build`, then `npm run preview`. The `dist/` folder is a static site and can be hosted anywhere.

## Features

| Area | What it does |
|---|---|
| **Dashboard** | Total, attempted, remaining, correct, incorrect, accuracy, a learning-progress bar, per-topic progress, the revision queue and recent exams |
| **Practice** | One question at a time, filterable by topic, difficulty and status, with optional question and option shuffling. You choose answers on selectable cards and press **Submit**. Then you see correct/incorrect, the correct answer, the full PDF explanation, and the source's rationale for why your choice is wrong (only when the PDF provides one; nothing is generated). Includes Previous/Next, go-to-number, bookmark and flag. Your position is kept across reloads. |
| **Mock exam** | Configurable number of questions and time limit (65 q / 90 min by default), with presets. Has a countdown timer that auto-submits at zero, a question palette (not visited / answered / not answered / marked for review), mark for review, clear response, and a confirmation before final submission. No answers or explanations are shown until you submit. The exam survives a page refresh. |
| **Results** | Score, pass/fail at 70%, correct, incorrect, unanswered, time taken, topic-wise performance, and a review of every incorrect or unanswered question with the correct answer and explanation. You can retry the incorrect ones or restart a new exam. |
| **Revision** | Bookmarked, previously incorrect, flagged and not-attempted sets, each of which can be practised on its own (in order or shuffled) |
| **Bookmarks** | Searchable list; open or remove a bookmark; practise all bookmarks |
| **Performance** | Accuracy by topic and by difficulty, multiple-answer accuracy, exam score trend, exam history |
| **Data & shortcuts** | Export, import or reset progress; extraction notes; keyboard shortcuts |

**Scoring:** a question is correct only when the selected set exactly equals the answer key. This applies to both single-answer and multiple-answer questions. Accuracy uses your most recent attempt at each question.

**Keyboard:** `1–5` select · `Enter` submit / next · `← →` navigate · `B` bookmark · `F` flag · `M` mark for review (exam).

Light and dark themes are supported, and the layout is responsive from phone to desktop.

## Architecture

```
public/data/banks.json         question-bank registry (supports multiple PDFs)
public/data/clf-c02.json       extracted dataset (loaded at runtime)
src/state/AppState.tsx         data loading, progress store (localStorage), hash router, derived stats
src/pages/                     Dashboard, Practice, Exam, Results, Revision/Bookmarks, Performance/Settings
src/components/                Layout (sidebar), QuestionParts (option cards, explanation), ui primitives
src/lib/                       scoring/shuffle utils, explanation parsing, practice-session builder
tools/extract/                 PDF → JSON pipeline (PyMuPDF + Windows OCR), validator
```

Progress is stored per question bank under `certprep:<bank>:*` keys in localStorage. There is no backend.

### Question schema

```json
{
  "id": 1,
  "question": "…",
  "options": [{ "id": "A", "text": "…" }],
  "correctAnswers": ["C"],
  "multiSelect": false,
  "explanation": "… (paragraphs separated by blank lines)",
  "topic": "Billing, Pricing & Support",
  "difficulty": "Medium",
  "sourcePages": [1, 2],
  "ocrLines": 0,
  "sourceNote": "only present when the source itself is inconsistent"
}
```

### Adding another question PDF

Run the pipeline in `tools/extract` (see EXTRACTION_REPORT.md), save the output as `public/data/<id>.json`, and add an entry to `banks.json`:

```json
{ "id": "saa-c03", "title": "AWS Solutions Architect Associate", "code": "SAA-C03", "file": "saa-c03.json",
  "source": "file.pdf", "exam": { "questions": 65, "minutes": 130, "passPercent": 72 } }
```
