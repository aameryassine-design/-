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
  return (
    <input
      key={value}
      className={`input ${className}`.trim()}
      type={type}
      step={step}
      min={min}
      title={title}
      aria-label={ariaLabel}
      placeholder={placeholder}
      disabled={disabled}
      defaultValue={value}
      onBlur={(event) => {
        if (event.currentTarget.value !== value) onCommit(event.currentTarget.value)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') event.currentTarget.value = value
      }}
    />
  )
}
