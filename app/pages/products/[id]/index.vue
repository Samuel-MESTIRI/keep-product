<script setup lang="ts">
definePageMeta({ layout: 'bare' })

const route = useRoute()
const toast = useToast()
const { confirm } = useConfirm()
const id = Number(route.params.id)

const { data: product, refresh } = await useFetch(`/api/products/${id}`, { key: `product-${id}` })
if (!product.value) throw createError({ statusCode: 404, statusMessage: 'Produit introuvable' })
const { data: boards } = await useBoards()

useHead({ title: () => `${product.value?.name ?? 'Produit'} · KeepProduct` })

const p = computed(() => product.value!)
const discount = computed(() => discountPercent(p.value.price, p.value.originalPrice))
const merchantName = computed(() => p.value.merchant || hostOf(p.value.url) || 'le site')

// Historique : prix à l'ajout et plus bas relevé
const history = computed(() => {
  const prices = p.value.priceChecks.filter(c => c.price != null)
  if (prices.length < 2) return null
  const first = prices[0]!
  const lowest = prices.reduce((min, c) => (c.price! < min.price! ? c : min), first)
  return { first, lowest, count: prices.length }
})

const busy = ref<'refresh' | 'purchased' | null>(null)

async function patch(body: { purchased?: boolean, quantity?: number, boardIds?: number[] }) {
  try {
    await $fetch(`/api/products/${id}`, { method: 'PATCH', body })
    await Promise.all([refresh(), refreshCollections()])
  }
  catch (e) {
    toast.error(errorMessage(e))
  }
}

async function togglePurchased() {
  busy.value = 'purchased'
  await patch({ purchased: !p.value.purchased })
  busy.value = null
  if (p.value.purchased) toast.show('Marqué comme acheté')
}

function toggleBoard(boardId: number) {
  const ids = p.value.boardIds.includes(boardId) ? p.value.boardIds.filter(b => b !== boardId) : [...p.value.boardIds, boardId]
  product.value = { ...p.value, boardIds: ids } // affichage immédiat
  patch({ boardIds: ids })
}

function changeQuantity(delta: number) {
  const quantity = Math.min(999, Math.max(1, p.value.quantity + delta))
  if (quantity === p.value.quantity) return
  product.value = { ...p.value, quantity }
  patch({ quantity })
}

async function refreshPrice() {
  busy.value = 'refresh'
  try {
    const res = await $fetch(`/api/products/${id}/refresh`, { method: 'POST' })
    await Promise.all([refresh(), refreshCollections()])
    const now = res.product.price
    if (!res.changed) toast.show('Rien n\'a changé depuis la dernière fois', 'info')
    else if (now != null && res.previousPrice != null && now < res.previousPrice) toast.show(`Le prix a baissé : ${formatPrice(now, res.product.currency)}`)
    else toast.show('Fiche mise à jour')
  }
  catch (e) {
    toast.error(errorMessage(e, 'Actualisation impossible'))
  }
  finally {
    busy.value = null
  }
}

async function remove() {
  const ok = await confirm({
    title: 'Supprimer ce produit ?',
    message: 'Il sera retiré de toutes tes listes.',
    confirmLabel: 'Supprimer',
    danger: true,
  })
  if (!ok) return
  await $fetch(`/api/products/${id}`, { method: 'DELETE' })
  await refreshCollections()
  toast.show('Produit supprimé')
  goBack('/products')
}

const menu = ref(false)
</script>

