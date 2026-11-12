<script setup lang="ts">
defineProps<{
  board: { id: number, name: string, icon: string, count: number, total: number, covers: string[] }
}>()
</script>

<template>
  <NuxtLink :to="`/boards/${board.id}`" class="group block transition active:scale-[0.98]">
    <!-- Couverture : les 4 derniers produits ajoutés -->
    <div class="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-md bg-line ring-1 ring-line">
      <div v-if="board.covers.length === 1" class="col-span-2 row-span-2 bg-photo">
        <img :src="imageUrl(board.covers[0], 'thumb')!" alt="" class="size-full object-contain p-2" loading="lazy" decoding="async">
      </div>
      <template v-else-if="board.covers.length">
        <div v-for="i in 4" :key="i" class="min-h-0 bg-photo">
          <img v-if="board.covers[i - 1]" :src="imageUrl(board.covers[i - 1], 'thumb')!" alt="" class="size-full object-contain p-1" loading="lazy" decoding="async">
        </div>
      </template>
      <div v-else class="col-span-2 row-span-2 flex items-center justify-center bg-surface-alt text-muted">
        <AppIcon :name="boardIcon(board.icon)" :size="44" />
      </div>
    </div>
    <div class="mt-2 flex items-start gap-2 px-0.5">
      <AppIcon :name="boardIcon(board.icon)" :size="20" class="mt-0.5 text-accent" />
      <div class="min-w-0">
        <h3 class="truncate font-semibold">
          {{ board.name }}
        </h3>
        <p class="tabular text-[13px] text-ink-2">
          {{ plural(board.count, 'produit') }}<template v-if="board.total"> · {{ formatPrice(board.total) }}</template>
        </p>
      </div>
    </div>
  </NuxtLink>
</template>
