// Simple username-only gate. This is NOT security: everything runs in the browser and the
// question data is a public static file. It only keeps casual visitors out of the UI.
const KEY = 'certprep:user'
const ALLOWED_USERNAMES = ['swapnalimunde']

const normalize = (u: string) => u.trim().toLowerCase()

export function currentUser(): string | null {
  try {
    const u = localStorage.getItem(KEY)
    return u && ALLOWED_USERNAMES.includes(u) ? u : null
  } catch {
    return null
  }
}

export function login(username: string): boolean {
  const u = normalize(username)
  if (!ALLOWED_USERNAMES.includes(u)) return false
  localStorage.setItem(KEY, u)
  return true
}

export function logout() {
  localStorage.removeItem(KEY)
  window.location.hash = ''
  window.location.reload()
}
