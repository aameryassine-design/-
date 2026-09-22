import type { Tone } from './constants'

export interface Bucket {
  sum: number
  /** Nombre d'enregistrements retenus (les statuts « معذور » sont exclus). */
  count: number
}

export function emptyBucket(): Bucket {
  return { sum: 0, count: 0 }
}

export function addScore(bucket: Bucket, score: number | null): void {
  if (score === null) return
  bucket.sum += score
  bucket.count += 1
}

/** `null` quand aucune donnée n'a été saisie sur la période. */
export function bucketRatio(bucket: Bucket): number | null {
  return bucket.count === 0 ? null : bucket.sum / bucket.count
}

export function formatPct(ratio: number | null): string {
  return ratio === null ? '—' : `${Math.round(ratio * 100)}%`
}

export function ratioTone(ratio: number | null): Tone {
  if (ratio === null) return 'neutral'
  if (ratio >= 0.75) return 'good'
  if (ratio >= 0.5) return 'mid'
  return 'bad'
}

export function average(values: (number | null)[]): number | null {
  const present = values.filter((value): value is number => value !== null)
  if (present.length === 0) return null
  return present.reduce((total, value) => total + value, 0) / present.length
}
