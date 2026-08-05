<script setup>
import { onMounted, reactive, ref } from 'vue'
import ModalFormulario from '@/components/ModalFormulario.vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { useAdminStore } from '@/stores/auth'
import { ITENS_MENU_ADMIN } from './menu'

const props = defineProps({
  empresa: { type: String, required: true },
})

const store = useAdminStore()

const estabelecimentos = ref([])
const carregando = ref(true)
const erro = ref(null)

const modalAberto = ref(false)
const enviando = ref(false)
const erroModal = ref(null)
const editando = ref(null)

const formulario = reactive({ nome: '', cnpj_cpf: '', endereco: '' })

function url(caminho = '') {
  return `/${props.empresa}/admin/estabelecimentos${caminho}`
}

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get(url())
    estabelecimentos.value = data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar os estabelecimentos.')
  } finally {
    carregando.value = false
  }
}

function abrirCriacao() {
  editando.value = null
  Object.assign(formulario, { nome: '', cnpj_cpf: '', endereco: '' })
  erroModal.value = null
  modalAberto.value = true
}

function abrirEdicao(item) {
  editando.value = item
  Object.assign(formulario, {
    nome: item.nome,
    cnpj_cpf: item.cnpj_cpf ?? '',
    endereco: item.endereco ?? '',
  })
  erroModal.value = null
  modalAberto.value = true
}

async function salvar() {
  enviando.value = true
  erroModal.value = null

  const payload = {
    nome: formulario.nome.trim(),
    cnpj_cpf: formulario.cnpj_cpf.trim() || null,
    endereco: formulario.endereco.trim() || null,
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

async function remover(item) {
  erro.value = null

  try {
    await store.api.delete(url(`/${item.id}`))
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
    <template #titulo>Estabelecimentos</template>
    <template #acoes>
      <button class="botao botao--compacto" type="button" @click="abrirCriacao">
        Novo estabelecimento
      </button>
    </template>

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <p v-else-if="!estabelecimentos.length" class="vazio">
      Cadastre o estabelecimento antes de incluir funcionários.
    </p>

    <ul v-else class="lista">
      <li v-for="item in estabelecimentos" :key="item.id" class="cartao">
        <strong>{{ item.nome }}</strong>

        <dl class="meta">
          <div><dt>CNPJ/CPF</dt><dd>{{ item.cnpj_cpf || '—' }}</dd></div>
          <div><dt>Endereço</dt><dd>{{ item.endereco || '—' }}</dd></div>
          <div><dt>Próximo NSR</dt><dd>{{ item.proximo_nsr }}</dd></div>
          <div>
            <dt>Vínculos</dt>
            <dd>{{ item.total_funcionarios }} funcionários · {{ item.total_locais }} locais</dd>
          </div>
        </dl>

        <div class="acoes">
          <button class="botao botao--secundario botao--compacto" type="button" @click="abrirEdicao(item)">
            Editar
          </button>
          <button class="botao botao--perigo botao--compacto" type="button" @click="remover(item)">
            Remover
          </button>
        </div>
      </li>
    </ul>

    <ModalFormulario
      v-if="modalAberto"
      :titulo="editando ? 'Editar estabelecimento' : 'Novo estabelecimento'"
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
        <span class="campo__rotulo">CNPJ ou CPF</span>
        <input v-model="formulario.cnpj_cpf" class="campo__entrada" inputmode="numeric" />
        <span class="campo__ajuda">11 dígitos (CPF) ou 14 (CNPJ), sem pontuação.</span>
      </label>

      <label class="campo">
        <span class="campo__rotulo">Endereço</span>
        <input v-model="formulario.endereco" class="campo__entrada" />
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
  min-width: 7rem;
  color: var(--cor-texto-suave);
}

.meta dd {
  margin: 0;
  word-break: break-word;
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
