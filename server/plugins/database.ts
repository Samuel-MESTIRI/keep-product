import { isNotNull } from 'drizzle-orm'

// Ouvre la base et applique les migrations dès le démarrage plutôt qu'à la première requête,
// puis nettoie une fois par jour les photos jamais rattachées à un produit.
export default defineNitroPlugin(() => {
  const cleanup = async () => {
    try {
      const db = await useDb()
      const rows = await db.select({ image: schema.products.image }).from(schema.products).where(isNotNull(schema.products.image))
      const removed = await cleanupOrphanImages(new Set(rows.map(r => r.image!)))
      if (removed) console.info(`[keepproduct] ${removed} photo(s) orpheline(s) supprimée(s)`)
    }
    catch (error) {
      console.error('[keepproduct] nettoyage des photos impossible', error)
    }
  }

  useDb()
    .then(() => {
      console.info('[keepproduct] base de données prête')
      cleanup()
      setInterval(cleanup, 24 * 60 * 60_000).unref()
    })
    .catch(error => console.error('[keepproduct] impossible d\'ouvrir la base de données', error))
})
