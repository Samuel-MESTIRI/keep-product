import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = intParam(event)
  const { boardIds, ...patch } = await readValid(event, productPatchSchema)
  const db = await useDb()
  await findProduct(db, user.id, id)

  if (Object.keys(patch).length) {
    await db.update(schema.products).set({ ...patch, updatedAt: new Date() }).where(eq(schema.products.id, id))
  }
  if (boardIds) {
    await setProductBoards(db, id, await ownBoardIds(db, user.id, boardIds))
  }
  return toProduct(await findProduct(db, user.id, id))
})
