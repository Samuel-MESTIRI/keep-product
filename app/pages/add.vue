<script setup lang="ts">
import type { ProductFormValue } from '~/utils/product-form'

useHead({ title: 'Ajouter un produit · KeepProduct' })

const route = useRoute()
const toast = useToast()

const url = ref('')
const reading = ref(false)
const error = ref('')
const warning = ref<string | null>(null)
const existingId = ref<number | null>(null)
const form = ref<ProductFormValue | null>(null)
const saving = ref(false)
const input = ref<HTMLInputElement>()

const presetBoard = Number(route.query.board) || null
const canPaste = ref(false)

/** Lien trouvé dans un texte (« Regarde ce canapé https://… »). */
const findUrl = (text: string) => text.match(/https?:\/\/[^\s<>"]+/)?.[0] ?? null

// Le formulaire s'affiche en plein écran, sans la barre d'onglets
watch(form, value => setPageLayout(value ? 'bare' : 'default'))

async function read() {
  const value = findUrl(url.value.trim()) ?? url.value.trim()
  if (!value || reading.value) return
  url.value = value
  error.value = ''
  reading.value = true
  try {
    const data = await $fetch('/api/extract', { method: 'POST', body: { url: value } })
    warning.value = data.warning
    existingId.value = data.existingId
    form.value = toFormValue({ ...data, boardIds: presetBoard ? [presetBoard] : [] })
  }
  catch (e) {
    error.value = errorMessage(e, 'Lecture impossible')
  }
  finally {
    reading.value = false
  }
}

async function paste() {
  try {
    const found = findUrl(await navigator.clipboard.readText())
    if (found) {
      url.value = found
      await read()
    }
    else {
      toast.show('Aucun lien dans le presse-papiers', 'info')
      input.value?.focus()
    }
  }
  catch {
    // Accès au presse-papiers refusé : on colle à la main
    input.value?.focus()
  }
}

function manual() {
  warning.value = null
  existingId.value = null
  form.value = toFormValue({ url: findUrl(url.value) ?? '', boardIds: presetBoard ? [presetBoard] : [] })
}

function restart() {
  form.value = null
  warning.value = null
  existingId.value = null
}

async function save() {
  if (!form.value) return
  saving.value = true
  try {
    const product = await $fetch('/api/products', { method: 'POST', body: form.value })
    await refreshCollections()
    toast.show('Produit ajouté')
    url.value = ''
    form.value = null
    await navigateTo(`/products/${product.id}`, { replace: true })
  }
  catch (e) {
    toast.error(errorMessage(e))
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  canPaste.value = !!navigator.clipboard?.readText
  // Partage depuis un autre appli (Android) ou lien direct : /add?url=… ou ?text=…
  const shared = [route.query.url, route.query.text, route.query.title].map(v => findUrl(String(v ?? ''))).find(Boolean)
  if (shared) {
    url.value = shared
    read()
  }
})

onBeforeRouteLeave(() => setPageLayout('default'))
</script>

<template>
  <div>
    <!-- Étape 1 : le lien -->
    <template v-if="!form">
      <header class="mb-6 pt-2">
        <h1 class="text-[28px] leading-tight font-bold tracking-tight">
          Ajouter un produit
        </h1>
        <p class="mt-1 text-ink-2">
          Colle le lien d'une fiche produit : photo, prix, dimensions et stock sont lus automatiquement.
        </p>
      </header>

      <form class="space-y-3" @submit.prevent="read">
        <label class="sr-only" for="add-url">Lien du produit</label>
        <div class="relative">
          <AppIcon name="link" :size="22" class="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input
            id="add-url"
            ref="input"
            v-model="url"
            class="field pl-12"
            type="url"
            inputmode="url"
            placeholder="https://www.boutique.fr/produit…"
            autocomplete="off"
            autocapitalize="none"
            enterkeyhint="go"
            :disabled="reading"
          >
        </div>

        <p v-if="error" class="rounded-md bg-danger-surface px-4 py-3 text-[15px] font-medium text-danger" role="alert">
          {{ error }}
        </p>

        <AppButton v-if="canPaste && !url.trim()" icon="paste" @click="paste">
          Coller le lien
        </AppButton>
        <AppButton v-else type="submit" icon="download" :loading="reading" :disabled="!url.trim()">
          {{ reading ? 'Lecture de la page…' : 'Lire la fiche produit' }}
        </AppButton>
        <AppButton variant="ghost" :disabled="reading" @click="manual">
          Saisir à la main
        </AppButton>
      </form>

      <section class="mt-8 rounded-md bg-surface-alt p-4 text-[14px] text-ink-2">
        <h2 class="mb-2 flex items-center gap-2 font-semibold text-ink">
          <AppIcon name="info" :size="20" class="text-primary" /> Bon à savoir
        </h2>
        <ul class="list-disc space-y-1 pl-5">
          <li>Fonctionne avec la plupart des boutiques (fiches lues par Google Shopping, boutiques Shopify…).</li>
          <li>Certains sites bloquent la lecture automatique : la fiche est alors à compléter à la main.</li>
          <li>Sur Android, une fois l'app installée, utilise « Partager » depuis le navigateur.</li>
        </ul>
      </section>
    </template>

    <!-- Étape 2 : vérification de la fiche -->
    <div v-else class="safe-top safe-x mx-auto max-w-2xl">
      <header class="mb-4 flex min-h-12 items-center gap-2">
        <IconButton icon="back" label="Retour" class="-ml-3 text-primary!" @click="restart" />
        <h1 class="min-w-0 flex-1 truncate text-[22px] leading-tight font-bold">
          Vérifier la fiche
        </h1>
      </header>

      <NuxtLink
        v-if="existingId"
        :to="`/products/${existingId}`"
        class="mb-4 flex items-center gap-3 rounded-md bg-accent-surface px-4 py-3 text-[15px] font-medium text-accent-strong"
      >
        <AppIcon name="info" :size="22" class="shrink-0" />
        <span class="flex-1">Ce produit est déjà dans ta collection. Voir la fiche</span>
        <AppIcon name="chevron-right" :size="20" />
      </NuxtLink>

      <p v-if="warning" class="mb-4 flex gap-3 rounded-md bg-warning-surface px-4 py-3 text-[15px] font-medium text-warning" role="status">
        <AppIcon name="info" :size="22" class="shrink-0" />
        {{ warning }}
      </p>

      <ProductForm v-model="form" :saving="saving" submit-label="Ajouter à ma collection" @submit="save" />
    </div>
  </div>
</template>
