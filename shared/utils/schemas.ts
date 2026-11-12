import { z } from 'zod'
import { AVAILABILITIES, BOARD_ICON_IDS, CURRENCIES, THEME_MODES } from './constants'

/** Prix saisi en euros (« 129,90 », 129.9, "") → centimes, ou null. */
const optionalCents = z.preprocess(
  (v) => {
    if (v === '' || v === undefined || v === null) return null
    const n = typeof v === 'string' ? Number(v.replace(/\s/g, '').replace(',', '.')) : v
    return typeof n === 'number' && Number.isFinite(n) ? Math.round(n * 100) : v
  },
  z.number().int().min(0).max(100_000_000).nullable(),
)

const optionalText = (max: number) =>
  z.preprocess(v => (typeof v === 'string' && !v.trim() ? null : v), z.string().trim().max(max).nullable().default(null))

export const emailSchema = z.string().trim().toLowerCase().email('Adresse e-mail invalide').max(254)

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Indique ton prénom').max(60),
  email: emailSchema,
  password: z.string().min(8, '8 caractères minimum').max(200),
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis').max(200),
})

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  theme: z.enum(THEME_MODES).optional(),
})

export const boardSchema = z.object({
  name: z.string().trim().min(1, 'Nom requis').max(40),
  icon: z.enum(BOARD_ICON_IDS).default('autre'),
})

export const urlSchema = z.string().trim().url('Lien invalide').max(2000).refine(v => /^https?:\/\//i.test(v), 'Lien invalide')

/**
 * Fiche produit telle qu'envoyée par le formulaire. Les prix arrivent en euros
 * (texte) et sont stockés en centimes.
 */
export const productSchema = z.object({
  name: z.string().trim().min(1, 'Donne un nom au produit').max(200),
  url: z.preprocess(v => (v === '' ? null : v), urlSchema.nullable().default(null)),
  image: z.string().regex(/^[a-f0-9-]{36}$/).nullable().default(null),
  imageRatio: z.number().min(0.2).max(5).nullable().default(null),
  brand: optionalText(80),
  merchant: optionalText(80),
  price: optionalCents.default(null),
  originalPrice: optionalCents.default(null),
  currency: z.enum(CURRENCIES).default('EUR'),
  dimensions: optionalText(200),
  availability: z.enum(AVAILABILITIES).default('unknown'),
  color: optionalText(80),
  notes: optionalText(2000),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
  purchased: z.boolean().default(false),
  boardIds: z.array(z.number().int().positive()).max(50).default([]),
})

/** Changements rapides depuis la fiche (acheté, listes, quantité). */
export const productPatchSchema = z.object({
  purchased: z.boolean().optional(),
  quantity: z.coerce.number().int().min(1).max(999).optional(),
  boardIds: z.array(z.number().int().positive()).max(50).optional(),
})

export type ProductInput = z.input<typeof productSchema>
