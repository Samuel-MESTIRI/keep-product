<script setup lang="ts">
import type { BoardIcon } from '#shared/utils/constants'

const route = useRoute()
const id = Number(route.params.id)

const [{ data: boards }, { data: products, status }] = await Promise.all([useBoards(), useProducts()])
const board = computed(() => boards.value.find(b => b.id === id))
if (!board.value) throw createError({ statusCode: 404, statusMessage: 'Liste introuvable' })

useHead({ title: () => `${board.value?.name ?? 'Liste'} · KeepProduct` })

const items = computed(() => products.value.filter(p => p.boardIds.includes(id)))
const hidePurchased = ref(false)
const visible = computed(() => (hidePurchased.value ? items.value.filter(p => !p.purchased) : items.value))
const purchasedCount = computed(() => items.value.filter(p => p.purchased).length)

const editor = ref<{ id: number | null, name: string, icon: BoardIcon } | null>(null)

function edit() {
  if (board.value) editor.value = { id: board.value.id, name: board.value.name, icon: board.value.icon as BoardIcon }
}
</script>

<template>
  <div v-if="board">
    <header class="mb-4 flex min-h-12 items-center gap-2 pt-1">
      <IconButton icon="back" label="Retour aux listes" class="-ml-3 text-primary!" @click="goBack('/boards')" />
      <AppIcon :name="boardIcon(board.icon)" :size="26" class="text-accent" />
      <h1 class="min-w-0 flex-1 truncate text-[26px] leading-tight font-bold tracking-tight">
        {{ board.name }}
      </h1>
      <IconButton icon="edit" label="Modifier la liste" variant="soft" :size="22" @click="edit" />
    </header>

    <!-- Budget -->
    <section v-if="items.length" class="card tabular mb-4 grid grid-cols-3 divide-x divide-line py-3 text-center">
      <div>
        <p class="text-[20px] font-bold">
          {{ items.length }}
        </p>
        <p class="text-[12px] text-muted">
          {{ items.length > 1 ? 'produits' : 'produit' }}
        </p>
      </div>
      <div>
        <p class="text-[20px] font-bold">
          {{ formatPrice(board.total) ?? '—' }}
        </p>
        <p class="text-[12px] text-muted">
          budget total
        </p>
      </div>
      <div>
        <p class="text-[20px] font-bold text-accent">
          {{ formatPrice(board.remaining) ?? '—' }}
        </p>
        <p class="text-[12px] text-muted">
          reste à acheter
        </p>
      </div>
    </section>

    <div class="mb-4 flex gap-2">
      <AppButton variant="secondary" icon="plus" :to="`/add?board=${id}`" class="min-h-11! flex-1 text-[15px]!">
        Ajouter un produit
      </AppButton>
      <BoardChip
        v-if="purchasedCount"
        :label="hidePurchased ? `${purchasedCount} acheté${purchasedCount > 1 ? 's' : ''} masqué${purchasedCount > 1 ? 's' : ''}` : 'Masquer les achetés'"
        icon="check-circle"
        :active="hidePurchased"
        class="min-h-11!"
        @click="hidePurchased = !hidePurchased"
      />
    </div>

    <ProductGrid v-if="visible.length" :products="visible" />

    <EmptyState
      v-else-if="status !== 'pending' && !items.length"
      :icon="boardIcon(board.icon)"
      title="Liste vide"
      text="Ajoute un produit depuis un lien, ou range ici un produit existant depuis sa fiche."
    />

    <BoardEditor v-model="editor" @deleted="navigateTo('/boards', { replace: true })" />
  </div>
</template>
