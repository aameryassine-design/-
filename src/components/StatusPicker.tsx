import type { StatusOption } from '../lib/constants'

interface Props<T extends string> {
  options: readonly StatusOption<T>[]
  value: T | null | undefined
  onChange: (value: T) => void
  disabled?: boolean
  compact?: boolean
}

export function StatusPicker<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  compact = false,
}: Props<T>) {
  return (
    <div className={`status-picker${compact ? ' status-picker--compact' : ''}`} role="group">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className={`chip chip--${option.tone}${active ? ' is-active' : ''}`}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
          >
            {option.value}
          </button>
        )
      })}
    </div>
  )
}
