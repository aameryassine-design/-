import { useState, type FormEvent } from 'react'
import { errorMessage, supabase } from '../lib/supabase'

type Mode = 'signin' | 'signup'

export function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setNotice(null)

    const trimmed = email.trim().toLowerCase()

    if (mode === 'signin') {
      const { error: failure } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      })
      if (failure) setError(errorMessage(failure))
      // En cas de succès, AuthProvider prend le relais et redirige.
    } else {
      const { data, error: failure } = await supabase.auth.signUp({
        email: trimmed,
        password,
        options: { data: { full_name: fullName.trim() } },
      })
      if (failure) {
        setError(errorMessage(failure))
      } else if (!data.session) {
        setNotice('تم إنشاء الحساب. افتح بريدك الإلكتروني لتأكيده ثم عد لتسجيل الدخول.')
        setMode('signin')
      }
    }

    setBusy(false)
  }

  return (
    <div className="gate">
      <form className="gate__card" onSubmit={submit}>
        <span className="app__logo gate__logo" aria-hidden="true">
          ح
        </span>
        <h1 className="gate__title">متابعة الحلقة</h1>
        <p className="gate__hint">
          {mode === 'signin'
            ? 'أدخل بريدك الإلكتروني وكلمة المرور.'
            : 'سجّل بنفس البريد الإلكتروني الذي سلّمته للمشرف العام، ليُربط حسابك ببطاقتك تلقائياً.'}
        </p>

        {mode === 'signup' ? (
          <label>
            <span className="label">الاسم الكامل</span>
            <input
              className="input"
              type="text"
              autoComplete="name"
              value={fullName}
              required
              onChange={(event) => setFullName(event.target.value)}
            />
          </label>
        ) : null}

        <label>
          <span className="label">البريد الإلكتروني</span>
          <input
            className="input"
            type="email"
            inputMode="email"
            dir="ltr"
            autoComplete="email"
            value={email}
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label>
          <span className="label">كلمة المرور</span>
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            required
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error ? <p className="gate__error">{error}</p> : null}
        {notice ? <p className="gate__notice">{notice}</p> : null}

        <button type="submit" className="btn btn--primary gate__button" disabled={busy}>
          {busy ? 'جارٍ…' : mode === 'signin' ? 'دخول' : 'إنشاء الحساب'}
        </button>

        <button
          type="button"
          className="btn btn--ghost gate__button"
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin')
            setError(null)
            setNotice(null)
          }}
        >
          {mode === 'signin' ? 'ليس لديّ حساب بعد' : 'لديّ حساب — دخول'}
        </button>
      </form>
    </div>
  )
}
