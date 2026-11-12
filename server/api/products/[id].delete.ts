import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = intParam(event)
  const db = await useDb()
  const product = await findProduct(db, user.id, id)
  await db.delete(schema.products).where(eq(schema.products.id, id))
  await deleteImage(product.image)
  return { ok: true }
})
