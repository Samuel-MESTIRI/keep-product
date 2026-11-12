<script setup lang="ts">
// Photo du produit : celle lue sur le site, ou une photo prise / choisie sur le téléphone.
const image = defineModel<string | null>('image', { required: true })
const ratio = defineModel<number | null>('ratio', { required: true })
// Photo chez le marchand, quand le serveur n'a pas pu la copier
const remote = defineModel<string | null>('remote', { default: null })

const toast = useToast()
const input = ref<HTMLInputElement>()
const uploading = ref(false)

const src = computed(() => imageUrl(image.value) ?? remote.value)

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  uploading.value = true
  try {
    const body = new FormData()
    body.append('image', await resizeImage(file), 'photo.jpg')
    const res = await $fetch('/api/uploads', { method: 'POST', body })
    image.value = res.image
    ratio.value = res.imageRatio
    remote.value = null
  }
  catch (err) {
    toast.error(errorMessage(err, 'Envoi de la photo impossible'))
  }
  finally {
    uploading.value = false
  }
}

function clear() {
  image.value = null
  ratio.value = null
  remote.value = null
}
</script>

<template>
  <div>
    <input ref="input" type="file" accept="image/*" class="hidden" @change="onFile">
    <div v-if="src" class="relative overflow-hidden rounded-md bg-photo ring-1 ring-line">
      <img :src="src" alt="Photo du produit" class="mx-auto max-h-72 w-full object-contain" referrerpolicy="no-referrer">
      <span v-if="!image" class="absolute top-2 left-2 rounded-full bg-scrim px-2.5 py-1 text-[12px] font-medium text-white backdrop-blur-sm">
        Photo du site marchand
      </span>
      <div class="absolute right-2 bottom-2 flex gap-2">
        <IconButton icon="camera" label="Changer la photo" variant="scrim" :size="22" @click="input?.click()" />
        <IconButton icon="trash" label="Retirer la photo" variant="scrim" :size="22" @click="clear" />
      </div>
      <div v-if="uploading" class="absolute inset-0 flex items-center justify-center bg-scrim">
        <span class="size-8 animate-spin rounded-full border-3 border-white border-t-transparent" />
      </div>
    </div>
    <button
      v-else
      type="button"
      class="flex h-36 w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line-strong bg-surface-alt text-ink-2 transition active:scale-[0.99]"
      :disabled="uploading"
      @click="input?.click()"
    >
      <span v-if="uploading" class="size-7 animate-spin rounded-full border-3 border-current border-t-transparent" />
      <AppIcon v-else name="add-photo" :size="32" />
      <span class="text-[15px] font-medium">{{ uploading ? 'Envoi…' : 'Ajouter une photo' }}</span>
    </button>
  </div>
</template>
