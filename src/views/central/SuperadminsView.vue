<script setup>
import { onMounted, reactive, ref } from 'vue'
import CredenciaisGeradas from '@/components/CredenciaisGeradas.vue'
import ModalFormulario from '@/components/ModalFormulario.vue'
import PainelLayout from '@/components/PainelLayout.vue'
import { mensagemDeErro } from '@/services/http'
import { useSuperadminStore } from '@/stores/auth'
import { ITENS_MENU_CENTRAL } from './menu'

const store = useSuperadminStore()

const superadmins = ref([])
const carregando = ref(true)
const erro = ref(null)
const credenciais = ref(null)

const modalAberto = ref(false)
const enviando = ref(false)
const erroModal = ref(null)
const editando = ref(null)

const formulario = reactive({ nome: '', email: '' })

async function carregar() {
  carregando.value = true
  erro.value = null

  try {
    const { data } = await store.api.get('/central/superadmins')
    superadmins.value = data.data
  } catch (e) {
    erro.value = mensagemDeErro(e, 'Não foi possível carregar os superadmins.')
  } finally {
    carregando.value = false
  }
}

function abrirCriacao() {
  editando.value = null
  Object.assign(formulario, { nome: '', email: '' })
  erroModal.value = null
  modalAberto.value = true
}

function abrirEdicao(superadmin) {
  editando.value = superadmin
  Object.assign(formulario, { nome: superadmin.nome, email: superadmin.email })
  erroModal.value = null
  modalAberto.value = true
}

async function salvar() {
  enviando.value = true
  erroModal.value = null

  const payload = { nome: formulario.nome.trim(), email: formulario.email.trim() }

  try {
    if (editando.value) {
      await store.api.put(`/central/superadmins/${editando.value.id}`, payload)
    } else {
      const { data } = await store.api.post('/central/superadmins', payload)
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

async function resetarSenha(superadmin) {
  erro.value = null

  try {
    const { data } = await store.api.post(`/central/superadmins/${superadmin.id}/resetar-senha`)
    credenciais.value = data.credenciais_iniciais
    await carregar()
  } catch (e) {
    erro.value = mensagemDeErro(e)
  }
}

async function remover(superadmin) {
  erro.value = null

  try {
    await store.api.delete(`/central/superadmins/${superadmin.id}`)
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
    titulo="Painel central"
    :subtitulo="store.usuario?.nome"
    :itens="ITENS_MENU_CENTRAL"
    rota-entrar="central.entrar"
  >
    <template #titulo>Superadmins</template>
    <template #acoes>
      <button class="botao botao--compacto" type="button" @click="abrirCriacao">
        Novo superadmin
      </button>
    </template>

    <CredenciaisGeradas
      v-if="credenciais"
      :credenciais="credenciais"
      rotulo-identificacao="E-mail"
      @fechar="credenciais = null"
    />

    <p v-if="erro" class="alerta alerta--erro" role="alert">{{ erro }}</p>
    <p v-if="carregando">Carregando…</p>

    <ul v-else class="lista">
      <li v-for="pessoa in superadmins" :key="pessoa.id" class="cartao item">
        <div class="item__principal">
          <strong>{{ pessoa.nome }}</strong>
          <span v-if="pessoa.senha_provisoria" class="etiqueta">senha provisória</span>
        </div>
        <p class="item__email">{{ pessoa.email }}</p>

        <div class="item__acoes">
          <button class="botao botao--secundario botao--compacto" type="button" @click="abrirEdicao(pessoa)">
            Editar
          </button>
          <button class="botao botao--secundario botao--compacto" type="button" @click="resetarSenha(pessoa)">
            Resetar senha
          </button>
          <button class="botao botao--perigo botao--compacto" type="button" @click="remover(pessoa)">
            Remover
          </button>
        </div>
      </li>
    </ul>

    <ModalFormulario
      v-if="modalAberto"
      :titulo="editando ? 'Editar superadmin' : 'Novo superadmin'"
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
        <span class="campo__rotulo">E-mail</span>
        <input v-model="formulario.email" class="campo__entrada" type="email" required />
      </label>

      <p v-if="!editando" class="campo__ajuda">
        A senha provisória é gerada automaticamente e exibida uma única vez.
      </p>
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

.item__principal {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}

.item__email {
  margin: 0.2rem 0 0.9rem;
  font-size: 0.9rem;
  color: var(--cor-texto-suave);
  word-break: break-all;
}

.item__acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
