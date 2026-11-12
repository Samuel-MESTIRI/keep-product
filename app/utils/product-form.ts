import type { Availability } from '#shared/utils/constants'
import { AVAILABILITIES } from '#shared/utils/constants'

/** Valeur du formulaire produit : les prix sont saisis en texte (« 129,90 »). */
export interface ProductFormValue {
  name: string
  url: string
  image: string | null
  imageRatio: number | null
  brand: string
  merchant: string
  price: string
  originalPrice: string
  currency: string
  dimensions: string
  availability: Availability
  color: string
  notes: string
  quantity: number
  purchased: boolean
  boardIds: number[]
}

interface ProductLike {
  name?: string | null
  url?: string | null
  image?: string | null
  imageRatio?: number | null
  brand?: string | null
  merchant?: string | null
  price?: number | null
  originalPrice?: number | null
  currency?: string | null
  dimensions?: string | null
  availability?: string | null
  color?: string | null
  notes?: string | null
  quantity?: number | null
  purchased?: boolean | null
  boardIds?: number[] | null
}

export function toFormValue(p: ProductLike = {}): ProductFormValue {
  return {
    name: p.name ?? '',
    url: p.url ?? '',
    image: p.image ?? null,
    imageRatio: p.imageRatio ?? null,
    brand: p.brand ?? '',
    merchant: p.merchant ?? '',
    price: centsToInput(p.price),
    originalPrice: centsToInput(p.originalPrice),
    currency: p.currency ?? 'EUR',
    dimensions: p.dimensions ?? '',
    availability: (AVAILABILITIES as readonly string[]).includes(p.availability ?? '') ? p.availability as Availability : 'unknown',
    color: p.color ?? '',
    notes: p.notes ?? '',
    quantity: p.quantity ?? 1,
    purchased: p.purchased ?? false,
    boardIds: p.boardIds ?? [],
  }
}
