export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = await readValid(event, productSchema)
  const db = await useDb()
  const boardIds = await ownBoardIds(db, user.id, input.boardIds)
  const { boardIds: _ignored, ...values } = input

  const id = await db.transaction(async (tx) => {
    const [created] = await tx.insert(schema.products).values({
      ...values,
      userId: user.id,
      checkedAt: values.url && values.price != null ? new Date() : null,
    }).returning({ id: schema.products.id })
    if (boardIds.length) {
      await tx.insert(schema.productBoards).values(boardIds.map(boardId => ({ productId: created!.id, boardId })))
    }
    if (values.price != null) {
      await tx.insert(schema.priceChecks).values({
        productId: created!.id,
        price: values.price,
        originalPrice: values.originalPrice,
        availability: values.availability,
      })
    }
    return created!.id
  })

  return toProduct(await findProduct(db, user.id, id))
})
