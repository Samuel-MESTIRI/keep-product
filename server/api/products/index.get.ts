import { desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const rows = await db.query.products.findMany({
    where: eq(schema.products.userId, user.id),
    orderBy: desc(schema.products.createdAt),
    with: { productBoards: { columns: { boardId: true } } },
  })
  return rows.map(toProduct)
})
