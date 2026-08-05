<script setup>
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { mensagemDeErro } from '@/services/http'
import { obterPosicao } from '@/services/geolocalizacao'
import { abrirCamera, capturarQuadro, fecharCamera } from '@/services/camera'
import { useFuncionarioStore } from '@/stores/auth'

const props = defineProps({
  empresa: { type: String, required: true },
})

const router = useRouter()
const store = useFuncionarioStore()

const video = useTemplateRef('video')

const requisitos = ref(null)
const carregando = ref(true)
const erro = ref(null)

const stream = ref(null)
const cameraLigada = ref(false)
const foto = ref(null)

const posicao = ref(null)
const localizacao = ref(null)
const verificando = ref(false)

const enviando = ref(false)
const comprovante = ref(null)

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

async function ligarCamera() {
  erro.value = null

  try {
    stream.value = await abrirCamera()
    cameraLigada.value = true

    // O elemento <video> só existe depois que cameraLigada vira true.
    await new Promise((resolve) => setTimeout(resolve, 0))

    video.value.srcObject = stream.value
    await video.value.play()
  } catch (e) {
    erro.value = e.message
    cameraLigada.value = false
  }
}

function desligarCamera() {
  fecharCamera(stream.value)
  stream.value = null
  cameraLigada.value = false
}

async function tirarFoto() {
  erro.value = null

  try {
    const capturada = await capturarQuadro(video.value)

    descartarPreview()
    foto.value = capturada

    // Segurar a câmera aberta depois da captura mantém o LED aceso e drena
    // bateria à toa.
    desligarCamera()
  } catch (e) {
    erro.value = e.message
  }
}

function descartarPreview() {
  if (foto.value) {
    URL.revokeObjectURL(foto.value.url)
    foto.value = null
  }
}

async function refazerFoto() {
  descartarPreview()
  await ligarCamera()
}

async function verificarLocalizacao() {
  verificando.value = true
  erro.value = null
  localizacao.value = null
  posicao.value = null

  try {
    if (requisitos.value.exige_geolocalizacao) {
      posicao.value = await obterPosicao()
    }

    const { data } = await store.api.post(`/${props.empresa}/ponto/verificar-localizacao`, {
      latitude: posicao.value?.latitude ?? null,
      longitude: posicao.value?.longitude ?? null,
    })

    localizacao.value = data
  } catch (e) {
    erro.value = e.response ? mensagemDeErro(e) : e.message
  } finally {
    verificando.value = false
  }
}

async function registrar() {
  enviando.value = true
  erro.value = null

  try {
    // A posição é lida de novo no envio: entre a checagem prévia e a
    // confirmação a pessoa pode ter se deslocado.
    if (requisitos.value.exige_geolocalizacao) {
      posicao.value = await obterPosicao()
    }

    const corpo = new FormData()
    corpo.append('foto', foto.value.blob, 'ponto.jpg')

    if (posicao.value) {
      corpo.append('latitude', posicao.value.latitude)
      corpo.append('longitude', posicao.value.longitude)
    }

    const { data } = await store.api.post(`/${props.empresa}/ponto`, corpo)

    comprovante.value = data.data
    descartarPreview()
    localizacao.value = null
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível registrar o ponto.')
  } finally {
    enviando.value = false
  }
}

async function baterOutro() {
  comprovante.value = null
  await carregarRequisitos()
}

