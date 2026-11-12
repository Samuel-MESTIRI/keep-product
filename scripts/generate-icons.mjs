// Génère favicon, icônes PWA, apple-touch-icon et écrans de démarrage iOS
// à partir du dessin du logo (étiquette de prix, même tracé que app/components/BrandMark.vue).
// À relancer si le logo change : `npm run icons`.
import { mkdir, rm } from 'node:fs/promises'
import sharp from 'sharp'

const OUT = 'public'

const THEME = {
  light: { background: '#F6F3EE', tile: '#2E4A52', tag: '#FFFFFF', accent: '#C66B3D' },
  dark: { background: '#121416', tile: '#8FB8C1', tag: '#0E1A1D', accent: '#E38C61' },
}

// Mêmes tailles que dans nuxt.config.ts (points CSS × ratio)
const SPLASH = [
  [430, 932, 3], [440, 956, 3], [393, 852, 3], [402, 874, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 2], [375, 667, 2],
]

/**
 * Le logo dans un carré de 64 unités. `radius` : arrondi de la tuile (0 pour
 * iOS / maskable, qui arrondissent eux-mêmes). `scale` : taille de l'étiquette.
 */
function logoSvg({ size, radius = 16, scale = 1, colors = THEME.light, tile = true }) {
  const s = scale
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
    ${tile ? `<rect width="64" height="64" rx="${radius}" fill="${colors.tile}"/>` : ''}
    <g transform="translate(32 32) scale(${s}) translate(-32 -32) rotate(-40 32 32)">
      <path d="M12.5 32 22 21.5h25a3.5 3.5 0 0 1 3.5 3.5v14a3.5 3.5 0 0 1-3.5 3.5H22Z" fill="${tile ? colors.tag : colors.tile}"/>
      <circle cx="22.5" cy="32" r="3.6" fill="${tile ? colors.tile : colors.background}"/>
      <rect x="31" y="29.5" width="13" height="5" rx="2.5" fill="${colors.accent}"/>
    </g>
  </svg>`)
}

const png = (svg, file) => sharp(svg).png({ compressionLevel: 9 }).toFile(`${OUT}/${file}`)

await rm(`${OUT}/splash`, { recursive: true, force: true })
await mkdir(`${OUT}/splash`, { recursive: true })

await Promise.all([
  png(logoSvg({ size: 48, radius: 12 }), 'favicon.png'),
  png(logoSvg({ size: 180, radius: 0, scale: 0.9 }), 'apple-touch-icon.png'),
  png(logoSvg({ size: 192, radius: 0, scale: 0.9 }), 'pwa-192.png'),
  png(logoSvg({ size: 512, radius: 0, scale: 0.9 }), 'pwa-512.png'),
  // Zone sûre « maskable » : le dessin tient dans le cercle central de 80 %
  png(logoSvg({ size: 512, radius: 0, scale: 0.7 }), 'pwa-maskable-512.png'),
])

for (const [w, h, r] of SPLASH) {
  const width = w * r
  const height = h * r
  for (const scheme of ['light', 'dark']) {
    const colors = THEME[scheme]
    const logo = await sharp(logoSvg({ size: Math.round(width * 0.3), colors })).png().toBuffer()
    await sharp({ create: { width, height, channels: 3, background: colors.background } })
      .composite([{ input: logo, gravity: 'center' }])
      .png({ compressionLevel: 9, palette: true })
      .toFile(`${OUT}/splash/${scheme}-${width}x${height}.png`)
  }
}

console.log('Icônes et écrans de démarrage générés dans public/')
