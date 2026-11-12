/**
 * Icônes proposées pour une liste (pièce, thème…). L'identifiant est enregistré
 * en base : ne pas renommer un identifiant existant. Fichier : assets/icons/room-<id>.svg
 */
export const BOARD_ICONS = [
  { id: 'salon', label: 'Salon' },
  { id: 'canape', label: 'Canapé' },
  { id: 'salle-a-manger', label: 'Salle à manger' },
  { id: 'cuisine', label: 'Cuisine' },
  { id: 'chambre', label: 'Chambre' },
  { id: 'enfant', label: 'Chambre d\'enfant' },
  { id: 'sdb', label: 'Salle de bain' },
  { id: 'dressing', label: 'Dressing' },
  { id: 'bureau', label: 'Bureau' },
  { id: 'entree', label: 'Entrée' },
  { id: 'buanderie', label: 'Buanderie' },
  { id: 'rangement', label: 'Rangement' },
  { id: 'luminaire', label: 'Luminaires' },
  { id: 'deco', label: 'Déco' },
  { id: 'textile', label: 'Textile' },
  { id: 'plantes', label: 'Plantes' },
  { id: 'peinture', label: 'Peinture' },
  { id: 'exterieur', label: 'Jardin' },
  { id: 'terrasse', label: 'Terrasse' },
  { id: 'garage', label: 'Garage' },
  { id: 'cadeau', label: 'Idées cadeaux' },
  { id: 'autre', label: 'Autre' },
] as const

export type BoardIcon = (typeof BOARD_ICONS)[number]['id']
export const BOARD_ICON_IDS = BOARD_ICONS.map(i => i.id) as [BoardIcon, ...BoardIcon[]]

/** Listes créées pour chaque nouveau compte. */
export const DEFAULT_BOARDS: { name: string, icon: BoardIcon }[] = [
  { name: 'Salon', icon: 'salon' },
  { name: 'Cuisine', icon: 'cuisine' },
  { name: 'Chambre', icon: 'chambre' },
  { name: 'Salle de bain', icon: 'sdb' },
]

/** Disponibilité, normalisée depuis schema.org (InStock, OutOfStock…) ou la page. */
export const AVAILABILITIES = ['in_stock', 'limited', 'preorder', 'out_of_stock', 'unknown'] as const
export type Availability = (typeof AVAILABILITIES)[number]

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  in_stock: 'En stock',
  limited: 'Stock limité',
  preorder: 'Précommande',
  out_of_stock: 'Rupture de stock',
  unknown: 'Stock non communiqué',
}

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'CAD'] as const

export const THEME_MODES = ['system', 'light', 'dark'] as const
export type ThemeMode = (typeof THEME_MODES)[number]

export const THEME_COOKIE = 'kp-theme'
