import { and, eq } from 'drizzle-orm'

/** Supprime la liste ; ses produits restent dans « Tous les produits ». */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = intParam(event)
  const db = await useDb()
  const [deleted] = await db.delete(schema.boards)
    .where(and(eq(schema.boards.id, id), eq(schema.boards.userId, user.id)))
    .returning({ id: schema.boards.id })
  if (!deleted) notFound('Liste')
  return { ok: true }
})
