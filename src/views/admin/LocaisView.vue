<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import ModalFormulario from '@/components/ModalFormulario.vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { useAdminStore } from '@/stores/auth'
import { ITENS_MENU_ADMIN } from './menu'

const props = defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()

const locais = ref([])
const estabelecimentos = ref([])
const carregando = ref(true)
const erro = ref(null)

const modalAberto = ref(false)
const enviando = ref(false)
const erroModal = ref(null)
const editando = ref(null)
const obtendoPosicao = ref(false)

const formulario = reactive({
  estabelecimento_id: null,
  nome: '',
  latitude: '',
  longitude: '',
  raio_metros: 100,
  ativo: true,
})

const semEstabelecimento = computed(() => !carregando.value && !estabelecimentos.value.length)

function url(caminho = '') {
  return `/${props.empresa}/admin/locais${caminho}`
}

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const [lista, estab] = await Promise.all([
      store.api.get(url()),
      store.api.get(`/${props.empresa}/admin/estabelecimentos`),
    ])

    locais.value = lista.data.data
    estabelecimentos.value = estab.data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar os locais.')
  } finally {
    carregando.value = false
  }
}

function abrirCriacao() {
  editando.value = null
  Object.assign(formulario, {
    estabelecimento_id: estabelecimentos.value[0]?.id ?? null,
    nome: '',
    latitude: '',
    longitude: '',
    raio_metros: 100,
    ativo: true,
  })
  erroModal.value = null
  modalAberto.value = true
}

function abrirEdicao(local) {
  editando.value = local
  Object.assign(formulario, {
    estabelecimento_id: local.estabelecimento_id,
    nome: local.nome,
    latitude: String(local.latitude),
    longitude: String(local.longitude),
    raio_metros: local.raio_metros,
    ativo: local.ativo,
  })
  erroModal.value = null
  modalAberto.value = true
}

/**
 * Preenche as coordenadas com a posição atual do navegador — o caminho mais
 * confiável de cadastrar o local é estando fisicamente nele.
 */
function usarPosicaoAtual() {
  if (!navigator.geolocation) {
    erroModal.value = 'Este navegador não expõe geolocalização.'

    return
  }

  obtendoPosicao.value = true
  erroModal.value = null

  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      formulario.latitude = coords.latitude.toFixed(7)
      formulario.longitude = coords.longitude.toFixed(7)
      obtendoPosicao.value = false
    },
    (falha) => {
      erroModal.value = falha.code === falha.PERMISSION_DENIED
        ? 'Permissão de localização negada pelo navegador.'
        : 'Não foi possível obter a posição atual.'
      obtendoPosicao.value = false
    },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

async function salvar() {
  enviando.value = true
  erroModal.value = null

  const payload = {
    estabelecimento_id: formulario.estabelecimento_id,
    nome: formulario.nome.trim(),
    latitude: Number(formulario.latitude),
    longitude: Number(formulario.longitude),
    raio_metros: Number(formulario.raio_metros),
    ativo: formulario.ativo,
  }

  try {
    if (editando.value) {
      await store.api.put(url(`/${editando.value.id}`), payload)
    } else {
      await store.api.post(url(), payload)
    }

    modalAberto.value = false
    await carregar()
  } catch (e) {
    erroModal.value = mensagemDeErro(e)
  } finally {
    enviando.value = false
  }
}

async function remover(local) {
  erro.value = null

  try {
    await store.api.delete(url(`/${local.id}`))
    await carregar()
  } catch (e) {
    erro.value = mensagemDeErro(e)
  }
}
onMounted(carregar)
</script>

