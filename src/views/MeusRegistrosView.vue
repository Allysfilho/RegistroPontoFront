<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ModalFormulario from '@/components/ModalFormulario.vue'
import { mensagemDeErro } from '@/services/http'
import { chaveDoDia, competenciaAtual, competenciasRecentes, diaPorExtenso, hora } from '@/services/formato'
import { useFuncionarioStore } from '@/stores/auth'

const props = defineProps({
  empresa: { type: String, required: true },
})

const router = useRouter()
const store = useFuncionarioStore()

const competencia = ref(competenciaAtual())
const competencias = competenciasRecentes()

const registros = ref([])
const carregando = ref(true)
const erro = ref(null)

const fotoAberta = ref(null)

const ajuste = ref({ aberto: false, registro: null, motivo: '', enviando: false, erro: null })
const sucesso = ref(null)

/** Agrupa por dia para o extrato ficar legível. */
const porDia = computed(() => {
  const grupos = new Map()

  for (const registro of registros.value) {
    const dia = chaveDoDia(registro.registrado_em)

    if (!grupos.has(dia)) {
      grupos.set(dia, { dia, rotulo: diaPorExtenso(registro.registrado_em), itens: [] })
    }

    grupos.get(dia).itens.push(registro)
  }

  return [...grupos.values()]
})

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get(`/${props.empresa}/registros`, {
      params: { competencia: competencia.value },
    })
    registros.value = data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar seus registros.')
  } finally {
    carregando.value = false
  }
}

/**
 * A foto é dado pessoal e vem por rota autenticada, não por URL pública — daí
 * buscá-la como blob em vez de apontar o <img> direto para a API.
 */
async function abrirFoto(registro) {
  erro.value = null

  try {
    const { data } = await store.api.get(`/${props.empresa}/registros/${registro.id}/foto`, {
      responseType: 'blob',
    })

    fotoAberta.value = { registro, url: URL.createObjectURL(data) }
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar a foto.')
  }
}

function fecharFoto() {
  if (fotoAberta.value) {
    URL.revokeObjectURL(fotoAberta.value.url)
    fotoAberta.value = null
  }
}

function abrirAjuste(registro) {
  ajuste.value = { aberto: true, registro, motivo: '', enviando: false, erro: null }
}

