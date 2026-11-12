<script setup lang="ts">
import type { BoardIcon } from '#shared/utils/constants'

useHead({ title: 'Mes listes · KeepProduct' })

const [{ data: boards, status }, { data: products }] = await Promise.all([useBoards(), useProducts()])

const editor = ref<{ id: number | null, name: string, icon: BoardIcon } | null>(null)
const unsorted = computed(() => products.value.filter(p => !p.boardIds.length).length)
</script>

<template>
  <div>
    <header class="mb-5 flex items-center justify-between gap-3 pt-2">
      <div>
        <p class="text-ink-2">
          Par pièce ou par projet
        </p>
        <h1 class="text-[28px] leading-tight font-bold tracking-tight">
          Mes listes
        </h1>
      </div>
      <IconButton icon="plus" label="Nouvelle liste" variant="solid" :size="26" @click="editor = { id: null, name: '', icon: 'autre' }" />
    </header>

    <div v-if="boards.length" class="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3">
      <BoardCard v-for="b in boards" :key="b.id" :board="b" />
    </div>

    <EmptyState
      v-else-if="status !== 'pending'"
      icon="boards"
      title="Aucune liste"
      text="Crée une liste par pièce (Salon, Cuisine…) ou par projet pour ranger tes produits."
    >
      <AppButton icon="plus" @click="editor = { id: null, name: '', icon: 'autre' }">
        Créer une liste
      </AppButton>
    </EmptyState>

    <p v-if="unsorted" class="mt-8 text-center text-[14px] text-ink-2">
      {{ plural(unsorted, 'produit') }} sans liste ·
      <NuxtLink to="/products" class="font-semibold text-primary">voir tous les produits</NuxtLink>
    </p>

    <BoardEditor v-model="editor" @saved="b => navigateTo(`/boards/${b.id}`)" />
  </div>
</template>
