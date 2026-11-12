<script setup lang="ts">
import type { ProductCardItem } from './ProductCard.vue'

/**
 * Grille façon Pinterest : chaque photo garde ses proportions. Les produits
 * sont répartis dans la colonne la moins haute, dans l'ordre de la liste,
 * grâce aux proportions connues des photos (pas besoin d'attendre le chargement).
 */
const props = defineProps<{ products: ProductCardItem[] }>()

const columns = ref(2) // rendu serveur : téléphone
const queries: [number, string][] = [[4, '(min-width: 1024px)'], [3, '(min-width: 640px)']]

function update() {
  columns.value = queries.find(([, q]) => matchMedia(q).matches)?.[0] ?? 2
}

onMounted(() => {
  update()
  addEventListener('resize', update, { passive: true })
})
onBeforeUnmount(() => removeEventListener('resize', update))

const layout = computed(() => {
  const cols: ProductCardItem[][] = Array.from({ length: columns.value }, () => [])
  const heights = Array.from({ length: columns.value }, () => 0)
  for (const p of props.products) {
    const ratio = p.image ? Math.max(0.55, Math.min(1.6, p.imageRatio ?? 1)) : 1
    // Hauteur estimée pour une colonne de largeur 1 : photo + texte (~0,45)
    const height = 1 / ratio + 0.45
    const i = heights.indexOf(Math.min(...heights))
    cols[i]!.push(p)
    heights[i]! += height
  }
  return cols
})
</script>

<template>
  <div class="flex items-start gap-3">
    <div v-for="(col, i) in layout" :key="i" class="flex min-w-0 flex-1 flex-col gap-3">
      <ProductCard v-for="p in col" :key="p.id" :product="p" />
    </div>
  </div>
</template>
