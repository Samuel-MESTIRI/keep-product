import { asc, eq } from 'drizzle-orm'

const NO_BOARD = 'Sans liste'

/**
 * Listes de l'utilisateur pour le Raccourci, sous la forme { "Salon": 1, … } :
 * l'action « Choisir dans la liste » de Raccourcis propose directement les noms,
 * puis « Obtenir la valeur du dictionnaire » donne l'identifiant.
 */
export default defineEventHandler(async (event) => {
  const user = await requireTokenUser(event)
  const db = await useDb()
  const boards = await db.select({ id: schema.boards.id, name: schema.boards.name }).from(schema.boards)
    .where(eq(schema.boards.userId, user.id))
    .orderBy(asc(schema.boards.position), asc(schema.boards.id))

  const choices: Record<string, number> = {}
  for (const b of boards) {
    // Deux listes du même nom : on les distingue pour ne pas en perdre une
    let name = b.name
    for (let n = 2; name in choices || name === NO_BOARD; n++) name = `${b.name} (${n})`
    choices[name] = b.id
  }
  choices[NO_BOARD] = 0
  return choices
})
