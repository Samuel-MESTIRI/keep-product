import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = intParam(event)
  const input = await readValid(event, productSchema)
  const db = await useDb()
  const existing = await findProduct(db, user.id, id)
  const boardIds = await ownBoardIds(db, user.id, input.boardIds)
  const { boardIds: _ignored, ...values } = input

  await db.transaction(async (tx) => {
    await tx.update(schema.products).set({ ...values, updatedAt: new Date() }).where(eq(schema.products.id, id))
    await setProductBoards(tx, id, boardIds)
    const priceChanged = values.price !== existing.price || values.originalPrice !== existing.originalPrice
    if (priceChanged && values.price != null) {
      await tx.insert(schema.priceChecks).values({ productId: id, price: values.price, originalPrice: values.originalPrice, availability: values.availability })
    }
  })

  if (existing.image && existing.image !== values.image) await deleteImage(existing.image)
  return toProduct(await findProduct(db, user.id, id))
})
