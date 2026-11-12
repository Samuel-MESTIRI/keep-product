import { randomUUID } from 'node:crypto'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

// Toute la gestion des fichiers passe par ici : pour basculer vers un stockage S3/R2,
// il suffit de réécrire ces fonctions.

export const IMAGE_ID = /^[a-f0-9-]{36}$/

export function uploadDir() {
  return resolve(process.env.UPLOAD_DIR || useRuntimeConfig().uploadDir || '.data/uploads')
}

/** Fichiers produits pour une photo : la grande (fiche) et la miniature (grille). */
export const imageFiles = (id: string) => ({ full: `${id}.webp`, thumb: `${id}-thumb.webp` })

/**
 * Compresse une photo en WebP. Le fichier d'origine n'est pas conservé.
 * La miniature garde les proportions de la photo (grille façon Pinterest).
 * La transparence (PNG détourés) est remplacée par du blanc, comme sur les sites marchands.
 */
export async function saveImage(input: Buffer): Promise<{ image: string, imageRatio: number }> {
  const dir = uploadDir()
  await mkdir(dir, { recursive: true })

  // rotate() applique l'orientation EXIF ; les métadonnées (GPS compris) ne sont pas recopiées.
  const base = sharp(input, { limitInputPixels: 60_000_000 }).rotate().flatten({ background: '#ffffff' })
  const [full, thumb] = await Promise.all([
    base.clone().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 74, effort: 5 }).toBuffer(),
    base.clone().resize({ width: 480, height: 900, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 66, effort: 5 }).toBuffer({ resolveWithObject: true }),
  ])

  const id = randomUUID()
  const files = imageFiles(id)
  await Promise.all([
    writeFile(join(dir, files.full), full),
    writeFile(join(dir, files.thumb), thumb.data),
  ])
  const ratio = thumb.info.width / thumb.info.height
  return { image: id, imageRatio: Math.round(Math.min(5, Math.max(0.2, ratio)) * 1000) / 1000 }
}

/**
 * Supprime les photos envoyées mais jamais rattachées à un produit
 * (formulaire abandonné). On laisse 24 h de marge à un formulaire en cours.
 */
export async function cleanupOrphanImages(used: Set<string>) {
  const dir = uploadDir()
  const names = await readdir(dir).catch(() => [] as string[])
  const limit = Date.now() - 24 * 60 * 60_000
  let removed = 0
  for (const name of names) {
    const id = name.replace(/(-thumb)?\.webp$/, '')
    if (!IMAGE_ID.test(id) || used.has(id)) continue
    const info = await stat(join(dir, name)).catch(() => null)
    if (info && info.mtimeMs < limit) {
      await rm(join(dir, name), { force: true })
      removed++
    }
  }
  return removed
}

export async function deleteImage(id: string | null | undefined) {
  if (!id || !IMAGE_ID.test(id)) return
  const dir = uploadDir()
  const files = imageFiles(id)
  await Promise.all([
    rm(join(dir, files.full), { force: true }),
    rm(join(dir, files.thumb), { force: true }),
  ])
}
