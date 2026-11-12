import type { H3Error } from 'h3'
import type { ExtractedProduct } from './product-extract'

export interface FetchedProduct {
  product: ExtractedProduct
  /** Ce que la lecture n'a pas pu faire, à afficher tel quel. */
  warning: string | null
}

const BLOCKED = new Set([401, 403, 405, 406, 429, 503])

/**
 * Lit la page d'un produit et en extrait la fiche. Ne lève une erreur que si
 * l'adresse est invalide ou la page n'existe pas : un site qui bloque la
 * lecture renvoie une fiche minimale (nom tiré de l'adresse) avec un avertissement,
 * pour que l'utilisateur la complète à la main.
 *
 * `pageHtml` : page déjà lue par l'appareil de l'utilisateur (Raccourci iPhone).
 * Elle passe les protections anti-robots qui bloquent le serveur : on ne la relit pas.
 */
export async function fetchProduct(input: string, pageHtml?: string): Promise<FetchedProduct> {
  let url: URL
  try {
    url = new URL(input)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Lien invalide' })
  }

  const empty = (): ExtractedProduct => ({
    name: nameFromUrl(url),
    imageUrl: null,
    brand: null,
    merchant: url.hostname.replace(/^www\d?\./, ''),
    price: null,
    originalPrice: null,
    currency: null,
    dimensions: null,
    availability: 'unknown',
    color: null,
    url: url.toString(),
  })

  let product: ExtractedProduct
  let warning: string | null = null
  let html = ''

  if (pageHtml) {
    html = pageHtml
    product = extractProduct(html, url)
  }
  else try {
    const page = await safeFetch(url.toString(), { accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', maxBytes: 8 * 1024 * 1024 })
    url = page.url
    html = page.body.toString('utf8')
    product = extractProduct(html, page.url)
  }
  catch (error) {
    const e = error as H3Error<{ status?: number }>
    const status = e.data?.status
    if (status === 404 || status === 410) {
      throw createError({ statusCode: 404, statusMessage: 'Page introuvable', message: 'Ce produit n\'existe plus sur le site, ou le lien est incomplet.' })
    }
    if (e.statusCode === 400) throw error
    product = empty()
    warning = status && BLOCKED.has(status)
      ? 'Ce site bloque la lecture automatique : complète la fiche à la main.'
      : `${e.statusMessage ?? 'Lecture impossible'} : complète la fiche à la main.`
  }

  // Boutique Shopify : son JSON public complète (ou remplace) la page
  const shopifyUrl = shopifyJsonUrl(url)
  const looksShopify = !html || /cdn\.shopify\.com|Shopify\.theme|shopify-section/i.test(html)
  if (shopifyUrl && looksShopify && (product.price == null || !product.imageUrl || product.availability === 'unknown')) {
    try {
      const res = await safeFetch(shopifyUrl, { accept: 'application/json', maxBytes: 3 * 1024 * 1024 })
      const extra = fromShopify(JSON.parse(res.body.toString('utf8')), url)
      product = mergeProduct(product, extra)
      if (extra.name) {
        product.name = product.name && product.name !== nameFromUrl(url) ? product.name : extra.name
        warning = null
      }
    }
    catch {
      // Pas une boutique Shopify, ou JSON fermé
    }
  }

  if (!warning && !product.price && !product.imageUrl) {
    warning = 'Ce site ne publie presque aucune information lisible : vérifie et complète la fiche.'
  }
  else if (!warning && product.price == null) {
    warning = 'Prix introuvable sur la page : ajoute-le à la main si besoin.'
  }

  return { product, warning }
}

/**
 * Photo d'un produit : copie locale si le serveur peut la télécharger, sinon
 * l'adresse de la photo chez le marchand (affichée telle quelle par l'app).
 */
export async function productPhoto(imageUrl: string | null, pageUrl: string) {
  const local = await downloadProductImage(imageUrl, pageUrl)
  return {
    image: local?.image ?? null,
    imageRatio: local?.imageRatio ?? null,
    remoteImage: local || !imageUrl || imageUrl.length > 2000 ? null : imageUrl,
  }
}

/** Télécharge et compresse la photo d'un produit ; null si elle est inaccessible. */
export async function downloadProductImage(imageUrl: string | null, pageUrl: string) {
  if (!imageUrl) return null
  try {
    const file = await safeFetch(imageUrl, {
      accept: 'image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8',
      maxBytes: 15 * 1024 * 1024,
      // Certains CDN refusent les images demandées hors de leur site
      headers: { referer: pageUrl },
    })
    return await saveImage(file.body)
  }
  catch {
    return null
  }
}
