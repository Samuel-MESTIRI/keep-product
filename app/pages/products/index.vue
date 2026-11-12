<script setup lang="ts">
useHead({ title: 'Mes produits · KeepProduct' })

const { user } = useUserSession()
const [{ data: products, status }, { data: boards }] = await Promise.all([useProducts(), useBoards()])

const search = ref('')
const activeBoard = ref<number | null>(null)
const onlySales = ref(false)

const salesCount = computed(() => products.value.filter(p => discountPercent(p.price, p.originalPrice)).length)

const filtered = computed(() => {
  let list = products.value
  if (activeBoard.value) list = list.filter(p => p.boardIds.includes(activeBoard.value!))
  if (onlySales.value) list = list.filter(p => discountPercent(p.price, p.originalPrice))
  return searchProducts(list, search.value)
})

const total = computed(() => filtered.value.reduce((s, p) => s + (p.price ?? 0) * p.quantity, 0))

function toggleBoard(id: number) {
  activeBoard.value = activeBoard.value === id ? null : id
}

function resetFilters() {
  search.value = ''
  activeBoard.value = null
  onlySales.value = false
}
</script>

<template>
  <div>
    <header class="mb-5 flex items-center justify-between gap-3 pt-2">
      <div class="min-w-0">
        <p class="text-ink-2">
          Bonjour{{ user?.name ? ` ${user.name}` : '' }}
        </p>
        <h1 class="text-[28px] leading-tight font-bold tracking-tight">
          Mes produits
        </h1>
      </div>
      <IconButton icon="plus" label="Ajouter un produit" variant="solid" to="/add" :size="26" />
    </header>

    <template v-if="products.length">
      <label class="relative mb-3 block">
        <span class="sr-only">Rechercher un produit</span>
        <AppIcon name="search" :size="22" class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input v-model="search" type="search" class="field rounded-full! pl-12" placeholder="Rechercher : canapé, IKEA, chêne…" enterkeyhint="search">
      </label>

      <div class="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        <BoardChip v-if="salesCount" label="Promos" icon="sell" :count="salesCount" :active="onlySales" @click="onlySales = !onlySales" />
        <BoardChip
          v-for="b in boards"
          :key="b.id"
          :label="b.name"
          :board="b.icon"
          :count="b.count"
          :active="activeBoard === b.id"
          @click="toggleBoard(b.id)"
        />
      </div>

      <p v-if="filtered.length" class="tabular mb-3 text-[14px] text-ink-2">
        {{ plural(filtered.length, 'produit') }}<template v-if="total"> · {{ formatPrice(total) }}</template>
      </p>
    </template>

    <ProductGrid v-if="filtered.length" :products="filtered" />

    <EmptyState
      v-else-if="products.length"
      icon="search"
      title="Rien ne correspond"
      text="Essaie un autre mot ou retire un filtre."
    >
      <AppButton variant="secondary" @click="resetFilters">
        Tout afficher
      </AppButton>
    </EmptyState>

    <EmptyState
      v-else-if="status !== 'pending'"
      icon="bag"
      title="Aucun produit pour l'instant"
      text="Colle le lien d'un meuble, d'une lampe ou d'un pot de peinture : la fiche se remplit toute seule."
    >
      <AppButton to="/add" icon="link">
        Ajouter depuis un lien
      </AppButton>
    </EmptyState>
  </div>
</template>
