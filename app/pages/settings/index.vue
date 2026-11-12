<script setup lang="ts">
useHead({ title: 'Réglages · KeepProduct' })

const { user, clear } = useUserSession()
const { mode, setMode } = useTheme()

const THEME_LABELS: Record<ThemeMode, string> = { system: 'Système', light: 'Clair', dark: 'Sombre' }

async function logout() {
  await clear()
  clearNuxtData()
  await navigateTo('/login', { replace: true })
}
</script>

<template>
  <div class="space-y-8">
    <PageHeader title="Réglages" />

    <section class="card flex items-center gap-4 p-4">
      <div class="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-on-primary">
        {{ user?.name?.[0]?.toUpperCase() }}
      </div>
      <div class="min-w-0">
        <p class="truncate font-semibold">
          {{ user?.name }}
        </p>
        <p class="truncate text-[15px] text-ink-2">
          {{ user?.email }}
        </p>
      </div>
    </section>

    <section>
      <h2 class="section-label mb-3">
        Apparence
      </h2>
      <div class="grid grid-cols-3 gap-1 rounded-full bg-surface-alt p-1">
        <button
          v-for="m in THEME_MODES"
          :key="m"
          type="button"
          class="min-h-11 rounded-full font-medium transition"
          :class="mode === m ? 'bg-primary text-on-primary shadow-(--shadow-card)' : 'text-ink-2'"
          :aria-pressed="mode === m"
          @click="setMode(m)"
        >
          {{ THEME_LABELS[m] }}
        </button>
      </div>
    </section>

    <section>
      <h2 class="section-label mb-3">
        Ajouter depuis Safari
      </h2>
      <NuxtLink to="/settings/shortcut" class="card flex min-h-16 items-center gap-3 px-4 py-3 active:bg-surface-alt">
        <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <AppIcon name="link" :size="22" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block font-semibold">Raccourci iPhone</span>
          <span class="block text-[14px] text-ink-2">Partager → KeepProduct, même sur les sites qui bloquent</span>
        </span>
        <AppIcon name="chevron-right" :size="20" class="text-muted" />
      </NuxtLink>
    </section>

    <section>
      <h2 class="section-label mb-3">
        Installer l'app
      </h2>
      <div class="card space-y-2 p-4 text-[15px] text-ink-2">
        <p><strong class="text-ink">iPhone :</strong> dans Safari, touche Partager puis « Sur l'écran d'accueil ».</p>
        <p><strong class="text-ink">Android :</strong> menu ⋮ de Chrome puis « Installer l'application ». Tu pourras ensuite partager un produit vers KeepProduct depuis n'importe quel site.</p>
      </div>
    </section>

    <section>
      <AppButton variant="secondary" @click="logout">
        Se déconnecter
      </AppButton>
    </section>
  </div>
</template>
