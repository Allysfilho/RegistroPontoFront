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

const identificador = ref('')
const senha = ref('')
const enviando = ref(false)
const erro = ref(null)

async function entrar() {
  enviando.value = true
  erro.value = null

  try {
    const dados = await auth.entrar(props.empresa, {
      identificador: identificador.value.trim(),
      senha: senha.value,
    })

    router.push({
      // A troca de senha vem antes de qualquer outra tela no primeiro acesso.
      name: dados.senha_provisoria ? 'trocar-senha' : 'inicio',
      params: { empresa: props.empresa },
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
      <h1>Registro de Ponto</h1>
      <p class="subtitulo">{{ empresa }}</p>
    </header>

    <form class="cartao" novalidate @submit.prevent="entrar">
      <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>

      <label class="campo">
        <span class="campo__rotulo">Matrícula, CPF ou identificador</span>
        <input
          v-model="identificador"
          class="campo__entrada"
          type="text"
          name="identificador"
          autocomplete="username"
          inputmode="text"
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
          name="senha"
          autocomplete="current-password"
          required
          :disabled="enviando"
        />
      </label>

      <button class="botao" type="submit" :disabled="enviando">
        {{ enviando ? 'Entrando…' : 'Entrar' }}
      </button>

      <p class="campo__ajuda rodape">
        Esqueceu a senha? Procure um administrador da sua empresa para gerar uma
        nova senha provisória.
      </p>
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
