<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mensagemDeErro } from '@/services/http'
import { dataHora } from '@/services/formato'
import { useFuncionarioStore } from '@/stores/auth'

const props = defineProps({
  empresa: { type: String, required: true },
})

const router = useRouter()
const store = useFuncionarioStore()

const solicitacoes = ref([])
const carregando = ref(true)
const erro = ref(null)

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get(`/${props.empresa}/solicitacoes`)
    solicitacoes.value = data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar suas solicitações.')
  } finally {
    carregando.value = false
  }
}

async function sair() {
  await store.sair()
  router.push({ name: 'entrar', params: { empresa: props.empresa } })
}

onMounted(carregar)
</script>

<template>
  <main class="pagina">
    <header class="cabecalho">
      <h1>Minhas solicitações</h1>
      <p class="subtitulo">{{ store.usuario?.nome }}</p>
    </header>

    <nav class="atalhos">
      <RouterLink class="botao botao--secundario botao--compacto" :to="{ name: 'registros', params: { empresa } }">
        Meus registros
      </RouterLink>
    </nav>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <p v-else-if="!solicitacoes.length" class="vazio">
      Você ainda não abriu nenhuma solicitação de ajuste. Elas são criadas na
      tela de registros.
    </p>

    <ul v-else class="lista">
      <li v-for="item in solicitacoes" :key="item.id" class="cartao">
        <div class="topo">
          <span class="etiqueta" :class="`etiqueta--${item.status}`">
            {{ item.status_rotulo }}
          </span>
          <span class="data">{{ dataHora(item.criada_em) }}</span>
        </div>

        <p v-if="item.registro" class="referencia">
          Marcação de {{ dataHora(item.registro.registrado_em) }}
          — {{ item.registro.tipo_rotulo }}, NSR {{ item.registro.nsr }}
        </p>
        <p v-else class="referencia">Marcação esquecida (sem registro vinculado)</p>

        <p class="motivo">{{ item.motivo }}</p>

        <div v-if="item.respondida_em" class="resposta">
          <strong>Resposta em {{ dataHora(item.respondida_em) }}</strong>
          <p v-if="item.resposta">{{ item.resposta }}</p>
          <p v-else class="campo__ajuda">Sem observações do administrador.</p>
        </div>
      </li>
    </ul>

    <button class="botao botao--secundario sair" type="button" @click="sair">Sair</button>
  </main>
</template>

<style scoped>
.cabecalho h1 {
  margin: 0;
  font-size: 1.5rem;
}

.subtitulo {
  margin: 0.25rem 0 1rem;
  color: var(--cor-texto-suave);
}

.atalhos {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.data {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--cor-texto-suave);
}

.etiqueta--aprovado {
  color: var(--cor-sucesso);
  background: var(--cor-sucesso-fundo);
  border-color: var(--cor-sucesso);
}

.etiqueta--rejeitado {
  color: var(--cor-erro);
  background: var(--cor-erro-fundo);
  border-color: var(--cor-erro);
}

.referencia {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: var(--cor-texto-suave);
}

.motivo {
  margin: 0;
  white-space: pre-wrap;
}

.resposta {
  margin-top: 0.9rem;
  padding-top: 0.9rem;
  border-top: 1px solid var(--cor-borda);
  font-size: 0.9rem;
}

.resposta p {
  margin: 0.35rem 0 0;
  white-space: pre-wrap;
}

.vazio {
  color: var(--cor-texto-suave);
}

.sair {
  margin-top: 1.5rem;
}
</style>
