<script setup lang="ts">
/**
 * Barre d'onglets flottante : une capsule détachée des bords, avec une pastille
 * qui glisse sous l'onglet actif. L'onglet actif s'élargit pour afficher son
 * libellé, les autres ne montrent que leur icône.
 */
const route = useRoute()

const tabs = [
  { to: '/', label: 'Listes', icon: 'boards' },
  { to: '/products', label: 'Produits', icon: 'grid' },
  { to: '/add', label: 'Ajouter', icon: 'plus' },
  { to: '/settings', label: 'Réglages', icon: 'setting' },
]

// Accueil = les listes (et le détail d'une liste)
const isActive = (to: string) => (to === '/' ? route.path === '/' || route.path.startsWith('/boards') : route.path.startsWith(to))
const activeIndex = computed(() => tabs.findIndex(t => isActive(t.to)))

// Position de la pastille, mesurée sur l'onglet actif
const items = ref<HTMLElement[]>([])
const pill = ref<{ left: number, width: number } | null>(null)
const animate = ref(false) // pas d'animation au premier placement

function measure() {
  const el = items.value[activeIndex.value]
  if (!el) return
  pill.value = { left: el.offsetLeft, width: el.offsetWidth }
}

// L'onglet change de largeur pendant la transition : on suit jusqu'à la fin
let frame = 0
function follow(duration = 450) {
  cancelAnimationFrame(frame)
  const end = performance.now() + duration
  const tick = () => {
    measure()
    if (performance.now() < end) frame = requestAnimationFrame(tick)
  }
  tick()
}

watch(activeIndex, () => follow())

let observer: ResizeObserver | undefined
onMounted(() => {
  measure()
  requestAnimationFrame(() => (animate.value = true))
  observer = new ResizeObserver(measure)
  if (items.value[0]?.parentElement) observer.observe(items.value[0].parentElement)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  observer?.disconnect()
})
</script>

<template>
  <nav
    class="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3"
    style="padding-bottom: max(env(safe-area-inset-bottom), 12px)"
    aria-label="Navigation principale"
  >
    <ul class="pointer-events-auto relative mx-auto flex h-16 max-w-md items-center rounded-full border border-line/70 bg-surface/80 p-1.5 shadow-(--shadow-float) backdrop-blur-xl backdrop-saturate-150">
      <!-- Pastille de l'onglet actif -->
      <span
        v-if="pill && activeIndex >= 0"
        class="nav-pill absolute top-1.5 bottom-1.5 rounded-full bg-primary"
        :class="{ 'is-animated': animate }"
        :style="{ transform: `translateX(${pill.left}px)`, width: `${pill.width}px` }"
        aria-hidden="true"
      />

      <li
        v-for="(tab, i) in tabs"
        :key="tab.to"
        ref="items"
        class="nav-item relative z-10 h-full min-w-0"
        :class="isActive(tab.to) ? 'is-active' : ''"
      >
        <NuxtLink
          :to="tab.to"
          class="flex h-full items-center justify-center gap-2 rounded-full px-3 transition-colors duration-300 active:scale-95"
          :class="isActive(tab.to) ? 'text-on-primary' : 'text-muted'"
          :aria-current="isActive(tab.to) ? 'page' : undefined"
          :aria-label="tab.label"
        >
          <AppIcon :key="isActive(tab.to) ? `on-${i}` : `off-${i}`" :name="tab.icon" :size="24" :class="{ 'nav-pop': isActive(tab.to) && animate }" />
          <span class="nav-label truncate text-[14px] font-semibold" aria-hidden="true">{{ tab.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
/* Ressort léger : dépasse un peu sa cible puis revient */
.nav-item {
  flex: 1 1 0;
  transition: flex-grow 0.45s cubic-bezier(0.34, 1.3, 0.64, 1);
}
.nav-item.is-active {
  flex-grow: 2.3;
}

.nav-pill {
  left: 0;
}
.nav-pill.is-animated {
  transition:
    transform 0.45s cubic-bezier(0.34, 1.3, 0.64, 1),
    width 0.45s cubic-bezier(0.34, 1.3, 0.64, 1);
}

.nav-label {
  max-width: 0;
  opacity: 0;
  transform: translateX(-6px);
  transition:
    max-width 0.4s cubic-bezier(0.34, 1.3, 0.64, 1),
    opacity 0.25s ease,
    transform 0.4s cubic-bezier(0.34, 1.3, 0.64, 1);
}
.is-active .nav-label {
  max-width: 7rem;
  opacity: 1;
  transform: none;
  transition-delay: 0s, 0.1s, 0s;
}

.nav-pop {
  animation: nav-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes nav-pop {
  0% { transform: scale(0.6) rotate(-12deg); }
  60% { transform: scale(1.15) rotate(4deg); }
  100% { transform: scale(1) rotate(0); }
}
</style>
