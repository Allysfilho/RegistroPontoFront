<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { mensagemDeErro } from '@/services/http'

/**
 * Tela de login compartilhada pelos três contextos.
 *
 * O que muda entre funcionário, administrador e superadmin é só o rótulo do
 * campo de identificação e para onde ir depois — a mecânica é a mesma.
 */
const props = defineProps({
  store: { type: Object, required: true },
  titulo: { type: String, required: true },
  subtitulo: { type: String, default: '' },
  campo: { type: String, required: true },
  campoRotulo: { type: String, required: true },
  campoTipo: { type: String, default: 'text' },
  campoAutocomplete: { type: String, default: 'username' },
  contexto: { type: String, default: null },
  rotaPainel: { type: String, required: true },
  rotaTroca: { type: String, required: true },
  ajuda: { type: String, default: '' },
})

const router = useRouter()

const identificacao = ref('')
const senha = ref('')
const enviando = ref(false)
const erro = ref(null)

function params() {
  return props.contexto ? { empresa: props.contexto } : {}
}

async function entrar() {
  enviando.value = true
  erro.value = null

  try {
    const dados = await props.store.entrar(props.contexto, {
      [props.campo]: identificacao.value.trim(),
      senha: senha.value,
    })

    router.push({
      // A troca de senha vem antes de qualquer outra tela no primeiro acesso.
      name: dados.senha_provisoria ? props.rotaTroca : props.rotaPainel,
      params: params(),
    })
  } catch (e) {
    erro.value = e.response?.status === 404
      ? 'Empresa não encontrada. Confira o endereço.'
      : mensagemDeErro(e, 'Não foi possível entrar.')
    senha.value = ''
  } finally {
    enviando.value = false
  }
}
</script>

<template>
  <main class="pagina">
    <header class="cabecalho">
      <h1>{{ titulo }}</h1>
      <p v-if="subtitulo" class="subtitulo">{{ subtitulo }}</p>
    </header>

    <form class="cartao" novalidate @submit.prevent="entrar">
      <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>

      <label class="campo">
        <span class="campo__rotulo">{{ campoRotulo }}</span>
        <input
          v-model="identificacao"
          class="campo__entrada"
          :type="campoTipo"
          :autocomplete="campoAutocomplete"
          autocapitalize="none"
          autocorrect="off"
          required
          :disabled="enviando"
        />
      </label>

      <label class="campo">
        <span class="campo__rotulo">Senha</span>
        <input
          v-model="senha"
          class="campo__entrada"
          type="password"
          autocomplete="current-password"
          required
          :disabled="enviando"
        />
      </label>

      <button class="botao" type="submit" :disabled="enviando">
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>

      <p v-if="ajuda" class="campo__ajuda rodape">{{ ajuda }}</p>
    </form>
  </main>
</template>

<style scoped>
.cabecalho h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitulo {
  margin: 0.25rem 0 1.5rem;
  color: var(--cor-texto-suave);
}

.rodape {
  margin-top: 1rem;
  text-align: center;
}
</style>
