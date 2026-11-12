<script setup lang="ts">
// Une page peut masquer la barre d'onglets sans changer de layout
// (changer de layout recrée la page et lui fait perdre son état).
const hideNav = useState('hide-nav', () => false)
</script>

<template>
  <div class="min-h-dvh">
    <main class="safe-top safe-x mx-auto max-w-2xl" :class="hideNav ? 'pb-4' : 'pb-[calc(7rem+env(safe-area-inset-bottom))]'">
      <slot />
    </main>
    <BottomNav v-if="!hideNav" />
  </div>
</template>
