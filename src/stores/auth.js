import { criarSessaoStore } from './criarSessaoStore'

/**
 * As três sessões do sistema. Cada uma guarda o token sob uma chave própria no
 * localStorage, então dá para estar logado como funcionário de uma empresa e
 * como administrador de outra no mesmo navegador.
 */

/** Funcionário: /api/{empresa}/... */
export const useFuncionarioStore = criarSessaoStore({
  id: 'sessaoFuncionario',
  escopo: 'funcionario',
  prefixoApi: (empresa) => `/${empresa}`,
})

/** Administrador da empresa: /api/{empresa}/admin/... */
export const useAdminStore = criarSessaoStore({
  id: 'sessaoAdmin',
  escopo: 'admin',
  prefixoApi: (empresa) => `/${empresa}/admin`,
})

/** Superadmin do SaaS: /api/central/... */
export const useSuperadminStore = criarSessaoStore({
  id: 'sessaoSuperadmin',
  escopo: 'superadmin',
  prefixoApi: () => '/central',
})
