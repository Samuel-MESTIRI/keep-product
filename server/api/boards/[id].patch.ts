import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = intParam(event)
  const input = await readValid(event, boardSchema)
  const db = await useDb()
  const [board] = await db.update(schema.boards).set(input)
    .where(and(eq(schema.boards.id, id), eq(schema.boards.userId, user.id)))
    .returning()
  if (!board) notFound('Liste')
  const { userId: _userId, ...rest } = board
  return rest
})
