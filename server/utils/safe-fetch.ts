import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

/**
 * Téléchargement d'une adresse fournie par un utilisateur.
 *
 * Le serveur ne doit pas pouvoir être utilisé pour atteindre des adresses
 * internes (base de données, Coolify, métadonnées du VPS…) : chaque adresse,
 * redirections comprises, est résolue et refusée si elle est privée.
 */

const MAX_REDIRECTS = 8

// En-têtes d'un navigateur de bureau ordinaire : beaucoup de boutiques renvoient
// une page vide (ou une erreur) aux clients qui ne s'annoncent pas comme tel.
const BROWSER_HEADERS = {
  'accept-language': 'fr-FR,fr;q=0.9,en;q=0.6',
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'upgrade-insecure-requests': '1',
}

function isPrivateAddress(ip: string) {
  if (isIP(ip) === 6) {
    const v6 = ip.toLowerCase()
    if (v6.startsWith('::ffff:')) return isPrivateAddress(v6.slice(7))
    return v6 === '::1' || v6 === '::' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
  }
  const [a, b] = ip.split('.').map(Number) as [number, number]
  return a === 10 || a === 127 || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 100 && b >= 64 && b <= 127)
    || a >= 224
}

async function assertPublicUrl(url: URL) {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw createError({ statusCode: 400, statusMessage: 'Adresse invalide' })
  }
  const addresses = await lookup(url.hostname, { all: true }).catch(() => [])
  if (!addresses.length) {
    throw createError({ statusCode: 400, statusMessage: 'Site introuvable' })
  }
  if (addresses.some(a => isPrivateAddress(a.address))) {
    throw createError({ statusCode: 400, statusMessage: 'Adresse non autorisée' })
  }
}

/** Lit au plus `maxBytes` octets de la réponse. */
async function readLimited(response: Response, maxBytes: number) {
  const reader = response.body?.getReader()
  if (!reader) return Buffer.alloc(0)
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.length
    if (size > maxBytes) {
      await reader.cancel()
      throw createError({ statusCode: 413, statusMessage: 'Contenu trop volumineux' })
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function safeFetch(input: string, options: { accept: string, maxBytes: number, timeoutMs?: number, headers?: Record<string, string> }) {
  let url: URL
  try {
    url = new URL(input)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Adresse invalide' })
  }

  const signal = AbortSignal.timeout(options.timeoutMs ?? 12_000)
  // Cookies posés pendant les redirections (consentement, session) : renvoyés au saut suivant
  const cookies = new Map<string, string>()
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url)
    const response = await fetch(url, {
      redirect: 'manual',
      signal,
      headers: {
        ...BROWSER_HEADERS,
        'accept': options.accept,
        ...options.headers,
        ...(cookies.size ? { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join('; ') } : {}),
      },
    }).catch((error: Error) => {
      throw createError({
        statusCode: 502,
        statusMessage: error.name === 'TimeoutError' ? 'Le site met trop de temps à répondre' : 'Impossible de joindre le site',
      })
    })

    for (const line of response.headers.getSetCookie?.() ?? []) {
      const [pair] = line.split(';')
      const eq = pair!.indexOf('=')
      if (eq > 0) cookies.set(pair!.slice(0, eq).trim(), pair!.slice(eq + 1).trim())
    }

    const location = response.headers.get('location')
    if (response.status >= 300 && response.status < 400 && location) {
      url = new URL(location, url)
      continue
    }
    if (!response.ok) {
      // `data.status` : permet de distinguer un site qui bloque (403, 429…) d'une page absente (404)
      throw createError({ statusCode: 502, statusMessage: `Le site a répondu une erreur (${response.status})`, data: { status: response.status } })
    }
    return { url, response, body: await readLimited(response, options.maxBytes) }
  }
  throw createError({ statusCode: 502, statusMessage: 'Trop de redirections' })
}
