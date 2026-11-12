import { eq } from 'drizzle-orm'

/** Révoque le code d'accès : le Raccourci ne fonctionne plus jusqu'au prochain code. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const db = await useDb()
  await db.delete(schema.apiTokens).where(eq(schema.apiTokens.userId, user.id))
  return { ok: true }
})
