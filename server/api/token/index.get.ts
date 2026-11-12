import { eq } from 'drizzle-orm'

/** État du code d'accès du Raccourci (jamais le code lui-même). */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  const row = await db.query.apiTokens.findFirst({ where: eq(schema.apiTokens.userId, user.id) })
  return row ? { exists: true, createdAt: row.createdAt, lastUsedAt: row.lastUsedAt } : { exists: false, createdAt: null, lastUsedAt: null }
})
