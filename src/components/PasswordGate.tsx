import { useState, type ReactNode } from 'react'

const PASSWORD = import.meta.env.VITE_APP_PASSWORD
const STORAGE_KEY = 'halaqa.unlocked'

function tokenFor(password: string): string {
  return btoa(encodeURIComponent(password))
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export const passwordRequired = Boolean(PASSWORD)

export function lockApp() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* stockage indisponible : rien à nettoyer */
  }
  window.location.reload()
}

export function PasswordGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(
    () => !passwordRequired || readStoredToken() === tokenFor(PASSWORD),
  )
  const [draft, setDraft] = useState('')
  const [failed, setFailed] = useState(false)

  if (unlocked) return <>{children}</>

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (draft !== PASSWORD) {
      setFailed(true)
      setDraft('')
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, tokenFor(PASSWORD))
    } catch {
      /* mode navigation privée : la session reste déverrouillée sans mémorisation */
    }
    setUnlocked(true)
  }

  return (
    <div className="gate">
      <form className="gate__card" onSubmit={submit}>
        <h1 className="gate__title">متابعة الحلقة</h1>
        <p className="gate__hint">أدخل كلمة السر للدخول</p>
        <input
          className="input gate__input"
          type="password"
          value={draft}
          autoFocus
          placeholder="كلمة السر"
          onChange={(event) => {
            setDraft(event.target.value)
            setFailed(false)
          }}
        />
        {failed ? <p className="gate__error">كلمة السر غير صحيحة</p> : null}
        <button type="submit" className="btn btn--primary gate__button">
          دخول
        </button>
      </form>
    </div>
  )
}