<template>
  <PainelLayout
    :store="store"
    titulo="Painel da empresa"
    :subtitulo="store.usuario?.empresa?.nome"
    :itens="ITENS_MENU_ADMIN"
    :contexto="empresa"
    rota-entrar="admin.entrar"
  >
    <template #titulo>Locais permitidos</template>
    <template #acoes>
      <button
        class="botao botao--compacto"
        type="button"
        :disabled="semEstabelecimento"
        @click="abrirCriacao"
      >
        Novo local
      </button>
    </template>

    <p v-if="semEstabelecimento" class="alerta alerta--aviso">
      Cadastre um estabelecimento antes de definir locais.
    </p>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <p v-else-if="!locais.length" class="vazio">
      Nenhum local cadastrado. Sem locais, o ponto com geolocalização exigida
      será sempre recusado.
    </p>

    <ul v-else class="lista">
      <li v-for="local in locais" :key="local.id" class="cartao">
        <div class="titulo">
          <strong>{{ local.nome }}</strong>
          <span v-if="!local.ativo" class="etiqueta etiqueta--inativo">inativo</span>
        </div>

        <dl class="meta">
          <div><dt>Estabelecimento</dt><dd>{{ local.estabelecimento }}</dd></div>
          <div>
            <dt>Coordenadas</dt>
            <dd>
              {{ local.latitude }}, {{ local.longitude }}
              <a
                class="mapa"
                :href="`https://www.openstreetmap.org/?mlat=${local.latitude}&mlon=${local.longitude}#map=17/${local.latitude}/${local.longitude}`"
                target="_blank"
                rel="noopener"
              >ver no mapa</a>
            </dd>
          </div>
          <div><dt>Raio</dt><dd>{{ local.raio_metros }} m</dd></div>
        </dl>

        <div class="acoes">
          <button class="botao botao--secundario botao--compacto" type="button" @click="abrirEdicao(local)">
            Editar
          </button>
          <button class="botao botao--perigo botao--compacto" type="button" @click="remover(local)">
            Remover
          </button>
        </div>
      </li>
    </ul>

    <ModalFormulario
      v-if="modalAberto"
      :titulo="editando ? 'Editar local' : 'Novo local'"
      :enviando="enviando"
      :erro="erroModal"
      @fechar="modalAberto = false"
      @confirmar="salvar"
    >
      <label class="campo">
        <span class="campo__rotulo">Nome</span>
        <input v-model="formulario.nome" class="campo__entrada" required />
      </label>

      <label class="campo">
        <span class="campo__rotulo">Estabelecimento</span>
        <select v-model="formulario.estabelecimento_id" class="campo__entrada" required>
          <option v-for="item in estabelecimentos" :key="item.id" :value="item.id">
            {{ item.nome }}
          </option>
        </select>
      </label>

      <div class="coordenadas">
        <label class="campo">
          <span class="campo__rotulo">Latitude</span>
          <input v-model="formulario.latitude" class="campo__entrada" inputmode="decimal" required />
        </label>

        <label class="campo">
          <span class="campo__rotulo">Longitude</span>
          <input v-model="formulario.longitude" class="campo__entrada" inputmode="decimal" required />
        </label>
      </div>

      <button
        class="botao botao--secundario botao--compacto posicao"
        type="button"
        :disabled="obtendoPosicao"
        @click="usarPosicaoAtual"
      >
        {{ obtendoPosicao ? 'Obtendo…' : 'Usar minha posição atual' }}
      </button>

      <label class="campo">
        <span class="campo__rotulo">Raio (metros)</span>
        <input
          v-model="formulario.raio_metros"
          class="campo__entrada"
          type="number"
          min="20"
          max="20000"
          required
        />
        <span class="campo__ajuda">
          Mínimo de 20 m — abaixo disso o erro do GPS de celular já reprovaria
          quem está no lugar certo.
        </span>
      </label>

      <label class="campo campo--linha">
        <input v-model="formulario.ativo" type="checkbox" />
        <span class="campo__rotulo">Local ativo</span>
      </label>
    </ModalFormulario>
  </PainelLayout>
</template>

<style scoped>
.lista {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.85rem;
}

.titulo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.meta {
  margin: 0.6rem 0 1rem;
  display: grid;
  gap: 0.3rem;
  font-size: 0.85rem;
}

.meta div {
  display: flex;
  gap: 0.6rem;
}

.meta dt {
  min-width: 8rem;
  color: var(--cor-texto-suave);
}

.meta dd {
  margin: 0;
  word-break: break-word;
}

.mapa {
  margin-left: 0.4rem;
  color: var(--cor-primaria);
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.coordenadas {
  display: grid;
  gap: 0 0.75rem;
  grid-template-columns: 1fr 1fr;
}

.posicao {
  margin-bottom: 1rem;
}

.vazio {
  color: var(--cor-texto-suave);
}
</style>
