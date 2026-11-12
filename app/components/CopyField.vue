<script setup lang="ts">
// Texte à recopier dans l'app Raccourcis, avec un bouton « Copier ».
const props = defineProps<{ value: string, label?: string, multiline?: boolean }>()
const toast = useToast()
const copied = ref(false)

async function copy() {
  try {
    await navigator.clipboard.writeText(props.value)
    copied.value = true
    toast.show(props.label ? `${props.label} copié` : 'Copié')
    setTimeout(() => (copied.value = false), 1800)
  }
  catch {
    toast.error('Copie impossible : sélectionne le texte à la main')
  }
}
</script>

<template>
  <div class="flex items-start gap-2 rounded-md bg-surface-alt p-2 pl-3">
    <code
      class="min-w-0 flex-1 py-1.5 font-mono text-[13px] break-all text-ink select-all"
      :class="multiline ? 'max-h-40 overflow-y-auto whitespace-pre-wrap' : ''"
    >{{ value }}</code>
    <button
      type="button"
      class="flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-semibold transition active:scale-95"
      :class="copied ? 'bg-success-surface text-success' : 'bg-primary-soft text-primary'"
      @click="copy"
    >
      <AppIcon :name="copied ? 'check' : 'paste'" :size="16" />
      {{ copied ? 'Copié' : 'Copier' }}
    </button>
  </div>
</template>
