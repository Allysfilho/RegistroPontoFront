<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import http, { mensagemDeErro } from '@/services/http'

const props = defineProps({
  empresa: { type: String, required: true },
})

const router = useRouter()
const auth = useAuthStore()

const carregando = ref(true)
const erro = ref(null)
const dados = ref(null)

onMounted(async () => {
  try {
    const resposta = await http.get(`/${props.empresa}/inicio`)
    dados.value = resposta.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar seus dados.')
  } finally {
    carregando.value = false
  }
})

async function sair() {
  await auth.sair()
  router.push({ name: 'entrar', params: { empresa: props.empresa } })
}
</script>

<template>
  <main class="pagina">
    <header class="cabecalho">
      <h1>Olá, {{ auth.funcionario?.nome }}</h1>
      <p class="subtitulo">{{ auth.empresa?.nome }}</p>
    </header>

    <section class="cartao">
      <p v-if="carregando">Carregando…</p>
      <p v-else-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>

      <template v-else>
        <dl class="meta">
          <div><dt>Identificador</dt><dd>{{ dados.funcionario.identificador }}</dd></div>
          <div><dt>Empresa</dt><dd>{{ dados.empresa.nome }}</dd></div>
        </dl>

        <p class="campo__ajuda">
          A tela de bater ponto entra na próxima fase.
        </p>
      </template>

      <button class="botao botao--secundario sair" type="button" @click="sair">
        Sair
      </button>
    </section>
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

.meta {
  margin: 0 0 1rem;
  display: grid;
  gap: 0.5rem;
  font-size: 0.95rem;
}

.meta div {
  display: flex;
  gap: 0.75rem;
}

.meta dt {
  min-width: 8rem;
  color: var(--cor-texto-suave);
}

.meta dd {
  margin: 0;
  font-weight: 600;
}

.sair {
  margin-top: 1.25rem;
}
</style>
