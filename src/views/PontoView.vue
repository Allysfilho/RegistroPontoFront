<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { mensagemDeErro } from '@/services/http'
import { obterPosicao } from '@/services/geolocalizacao'
import { useFuncionarioStore } from '@/stores/auth'

const props = defineProps({
  empresa: { type: String, required: true },
})

const router = useRouter()
const store = useFuncionarioStore()

const requisitos = ref(null)
const carregando = ref(true)
const erro = ref(null)

const verificando = ref(false)
const posicao = ref(null)
const resultado = ref(null)

async function carregarRequisitos() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get(`/${props.empresa}/ponto/requisitos`)
    requisitos.value = data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar os dados do ponto.')
  } finally {
    carregando.value = false
  }
}

async function verificarLocalizacao() {
  verificando.value = true
  erro.value = null
  resultado.value = null
  posicao.value = null

  try {
    if (requisitos.value.exige_geolocalizacao) {
      posicao.value = await obterPosicao()
    }

    // Quem decide é o servidor: o cálculo aqui seria só sugestão, e o cliente
    // não é confiável para autorizar a própria batida.
    const { data } = await store.api.post(`/${props.empresa}/ponto/verificar-localizacao`, {
      latitude: posicao.value?.latitude ?? null,
      longitude: posicao.value?.longitude ?? null,
    })

    resultado.value = data
  } catch (e) {
    erro.value = e.response ? mensagemDeErro(e) : e.message
  } finally {
    verificando.value = false
  }
}

async function sair() {
  await store.sair()
  router.push({ name: 'entrar', params: { empresa: props.empresa } })
}

onMounted(carregarRequisitos)
</script>

<template>
  <main class="pagina">
    <header class="cabecalho">
      <h1>Bater ponto</h1>
      <p class="subtitulo">{{ store.usuario?.nome }}</p>
    </header>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <template v-else-if="requisitos">
      <section class="cartao">
        <h2>Localização</h2>

        <p v-if="!requisitos.exige_geolocalizacao" class="dispensada">
          Sua empresa não exige localização para o registro de ponto.
        </p>

        <template v-else>
          <p class="campo__ajuda">
            Você precisa estar em um dos locais autorizados:
          </p>

          <ul v-if="requisitos.locais.length" class="locais">
            <li v-for="local in requisitos.locais" :key="local.nome">
              {{ local.nome }} <span class="raio">raio de {{ local.raio_metros }} m</span>
            </li>
          </ul>

          <p v-else class="alerta alerta--aviso">
            Sua empresa exige localização mas não cadastrou nenhum local.
            Procure um administrador.
          </p>
        </template>

        <button class="botao" type="button" :disabled="verificando" @click="verificarLocalizacao">
          {{ verificando ? 'Verificando…' : 'Verificar minha localização' }}
        </button>
      </section>

      <section v-if="resultado" class="cartao resultado">
        <p
          class="alerta"
          :class="resultado.permitido ? 'alerta--sucesso' : 'alerta--erro'"
          role="status"
        >
          {{
            resultado.permitido
              ? 'Localização autorizada para bater o ponto.'
              : resultado.motivo
          }}
        </p>

        <dl v-if="resultado.local" class="meta">
          <div><dt>Local mais próximo</dt><dd>{{ resultado.local.nome }}</dd></div>
          <div><dt>Distância</dt><dd>{{ resultado.distancia_metros }} m</dd></div>
          <div><dt>Raio permitido</dt><dd>{{ resultado.local.raio_metros }} m</dd></div>
        </dl>

        <dl v-if="posicao" class="meta">
          <div>
            <dt>Sua posição</dt>
            <dd>{{ posicao.latitude.toFixed(6) }}, {{ posicao.longitude.toFixed(6) }}</dd>
          </div>
          <div>
            <dt>Precisão do GPS</dt>
            <dd>
              ± {{ Math.round(posicao.precisao) }} m
              <span v-if="posicao.precisao > 100" class="impreciso">
                — leitura imprecisa, prefira ficar a céu aberto
              </span>
            </dd>
          </div>
        </dl>

        <p class="campo__ajuda">
          A captura da foto e o registro em si entram na próxima fase.
        </p>
      </section>
    </template>

    <button class="botao botao--secundario sair" type="button" @click="sair">Sair</button>
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

.cartao h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
}

.dispensada {
  margin: 0 0 1.25rem;
  color: var(--cor-texto-suave);
  font-size: 0.9rem;
}

.locais {
  list-style: none;
  margin: 0.5rem 0 1.25rem;
  padding: 0;
  display: grid;
  gap: 0.4rem;
  font-size: 0.9rem;
}

.raio {
  color: var(--cor-texto-suave);
  font-size: 0.85rem;
}

.resultado {
  margin-top: 1rem;
}

.meta {
  margin: 0 0 1rem;
  display: grid;
  gap: 0.35rem;
  font-size: 0.9rem;
}

.meta div {
  display: flex;
  gap: 0.6rem;
}

.meta dt {
  min-width: 9rem;
  color: var(--cor-texto-suave);
}

.meta dd {
  margin: 0;
  word-break: break-word;
}

.impreciso {
  color: var(--cor-aviso);
}

.sair {
  margin-top: 1.5rem;
}
</style>
