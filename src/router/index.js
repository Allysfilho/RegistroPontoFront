import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

/*
 * Toda rota do funcionário é prefixada pelo slug da empresa, espelhando a
 * resolução de tenant do backend: `/{empresa}/entrar` no SPA corresponde a
 * `/api/{empresa}/entrar` na API.
 */
const routes = [
  {
    path: '/',
    name: 'diagnostico',
    component: () => import('@/views/DiagnosticoView.vue'),
  },
  {
    path: '/:empresa/entrar',
    name: 'entrar',
    component: () => import('@/views/LoginView.vue'),
    props: true,
    meta: { somenteVisitante: true },
  },
  {
    path: '/:empresa/trocar-senha',
    name: 'trocar-senha',
    component: () => import('@/views/TrocarSenhaView.vue'),
    props: true,
    meta: { exigeAutenticacao: true },
  },
  {
    path: '/:empresa/inicio',
    name: 'inicio',
    component: () => import('@/views/InicioView.vue'),
    props: true,
    meta: { exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: { name: 'diagnostico' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((para) => {
  const empresa = para.params.empresa

  if (!empresa) {
    return true
  }

  const auth = useAuthStore()

  // O slug pode mudar entre navegações, então a sessão é recarregada a cada
  // passagem em vez de uma única vez no boot do app.
  auth.restaurar(empresa)

  if (para.meta.exigeAutenticacao && !auth.autenticado) {
    return { name: 'entrar', params: { empresa } }
  }

  // Enquanto a senha for provisória, o único destino permitido é a troca.
  if (para.meta.exigeSenhaDefinitiva && auth.precisaTrocarSenha) {
    return { name: 'trocar-senha', params: { empresa } }
  }

  if (para.meta.somenteVisitante && auth.autenticado) {
    return auth.precisaTrocarSenha
      ? { name: 'trocar-senha', params: { empresa } }
      : { name: 'inicio', params: { empresa } }
  }

  return true
})

export default router
