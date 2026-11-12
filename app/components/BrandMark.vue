<script setup lang="ts">
// Même dessin que l'icône de l'app (scripts/generate-icons.mjs)
withDefaults(defineProps<{ size?: number }>(), { size: 40 })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true" class="shrink-0">
    <rect width="64" height="64" rx="16" fill="var(--c-primary)" />
    <g transform="rotate(-40 32 32)">
      <path d="M12.5 32 22 21.5h25a3.5 3.5 0 0 1 3.5 3.5v14a3.5 3.5 0 0 1-3.5 3.5H22Z" fill="var(--c-on-primary)" />
      <circle cx="22.5" cy="32" r="3.6" fill="var(--c-primary)" />
      <rect x="31" y="29.5" width="13" height="5" rx="2.5" fill="var(--c-accent)" />
    </g>
  </svg>
</template>
