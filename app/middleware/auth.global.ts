const PUBLIC_ROUTES = new Set(['/login', '/register'])

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (PUBLIC_ROUTES.has(to.path)) {
    if (loggedIn.value) return navigateTo('/')
    return
  }
  // On garde la page demandée (ex. lien partagé vers /add?url=…) pour y revenir après connexion
  if (!loggedIn.value) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : undefined })
  }
})
