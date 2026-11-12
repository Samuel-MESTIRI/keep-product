import { asc, desc, eq } from 'drizzle-orm'

/** Listes avec leur nombre de produits, leur budget et 4 photos pour la couverture. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const [boards, links] = await Promise.all([
    db.select().from(schema.boards).where(eq(schema.boards.userId, user.id))
      .orderBy(asc(schema.boards.position), asc(schema.boards.id)),
    db.select({
      boardId: schema.productBoards.boardId,
      image: schema.products.image,
      price: schema.products.price,
      quantity: schema.products.quantity,
      purchased: schema.products.purchased,
    }).from(schema.productBoards)
      .innerJoin(schema.products, eq(schema.products.id, schema.productBoards.productId))
      .where(eq(schema.products.userId, user.id))
      .orderBy(desc(schema.productBoards.createdAt)),
  ])

  return boards.map(({ userId: _userId, ...board }) => {
    const items = links.filter(l => l.boardId === board.id)
    const sum = (list: typeof items) => list.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0)
    return {
      ...board,
      count: items.length,
      total: sum(items),
      remaining: sum(items.filter(i => !i.purchased)),
      covers: items.filter(i => i.image).slice(0, 4).map(i => i.image!),
    }
  })
})
