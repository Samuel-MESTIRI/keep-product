<script setup lang="ts">
import type { ProductFormValue } from '~/utils/product-form'

const form = defineModel<ProductFormValue>({ required: true })
defineProps<{ saving?: boolean, submitLabel?: string }>()
const emit = defineEmits<{ submit: [] }>()

const { data: boards } = await useBoards()
const editor = ref<{ id: null, name: string, icon: 'autre' } | null>(null)
const error = ref('')

function toggleBoard(id: number) {
  form.value.boardIds = form.value.boardIds.includes(id)
    ? form.value.boardIds.filter(b => b !== id)
    : [...form.value.boardIds, id]
}

// Nouvelle liste créée depuis le formulaire : cochée d'office
function onBoardCreated(board: { id: number }) {
  form.value.boardIds = [...form.value.boardIds, board.id]
}

const discount = computed(() => {
  const toCents = (v: string) => {
    const n = Number(v.replace(/\s/g, '').replace(',', '.'))
    return v.trim() && Number.isFinite(n) ? Math.round(n * 100) : null
  }
  return discountPercent(toCents(form.value.price), toCents(form.value.originalPrice))
})

function submit() {
  error.value = ''
  const result = productSchema.safeParse(form.value)
  if (!result.success) {
    error.value = result.error.issues[0]?.message ?? 'Vérifie le formulaire'
    return
  }
  emit('submit')
}
</script>

<template>
  <form class="space-y-5" novalidate @submit.prevent="submit">
    <PhotoPicker v-model:image="form.image" v-model:ratio="form.imageRatio" v-model:remote="form.remoteImage" />

    <div>
      <label for="p-name" class="label">Nom du produit</label>
      <textarea id="p-name" v-model="form.name" class="field min-h-0 resize-none" rows="2" maxlength="200" placeholder="Canapé 3 places en velours" required />
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="p-price" class="label">Prix</label>
        <div class="relative">
          <input id="p-price" v-model="form.price" class="field tabular pr-14" inputmode="decimal" placeholder="0,00" autocomplete="off">
          <select v-model="form.currency" class="absolute top-1/2 right-1 h-9 -translate-y-1/2 rounded-sm bg-transparent px-1 text-[14px] text-ink-2" aria-label="Devise">
            <option v-for="c in CURRENCIES" :key="c" :value="c">
              {{ c }}
            </option>
          </select>
        </div>
      </div>
      <div>
        <label for="p-original" class="label">
          Prix barré
          <span v-if="discount" class="ml-1 rounded-full bg-sale px-1.5 text-[12px] font-bold text-white">−{{ discount }} %</span>
        </label>
        <input id="p-original" v-model="form.originalPrice" class="field tabular" inputmode="decimal" placeholder="Si en promo" autocomplete="off">
      </div>
    </div>

    <div>
      <label for="p-dimensions" class="label">Dimensions</label>
      <input id="p-dimensions" v-model="form.dimensions" class="field" maxlength="200" placeholder="L 210 × P 90 × H 82 cm">
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="p-availability" class="label">Disponibilité</label>
        <select id="p-availability" v-model="form.availability" class="field appearance-none">
          <option v-for="a in AVAILABILITIES" :key="a" :value="a">
            {{ AVAILABILITY_LABELS[a] }}
          </option>
        </select>
      </div>
      <div>
        <label for="p-quantity" class="label">Quantité</label>
        <input id="p-quantity" v-model.number="form.quantity" class="field tabular" type="number" min="1" max="999" inputmode="numeric">
      </div>
    </div>

    <fieldset>
      <legend class="label">
        Listes
      </legend>
      <div class="flex flex-wrap gap-2">
        <BoardChip
          v-for="b in boards"
          :key="b.id"
          :label="b.name"
          :board="b.icon"
          :active="form.boardIds.includes(b.id)"
          @click="toggleBoard(b.id)"
        />
        <BoardChip label="Nouvelle liste" icon="plus" class="border-dashed! text-primary!" @click="editor = { id: null, name: '', icon: 'autre' }" />
      </div>
    </fieldset>

    <div>
      <label for="p-url" class="label">Lien du site marchand</label>
      <input id="p-url" v-model="form.url" class="field" type="url" inputmode="url" autocapitalize="none" placeholder="https://…">
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label for="p-merchant" class="label">Boutique</label>
        <input id="p-merchant" v-model="form.merchant" class="field" maxlength="80" placeholder="IKEA, La Redoute…">
      </div>
      <div>
        <label for="p-brand" class="label">Marque</label>
        <input id="p-brand" v-model="form.brand" class="field" maxlength="80">
      </div>
    </div>

    <div>
      <label for="p-color" class="label">Couleur / finition</label>
      <input id="p-color" v-model="form.color" class="field" maxlength="80" placeholder="Chêne clair, vert sauge…">
    </div>

    <div>
      <label for="p-notes" class="label">Notes</label>
      <textarea id="p-notes" v-model="form.notes" class="field resize-y" rows="3" maxlength="2000" placeholder="À côté de la fenêtre, attendre les soldes…" />
    </div>

    <p v-if="error" class="rounded-md bg-danger-surface px-4 py-3 text-[15px] font-medium text-danger" role="alert">
      {{ error }}
    </p>

    <div class="sticky bottom-0 -mx-4 bg-linear-to-t from-bg from-70% to-transparent px-4 pt-4" style="padding-bottom: max(env(safe-area-inset-bottom), 16px)">
      <AppButton type="submit" :loading="saving">
        {{ submitLabel ?? 'Enregistrer' }}
      </AppButton>
    </div>

    <BoardEditor v-model="editor" @saved="onBoardCreated" />
  </form>
</template>
