import { computed, markRaw, ref } from 'vue'
import { defineStore } from 'pinia'
import { criarClienteAutenticado } from '@/services/http'

/**
 * Fábrica das três sessões do sistema: funcionário, administrador e superadmin.
 *
 * Os três fluxos são iguais na mecânica — entrar, guardar o token, obrigar a
 * troca de senha provisória, sair — e diferem só no prefixo da API e no rótulo
 * do campo de identificação. Um único lugar evita que divirjam com o tempo.
 *
 * @param {object} opcoes
 * @param {string} opcoes.id            Nome do store no Pinia.
 * @param {string} opcoes.escopo        Prefixo da chave no localStorage.
 * @param {(ctx: string|null) => string} opcoes.prefixoApi
 *        Monta o prefixo da API a partir do contexto (slug da empresa, ou null
 *        no painel central).
 */
export function criarSessaoStore({ id, escopo, prefixoApi }) {
  function chave(contexto) {
    return `registro-ponto:${escopo}:${contexto ?? 'central'}`
  }

  return defineStore(id, () => {
    // Slug da empresa para funcionário/administrador; null no painel central.
    const contexto = ref(null)
    const token = ref(null)
    const usuario = ref(null)
    const senhaProvisoria = ref(false)
    const carregado = ref(false)

    const autenticado = computed(() => Boolean(token.value))
    const precisaTrocarSenha = computed(() => autenticado.value && senhaProvisoria.value)

    const cliente = criarClienteAutenticado({
      obterToken: () => token.value,
      aoPerderSessao: () => limpar(),
    })

    /*
     * Fachada em vez do cliente axios cru.
     *
     * O Pinia trata QUALQUER função devolvida pelo setup como action e a
     * embrulha; uma instância do axios é uma função, então devolvê-la direto
     * faria `store.api` virar o wrapper do Pinia, sem `.get`/`.post`.
     * O objeto simples escapa dessa regra, e o markRaw evita que o Vue ainda
     * o transforme em proxy reativo à toa.
     */
    const api = markRaw({
      get: (caminho, config) => cliente.get(caminho, config),
      post: (caminho, dados, config) => cliente.post(caminho, dados, config),
      put: (caminho, dados, config) => cliente.put(caminho, dados, config),
      patch: (caminho, dados, config) => cliente.patch(caminho, dados, config),
      delete: (caminho, config) => cliente.delete(caminho, config),
    })

    function url(caminho) {
      return `${prefixoApi(contexto.value)}${caminho}`
    }

    function persistir() {
      localStorage.setItem(
        chave(contexto.value),
        JSON.stringify({
          token: token.value,
          usuario: usuario.value,
          senha_provisoria: senhaProvisoria.value,
        }),
      )
    }

    function limpar() {
      localStorage.removeItem(chave(contexto.value))

      token.value = null
      usuario.value = null
      senhaProvisoria.value = false
    }

    /**
     * Recarrega a sessão salva. Chamado pelo guard do router a cada navegação,
     * porque o contexto pode mudar de uma rota para outra.
     */
    function restaurar(novoContexto = null) {
      if (carregado.value && contexto.value === novoContexto) {
        return
      }

      contexto.value = novoContexto
      carregado.value = true

      const salvo = localStorage.getItem(chave(novoContexto))

      if (!salvo) {
        token.value = null
        usuario.value = null
        senhaProvisoria.value = false

        return
      }

      try {
        const dados = JSON.parse(salvo)

        token.value = dados.token
        usuario.value = dados.usuario
        senhaProvisoria.value = Boolean(dados.senha_provisoria)
      } catch {
        localStorage.removeItem(chave(novoContexto))
      }
    }

    async function entrar(novoContexto, credenciais) {
      contexto.value = novoContexto
      carregado.value = true

      const { data } = await api.post(url('/entrar'), credenciais)

      token.value = data.token
      usuario.value = data.usuario
      senhaProvisoria.value = Boolean(data.senha_provisoria)
      persistir()

      return data
    }

    async function trocarSenha(payload) {
      const { data } = await api.post(url('/trocar-senha'), payload)

      // A troca revoga todos os tokens e devolve um novo: sem atualizar aqui,
      // a próxima requisição sairia com um token já morto.
      token.value = data.token
      senhaProvisoria.value = false
      persistir()

      return data
    }

    async function sair() {
      try {
        await api.post(url('/sair'))
      } catch {
        // Token já inválido no servidor: encerrar localmente basta.
      } finally {
        limpar()
      }
    }

    return {
      api,
      url,
      contexto,
      token,
      usuario,
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
}