<template>
  <div class="mx-auto max-w-2xl pb-10">
    <!-- Photo -->
    <div class="relative bg-photo">
      <div class="safe-top safe-x absolute inset-x-0 top-0 z-10 flex justify-between">
        <IconButton icon="back" label="Retour" variant="scrim" @click="goBack('/products')" />
        <IconButton icon="dots" label="Plus d'actions" variant="scrim" @click="menu = true" />
      </div>
      <img
        v-if="productImage(p)"
        :src="productImage(p)!"
        referrerpolicy="no-referrer"
        :alt="p.name"
        class="mx-auto max-h-[55dvh] w-full object-contain pt-(--safe-top)"
      >
      <div v-else class="flex h-64 items-center justify-center bg-placeholder text-line-strong">
        <AppIcon name="bag" :size="72" />
      </div>
      <span v-if="discount" class="absolute bottom-3 left-4 rounded-full bg-sale px-3 py-1 text-[14px] font-bold text-white">
        Promo −{{ discount }} %
      </span>
    </div>

    <div class="safe-x space-y-6 pt-5">
      <!-- Identité et prix -->
      <section>
        <p v-if="p.merchant || p.brand" class="mb-1 text-[13px] font-medium tracking-wide text-muted uppercase">
          {{ [p.merchant, p.brand].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') }}
        </p>
        <h1 class="text-[24px] leading-tight font-bold tracking-tight">
          {{ p.name }}
        </h1>
        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
          <PriceTag :price="p.price" :original-price="p.originalPrice" :currency="p.currency" size="lg" />
          <AvailabilityBadge :value="p.availability" />
        </div>
        <div v-if="p.url" class="mt-2 flex items-center justify-between gap-2 text-[13px] text-muted">
          <span>{{ p.checkedAt ? `Relevé ${relativeDay(p.checkedAt)}` : 'Jamais actualisé' }}</span>
          <button
            type="button"
            class="flex min-h-10 items-center gap-1 rounded-full px-2 font-semibold text-primary disabled:opacity-60"
            :disabled="busy === 'refresh'"
            @click="refreshPrice"
          >
            <AppIcon name="refresh" :size="18" :class="{ 'animate-spin': busy === 'refresh' }" />
            {{ busy === 'refresh' ? 'Lecture…' : 'Actualiser prix et stock' }}
          </button>
        </div>
        <p v-if="history && history.first.price !== p.price" class="tabular mt-2 flex items-center gap-2 rounded-md bg-surface-alt px-3 py-2 text-[14px] text-ink-2">
          <AppIcon name="trending-down" :size="18" class="shrink-0 text-primary" />
          <span>
            {{ formatPrice(history.first.price, p.currency) }} à l'ajout
            <template v-if="history.lowest.price !== p.price && history.lowest.price !== history.first.price">
              · plus bas : {{ formatPrice(history.lowest.price, p.currency) }}
            </template>
          </span>
        </p>
      </section>

      <!-- Actions principales -->
      <section class="flex flex-col gap-3">
        <AppButton v-if="p.url" :to="p.url" target="_blank" rel="noopener noreferrer" icon="open-in-new" external>
          Voir sur {{ merchantName }}
        </AppButton>
        <AppButton :variant="p.purchased ? 'success' : 'secondary'" :icon="p.purchased ? 'check-circle' : 'bag'" :loading="busy === 'purchased'" @click="togglePurchased">
          {{ p.purchased ? 'Acheté' : 'Marquer comme acheté' }}
        </AppButton>
      </section>

      <!-- Caractéristiques -->
      <section class="card divide-y divide-line">
        <div class="flex items-center gap-3 px-4 py-3">
          <AppIcon name="ruler" :size="22" class="text-muted" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] text-muted">
              Dimensions
            </p>
            <p :class="p.dimensions ? 'font-medium' : 'text-ink-2'">
              {{ p.dimensions || 'Non renseignées' }}
            </p>
          </div>
        </div>
        <div v-if="p.color" class="flex items-center gap-3 px-4 py-3">
          <AppIcon name="room-peinture" :size="22" class="text-muted" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] text-muted">
              Couleur / finition
            </p>
            <p class="font-medium">
              {{ p.color }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3 px-4 py-2">
          <AppIcon name="stock" :size="22" class="text-muted" />
          <div class="min-w-0 flex-1">
            <p class="text-[13px] text-muted">
              Quantité
            </p>
            <p v-if="p.quantity > 1 && p.price != null" class="tabular text-[14px] text-ink-2">
              Total {{ formatPrice(p.price * p.quantity, p.currency) }}
            </p>
          </div>
          <div class="flex items-center rounded-full bg-surface-alt">
            <button type="button" class="size-11 rounded-full text-[22px] text-primary disabled:opacity-40" :disabled="p.quantity <= 1" aria-label="Diminuer la quantité" @click="changeQuantity(-1)">
              −
            </button>
            <span class="tabular w-8 text-center font-semibold">{{ p.quantity }}</span>
            <button type="button" class="size-11 rounded-full text-[22px] text-primary" aria-label="Augmenter la quantité" @click="changeQuantity(1)">
              +
            </button>
          </div>
        </div>
      </section>

      <!-- Listes -->
      <section>
        <h2 class="section-label mb-3">
          Dans mes listes
        </h2>
        <div class="flex flex-wrap gap-2">
          <BoardChip
            v-for="b in boards"
            :key="b.id"
            :label="b.name"
            :board="b.icon"
            :active="p.boardIds.includes(b.id)"
            @click="toggleBoard(b.id)"
          />
          <p v-if="!boards.length" class="text-ink-2">
            Aucune liste. <NuxtLink to="/" class="font-semibold text-primary">Créer une liste</NuxtLink>
          </p>
        </div>
      </section>

      <section v-if="p.notes">
        <h2 class="section-label mb-2">
          Notes
        </h2>
        <p class="whitespace-pre-line text-ink-2">
          {{ p.notes }}
        </p>
      </section>

      <p class="text-center text-[13px] text-muted">
        Ajouté {{ relativeDay(p.createdAt) }}
      </p>
    </div>

    <BottomSheet v-model="menu">
      <div class="flex flex-col gap-1">
        <AppButton variant="ghost" icon="edit" class="justify-start! text-ink!" :to="`/products/${id}/edit`" @click="menu = false">
          Modifier la fiche
        </AppButton>
        <AppButton v-if="p.url" variant="ghost" icon="refresh" class="justify-start! text-ink!" @click="menu = false; refreshPrice()">
          Actualiser prix et stock
        </AppButton>
        <AppButton variant="ghost" icon="trash" class="justify-start! text-danger!" @click="menu = false; remove()">
          Supprimer le produit
        </AppButton>
      </div>
    </BottomSheet>
  </div>
</template>
