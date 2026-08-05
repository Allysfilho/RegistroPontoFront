import { createRouter, createWebHistory } from 'vue-router'
import { useAdminStore, useFuncionarioStore, useSuperadminStore } from '@/stores/auth'

/*
 * As URLs espelham a resolução de tenant do backend:
 *
 *   /{empresa}/...        app do funcionário   -> /api/{empresa}/...
 *   /{empresa}/admin/...  painel da empresa    -> /api/{empresa}/admin/...
 *   /central/...          painel do SaaS       -> /api/central/...
 *
 * `contexto` no meta diz qual das três sessões governa a rota.
 */
const routes = [
  {
    path: '/',
    name: 'diagnostico',
    component: () => import('@/views/DiagnosticoView.vue'),
  },

  // ---------- Painel central (superadmin) ----------
  {
    path: '/central/entrar',
    name: 'central.entrar',
    component: () => import('@/views/central/LoginCentralView.vue'),
    meta: { contexto: 'superadmin', somenteVisitante: true },
  },
  {
    path: '/central/trocar-senha',
    name: 'central.trocar-senha',
    component: () => import('@/views/central/TrocarSenhaCentralView.vue'),
    meta: { contexto: 'superadmin', exigeAutenticacao: true },
  },
  {
    path: '/central/empresas',
    name: 'central.empresas',
    component: () => import('@/views/central/EmpresasView.vue'),
    meta: { contexto: 'superadmin', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/central/superadmins',
    name: 'central.superadmins',
    component: () => import('@/views/central/SuperadminsView.vue'),
    meta: { contexto: 'superadmin', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/central',
    redirect: { name: 'central.empresas' },
  },

  // ---------- Painel da empresa (administrador) ----------
  {
    path: '/:empresa/admin/entrar',
    name: 'admin.entrar',
    component: () => import('@/views/admin/LoginAdminView.vue'),
    props: true,
    meta: { contexto: 'admin', somenteVisitante: true },
  },
  {
    path: '/:empresa/admin/trocar-senha',
    name: 'admin.trocar-senha',
    component: () => import('@/views/admin/TrocarSenhaAdminView.vue'),
    props: true,
    meta: { contexto: 'admin', exigeAutenticacao: true },
  },
  {
    path: '/:empresa/admin/estabelecimentos',
    name: 'admin.estabelecimentos',
    component: () => import('@/views/admin/EstabelecimentosView.vue'),
    props: true,
    meta: { contexto: 'admin', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/:empresa/admin/locais',
    name: 'admin.locais',
    component: () => import('@/views/admin/LocaisView.vue'),
    props: true,
    meta: { contexto: 'admin', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/:empresa/admin/funcionarios',
    name: 'admin.funcionarios',
    component: () => import('@/views/admin/FuncionariosView.vue'),
    props: true,
    meta: { contexto: 'admin', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/:empresa/admin/administradores',
    name: 'admin.administradores',
    component: () => import('@/views/admin/AdministradoresView.vue'),
    props: true,
    meta: { contexto: 'admin', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/:empresa/admin/configuracoes',
    name: 'admin.configuracoes',
    component: () => import('@/views/admin/ConfiguracoesView.vue'),
    props: true,
    meta: { contexto: 'admin', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/:empresa/admin',
    redirect: (para) => ({ name: 'admin.funcionarios', params: { empresa: para.params.empresa } }),
  },

  // ---------- App do funcionário ----------
  {
    path: '/:empresa/entrar',
    name: 'entrar',
    component: () => import('@/views/LoginView.vue'),
    props: true,
    meta: { contexto: 'funcionario', somenteVisitante: true },
  },
  {
    path: '/:empresa/trocar-senha',
    name: 'trocar-senha',
    component: () => import('@/views/TrocarSenhaView.vue'),
    props: true,
    meta: { contexto: 'funcionario', exigeAutenticacao: true },
  },
  {
    path: '/:empresa/inicio',
    name: 'inicio',
    component: () => import('@/views/InicioView.vue'),
    props: true,
    meta: { contexto: 'funcionario', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
  },
  {
    path: '/:empresa/ponto',
    name: 'ponto',
    component: () => import('@/views/PontoView.vue'),
    props: true,
    meta: { contexto: 'funcionario', exigeAutenticacao: true, exigeSenhaDefinitiva: true },
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

/** Rota de login e de troca de senha de cada contexto. */
const destinos = {
  funcionario: { entrar: 'entrar', troca: 'trocar-senha', painel: 'inicio' },
  admin: { entrar: 'admin.entrar', troca: 'admin.trocar-senha', painel: 'admin.funcionarios' },
  superadmin: { entrar: 'central.entrar', troca: 'central.trocar-senha', painel: 'central.empresas' },
}

function storeDoContexto(contexto) {
  if (contexto === 'admin') return useAdminStore()
  if (contexto === 'superadmin') return useSuperadminStore()

  return useFuncionarioStore()
}

router.beforeEach((para) => {
  const contexto = para.meta.contexto

  if (!contexto) {
    return true
  }

  const store = storeDoContexto(contexto)
  const empresa = para.params.empresa ?? null
  const params = empresa ? { empresa } : {}

  // O contexto pode mudar entre navegações (outra empresa), então a sessão é
  // recarregada a cada passagem em vez de uma única vez no boot do app.
  store.restaurar(empresa)

  if (para.meta.exigeAutenticacao && !store.autenticado) {
    return { name: destinos[contexto].entrar, params }
  }

  // Enquanto a senha for provisória, o único destino permitido é a troca.
  if (para.meta.exigeSenhaDefinitiva && store.precisaTrocarSenha) {
    return { name: destinos[contexto].troca, params }
  }

  if (para.meta.somenteVisitante && store.autenticado) {
    return {
      name: store.precisaTrocarSenha ? destinos[contexto].troca : destinos[contexto].painel,
      params,
    }
  }

  return true
})

export default router
