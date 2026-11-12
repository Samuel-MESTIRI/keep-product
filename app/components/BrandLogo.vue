<script setup lang="ts">
// Logo : une étiquette de prix dans une tuile, suivie du nom. Les couleurs
// viennent du thème (la tuile prend la couleur du texte courant).
withDefaults(defineProps<{ size?: number, wordmark?: boolean }>(), { size: 40, wordmark: true })
</script>

<template>
  <span class="inline-flex items-center gap-2.5" role="img" aria-label="KeepProduct">
    <BrandMark :size="size" />
    <span v-if="wordmark" class="leading-none tracking-tight text-ink" :style="{ fontSize: `${size * 0.6}px` }" aria-hidden="true">
      <span class="font-bold">Keep</span><span class="font-normal text-ink-2">Product</span>
    </span>
  </span>
</template>
