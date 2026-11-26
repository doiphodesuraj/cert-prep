import { AppProvider, useApp, useRoute } from './state/AppState'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { PracticeRunner, PracticeSetup } from './pages/Practice'
import { ExamRunner, ExamSetup } from './pages/Exam'
import { Results } from './pages/Results'
import { Bookmarks, Revision } from './pages/Revision'
import { Performance, Settings } from './pages/Performance'

function Router() {
  const [page, arg] = useRoute()
  const { loading, error } = useApp()

  let content
  if (error) content = <div className="rounded-xl bg-rose-50 p-6 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>
  else if (loading) content = <div className="grid h-64 place-items-center text-slate-500">Loading questions…</div>
  else if (page === 'practice') content = arg ? <PracticeRunner key={arg} sessionKey={arg} /> : <PracticeSetup />
  else if (page === 'exam') content = arg === 'run' ? <ExamRunner /> : <ExamSetup />
  else if (page === 'results' && arg) content = <Results id={arg} />
  else if (page === 'revision') content = <Revision />
  else if (page === 'bookmarks') content = <Bookmarks />
  else if (page === 'performance') content = <Performance />
  else if (page === 'settings') content = <Settings />
  else content = <Dashboard />

  const active = page === 'results' ? 'exam' : page
  return (
    <Layout active={active}>
      <div key={page + (arg ?? '')} className="fade-in">{content}</div>
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Router />
    </AppProvider>
  )
}
