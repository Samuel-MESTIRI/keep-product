const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface Searchable {
  name: string
  merchant: string | null
  brand: string | null
  color: string | null
  notes: string | null
  dimensions: string | null
}

/** Tous les mots doivent apparaître (nom, boutique, marque, couleur, notes), sans tenir compte des accents. */
export function searchProducts<T extends Searchable>(products: T[], query: string): T[] {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return products
  return products.filter((p) => {
    const haystack = normalize([p.name, p.merchant, p.brand, p.color, p.notes, p.dimensions].filter(Boolean).join(' '))
    return words.every(w => haystack.includes(w))
  })
}
