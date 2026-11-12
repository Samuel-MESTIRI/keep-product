/**
 * Produits et listes de l'utilisateur, partagés entre les pages (mêmes clés
 * useFetch) : en revenant sur une page, les données déjà chargées s'affichent
 * tout de suite puis sont rafraîchies en arrière-plan.
 *
 * Synchrones exprès (le résultat de useFetch est « awaitable ») : `revalidate`
 * doit être appelé avant tout `await`, tant que le contexte Nuxt est disponible.
 */
export function useProducts() {
  const result = useFetch('/api/products', { key: 'products', default: () => [], ...swr })
  revalidate(result.refresh)
  return result
}

export function useBoards() {
  const result = useFetch('/api/boards', { key: 'boards', default: () => [], ...swr })
  revalidate(result.refresh)
  return result
}

/** Après un ajout / une modification : listes et produits à jour partout. */
export function refreshCollections() {
  return refreshNuxtData(['products', 'boards'])
}
