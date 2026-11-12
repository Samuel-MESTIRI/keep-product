<script setup lang="ts">
/**
 * Raccourci iPhone : code d'accès + guide pas à pas pour créer le Raccourci
 * « KeepProduct » dans l'app Raccourcis (menu Partager de Safari).
 */
definePageMeta({ layout: 'bare' })
useHead({ title: 'Raccourci iPhone · KeepProduct' })

const toast = useToast()
const { confirm } = useConfirm()
const origin = useRequestURL().origin

const { data: status, refresh } = await useFetch('/api/token', { key: 'api-token' })
const token = ref<string | null>(null) // affiché une seule fois, juste après sa création
const busy = ref(false)

async function generate() {
  if (status.value?.exists) {
    const ok = await confirm({
      title: 'Générer un nouveau code ?',
      message: 'L\'ancien code cessera de fonctionner : il faudra coller le nouveau dans ton Raccourci.',
      confirmLabel: 'Nouveau code',
    })
    if (!ok) return
  }
  busy.value = true
  try {
    token.value = (await $fetch('/api/token', { method: 'POST' })).token
    await refresh()
  }
  catch (e) {
    toast.error(errorMessage(e))
  }
  finally {
    busy.value = false
  }
}

async function revoke() {
  const ok = await confirm({
    title: 'Révoquer le code ?',
    message: 'Le Raccourci ne pourra plus ajouter de produits tant que tu n\'auras pas généré un nouveau code.',
    confirmLabel: 'Révoquer',
    danger: true,
  })
  if (!ok) return
  await $fetch('/api/token', { method: 'DELETE' })
  token.value = null
  await refresh()
  toast.show('Code révoqué')
}

const authHeader = computed(() => `Bearer ${token.value ?? 'kp_… (ton code)'}`)

// Script exécuté par Safari sur la page du produit : la page telle qu'affichée,
// allégée des scripts et styles (seules les fiches JSON-LD sont gardées).
const SCRIPT = `var d = document.documentElement.cloneNode(true);
d.querySelectorAll('script:not([type="application/ld+json"]), style, svg, noscript, iframe, video, link:not([rel="canonical"])').forEach(function (e) { e.remove(); });
completion(JSON.stringify({ url: location.href, html: d.outerHTML }));`
</script>

