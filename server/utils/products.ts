import { and, eq, inArray } from 'drizzle-orm'
import type { Db } from './db'

type ProductRow = typeof schema.products.$inferSelect

/** Fiche renvoyée au navigateur (sans l'identifiant du propriétaire). */
export function toProduct(row: ProductRow & { productBoards?: { boardId: number }[] }) {
  const { userId: _userId, productBoards, ...product } = row
  return { ...product, boardIds: (productBoards ?? []).map(pb => pb.boardId) }
}

/** Ne garde que les listes qui appartiennent à l'utilisateur. */
export async function ownBoardIds(db: Db, userId: string, ids: number[]) {
  if (!ids.length) return []
  const rows = await db.select({ id: schema.boards.id }).from(schema.boards)
    .where(and(eq(schema.boards.userId, userId), inArray(schema.boards.id, [...new Set(ids)])))
  return rows.map(r => r.id)
}

export async function findProduct(db: Db, userId: string, id: number) {
  const row = await db.query.products.findFirst({
    where: and(eq(schema.products.id, id), eq(schema.products.userId, userId)),
    with: { productBoards: { columns: { boardId: true } } },
  })
  return row ?? notFound('Produit')
}

/** Remplace les listes d'un produit. */
export async function setProductBoards(db: Pick<Db, 'select' | 'insert' | 'delete'>, productId: number, boardIds: number[]) {
  const current = await db.select({ boardId: schema.productBoards.boardId }).from(schema.productBoards)
    .where(eq(schema.productBoards.productId, productId))
  const currentIds = new Set(current.map(c => c.boardId))
  const wanted = new Set(boardIds)
  const removed = [...currentIds].filter(id => !wanted.has(id))
  const added = [...wanted].filter(id => !currentIds.has(id))
  if (removed.length) {
    await db.delete(schema.productBoards)
      .where(and(eq(schema.productBoards.productId, productId), inArray(schema.productBoards.boardId, removed)))
  }
  if (added.length) {
    await db.insert(schema.productBoards).values(added.map(boardId => ({ productId, boardId })))
  }
}
