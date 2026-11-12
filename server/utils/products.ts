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

type ProductValues = Omit<typeof schema.products.$inferInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>

/** Crée un produit, ses listes et son premier relevé de prix. Renvoie son identifiant. */
export async function createProduct(db: Db, userId: string, values: ProductValues, boardIds: number[]) {
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(schema.products).values({
      ...values,
      userId,
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
}

/** Produit déjà enregistré pour cette page (aux paramètres de suivi près), ou null. */
export async function findByUrl(db: Db, userId: string, ...urls: string[]) {
  const mine = await db.select({ id: schema.products.id, url: schema.products.url, name: schema.products.name })
    .from(schema.products)
    .where(eq(schema.products.userId, userId))
  const keys = new Set(urls.map(normalizeUrl))
  return mine.find(p => p.url && keys.has(normalizeUrl(p.url))) ?? null
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
