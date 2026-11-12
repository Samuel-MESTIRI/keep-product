<script setup lang="ts">
defineProps<{ title: string, subtitle: string }>()
</script>

<template>
  <div class="safe-top safe-x mx-auto flex min-h-dvh max-w-md flex-col justify-center pb-10">
    <div class="mb-8 flex flex-col items-center text-center">
      <BrandLogo :size="48" class="mb-8" />
      <h1 class="text-[28px] font-bold tracking-tight">
        {{ title }}
      </h1>
      <p class="text-ink-2">
        {{ subtitle }}
      </p>
    </div>
    <slot />
  </div>
</template>