<template>
  <div class="safe-top safe-x mx-auto max-w-2xl pb-12">
    <PageHeader title="Raccourci iPhone" back="/settings" />

    <p class="mb-6 text-ink-2">
      Sur la page d'un produit dans Safari : <strong class="text-ink">Partager → KeepProduct</strong>, tu choisis la liste, c'est enregistré.
      Ça marche même sur les sites qui bloquent la lecture automatique (IKEA, Maisons du Monde…), car c'est ton iPhone qui lit la page.
    </p>

    <!-- 1. Code d'accès -->
    <section class="card mb-8 p-4">
      <h2 class="mb-1 font-semibold">
        1. Ton code d'accès
      </h2>
      <p class="mb-3 text-[14px] text-ink-2">
        Il permet au Raccourci d'ajouter des produits à ton compte. Garde-le pour toi.
      </p>

      <template v-if="token">
        <CopyField :value="token" label="Code" />
        <p class="mt-2 text-[13px] font-medium text-warning">
          Copie-le maintenant : il ne sera plus affiché. (Tu pourras en générer un nouveau.)
        </p>
      </template>
      <p v-else-if="status?.exists" class="mb-3 text-[14px] text-ink-2">
        Code créé {{ relativeDay(status.createdAt) }}
        · {{ status.lastUsedAt ? `utilisé ${relativeDay(status.lastUsedAt)}` : 'jamais utilisé' }}
      </p>

      <div class="mt-3 flex flex-col gap-1">
        <AppButton :variant="status?.exists ? 'secondary' : 'primary'" :loading="busy" @click="generate">
          {{ status?.exists ? 'Générer un nouveau code' : 'Générer mon code' }}
        </AppButton>
        <AppButton v-if="status?.exists" variant="ghost" class="text-danger!" @click="revoke">
          Révoquer le code
        </AppButton>
      </div>
    </section>

    <!-- 2. Guide -->
    <section>
      <h2 class="mb-1 font-semibold">
        2. Créer le Raccourci (une seule fois)
      </h2>
      <p class="mb-4 text-[14px] text-ink-2">
        Ouvre l'app <strong>Raccourcis</strong> → <strong>+</strong>, nomme-le <strong>KeepProduct</strong>, puis ajoute ces actions dans l'ordre
        (cherche leur nom dans la barre de recherche du bas).
      </p>

      <ol class="space-y-5">
        <li class="card p-4">
          <p class="mb-2 font-semibold">
            ① Réglages du raccourci
          </p>
          <p class="text-[14px] text-ink-2">
            Touche <strong>ⓘ</strong> (en bas) → active <strong>« Afficher dans la feuille de partage »</strong>.
            En haut de l'éditeur, dans « Recevoir … de Partager », ne garde que <strong>Pages web Safari</strong>.
          </p>
        </li>

        <li class="card p-4">
          <p class="mb-2 font-semibold">
            ② Exécuter JavaScript sur une page web
          </p>
          <p class="mb-2 text-[14px] text-ink-2">
            Entrée : <strong>Entrée du raccourci</strong>. Remplace tout le code proposé par :
          </p>
          <CopyField :value="SCRIPT" label="Script" multiline />
        </li>

        <li class="card p-4">
          <p class="mb-2 font-semibold">
            ③ Obtenir le contenu de l'URL <span class="font-normal text-ink-2">(tes listes)</span>
          </p>
          <p class="mb-2 text-[14px] text-ink-2">
            URL :
          </p>
          <CopyField :value="`${origin}/api/shortcut/boards`" label="URL" />
          <p class="mt-3 mb-2 text-[14px] text-ink-2">
            Touche la flèche › → <strong>En-têtes</strong> → ajouter un en-tête : clé <strong>Authorization</strong>, valeur :
          </p>
          <CopyField :value="authHeader" label="En-tête" />
        </li>

        <li class="card p-4">
          <p class="mb-2 font-semibold">
            ④ Choisir dans la liste
          </p>
          <p class="text-[14px] text-ink-2">
            Entrée : <strong>Contenu de l'URL</strong>. Touche › → Invite : <em>Dans quelle liste ?</em>
          </p>
        </li>

        <li class="card p-4">
          <p class="mb-2 font-semibold">
            ⑤ Obtenir la valeur du dictionnaire
          </p>
          <p class="text-[14px] text-ink-2">
            Obtenir la <strong>Valeur</strong> pour <strong>Élément choisi</strong> dans <strong>Contenu de l'URL</strong>.
          </p>
        </li>

        <li class="card p-4">
          <p class="mb-2 font-semibold">
            ⑥ Obtenir le contenu de l'URL <span class="font-normal text-ink-2">(ajout du produit)</span>
          </p>
          <p class="mb-2 text-[14px] text-ink-2">
            URL : colle ceci, puis ajoute juste après la variable <strong>Valeur du dictionnaire</strong> :
          </p>
          <CopyField :value="`${origin}/api/shortcut/add?board=`" label="URL" />
          <p class="mt-3 text-[14px] text-ink-2">
            Touche › :
          </p>
          <ul class="mt-1 list-disc space-y-1 pl-5 text-[14px] text-ink-2">
            <li>Méthode : <strong>POST</strong></li>
            <li>En-têtes : le même <strong>Authorization</strong> qu'à l'étape ③</li>
            <li>Corps de requête : <strong>JSON</strong> → ajouter un champ <strong>Texte</strong>, clé <strong>page</strong>, valeur : variable <strong>Résultat JavaScript</strong></li>
          </ul>
        </li>

        <li class="card p-4">
          <p class="mb-2 font-semibold">
            ⑦ Obtenir la valeur du dictionnaire
          </p>
          <p class="text-[14px] text-ink-2">
            Obtenir la <strong>Valeur</strong> pour la clé <strong>message</strong> dans <strong>Contenu de l'URL</strong> (celui de l'étape ⑥).
          </p>
        </li>

        <li class="card p-4">
          <p class="mb-2 font-semibold">
            ⑧ Afficher la notification
          </p>
          <p class="text-[14px] text-ink-2">
            Texte : variable <strong>Valeur du dictionnaire</strong>. Tu verras « Ajouté : … · 899 € ».
          </p>
        </li>
      </ol>

      <div class="mt-6 rounded-md bg-surface-alt p-4 text-[14px] text-ink-2">
        <p class="mb-1 font-semibold text-ink">
          Premier essai
        </p>
        <p>
          Dans Safari, ouvre un produit → <strong>Partager</strong> → <strong>KeepProduct</strong>.
          iOS demande d'autoriser l'accès à la page et à {{ origin.replace(/^https?:\/\//, '') }} : choisis « Toujours autoriser ».
          Le produit apparaît ensuite dans l'app (tire vers le bas ou rouvre-la).
        </p>
      </div>
    </section>
  </div>
</template>
