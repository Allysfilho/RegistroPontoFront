import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import http, { configurarAutenticacao } from '@/services/http'

/**
 * Sessão do funcionário.
 *
 * O token é guardado por empresa (`empresa_slug` na chave): quem opera em mais
 * de uma empresa no mesmo aparelho não sobrescreve a sessão da outra — e um
 * token só vale no schema onde foi emitido, então misturá-los daria 401.
 */
function chaveDeArmazenamento(slug) {
  return `registro-ponto:sessao:${slug}`
}

export const useAuthStore = defineStore('auth', () => {
  const empresaSlug = ref(null)
  const token = ref(null)
  const funcionario = ref(null)
  const empresa = ref(null)
  const senhaProvisoria = ref(false)

  const autenticado = computed(() => Boolean(token.value))
  const precisaTrocarSenha = computed(() => autenticado.value && senhaProvisoria.value)

  function aplicar(slug, dados) {
    empresaSlug.value = slug
    token.value = dados.token
    funcionario.value = dados.usuario
    empresa.value = dados.usuario?.empresa ?? null
    senhaProvisoria.value = Boolean(dados.senha_provisoria)

    localStorage.setItem(
      chaveDeArmazenamento(slug),
      JSON.stringify({
        token: token.value,
        usuario: funcionario.value,
        senha_provisoria: senhaProvisoria.value,
      }),
    )
  }

  function limpar() {
    if (empresaSlug.value) {
      localStorage.removeItem(chaveDeArmazenamento(empresaSlug.value))
    }

    token.value = null
    funcionario.value = null
    empresa.value = null
    senhaProvisoria.value = false
  }

  /**
   * Recarrega a sessão salva para uma empresa. Chamado pelo guard do router a
   * cada navegação, porque o slug pode mudar de uma rota para outra.
   */
  function restaurar(slug) {
    if (empresaSlug.value === slug && token.value) {
      return
    }

    empresaSlug.value = slug

    const salvo = localStorage.getItem(chaveDeArmazenamento(slug))

    if (!salvo) {
      token.value = null
      funcionario.value = null
      empresa.value = null
      senhaProvisoria.value = false

      return
    }

    try {
      const dados = JSON.parse(salvo)

      token.value = dados.token
      funcionario.value = dados.usuario
      empresa.value = dados.usuario?.empresa ?? null
      senhaProvisoria.value = Boolean(dados.senha_provisoria)
    } catch {
      localStorage.removeItem(chaveDeArmazenamento(slug))
    }
  }

  async function entrar(slug, credenciais) {
    const { data } = await http.post(`/${slug}/entrar`, credenciais)

    aplicar(slug, data)

    return data
  }

  async function trocarSenha(payload) {
    const { data } = await http.post(`/${empresaSlug.value}/trocar-senha`, payload)

    // A troca revoga todos os tokens e devolve um novo: sem atualizar aqui, a
    // próxima requisição sairia com um token já morto.
    token.value = data.token
    senhaProvisoria.value = false

    localStorage.setItem(
      chaveDeArmazenamento(empresaSlug.value),
      JSON.stringify({
        token: token.value,
        usuario: funcionario.value,
        senha_provisoria: false,
      }),
    )

    return data
  }

  async function sair() {
    try {
      await http.post(`/${empresaSlug.value}/sair`)
    } catch {
      // Token já inválido no servidor: encerrar localmente é suficiente.
    } finally {
      limpar()
    }
  }

  configurarAutenticacao({
    token: () => token.value,
    onSessaoExpirada: limpar,
  })

  return {
    empresaSlug,
    token,
    funcionario,
    empresa,
    senhaProvisoria,
    autenticado,
    precisaTrocarSenha,
    restaurar,
    entrar,
    trocarSenha,
    sair,
    limpar,
  }
})
