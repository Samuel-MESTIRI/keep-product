<script setup lang="ts">
import type { BoardIcon } from '#shared/utils/constants'

/**
 * Feuille de création / modification d'une liste (nom + icône).
 * `board` : null pour fermer, `{ id: null }` pour une nouvelle liste.
 */
const board = defineModel<{ id: number | null, name: string, icon: BoardIcon } | null>({ default: null })
const emit = defineEmits<{ saved: [board: { id: number, name: string, icon: string }], deleted: [id: number] }>()

const toast = useToast()
const { confirm } = useConfirm()
const saving = ref(false)

const iconLabel = computed(() => BOARD_ICONS.find(i => i.id === board.value?.icon)?.label ?? '')

// Nom vide : l'icône choisie propose son libellé
function pickIcon(id: BoardIcon) {
  if (!board.value) return
  const previous = BOARD_ICONS.find(i => i.id === board.value!.icon)?.label
  if (!board.value.name.trim() || board.value.name === previous) {
    board.value.name = BOARD_ICONS.find(i => i.id === id)!.label
  }
  board.value.icon = id
}

async function save() {
  if (!board.value) return
  const { id, name, icon } = board.value
  if (!name.trim()) {
    toast.error('Donne un nom à la liste')
    return
  }
  saving.value = true
  try {
    const saved = await $fetch(id ? `/api/boards/${id}` : '/api/boards', { method: id ? 'PATCH' : 'POST', body: { name, icon } })
    board.value = null
    await refreshNuxtData('boards')
    emit('saved', saved)
  }
  catch (e) {
    toast.error(errorMessage(e))
  }
  finally {
    saving.value = false
  }
}

async function remove() {
  if (!board.value?.id) return
  const { id, name } = board.value
  const ok = await confirm({
    title: `Supprimer « ${name} » ?`,
    message: 'Les produits de cette liste sont conservés dans « Produits ».',
    confirmLabel: 'Supprimer la liste',
    danger: true,
  })
  if (!ok) return
  board.value = null
  await $fetch(`/api/boards/${id}`, { method: 'DELETE' })
  await refreshCollections()
  emit('deleted', id)
}
</script>

<template>
  <BottomSheet :model-value="!!board" :title="board?.id ? 'Modifier la liste' : 'Nouvelle liste'" @update:model-value="board = null">
    <form v-if="board" class="space-y-5" @submit.prevent="save">
      <div>
        <label for="board-name" class="label">Nom</label>
        <input id="board-name" v-model="board.name" class="field" maxlength="40" placeholder="Salon, Appart Lyon, Idées déco…">
      </div>
      <fieldset>
        <legend class="label">
          Icône <span class="font-normal text-ink-2">· {{ iconLabel }}</span>
        </legend>
        <div class="grid grid-cols-6 gap-2">
          <button
            v-for="icon in BOARD_ICONS"
            :key="icon.id"
            type="button"
            class="flex aspect-square items-center justify-center rounded-md border-2 transition active:scale-90"
            :class="board.icon === icon.id ? 'border-primary bg-primary-soft text-primary' : 'border-transparent bg-surface-alt text-ink-2'"
            :aria-label="icon.label"
            :title="icon.label"
            :aria-pressed="board.icon === icon.id"
            @click="pickIcon(icon.id)"
          >
            <AppIcon :name="boardIcon(icon.id)" :size="26" />
          </button>
        </div>
      </fieldset>
      <div class="sticky bottom-0 -mx-5 space-y-1 bg-bg px-5 pt-3">
        <AppButton type="submit" :loading="saving">
          {{ board.id ? 'Enregistrer' : 'Créer la liste' }}
        </AppButton>
        <AppButton v-if="board.id" variant="ghost" icon="trash" class="text-danger!" @click="remove">
          Supprimer la liste
        </AppButton>
      </div>
    </form>
  </BottomSheet>
</template>
