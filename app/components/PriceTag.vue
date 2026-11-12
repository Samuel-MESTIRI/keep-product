<script setup lang="ts">
const props = withDefaults(defineProps<{
  price: number | null
  originalPrice?: number | null
  currency?: string
  size?: 'sm' | 'lg'
}>(), { size: 'sm', currency: 'EUR', originalPrice: null })

const discount = computed(() => discountPercent(props.price, props.originalPrice))
</script>

<template>
  <span v-if="price != null" class="tabular inline-flex flex-wrap items-baseline gap-x-2">
    <span
      class="font-semibold"
      :class="[size === 'lg' ? 'text-[28px] leading-tight' : 'text-[15px]', discount ? 'text-sale' : 'text-ink']"
    >{{ formatPrice(price, currency) }}</span>
    <s v-if="discount" class="text-muted" :class="size === 'lg' ? 'text-[17px]' : 'text-[13px]'">
      <span class="sr-only">au lieu de</span>{{ formatPrice(originalPrice, currency) }}
    </s>
  </span>
  <span v-else class="text-muted" :class="size === 'lg' ? 'text-[17px]' : 'text-[13px]'">Prix non renseigné</span>
</template>
