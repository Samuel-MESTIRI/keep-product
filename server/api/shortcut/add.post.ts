import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { CURRENCIES } from '#shared/utils/constants'

/**
 * Ajout d'un produit depuis le Raccourci iPhone (menu Partager de Safari).
 *
 * Le Raccourci envoie la page telle que Safari l'a affichée : elle a déjà passé
 * les protections anti-robots des sites, que le serveur ne passe pas. Le produit
 * est enregistré directement (pas de formulaire) et la réponse contient un
 * `message` court, affiché par le Raccourci en notification.
 *
 * Corps accepté : { page: "<JSON {url, html}>" } (résultat du script Safari,
 * transmis tel quel) ou { url, html? }. Liste : `?board=<id>` (0 = aucune).
 */
const pageSchema = z.object({
  url: urlSchema,
  html: z.string().max(12 * 1024 * 1024).optional(),
})

const UNREADABLE = 'Page illisible : vérifie le script de l\'étape ② du Raccourci.'

const bodySchema = z.object({ page: z.string().max(12 * 1024 * 1024) }).partial().passthrough().transform((body, ctx) => {
  let value: unknown = body
  if (typeof body.page === 'string') {
    try {
      value = JSON.parse(body.page)
    }
    catch {
      ctx.addIssue({ code: 'custom', message: UNREADABLE })
      return z.NEVER
    }
  }
  const result = pageSchema.safeParse(value)
  if (!result.success) {
    ctx.addIssue({ code: 'custom', message: UNREADABLE })
    return z.NEVER
  }
  return result.data
})

export default defineEventHandler(async (event) => {
  const user = await requireTokenUser(event)
  rateLimit(`shortcut-add:${user.id}`, 120, 60 * 60_000)
  const { url, html } = await readValid(event, bodySchema)
  const db = await useDb()
  const choice = String(getQuery(event).board ?? '').trim()
  const boardIds = await resolveBoard(user.id, choice)
  // Liste demandée mais pas reconnue : on le dit dans la notification
  const missed = choice && choice !== '0' && !/^sans liste$/i.test(choice) && !boardIds.length
  const note = missed ? ` (liste « ${choice.replace(/\s+/g, ' ').slice(0, 30)} » introuvable)` : ''

  const { product, warning } = await fetchProduct(url, html || undefined)

  // Déjà enregistré : on le range dans la liste choisie au lieu de créer un doublon
  const existing = await findByUrl(db, user.id, url, product.url)
  if (existing) {
    const current = await findProduct(db, user.id, existing.id)
    const ids = [...new Set([...current.productBoards.map(pb => pb.boardId), ...boardIds])]
    await setProductBoards(db, existing.id, ids)
    return { id: existing.id, created: false, message: `Déjà enregistré : ${existing.name}${note}` }
  }

  const photo = await productPhoto(product.imageUrl, product.url)
  const name = (product.name || nameFromUrl(new URL(product.url)) || 'Produit sans nom').slice(0, 200)
  const id = await createProduct(db, user.id, {
    name,
    url: product.url.length <= 2000 ? product.url : url,
    ...photo,
    brand: product.brand,
    merchant: product.merchant,
    price: product.price,
    originalPrice: product.originalPrice,
    currency: (CURRENCIES as readonly string[]).includes(product.currency ?? '') ? product.currency! : 'EUR',
    dimensions: product.dimensions,
    availability: product.availability,
    color: product.color,
  }, boardIds)

  const price = formatCents(product.price, product.currency ?? 'EUR')
  return {
    id,
    created: true,
    message: `Ajouté : ${name}${price ? ` · ${price}` : ''}${warning && product.price == null ? ' (prix à compléter)' : ''}${note}`,
  }
})

/**
 * Liste choisie dans le Raccourci : son numéro (« 3 ») ou directement son nom
 * (« Salon », tel que proposé par « Choisir dans la liste »), sans tenir compte
 * des majuscules ni des accents. « Salon (2) » désigne le 2e homonyme.
 * Vide, 0 ou « Sans liste » : aucune liste.
 */
async function resolveBoard(userId: string, value: string) {
  const choice = value.trim()
  if (!choice || choice === '0') return []
  const db = await useDb()
  if (/^\d+$/.test(choice)) return ownBoardIds(db, userId, [Number(choice)])

  const boards = await db.select({ id: schema.boards.id, name: schema.boards.name }).from(schema.boards)
    .where(eq(schema.boards.userId, userId))
    .orderBy(asc(schema.boards.position), asc(schema.boards.id))
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const [, base = choice, nth] = choice.match(/^([\s\S]*?)(?:\s*\((\d+)\))?$/) ?? []
  const matches = boards.filter(b => norm(b.name) === norm(base))
  const exact = boards.find(b => norm(b.name) === norm(choice))
  const board = exact ?? matches[(Number(nth) || 1) - 1]
  return board ? [board.id] : []
}

function formatCents(cents: number | null, currency: string) {
  if (cents == null) return null
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(cents / 100)
  }
  catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}
