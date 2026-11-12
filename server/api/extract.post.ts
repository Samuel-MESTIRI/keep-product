import { z } from 'zod'
import { CURRENCIES } from '#shared/utils/constants'

const bodySchema = z.object({ url: urlSchema })

/**
 * Lit une page produit et renvoie la fiche prête à pré-remplir le formulaire.
 * Rien n'est enregistré ici, sauf la photo (supprimée au bout de 24 h si le
 * produit n'est finalement pas ajouté).
 */
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  rateLimit(`extract:${user.id}`, 80, 60 * 60_000)
  const { url } = await readValid(event, bodySchema)

  const { product, warning } = await fetchProduct(url)
  const photo = await productPhoto(product.imageUrl, product.url)
  const existing = await findByUrl(await useDb(), user.id, url, product.url)

  return {
    ...product,
    ...photo,
    currency: (CURRENCIES as readonly string[]).includes(product.currency ?? '') ? product.currency! : 'EUR',
    warning,
    existingId: existing?.id ?? null,
  }
})
