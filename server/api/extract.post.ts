import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { CURRENCIES } from '#shared/utils/constants'

const bodySchema = z.object({ url: urlSchema })

/**
 * Lit une page produit et renvoie la fiche prête à pré-remplir le formulaire.
 * Rien n'est enregistré ici, sauf la photo (supprimée au bout de 24 h si le
 * produit n'est finalement pas ajouté).
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  rateLimit(`extract:${user.id}`, 80, 60 * 60_000)
  const { url } = await readValid(event, bodySchema)

  const { product, warning } = await fetchProduct(url)
  const photo = await downloadProductImage(product.imageUrl, product.url)

  // Déjà enregistré ? (même page, aux paramètres de suivi près)
  const db = await useDb()
  const mine = await db.select({ id: schema.products.id, url: schema.products.url }).from(schema.products)
    .where(eq(schema.products.userId, user.id))
  const keys = new Set([normalizeUrl(url), normalizeUrl(product.url)])
  const existingId = mine.find(p => p.url && keys.has(normalizeUrl(p.url)))?.id ?? null

  return {
    ...product,
    image: photo?.image ?? null,
    imageRatio: photo?.imageRatio ?? null,
    currency: (CURRENCIES as readonly string[]).includes(product.currency ?? '') ? product.currency! : 'EUR',
    warning: warning ?? (product.imageUrl && !photo ? 'Photo inaccessible : tu peux en ajouter une.' : null),
    existingId,
  }
})