function formatarInstante(iso) {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

async function sair() {
  desligarCamera()
  await store.sair()
  router.push({ name: 'entrar', params: { empresa: props.empresa } })
}

onMounted(carregarRequisitos)
onBeforeUnmount(() => {
  desligarCamera()
  descartarPreview()
})
</script>

<template>
  <main class="pagina">
    <header class="cabecalho">
      <h1>Bater ponto</h1>
      <p class="subtitulo">{{ store.usuario?.nome }}</p>
    </header>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <!-- Comprovante da batida -->
    <section v-else-if="comprovante" class="cartao">
      <p class="alerta alerta--sucesso" role="status">
        {{ comprovante.tipo_rotulo }} registrada.
      </p>

      <dl class="meta">
        <div><dt>NSR</dt><dd class="destaque">{{ comprovante.nsr }}</dd></div>
        <div><dt>Registrado em</dt><dd>{{ formatarInstante(comprovante.registrado_em) }}</dd></div>
        <div v-if="comprovante.distancia_metros !== null">
          <dt>Distância do local</dt><dd>{{ comprovante.distancia_metros }} m</dd>
        </div>
      </dl>

      <p class="campo__ajuda">
        Este registro não pode ser alterado nem apagado. Se algo estiver errado,
        abra uma solicitação de ajuste com um administrador.
      </p>

      <button class="botao" type="button" @click="baterOutro">Bater outro ponto</button>
    </section>

    <template v-else-if="requisitos">
      <p class="proximo">
        Próxima marcação: <strong>{{ requisitos.proximo_tipo_rotulo }}</strong>
      </p>

      <!-- Passo 1: foto -->
      <section class="cartao">
        <h2>1. Foto</h2>

        <div v-if="foto" class="midia">
          <img :src="foto.url" alt="Foto capturada" class="midia__imagem" />
        </div>

        <div v-else-if="cameraLigada" class="midia">
          <!-- Espelhado só no preview; a imagem gravada não é. -->
          <video ref="video" class="midia__video" playsinline muted></video>
        </div>

        <p v-else class="campo__ajuda">
          A foto é guardada como evidência da marcação. Nesta versão ela não é
          comparada com nada.
        </p>

        <div class="acoes">
          <button v-if="!cameraLigada && !foto" class="botao" type="button" @click="ligarCamera">
            Abrir câmera
          </button>
          <button v-if="cameraLigada" class="botao" type="button" @click="tirarFoto">
            Tirar foto
          </button>
          <button v-if="foto" class="botao botao--secundario" type="button" @click="refazerFoto">
            Refazer foto
          </button>
        </div>
      </section>

      <!-- Passo 2: localização -->
      <section class="cartao">
        <h2>2. Localização</h2>

        <p v-if="!requisitos.exige_geolocalizacao" class="campo__ajuda">
          Sua empresa não exige localização para o registro de ponto.
        </p>

        <template v-else>
          <p class="campo__ajuda">Você precisa estar em um dos locais autorizados:</p>

          <ul v-if="requisitos.locais.length" class="locais">
            <li v-for="local in requisitos.locais" :key="local.nome">
              {{ local.nome }} <span class="raio">raio de {{ local.raio_metros }} m</span>
            </li>
          </ul>

          <p v-else class="alerta alerta--aviso">
            Sua empresa exige localização mas não cadastrou nenhum local.
            Procure um administrador.
          </p>

          <button
            class="botao botao--secundario"
            type="button"
            :disabled="verificando"
            @click="verificarLocalizacao"
          >
            {{ verificando ? 'Verificando…' : 'Verificar minha localização' }}
          </button>
        </template>

        <template v-if="localizacao">
          <p
            class="alerta resultado"
            :class="localizacao.permitido ? 'alerta--sucesso' : 'alerta--erro'"
            role="status"
          >
            {{ localizacao.permitido ? 'Localização autorizada.' : localizacao.motivo }}
          </p>

          <dl v-if="localizacao.local" class="meta">
            <div><dt>Local mais próximo</dt><dd>{{ localizacao.local.nome }}</dd></div>
            <div><dt>Distância</dt><dd>{{ localizacao.distancia_metros }} m</dd></div>
          </dl>

          <dl v-if="posicao" class="meta">
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
        </template>
      </section>

      <!-- Passo 3: registrar -->
      <section class="cartao">
        <h2>3. Registrar</h2>

        <p v-if="!foto" class="campo__ajuda">Tire a foto antes de registrar.</p>

        <button class="botao" type="button" :disabled="!foto || enviando" @click="registrar">
          {{ enviando ? 'Registrando…' : `Registrar ${requisitos.proximo_tipo_rotulo.toLowerCase()}` }}
        </button>

        <p class="campo__ajuda aviso">
          A posição é conferida novamente pelo servidor no momento do registro.
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
  margin: 0.25rem 0 1rem;
  color: var(--cor-texto-suave);
}

.proximo {
  margin: 0 0 1rem;
  font-size: 0.95rem;
}

.cartao {
  margin-bottom: 1rem;
}

.cartao h2 {
  margin: 0 0 0.75rem;
  font-size: 1.05rem;
}

.midia {
  margin-bottom: 1rem;
  border-radius: 0.6rem;
  overflow: hidden;
  background: #000;
  aspect-ratio: 4 / 3;
}

.midia__video,
.midia__imagem {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* Preview espelhado: a pessoa se enxerga como num espelho. */
.midia__video {
  transform: scaleX(-1);
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.acoes .botao {
  flex: 1 1 10rem;
}

.locais {
  list-style: none;
  margin: 0.5rem 0 1rem;
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
  margin: 0 0 0.5rem;
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

.destaque {
  font-family: ui-monospace, Consolas, monospace;
  font-size: 1.15rem;
  font-weight: 600;
}

.impreciso {
  color: var(--cor-aviso);
}

.aviso {
  margin-top: 0.75rem;
}

.sair {
  margin-top: 0.5rem;
}
</style>
