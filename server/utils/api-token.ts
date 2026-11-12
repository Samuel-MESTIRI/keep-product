import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'

/** Code d'accès du Raccourci iPhone : « kp_ » + 64 caractères hexadécimaux. */
export const newApiToken = () => `kp_${randomBytes(32).toString('hex')}`

export const hashApiToken = (token: string) => createHash('sha256').update(token).digest('hex')

/**
 * Utilisateur désigné par l'en-tête `Authorization: Bearer kp_…`, ou 401.
 * Sert aux appels du Raccourci, qui n'a pas le cookie de session de l'app.
 */
export async function requireTokenUser(event: H3Event) {
  const token = getHeader(event, 'authorization')?.match(/^Bearer\s+(kp_[a-f0-9]{64})\s*$/i)?.[1]
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Code manquant', message: 'Code d\'accès manquant : copie-le depuis Réglages → Raccourci iPhone.' })
  }
  rateLimit(`token:${getRequestIP(event, { xForwardedFor: true })}`, 300, 60 * 60_000)

  const db = await useDb()
  const row = await db.query.apiTokens.findFirst({ where: eq(schema.apiTokens.tokenHash, hashApiToken(token.toLowerCase())) })
  if (!row) {
    throw createError({ statusCode: 401, statusMessage: 'Code invalide', message: 'Code d\'accès invalide ou révoqué : génère-en un nouveau dans Réglages.' })
  }
  await db.update(schema.apiTokens).set({ lastUsedAt: new Date() }).where(eq(schema.apiTokens.userId, row.userId))
  return { id: row.userId }
}
