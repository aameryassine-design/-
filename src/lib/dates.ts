const LOCALE = 'ar-MA-u-nu-latn'

/** Premier jour de la semaine : 0 = dimanche. */
const WEEK_START = 0

export function toISODate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso)
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export function startOfWeek(iso: string): string {
  const date = parseISODate(iso)
  const diff = (date.getDay() - WEEK_START + 7) % 7
  date.setDate(date.getDate() - diff)
  return toISODate(date)
}

export function endOfWeek(iso: string): string {
  return addDays(startOfWeek(iso), 6)
}

export function startOfMonth(iso: string): string {
  const date = parseISODate(iso)
  return toISODate(new Date(date.getFullYear(), date.getMonth(), 1))
}

export function endOfMonth(iso: string): string {
  const date = parseISODate(iso)
  return toISODate(new Date(date.getFullYear(), date.getMonth() + 1, 0))
}

export function addMonths(iso: string, months: number): string {
  const date = parseISODate(iso)
  return toISODate(new Date(date.getFullYear(), date.getMonth() + months, date.getDate()))
}

export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatShortDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatRange(from: string, to: string): string {
  return `من ${formatShortDate(from)} إلى ${formatShortDate(to)}`
}
