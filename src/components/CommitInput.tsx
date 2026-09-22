import { useEffect, useRef, useState } from 'react'

interface Props {
  value: string
  onCommit: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number' | 'date'
  disabled?: boolean
  className?: string
  step?: string
  min?: string
  title?: string
  ariaLabel?: string
}

/** Champ texte enregistré à la sortie du champ (ou sur Entrée), pas à chaque frappe. */
export function CommitInput({
  value,
  onCommit,
  placeholder,
  type = 'text',
  disabled = false,
  className = '',
  step,
  min,
  title,
  ariaLabel,
}: Props) {
  const [draft, setDraft] = useState(value)
  const committed = useRef(value)

  useEffect(() => {
    committed.current = value
    setDraft(value)
  }, [value])

  const commit = () => {
    if (draft === committed.current) return
    committed.current = draft
    onCommit(draft)
  }

  return (
    <input
      className={`input ${className}`.trim()}
      type={type}
      step={step}
      min={min}
      title={title}
      aria-label={ariaLabel}
      placeholder={placeholder}
      disabled={disabled}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') setDraft(committed.current)
      }}
    />
  )
}
