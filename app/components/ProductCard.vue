<script setup lang="ts">
export interface ProductCardItem {
  id: number
  name: string
  image: string | null
  remoteImage: string | null
  imageRatio: number | null
  merchant: string | null
  url: string | null
  price: number | null
  originalPrice: number | null
  currency: string
  availability: string
  purchased: boolean
  quantity: number
}

const props = defineProps<{ product: ProductCardItem }>()
const discount = computed(() => discountPercent(props.product.price, props.product.originalPrice))
// Photo sans proportions connues (photo du site marchand) : carré
const ratio = computed(() => props.product.imageRatio ?? 1)
const src = computed(() => productImage(props.product, 'thumb'))
</script>

<template>
  <NuxtLink
    :to="`/products/${product.id}`"
    class="group block overflow-hidden rounded-md bg-surface shadow-(--shadow-card) ring-1 ring-line transition active:scale-[0.98]"
    :class="{ 'opacity-60': product.purchased }"
  >
    <div class="relative bg-photo" :style="{ aspectRatio: product.image ? String(Math.max(0.55, Math.min(1.6, ratio))) : '1' }">
      <img
        v-if="src"
        :src="src"
        alt=""
        class="size-full object-contain"
        loading="lazy"
        decoding="async"
        referrerpolicy="no-referrer"
      >
      <div v-else class="flex size-full items-center justify-center bg-placeholder text-line-strong">
        <AppIcon name="bag" :size="48" />
      </div>

      <span v-if="discount" class="absolute top-2 left-2 rounded-full bg-sale px-2 py-0.5 text-[12px] font-bold text-white">
        −{{ discount }} %
      </span>
      <span
        v-if="product.purchased"
        class="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[12px] font-semibold text-white dark:text-black"
      >
        <AppIcon name="check" :size="14" /> Acheté
      </span>
      <span
        v-else-if="product.availability === 'out_of_stock'"
        class="absolute right-2 bottom-2 rounded-full bg-scrim px-2 py-0.5 text-[12px] font-medium text-white backdrop-blur-sm"
      >
        Rupture
      </span>
    </div>

    <div class="px-3 pt-2 pb-3">
      <p v-if="product.merchant" class="truncate text-[12px] font-medium tracking-wide text-muted uppercase">
        {{ product.merchant }}
      </p>
      <h3 class="line-clamp-2 text-[14px] leading-snug font-medium text-ink">
        {{ product.name }}
      </h3>
      <div class="mt-1 flex items-baseline justify-between gap-2">
        <PriceTag :price="product.price" :original-price="product.originalPrice" :currency="product.currency" />
        <span v-if="product.quantity > 1" class="shrink-0 text-[12px] text-muted">×{{ product.quantity }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
