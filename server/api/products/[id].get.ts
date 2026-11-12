import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const product = toProduct(await findProduct(db, user.id, intParam(event)))
  const priceChecks = await db.select({
    price: schema.priceChecks.price,
    originalPrice: schema.priceChecks.originalPrice,
    availability: schema.priceChecks.availability,
    createdAt: schema.priceChecks.createdAt,
  }).from(schema.priceChecks)
    .where(eq(schema.priceChecks.productId, product.id))
    .orderBy(asc(schema.priceChecks.createdAt))
    .limit(200)
  return { ...product, priceChecks }
})
