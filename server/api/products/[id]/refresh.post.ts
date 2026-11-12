import { eq } from 'drizzle-orm'

/**
 * Relit la page marchande d'un produit : prix, prix barré et stock sont mis à
 * jour, la photo et les dimensions seulement si la fiche n'en avait pas. Le
 * reste (nom, notes…) appartient à l'utilisateur et n'est pas touché.
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  rateLimit(`refresh:${user.id}`, 120, 60 * 60_000)
  const id = intParam(event)
  const db = await useDb()
  const existing = await findProduct(db, user.id, id)
  if (!existing.url) throw createError({ statusCode: 400, statusMessage: 'Ce produit n\'a pas de lien vers un site marchand' })

  const { product, warning } = await fetchProduct(existing.url)
  if (product.price == null && product.availability === 'unknown') {
    throw createError({ statusCode: 422, statusMessage: 'Actualisation impossible', message: warning ?? 'Prix et stock introuvables sur la page.' })
  }

  const price = product.price ?? existing.price
  // Prix relu sans prix barré : la promotion est terminée
  const originalPrice = product.price != null ? product.originalPrice : existing.originalPrice
  const availability = product.availability !== 'unknown' ? product.availability : existing.availability
  const image = existing.image ? null : await downloadProductImage(product.imageUrl, existing.url)

  await db.update(schema.products).set({
    price,
    originalPrice,
    availability,
    ...(image ?? {}),
    ...(!existing.dimensions && product.dimensions ? { dimensions: product.dimensions } : {}),
    checkedAt: new Date(),
  }).where(eq(schema.products.id, id))

  const changed = price !== existing.price || originalPrice !== existing.originalPrice || availability !== existing.availability
  if (changed) {
    await db.insert(schema.priceChecks).values({ productId: id, price, originalPrice, availability })
  }

  return { product: toProduct(await findProduct(db, user.id, id)), previousPrice: existing.price, changed }
})
