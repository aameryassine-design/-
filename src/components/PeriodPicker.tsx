import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  todayISO,
} from '../lib/dates'

export interface Period {
  start: string
  end: string
}

export function currentWeek(): Period {
  const today = todayISO()
  return { start: startOfWeek(today), end: endOfWeek(today) }
}

export function currentMonth(): Period {
  const today = todayISO()
  return { start: startOfMonth(today), end: endOfMonth(today) }
}

export function lastMonths(count: number): Period {
  const today = todayISO()
  return { start: startOfMonth(addMonths(today, -(count - 1))), end: endOfMonth(today) }
}

/** Fenêtre précédente, de même longueur, juste avant `period`. */
export function previousPeriod(period: Period): Period {
  const days =
    Math.round(
      (new Date(period.end).getTime() - new Date(period.start).getTime()) / (1000 * 60 * 60 * 24),
    ) + 1
  return { start: addDays(period.start, -days), end: addDays(period.start, -1) }
}

interface Props {
  value: Period
  onChange: (period: Period) => void
  showQuarter?: boolean
}

export function PeriodPicker({ value, onChange, showQuarter = false }: Props) {
  const week = currentWeek()
  const month = currentMonth()
  const quarter = lastMonths(3)

  const isSame = (period: Period) => period.start === value.start && period.end === value.end

  return (
    <div className="period-picker">
      <div className="period-picker__presets">
        <button
          type="button"
          className={`btn btn--tab${isSame(week) ? ' is-active' : ''}`}
          onClick={() => onChange(week)}
        >
          هذا الأسبوع
        </button>
        <button
          type="button"
          className={`btn btn--tab${isSame(month) ? ' is-active' : ''}`}
          onClick={() => onChange(month)}
        >
          هذا الشهر
        </button>
        {showQuarter ? (
          <button
            type="button"
            className={`btn btn--tab${isSame(quarter) ? ' is-active' : ''}`}
            onClick={() => onChange(quarter)}
          >
            آخر 3 أشهر
          </button>
        ) : null}
      </div>

      <div className="period-picker__range">
        <label>
          <span className="label">من</span>
          <input
            className="input"
            type="date"
            value={value.start}
            onChange={(event) => onChange({ ...value, start: event.target.value })}
          />
        </label>
        <label>
          <span className="label">إلى</span>
          <input
            className="input"
            type="date"
            value={value.end}
            onChange={(event) => onChange({ ...value, end: event.target.value })}
          />
        </label>
      </div>
    </div>
  )
}
