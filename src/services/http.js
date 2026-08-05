import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Cliente para chamadas públicas (health check, por exemplo).
 */
const http = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

/**
 * Cria um cliente autenticado próprio.
 *
 * Cada contexto (funcionário, administrador, superadmin) recebe a própria
 * instância em vez de compartilharem um interceptor global: os três podem estar
 * logados ao mesmo tempo no navegador, e um token só vale no contexto onde foi
 * emitido — misturá-los daria 401 silencioso e difícil de rastrear.
 */
export function criarClienteAutenticado({ obterToken, aoPerderSessao }) {
  const cliente = axios.create({
    baseURL: BASE_URL,
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })

  cliente.interceptors.request.use((config) => {
    const token = obterToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  })

  cliente.interceptors.response.use(
    (resposta) => resposta,
    (erro) => {
      // 401 aqui é token expirado ou revogado (trocar a senha revoga todos).
      if (erro.response?.status === 401) {
        aoPerderSessao?.()
      }

      return Promise.reject(erro)
    },
  )

  return cliente
}

/**
 * Extrai a mensagem de erro mais útil de uma resposta do Laravel.
 */
export function mensagemDeErro(erro, padrao = 'Não foi possível concluir a operação.') {
  const dados = erro.response?.data

  if (dados?.errors) {
    const primeiro = Object.values(dados.errors)[0]

    if (Array.isArray(primeiro) && primeiro.length) {
      return primeiro[0]
    }
  }

  return dados?.message || erro.message || padrao
}

/**
 * Erros de validação por campo, para destacar as entradas com problema.
 */
export function errosPorCampo(erro) {
  const errors = erro.response?.data?.errors ?? {}

  return Object.fromEntries(
    Object.entries(errors).map(([campo, mensagens]) => [campo, mensagens[0]]),
  )
}

export default http
