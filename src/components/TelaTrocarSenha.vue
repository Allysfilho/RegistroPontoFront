<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { mensagemDeErro } from '@/services/http'

/**
 * Troca de senha compartilhada pelos três contextos. Serve tanto para a troca
 * obrigatória do primeiro acesso quanto para a voluntária.
 */
const props = defineProps({
  store: { type: Object, required: true },
  contexto: { type: String, default: null },
  rotaPainel: { type: String, required: true },
  rotaEntrar: { type: String, required: true },
})

const router = useRouter()

const senhaAtual = ref('')
const senha = ref('')
const confirmacao = ref('')
const enviando = ref(false)
const erro = ref(null)

function params() {
  return props.contexto ? { empresa: props.contexto } : {}
}

async function trocar() {
  enviando.value = true
  erro.value = null

  try {
    await props.store.trocarSenha({
      senha_atual: senhaAtual.value,
      senha: senha.value,
      senha_confirmation: confirmacao.value,
    })

    router.push({ name: props.rotaPainel, params: params() })
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível alterar a senha.')
  } finally {
    enviando.value = false
  }
}

async function sair() {
  await props.store.sair()
  router.push({ name: props.rotaEntrar, params: params() })
}
</script>

<template>
  <main class="pagina">
    <header class="cabecalho">
      <h1>Definir nova senha</h1>
      <p class="subtitulo">{{ store.usuario?.nome }}</p>
    </header>

    <form class="cartao" novalidate @submit.prevent="trocar">
      <p v-if="store.senhaProvisoria" class="alerta alerta--aviso">
        Sua senha atual é provisória. Defina uma nova senha para usar o sistema.
      </p>

      <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>

      <label class="campo">
        <span class="campo__rotulo">Senha atual</span>
        <input
          v-model="senhaAtual"
          class="campo__entrada"
          type="password"
          autocomplete="current-password"
          required
          :disabled="enviando"
        />
      </label>

      <label class="campo">
        <span class="campo__rotulo">Nova senha</span>
        <input
          v-model="senha"
          class="campo__entrada"
          type="password"
          autocomplete="new-password"
          required
          :disabled="enviando"
        />
        <span class="campo__ajuda">Mínimo de 8 caracteres.</span>
      </label>

      <label class="campo">
        <span class="campo__rotulo">Confirme a nova senha</span>
        <input
          v-model="confirmacao"
          class="campo__entrada"
          type="password"
          autocomplete="new-password"
          required
          :disabled="enviando"
        />
      </label>

      <button class="botao" type="submit" :disabled="enviando">
        {{ enviando ? 'Salvando…' : 'Salvar nova senha' }}
      </button>

      <button class="botao botao--secundario sair" type="button" @click="sair">
        Sair
      </button>
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

.sair {
  margin-top: 0.75rem;
}
</style>
