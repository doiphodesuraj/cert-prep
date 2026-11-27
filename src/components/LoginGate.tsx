import { useState, type ReactNode } from 'react'
import { currentUser, login } from '../lib/auth'
import { Button, Icon } from './ui'

export function LoginGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState(currentUser)
  const [name, setName] = useState('')
  const [error, setError] = useState(false)

  if (user) return <>{children}</>

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (login(name)) setUser(currentUser())
    else setError(true)
  }

  return (
    <div className="grid min-h-full place-items-center px-4 py-12">
      <form onSubmit={submit} className="fade-in w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <span className="grid size-11 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Icon name="check" className="size-6" />
        </span>
        <h1 className="mt-5 text-xl font-bold tracking-tight">Sign in to CertPrep</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">AWS Certified Cloud Practitioner (CLF-C02) practice</p>
        <label className="mt-6 block text-sm font-medium" htmlFor="username">
          Username
        </label>
        <input
          id="username"
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(false)
          }}
          aria-invalid={error}
          aria-describedby={error ? 'login-error' : undefined}
          className={`mt-1.5 w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/40 dark:bg-slate-950 ${error ? 'border-rose-400' : 'border-slate-300 dark:border-slate-700'}`}
        />
        {error && (
          <p id="login-error" role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">
            That username isn't recognised.
          </p>
        )}
        <Button type="submit" className="mt-5 w-full" disabled={!name.trim()}>
          Sign in
        </Button>
      </form>
    </div>
  )
}
