/** Crée (ou remplace) le code d'accès du Raccourci. Le code n'est renvoyé qu'ici, une seule fois. */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  rateLimit(`token-create:${user.id}`, 10, 60 * 60_000)
  const token = newApiToken()
  const db = await useDb()
  await db.insert(schema.apiTokens)
    .values({ userId: user.id, tokenHash: hashApiToken(token) })
    .onConflictDoUpdate({
      target: schema.apiTokens.userId,
      set: { tokenHash: hashApiToken(token), createdAt: new Date(), lastUsedAt: null },
    })
  return { token }
})