async function enviarAjuste() {
  ajuste.value.enviando = true
  ajuste.value.erro = null

  try {
    await store.api.post(`/${props.empresa}/solicitacoes`, {
      registro_ponto_id: ajuste.value.registro?.id ?? null,
      motivo: ajuste.value.motivo.trim(),
    })

    ajuste.value.aberto = false
    sucesso.value = 'Solicitação enviada. Um administrador vai analisar.'
  } catch (e) {
    ajuste.value.erro = mensagemDeErro(e)
  } finally {
    ajuste.value.enviando = false
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
      <h1>Meus registros</h1>
      <p class="subtitulo">{{ store.usuario?.nome }}</p>
    </header>

    <nav class="atalhos">
      <RouterLink class="botao botao--secundario botao--compacto" :to="{ name: 'ponto', params: { empresa } }">
        Bater ponto
      </RouterLink>
      <RouterLink class="botao botao--secundario botao--compacto" :to="{ name: 'solicitacoes', params: { empresa } }">
        Minhas solicitações
      </RouterLink>
    </nav>

    <label class="campo">
      <span class="campo__rotulo">Mês</span>
      <select v-model="competencia" class="campo__entrada" @change="carregar">
        <option v-for="opcao in competencias" :key="opcao.valor" :value="opcao.valor">
          {{ opcao.rotulo }}
        </option>
      </select>
    </label>

    <p v-if="sucesso" class="alerta alerta--sucesso" role="status">{{ sucesso }}</p>
    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <template v-else>
      <p v-if="!registros.length" class="vazio">Nenhum registro neste mês.</p>

      <section v-for="grupo in porDia" :key="grupo.dia" class="dia">
        <h2 class="dia__titulo">{{ grupo.rotulo }}</h2>

        <ul class="marcacoes">
          <li v-for="registro in grupo.itens" :key="registro.id" class="cartao marcacao">
            <div class="marcacao__linha">
              <strong class="marcacao__hora">{{ hora(registro.registrado_em) }}</strong>
              <span class="etiqueta" :class="`etiqueta--${registro.tipo}`">
                {{ registro.tipo_rotulo }}
              </span>
              <span class="marcacao__nsr">NSR {{ registro.nsr }}</span>
            </div>

            <p v-if="registro.endereco_legivel" class="marcacao__endereco">
              {{ registro.endereco_legivel }}
            </p>
            <p v-else-if="registro.distancia_metros !== null" class="marcacao__endereco">
              a {{ registro.distancia_metros }} m do local autorizado
            </p>

            <div class="marcacao__acoes">
              <button class="botao botao--secundario botao--compacto" type="button" @click="abrirFoto(registro)">
                Ver foto
              </button>
              <button class="botao botao--secundario botao--compacto" type="button" @click="abrirAjuste(registro)">
                Solicitar ajuste
              </button>
            </div>
          </li>
        </ul>
      </section>

      <button class="botao botao--secundario" type="button" @click="abrirAjuste(null)">
        Solicitar ajuste de marcação esquecida
      </button>
    </template>

    <button class="botao botao--secundario sair" type="button" @click="sair">Sair</button>

    <!-- Foto de evidência -->
    <div v-if="fotoAberta" class="fundo" @click.self="fecharFoto">
      <div class="visor">
        <img :src="fotoAberta.url" :alt="`Foto do NSR ${fotoAberta.registro.nsr}`" class="visor__imagem" />
        <button class="botao" type="button" @click="fecharFoto">Fechar</button>
      </div>
    </div>

    <ModalFormulario
      v-if="ajuste.aberto"
      titulo="Solicitar ajuste"
      rotulo-confirmar="Enviar solicitação"
      :enviando="ajuste.enviando"
      :erro="ajuste.erro"
      @fechar="ajuste.aberto = false"
      @confirmar="enviarAjuste"
    >
      <p v-if="ajuste.registro" class="campo__ajuda referencia">
        Referente à marcação de {{ hora(ajuste.registro.registrado_em) }}
        ({{ ajuste.registro.tipo_rotulo }}, NSR {{ ajuste.registro.nsr }}).
      </p>
      <p v-else class="campo__ajuda referencia">
        Sem marcação vinculada — use para relatar um ponto que você esqueceu de bater.
      </p>

      <label class="campo">
        <span class="campo__rotulo">Motivo</span>
        <textarea
          v-model="ajuste.motivo"
          class="campo__entrada campo__area"
          rows="5"
          required
        ></textarea>
        <span class="campo__ajuda">
          Explique o que aconteceu, com data e horário. Mínimo de 10 caracteres.
        </span>
      </label>

      <p class="campo__ajuda">
        A marcação original não é alterada. A aprovação fica registrada ao lado
        dela como reconhecimento da divergência.
      </p>
    </ModalFormulario>
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
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
}

.dia {
  margin-bottom: 1.5rem;
}

.dia__titulo {
  margin: 0 0 0.6rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--cor-texto-suave);
  text-transform: capitalize;
}

.marcacoes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.marcacao__linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.marcacao__hora {
  font-size: 1.15rem;
  font-variant-numeric: tabular-nums;
}

.marcacao__nsr {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--cor-texto-suave);
  font-family: ui-monospace, Consolas, monospace;
}

.etiqueta--entrada {
  color: var(--cor-sucesso);
  background: var(--cor-sucesso-fundo);
  border-color: var(--cor-sucesso);
}

.etiqueta--saida {
  color: var(--cor-texto-suave);
  background: transparent;
  border-color: var(--cor-borda);
}

.marcacao__endereco {
  margin: 0.5rem 0 0;
  font-size: 0.85rem;
  color: var(--cor-texto-suave);
}

.marcacao__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.vazio {
  color: var(--cor-texto-suave);
}

.referencia {
  margin-bottom: 1rem;
}

.campo__area {
  resize: vertical;
  font-family: inherit;
}

.fundo {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgb(15 23 42 / 0.75);
}

.visor {
  width: 100%;
  max-width: 28rem;
}

.visor__imagem {
  width: 100%;
  border-radius: 0.6rem;
  margin-bottom: 0.75rem;
  display: block;
}

.sair {
  margin-top: 1.5rem;
}
</style>
