<script setup lang="ts">
import type { Availability } from '#shared/utils/constants'

const props = defineProps<{ value: string, compact?: boolean }>()
const tone = computed(() => AVAILABILITY_TONE[props.value as Availability] ?? 'muted')
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap"
    :class="[
      compact ? 'text-[12px]' : 'px-3 py-1 text-[14px]',
      !compact && {
        'bg-success-surface text-success': tone === 'success',
        'bg-warning-surface text-warning': tone === 'warning',
        'bg-danger-surface text-danger': tone === 'danger',
        'bg-surface-alt text-ink-2': tone === 'muted',
      },
      compact && {
        'text-success': tone === 'success',
        'text-warning': tone === 'warning',
        'text-danger': tone === 'danger',
        'text-muted': tone === 'muted',
      },
    ]"
  >
    <span class="size-2 shrink-0 rounded-full bg-current" aria-hidden="true" />
    {{ availabilityLabel(value) }}
  </span>
</template>
