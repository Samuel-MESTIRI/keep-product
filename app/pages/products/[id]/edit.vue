<script setup lang="ts">
definePageMeta({ layout: 'bare' })

const route = useRoute()
const toast = useToast()
const id = Number(route.params.id)

const { data: product } = await useFetch(`/api/products/${id}`, { key: `product-${id}` })
if (!product.value) throw createError({ statusCode: 404, statusMessage: 'Produit introuvable' })

useHead({ title: 'Modifier · KeepProduct' })

const form = ref(toFormValue(product.value))
const saving = ref(false)

async function save() {
  saving.value = true
  try {
    await $fetch(`/api/products/${id}`, { method: 'PUT', body: form.value })
    await Promise.all([refreshNuxtData(`product-${id}`), refreshCollections()])
    toast.show('Fiche enregistrée')
    goBack(`/products/${id}`)
  }
  catch (e) {
    toast.error(errorMessage(e))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="safe-top safe-x mx-auto max-w-2xl">
    <PageHeader title="Modifier la fiche" :back="`/products/${id}`" />
    <ProductForm v-model="form" :saving="saving" @submit="save" />
  </div>
</template>
