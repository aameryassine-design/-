interface ErrorBannerProps {
  message: string | null | undefined
}

export function ErrorBanner({ message }: ErrorBannerProps) {
  if (!message) return null
  return (
    <div className="banner banner--error" role="alert">
      <strong>خطأ:</strong> {message}
    </div>
  )
}

export function Loading({ label = 'جارٍ التحميل…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <span className="spinner" aria-hidden="true" />
      {label}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  hint?: string
}

export function EmptyState({ title, hint }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <p className="empty-state__title">{title}</p>
      {hint ? <p className="empty-state__hint">{hint}</p> : null}
    </div>
  )
}
