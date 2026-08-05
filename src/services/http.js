import axios from 'axios'

/**
 * Cliente HTTP único do app.
 *
 * A base vem do build (`VITE_API_BASE_URL`): em produção é relativa (`/api`),
 * porque o nginx que serve o SPA faz o proxy reverso para o backend.
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// O token é injetado por callback em vez de lido direto do store: assim este
// módulo não depende do Pinia e não cria import circular com o store de auth.
let obterToken = () => null
let aoPerderSessao = () => {}

export function configurarAutenticacao({ token, onSessaoExpirada }) {
  obterToken = token
  aoPerderSessao = onSessaoExpirada
}

http.interceptors.request.use((config) => {
  const token = obterToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

http.interceptors.response.use(
  (resposta) => resposta,
  (erro) => {
    // 401 aqui é token expirado ou revogado (a troca de senha revoga todos).
    if (erro.response?.status === 401) {
      aoPerderSessao()
    }

    return Promise.reject(erro)
  },
)

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

export default http
