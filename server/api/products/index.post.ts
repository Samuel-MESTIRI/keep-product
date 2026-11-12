export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const input = await readValid(event, productSchema)
  const db = await useDb()
  const boardIds = await ownBoardIds(db, user.id, input.boardIds)
  const { boardIds: _ignored, ...values } = input
  // Photo locale : l'adresse chez le marchand ne sert plus
  const id = await createProduct(db, user.id, { ...values, remoteImage: values.image ? null : values.remoteImage }, boardIds)
  return toProduct(await findProduct(db, user.id, id))
})
