<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import CredenciaisGeradas from '@/components/CredenciaisGeradas.vue'
import ModalFormulario from '@/components/ModalFormulario.vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { useAdminStore } from '@/stores/auth'
import { ITENS_MENU_ADMIN } from './menu'

const props = defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()

const funcionarios = ref([])
const estabelecimentos = ref([])
const carregando = ref(true)
const erro = ref(null)
const busca = ref('')
const credenciais = ref(null)

const modalAberto = ref(false)
const enviando = ref(false)
const erroModal = ref(null)
const editando = ref(null)

const formulario = reactive({
  estabelecimento_id: null,
  nome: '',
  identificador: '',
  // 'padrao' vira null no envio: significa herdar a config da empresa.
  exige_geolocalizacao: 'padrao',
  status: true,
})

const semEstabelecimento = computed(() => !carregando.value && !estabelecimentos.value.length)

function url(caminho = '') {
  return `/${props.empresa}/admin/funcionarios${caminho}`
}

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const [lista, locais] = await Promise.all([
      store.api.get(url(), { params: busca.value ? { busca: busca.value } : {} }),
      store.api.get(`/${props.empresa}/admin/estabelecimentos`),
    ])

    funcionarios.value = lista.data.data
    estabelecimentos.value = locais.data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar os funcionários.')
  } finally {
    carregando.value = false
  }
}

function abrirCriacao() {
  editando.value = null
  Object.assign(formulario, {
    estabelecimento_id: estabelecimentos.value[0]?.id ?? null,
    nome: '',
    identificador: '',
    exige_geolocalizacao: 'padrao',
    status: true,
  })
  erroModal.value = null
  modalAberto.value = true
}

function abrirEdicao(funcionario) {
  editando.value = funcionario
  Object.assign(formulario, {
    estabelecimento_id: funcionario.estabelecimento_id,
    nome: funcionario.nome,
    identificador: funcionario.identificador,
    exige_geolocalizacao:
      funcionario.exige_geolocalizacao === null ? 'padrao' : String(funcionario.exige_geolocalizacao),
    status: funcionario.status,
  })
  erroModal.value = null
  modalAberto.value = true
}

async function salvar() {
  enviando.value = true
  erroModal.value = null

  const payload = {
    estabelecimento_id: formulario.estabelecimento_id,
    nome: formulario.nome.trim(),
    identificador: formulario.identificador.trim(),
    exige_geolocalizacao:
      formulario.exige_geolocalizacao === 'padrao' ? null : formulario.exige_geolocalizacao === 'true',
    status: formulario.status,
  }

  try {
    if (editando.value) {
      await store.api.put(url(`/${editando.value.id}`), payload)
    } else {
      const { data } = await store.api.post(url(), payload)
      credenciais.value = data.credenciais_iniciais
    }

    modalAberto.value = false
    await carregar()
  } catch (e) {
    erroModal.value = mensagemDeErro(e)
  } finally {
    enviando.value = false
  }
}

async function resetarSenha(funcionario) {
  erro.value = null

  try {
    const { data } = await store.api.post(url(`/${funcionario.id}/resetar-senha`))
    credenciais.value = data.credenciais_iniciais
    await carregar()
  } catch (e) {
    erro.value = mensagemDeErro(e)
  }
}

async function desativar(funcionario) {
  erro.value = null

  try {
    await store.api.delete(url(`/${funcionario.id}`))
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
    <template #titulo>Funcionários</template>
    <template #acoes>
      <button
        class="botao botao--compacto"
        type="button"
        :disabled="semEstabelecimento"
        @click="abrirCriacao"
      >
        Novo funcionário
      </button>
    </template>

    <CredenciaisGeradas
      v-if="credenciais"
      :credenciais="credenciais"
      rotulo-identificacao="Identificador"
      @fechar="credenciais = null"
    />

    <p v-if="semEstabelecimento" class="alerta alerta--aviso">
      Cadastre um estabelecimento antes de incluir funcionários.
    </p>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>

    <form class="filtro" @submit.prevent="carregar">
      <input
        v-model="busca"
        class="campo__entrada"
        type="search"
        placeholder="Buscar por nome ou identificador"
      />
      <button class="botao botao--secundario botao--compacto" type="submit">Buscar</button>
    </form>

    <p v-if="carregando">Carregando…</p>

    <p v-else-if="!funcionarios.length" class="vazio">Nenhum funcionário encontrado.</p>

    <ul v-else class="lista">
      <li v-for="funcionario in funcionarios" :key="funcionario.id" class="cartao">
        <div class="titulo">
          <strong>{{ funcionario.nome }}</strong>
          <span v-if="!funcionario.status" class="etiqueta etiqueta--inativo">inativo</span>
          <span v-else-if="funcionario.senha_provisoria" class="etiqueta">senha provisória</span>
        </div>

        <dl class="meta">
          <div><dt>Identificador</dt><dd>{{ funcionario.identificador }}</dd></div>
          <div><dt>Estabelecimento</dt><dd>{{ funcionario.estabelecimento }}</dd></div>
          <div>
            <dt>Geolocalização</dt>
            <dd>
              {{ funcionario.exige_geolocalizacao_efetivo ? 'exigida' : 'não exigida' }}
              <span v-if="funcionario.exige_geolocalizacao === null" class="heranca">
                (padrão da empresa)
              </span>
            </dd>
          </div>
        </dl>

        <div class="acoes">
          <button class="botao botao--secundario botao--compacto" type="button" @click="abrirEdicao(funcionario)">
            Editar
          </button>
          <button class="botao botao--secundario botao--compacto" type="button" @click="resetarSenha(funcionario)">
            Resetar senha
          </button>
          <button
            v-if="funcionario.status"
            class="botao botao--perigo botao--compacto"
            type="button"
            @click="desativar(funcionario)"
          >
            Desativar
          </button>
        </div>
      </li>
    </ul>

    <ModalFormulario
      v-if="modalAberto"
      :titulo="editando ? 'Editar funcionário' : 'Novo funcionário'"
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
        <span class="campo__rotulo">Identificador</span>
        <input
          v-model="formulario.identificador"
          class="campo__entrada"
          autocapitalize="none"
          required
        />
        <span class="campo__ajuda">
          O formato segue o tipo escolhido para a empresa no painel central.
        </span>
      </label>

      <label class="campo">
        <span class="campo__rotulo">Estabelecimento</span>
        <select v-model="formulario.estabelecimento_id" class="campo__entrada" required>
          <option v-for="item in estabelecimentos" :key="item.id" :value="item.id">
            {{ item.nome }}
          </option>
        </select>
      </label>

      <label class="campo">
        <span class="campo__rotulo">Exigir geolocalização</span>
        <select v-model="formulario.exige_geolocalizacao" class="campo__entrada">
          <option value="padrao">Seguir o padrão da empresa</option>
          <option value="true">Sempre exigir</option>
          <option value="false">Nunca exigir</option>
        </select>
      </label>

      <label v-if="editando" class="campo campo--linha">
        <input v-model="formulario.status" type="checkbox" />
        <span class="campo__rotulo">Funcionário ativo</span>
      </label>

      <p v-if="!editando" class="campo__ajuda">
        A senha provisória é gerada automaticamente e exibida uma única vez.
      </p>
    </ModalFormulario>
  </PainelLayout>
</template>

<style scoped>
.filtro {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filtro .campo__entrada {
  flex: 1;
}

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

.heranca {
  color: var(--cor-texto-suave);
}

.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.vazio {
  color: var(--cor-texto-suave);
}
</style>
