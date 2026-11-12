<script setup lang="ts">
// `board` : icône d'une liste (salon, cuisine…) ; `icon` : icône quelconque de assets/icons
defineProps<{ label: string, board?: string, icon?: string, active?: boolean, count?: number }>()
</script>

<template>
  <button
    type="button"
    class="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-medium whitespace-nowrap transition active:scale-95"
    :class="active ? 'border-primary bg-primary text-on-primary' : 'border-line bg-surface text-ink'"
    :aria-pressed="active"
  >
    <AppIcon v-if="board || icon" :name="board ? boardIcon(board) : icon!" :size="18" />
    {{ label }}
    <span v-if="count != null" class="text-[12px] opacity-70">{{ count }}</span>
  </button>
</template>
