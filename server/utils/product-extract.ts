import type { Availability } from '#shared/utils/constants'

/**
 * Lecture d'une fiche produit depuis le HTML d'une page marchande.
 *
 * Les informations sont cherchées, de la plus fiable à la moins fiable :
 *  1. la fiche structurée schema.org/Product (JSON-LD) publiée pour Google Shopping ;
 *  2. les balises meta Open Graph / Facebook (`og:*`, `product:*`) ;
 *  3. les attributs microdata (`itemprop="price"`…) ;
 *  4. quelques repères propres à certains sites (Amazon) et le texte de la page
 *     pour les dimensions (« L 120 x P 60 x H 75 cm », « Largeur : 120 cm »…).
 * Chaque champ prend la première valeur trouvée : une source incomplète est
 * complétée par la suivante.
 */

export interface ExtractedProduct {
  name: string | null
  imageUrl: string | null
  brand: string | null
  merchant: string | null
  /** En centimes */
  price: number | null
  /** Prix barré (promotion), en centimes */
  originalPrice: number | null
  currency: string | null
  dimensions: string | null
  availability: Availability
  color: string | null
  /** Adresse canonique de la page */
  url: string
}

type Json = Record<string, unknown>

const asArray = <T>(v: T | T[] | undefined | null): T[] => (v == null ? [] : Array.isArray(v) ? v : [v])

const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', nbsp: ' ', eacute: 'é', egrave: 'è', agrave: 'à',
  ccedil: 'ç', ocirc: 'ô', ecirc: 'ê', icirc: 'î', ucirc: 'û', rsquo: '’', lsquo: '‘', oelig: 'œ', euro: '€',
  times: '×', deg: '°', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—', reg: '®', trade: '™',
}

export function decodeEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name: string) => ENTITIES[name.toLowerCase()] ?? m)
}

