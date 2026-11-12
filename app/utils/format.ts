import type { Availability } from '#shared/utils/constants'

const BOARD_ICON_SET = new Set<string>(BOARD_ICON_IDS)

/** Fichier SVG (assets/icons) de l'icône d'une liste. */
export const boardIcon = (icon: string | null | undefined) =>
  `room-${icon && BOARD_ICON_SET.has(icon) ? icon : 'autre'}`

export const imageUrl = (image: string | null | undefined, variant: 'full' | 'thumb' = 'full') =>
  image ? `/images/${image}${variant === 'thumb' ? '-thumb' : ''}.webp` : null

const formatters = new Map<string, Intl.NumberFormat>()

/** Centimes → « 1 299,90 € » (« 49 € » quand il n'y a pas de centimes). */
export function formatPrice(cents: number | null | undefined, currency = 'EUR') {
  if (cents == null) return null
  const whole = cents % 100 === 0
  const key = `${currency}-${whole}`
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    }))
  }
  return formatters.get(key)!.format(cents / 100)
}

/** Centimes → texte pour un champ de formulaire (« 129,90 »). */
export const centsToInput = (cents: number | null | undefined) =>
  cents == null ? '' : (cents / 100).toFixed(2).replace(/\.00$/, '').replace('.', ',')

/** Remise en pourcentage, arrondie (−25 %). */
export function discountPercent(price: number | null | undefined, original: number | null | undefined) {
  if (price == null || original == null || original <= price) return null
  return Math.round((1 - price / original) * 100)
}

export const AVAILABILITY_TONE: Record<Availability, 'success' | 'warning' | 'danger' | 'muted'> = {
  in_stock: 'success',
  limited: 'warning',
  preorder: 'warning',
  out_of_stock: 'danger',
  unknown: 'muted',
}

export const availabilityLabel = (value: string) =>
  AVAILABILITY_LABELS[value as Availability] ?? AVAILABILITY_LABELS.unknown

export const plural = (n: number, word: string) => `${n} ${word}${n > 1 ? 's' : ''}`

/** « aujourd'hui », « hier », « il y a 3 jours », « le 12 mars » */
export function relativeDay(date: string | Date | null | undefined) {
  if (!date) return null
  const d = new Date(date)
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'aujourd\'hui'
  if (days === 1) return 'hier'
  if (days < 7) return `il y a ${days} jours`
  return `le ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', ...(days > 300 ? { year: 'numeric' } : {}) })}`
}

/** Domaine lisible d'une adresse : « maisonsdumonde.com ». */
export function hostOf(url: string | null | undefined) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\d?\./, '')
  }
  catch {
    return null
  }
}

/** Message d'erreur lisible depuis une erreur $fetch. */
export function errorMessage(error: unknown, fallback = 'Une erreur est survenue') {
  const e = error as { data?: { message?: string, statusMessage?: string }, statusMessage?: string }
  return e?.data?.message || e?.data?.statusMessage || e?.statusMessage || fallback
}
