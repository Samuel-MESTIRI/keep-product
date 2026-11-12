import { eq, max } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = await readValid(event, boardSchema)
  const db = await useDb()
  const [last] = await db.select({ position: max(schema.boards.position) }).from(schema.boards).where(eq(schema.boards.userId, user.id))
  const [board] = await db.insert(schema.boards)
    .values({ ...input, userId: user.id, position: (last?.position ?? -1) + 1 })
    .returning()
  const { userId: _userId, ...rest } = board!
  return rest
})