/** Texte brut : sans balises HTML ni entités, espaces normalisés. */
export function plainText(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') return ''
  return decodeEntities(String(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t  ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

const clean = (value: unknown, max = 200): string | null => {
  const text = plainText(value).replace(/\n/g, ' ').trim()
  return text ? text.slice(0, max) : null
}

/* ------------------------------------------------------------------ */
/* Prix, disponibilité                                                 */
/* ------------------------------------------------------------------ */

/**
 * Prix en centimes depuis un nombre ou un texte : « 1 299,99 € », "1.299,99",
 * "1,299.99", "129.9", 129.9. Un séparateur suivi de 3 chiffres est un séparateur de milliers.
 */
export function parsePrice(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null
  if (typeof value !== 'string') return null
  const match = decodeEntities(value).replace(/[\s  ']/g, '').match(/\d[\d.,]*/)
  if (!match) return null
  let s = match[0].replace(/[.,]$/, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.'
    s = s.replace(decimal === ',' ? /\./g : /,/g, '').replace(',', '.')
  }
  else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.'
    const parts = s.split(sep)
    const tail = parts.at(-1)!
    s = parts.length === 2 && tail.length !== 3 ? `${parts[0]}.${tail}` : parts.join('')
  }
  const n = Number(s)
  return Number.isFinite(n) && n > 0 && n < 10_000_000 ? Math.round(n * 100) : null
}

export function normalizeAvailability(value: unknown): Availability {
  const v = String(value ?? '').toLowerCase().replace(/[\s_-]/g, '')
  if (!v) return 'unknown'
  if (/outofstock|soldout|discontinued|unavailable|indisponible|rupture|épuisé|epuise|oos/.test(v)) return 'out_of_stock'
  if (/preorder|presale|backorder|précommande|precommande/.test(v)) return 'preorder'
  if (/limitedavailability|lowstock|limited|onlyfewleft|stocklimit/.test(v)) return 'limited'
  if (/instock|instoreonly|onlineonly|available|enstock|disponible|true/.test(v)) return 'in_stock'
  return 'unknown'
}

/* ------------------------------------------------------------------ */
/* Dimensions                                                          */
/* ------------------------------------------------------------------ */

const NUM = String.raw`\d+(?:[.,]\d+)?`
const UNIT = String.raw`(?:mm|cm|m)\b`

const MEASURE_LABELS: [RegExp, string][] = [
  [/^(?:largeur|width|larg\.?|l)$/i, 'L'],
  [/^(?:profondeur|depth|prof\.?|p)$/i, 'P'],
  [/^(?:hauteur|height|haut\.?|h)$/i, 'H'],
  [/^(?:longueur|length|long\.?)$/i, 'Long.'],
  [/^(?:diamètre|diametre|diameter|ø|⌀)$/i, 'Ø'],
  [/^(?:épaisseur|epaisseur|thickness)$/i, 'Ép.'],
]

const UNIT_CODES: Record<string, string> = { CMT: 'cm', MMT: 'mm', MTR: 'm', INH: 'in' }

/** QuantitativeValue schema.org, nombre ou texte → « 120 cm ». */
function measureText(value: unknown): string | null {
  if (value == null) return null
  if (typeof value === 'number') return `${value} cm`
  if (typeof value === 'string') return clean(value, 40)
  if (typeof value === 'object') {
    const q = value as Json
    const v = q.value ?? q.maxValue
    if (v == null) return null
    const unit = (typeof q.unitText === 'string' && q.unitText) || UNIT_CODES[String(q.unitCode ?? '')] || 'cm'
    return `${clean(v, 20)} ${unit}`
  }
  return null
}

/** Mesures étiquetées (« Largeur : 120 cm ») → « L 120 × P 60 × H 75 cm ». */
function formatMeasures(measures: { label: string, value: string }[]): string | null {
  if (!measures.length) return null
  const order = ['L', 'Long.', 'P', 'H', 'Ø', 'Ép.']
  const sorted = [...measures].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))
  const units = new Set(sorted.map(m => m.value.match(/[a-z]+$/i)?.[0]))
  if (units.size === 1) {
    const unit = [...units][0]
    return sorted.map(m => `${m.label} ${m.value.replace(/\s*[a-z]+$/i, '')}`).join(' × ') + (unit ? ` ${unit}` : '')
  }
  return sorted.map(m => `${m.label} ${m.value}`).join(' × ')
}

/**
 * Dimensions cherchées dans un texte. `partial` : accepte une mesure seule
 * (« Hauteur 75 cm ») faute de mieux.
 */
export function findDimensionsInText(text: string, partial = true): string | null {
  // 1. Mesures étiquetées : « Largeur : 120 cm », « Hauteur 75cm »
  const labeled = new Map<string, string>()
  const labelRe = new RegExp(String.raw`\b(largeur|profondeur|hauteur|longueur|diam[eè]tre|[ée]paisseur|width|depth|height|length)(?:\s+(?:totale|hors tout|du produit|de l'assise|assise))?\s*(?:\(\s*cm\s*\))?\s*[:：]?\s*(${NUM})\s*(${UNIT})?`, 'gi')
  for (const m of text.matchAll(labelRe)) {
    const label = MEASURE_LABELS.find(([re]) => re.test(m[1]!.normalize('NFC')))?.[1]
    if (!label || labeled.has(label)) continue
    labeled.set(label, `${m[2]!.replace('.', ',')} ${m[3] ?? 'cm'}`)
  }
  // Tournure inverse : « 52,5 cm de largeur », « 81 cm de haut »
  const reverseRe = new RegExp(String.raw`(${NUM})\s*(${UNIT})\s+(?:de\s+)?(largeur|large|profondeur|profond|hauteur|haut|longueur|long|diam[eè]tre)\b`, 'gi')
  for (const m of text.matchAll(reverseRe)) {
    const word = m[3]!.toLowerCase()
    const label = word.startsWith('larg') ? 'L' : word.startsWith('prof') ? 'P' : word.startsWith('haut') ? 'H' : word.startsWith('long') ? 'Long.' : 'Ø'
    if (!labeled.has(label)) labeled.set(label, `${m[1]!.replace('.', ',')} ${m[2]}`)
  }
  if (labeled.size >= 2) return formatMeasures([...labeled].map(([label, value]) => ({ label, value })))

  // 2. Triplet ou couple « 120 x 60 x 75 cm », « L120 x P60 x H75 cm »
  const part = String.raw`(?:[LlPpHhWwDd]\.?\s*:?\s*)?${NUM}\s*(?:${UNIT})?`
  const tripleRe = new RegExp(String.raw`${part}\s*[x×X*]\s*${part}(?:\s*[x×X*]\s*${part})?\s*${UNIT}`, 'g')
  const candidates = [...text.matchAll(tripleRe)].map(m => ({ value: m[0], index: m.index! }))
  if (candidates.length) {
    // Seulement juste après le mot « dimension(s) » : ailleurs dans la page, un
    // « 160 x 200 cm » peut venir d'un autre produit (suggestions, menu…)
    const keyword = /dimensions?|encombrement/gi
    let best: { value: string } | null = null
    let bestDistance = 300
    for (const k of text.matchAll(keyword)) {
      for (const c of candidates) {
        const d = c.index - k.index!
        if (d >= 0 && d < bestDistance) {
          bestDistance = d
          best = c
        }
      }
    }
    if (best) return best.value.replace(/\s*[x×X*]\s*/g, ' × ').replace(/\s+/g, ' ').trim().slice(0, 120)
  }

  if (partial && labeled.size === 1) return formatMeasures([...labeled].map(([label, value]) => ({ label, value })))
  return null
}

/** Dimensions déclarées dans la fiche schema.org (width/height/depth, additionalProperty). */
function dimensionsFromLd(product: Json): string | null {
  const measures: { label: string, value: string }[] = []
  for (const [key, label] of [['width', 'L'], ['depth', 'P'], ['height', 'H']] as const) {
    const text = measureText(product[key])
    if (text && /\d/.test(text)) measures.push({ label, value: text })
  }
  if (measures.length >= 2) return formatMeasures(measures)

  for (const prop of asArray(product.additionalProperty as Json | Json[])) {
    const name = String(prop?.name ?? '')
    if (/dimension|taille|size|encombrement/i.test(name)) {
      const value = clean(prop.value, 120)
      if (value && /\d/.test(value)) return value
    }
    const label = MEASURE_LABELS.find(([re]) => re.test(name.trim()))?.[1]
    const text = measureText(prop?.unitText ? prop : prop?.value)
    if (label && text && /\d/.test(text)) measures.push({ label, value: text })
  }
  if (measures.length >= 2) return formatMeasures(measures)

  const size = clean(typeof product.size === 'object' ? (product.size as Json)?.name : product.size, 120)
  if (size && /\d.*(cm|mm|m\b|x|×)/i.test(size)) return size
  return measures.length ? formatMeasures(measures) : null
}

/* ------------------------------------------------------------------ */
/* JSON-LD                                                             */
/* ------------------------------------------------------------------ */

function typeIncludes(node: Json, ...types: string[]) {
  return asArray(node['@type'] as string | string[]).some(t => typeof t === 'string' && types.includes(t.replace(/^.*[/#]/, '').toLowerCase()))
}

const PRODUCT_TYPES = ['product', 'productgroup', 'individualproduct', 'productmodel', 'vehicle']

/** Tous les objets Product d'un JSON-LD (tableaux, @graph, mainEntity…). */
function findProducts(node: unknown, found: Json[] = [], depth = 0): Json[] {
  if (!node || typeof node !== 'object' || depth > 8) return found
  if (Array.isArray(node)) {
    for (const item of node) findProducts(item, found, depth + 1)
    return found
  }
  const obj = node as Json
  if (typeIncludes(obj, ...PRODUCT_TYPES)) {
    found.push(obj)
    return found
  }
  for (const key of ['@graph', 'mainEntity', 'mainEntityOfPage', 'itemListElement', 'item', 'about']) {
    findProducts(obj[key], found, depth + 1)
  }
  return found
}

function parseImage(value: unknown): string | null {
  for (const v of asArray(value as unknown)) {
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (v && typeof v === 'object') {
      const url = (v as Json).url ?? (v as Json).contentUrl ?? (v as Json)['@id']
      if (typeof url === 'string' && url.trim()) return url.trim()
    }
  }
  return null
}

const nameOf = (value: unknown): string | null => {
  const v = asArray(value as unknown)[0]
  if (typeof v === 'string') return clean(v, 80)
  if (v && typeof v === 'object') return clean((v as Json).name, 80)
  return null
}

interface OfferInfo {
  price: number | null
  originalPrice: number | null
  currency: string | null
  availability: Availability
  seller: string | null
}

/** Offre(s) schema.org : Offer, AggregateOffer, priceSpecification (prix barré). */
function parseOffers(value: unknown, pageUrl: string): OfferInfo {
  const info: OfferInfo = { price: null, originalPrice: null, currency: null, availability: 'unknown', seller: null }
  let offers = asArray(value as Json | Json[]).filter(o => o && typeof o === 'object')
  // AggregateOffer : on descend dans ses offres si elles sont détaillées
  offers = offers.flatMap(o => (typeIncludes(o, 'aggregateoffer') && o.offers ? [o, ...asArray(o.offers as Json | Json[])] : [o]))
  // L'offre de la variante affichée si l'adresse la désigne
  const exact = offers.find(o => typeof o.url === 'string' && o.url === pageUrl)
  const ordered = exact ? [exact, ...offers] : offers

  for (const offer of ordered) {
    const specs = asArray(offer.priceSpecification as Json | Json[]).filter(Boolean)
    const listSpec = specs.find(s => /listprice|strikethroughprice|msrp|srp/i.test(String(s.priceType ?? '')))
    const saleSpec = specs.find(s => s !== listSpec && !/unitprice|delivery|shipping/i.test(String(s['@type'] ?? '') + String(s.priceType ?? '')))
    info.price ??= parsePrice(offer.price) ?? parsePrice(saleSpec?.price) ?? parsePrice(offer.lowPrice)
    info.originalPrice ??= parsePrice(listSpec?.price) ?? parsePrice(offer.highPrice && offer.lowPrice ? null : offer.highPrice)
    info.currency ??= clean(offer.priceCurrency ?? saleSpec?.priceCurrency, 3)
    if (info.availability === 'unknown') info.availability = normalizeAvailability(offer.availability)
    info.seller ??= nameOf(offer.seller)
  }
  if (info.originalPrice != null && info.price != null && info.originalPrice <= info.price) info.originalPrice = null
  return info
}

function parseJsonLd(html: string): Json[] {
  const products: Json[] = []
  for (const [, content] of html.matchAll(/<script[^>]*type=["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      // Certains sites laissent des retours à la ligne bruts dans les chaînes
      findProducts(JSON.parse(content!.trim().replace(/[\u0000-\u001F]+/g, ' ')), products)
    }
    catch {
      // JSON invalide : on passe au suivant
    }
  }
  return products
}

/* ------------------------------------------------------------------ */
/* Balises meta / microdata                                            */
/* ------------------------------------------------------------------ */

function attributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  for (const m of tag.matchAll(/([a-z_:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    attrs[m[1]!.toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '')
  }
  return attrs
}

/** Balises meta (property / name / itemprop) et attributs microdata (`itemprop` + content). */
function parseMeta(html: string) {
  const meta = new Map<string, string>()
  const set = (key: string | undefined, value: string | undefined) => {
    if (!key || !value?.trim()) return
    const k = key.toLowerCase()
    if (!meta.has(k)) meta.set(k, value.trim())
  }
  for (const [tag] of html.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(tag)
    set(a.property ?? a.name ?? a.itemprop, a.content)
  }
  for (const [tag] of html.matchAll(/<[a-z]+\b[^>]*\bitemprop\s*=[^>]*>/gi)) {
    const a = attributes(tag)
    set(`itemprop:${a.itemprop}`, a.content ?? a.href ?? a.src)
  }
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i)?.[0]
  if (canonical) set('canonical', attributes(canonical).href)
  set('title', html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])
  return meta
}

/* ------------------------------------------------------------------ */
/* Repères propres à certains sites                                    */
/* ------------------------------------------------------------------ */

function amazon(html: string): Partial<ExtractedProduct> {
  const title = html.match(/id=["']productTitle["'][^>]*>([\s\S]*?)<\/span>/i)?.[1]
  const image = html.match(/data-old-hires=["']([^"']+)["']/i)?.[1]
    ?? html.match(/"hiRes"\s*:\s*"([^"]+)"/)?.[1]
    ?? html.match(/id=["']landingImage["'][^>]*src=["']([^"']+)["']/i)?.[1]
  const priceBlock = html.match(/id=["']corePrice(?:Display_desktop)?_feature_div["'][\s\S]{0,4000}/i)?.[0] ?? ''
  const price = priceBlock.match(/class=["']a-offscreen["'][^>]*>([^<]+)</i)?.[1]
  const strike = priceBlock.match(/a-text-price[^>]*data-a-strike=["']true["'][\s\S]{0,300}?class=["']a-offscreen["'][^>]*>([^<]+)</i)?.[1]
  const availability = html.match(/id=["']availability["'][\s\S]{0,600}?<span[^>]*>([\s\S]*?)<\/span>/i)?.[1]
  return {
    name: clean(title),
    imageUrl: image ?? null,
    price: parsePrice(price),
    originalPrice: parsePrice(strike),
    availability: normalizeAvailability(plainText(availability)),
    merchant: 'Amazon',
  }
}

/* ------------------------------------------------------------------ */
/* Assemblage                                                          */
/* ------------------------------------------------------------------ */

const hostName = (url: URL) => url.hostname.replace(/^www\d?\./, '')

/** Photo en grand : les CDN Shopify servent une vignette quand `width` est petit. */
function largeImage(url: URL) {
  const shopify = url.hostname.includes('shopify') || url.pathname.includes('/cdn/shop/')
  if (shopify) {
    url.searchParams.delete('height')
    url.searchParams.set('width', '1400')
    url.pathname = url.pathname.replace(/_(\d+x\d*|\d*x\d+)(?=\.[a-z]+$)/i, '')
  }
  return url.toString()
}

/** « Canapé 3 places | Maisons du Monde » → « Canapé 3 places » */
function stripSiteName(name: string, merchant: string | null) {
  const parts = name.split(/\s+[|–—·•]\s+|\s+-\s+/)
  if (parts.length < 2) return name
  const site = (merchant ?? '').toLowerCase().replace(/\.[a-z]+$/, '')
  const kept = parts.filter(p => !site || !p.toLowerCase().replace(/\s/g, '').includes(site.replace(/\s/g, '')))
  return (kept.length ? kept : parts).slice(0, kept.length > 1 ? 2 : 1).join(' - ')
}

/** Nom deviné depuis l'adresse : « /canape-3-places-velours-p123456.html » → « Canape 3 places velours ». */
export function nameFromUrl(url: URL): string | null {
  const segments = url.pathname.split('/').filter(Boolean).map(s => decodeURIComponent(s))
  for (const segment of segments.reverse()) {
    const words = segment
      .replace(/\.[a-z]{2,5}$/i, '')
      .split(/[-_+]+/)
      // On garde « 3 » (places) ou « 2 » (litres), pas les références (« 216055 », « p12a345 »)
      .filter(w => w && !/^\d{4,}$/.test(w) && !/^[a-z]{0,2}\d[\da-z]{4,}$/i.test(w))
    if (words.length >= 2 && words.join('').length > 6) {
      const text = words.join(' ')
      return (text[0]!.toUpperCase() + text.slice(1)).slice(0, 120)
    }
  }
  return null
}

/** Texte lisible de la page, pour chercher les dimensions. */
function pageText(html: string) {
  return plainText(
    html.slice(0, 1_500_000)
      .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
      // Menus et pied de page : pleins de « Matelas 160 x 200 cm » sans rapport avec le produit
      .replace(/<(nav|header|footer)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|li|tr|td|th|dd|dt|h\d|span)>/gi, '$&\n'),
  )
}

export function extractProduct(html: string, pageUrl: URL): ExtractedProduct {
  const meta = parseMeta(html)
  const m = (...keys: string[]) => keys.map(k => meta.get(k)).find(Boolean) ?? null

  const ldProducts = parseJsonLd(html)
  // ProductGroup : la variante désignée par l'adresse, sinon la première
  let ld = ldProducts[0] ?? null
  if (ld && typeIncludes(ld, 'productgroup')) {
    const variants = asArray(ld.hasVariant as Json | Json[]).filter(Boolean)
    const variant = variants.find(v => typeof v.url === 'string' && v.url === pageUrl.toString()) ?? variants[0]
    if (variant) ld = { ...ld, ...variant, name: variant.name ?? ld.name, image: variant.image ?? ld.image, brand: variant.brand ?? ld.brand }
  }
  const offers = ld ? parseOffers(ld.offers, pageUrl.toString()) : null
  const site = /(^|\.)amazon\./.test(pageUrl.hostname) ? amazon(html) : {}

  const merchant = clean(m('og:site_name', 'application-name'), 80) ?? site.merchant ?? offers?.seller ?? hostName(pageUrl)

  // Prix : JSON-LD, puis Open Graph (le prix soldé l'emporte s'il est plus bas)
  const metaPrice = parsePrice(m('product:price:amount', 'og:price:amount', 'product:price', 'itemprop:price', 'twitter:data1'))
  const metaSale = parsePrice(m('product:sale_price:amount'))
  const metaOriginal = parsePrice(m('product:original_price:amount', 'product:retail_price:amount'))
  let price = offers?.price ?? site.price ?? (metaSale && metaPrice && metaSale < metaPrice ? metaSale : metaPrice ?? metaSale)
  let originalPrice = offers?.originalPrice ?? site.originalPrice
    ?? (metaSale && metaPrice && metaSale < metaPrice ? metaPrice : metaOriginal)
  if (price == null && originalPrice != null) [price, originalPrice] = [originalPrice, null]
  if (originalPrice != null && price != null && originalPrice <= price) originalPrice = null

  let availability = offers?.availability ?? 'unknown'
  if (availability === 'unknown') availability = site.availability ?? 'unknown'
  if (availability === 'unknown') availability = normalizeAvailability(m('product:availability', 'og:availability', 'itemprop:availability'))

  const rawName = clean(ld?.name, 200) ?? site.name ?? clean(m('og:title', 'twitter:title', 'itemprop:name', 'title'), 200)
  const name = rawName ? stripSiteName(rawName, merchant) : nameFromUrl(pageUrl)

  const image = parseImage(ld?.image) ?? site.imageUrl ?? m('og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src', 'itemprop:image')

  const dimensions = (ld ? dimensionsFromLd(ld) : null)
    ?? findDimensionsInText(plainText(String(ld?.description ?? '')), false)
    ?? findDimensionsInText(pageText(html))

  const canonical = (() => {
    const href = m('canonical', 'og:url')
    try {
      const url = href ? new URL(href, pageUrl) : null
      return url && url.hostname === pageUrl.hostname ? url.toString() : pageUrl.toString()
    }
    catch {
      return pageUrl.toString()
    }
  })()

  let imageUrl: string | null = null
  if (image) {
    try {
      imageUrl = largeImage(new URL(image.startsWith('//') ? `https:${image}` : image, pageUrl))
    }
    catch {
      imageUrl = null
    }
  }

  return {
    name,
    imageUrl,
    brand: ld ? nameOf(ld.brand) ?? nameOf(ld.manufacturer) : clean(m('product:brand', 'og:brand', 'itemprop:brand'), 80),
    merchant,
    price,
    originalPrice,
    currency: (offers?.currency ?? clean(m('product:price:currency', 'og:price:currency', 'itemprop:pricecurrency'), 3))?.toUpperCase() ?? null,
    dimensions,
    availability,
    color: clean(ld?.color, 80) ?? clean(m('product:color'), 80),
    url: canonical,
  }
}

/* ------------------------------------------------------------------ */
/* Shopify                                                             */
/* ------------------------------------------------------------------ */

interface ShopifyProduct {
  title?: string
  vendor?: string
  price?: number
  compare_at_price?: number | null
  available?: boolean
  featured_image?: string
  variants?: { id: number, price: number, compare_at_price: number | null, available: boolean, name?: string, featured_image?: { src?: string } | null }[]
}

/**
 * Beaucoup de petites marques de déco tournent sous Shopify, qui publie chaque
 * produit en JSON à l'adresse `/products/<handle>.js` (prix en centimes).
 */
export function shopifyJsonUrl(url: URL): string | null {
  const handle = url.pathname.match(/\/products\/([^/?#.]+)/)?.[1]
  return handle ? `${url.origin}${url.pathname.slice(0, url.pathname.indexOf('/products/'))}/products/${handle}.js` : null
}

export function fromShopify(data: ShopifyProduct, pageUrl: URL): Partial<ExtractedProduct> {
  const variantId = Number(pageUrl.searchParams.get('variant'))
  const variant = data.variants?.find(v => v.id === variantId) ?? data.variants?.find(v => v.available) ?? data.variants?.[0]
  const price = variant?.price ?? data.price ?? null
  const compare = variant?.compare_at_price ?? data.compare_at_price ?? null
  const image = variant?.featured_image?.src ?? data.featured_image
  return {
    name: clean(data.title),
    brand: clean(data.vendor, 80),
    price: typeof price === 'number' ? price : null,
    originalPrice: typeof compare === 'number' && typeof price === 'number' && compare > price ? compare : null,
    availability: (variant?.available ?? data.available) === undefined ? 'unknown' : (variant?.available ?? data.available) ? 'in_stock' : 'out_of_stock',
    imageUrl: image ? largeImage(new URL(image.startsWith('//') ? `https:${image}` : image, pageUrl)) : null,
  }
}

/** Complète `base` avec les champs vides trouvés dans `extra`. */
export function mergeProduct(base: ExtractedProduct, extra: Partial<ExtractedProduct>): ExtractedProduct {
  const out = { ...base }
  for (const [key, value] of Object.entries(extra) as [keyof ExtractedProduct, never][]) {
    if (value == null) continue
    if (key === 'availability' ? out.availability === 'unknown' : out[key] == null) (out as Record<string, unknown>)[key] = value
  }
  if (out.originalPrice != null && out.price != null && out.originalPrice <= out.price) out.originalPrice = null
  return out
}

/** Adresse sans paramètres de suivi ni ancre, pour repérer un produit déjà enregistré. */
export function normalizeUrl(value: string) {
  try {
    const url = new URL(value)
    url.hash = ''
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|gclid|fbclid|msclkid|mc_|ref|srsltid|_ga)/i.test(key)) url.searchParams.delete(key)
    }
    url.hostname = url.hostname.replace(/^www\./, '')
    return url.toString().replace(/\/$/, '').toLowerCase()
  }
  catch {
    return value.trim().toLowerCase()
  }
}
