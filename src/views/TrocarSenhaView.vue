<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { mensagemDeErro } from '@/services/http'

const props = defineProps({
  empresa: { type: String, required: true },
})

const router = useRouter()
const auth = useAuthStore()

const senhaAtual = ref('')
const senha = ref('')
const confirmacao = ref('')
const enviando = ref(false)
const erro = ref(null)

async function trocar() {
  enviando.value = true
  erro.value = null

  try {
    await auth.trocarSenha({
      senha_atual: senhaAtual.value,
      senha: senha.value,
      senha_confirmation: confirmacao.value,
    })

    router.push({ name: 'inicio', params: { empresa: props.empresa } })
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível alterar a senha.')
  } finally {
    enviando.value = false
  }
}

async function sair() {
  await auth.sair()
  router.push({ name: 'entrar', params: { empresa: props.empresa } })
}
</script>

<template>
  <main class="pagina">
    <header class="cabecalho">
      <h1>Definir nova senha</h1>
      <p class="subtitulo">{{ auth.funcionario?.nome }}</p>
    </header>

    <form class="cartao" novalidate @submit.prevent="trocar">
      <p v-if="auth.senhaProvisoria" class="alerta alerta--aviso">
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
